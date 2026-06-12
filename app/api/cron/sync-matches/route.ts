import { NextRequest, NextResponse } from "next/server";
import { isValidCronSyncSecret } from "@/lib/live-matches";
import { fetchWorldCupLiveMatches } from "@/lib/football-data-live";
import { db } from "@/lib/db";
import { matches } from "@/lib/schema";
import { MATCH_STATUSES } from "@/lib/constants";
import { and, eq, gte, lte, ne, or } from "drizzle-orm";

const LOOKBACK_MINUTES = 150;
const PREMATCH_WINDOW_MINUTES = 10;

function getSecretFromRequest(request: NextRequest): string | null {
  const bearer = request.headers.get("authorization");
  if (bearer?.toLowerCase().startsWith("bearer ")) {
    return bearer.slice(7).trim();
  }

  return request.headers.get("x-cron-secret");
}

export async function POST(request: NextRequest) {
  const secret = getSecretFromRequest(request);

  if (!isValidCronSyncSecret(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const lookbackStart = new Date(now.getTime() - LOOKBACK_MINUTES * 60_000);
    const prematchWindowEnd = new Date(
      now.getTime() + PREMATCH_WINDOW_MINUTES * 60_000,
    );

    const potentiallyActiveMatches = await db
      .select({ id: matches.id })
      .from(matches)
      .where(
        or(
          eq(matches.status, MATCH_STATUSES.LIVE),
          and(
            gte(matches.matchDate, lookbackStart),
            lte(matches.matchDate, now),
            ne(matches.status, MATCH_STATUSES.FINISHED),
          ),
          and(
            gte(matches.matchDate, now),
            lte(matches.matchDate, prematchWindowEnd),
          ),
        ),
      )
      .limit(1);

    if (potentiallyActiveMatches.length === 0) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: "No active matches",
        checkedAt: now.toISOString(),
        guard: {
          lookbackMinutes: LOOKBACK_MINUTES,
          prematchWindowMinutes: PREMATCH_WINDOW_MINUTES,
        },
      });
    }

    const liveMatches = await fetchWorldCupLiveMatches();

    return NextResponse.json({
      success: true,
      skipped: false,
      source: "football-data.org/v4",
      competition: "WC",
      fetchedAt: new Date().toISOString(),
      liveMatchesCount: liveMatches.length,
      liveMatches,
    });
  } catch (error) {
    console.error("Cron sync failed", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Cron sync failed",
      },
      { status: 500 },
    );
  }
}
