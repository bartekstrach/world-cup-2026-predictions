import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

async function getStats() {
  const result = await db.execute(sql`
    SELECT 
      (SELECT COUNT(*) FROM matches) as total_matches,
      (SELECT COUNT(*) FROM matches WHERE status = 'finished') as finished_matches,
      (SELECT COUNT(*) FROM matches WHERE status = 'live') as live_matches,
      (SELECT COUNT(*) FROM participants) as total_participants,
      (SELECT COUNT(*) FROM predictions) as total_predictions,
      (SELECT COUNT(*) FROM teams) as total_teams
  `);

  return result.rows[0] as {
    total_matches: number;
    finished_matches: number;
    live_matches: number;
    total_participants: number;
    total_predictions: number;
    total_teams: number;
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  const cards = [
    { label: "Total Matches", value: stats.total_matches, icon: "⚽" },
    { label: "Finished", value: stats.finished_matches, icon: "✅" },
    { label: "Live", value: stats.live_matches, icon: "🔴" },
    { label: "Participants", value: stats.total_participants, icon: "👥" },
    { label: "Predictions", value: stats.total_predictions, icon: "🎯" },
    { label: "Teams", value: stats.total_teams, icon: "🏴" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-1">Competition overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {card.value}
                </p>
              </div>
              <div className="text-4xl">{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Quick Actions</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            • Update match results in <strong>Matches</strong>
          </li>
          <li>
            • Add participants in <strong>Participants</strong>
          </li>
          <li>
            • Upload prediction files in <strong>Predictions</strong>
          </li>
        </ul>
      </div>
    </div>
  );
}
