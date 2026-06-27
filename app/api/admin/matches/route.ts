import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { matches } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { updateMatchPredictions } from "@/lib/scoring";
import { revalidatePath } from "next/cache";
import { MATCH_STATUSES } from "@/lib/constants";
import type { MatchStatus } from "@/lib/constants";

type PatchPayload = {
  matchId?: number;
  homeScore?: number;
  awayScore?: number;
  status?: unknown;
};

function isMatchStatus(value: unknown): value is MatchStatus {
  return (
    typeof value === "string" &&
    (Object.values(MATCH_STATUSES) as string[]).includes(value)
  );
}

export async function PATCH(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { matchId, homeScore, awayScore, status }: PatchPayload =
    await request.json();

  if (
    typeof matchId !== "number" ||
    typeof homeScore !== "number" ||
    typeof awayScore !== "number" ||
    !isMatchStatus(status)
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await db
    .update(matches)
    .set({
      homeScore,
      awayScore,
      status,
      // Manual admin edits are authoritative: clearing finishedAt opts the
      // match out of the v2 post-finalization recheck so the provider can
      // never clobber a hand-corrected score.
      finishedAt: null,
    })
    .where(eq(matches.id, matchId));

  // Recalculate points if match is finished
  if (status === MATCH_STATUSES.FINISHED) {
    await updateMatchPredictions(matchId);
  }

  // Revalidate public pages
  revalidatePath("/");
  revalidatePath("/predictions");
  revalidatePath("/admin/matches");

  return NextResponse.json({ success: true });
}
