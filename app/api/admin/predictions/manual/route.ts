import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { predictions } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { participantId, predictions: predictionsList } = await request.json();

  for (const pred of predictionsList) {
    const existing = await db.query.predictions.findFirst({
      where: (predictions, { eq, and }) =>
        and(
          eq(predictions.participantId, participantId),
          eq(predictions.matchId, pred.matchId)
        ),
    });

    if (existing) {
      await db
        .update(predictions)
        .set({
          homeScore: pred.homeScore,
          awayScore: pred.awayScore,
          updatedAt: new Date(),
        })
        .where(eq(predictions.id, existing.id));
    } else {
      await db.insert(predictions).values({
        participantId,
        matchId: pred.matchId,
        homeScore: pred.homeScore,
        awayScore: pred.awayScore,
      });
    }
  }

  return NextResponse.json({ success: true });
}
