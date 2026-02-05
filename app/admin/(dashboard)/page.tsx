import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, CheckCircle, Radio, Users, Target, Flag } from "lucide-react";

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
    {
      label: "Total Matches",
      value: stats.total_matches,
      icon: Trophy,
      description: "In competition",
    },
    {
      label: "Finished",
      value: stats.finished_matches,
      icon: CheckCircle,
      description: "Completed matches",
    },
    {
      label: "Live",
      value: stats.live_matches,
      icon: Radio,
      description: "Currently playing",
    },
    {
      label: "Participants",
      value: stats.total_participants,
      icon: Users,
      description: "Active players",
    },
    {
      label: "Predictions",
      value: stats.total_predictions,
      icon: Target,
      description: "Total submitted",
    },
    {
      label: "Teams",
      value: stats.total_teams,
      icon: Flag,
      description: "Participating nations",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-muted-foreground mt-1">Competition overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <Card
            key={card.label}
            className={
              card.label === "Live" && stats.live_matches > 0
                ? "border-red-200 bg-red-50/50"
                : ""
            }
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.label}
              </CardTitle>
              <card.icon
                className={`h-4 w-4 ${
                  card.label === "Live" && stats.live_matches > 0
                    ? "text-red-500"
                    : "text-muted-foreground"
                }`}
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • Update match results in <strong>Matches</strong>
          </p>
          <p>
            • Add participants in <strong>Participants</strong>
          </p>
          <p>
            • Upload prediction files in <strong>Predictions</strong>
          </p>
          <p>
            • Manual entry available in <strong>Manual Entry</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
