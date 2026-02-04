import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";
import { processImageToPredictions } from "@/lib/ocr";
import { db } from "@/lib/db";

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
        participantName: extracted.participantName,
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
      { status: 500 }
    );
  }
}
