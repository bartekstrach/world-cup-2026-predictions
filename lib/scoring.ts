import { db } from "./db";
import { matches, predictions, teams } from "./schema";
import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { LeaderboardEntry } from "./types";
import { alias } from "drizzle-orm/pg-core";
import { calculatePoints, formatScore } from "./scoring-utils";
import { FINISHED_STATUS, NON_FINISHED_STATUSES } from "./constants";
import { getPublicVisibilityContext } from "./predictions";

/**
 * Calculate points for a single prediction
 * Rules:
 * - Exact score: 3 points
 * - Correct winner/draw: 1 point
 * - Wrong: 0 points
 */
export { calculatePoints, formatScore };

/**
 * Update points for all predictions of a finished match
 */
export async function updateMatchPredictions(matchId: number) {
  // Get match result
  const match = await db.query.matches.findFirst({
    where: (matches, { eq }) => eq(matches.id, matchId),
  });

  if (!match || match.homeScore === null || match.awayScore === null) {
    throw new Error("Match not finished or scores missing");
  }

  // Get all predictions for this match
  const matchPredictions = await db.query.predictions.findMany({
    where: (predictions, { eq }) => eq(predictions.matchId, matchId),
  });

  // Update each prediction's points
  for (const prediction of matchPredictions) {
    const points = calculatePoints(
      prediction.homeScore,
      prediction.awayScore,
      match.homeScore,
      match.awayScore,
    );

    await db
      .update(predictions)
      .set({
        points,
        updatedAt: new Date(),
      })
      .where(eq(predictions.id, prediction.id));
  }

  return matchPredictions.length;
}

/**
 * Recalculate points for all finished matches
 * Useful after fixing match results or predictions
 */
export async function recalculateAllPoints() {
  const finishedMatches = await db.query.matches.findMany({
    where: (matches, { eq }) => eq(matches.status, "finished"),
  });

  let totalUpdated = 0;

  for (const match of finishedMatches) {
    if (match.homeScore !== null && match.awayScore !== null) {
      const updated = await updateMatchPredictions(match.id);
      totalUpdated += updated;
    }
  }

  return {
    matchesProcessed: finishedMatches.length,
    predictionsUpdated: totalUpdated,
  };
}

/**
 * Get leaderboard with total points per participant
 */
export async function getLeaderboard(competitionId?: number) {
  const visibility = await getPublicVisibilityContext();

  const matchScopeCompetitionId =
    competitionId ?? visibility.activeCompetitionId ?? undefined;

  const publishedStageList = Array.from(visibility.publishedStages);
  const publishedMatchIdList = Array.from(visibility.publishedMatchIds);

  const visibleMatchIds = visibility.allowAllPublishedOverride
    ? (
        await db.query.matches.findMany({
          where:
            matchScopeCompetitionId !== undefined
              ? eq(matches.competitionId, matchScopeCompetitionId)
              : undefined,
          columns: {
            id: true,
          },
        })
      ).map((match) => match.id)
    : matchScopeCompetitionId === undefined ||
        (publishedStageList.length === 0 && publishedMatchIdList.length === 0)
      ? []
      : (
          await db.query.matches.findMany({
            where: and(
              eq(matches.competitionId, matchScopeCompetitionId),
              or(
                publishedStageList.length > 0
                  ? inArray(matches.stage, publishedStageList)
                  : undefined,
                publishedMatchIdList.length > 0
                  ? inArray(matches.id, publishedMatchIdList)
                  : undefined,
              ),
            ),
            columns: {
              id: true,
            },
          })
        ).map((match) => match.id);

  const visiblePredictions =
    visibleMatchIds.length > 0
      ? await db.query.predictions.findMany({
          where: inArray(predictions.matchId, visibleMatchIds),
        })
      : [];

  const participantsRows = await db.query.participants.findMany({
    orderBy: (participants, { asc }) => [asc(participants.name)],
  });

  const scoreByParticipant = new Map<
    number,
    {
      total_points: number;
      predictions_count: number;
      exact_scores: number;
      correct_outcomes: number;
    }
  >();

  for (const prediction of visiblePredictions) {
    const current = scoreByParticipant.get(prediction.participantId) ?? {
      total_points: 0,
      predictions_count: 0,
      exact_scores: 0,
      correct_outcomes: 0,
    };

    current.total_points += prediction.points ?? 0;
    current.predictions_count += 1;
    if ((prediction.points ?? 0) === 3) current.exact_scores += 1;
    if ((prediction.points ?? 0) === 1) current.correct_outcomes += 1;

    scoreByParticipant.set(prediction.participantId, current);
  }

  const leaderboardResults = participantsRows
    .map((participant) => {
      const score = scoreByParticipant.get(participant.id) ?? {
        total_points: 0,
        predictions_count: 0,
        exact_scores: 0,
        correct_outcomes: 0,
      };

      return {
        id: participant.id,
        name: participant.name,
        email: participant.email,
        total_points: score.total_points,
        predictions_count: score.predictions_count,
        exact_scores: score.exact_scores,
        correct_outcomes: score.correct_outcomes,
      };
    })
    .sort(
      (a, b) =>
        b.total_points - a.total_points || b.exact_scores - a.exact_scores,
    );

  const nextMatches = visibility.allowAllPublishedOverride
    ? await db.query.matches.findMany({
        where: (matches, { and, eq, inArray }) =>
          and(
            matchScopeCompetitionId !== undefined
              ? eq(matches.competitionId, matchScopeCompetitionId)
              : undefined,
            inArray(matches.status, ["live", "scheduled"]),
          ),
        with: {
          homeTeam: true,
          awayTeam: true,
        },
        orderBy: (matches, { asc }) => [
          sql`CASE WHEN ${matches.status} = 'live' THEN 0 ELSE 1 END`,
          asc(matches.matchDate),
          asc(matches.matchNumber),
        ],
        limit: 10,
      })
    : matchScopeCompetitionId === undefined ||
        (publishedStageList.length === 0 && publishedMatchIdList.length === 0)
      ? []
      : await db.query.matches.findMany({
          where: (matches, { and, eq, inArray, or }) =>
            and(
              eq(matches.competitionId, matchScopeCompetitionId),
              inArray(matches.status, ["live", "scheduled"]),
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
          orderBy: (matches, { asc }) => [
            sql`CASE WHEN ${matches.status} = 'live' THEN 0 ELSE 1 END`,
            asc(matches.matchDate),
            asc(matches.matchNumber),
          ],
          limit: 10,
        });

  if (leaderboardResults.length === 0 || nextMatches.length === 0) {
    return assignRanks(
      leaderboardResults.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        total_points: row.total_points,
        exact_scores: row.exact_scores,
        correct_outcomes: row.correct_outcomes,
        predictions_count: row.predictions_count,
        nextPredictions: [],
        nextMatches: [],
      })),
    ) as LeaderboardEntry[];
  }

  // 3. Filter to get the matches we want to show
  let matchesToShow = nextMatches.filter((m) => m.status === "live");

  if (matchesToShow.length === 0) {
    const earliestDate = nextMatches[0]?.matchDate;
    if (earliestDate) {
      matchesToShow = nextMatches.filter(
        (m) =>
          m.matchDate.getTime() === earliestDate.getTime() &&
          m.status === "scheduled",
      );
    }
  }

  const matchIds = matchesToShow.map((m) => m.id);

  if (matchIds.length === 0) {
    return assignRanks(
      leaderboardResults.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        total_points: row.total_points,
        exact_scores: row.exact_scores,
        correct_outcomes: row.correct_outcomes,
        predictions_count: row.predictions_count,
        nextPredictions: [],
        nextMatches: [],
      })),
    ) as LeaderboardEntry[];
  }

  // 4. Get predictions for these matches
  const nextPredictions = await db.query.predictions.findMany({
    where: (predictions, { inArray }) => inArray(predictions.matchId, matchIds),
  });

  // 5. Group predictions by participant
  const predictionsByParticipant = new Map<
    number,
    Array<{ matchId: number; homeScore: number; awayScore: number }>
  >();

  for (const pred of nextPredictions) {
    if (!predictionsByParticipant.has(pred.participantId)) {
      predictionsByParticipant.set(pred.participantId, []);
    }
    predictionsByParticipant.get(pred.participantId)!.push({
      matchId: pred.matchId,
      homeScore: pred.homeScore,
      awayScore: pred.awayScore,
    });
  }

  // 6. Combine everything - now including team data
  const result = leaderboardResults.map((row) => {
    const participantPredictions = predictionsByParticipant.get(row.id) || [];

    const orderedPredictions = matchIds.map((matchId) => {
      const pred = participantPredictions.find((p) => p.matchId === matchId);
      return (
        pred || {
          matchId,
          homeScore: null,
          awayScore: null,
        }
      );
    });

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      total_points: row.total_points,
      exact_scores: row.exact_scores,
      correct_outcomes: row.correct_outcomes,
      predictions_count: row.predictions_count,
      nextPredictions: orderedPredictions,
      nextMatches: matchesToShow.map((m) => ({
        id: m.id,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        homeTeamCode: m.homeTeam.code,
        awayTeamCode: m.awayTeam.code,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        matchNumber: m.matchNumber,
        status: m.status,
      })),
    };
  });

  const resultWithRank = assignRanks(result);

  return resultWithRank as LeaderboardEntry[];
}

function assignRanks<T extends { total_points: number }>(entries: T[]) {
  let lastPoints: number | null = null;
  let currentRank = 0;

  const getRankLabel = (rank: number) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return rank.toString();
    }
  };

  return entries.map((entry) => {
    const isNewRank = entry.total_points !== lastPoints;
    if (isNewRank) currentRank += 1;

    const rank = isNewRank ? getRankLabel(currentRank) : "";

    lastPoints = entry.total_points;

    return { ...entry, rank };
  });
}

/**
 * Get participant's prediction history with points
 */
export async function getParticipantPredictions(participantId: number) {
  return db.query.predictions.findMany({
    where: (predictions, { eq }) =>
      eq(predictions.participantId, participantId),
    with: {
      match: {
        with: {
          homeTeam: true,
          awayTeam: true,
        },
      },
    },
    orderBy: (predictions, { desc }) => [desc(predictions.points)],
  });
}

export async function getLastCompletedMatchDate() {
  if (NON_FINISHED_STATUSES.length === 0) return null;

  const result = await db
    .select({ matchDate: matches.matchDate })
    .from(matches)
    .groupBy(matches.matchDate)
    .having(
      sql`
        COUNT(*) FILTER (
          WHERE ${matches.status} IN (
            ${sql.join(
              NON_FINISHED_STATUSES.map((s) => sql`${s}`),
              sql`, `,
            )}
          )
        ) = 0
      `,
    )
    .orderBy(desc(matches.matchDate))
    .limit(1);

  return result.at(0)?.matchDate ?? null;
}

export async function getFinishedMatchesByMatchDate(matchDate: Date) {
  const homeTeam = alias(teams, "homeTeam");
  const awayTeam = alias(teams, "awayTeam");

  return db
    .select({
      matchId: matches.id,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      homeTeamCode: homeTeam.code,
      awayTeamCode: awayTeam.code,
    })
    .from(matches)
    .innerJoin(homeTeam, eq(matches.homeTeamId, homeTeam.id))
    .innerJoin(awayTeam, eq(matches.awayTeamId, awayTeam.id))
    .where(
      and(
        eq(matches.matchDate, matchDate),
        eq(matches.status, FINISHED_STATUS),
      ),
    );
}
