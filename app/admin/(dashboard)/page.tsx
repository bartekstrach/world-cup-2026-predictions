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
  Calendar,
  AlertCircle,
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
      icon: AlertCircle,
      description: "Scheduled gaps",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-[#0a192f]">
          Dashboard
        </h2>
        <p className="text-sm text-slate-500 mt-1">Competition overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {cards.map((card) => (
          <Card
            key={card.label}
            className={
              card.label === "Live" && stats.live_matches > 0
                ? "rounded-2xl border-red-200 bg-red-50/40 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] p-6 gap-6"
                : "rounded-2xl border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] p-6 gap-6 hover:border-slate-200 hover:shadow-md transition-all"
            }
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 p-0">
              <CardTitle
                className={`font-medium ${
                  card.label === "Live" && stats.live_matches > 0
                    ? "text-red-900"
                    : "text-[#0a192f]"
                }`}
              >
                {card.label}
              </CardTitle>
              {card.label === "Live" && stats.live_matches > 0 ? (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              ) : (
                <card.icon
                  className={`h-5 w-5 ${
                    card.label === "Missing"
                      ? "text-amber-500"
                      : "text-slate-400"
                  }`}
                />
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div
                className={`text-4xl font-mono font-bold ${
                  card.label === "Live" && stats.live_matches > 0
                    ? "text-red-600"
                    : "text-[#0a192f]"
                }`}
              >
                {card.value}
              </div>
              <p className="text-sm text-slate-500 mt-1">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="rounded-2xl border-slate-100 p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
          <CardContent className="p-0">
            {stats.nextMatch ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <Calendar className="w-4 h-4 text-[#10b981]" /> Next Match
                  Insight
                </div>
                <div className="text-2xl font-bold text-[#0a192f] flex items-center gap-2">
                  {getMatchTeamNames({
                    displayFlags: true,
                    homeTeamCode: stats.nextMatch.homeTeamCode,
                    awayTeamCode: stats.nextMatch.awayTeamCode,
                  })}
                </div>
                <p className="text-sm text-slate-500 font-mono">
                  Kickoff: {formatDateTime({ date: stats.nextMatch.matchDate })}
                </p>
                {stats.nextStageName && (
                  <p className="text-sm text-slate-500">
                    Upcoming stage transition:{" "}
                    <strong>{stats.nextStageName}</strong>
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-lg font-semibold text-[#0a192f]">
                  No upcoming scheduled matches
                </div>
                <p className="text-sm text-slate-500">
                  Add or schedule future matches to see the next kickoff
                  insight.
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

        <Card className="rounded-2xl border-slate-100 p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
          <CardHeader className="p-0">
            <CardTitle className="text-lg font-bold text-[#0a192f]">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm text-slate-600 p-0 mt-4">
            <p className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] mt-1.5 shrink-0"></span>
              <span>
                Update match results in{" "}
                <strong className="text-[#0a192f]">Matches</strong>
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] mt-1.5 shrink-0"></span>
              <span>
                Add participants in{" "}
                <strong className="text-[#0a192f]">Participants</strong>
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] mt-1.5 shrink-0"></span>
              <span>
                Upload prediction files in{" "}
                <strong className="text-[#0a192f]">Predictions</strong>
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] mt-1.5 shrink-0"></span>
              <span>
                Manual entry available in{" "}
                <strong className="text-[#0a192f]">Manual Entry</strong>
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] mt-1.5 shrink-0"></span>
              <span>
                Live score sync frequency: every{" "}
                <strong className="text-[#0a192f]">
                  {LIVE_SYNC_FREQUENCY_MINUTES} minute(s)
                </strong>
              </span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
