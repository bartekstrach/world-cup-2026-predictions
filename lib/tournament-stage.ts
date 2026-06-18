import { db } from "@/lib/db";
import {
  MATCH_STAGES,
  MATCH_STATUSES,
  type MatchStage,
} from "@/lib/constants";
import { sql } from "drizzle-orm";

export async function getCurrentTournamentStage(): Promise<MatchStage> {
  const result = await db.execute(sql`
    SELECT m.stage
    FROM matches m
    WHERE m.status IN (${MATCH_STATUSES.LIVE}, ${MATCH_STATUSES.SCHEDULED})
    ORDER BY
      CASE WHEN m.status = ${MATCH_STATUSES.LIVE} THEN 0 ELSE 1 END,
      m.match_date ASC,
      m.match_number ASC
    LIMIT 1
  `);

  const stage = (result.rows[0] as { stage: string } | undefined)?.stage;

  if (stage && MATCH_STAGES.includes(stage as MatchStage)) {
    return stage as MatchStage;
  }

  return MATCH_STAGES[0];
}
