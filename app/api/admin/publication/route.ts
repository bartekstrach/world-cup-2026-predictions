import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  PUBLICATION_SETTINGS_SINGLETON_ID,
  STAGE_ORDER,
  SUBMISSION_STAGES,
  type SubmissionStage,
} from "@/lib/constants";
import {
  publicationSettings,
  matches,
  publishedMatches,
  publishedStages,
} from "@/lib/schema";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type PublicationPayload = {
  mode?: unknown;
  stage?: unknown;
  matchId?: unknown;
  isPublished?: unknown;
  allowAllPublishedOverride?: unknown;
};

function isSubmissionStage(value: unknown): value is SubmissionStage {
  return (
    typeof value === "string" &&
    SUBMISSION_STAGES.includes(value as SubmissionStage)
  );
}

export async function PATCH(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as PublicationPayload;
  const mode = payload.mode;

  const activeCompetition = await db.query.competitions.findFirst({
    where: (competitions, { eq }) => eq(competitions.isActive, true),
    orderBy: (competitions, { desc }) => [
      desc(competitions.year),
      desc(competitions.id),
    ],
  });

  if (!activeCompetition) {
    return NextResponse.json(
      { error: "No active competition found" },
      { status: 400 },
    );
  }

  if (mode === "stage") {
    if (!isSubmissionStage(payload.stage)) {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    }

    const isPublished =
      typeof payload.isPublished === "boolean" ? payload.isPublished : true;

    await db
      .insert(publishedStages)
      .values({
        competitionId: activeCompetition.id,
        stage: payload.stage,
        isPublished,
      })
      .onConflictDoUpdate({
        target: [publishedStages.competitionId, publishedStages.stage],
        set: {
          isPublished,
          updatedAt: new Date(),
        },
      });

    revalidatePath("/");
    revalidatePath("/predictions");
    revalidatePath("/admin");

    return NextResponse.json({
      success: true,
      mode,
      published: {
        stage: payload.stage,
        order: STAGE_ORDER[payload.stage],
        isPublished,
      },
    });
  }

  if (mode === "match") {
    if (typeof payload.matchId !== "number" || payload.matchId <= 0) {
      return NextResponse.json({ error: "Invalid matchId" }, { status: 400 });
    }

    const match = await db.query.matches.findFirst({
      where: and(
        eq(matches.id, payload.matchId),
        eq(matches.competitionId, activeCompetition.id),
      ),
    });

    if (!match) {
      return NextResponse.json(
        { error: "Match not found in active competition" },
        { status: 404 },
      );
    }

    const isPublished =
      typeof payload.isPublished === "boolean" ? payload.isPublished : true;

    await db
      .insert(publishedMatches)
      .values({
        matchId: payload.matchId,
        isPublished,
      })
      .onConflictDoUpdate({
        target: [publishedMatches.matchId],
        set: {
          isPublished,
          updatedAt: new Date(),
        },
      });

    revalidatePath("/");
    revalidatePath("/predictions");
    revalidatePath("/admin");

    return NextResponse.json({
      success: true,
      mode,
      published: {
        matchId: payload.matchId,
        isPublished,
      },
    });
  }

  if (mode === "override") {
    if (typeof payload.allowAllPublishedOverride !== "boolean") {
      return NextResponse.json(
        { error: "Invalid allowAllPublishedOverride value" },
        { status: 400 },
      );
    }

    await db
      .insert(publicationSettings)
      .values({
        id: PUBLICATION_SETTINGS_SINGLETON_ID,
        allowAllPublishedOverride: payload.allowAllPublishedOverride,
      })
      .onConflictDoUpdate({
        target: [publicationSettings.id],
        set: {
          allowAllPublishedOverride: payload.allowAllPublishedOverride,
          updatedAt: new Date(),
        },
      });

    revalidatePath("/");
    revalidatePath("/predictions");
    revalidatePath("/admin");

    return NextResponse.json({
      success: true,
      mode,
      allowAllPublishedOverride: payload.allowAllPublishedOverride,
    });
  }

  return NextResponse.json(
    { error: "Invalid mode. Expected stage, match or override." },
    { status: 400 },
  );
}
