import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  CRON_SYNC_SECRET,
  LIVE_MATCHES_API_KEY,
  LIVE_MATCHES_API_URL,
  LIVE_MATCHES_ID_MAP,
  LIVE_MATCHES_PROVIDER_NAME,
  LIVE_MATCHES_TIMEOUT_MS,
  MATCH_STATUSES,
} from "@/lib/constants";
import { updateMatchPredictions } from "@/lib/scoring";
import { matches } from "@/lib/schema";
import type { MatchStatus } from "@/lib/constants";

export type LiveProviderMatch = {
  providerMatchId: string;
  matchNumber?: number | null;
  homeScore?: number | null;
  awayScore?: number | null;
  status: MatchStatus;
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
  startedAt?: string | null;
  started_at?: string | null;
  [key: string]: unknown;
};

type ExternalIdMap = Record<string, number>;

function parseScore(value: unknown): number | null {
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
    startedAt:
      typeof (raw.started_at ?? raw.startedAt) === "string"
        ? String(raw.started_at ?? raw.startedAt)
        : null,
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
        ...(LIVE_MATCHES_API_KEY
          ? { Authorization: `Bearer ${LIVE_MATCHES_API_KEY}` }
          : {}),
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

      const json = await fetchProviderJson(LIVE_MATCHES_API_URL);
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

function getLiveProviderAdapter(): LiveProviderAdapter {
  if (
    LIVE_MATCHES_PROVIDER_NAME.trim().toLowerCase() === "mock" ||
    !LIVE_MATCHES_API_URL
  ) {
    return createMockAdapter();
  }

  return createHttpAdapter();
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

export async function fetchLiveMatchesNormalized(): Promise<LiveProviderPayload> {
  const adapter = getLiveProviderAdapter();
  return adapter.fetchMatches();
}

export async function syncLiveMatches(
  mode: LiveSyncMode,
): Promise<LiveSyncResult> {
  const payload = await fetchLiveMatchesNormalized();
  const externalIdMap = parseExternalIdMap();

  const mappedMatches = payload.matches
    .map((item) => ({
      ...item,
      matchNumber: resolveMatchNumberFromMapping(item, externalIdMap),
    }))
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

  let updatedMatches = 0;
  let unchangedMatches = 0;
  let skippedMatches = 0;
  let predictionsRecalculated = 0;
  const updatedMatchIds: number[] = [];

  for (const incoming of mappedMatches) {
    const local = localByMatchNumber.get(incoming.matchNumber);

    if (!local) {
      skippedMatches += 1;
      continue;
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
  };
}

export function isValidCronSyncSecret(secret: string | null): boolean {
  if (!CRON_SYNC_SECRET) return false;
  if (!secret) return false;
  return secret === CRON_SYNC_SECRET;
}
