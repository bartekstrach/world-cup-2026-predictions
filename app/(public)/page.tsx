import { getLeaderboard } from "@/lib/scoring";
import { LeaderboardTable } from "@/components/leaderboard-table";
import Link from "next/link";

export const revalidate = 60;

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Leaderboard</h2>
          <p className="text-gray-600 mt-1">Competition standings</p>
        </div>
        <Link
          href="/predictions"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          View All Predictions
        </Link>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Scoring Rules</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            🎯 <strong>Exact score:</strong> 3 points
          </li>
          <li>
            ✅ <strong>Correct winner/draw:</strong> 1 point
          </li>
          <li>
            ❌ <strong>Wrong prediction:</strong> 0 points
          </li>
        </ul>
      </div>

      <LeaderboardTable data={leaderboard} />
    </div>
  );
}
