import { NextRequest, NextResponse } from "next/server";
import { syncLiveMatches, isValidCronSyncSecret } from "@/lib/live-matches";

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
    const result = await syncLiveMatches("sync", { useRuntimeCadence: true });

    return NextResponse.json({
      success: true,
      ...result,
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
