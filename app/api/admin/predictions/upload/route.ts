import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";
import { processImageToPredictions } from "@/lib/ocr";
import { db } from "@/lib/db";
import {
  buildPredictionBlobPath,
  normalizeSubmissionStage,
} from "@/lib/blob-naming";
import { SUBMISSION_STAGES } from "@/lib/constants";
import { predictionSubmissions } from "@/lib/schema";
import { and, eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const participantNameFromForm = formData.get("participantName");
    const stageFromForm = formData.get("stage");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 },
      );
    }

    if (typeof stageFromForm !== "string" || !stageFromForm.trim()) {
      return NextResponse.json(
        { error: "Stage is required before upload" },
        { status: 400 },
      );
    }

    const rawStage = stageFromForm.trim().toLowerCase();
    if (
      !SUBMISSION_STAGES.includes(
        rawStage as (typeof SUBMISSION_STAGES)[number],
      )
    ) {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    }

    // Convert to base64 for OCR
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    // Process with OCR
    const extracted = await processImageToPredictions(base64);
    if (!extracted) {
      return NextResponse.json(
        { error: "Couldn't extract image" },
        { status: 400 },
      );
    }

    const resolvedParticipantName =
      (typeof participantNameFromForm === "string"
        ? participantNameFromForm
        : extracted.participantName
      )?.trim() || "Unknown";

    const resolvedStage = normalizeSubmissionStage(rawStage);

    const existingParticipant = await db.query.participants.findFirst({
      where: (participants, { eq }) =>
        eq(participants.name, resolvedParticipantName),
    });

    const existingSubmission = existingParticipant
      ? await db.query.predictionSubmissions.findFirst({
          where: and(
            eq(predictionSubmissions.participantId, existingParticipant.id),
            eq(predictionSubmissions.stage, resolvedStage),
          ),
        })
      : null;

    const activeCompetition = await db.query.competitions.findFirst({
      where: (competitions, { eq }) => eq(competitions.isActive, true),
      orderBy: (competitions, { desc }) => [
        desc(competitions.year),
        desc(competitions.id),
      ],
    });

    const blobPath = buildPredictionBlobPath({
      participantName: resolvedParticipantName,
      stage: resolvedStage,
      competitionName: activeCompetition?.name,
      originalFileName: file.name,
    });

    // Upload to Vercel Blob
    const blob = await put(blobPath, file, {
      access: "public",
    });

    // Get all matches in order for this competition
    const matches = await db.query.matches.findMany({
      with: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: (matches, { asc }) => [asc(matches.matchNumber)],
    });

    // Map extracted scores to matches
    const matchPredictions = matches.map((match, index) => ({
      matchId: match.id,
      matchNumber: match.matchNumber,
      homeTeam: {
        id: match.homeTeam.id,
        name: match.homeTeam.name,
        code: match.homeTeam.code,
      },
      awayTeam: {
        id: match.awayTeam.id,
        name: match.awayTeam.name,
        code: match.awayTeam.code,
      },
      homeScore: extracted.scores[index]?.homeScore ?? null,
      awayScore: extracted.scores[index]?.awayScore ?? null,
      status: match.status,
    }));

    return NextResponse.json({
      success: true,
      preview: {
        blobUrl: blob.url,
        participantName: resolvedParticipantName,
        stage: resolvedStage,
        willReplaceExisting: !!existingSubmission,
        rawText: extracted.rawText,
        extractedScoresCount: extracted.scores.length,
        matchesCount: matches.length,
        matches: matchPredictions,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
