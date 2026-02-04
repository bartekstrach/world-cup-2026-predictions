import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";
import { processImageToPredictions } from "@/lib/ocr";
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
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const blob = await put(`predictions/${Date.now()}-${file.name}`, file, {
      access: "public",
    });

    // Convert to base64 for OCR
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    // Process with OCR
    const extracted = await processImageToPredictions(base64);

    // Find or create participant
    let participant = await db.query.participants.findFirst({
      where: (participants, { eq }) =>
        eq(participants.name, extracted.participantName),
    });

    if (!participant) {
      [participant] = await db
        .insert(participants)
        .values({ name: extracted.participantName })
        .returning();
    }

    // Get all matches to validate
    const matches = await db.query.matches.findMany();
    const matchMap = new Map(matches.map((m) => [m.matchNumber, m.id]));

    // Insert predictions
    const insertedPredictions = [];
    for (const pred of extracted.predictions) {
      const matchId = matchMap.get(pred.matchNumber);

      if (!matchId) {
        console.warn(`Match ${pred.matchNumber} not found, skipping`);
        continue;
      }

      // Check if prediction already exists
      const existing = await db.query.predictions.findFirst({
        where: (predictions, { eq, and }) =>
          and(
            eq(predictions.participantId, participant!.id),
            eq(predictions.matchId, matchId)
          ),
      });

      if (existing) {
        // Update existing
        await db
          .update(predictions)
          .set({
            homeScore: pred.homeScore,
            awayScore: pred.awayScore,
            updatedAt: new Date(),
          })
          .where(eq(predictions.id, existing.id));

        insertedPredictions.push({ ...pred, updated: true });
      } else {
        // Insert new
        await db.insert(predictions).values({
          participantId: participant.id,
          matchId,
          homeScore: pred.homeScore,
          awayScore: pred.awayScore,
        });

        insertedPredictions.push({ ...pred, updated: false });
      }
    }

    // Revalidate public pages
    revalidatePath("/predictions");

    return NextResponse.json({
      success: true,
      blobUrl: blob.url,
      extracted: {
        participantName: extracted.participantName,
        participantId: participant.id,
        predictions: insertedPredictions,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}

// Next.js 14+ App Router doesn't need bodyParser config
// Formdata is handled automatically
