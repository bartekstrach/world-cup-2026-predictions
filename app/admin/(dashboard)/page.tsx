import { getAdminStats } from "@/lib/admin-stats";
import { formatDateTime } from "@/lib/date";
import { getMatchTeamNames } from "@/lib/teams";
import { LIVE_SYNC_FREQUENCY_MINUTES } from "@/lib/constants";
import { MissingPredictionsCard } from "@/components/admin/missing-predictions-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Trophy,
  CheckCircle,
  Radio,
  Users,
  Target,
  Flag,
  CalendarClock,
} from "lucide-react";

export default async function AdminDashboard() {
  const stats = await getAdminStats();

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
    {
      label: "Missing",
      value: stats.total_missing_predictions,
      icon: Target,
      description: "Scheduled gaps",
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Next Match Insight
          </CardTitle>
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {stats.nextMatch ? (
            <div className="space-y-1">
              <div className="text-2xl font-bold">
                {getMatchTeamNames({
                  displayFlags: true,
                  homeTeamCode: stats.nextMatch.homeTeamCode,
                  awayTeamCode: stats.nextMatch.awayTeamCode,
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Kickoff: {formatDateTime({ date: stats.nextMatch.matchDate })}
              </p>
              {stats.nextStageName && (
                <p className="text-xs text-muted-foreground">
                  Upcoming stage transition:{" "}
                  <strong>{stats.nextStageName}</strong>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-lg font-semibold">
                No upcoming scheduled matches
              </div>
              <p className="text-xs text-muted-foreground">
                Add or schedule future matches to see the next kickoff insight.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <MissingPredictionsCard
        totalMissingPredictions={stats.total_missing_predictions}
        byParticipant={stats.missingPredictionsByParticipant}
        byMatch={stats.missingPredictionsByMatch}
      />

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
          <p>
            • Live score sync frequency: every{" "}
            <strong>{LIVE_SYNC_FREQUENCY_MINUTES} minute(s)</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
