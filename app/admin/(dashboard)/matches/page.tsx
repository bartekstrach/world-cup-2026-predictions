import { db } from "@/lib/db";
import { MatchesTable } from "@/components/admin/matches-table";
import { Trophy } from "lucide-react";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { getT } from "@/lib/i18n/server";

async function getMatches() {
  return db.query.matches.findMany({
    with: {
      homeTeam: true,
      awayTeam: true,
    },
    orderBy: (matches, { asc }) => [
      asc(matches.matchDate),
      asc(matches.matchNumber),
    ],
  });
}

export default async function MatchesPage() {
  const t = await getT();
  const matches = await getMatches();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <AdminSectionHeader
        title={t("admin.matchesPage.title")}
        subtitle={t("admin.matchesPage.subtitle")}
        icon={Trophy}
      />

      <MatchesTable matches={matches} />
    </div>
  );
}
