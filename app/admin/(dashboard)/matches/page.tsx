import { db } from "@/lib/db";
import { MatchesTable } from "@/components/admin/matches-table";
import { Trophy } from "lucide-react";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";

async function getMatches() {
  return db.query.matches.findMany({
    with: {
      homeTeam: true,
      awayTeam: true,
    },
    orderBy: (matches, { asc }) => [asc(matches.matchNumber)],
  });
}

export default async function MatchesPage() {
  const matches = await getMatches();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <AdminSectionHeader
        title="Matches"
        subtitle="Update match scores, statuses, and calculate points"
        icon={Trophy}
      />

      <MatchesTable matches={matches} />
    </div>
  );
}
