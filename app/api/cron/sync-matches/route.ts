import { NextRequest, NextResponse } from "next/server";
import {
  isValidCronSyncSecret,
  LiveSyncSafetyError,
  syncLiveMatches,
} from "@/lib/live-matches";
import { db } from "@/lib/db";
import { liveSyncRuntimeStates, matches } from "@/lib/schema";
import { LIVE_MATCHES_DEBUG_LOGS, MATCH_STATUSES } from "@/lib/constants";
import { and, eq, gte, isNull, lte, ne, or } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LOOKBACK_MINUTES = 150;
const PREMATCH_WINDOW_MINUTES = 10;
const LOG_PREFIX = "🍊 [cron/sync-matches]";

function logInfo(message: string, meta?: Record<string, unknown>) {
  if (!LIVE_MATCHES_DEBUG_LOGS) {
    return;
  }

  if (meta) {
    console.info(LOG_PREFIX, message, meta);
    return;
  }

  console.info(LOG_PREFIX, message);
}

function getSecretFromRequest(request: NextRequest): string | null {
  const bearer = request.headers.get("authorization");
  if (bearer?.toLowerCase().startsWith("bearer ")) {
    return bearer.slice(7).trim();
  }

  return request.headers.get("x-cron-secret");
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const secret = getSecretFromRequest(request);

  logInfo("Request received", {
    requestId,
    hasAuthorizationHeader: Boolean(request.headers.get("authorization")),
    hasCronHeader: Boolean(request.headers.get("x-cron-secret")),
  });

  if (!isValidCronSyncSecret(secret)) {
    logInfo("Unauthorized request", { requestId });

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const lookbackStart = new Date(now.getTime() - LOOKBACK_MINUTES * 60_000);
    const prematchWindowEnd = new Date(
      now.getTime() + PREMATCH_WINDOW_MINUTES * 60_000,
    );

    const pendingRuntimeStates = await db
      .select({ matchId: liveSyncRuntimeStates.matchId })
      .from(liveSyncRuntimeStates)
      .where(isNull(liveSyncRuntimeStates.finalizedAt))
      .limit(1);

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

    logInfo("Guard check completed", {
      requestId,
      potentiallyActiveMatches: potentiallyActiveMatches.length,
      pendingRuntimeStates: pendingRuntimeStates.length,
      lookbackMinutes: LOOKBACK_MINUTES,
      prematchWindowMinutes: PREMATCH_WINDOW_MINUTES,
    });

    if (
      potentiallyActiveMatches.length === 0 &&
      pendingRuntimeStates.length === 0
    ) {
      logInfo("Skipping sync: no active matches", { requestId });

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

    logInfo("Running live sync", {
      requestId,
      cadence: "runtime",
    });

    const result = await syncLiveMatches("sync", {
      useRuntimeCadence: true,
      debug: LIVE_MATCHES_DEBUG_LOGS,
      requestId,
    });

    logInfo("Live sync completed", {
      requestId,
      provider: result.provider,
      fetchedAt: result.fetchedAt,
      totalIncoming: result.totalIncoming,
      totalMapped: result.totalMapped,
      updatedMatches: result.updatedMatches,
      unchangedMatches: result.unchangedMatches,
      skippedMatches: result.skippedMatches,
      activeLiveMatches: result.activeLiveMatches,
      polledMatches: result.polledMatches,
      halftimePausedMatches: result.halftimePausedMatches,
      finalizedMatches: result.finalizedMatches,
      predictionsRecalculated: result.predictionsRecalculated,
      updatedMatchIds: result.updatedMatchIds,
      revalidatedPaths: ["/", "/admin", "/admin/matches"],
    });

    return NextResponse.json({
      success: true,
      skipped: false,
      ...result,
      checkedAt: now.toISOString(),
      guard: {
        lookbackMinutes: LOOKBACK_MINUTES,
        prematchWindowMinutes: PREMATCH_WINDOW_MINUTES,
      },
    });
  } catch (error) {
    if (error instanceof LiveSyncSafetyError) {
      logInfo("Sync blocked by safety check", {
        requestId,
        message: error.message,
      });

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 409 },
      );
    }

    console.error(LOG_PREFIX, "Cron sync failed", {
      requestId,
      error,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Cron sync failed",
      },
      { status: 500 },
    );
  }
}
