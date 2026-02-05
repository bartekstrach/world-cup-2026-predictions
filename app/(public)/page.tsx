import { LeaderboardTable } from "@/components/leaderboard-table";
import { PredictionsGrid } from "@/components/predictions-grid";
import { db } from "@/lib/db";
import { getLeaderboard } from "@/lib/scoring";
import type { PredictionsGridData, Prediction } from "@/lib/types";

export const revalidate = 60;

async function getPredictionsData(): Promise<PredictionsGridData> {
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

export default async function MainPage() {
  const leaderboard = await getLeaderboard();
  const predictionsData = await getPredictionsData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            Results
          </h2>
          <p className="text-muted-foreground mt-1">
            After LAST_GAME (day of week, date, time)
          </p>
        </div>
      </div>

      <LeaderboardTable data={leaderboard} />

      <div>
        <h2 className="text-3xl font-bold text-slate-900">Predictions</h2>
        <p className="text-muted-foreground mt-1">
          See prediction cards <u>here</u>.
        </p>
      </div>

      <PredictionsGrid data={predictionsData} />
    </div>
  );
}
