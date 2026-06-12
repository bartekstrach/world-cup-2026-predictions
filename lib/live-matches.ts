import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  CRON_SYNC_SECRET,
  LIVE_MATCHES_API_KEY,
  LIVE_MATCHES_API_URL,
  LIVE_MATCHES_ID_MAP,
  LIVE_MATCHES_PROVIDERS,
  LIVE_MATCHES_PROVIDER_NAME,
  LIVE_MATCHES_TIMEOUT_MS,
  MATCH_STATUSES,
} from "@/lib/constants";
import { updateMatchPredictions } from "@/lib/scoring";
import { liveSyncRuntimeStates, matches } from "@/lib/schema";
import type { MatchStatus } from "@/lib/constants";

export type LiveProviderMatch = {
  providerMatchId: string;
  matchNumber?: number | null;
  homeScore?: number | null;
  awayScore?: number | null;
  status: MatchStatus;
  minute?: number | null;
  startedAt?: string | null;
  raw?: unknown;
};

export type LiveProviderPayload = {
  provider: string;
  fetchedAt: string;
  matches: LiveProviderMatch[];
};

export type LiveSyncMode = "preview" | "sync";

export type LiveSyncResult = {
  provider: string;
  fetchedAt: string;
  mode: LiveSyncMode;
  totalIncoming: number;
  totalMapped: number;
  updatedMatches: number;
  unchangedMatches: number;
  skippedMatches: number;
  predictionsRecalculated: number;
  updatedMatchIds: number[];
  activeLiveMatches: number;
  polledMatches: number;
  halftimePausedMatches: number;
  finalizedMatches: number;
};

export class LiveSyncSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LiveSyncSafetyError";
  }
}

type SyncLiveMatchesOptions = {
  useRuntimeCadence?: boolean;
};

type LiveProviderAdapter = {
  provider: string;
  fetchMatches: () => Promise<LiveProviderPayload>;
};

type ProviderRawMatch = {
  id?: string | number;
  match_id?: string | number;
  matchNumber?: number;
  match_number?: number;
  homeScore?: number | null;
  home_score?: number | null;
  awayScore?: number | null;
  away_score?: number | null;
  status?: string | null;
  state?: string | null;
  minute?: number | null;
  startedAt?: string | null;
  started_at?: string | null;
  [key: string]: unknown;
};

type FootballDataScoreTime = {
  home?: number | null;
  away?: number | null;
  homeTeam?: number | null;
  awayTeam?: number | null;
};

type FootballDataScore = {
  fullTime?: FootballDataScoreTime | null;
  regularTime?: FootballDataScoreTime | null;
};

type FootballDataRawMatch = {
  id?: string | number;
  matchNumber?: number | null;
  match_number?: number | null;
  matchday?: number | null;
  utcDate?: string | null;
  status?: string | null;
  minute?: number | null;
  score?: FootballDataScore | null;
  [key: string]: unknown;
};

type FootballDataMatchesPayload = {
  matches?: FootballDataRawMatch[];
  match?: FootballDataRawMatch;
};

type ExternalIdMap = Record<string, number>;

type LiveRuntimeState = {
  matchId: number;
  providerMatchId: string | null;
  halftimeStartedAt: Date | null;
  lastPolledAt: Date | null;
  finalizedAt: Date | null;
};

const LIVE_POLL_INTERVAL_MS = 30 * 1000;
const HALFTIME_PAUSE_MS = 15 * 60 * 1000;

function parseScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalized = Math.trunc(value);
  return normalized >= 0 ? normalized : null;
}

function parseMinute(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalized = Math.trunc(value);
  return normalized >= 0 ? normalized : null;
}

function normalizeProviderStatus(value: unknown): MatchStatus {
  if (typeof value !== "string") {
    return MATCH_STATUSES.SCHEDULED;
  }

  const normalized = value.trim().toLowerCase();

  if (["finished", "ft", "full_time", "completed"].includes(normalized)) {
    return MATCH_STATUSES.FINISHED;
  }

  if (["live", "in_progress", "playing"].includes(normalized)) {
    return MATCH_STATUSES.LIVE;
  }

  return MATCH_STATUSES.SCHEDULED;
}

function normalizeFootballDataStatus(value: unknown): MatchStatus {
  if (typeof value !== "string") {
    return MATCH_STATUSES.SCHEDULED;
  }

  const normalized = value.trim().toUpperCase();

  if (["FINISHED", "AWARDED"].includes(normalized)) {
    return MATCH_STATUSES.FINISHED;
  }

  // football-data v4 states that represent an ongoing (not yet final) match
  if (["IN_PLAY", "PAUSED", "SUSPENDED"].includes(normalized)) {
    return MATCH_STATUSES.LIVE;
  }

  // Remaining known states (SCHEDULED, TIMED, POSTPONED, CANCELED, etc.)
  // are treated as non-live, non-final in this project.
  return MATCH_STATUSES.SCHEDULED;
}

function normalizeProviderMatch(raw: ProviderRawMatch): LiveProviderMatch {
  const providerMatchId =
    String(raw.match_id ?? raw.id ?? "").trim() || "unknown";

  const matchNumberRaw = raw.match_number ?? raw.matchNumber;
  const matchNumber =
    typeof matchNumberRaw === "number" && Number.isInteger(matchNumberRaw)
      ? matchNumberRaw
      : null;

  return {
    providerMatchId,
    matchNumber,
    homeScore: parseScore(raw.home_score ?? raw.homeScore),
    awayScore: parseScore(raw.away_score ?? raw.awayScore),
    status: normalizeProviderStatus(raw.status ?? raw.state),
    minute: parseMinute(raw.minute),
    startedAt:
      typeof (raw.started_at ?? raw.startedAt) === "string"
        ? String(raw.started_at ?? raw.startedAt)
        : null,
    raw,
  };
}

function selectFootballDataScore(
  score: FootballDataScore | null | undefined,
  status: MatchStatus,
) {
  const regularTimeHome = parseScore(
    score?.regularTime?.home ?? score?.regularTime?.homeTeam,
  );
  const regularTimeAway = parseScore(
    score?.regularTime?.away ?? score?.regularTime?.awayTeam,
  );
  const fullTimeHome = parseScore(
    score?.fullTime?.home ?? score?.fullTime?.homeTeam,
  );
  const fullTimeAway = parseScore(
    score?.fullTime?.away ?? score?.fullTime?.awayTeam,
  );

  const hasRegularTimeScore =
    regularTimeHome !== null && regularTimeAway !== null;
  const hasFullTimeScore = fullTimeHome !== null && fullTimeAway !== null;

  if (status === MATCH_STATUSES.FINISHED && hasRegularTimeScore) {
    return {
      homeScore: regularTimeHome,
      awayScore: regularTimeAway,
    };
  }

  if (hasFullTimeScore) {
    return {
      homeScore: fullTimeHome,
      awayScore: fullTimeAway,
    };
  }

  if (hasRegularTimeScore) {
    return {
      homeScore: regularTimeHome,
      awayScore: regularTimeAway,
    };
  }

  return {
    homeScore: null,
    awayScore: null,
  };
}

function normalizeFootballDataMatch(
  raw: FootballDataRawMatch,
): LiveProviderMatch {
  const providerMatchId = String(raw.id ?? "").trim() || "unknown";
  const status = normalizeFootballDataStatus(raw.status);
  const selectedScore = selectFootballDataScore(raw.score, status);

  const matchNumberRaw = raw.match_number ?? raw.matchNumber;
  const matchNumber =
    typeof matchNumberRaw === "number" && Number.isInteger(matchNumberRaw)
      ? matchNumberRaw
      : null;

  return {
    providerMatchId,
    matchNumber,
    homeScore: selectedScore.homeScore,
    awayScore: selectedScore.awayScore,
    status,
    minute: parseMinute(raw.minute),
    startedAt: typeof raw.utcDate === "string" ? raw.utcDate : null,
    raw,
  };
}

function parseExternalIdMap(): ExternalIdMap {
  try {
    const parsed = JSON.parse(LIVE_MATCHES_ID_MAP) as Record<string, unknown>;

    return Object.entries(parsed).reduce<ExternalIdMap>((acc, [key, value]) => {
      if (!key) return acc;

      const normalizedValue =
        typeof value === "number"
          ? value
          : typeof value === "string"
            ? Number(value)
            : NaN;

      if (Number.isInteger(normalizedValue) && normalizedValue > 0) {
        acc[key] = normalizedValue;
      }

      return acc;
    }, {});
  } catch {
    return {};
  }
}

function resolveMatchNumberFromMapping(
  providerMatch: LiveProviderMatch,
  externalIdMap: ExternalIdMap,
) {
  if (
    typeof providerMatch.matchNumber === "number" &&
    Number.isInteger(providerMatch.matchNumber)
  ) {
    return providerMatch.matchNumber;
  }

  const mapped = externalIdMap[providerMatch.providerMatchId];
  return Number.isInteger(mapped) ? mapped : null;
}

async function fetchProviderJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = Number.isFinite(LIVE_MATCHES_TIMEOUT_MS)
    ? LIVE_MATCHES_TIMEOUT_MS
    : 10000;
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Provider request failed with status ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchProviderJsonWithHeaders(
  url: string,
  headers: Record<string, string>,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = Number.isFinite(LIVE_MATCHES_TIMEOUT_MS)
    ? LIVE_MATCHES_TIMEOUT_MS
    : 10000;
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...headers,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Provider request failed with status ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

function createMockAdapter(): LiveProviderAdapter {
  return {
    provider: "mock",
    async fetchMatches() {
      return {
        provider: "mock",
        fetchedAt: new Date().toISOString(),
        matches: [],
      };
    },
  };
}

function createHttpAdapter(): LiveProviderAdapter {
  return {
    provider: LIVE_MATCHES_PROVIDER_NAME,
    async fetchMatches() {
      if (!LIVE_MATCHES_API_URL) {
        throw new Error("LIVE_MATCHES_API_URL is not configured");
      }

      const json = await fetchProviderJsonWithHeaders(LIVE_MATCHES_API_URL, {
        ...(LIVE_MATCHES_API_KEY
          ? { Authorization: `Bearer ${LIVE_MATCHES_API_KEY}` }
          : {}),
      });
      const payload =
        typeof json === "object" && json !== null
          ? (json as Record<string, unknown>)
          : null;

      const sourceMatches = Array.isArray(payload?.matches)
        ? (payload?.matches as ProviderRawMatch[])
        : [];

      return {
        provider: LIVE_MATCHES_PROVIDER_NAME,
        fetchedAt: new Date().toISOString(),
        matches: sourceMatches.map(normalizeProviderMatch),
      };
    },
  };
}

function createFootballDataAdapter(): LiveProviderAdapter {
  return {
    provider: LIVE_MATCHES_PROVIDERS.FOOTBALL_DATA,
    async fetchMatches() {
      if (!LIVE_MATCHES_API_URL) {
        throw new Error("LIVE_MATCHES_API_URL is not configured");
      }

      const footballDataToken =
        LIVE_MATCHES_API_KEY || process.env.FOOTBALL_DATA_API_TOKEN || "";
      const json = await fetchProviderJsonWithHeaders(LIVE_MATCHES_API_URL, {
        ...(footballDataToken ? { "X-Auth-Token": footballDataToken } : {}),
      });
      const payload =
        typeof json === "object" && json !== null
          ? (json as FootballDataMatchesPayload)
          : null;

      const sourceMatches = Array.isArray(payload?.matches)
        ? payload.matches
        : payload?.match
          ? [payload.match]
          : [];

      return {
        provider: LIVE_MATCHES_PROVIDERS.FOOTBALL_DATA,
        fetchedAt: new Date().toISOString(),
        matches: sourceMatches.map(normalizeFootballDataMatch),
      };
    },
  };
}

function getLiveProviderAdapter(): LiveProviderAdapter {
  const provider = LIVE_MATCHES_PROVIDER_NAME.trim().toLowerCase();

  if (provider === LIVE_MATCHES_PROVIDERS.MOCK || !LIVE_MATCHES_API_URL) {
    return createMockAdapter();
  }

  if (provider === LIVE_MATCHES_PROVIDERS.FOOTBALL_DATA) {
    return createFootballDataAdapter();
  }

  return createHttpAdapter();
}

async function fetchFootballDataMatchesByStatus(
  status: string,
): Promise<LiveProviderMatch[]> {
  if (!LIVE_MATCHES_API_URL) {
    return [];
  }

  const footballDataToken =
    LIVE_MATCHES_API_KEY || process.env.FOOTBALL_DATA_API_TOKEN || "";
  const endpoint = new URL(LIVE_MATCHES_API_URL);
  endpoint.searchParams.set("status", status);

  const json = await fetchProviderJsonWithHeaders(endpoint.toString(), {
    ...(footballDataToken ? { "X-Auth-Token": footballDataToken } : {}),
  });

  const payload =
    typeof json === "object" && json !== null
      ? (json as FootballDataMatchesPayload)
      : null;

  const sourceMatches = Array.isArray(payload?.matches)
    ? payload.matches
    : payload?.match
      ? [payload.match]
      : [];

  return sourceMatches.map(normalizeFootballDataMatch);
}

function hasScoreChanged({
  previousHome,
  previousAway,
  nextHome,
  nextAway,
}: {
  previousHome: number | null;
  previousAway: number | null;
  nextHome: number | null;
  nextAway: number | null;
}) {
  return previousHome !== nextHome || previousAway !== nextAway;
}

function isHalftimeSignal(match: LiveProviderMatch): boolean {
  const raw =
    typeof match.raw === "object" && match.raw !== null
      ? (match.raw as Record<string, unknown>)
      : null;

  const rawStatus = raw?.status;
  const rawState = raw?.state;

  const normalizedRawStatus =
    typeof rawStatus === "string" ? rawStatus.trim().toLowerCase() : "";
  const normalizedRawState =
    typeof rawState === "string" ? rawState.trim().toLowerCase() : "";

  if (["paused", "halftime", "half_time", "ht"].includes(normalizedRawStatus)) {
    return true;
  }

  if (["paused", "halftime", "half_time", "ht"].includes(normalizedRawState)) {
    return true;
  }

  return false;
}

async function upsertRuntimeState(
  current: LiveRuntimeState | null,
  matchId: number,
  changes: Partial<
    Pick<
      LiveRuntimeState,
      "providerMatchId" | "halftimeStartedAt" | "lastPolledAt" | "finalizedAt"
    >
  >,
): Promise<LiveRuntimeState> {
  const now = new Date();

  if (!current) {
    const next: LiveRuntimeState = {
      matchId,
      providerMatchId:
        changes.providerMatchId === undefined ? null : changes.providerMatchId,
      halftimeStartedAt:
        changes.halftimeStartedAt === undefined
          ? null
          : changes.halftimeStartedAt,
      lastPolledAt:
        changes.lastPolledAt === undefined ? null : changes.lastPolledAt,
      finalizedAt:
        changes.finalizedAt === undefined ? null : changes.finalizedAt,
    };

    await db.insert(liveSyncRuntimeStates).values({
      matchId,
      providerMatchId: next.providerMatchId,
      halftimeStartedAt: next.halftimeStartedAt,
      lastPolledAt: next.lastPolledAt,
      finalizedAt: next.finalizedAt,
      createdAt: now,
      updatedAt: now,
    });

    return next;
  }

  const next: LiveRuntimeState = {
    ...current,
    ...(changes.providerMatchId === undefined
      ? {}
      : { providerMatchId: changes.providerMatchId }),
    ...(changes.halftimeStartedAt === undefined
      ? {}
      : { halftimeStartedAt: changes.halftimeStartedAt }),
    ...(changes.lastPolledAt === undefined
      ? {}
      : { lastPolledAt: changes.lastPolledAt }),
    ...(changes.finalizedAt === undefined
      ? {}
      : { finalizedAt: changes.finalizedAt }),
  };

  await db
    .update(liveSyncRuntimeStates)
    .set({
      ...(changes.providerMatchId === undefined
        ? {}
        : { providerMatchId: changes.providerMatchId }),
      ...(changes.halftimeStartedAt === undefined
        ? {}
        : { halftimeStartedAt: changes.halftimeStartedAt }),
      ...(changes.lastPolledAt === undefined
        ? {}
        : { lastPolledAt: changes.lastPolledAt }),
      ...(changes.finalizedAt === undefined
        ? {}
        : { finalizedAt: changes.finalizedAt }),
      updatedAt: now,
    })
    .where(eq(liveSyncRuntimeStates.matchId, matchId));

  return next;
}

export async function fetchLiveMatchesNormalized(): Promise<LiveProviderPayload> {
  const adapter = getLiveProviderAdapter();
  return adapter.fetchMatches();
}

export async function syncLiveMatches(
  mode: LiveSyncMode,
  options?: SyncLiveMatchesOptions,
): Promise<LiveSyncResult> {
  const useRuntimeCadence = mode === "sync" && options?.useRuntimeCadence;
  const payload = await fetchLiveMatchesNormalized();
  const externalIdMap = parseExternalIdMap();

  const matchesWithResolvedMapping = payload.matches.map((item) => ({
    ...item,
    matchNumber: resolveMatchNumberFromMapping(item, externalIdMap),
  }));

  const explicitlyMappedMatchNumbers = new Set<number>(
    matchesWithResolvedMapping
      .map((item) => item.matchNumber)
      .filter(
        (matchNumber): matchNumber is number =>
          typeof matchNumber === "number" && Number.isInteger(matchNumber),
      ),
  );

  const hasUnmappedIncoming = matchesWithResolvedMapping.some(
    (item) =>
      typeof item.matchNumber !== "number" ||
      !Number.isInteger(item.matchNumber),
  );

  if (mode === "sync" && payload.matches.length > 1 && hasUnmappedIncoming) {
    throw new LiveSyncSafetyError(
      "Unsafe sync blocked: multiple live matches received without explicit mapping. Configure LIVE_MATCHES_ID_MAP.",
    );
  }

  const fallbackMatchNumberQueue = hasUnmappedIncoming
    ? (() => {
        // Keep fallback stable across cron runs:
        // 1) first reuse already-live local matches,
        // 2) only then assign next scheduled by date.
        const liveFirst = db.query.matches.findMany({
          where: (table, { eq }) => eq(table.status, MATCH_STATUSES.LIVE),
          orderBy: (table, { asc }) => [asc(table.matchDate)],
          columns: {
            matchNumber: true,
          },
        });

        const scheduledNext = db.query.matches.findMany({
          where: (table, { eq }) => eq(table.status, MATCH_STATUSES.SCHEDULED),
          orderBy: (table, { asc }) => [asc(table.matchDate)],
          columns: {
            matchNumber: true,
          },
        });

        return Promise.all([liveFirst, scheduledNext]).then(
          ([liveRows, scheduledRows]) => {
            const seen = new Set<number>(explicitlyMappedMatchNumbers);
            const queue: number[] = [];

            for (const row of liveRows) {
              if (!seen.has(row.matchNumber)) {
                seen.add(row.matchNumber);
                queue.push(row.matchNumber);
              }
            }

            for (const row of scheduledRows) {
              if (!seen.has(row.matchNumber)) {
                seen.add(row.matchNumber);
                queue.push(row.matchNumber);
              }
            }

            return queue;
          },
        );
      })()
    : Promise.resolve([] as number[]);

  const resolvedFallbackQueue = await fallbackMatchNumberQueue;

  const mappedMatches = matchesWithResolvedMapping
    .map((item) => {
      if (
        typeof item.matchNumber === "number" &&
        Number.isInteger(item.matchNumber)
      ) {
        return item;
      }

      const fallbackMatchNumber = resolvedFallbackQueue.shift() ?? null;

      return {
        ...item,
        matchNumber: fallbackMatchNumber,
      };
    })
    .filter(
      (item): item is LiveProviderMatch & { matchNumber: number } =>
        typeof item.matchNumber === "number" &&
        Number.isInteger(item.matchNumber),
    );

  const matchNumbers = mappedMatches.map((item) => item.matchNumber);

  const localMatches = matchNumbers.length
    ? await db.query.matches.findMany({
        where: (table, { inArray }) => inArray(table.matchNumber, matchNumbers),
      })
    : [];

  const localByMatchNumber = new Map(
    localMatches.map((m) => [m.matchNumber, m]),
  );

  const localMatchIds = localMatches.map((m) => m.id);

  const runtimeRows = useRuntimeCadence
    ? localMatchIds.length
      ? await db.query.liveSyncRuntimeStates.findMany({
          where: (table, { inArray }) => inArray(table.matchId, localMatchIds),
        })
      : []
    : [];

  const runtimeByMatchId = new Map<number, LiveRuntimeState>(
    runtimeRows.map((row) => [
      row.matchId,
      {
        matchId: row.matchId,
        providerMatchId: row.providerMatchId,
        halftimeStartedAt: row.halftimeStartedAt,
        lastPolledAt: row.lastPolledAt,
        finalizedAt: row.finalizedAt,
      },
    ]),
  );

  let updatedMatches = 0;
  let unchangedMatches = 0;
  let skippedMatches = 0;
  let predictionsRecalculated = 0;
  let activeLiveMatches = 0;
  let polledMatches = 0;
  let halftimePausedMatches = 0;
  let finalizedMatches = 0;
  const updatedMatchIds: number[] = [];

  if (mode === "sync" && useRuntimeCadence && payload.matches.length === 0) {
    const unresolvedRuntimeRows = await db.query.liveSyncRuntimeStates.findMany(
      {
        where: (table, { isNull }) => isNull(table.finalizedAt),
      },
    );

    if (unresolvedRuntimeRows.length > 0) {
      const unresolvedMatchIds = unresolvedRuntimeRows.map(
        (row) => row.matchId,
      );
      const unresolvedMatches = await db.query.matches.findMany({
        where: (table, { inArray }) => inArray(table.id, unresolvedMatchIds),
      });
      const unresolvedById = new Map(
        unresolvedMatches.map((match) => [match.id, match]),
      );
      const now = new Date();

      const finishedByProviderMatchId = new Map<string, LiveProviderMatch>();

      if (
        LIVE_MATCHES_PROVIDER_NAME.trim().toLowerCase() ===
        LIVE_MATCHES_PROVIDERS.FOOTBALL_DATA
      ) {
        const finishedMatches =
          await fetchFootballDataMatchesByStatus("FINISHED");

        for (const finishedMatch of finishedMatches) {
          finishedByProviderMatchId.set(
            finishedMatch.providerMatchId,
            finishedMatch,
          );
        }
      }

      for (const runtimeRow of unresolvedRuntimeRows) {
        const local = unresolvedById.get(runtimeRow.matchId);

        if (!local) {
          continue;
        }

        const shouldFinalizeMatch = local.status === MATCH_STATUSES.LIVE;

        if (shouldFinalizeMatch) {
          const finishedSnapshot = runtimeRow.providerMatchId
            ? (finishedByProviderMatchId.get(runtimeRow.providerMatchId) ??
              null)
            : null;
          const nextHomeScore =
            typeof finishedSnapshot?.homeScore === "number"
              ? finishedSnapshot.homeScore
              : local.homeScore;
          const nextAwayScore =
            typeof finishedSnapshot?.awayScore === "number"
              ? finishedSnapshot.awayScore
              : local.awayScore;

          await db
            .update(matches)
            .set({
              homeScore: nextHomeScore,
              awayScore: nextAwayScore,
              status: MATCH_STATUSES.FINISHED,
            })
            .where(eq(matches.id, local.id));

          updatedMatches += 1;
          updatedMatchIds.push(local.id);

          if (nextHomeScore !== null && nextAwayScore !== null) {
            const updatedPredictions = await updateMatchPredictions(local.id);
            predictionsRecalculated += updatedPredictions;
          }
        }

        await db
          .update(liveSyncRuntimeStates)
          .set({
            finalizedAt: now,
            halftimeStartedAt: null,
            updatedAt: now,
          })
          .where(eq(liveSyncRuntimeStates.matchId, runtimeRow.matchId));

        finalizedMatches += 1;
      }
    }
  }

  for (const incoming of mappedMatches) {
    const local = localByMatchNumber.get(incoming.matchNumber);

    if (!local) {
      skippedMatches += 1;
      continue;
    }

    const now = new Date();
    let runtime = runtimeByMatchId.get(local.id) ?? null;

    if (
      mode === "sync" &&
      useRuntimeCadence &&
      runtime?.providerMatchId !== incoming.providerMatchId
    ) {
      runtime = await upsertRuntimeState(runtime, local.id, {
        providerMatchId: incoming.providerMatchId,
      });
      runtimeByMatchId.set(local.id, runtime);
    }

    if (useRuntimeCadence && incoming.status === MATCH_STATUSES.LIVE) {
      activeLiveMatches += 1;
    }

    if (
      useRuntimeCadence &&
      (runtime?.finalizedAt || local.status === MATCH_STATUSES.FINISHED)
    ) {
      finalizedMatches += 1;

      if (!runtime?.finalizedAt && mode === "sync") {
        runtime = await upsertRuntimeState(runtime, local.id, {
          providerMatchId: incoming.providerMatchId,
          finalizedAt: now,
          halftimeStartedAt: null,
        });
        runtimeByMatchId.set(local.id, runtime);
      }

      continue;
    }

    if (useRuntimeCadence && incoming.status === MATCH_STATUSES.LIVE) {
      const halftimeSignal = isHalftimeSignal(incoming);

      if (halftimeSignal) {
        const halftimeStartedAt = runtime?.halftimeStartedAt ?? now;

        if (mode === "sync" && !runtime?.halftimeStartedAt) {
          runtime = await upsertRuntimeState(runtime, local.id, {
            providerMatchId: incoming.providerMatchId,
            halftimeStartedAt,
          });
          runtimeByMatchId.set(local.id, runtime);
        }

        if (now.getTime() - halftimeStartedAt.getTime() < HALFTIME_PAUSE_MS) {
          halftimePausedMatches += 1;
          continue;
        }
      } else if (mode === "sync" && runtime?.halftimeStartedAt) {
        runtime = await upsertRuntimeState(runtime, local.id, {
          providerMatchId: incoming.providerMatchId,
          halftimeStartedAt: null,
        });
        runtimeByMatchId.set(local.id, runtime);
      }

      if (
        runtime?.lastPolledAt &&
        now.getTime() - runtime.lastPolledAt.getTime() < LIVE_POLL_INTERVAL_MS
      ) {
        continue;
      }
    }

    if (
      useRuntimeCadence &&
      incoming.status !== MATCH_STATUSES.LIVE &&
      incoming.status !== MATCH_STATUSES.FINISHED
    ) {
      continue;
    }

    if (useRuntimeCadence) {
      polledMatches += 1;
    }

    if (mode === "sync" && useRuntimeCadence) {
      runtime = await upsertRuntimeState(runtime, local.id, {
        providerMatchId: incoming.providerMatchId,
        lastPolledAt: now,
      });
      runtimeByMatchId.set(local.id, runtime);
    }

    const nextHomeScore =
      typeof incoming.homeScore === "number"
        ? incoming.homeScore
        : local.homeScore;
    const nextAwayScore =
      typeof incoming.awayScore === "number"
        ? incoming.awayScore
        : local.awayScore;
    const nextStatus =
      local.status === MATCH_STATUSES.FINISHED &&
      incoming.status !== MATCH_STATUSES.FINISHED
        ? MATCH_STATUSES.FINISHED
        : incoming.status;

    const scoreChanged = hasScoreChanged({
      previousHome: local.homeScore,
      previousAway: local.awayScore,
      nextHome: nextHomeScore,
      nextAway: nextAwayScore,
    });

    const statusChanged = local.status !== nextStatus;

    if (!scoreChanged && !statusChanged) {
      unchangedMatches += 1;
      continue;
    }

    if (mode === "sync") {
      await db
        .update(matches)
        .set({
          homeScore: nextHomeScore,
          awayScore: nextAwayScore,
          status: nextStatus,
        })
        .where(eq(matches.id, local.id));

      if (
        nextStatus === MATCH_STATUSES.FINISHED &&
        nextHomeScore !== null &&
        nextAwayScore !== null &&
        (scoreChanged || local.status !== MATCH_STATUSES.FINISHED)
      ) {
        const updatedPredictions = await updateMatchPredictions(local.id);
        predictionsRecalculated += updatedPredictions;
      }

      if (useRuntimeCadence && nextStatus === MATCH_STATUSES.FINISHED) {
        runtime = await upsertRuntimeState(runtime, local.id, {
          providerMatchId: incoming.providerMatchId,
          finalizedAt: now,
          halftimeStartedAt: null,
        });
        runtimeByMatchId.set(local.id, runtime);
        finalizedMatches += 1;
      }

      updatedMatchIds.push(local.id);
    }

    updatedMatches += 1;
  }

  if (mode === "sync" && updatedMatchIds.length > 0) {
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/matches");
  }

  return {
    provider: payload.provider,
    fetchedAt: payload.fetchedAt,
    mode,
    totalIncoming: payload.matches.length,
    totalMapped: mappedMatches.length,
    updatedMatches,
    unchangedMatches,
    skippedMatches,
    predictionsRecalculated,
    updatedMatchIds,
    activeLiveMatches,
    polledMatches,
    halftimePausedMatches,
    finalizedMatches,
  };
}

export function isValidCronSyncSecret(secret: string | null): boolean {
  if (!CRON_SYNC_SECRET) return false;
  if (!secret) return false;
  return secret === CRON_SYNC_SECRET;
}
