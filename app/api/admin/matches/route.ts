import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { matches } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { updateMatchPredictions } from "@/lib/scoring";
import { revalidatePath } from "next/cache";

export async function PATCH(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { matchId, homeScore, awayScore, status } = await request.json();

  await db
    .update(matches)
    .set({
      homeScore,
      awayScore,
      status,
    })
    .where(eq(matches.id, matchId));

  // Recalculate points if match is finished
  if (status === "finished") {
    await updateMatchPredictions(matchId);
  }

  // Revalidate public pages
  revalidatePath("/");
  revalidatePath("/predictions");

  return NextResponse.json({ success: true });
}
