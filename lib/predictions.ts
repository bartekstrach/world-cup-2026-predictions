import { db } from "./db";
import { MATCH_STATUSES } from "./constants";
import { Prediction, PredictionsGridData } from "./types";
import type { NextMatchBannerData } from "./types";
import { eq } from "drizzle-orm";

export async function getPredictionsData(): Promise<PredictionsGridData> {
  const matches = await db.query.matches.findMany({
    with: {
      homeTeam: true,
      awayTeam: true,
    },
    orderBy: (matches, { asc }) => [asc(matches.matchNumber)],
  });

  const participants = await db.query.participants.findMany({
    orderBy: (participants, { asc }) => [asc(participants.name)],
  });

  const allPredictions = await db.query.predictions.findMany();

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

  return { matches, participants, predictions };
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
