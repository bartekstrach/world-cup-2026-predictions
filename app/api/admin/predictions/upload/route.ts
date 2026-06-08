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

function normalizeComparableText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);

  for (let j = 0; j <= b.length; j += 1) {
    prev[j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }

    for (let j = 0; j <= b.length; j += 1) {
      prev[j] = curr[j];
    }
  }

  return prev[b.length];
}

function tokenSimilarity(teamName: string, lineText: string): number {
  const normalizedTeam = normalizeComparableText(teamName);
  const normalizedLine = normalizeComparableText(lineText);

  if (!normalizedTeam || !normalizedLine) {
    return 0;
  }

  if (normalizedLine.includes(normalizedTeam)) {
    return 1;
  }

  const teamTokens = normalizedTeam.split(" ").filter(Boolean);
  const lineTokens = normalizedLine.split(" ").filter(Boolean);

  if (teamTokens.length === 0 || lineTokens.length === 0) {
    return 0;
  }

  let tokenScoreSum = 0;

  for (const teamToken of teamTokens) {
    let bestForToken = 0;

    for (const lineToken of lineTokens) {
      if (lineToken === teamToken) {
        bestForToken = 1;
        break;
      }

      const distance = levenshteinDistance(teamToken, lineToken);
      const denominator = Math.max(teamToken.length, lineToken.length);
      const score = denominator === 0 ? 0 : 1 - distance / denominator;

      if (score > bestForToken) {
        bestForToken = score;
      }
    }

    tokenScoreSum += bestForToken;
  }

  return tokenScoreSum / teamTokens.length;
}

function findBestOcrLineForMatch(
  homeTeamName: string,
  awayTeamName: string,
  ocrLines: Array<{
    matchedLine: string;
    homeScore: number;
    awayScore: number;
    rawTeamsText: string;
  }>,
  usedIndexes: Set<number>,
) {
  let bestIndex = -1;
  let bestScore = 0;

  for (let index = 0; index < ocrLines.length; index += 1) {
    if (usedIndexes.has(index)) {
      continue;
    }

    const line = ocrLines[index];
    const homeScore = tokenSimilarity(homeTeamName, line.rawTeamsText);
    const awayScore = tokenSimilarity(awayTeamName, line.rawTeamsText);
    const combinedScore = (homeScore + awayScore) / 2;

    const minSideScore = Math.min(homeScore, awayScore);
    if (minSideScore < 0.62) {
      continue;
    }

    if (combinedScore > bestScore) {
      bestScore = combinedScore;
      bestIndex = index;
    }
  }

  if (bestIndex === -1 || bestScore < 0.72) {
    return null;
  }

  return {
    index: bestIndex,
    confidence: bestScore,
    line: ocrLines[bestIndex],
  };
}

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

    // Match OCR lines to DB matches by team names (with fuzzy OCR tolerance)
    const usedOcrIndexes = new Set<number>();

    const matchPredictions = matches.map((match) => {
      const bestOcrLine = findBestOcrLineForMatch(
        match.homeTeam.name,
        match.awayTeam.name,
        extracted.scores,
        usedOcrIndexes,
      );

      if (bestOcrLine) {
        usedOcrIndexes.add(bestOcrLine.index);
      }

      return {
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
        homeScore: bestOcrLine ? bestOcrLine.line.homeScore : null,
        awayScore: bestOcrLine ? bestOcrLine.line.awayScore : null,
        status: match.status,
      };
    });

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
