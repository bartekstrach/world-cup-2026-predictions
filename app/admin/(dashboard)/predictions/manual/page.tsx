import { ManualPredictionForm } from "@/components/admin/manual-prediction-form";
import { db } from "@/lib/db";

async function getData() {
  const participants = await db.query.participants.findMany({
    orderBy: (participants, { asc }) => [asc(participants.name)],
  });

  const matches = await db.query.matches.findMany({
    with: {
      homeTeam: true,
      awayTeam: true,
    },
    orderBy: (matches, { asc }) => [asc(matches.matchNumber)],
  });

  return { participants, matches };
}

export default async function ManualPredictionsPage() {
  const { participants, matches } = await getData();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Manual Entry</h2>
        <p className="text-gray-600 mt-1">Add predictions manually</p>
      </div>

      <ManualPredictionForm participants={participants} matches={matches} />
    </div>
  );
}
