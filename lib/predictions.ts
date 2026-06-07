import { db } from "./db";
import { MATCH_STATUSES, STAGE_ORDER, SUBMISSION_STAGES } from "./constants";
import { Prediction, PredictionsGridData } from "./types";
import type { NextMatchBannerData } from "./types";
import type { PredictionSheetLink } from "./types";
import type { PublicationMatchOption, PublicationStageOption } from "./types";
import { and, desc, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import {
  competitions,
  publicationSettings,
  matches,
  participants,
  predictionSubmissions,
  publishedMatches,
  publishedStages,
} from "./schema";
import {
  PUBLICATION_SETTINGS_SINGLETON_ID,
  type SubmissionStage,
} from "./constants";

type PublicVisibilityContext = {
  activeCompetitionId: number | null;
  allowAllPublishedOverride: boolean;
  publishedStages: Set<SubmissionStage>;
  publishedMatchIds: Set<number>;
};

export async function getPublicVisibilityContext(): Promise<PublicVisibilityContext> {
  const settings = await db.query.publicationSettings.findFirst({
    where: eq(publicationSettings.id, PUBLICATION_SETTINGS_SINGLETON_ID),
  });

  const allowAllPublishedOverride =
    settings?.allowAllPublishedOverride === true;

  const activeCompetition = await db.query.competitions.findFirst({
    where: eq(competitions.isActive, true),
    orderBy: (competitions, { desc }) => [
      desc(competitions.year),
      desc(competitions.id),
    ],
  });

  if (allowAllPublishedOverride) {
    return {
      activeCompetitionId: activeCompetition?.id ?? null,
      allowAllPublishedOverride: true,
      publishedStages: new Set(),
      publishedMatchIds: new Set(),
    };
  }

  if (!activeCompetition) {
    return {
      activeCompetitionId: null,
      allowAllPublishedOverride: false,
      publishedStages: new Set(),
      publishedMatchIds: new Set(),
    };
  }

  const [publishedStageRows, publishedMatchRows] = await Promise.all([
    db
      .select({
        stage: publishedStages.stage,
      })
      .from(publishedStages)
      .where(
        and(
          eq(publishedStages.competitionId, activeCompetition.id),
          eq(publishedStages.isPublished, true),
        ),
      ),
    db
      .select({
        matchId: publishedMatches.matchId,
      })
      .from(publishedMatches)
      .innerJoin(matches, eq(matches.id, publishedMatches.matchId))
      .where(
        and(
          eq(matches.competitionId, activeCompetition.id),
          eq(publishedMatches.isPublished, true),
        ),
      ),
  ]);

  return {
    activeCompetitionId: activeCompetition.id,
    allowAllPublishedOverride: false,
    publishedStages: new Set(
      publishedStageRows.map((row) => row.stage as SubmissionStage),
    ),
    publishedMatchIds: new Set(publishedMatchRows.map((row) => row.matchId)),
  };
}

export async function getPredictionsData(): Promise<PredictionsGridData> {
  const visibility = await getPublicVisibilityContext();

  const publishedStageList = Array.from(visibility.publishedStages);
  const publishedMatchIdList = Array.from(visibility.publishedMatchIds);

  const visibleMatches = visibility.allowAllPublishedOverride
    ? await db.query.matches.findMany({
        with: {
          homeTeam: true,
          awayTeam: true,
        },
        orderBy: (matches, { asc }) => [asc(matches.matchNumber)],
      })
    : visibility.activeCompetitionId === null ||
        (publishedStageList.length === 0 && publishedMatchIdList.length === 0)
      ? []
      : await db.query.matches.findMany({
          where: and(
            eq(matches.competitionId, visibility.activeCompetitionId),
            or(
              publishedStageList.length > 0
                ? inArray(matches.stage, publishedStageList)
                : undefined,
              publishedMatchIdList.length > 0
                ? inArray(matches.id, publishedMatchIdList)
                : undefined,
            ),
          ),
          with: {
            homeTeam: true,
            awayTeam: true,
          },
          orderBy: (matches, { asc }) => [asc(matches.matchNumber)],
        });

  const participants = await db.query.participants.findMany({
    orderBy: (participants, { asc }) => [asc(participants.name)],
  });

  const visibleMatchIds = visibleMatches.map((match) => match.id);
  const allPredictions =
    visibleMatchIds.length > 0
      ? await db.query.predictions.findMany({
          where: (predictions, { inArray }) =>
            inArray(predictions.matchId, visibleMatchIds),
        })
      : [];

  const predictions: Record<string, Prediction> = {};
  allPredictions.forEach((pred) => {
    const key = `${pred.matchId}-${pred.participantId}`;
    predictions[key] = {
      participantId: pred.participantId,
      matchId: pred.matchId,
      homeScore: pred.homeScore,
      awayScore: pred.awayScore,
      points: pred.points || 0,
    };
  });

  return { matches: visibleMatches, participants, predictions };
}

export async function getNextMatchBannerData(): Promise<NextMatchBannerData | null> {
  const nextMatches = await db.query.matches.findMany({
    where: (matches, { inArray }) =>
      inArray(matches.status, [MATCH_STATUSES.LIVE, MATCH_STATUSES.SCHEDULED]),
    with: {
      homeTeam: true,
      awayTeam: true,
    },
    orderBy: (matches, { asc, desc }) => [
      desc(eq(matches.status, MATCH_STATUSES.LIVE)),
      asc(matches.matchDate),
      asc(matches.matchNumber),
    ],
    limit: 10,
  });

  if (!nextMatches.length) return null;

  let matchesToShow = nextMatches.filter(
    (match) => match.status === MATCH_STATUSES.LIVE,
  );

  if (!matchesToShow.length) {
    const earliestDate = nextMatches[0]?.matchDate;
    if (!earliestDate) return null;

    matchesToShow = nextMatches.filter(
      (match) =>
        match.status === MATCH_STATUSES.SCHEDULED &&
        match.matchDate.getTime() === earliestDate.getTime(),
    );
  }

  if (!matchesToShow.length) return null;

  return {
    matchDate: matchesToShow[0].matchDate,
    matches: matchesToShow.map((match) => ({
      homeTeamCode: match.homeTeam.code,
      awayTeamCode: match.awayTeam.code,
    })),
  };
}

export async function getPredictionSheetLinks(): Promise<
  PredictionSheetLink[]
> {
  const visibility = await getPublicVisibilityContext();

  let visibleStages = new Set<SubmissionStage>();

  if (visibility.allowAllPublishedOverride) {
    visibleStages = new Set(SUBMISSION_STAGES);
  } else {
    const publishedMatchStageRows = await db
      .select({
        stage: matches.stage,
      })
      .from(matches)
      .where(
        inArray(
          matches.id,
          visibility.publishedMatchIds.size > 0
            ? Array.from(visibility.publishedMatchIds)
            : [-1],
        ),
      );

    visibleStages = new Set<SubmissionStage>([
      ...Array.from(visibility.publishedStages),
      ...publishedMatchStageRows.map((row) => row.stage as SubmissionStage),
    ]);
  }

  if (visibleStages.size === 0) {
    return [];
  }

  const rows = await db
    .select({
      id: predictionSubmissions.id,
      participantName: participants.name,
      stage: predictionSubmissions.stage,
      blobUrl: predictionSubmissions.blobUrl,
      createdAt: predictionSubmissions.createdAt,
      updatedAt: predictionSubmissions.updatedAt,
    })
    .from(predictionSubmissions)
    .innerJoin(
      participants,
      eq(participants.id, predictionSubmissions.participantId),
    )
    .where(
      and(
        inArray(predictionSubmissions.stage, Array.from(visibleStages)),
        sql`${isNotNull(predictionSubmissions.blobUrl)} AND ${predictionSubmissions.blobUrl} <> ''`,
      ),
    )
    .orderBy(
      desc(predictionSubmissions.updatedAt),
      desc(predictionSubmissions.createdAt),
    );

  return rows.filter((row) => {
    try {
      const url = new URL(row.blobUrl);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  });
}

export async function getUnpublishedPublicationOptions(
  competitionId: number,
): Promise<{
  unpublishedStages: PublicationStageOption[];
  unpublishedMatches: PublicationMatchOption[];
}> {
  const publishedStageRows = await db
    .select({
      stage: publishedStages.stage,
      isPublished: publishedStages.isPublished,
    })
    .from(publishedStages)
    .where(eq(publishedStages.competitionId, competitionId));

  const stagePublishedMap = new Map(
    publishedStageRows.map((row) => [row.stage, row.isPublished]),
  );

  const unpublishedStages = SUBMISSION_STAGES.filter(
    (stage) => stagePublishedMap.get(stage) !== true,
  ).map((stage) => ({
    stage,
    order: STAGE_ORDER[stage],
  }));

  const matchRows = await db.query.matches.findMany({
    where: eq(matches.competitionId, competitionId),
    with: {
      homeTeam: true,
      awayTeam: true,
    },
    orderBy: (matches, { asc }) => [
      asc(matches.matchDate),
      asc(matches.matchNumber),
    ],
  });

  const publishedMatchRows = await db
    .select({
      matchId: publishedMatches.matchId,
      isPublished: publishedMatches.isPublished,
    })
    .from(publishedMatches);

  const matchPublishedMap = new Map(
    publishedMatchRows.map((row) => [row.matchId, row.isPublished]),
  );

  const unpublishedMatches = matchRows
    .filter((match) => matchPublishedMap.get(match.id) !== true)
    .map((match) => ({
      id: match.id,
      matchNumber: match.matchNumber,
      matchDate: match.matchDate,
      stage: match.stage,
      stageOrder: STAGE_ORDER[match.stage],
      homeTeamCode: match.homeTeam.code,
      awayTeamCode: match.awayTeam.code,
      homeTeamName: match.homeTeam.name,
      awayTeamName: match.awayTeam.name,
    }))
    .sort((a, b) => {
      const byDate = a.matchDate.getTime() - b.matchDate.getTime();
      if (byDate !== 0) return byDate;

      return a.matchNumber - b.matchNumber;
    });

  return {
    unpublishedStages,
    unpublishedMatches,
  };
}
