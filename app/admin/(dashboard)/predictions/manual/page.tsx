import { ManualPredictionForm } from "@/components/admin/manual-prediction-form";
import { db } from "@/lib/db";
import { Edit } from "lucide-react";

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
      <div className="flex items-center gap-3">
        <Edit className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Manual Entry</h2>
          <p className="text-muted-foreground mt-1">
            Enter predictions manually for participants
          </p>
        </div>
      </div>

      <ManualPredictionForm participants={participants} matches={matches} />
    </div>
  );
}
