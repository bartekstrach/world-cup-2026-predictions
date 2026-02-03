import { db } from "@/lib/db";
import { PredictionsGrid } from "@/components/predictions-grid";
import Link from "next/link";
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

export default async function PredictionsPage() {
  const data = await getPredictionsData();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">All Predictions</h2>
          <p className="text-gray-600 mt-1">
            {data.matches.length} matches × {data.participants.length}{" "}
            participants
          </p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
        >
          Back to Leaderboard
        </Link>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
        <strong>Legend:</strong>
        <span className="ml-4 inline-block px-2 py-1 bg-green-100 text-green-800 rounded">
          3pt = Exact
        </span>
        <span className="ml-2 inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
          1pt = Correct outcome
        </span>
        <span className="ml-2 inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded">
          0pt = Wrong
        </span>
      </div>

      <PredictionsGrid data={data} />
    </div>
  );
}
