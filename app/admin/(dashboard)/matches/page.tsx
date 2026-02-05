import { db } from "@/lib/db";
import { MatchesTable } from "@/components/admin/matches-table";
import { Trophy } from "lucide-react";

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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Matches</h2>
          <p className="text-muted-foreground mt-1">
            Update match results and calculate points
          </p>
        </div>
      </div>

      <MatchesTable matches={matches} />
    </div>
  );
}
