import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { and, eq, gte, lte, ne, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches } from "@/lib/schema";
import {
  LIVE_FINISHED_RECHECK_MINUTES,
  LIVE_MATCHES_API_KEY,
  MATCH_STATUSES,
  type MatchStage,
  type MatchStatus,
} from "@/lib/constants";
import { toFifaCode } from "@/lib/country-utils";
import { updateMatchPredictions } from "@/lib/scoring";
import { reconcileScore } from "@/lib/scoring-utils";

/**
 * V2 live sync (stateless full reconciliation).
 *
 * Co minutę pobiera pełny snapshot meczów MŚ z football-data.org dla okna
 * dat wokół "teraz" (BEZ filtra status), dopasowuje mecze do lokalnej DB po
 * kodach krajów FIFA + dacie meczu, a następnie liczy docelowy status i wynik
 * z bieżącego snapshotu. Brak ukrytego stanu, throttle czy pauzy na przerwę —
 * każdy bieg jest idempotentny i samonaprawiający.
 */

const FOOTBALL_DATA_BASE_URL = "https://api.football-data.org/v4";
const WORLD_CUP_CODE = "WC";
const DEFAULT_TIMEOUT_MS = 60_000;
const LOG_PREFIX = "🥝 [sync-v2]";

// Okno dat dla zapytania do providera (pokrywa kick-offy blisko północy UTC).
const DATE_WINDOW_DAYS_BEFORE = 1;
const DATE_WINDOW_DAYS_AFTER = 1;

// Tolerancja dopasowania kick-offu lokalnego meczu do utcDate providera.
const MAX_KICKOFF_DIFF_MS = 2 * 60 * 60 * 1000;

// Okno "kandydatów" do reconcyliacji: mecze niezakończone, których kick-off
// mieści się od -6h do +15min względem teraz.
const ACTIVE_LOOKBACK_MS = 6 * 60 * 60 * 1000;
const ACTIVE_PREMATCH_MS = 15 * 60 * 1000;

const KNOCKOUT_STAGES: ReadonlySet<MatchStage> = new Set<MatchStage>([
  "round_32",
  "round_16",
  "quarter",
  "semi",
  "final",
]);

type FootballDataScoreTime = {
  home?: number | null;
  away?: number | null;
};

type FootballDataScore = {
  duration?: string | null;
  fullTime?: FootballDataScoreTime | null;
  regularTime?: FootballDataScoreTime | null;
  halfTime?: FootballDataScoreTime | null;
};

type FootballDataTeam = {
  tla?: string | null;
  code?: string | null;
  name?: string | null;
};

type FootballDataRawMatch = {
  id?: number | string;
  utcDate?: string | null;
  status?: string | null;
  minute?: number | null;
  homeTeam?: FootballDataTeam | null;
  awayTeam?: FootballDataTeam | null;
  score?: FootballDataScore | null;
};

type FootballDataMatchesResponse = {
  matches?: FootballDataRawMatch[];
};

type NormalizedProviderMatch = {
  providerMatchId: string;
  homeCode: string | null;
  awayCode: string | null;
  kickoff: Date | null;
  rawStatus: string;
  status: MatchStatus;
  duration: string | null;
  regularTime: { home: number | null; away: number | null };
  fullTime: { home: number | null; away: number | null };
};

export type LiveSyncV2Result = {
  provider: "football-data";
  fetchedAt: string;
  ok: boolean;
  skipped: boolean;
  reason?: string;
  totalIncoming: number;
  totalMapped: number;
  candidateMatches: number;
  updatedMatches: number;
  unchangedMatches: number;
  finalizedMatches: number;
  predictionsRecalculated: number;
  updatedMatchIds: number[];
};

type RunOptions = {
  debug?: boolean;
  requestId?: string;
};

function logInfo(
  enabled: boolean,
  message: string,
  meta?: Record<string, unknown>,
) {
  if (!enabled) return;
  if (meta) {
    console.info(LOG_PREFIX, message, meta);
    return;
  }
  console.info(LOG_PREFIX, message);
}

function formatScore(
  home: number | null,
  away: number | null,
): string {
  if (home === null || away === null) {
    return "-";
  }

  return `${home}:${away}`;
}

function toNonNegativeInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const normalized = Math.trunc(value);
  return normalized >= 0 ? normalized : null;
}

function normalizeTeamCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (!normalized) return null;
  return toFifaCode(normalized);
}

function normalizeStatus(value: unknown): MatchStatus {
  if (typeof value !== "string") {
    return MATCH_STATUSES.SCHEDULED;
  }

  const normalized = value.trim().toUpperCase();

  if (["FINISHED", "AWARDED"].includes(normalized)) {
    return MATCH_STATUSES.FINISHED;
  }

  // IN_PLAY / PAUSED / EXTRA_TIME / PENALTY_SHOOTOUT / SUSPENDED -> trwający mecz.
  if (
    [
      "IN_PLAY",
      "PAUSED",
      "EXTRA_TIME",
      "PENALTY_SHOOTOUT",
      "SUSPENDED",
    ].includes(normalized)
  ) {
    return MATCH_STATUSES.LIVE;
  }

  // SCHEDULED / TIMED / POSTPONED / CANCELLED -> niezagrany / nie-live.
  return MATCH_STATUSES.SCHEDULED;
}

function resolveNextStatus(
  localStatus: MatchStatus | null,
  providerStatus: MatchStatus,
): MatchStatus {
  const current = localStatus ?? MATCH_STATUSES.SCHEDULED;

  // Finished is terminal — never downgrade when provider snapshot lags.
  if (
    current === MATCH_STATUSES.FINISHED &&
    providerStatus !== MATCH_STATUSES.FINISHED
  ) {
    return MATCH_STATUSES.FINISHED;
  }

  // Keep manual/admin "live" when provider still reports TIMED/SCHEDULED.
  if (
    current === MATCH_STATUSES.LIVE &&
    providerStatus === MATCH_STATUSES.SCHEDULED
  ) {
    return MATCH_STATUSES.LIVE;
  }

  return providerStatus;
}

function parseKickoff(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeProviderMatch(
  raw: FootballDataRawMatch,
): NormalizedProviderMatch {
  const rawStatus =
    typeof raw.status === "string" ? raw.status.trim().toUpperCase() : "";

  return {
    providerMatchId: String(raw.id ?? "").trim() || "unknown",
    homeCode: normalizeTeamCode(raw.homeTeam?.tla ?? raw.homeTeam?.code),
    awayCode: normalizeTeamCode(raw.awayTeam?.tla ?? raw.awayTeam?.code),
    kickoff: parseKickoff(raw.utcDate),
    rawStatus,
    status: normalizeStatus(raw.status),
    duration:
      typeof raw.score?.duration === "string"
        ? raw.score.duration.trim().toUpperCase()
        : null,
    regularTime: {
      home: toNonNegativeInt(raw.score?.regularTime?.home),
      away: toNonNegativeInt(raw.score?.regularTime?.away),
    },
    fullTime: {
      home: toNonNegativeInt(raw.score?.fullTime?.home),
      away: toNonNegativeInt(raw.score?.fullTime?.away),
    },
  };
}

function formatDateForApi(date: Date): string {
  return date.toISOString().slice(0, 10);
}

class ProviderFetchError extends Error {
  constructor(
    message: string,
    readonly reason: string,
  ) {
    super(message);
    this.name = "ProviderFetchError";
  }
}

async function fetchWorldCupSnapshot(
  now: Date,
  debug: boolean,
): Promise<NormalizedProviderMatch[]> {
  const token =
    LIVE_MATCHES_API_KEY || process.env.FOOTBALL_DATA_API_TOKEN || "";

  if (!token) {
    throw new ProviderFetchError(
      "Missing FOOTBALL_DATA_API_TOKEN / LIVE_MATCHES_API_KEY",
      "missing-token",
    );
  }

  const dateFrom = new Date(
    now.getTime() - DATE_WINDOW_DAYS_BEFORE * 24 * 60 * 60 * 1000,
  );
  const dateTo = new Date(
    now.getTime() + DATE_WINDOW_DAYS_AFTER * 24 * 60 * 60 * 1000,
  );

  const endpoint = new URL(
    `${FOOTBALL_DATA_BASE_URL}/competitions/${WORLD_CUP_CODE}/matches`,
  );
  endpoint.searchParams.set("dateFrom", formatDateForApi(dateFrom));
  endpoint.searchParams.set("dateTo", formatDateForApi(dateTo));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        "X-Auth-Token": token,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const bodyPreview = body.slice(0, 500);

      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        console.error(
          `${LOG_PREFIX} HTTP 429 Too Many Requests. Retry-After=${retryAfter ?? "n/a"}. Body=${bodyPreview}`,
        );
        throw new ProviderFetchError("HTTP 429", "rate-limited");
      }

      console.error(
        `${LOG_PREFIX} HTTP ${response.status} ${response.statusText}. Body=${bodyPreview}`,
      );
      throw new ProviderFetchError(
        `HTTP ${response.status}`,
        `http-${response.status}`,
      );
    }

    const payload = (await response.json()) as FootballDataMatchesResponse;
    const sourceMatches = Array.isArray(payload.matches) ? payload.matches : [];

    // logInfo(true, JSON.stringify(payload));

    logInfo(debug, "Provider snapshot fetched", {
      dateFrom: formatDateForApi(dateFrom),
      dateTo: formatDateForApi(dateTo),
      totalIncoming: sourceMatches.length,
    });

    return sourceMatches.map(normalizeProviderMatch);
  } catch (error) {
    if (error instanceof ProviderFetchError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      console.error(
        `${LOG_PREFIX} Request timeout after ${DEFAULT_TIMEOUT_MS}ms`,
      );
      throw new ProviderFetchError("Request timeout", "timeout");
    }

    console.error(`${LOG_PREFIX} Unexpected fetch error:`, error);
    throw new ProviderFetchError("Unexpected fetch error", "fetch-error");
  } finally {
    clearTimeout(timer);
  }
}

type LocalMatch = {
  id: number;
  matchNumber: number;
  stage: MatchStage;
  matchDate: Date;
  status: MatchStatus | null;
  finishedAt: Date | null;
  homeScore: number | null;
  awayScore: number | null;
  homeCode: string;
  awayCode: string;
};

type OutcomeSkipReason =
  | "awaiting-regular-time"
  | "postponed-cancelled"
  | "suspended-frozen";

type ResolveOutcomeResult =
  | {
      kind: "skip";
      reason: OutcomeSkipReason;
    }
  | {
      kind: "apply";
      nextStatus: MatchStatus;
      score: { home: number | null; away: number | null };
    };

function resolveOutcome(
  local: LocalMatch,
  incoming: NormalizedProviderMatch,
): ResolveOutcomeResult {
  const rawStatus = incoming.rawStatus;
  const isKnockout = KNOCKOUT_STAGES.has(local.stage);
  const hasRegular =
    incoming.regularTime.home !== null && incoming.regularTime.away !== null;
  const hasFull =
    incoming.fullTime.home !== null && incoming.fullTime.away !== null;

  if (rawStatus === "SUSPENDED") {
    return { kind: "skip", reason: "suspended-frozen" };
  }

  if (rawStatus === "POSTPONED" || rawStatus === "CANCELLED") {
    return { kind: "skip", reason: "postponed-cancelled" };
  }

  if (
    isKnockout &&
    (rawStatus === "EXTRA_TIME" || rawStatus === "PENALTY_SHOOTOUT")
  ) {
    if (!hasRegular) {
      return { kind: "skip", reason: "awaiting-regular-time" };
    }

    return {
      kind: "apply",
      nextStatus: MATCH_STATUSES.FINISHED,
      score: incoming.regularTime,
    };
  }

  if (rawStatus === "FINISHED" || rawStatus === "AWARDED") {
    const wentBeyondRegular =
      incoming.duration === "EXTRA_TIME" ||
      incoming.duration === "PENALTY_SHOOTOUT";

    if (isKnockout && wentBeyondRegular) {
      if (!hasRegular) {
        return { kind: "skip", reason: "awaiting-regular-time" };
      }

      return {
        kind: "apply",
        nextStatus: MATCH_STATUSES.FINISHED,
        score: incoming.regularTime,
      };
    }

    return {
      kind: "apply",
      nextStatus: MATCH_STATUSES.FINISHED,
      score: hasFull
        ? incoming.fullTime
        : hasRegular
          ? incoming.regularTime
          : { home: null, away: null },
    };
  }

  if (
    ["IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(rawStatus)
  ) {
    return {
      kind: "apply",
      nextStatus: resolveNextStatus(local.status, MATCH_STATUSES.LIVE),
      score: {
        home: incoming.regularTime.home ?? incoming.fullTime.home ?? null,
        away: incoming.regularTime.away ?? incoming.fullTime.away ?? null,
      },
    };
  }

  return {
    kind: "apply",
    nextStatus: resolveNextStatus(local.status, MATCH_STATUSES.SCHEDULED),
    score: { home: null, away: null },
  };
}

export async function runLiveSyncV2(
  options?: RunOptions,
): Promise<LiveSyncV2Result> {
  noStore();

  const debug = Boolean(options?.debug);
  const requestId = options?.requestId ?? "n/a";
  const now = new Date();
  const fetchedAt = now.toISOString();

  const emptyResult = (
    extra: Partial<LiveSyncV2Result> & Pick<LiveSyncV2Result, "ok" | "skipped">,
  ): LiveSyncV2Result => ({
    provider: "football-data",
    fetchedAt,
    totalIncoming: 0,
    totalMapped: 0,
    candidateMatches: 0,
    updatedMatches: 0,
    unchangedMatches: 0,
    finalizedMatches: 0,
    predictionsRecalculated: 0,
    updatedMatchIds: [],
    ...extra,
  });

  // Kandydaci: mecze niezakończone z kick-offem w oknie [-6h, +15min] ORAZ
  // mecze świeżo zakończone w oknie rechecku (do wychwycenia korekt VAR
  // przychodzących 1-2 min po końcowym gwizdku).
  const lookbackStart = new Date(now.getTime() - ACTIVE_LOOKBACK_MS);
  const prematchEnd = new Date(now.getTime() + ACTIVE_PREMATCH_MS);
  const recheckStart = new Date(
    now.getTime() - LIVE_FINISHED_RECHECK_MINUTES * 60 * 1000,
  );

  const candidateRows = await db.query.matches.findMany({
    where: or(
      and(
        ne(matches.status, MATCH_STATUSES.FINISHED),
        gte(matches.matchDate, lookbackStart),
        lte(matches.matchDate, prematchEnd),
      ),
      and(
        eq(matches.status, MATCH_STATUSES.FINISHED),
        gte(matches.finishedAt, recheckStart),
      ),
    ),
    with: {
      homeTeam: { columns: { code: true } },
      awayTeam: { columns: { code: true } },
    },
  });

  const candidates: LocalMatch[] = candidateRows.map((row) => ({
    id: row.id,
    matchNumber: row.matchNumber,
    stage: row.stage,
    matchDate: row.matchDate,
    status: row.status,
    finishedAt: row.finishedAt,
    homeScore: row.homeScore,
    awayScore: row.awayScore,
    homeCode: normalizeTeamCode(row.homeTeam.code) ?? "",
    awayCode: normalizeTeamCode(row.awayTeam.code) ?? "",
  }));

  logInfo(debug, "Candidate lookup completed", {
    requestId,
    candidateMatches: candidates.length,
    candidates: candidates.map((candidate) => ({
      matchId: candidate.id,
      matchNumber: candidate.matchNumber,
      match: `${candidate.homeCode} vs ${candidate.awayCode}`,
      status: candidate.status ?? MATCH_STATUSES.SCHEDULED,
      score: formatScore(candidate.homeScore, candidate.awayScore),
      kickoff: candidate.matchDate.toISOString(),
    })),
  });

  if (candidates.length === 0) {
    return emptyResult({
      ok: true,
      skipped: true,
      reason: "no-active-matches",
    });
  }

  let incoming: NormalizedProviderMatch[];
  try {
    incoming = await fetchWorldCupSnapshot(now, debug);
  } catch (error) {
    const reason =
      error instanceof ProviderFetchError ? error.reason : "fetch-error";

    logInfo(debug, "Provider fetch failed, skipping run without mutation", {
      requestId,
      reason,
    });

    return emptyResult({
      ok: false,
      skipped: true,
      reason,
      candidateMatches: candidates.length,
    });
  }

  // Indeks providera po kodach drużyn FIFA: "HOME|AWAY" -> lista meczów.
  const incomingByCodes = new Map<string, NormalizedProviderMatch[]>();
  for (const item of incoming) {
    if (!item.homeCode || !item.awayCode) continue;
    const key = `${item.homeCode}|${item.awayCode}`;
    const list = incomingByCodes.get(key) ?? [];
    list.push(item);
    incomingByCodes.set(key, list);
  }

  let totalMapped = 0;
  let updatedMatches = 0;
  let unchangedMatches = 0;
  let finalizedMatches = 0;
  let predictionsRecalculated = 0;
  const updatedMatchIds: number[] = [];

  for (const local of candidates) {
    if (!local.homeCode || !local.awayCode) {
      continue;
    }

    const matchKey = `${local.homeCode}|${local.awayCode}`;
    const sameTeams = incomingByCodes.get(matchKey) ?? [];

    // Dopasowanie po dacie: najbliższy kick-off w granicach tolerancji.
    let matched: NormalizedProviderMatch | null = null;
    let bestDiff = Number.POSITIVE_INFINITY;

    for (const candidate of sameTeams) {
      if (!candidate.kickoff) continue;
      const diff = Math.abs(
        candidate.kickoff.getTime() - local.matchDate.getTime(),
      );
      if (diff <= MAX_KICKOFF_DIFF_MS && diff < bestDiff) {
        bestDiff = diff;
        matched = candidate;
      }
    }

    if (!matched) {
      logInfo(debug, "No provider match for local candidate", {
        requestId,
        matchId: local.id,
        matchKey,
      });
      continue;
    }

    totalMapped += 1;

    const outcome = resolveOutcome(local, matched);
    if (outcome.kind === "skip") {
      unchangedMatches += 1;
      logInfo(debug, "Skipping reconciliation for match", {
        requestId,
        matchId: local.id,
        matchNumber: local.matchNumber,
        match: `${local.homeCode} vs ${local.awayCode}`,
        providerMatchId: matched.providerMatchId,
        providerRawStatus: matched.rawStatus,
        providerStatus: matched.status,
        reason: outcome.reason,
      });
      continue;
    }

    const nextStatus = outcome.nextStatus;
    const selectedScore = outcome.score;

    // Never un-finish a locally finished match during the recheck window.
    if (
      local.status === MATCH_STATUSES.FINISHED &&
      nextStatus !== MATCH_STATUSES.FINISHED
    ) {
      unchangedMatches += 1;
      logInfo(debug, "Skipping recheck: outcome would un-finish match", {
        requestId,
        matchId: local.id,
        matchNumber: local.matchNumber,
        match: `${local.homeCode} vs ${local.awayCode}`,
        providerMatchId: matched.providerMatchId,
        providerRawStatus: matched.rawStatus,
        providerStatus: matched.status,
      });
      continue;
    }

    const nextHomeScore = reconcileScore(local.homeScore, selectedScore.home);
    const nextAwayScore = reconcileScore(local.awayScore, selectedScore.away);

    const statusChanged = local.status !== nextStatus;
    const scoreChanged =
      local.homeScore !== nextHomeScore || local.awayScore !== nextAwayScore;

    const scoreDecreased =
      (local.homeScore !== null &&
        nextHomeScore !== null &&
        nextHomeScore < local.homeScore) ||
      (local.awayScore !== null &&
        nextAwayScore !== null &&
        nextAwayScore < local.awayScore);

    if (scoreChanged && scoreDecreased) {
      logInfo(debug, "Score decreased (possible VAR correction)", {
        requestId,
        matchId: local.id,
        matchNumber: local.matchNumber,
        match: `${local.homeCode} vs ${local.awayCode}`,
        providerMatchId: matched.providerMatchId,
        localStatus: local.status ?? MATCH_STATUSES.SCHEDULED,
        previousScore: formatScore(local.homeScore, local.awayScore),
        nextScore: formatScore(nextHomeScore, nextAwayScore),
      });
    }

    logInfo(debug, "Reconciling match", {
      requestId,
      matchId: local.id,
      matchNumber: local.matchNumber,
      match: `${local.homeCode} vs ${local.awayCode}`,
      providerMatchId: matched.providerMatchId,
      localStatus: local.status ?? MATCH_STATUSES.SCHEDULED,
      localScore: formatScore(local.homeScore, local.awayScore),
      providerRawStatus: matched.rawStatus,
      providerStatus: matched.status,
      providerScore: formatScore(selectedScore.home, selectedScore.away),
      nextStatus,
      nextScore: formatScore(nextHomeScore, nextAwayScore),
      changed: statusChanged || scoreChanged,
    });

    if (!statusChanged && !scoreChanged) {
      unchangedMatches += 1;
      continue;
    }

    const becameFinished =
      nextStatus === MATCH_STATUSES.FINISHED &&
      local.status !== MATCH_STATUSES.FINISHED;

    await db
      .update(matches)
      .set({
        homeScore: nextHomeScore,
        awayScore: nextAwayScore,
        status: nextStatus,
        // Stamp finalization time only on the live->finished transition so the
        // post-finalization recheck window is measured from the original
        // finish; recheck-branch corrections must not extend it.
        ...(becameFinished ? { finishedAt: now } : {}),
      })
      .where(eq(matches.id, local.id));

    updatedMatches += 1;
    updatedMatchIds.push(local.id);

    if (becameFinished) {
      finalizedMatches += 1;
    }

    if (
      nextStatus === MATCH_STATUSES.FINISHED &&
      nextHomeScore !== null &&
      nextAwayScore !== null &&
      (becameFinished || scoreChanged)
    ) {
      const updatedPredictions = await updateMatchPredictions(local.id);
      predictionsRecalculated += updatedPredictions;
    }

    logInfo(debug, "Match updated", {
      requestId,
      matchId: local.id,
      matchNumber: local.matchNumber,
      match: `${local.homeCode} vs ${local.awayCode}`,
      providerMatchId: matched.providerMatchId,
      previousStatus: local.status ?? MATCH_STATUSES.SCHEDULED,
      previousScore: formatScore(local.homeScore, local.awayScore),
      nextStatus,
      nextScore: formatScore(nextHomeScore, nextAwayScore),
      duration: matched.duration,
      stage: local.stage,
    });
  }

  if (updatedMatchIds.length > 0) {
    revalidatePath("/");
    revalidatePath("/predictions");
    revalidatePath("/admin");
    revalidatePath("/admin/matches");
  }

  logInfo(debug, "runLiveSyncV2 completed", {
    requestId,
    totalIncoming: incoming.length,
    totalMapped,
    candidateMatches: candidates.length,
    updatedMatches,
    unchangedMatches,
    finalizedMatches,
    predictionsRecalculated,
  });

  return {
    provider: "football-data",
    fetchedAt,
    ok: true,
    skipped: false,
    totalIncoming: incoming.length,
    totalMapped,
    candidateMatches: candidates.length,
    updatedMatches,
    unchangedMatches,
    finalizedMatches,
    predictionsRecalculated,
    updatedMatchIds,
  };
}
