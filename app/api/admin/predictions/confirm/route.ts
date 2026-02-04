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

    // Get all matches with teams
    const allMatches = await db.query.matches.findMany({
      with: {
        homeTeam: true,
        awayTeam: true,
      },
    });

    const insertedPredictions = [];

    for (const pred of matchPredictions) {
      // Find matching match by team codes
      const match = allMatches.find(
        (m) =>
          m.homeTeam.code === pred.homeTeam && m.awayTeam.code === pred.awayTeam
      );

      if (!match) {
        console.warn(`Match not found: ${pred.homeTeam} vs ${pred.awayTeam}`);
        continue;
      }

      if (pred.homeScore === null || pred.awayScore === null) {
        console.warn(`Skipping match ${match.id}: missing scores`);
        continue;
      }

      // Check if prediction exists
      const existing = await db.query.predictions.findFirst({
        where: (predictions, { eq, and }) =>
          and(
            eq(predictions.participantId, participant!.id),
            eq(predictions.matchId, match.id)
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

        insertedPredictions.push({ matchId: match.id, updated: true });
      } else {
        await db.insert(predictions).values({
          participantId: participant.id,
          matchId: match.id,
          homeScore: pred.homeScore,
          awayScore: pred.awayScore,
        });

        insertedPredictions.push({ matchId: match.id, updated: false });
      }
    }

    revalidatePath("/predictions");

    return NextResponse.json({
      success: true,
      participantId: participant.id,
      predictionsInserted: insertedPredictions.length,
    });
  } catch (error) {
    console.error("Confirm error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Confirmation failed" },
      { status: 500 }
    );
  }
}
