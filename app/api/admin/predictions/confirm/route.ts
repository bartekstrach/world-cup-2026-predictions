import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { participants, predictions } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { participantName, matchPredictions } = await request.json();

    if (
      !participantName ||
      !matchPredictions ||
      matchPredictions.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing participant name or predictions" },
        { status: 400 }
      );
    }

    // Find or create participant
    let participant = await db.query.participants.findFirst({
      where: (participants, { eq }) => eq(participants.name, participantName),
    });

    if (!participant) {
      [participant] = await db
        .insert(participants)
        .values({ name: participantName })
        .returning();
    }

    let inserted = 0;
    let updated = 0;

    for (const pred of matchPredictions) {
      if (pred.homeScore === null || pred.awayScore === null || !pred.matchId) {
        continue;
      }

      // Check if prediction exists
      const existing = await db.query.predictions.findFirst({
        where: (predictions, { eq, and }) =>
          and(
            eq(predictions.participantId, participant!.id),
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
        updated++;
      } else {
        await db.insert(predictions).values({
          participantId: participant.id,
          matchId: pred.matchId,
          homeScore: pred.homeScore,
          awayScore: pred.awayScore,
        });
        inserted++;
      }
    }

    revalidatePath("/predictions");
    revalidatePath("/");

    return NextResponse.json({
      success: true,
      participantId: participant.id,
      inserted,
      updated,
      total: inserted + updated,
    });
  } catch (error) {
    console.error("Confirm error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Confirmation failed" },
      { status: 500 }
    );
  }
}
