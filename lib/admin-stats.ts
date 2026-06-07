import { db } from "@/lib/db";
import { MATCH_STATUSES } from "@/lib/constants";
import { sql } from "drizzle-orm";

type BaseStatsRow = {
  total_matches: string | number;
  finished_matches: string | number;
  live_matches: string | number;
  total_participants: string | number;
  total_predictions: string | number;
  total_teams: string | number;
  total_missing_predictions: string | number;
};

type MissingByParticipantRow = {
  participant_id: number;
  participant_name: string;
  missing_count: string | number;
};

type MissingByMatchRow = {
  match_id: number;
  match_number: number;
  home_team_code: string;
  away_team_code: string;
  missing_count: string | number;
};

type NextMatchRow = {
  match_date: Date;
  stage: string;
  home_team_code: string;
  away_team_code: string;
};

type CurrentStageRow = {
  stage: string;
};

export type AdminStats = {
  total_matches: number;
  finished_matches: number;
  live_matches: number;
  total_participants: number;
  total_predictions: number;
  total_teams: number;
  total_missing_predictions: number;
  missingPredictionsByParticipant: Array<{
    participantId: number;
    participantName: string;
    missingCount: number;
  }>;
  missingPredictionsByMatch: Array<{
    matchId: number;
    matchNumber: number;
    homeTeamCode: string;
    awayTeamCode: string;
    missingCount: number;
  }>;
  nextMatches: Array<{
    matchDate: Date;
    stage: string;
    homeTeamCode: string;
    awayTeamCode: string;
  }>;
  nextStage: string | null;
};

export async function getAdminStats(): Promise<AdminStats> {
  const fallback: AdminStats = {
    total_matches: 0,
    finished_matches: 0,
    live_matches: 0,
    total_participants: 0,
    total_predictions: 0,
    total_teams: 0,
    total_missing_predictions: 0,
    missingPredictionsByParticipant: [],
    missingPredictionsByMatch: [],
    nextMatches: [],
    nextStage: null,
  };

  try {
    const statsResult = await db.execute(sql`
    WITH scheduled_matches AS (
      SELECT id
      FROM matches
      WHERE status = ${MATCH_STATUSES.SCHEDULED}
    ),
    missing_predictions AS (
      SELECT p.id AS participant_id, m.id AS match_id
      FROM participants p
      CROSS JOIN scheduled_matches m
      LEFT JOIN predictions pr
        ON pr.participant_id = p.id
       AND pr.match_id = m.id
      WHERE pr.id IS NULL
    )
    SELECT
      (SELECT COUNT(*) FROM matches) as total_matches,
      (SELECT COUNT(*) FROM matches WHERE status = 'finished') as finished_matches,
      (SELECT COUNT(*) FROM matches WHERE status = 'live') as live_matches,
      (SELECT COUNT(*) FROM participants) as total_participants,
      (SELECT COUNT(*) FROM predictions) as total_predictions,
      (SELECT COUNT(*) FROM teams) as total_teams,
      (SELECT COUNT(*) FROM missing_predictions) as total_missing_predictions
  `);

    const missingByParticipantResult = await db.execute(sql`
    WITH scheduled_matches AS (
      SELECT id
      FROM matches
      WHERE status = ${MATCH_STATUSES.SCHEDULED}
    ),
    missing_predictions AS (
      SELECT p.id AS participant_id, p.name AS participant_name
      FROM participants p
      CROSS JOIN scheduled_matches m
      LEFT JOIN predictions pr
        ON pr.participant_id = p.id
       AND pr.match_id = m.id
      WHERE pr.id IS NULL
    )
    SELECT
      participant_id,
      participant_name,
      COUNT(*) AS missing_count
    FROM missing_predictions
    GROUP BY participant_id, participant_name
    ORDER BY missing_count DESC, participant_name ASC
  `);

    const missingByMatchResult = await db.execute(sql`
    WITH scheduled_matches AS (
      SELECT id, match_number, home_team_id, away_team_id
      FROM matches
      WHERE status = ${MATCH_STATUSES.SCHEDULED}
    ),
    missing_predictions AS (
      SELECT m.id AS match_id, m.match_number, m.home_team_id, m.away_team_id
      FROM participants p
      CROSS JOIN scheduled_matches m
      LEFT JOIN predictions pr
        ON pr.participant_id = p.id
       AND pr.match_id = m.id
      WHERE pr.id IS NULL
    )
    SELECT
      mp.match_id,
      mp.match_number,
      ht.code AS home_team_code,
      at.code AS away_team_code,
      COUNT(*) AS missing_count
    FROM missing_predictions mp
    INNER JOIN teams ht ON ht.id = mp.home_team_id
    INNER JOIN teams at ON at.id = mp.away_team_id
    GROUP BY mp.match_id, mp.match_number, ht.code, at.code
    ORDER BY missing_count DESC, mp.match_number ASC
  `);

    const nextMatchResult = await db.execute(sql`
    WITH next_kickoff AS (
      SELECT MIN(match_date) AS match_date
      FROM matches
      WHERE status = ${MATCH_STATUSES.SCHEDULED}
    )
    SELECT
      m.match_date,
      m.stage,
      ht.code as home_team_code,
      at.code as away_team_code
    FROM matches m
    INNER JOIN teams ht ON ht.id = m.home_team_id
    INNER JOIN teams at ON at.id = m.away_team_id
    INNER JOIN next_kickoff nk ON nk.match_date = m.match_date
    WHERE m.status = ${MATCH_STATUSES.SCHEDULED}
    ORDER BY m.match_number ASC
  `);

    const currentStageResult = await db.execute(sql`
    SELECT m.stage
    FROM matches m
    WHERE m.status IN (${MATCH_STATUSES.FINISHED}, ${MATCH_STATUSES.LIVE})
    ORDER BY m.match_date DESC, m.match_number DESC
    LIMIT 1
  `);

    const baseStats = statsResult.rows[0] as BaseStatsRow;
    const nextMatchRows = nextMatchResult.rows as NextMatchRow[];
    const currentStageRow =
      (currentStageResult.rows[0] as CurrentStageRow | undefined) ?? null;
    const missingByParticipantRows =
      missingByParticipantResult.rows as MissingByParticipantRow[];
    const missingByMatchRows = missingByMatchResult.rows as MissingByMatchRow[];

    const nextMatches = nextMatchRows.map((row) => ({
      matchDate: new Date(row.match_date),
      stage: row.stage,
      homeTeamCode: row.home_team_code,
      awayTeamCode: row.away_team_code,
    }));

    const firstNextMatchStage = nextMatches[0]?.stage;
    const nextStage =
      firstNextMatchStage &&
      currentStageRow &&
      firstNextMatchStage !== currentStageRow.stage
        ? firstNextMatchStage
        : null;

    return {
      total_matches: Number(baseStats.total_matches),
      finished_matches: Number(baseStats.finished_matches),
      live_matches: Number(baseStats.live_matches),
      total_participants: Number(baseStats.total_participants),
      total_predictions: Number(baseStats.total_predictions),
      total_teams: Number(baseStats.total_teams),
      total_missing_predictions: Number(baseStats.total_missing_predictions),
      missingPredictionsByParticipant: missingByParticipantRows
        .map((row) => ({
          participantId: row.participant_id,
          participantName: row.participant_name,
          missingCount: Number(row.missing_count),
        }))
        .filter((row) => row.missingCount > 0),
      missingPredictionsByMatch: missingByMatchRows
        .map((row) => ({
          matchId: row.match_id,
          matchNumber: row.match_number,
          homeTeamCode: row.home_team_code,
          awayTeamCode: row.away_team_code,
          missingCount: Number(row.missing_count),
        }))
        .filter((row) => row.missingCount > 0),
      nextMatches,
      nextStage,
    };
  } catch (error) {
    console.error("Failed to load admin stats", error);
    return fallback;
  }
}
