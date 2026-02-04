import { db } from "@/lib/db";
import { MatchesTable } from "@/components/admin/matches-table";

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
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Matches</h2>
        <p className="text-gray-600 mt-1">Update match results</p>
      </div>

      <MatchesTable matches={matches} />
    </div>
  );
}
