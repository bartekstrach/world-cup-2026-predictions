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

type TimelineStageRow = {
  stage: string;
};

type NextEventRow = {
  match_date: Date;
  stage: string;
};

type HallOfShameRow = {
  participant_id: number;
  participant_name: string;
  current_missing: string | number;
  current_total: string | number;
  next_missing: string | number;
  next_total: string | number;
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
  hallOfShameCurrentStage: string | null;
  hallOfShameNextStage: string | null;
  hallOfShame: Array<{
    participantId: number;
    participantName: string;
    currentMissing: number;
    currentTotal: number;
    nextMissing: number;
    nextTotal: number;
  }>;
  nextMatchCountdownTarget: Date | null;
  nextStageCountdownTarget: Date | null;
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
    hallOfShameCurrentStage: null,
    hallOfShameNextStage: null,
    hallOfShame: [],
    nextMatchCountdownTarget: null,
    nextStageCountdownTarget: null,
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

    const timelineStagesResult = await db.execute(sql`
    SELECT m.stage
    FROM matches m
    WHERE m.status IN (${MATCH_STATUSES.LIVE}, ${MATCH_STATUSES.SCHEDULED})
    ORDER BY
      CASE WHEN m.status = ${MATCH_STATUSES.LIVE} THEN 0 ELSE 1 END,
      m.match_date ASC,
      m.match_number ASC
  `);

    const nextEventsResult = await db.execute(sql`
    SELECT
      m.match_date,
      m.stage
    FROM matches m
    WHERE m.status = ${MATCH_STATUSES.SCHEDULED}
      AND m.match_date > NOW()
    ORDER BY m.match_date ASC, m.match_number ASC
  `);

    const baseStats = statsResult.rows[0] as BaseStatsRow;
    const nextMatchRows = nextMatchResult.rows as NextMatchRow[];
    const currentStageRow =
      (currentStageResult.rows[0] as CurrentStageRow | undefined) ?? null;
    const missingByParticipantRows =
      missingByParticipantResult.rows as MissingByParticipantRow[];
    const missingByMatchRows = missingByMatchResult.rows as MissingByMatchRow[];
    const timelineStageRows = timelineStagesResult.rows as TimelineStageRow[];
    const nextEventRows = nextEventsResult.rows as NextEventRow[];

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

    const hallOfShameCurrentStage = timelineStageRows[0]?.stage ?? null;
    const hallOfShameNextStage =
      timelineStageRows.find((row) => row.stage !== hallOfShameCurrentStage)
        ?.stage ?? null;

    const hallOfShameResult = await db.execute(sql`
    WITH stage_context AS (
      SELECT
        ${hallOfShameCurrentStage}::text AS current_stage,
        ${hallOfShameNextStage}::text AS next_stage
    ),
    stage_totals AS (
      SELECT
        sc.current_stage,
        sc.next_stage,
        COALESCE((
          SELECT COUNT(*)
          FROM matches m
          WHERE m.stage = sc.current_stage
        ), 0) AS current_total,
        COALESCE((
          SELECT COUNT(*)
          FROM matches m
          WHERE m.stage = sc.next_stage
        ), 0) AS next_total
      FROM stage_context sc
    ),
    participant_stage_missing AS (
      SELECT
        p.id AS participant_id,
        p.name AS participant_name,
        st.current_total,
        st.next_total,
        COALESCE(SUM(
          CASE
            WHEN m.stage = st.current_stage AND pr.id IS NULL THEN 1
            ELSE 0
          END
        ), 0) AS current_missing,
        COALESCE(SUM(
          CASE
            WHEN m.stage = st.next_stage AND pr.id IS NULL THEN 1
            ELSE 0
          END
        ), 0) AS next_missing
      FROM participants p
      CROSS JOIN stage_totals st
      LEFT JOIN matches m ON m.stage IN (st.current_stage, st.next_stage)
      LEFT JOIN predictions pr
        ON pr.participant_id = p.id
       AND pr.match_id = m.id
      GROUP BY p.id, p.name, st.current_total, st.next_total
    )
    SELECT
      participant_id,
      participant_name,
      current_missing,
      current_total,
      next_missing,
      next_total
    FROM participant_stage_missing
    WHERE current_missing > 0 OR next_missing > 0
    ORDER BY (current_missing + next_missing) DESC, participant_name ASC
  `);

    const hallOfShameRows = hallOfShameResult.rows as HallOfShameRow[];

    const nextMatchDate = nextEventRows[0]?.match_date
      ? new Date(nextEventRows[0].match_date)
      : null;

    const currentStage = hallOfShameCurrentStage;
    const nextStageDate =
      currentStage && nextEventRows.length
        ? nextEventRows.find((row) => row.stage !== currentStage)?.match_date
        : nextEventRows[0]?.match_date;

    const nextMatchCountdownTarget = nextMatchDate;
    const nextStageCountdownTarget = nextStageDate
      ? new Date(nextStageDate)
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
      hallOfShameCurrentStage,
      hallOfShameNextStage,
      hallOfShame: hallOfShameRows.map((row) => ({
        participantId: row.participant_id,
        participantName: row.participant_name,
        currentMissing: Number(row.current_missing),
        currentTotal: Number(row.current_total),
        nextMissing: Number(row.next_missing),
        nextTotal: Number(row.next_total),
      })),
      nextMatchCountdownTarget,
      nextStageCountdownTarget,
    };
  } catch (error) {
    console.error("Failed to load admin stats", error);
    return fallback;
  }
}
