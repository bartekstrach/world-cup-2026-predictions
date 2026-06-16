import { NextRequest, NextResponse } from "next/server";
import { isValidCronSyncSecret } from "@/lib/live-matches";
import { runLiveSyncV2 } from "@/lib/football-data-sync";
import { LIVE_MATCHES_DEBUG_LOGS } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LOG_PREFIX = "🥝 [cron/sync-matches-v2]";

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

    const result = await runLiveSyncV2({
      debug: LIVE_MATCHES_DEBUG_LOGS,
      requestId,
    });

    logInfo("Live sync v2 completed", {
      requestId,
      ok: result.ok,
      skipped: result.skipped,
      reason: result.reason,
      totalIncoming: result.totalIncoming,
      totalMapped: result.totalMapped,
      candidateMatches: result.candidateMatches,
      updatedMatches: result.updatedMatches,
      unchangedMatches: result.unchangedMatches,
      finalizedMatches: result.finalizedMatches,
      predictionsRecalculated: result.predictionsRecalculated,
      updatedMatchIds: result.updatedMatchIds,
    });

    return NextResponse.json({
      success: result.ok,
      ...result,
      checkedAt: now.toISOString(),
    });
  } catch (error) {
    console.error(LOG_PREFIX, "Cron sync v2 failed", {
      requestId,
      error,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Cron sync v2 failed",
      },
      { status: 500 },
    );
  }
}
