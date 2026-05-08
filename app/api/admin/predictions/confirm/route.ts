import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { participants, predictions, predictionSubmissions } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { normalizeSubmissionStage } from "@/lib/blob-naming";
import { SUBMISSION_STAGES } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { participantName, stage, blobUrl, matchPredictions } =
      await request.json();
    const normalizedParticipantName =
      typeof participantName === "string" ? participantName.trim() : "";

    if (!normalizedParticipantName || !stage || !Array.isArray(matchPredictions)) {
      return NextResponse.json(
        { error: "Missing participant name, stage or predictions" },
        { status: 400 },
      );
    }

    if (
      typeof stage !== "string" ||
      !SUBMISSION_STAGES.includes(stage as (typeof SUBMISSION_STAGES)[number])
    ) {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    }

    const normalizedStage = normalizeSubmissionStage(stage);

    // Find or create participant
    let participant = await db.query.participants.findFirst({
      where: (participants, { eq }) =>
        eq(participants.name, normalizedParticipantName),
    });

    if (!participant) {
      [participant] = await db
        .insert(participants)
        .values({ name: normalizedParticipantName })
        .returning();
    }

    if (blobUrl && typeof blobUrl === "string" && blobUrl.trim().length > 0) {
      await db
        .insert(predictionSubmissions)
        .values({
          participantId: participant.id,
          stage: normalizedStage,
          blobUrl: blobUrl.trim(),
        })
        .onConflictDoUpdate({
          target: [
            predictionSubmissions.participantId,
            predictionSubmissions.stage,
          ],
          set: {
            blobUrl: blobUrl.trim(),
            updatedAt: new Date(),
          },
        });
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
            eq(predictions.matchId, pred.matchId),
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
      { status: 500 },
    );
  }
}
