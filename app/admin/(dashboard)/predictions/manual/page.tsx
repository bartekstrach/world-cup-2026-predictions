import { ManualPredictionForm } from "@/components/admin/manual-prediction-form";
import { db } from "@/lib/db";
import { PenTool } from "lucide-react";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";

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
    <div className="space-y-6 animate-in fade-in duration-300">
      <AdminSectionHeader
        title="Manual Entry"
        subtitle="Enter predictions manually for participants"
        icon={PenTool}
      />

      <ManualPredictionForm participants={participants} matches={matches} />
    </div>
  );
}
