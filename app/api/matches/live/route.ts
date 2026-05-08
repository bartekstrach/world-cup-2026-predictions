import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  fetchLiveMatchesNormalized,
  syncLiveMatches,
} from "@/lib/live-matches";

type LiveMatchesMode = "preview" | "sync";

function parseMode(value: string | null): LiveMatchesMode {
  return value === "sync" ? "sync" : "preview";
}

export async function GET(request: NextRequest) {
  const mode = parseMode(request.nextUrl.searchParams.get("mode"));

  try {
    if (mode === "sync") {
      const session = await auth();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const result = await syncLiveMatches(mode);
      return NextResponse.json({ success: true, ...result });
    }

    const payload = await fetchLiveMatchesNormalized();

    return NextResponse.json({
      success: true,
      provider: payload.provider,
      fetchedAt: payload.fetchedAt,
      matches: payload.matches,
    });
  } catch (error) {
    console.error("Live matches endpoint failed", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Live matches request failed",
      },
      { status: 500 },
    );
  }
}
