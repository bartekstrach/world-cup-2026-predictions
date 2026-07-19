import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";
import { extractPredictionsWithAI } from "@/lib/ocr";
import { db } from "@/lib/db";
import {
  buildPredictionBlobPath,
  normalizeSubmissionStage,
} from "@/lib/blob-naming";
import {
  ONE_OR_TWO_PAGE_SUBMISSION_STAGES,
  SUBMISSION_STAGES,
  TWO_PAGE_SUBMISSION_STAGES,
} from "@/lib/constants";
import { predictionSubmissions } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { getActiveAiModel } from "@/actions/settings";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);

    const singleFile = formData.get("file");
    const allFiles =
      files.length > 0 ? files : singleFile instanceof File ? [singleFile] : [];

    const participantNameFromForm = formData.get("participantName");
    const stageFromForm = formData.get("stage");

    if (allFiles.length === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (allFiles.some((file) => !file.type.startsWith("image/"))) {
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

    const resolvedStage = normalizeSubmissionStage(rawStage);
    const requiresTwoPages = TWO_PAGE_SUBMISSION_STAGES.includes(
      resolvedStage as (typeof TWO_PAGE_SUBMISSION_STAGES)[number],
    );
    const allowsOneOrTwoPages = ONE_OR_TWO_PAGE_SUBMISSION_STAGES.includes(
      resolvedStage as (typeof ONE_OR_TWO_PAGE_SUBMISSION_STAGES)[number],
    );

    if (requiresTwoPages && allFiles.length !== 2) {
      return NextResponse.json(
        { error: "This stage requires exactly 2 scanned pages" },
        { status: 400 },
      );
    }

    if (allowsOneOrTwoPages && (allFiles.length < 1 || allFiles.length > 2)) {
      return NextResponse.json(
        { error: "This stage allows 1 or 2 scanned pages" },
        { status: 400 },
      );
    }

    if (!requiresTwoPages && !allowsOneOrTwoPages && allFiles.length !== 1) {
      return NextResponse.json(
        { error: "This stage requires exactly 1 scanned page" },
        { status: 400 },
      );
    }

    // Convert all pages to base64 for OCR
    const base64Pages = await Promise.all(
      allFiles.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        return Buffer.from(arrayBuffer).toString("base64");
      }),
    );

    const activeCompetition = await db.query.competitions.findFirst({
      where: (competitions, { eq }) => eq(competitions.isActive, true),
      orderBy: (competitions, { desc }) => [
        desc(competitions.year),
        desc(competitions.id),
      ],
    });

    // Get only matches for selected stage (and active competition when available)
    const matches = await db.query.matches.findMany({
      where: (matches, { and, eq }) =>
        activeCompetition
          ? and(
              eq(matches.competitionId, activeCompetition.id),
              eq(matches.stage, resolvedStage),
            )
          : eq(matches.stage, resolvedStage),
      with: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: (matches, { asc }) => [
        asc(matches.matchDate),
        asc(matches.matchNumber),
      ],
    });

    const matchesContext = matches.map((m) => ({
      id: m.id,
      homeTeam: m.homeTeam.name,
      awayTeam: m.awayTeam.name,
    }));

    const activeAiModel = await getActiveAiModel();

    type AiExtraction = Awaited<ReturnType<typeof extractPredictionsWithAI>>;

    let aiResults: AiExtraction[] = [];
    try {
      aiResults = await Promise.all(
        base64Pages.map((imageBase64) =>
          extractPredictionsWithAI(imageBase64, matchesContext, activeAiModel),
        ),
      );
    } catch (error) {
      console.error("AI extraction error:", error);
      return NextResponse.json(
        { error: "Couldn't extract image" },
        { status: 400 },
      );
    }

    const extracted = {
      participantName:
        aiResults
          .find(
            (result) =>
              typeof result.participantName === "string" &&
              result.participantName.trim().length > 0,
          )
          ?.participantName?.trim() ?? "Unknown",
      rawText: JSON.stringify(aiResults),
      scores: aiResults.flatMap((result) => result.scores ?? []),
    };

    const resolvedParticipantName =
      (typeof participantNameFromForm === "string"
        ? participantNameFromForm
        : extracted.participantName
      )?.trim() || "Unknown";

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

    const uploadedBlobs = await Promise.all(
      allFiles.map(async (file, index) => {
        const blobPath = buildPredictionBlobPath({
          participantName: resolvedParticipantName,
          stage: resolvedStage,
          competitionName: activeCompetition?.name,
          originalFileName: `p${index + 1}-${file.name}`,
        });

        return put(blobPath, file, {
          access: "public",
          addRandomSuffix: true,
        });
      }),
    );

    const scoresByMatchId = new Map<
      string,
      { homeScore: number | null; awayScore: number | null }
    >();

    for (const score of extracted.scores) {
      scoresByMatchId.set(String(score.matchId), {
        homeScore: score.homeScore,
        awayScore: score.awayScore,
      });
    }

    const matchPredictions = matches.map((match) => {
      const aiScore = scoresByMatchId.get(String(match.id));

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
        homeScore: aiScore?.homeScore ?? null,
        awayScore: aiScore?.awayScore ?? null,
        status: match.status,
      };
    });

    return NextResponse.json({
      success: true,
      preview: {
        blobUrl: uploadedBlobs[0]?.url ?? "",
        blobUrls: uploadedBlobs.map((item) => item.url),
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
