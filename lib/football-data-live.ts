const FOOTBALL_DATA_BASE_URL = "https://api.football-data.org/v4";
const WORLD_CUP_CODE = "WC";
const LIVE_STATUSES = new Set(["IN_PLAY", "PAUSED"]);
const DEFAULT_TIMEOUT_MS = 60_000;

export type WorldCupLiveMatch = {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  scoreHome: number | null;
  scoreAway: number | null;
  minute: number | null;
  status: string;
};

type FootballDataScoreTime = {
  home: number | null;
  away: number | null;
};

type FootballDataMatch = {
  id?: number;
  status?: string;
  minute?: number | null;
  homeTeam?: {
    name?: string;
  };
  awayTeam?: {
    name?: string;
  };
  score?: {
    fullTime?: FootballDataScoreTime | null;
    regularTime?: FootballDataScoreTime | null;
  };
};

type FootballDataMatchesResponse = {
  matches?: FootballDataMatch[];
};

function toNonNegativeInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalized = Math.trunc(value);
  return normalized >= 0 ? normalized : null;
}

function pickLiveScore(match: FootballDataMatch) {
  const fullTimeHome = toNonNegativeInt(match.score?.fullTime?.home);
  const fullTimeAway = toNonNegativeInt(match.score?.fullTime?.away);

  if (fullTimeHome !== null || fullTimeAway !== null) {
    return {
      scoreHome: fullTimeHome,
      scoreAway: fullTimeAway,
    };
  }

  return {
    scoreHome: toNonNegativeInt(match.score?.regularTime?.home),
    scoreAway: toNonNegativeInt(match.score?.regularTime?.away),
  };
}

function mapLiveMatch(match: FootballDataMatch): WorldCupLiveMatch | null {
  if (typeof match.id !== "number") {
    return null;
  }

  const status = typeof match.status === "string" ? match.status : "UNKNOWN";
  const scores = pickLiveScore(match);

  return {
    matchId: match.id,
    homeTeam: match.homeTeam?.name ?? "Unknown",
    awayTeam: match.awayTeam?.name ?? "Unknown",
    scoreHome: scores.scoreHome,
    scoreAway: scores.scoreAway,
    minute: toNonNegativeInt(match.minute),
    status,
  };
}

/**
 * Pobiera aktualnie trwające mecze MŚ 2026 z football-data.org v4.
 *
 * Zachowanie błędów:
 * - HTTP 429 i inne 4xx/5xx są logowane i funkcja zwraca pustą tablicę.
 * - Timeout requestu domyślnie: 60 sekund.
 */
export async function fetchWorldCupLiveMatches(
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<WorldCupLiveMatch[]> {
  const token = process.env.FOOTBALL_DATA_API_TOKEN;

  if (!token) {
    console.error(
      "[football-data] Missing FOOTBALL_DATA_API_TOKEN. Returning empty live matches list.",
    );
    return [];
  }

  const controller = new AbortController();
  const timeout =
    Number.isFinite(timeoutMs) && timeoutMs > 0
      ? timeoutMs
      : DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeout);

  const endpoint = new URL(
    `${FOOTBALL_DATA_BASE_URL}/competitions/${WORLD_CUP_CODE}/matches`,
  );
  endpoint.searchParams.set("status", "IN_PLAY,PAUSED");

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
      const errorBody = await response.text().catch(() => "");
      const bodyPreview = errorBody.slice(0, 1000);

      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        console.error(
          `[football-data] HTTP 429 Too Many Requests. Retry-After=${retryAfter ?? "n/a"}. Body=${bodyPreview}`,
        );
      } else {
        console.error(
          `[football-data] HTTP ${response.status} ${response.statusText}. Body=${bodyPreview}`,
        );
      }

      return [];
    }

    const payload = (await response.json()) as FootballDataMatchesResponse;
    const sourceMatches = Array.isArray(payload.matches) ? payload.matches : [];

    return sourceMatches
      .filter((match) => LIVE_STATUSES.has(match.status ?? ""))
      .map(mapLiveMatch)
      .filter((match): match is WorldCupLiveMatch => match !== null);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error(
        `[football-data] Request timeout after ${timeout}ms while fetching World Cup live matches.`,
      );
      return [];
    }

    console.error("[football-data] Unexpected fetch error:", error);
    return [];
  } finally {
    clearTimeout(timer);
  }
}
