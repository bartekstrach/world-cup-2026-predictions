import { ManualPredictionForm } from "@/components/admin/manual-prediction-form";
import { MATCH_STATUSES } from "@/lib/constants";
import { db } from "@/lib/db";
import { PenTool } from "lucide-react";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { getT } from "@/lib/i18n/server";

async function getData() {
  const participants = await db.query.participants.findMany({
    orderBy: (participants, { asc }) => [asc(participants.name)],
  });

  const matches = await db.query.matches.findMany({
    where: (matches, { ne }) => ne(matches.status, MATCH_STATUSES.FINISHED),
    with: {
      homeTeam: true,
      awayTeam: true,
    },
    orderBy: (matches, { asc }) => [asc(matches.matchDate)],
  });

  return { participants, matches };
}

export default async function ManualPredictionsPage() {
  const t = await getT();
  const { participants, matches } = await getData();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <AdminSectionHeader
        title={t("admin.manualPage.title")}
        subtitle={t("admin.manualPage.subtitle")}
        icon={PenTool}
      />

      <ManualPredictionForm participants={participants} matches={matches} />
    </div>
  );
}
