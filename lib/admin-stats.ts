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
  nextMatch: {
    matchDate: Date;
    stage: string;
    homeTeamCode: string;
    awayTeamCode: string;
  } | null;
  nextStageName: string | null;
};

const STAGE_LABELS: Record<string, string> = {
  group: "Group Stage",
  round_16: "Round of 16",
  quarter: "Quarter-finals",
  semi: "Semi-finals",
  final: "Final",
};

function getStageLabel(stage: string) {
  return STAGE_LABELS[stage] ?? stage;
}

export async function getAdminStats(): Promise<AdminStats> {
  const statsResult = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM matches) as total_matches,
      (SELECT COUNT(*) FROM matches WHERE status = 'finished') as finished_matches,
      (SELECT COUNT(*) FROM matches WHERE status = 'live') as live_matches,
      (SELECT COUNT(*) FROM participants) as total_participants,
      (SELECT COUNT(*) FROM predictions) as total_predictions,
      (SELECT COUNT(*) FROM teams) as total_teams
  `);

  const nextMatchResult = await db.execute(sql`
    SELECT
      m.match_date,
      m.stage,
      ht.code as home_team_code,
      at.code as away_team_code
    FROM matches m
    INNER JOIN teams ht ON ht.id = m.home_team_id
    INNER JOIN teams at ON at.id = m.away_team_id
    WHERE m.status = ${MATCH_STATUSES.SCHEDULED}
    ORDER BY m.match_date ASC, m.match_number ASC
    LIMIT 1
  `);

  const currentStageResult = await db.execute(sql`
    SELECT m.stage
    FROM matches m
    WHERE m.status IN (${MATCH_STATUSES.FINISHED}, ${MATCH_STATUSES.LIVE})
    ORDER BY m.match_date DESC, m.match_number DESC
    LIMIT 1
  `);

  const baseStats = statsResult.rows[0] as BaseStatsRow;
  const nextMatchRow =
    (nextMatchResult.rows[0] as NextMatchRow | undefined) ?? null;
  const currentStageRow =
    (currentStageResult.rows[0] as CurrentStageRow | undefined) ?? null;

  const nextMatch = nextMatchRow
    ? {
        matchDate: new Date(nextMatchRow.match_date),
        stage: nextMatchRow.stage,
        homeTeamCode: nextMatchRow.home_team_code,
        awayTeamCode: nextMatchRow.away_team_code,
      }
    : null;

  const nextStageName =
    nextMatch && currentStageRow && nextMatch.stage !== currentStageRow.stage
      ? getStageLabel(nextMatch.stage)
      : null;

  return {
    total_matches: Number(baseStats.total_matches),
    finished_matches: Number(baseStats.finished_matches),
    live_matches: Number(baseStats.live_matches),
    total_participants: Number(baseStats.total_participants),
    total_predictions: Number(baseStats.total_predictions),
    total_teams: Number(baseStats.total_teams),
    nextMatch,
    nextStageName,
  };
}
