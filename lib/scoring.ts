import { db, sql as neonSql } from "./db";
import { predictions } from "./schema";
import { eq } from "drizzle-orm";
import type { LeaderboardEntry } from "./types";

/**
 * Calculate points for a single prediction
 * Rules:
 * - Exact score: 3 points
 * - Correct winner/draw: 1 point
 * - Wrong: 0 points
 */
export function calculatePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number
): number {
  // Exact score
  if (predictedHome === actualHome && predictedAway === actualAway) {
    return 3;
  }

  // Determine outcomes
  const predictedOutcome =
    predictedHome > predictedAway
      ? "home"
      : predictedHome < predictedAway
      ? "away"
      : "draw";

  const actualOutcome =
    actualHome > actualAway
      ? "home"
      : actualHome < actualAway
      ? "away"
      : "draw";

  // Correct winner/draw
  if (predictedOutcome === actualOutcome) {
    return 1;
  }

  // Wrong
  return 0;
}

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
      match.awayScore
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

export async function getLeaderboard(
  competitionId?: number
): Promise<LeaderboardEntry[]> {
  if (competitionId) {
    const result = await neonSql`
      SELECT 
        p.id,
        p.name,
        p.email,
        COALESCE(SUM(pred.points), 0) as total_points,
        COUNT(pred.id) as predictions_count,
        COUNT(CASE WHEN pred.points = 3 THEN 1 END) as exact_scores,
        COUNT(CASE WHEN pred.points = 1 THEN 1 END) as correct_outcomes
      FROM participants p
      LEFT JOIN predictions pred ON p.id = pred.participant_id
      LEFT JOIN matches m ON pred.match_id = m.id
      WHERE m.competition_id = ${competitionId}
      GROUP BY p.id, p.name, p.email
      ORDER BY total_points DESC, exact_scores DESC
    `;
    return result as LeaderboardEntry[];
  }

  const result = await neonSql`
    SELECT 
      p.id,
      p.name,
      p.email,
      COALESCE(SUM(pred.points), 0) as total_points,
      COUNT(pred.id) as predictions_count,
      COUNT(CASE WHEN pred.points = 3 THEN 1 END) as exact_scores,
      COUNT(CASE WHEN pred.points = 1 THEN 1 END) as correct_outcomes
    FROM participants p
    LEFT JOIN predictions pred ON p.id = pred.participant_id
    GROUP BY p.id, p.name, p.email
    ORDER BY total_points DESC, exact_scores DESC
  `;

  return result as LeaderboardEntry[];
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
