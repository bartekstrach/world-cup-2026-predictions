import { getAdminStats } from "@/lib/admin-stats";
import { LIVE_SYNC_FREQUENCY_MINUTES } from "@/lib/constants";
import { MissingPredictionsCard } from "@/components/admin/missing-predictions-card";
import { NextMatchInsightList } from "@/components/admin/next-match-insight-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Trophy,
  CheckCircle,
  Radio,
  Users,
  Target,
  Flag,
  AlertCircle,
} from "lucide-react";
import { getT } from "@/lib/i18n/server";

export default async function AdminDashboard() {
  const t = await getT();
  const stats = await getAdminStats();
  const liveLabel = t("admin.dashboard.cards.live.label");
  const missingLabel = t("admin.dashboard.cards.missing.label");

  const cards = [
    {
      label: t("admin.dashboard.cards.totalMatches.label"),
      value: stats.total_matches,
      icon: Trophy,
      description: t("admin.dashboard.cards.totalMatches.description"),
    },
    {
      label: t("admin.dashboard.cards.finished.label"),
      value: stats.finished_matches,
      icon: CheckCircle,
      description: t("admin.dashboard.cards.finished.description"),
    },
    {
      label: t("admin.dashboard.cards.live.label"),
      value: stats.live_matches,
      icon: Radio,
      description: t("admin.dashboard.cards.live.description"),
    },
    {
      label: t("admin.dashboard.cards.participants.label"),
      value: stats.total_participants,
      icon: Users,
      description: t("admin.dashboard.cards.participants.description"),
    },
    {
      label: t("admin.dashboard.cards.predictions.label"),
      value: stats.total_predictions,
      icon: Target,
      description: t("admin.dashboard.cards.predictions.description"),
    },
    {
      label: t("admin.dashboard.cards.teams.label"),
      value: stats.total_teams,
      icon: Flag,
      description: t("admin.dashboard.cards.teams.description"),
    },
    {
      label: t("admin.dashboard.cards.missing.label"),
      value: stats.total_missing_predictions,
      icon: AlertCircle,
      description: t("admin.dashboard.cards.missing.description"),
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-[#0a192f]">
          {t("admin.dashboard.title")}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {t("admin.dashboard.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {cards.map((card) => (
          <Card
            key={card.label}
            className={
              card.label === liveLabel && stats.live_matches > 0
                ? "rounded-2xl border-red-200 bg-red-50/40 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] p-6 gap-6"
                : "rounded-2xl border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] p-6 gap-6 hover:border-slate-200 hover:shadow-md transition-all"
            }
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 p-0">
              <CardTitle
                className={`font-medium ${
                  card.label === liveLabel && stats.live_matches > 0
                    ? "text-red-900"
                    : "text-[#0a192f]"
                }`}
              >
                {card.label}
              </CardTitle>
              {card.label === liveLabel && stats.live_matches > 0 ? (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              ) : (
                <card.icon
                  className={`h-5 w-5 ${
                    card.label === missingLabel
                      ? "text-amber-500"
                      : "text-slate-400"
                  }`}
                />
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div
                className={`text-4xl font-mono font-bold ${
                  card.label === liveLabel && stats.live_matches > 0
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
            <NextMatchInsightList
              nextMatches={stats.nextMatches}
              nextStage={stats.nextStage}
            />
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
              {t("admin.dashboard.quickActions")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm text-slate-600 p-0 mt-4">
            <p className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] mt-1.5 shrink-0"></span>
              <span>
                {t("admin.dashboard.actions.updateResults", {
                  section: t("admin.layout.nav.matches"),
                })}
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] mt-1.5 shrink-0"></span>
              <span>
                {t("admin.dashboard.actions.addParticipants", {
                  section: t("admin.layout.nav.participants"),
                })}
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] mt-1.5 shrink-0"></span>
              <span>
                {t("admin.dashboard.actions.uploadFiles", {
                  section: t("admin.layout.nav.predictions"),
                })}
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] mt-1.5 shrink-0"></span>
              <span>
                {t("admin.dashboard.actions.manualEntry", {
                  section: t("admin.layout.nav.manualEntry"),
                })}
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] mt-1.5 shrink-0"></span>
              <span>
                {t("admin.dashboard.actions.liveSync", {
                  minutes: LIVE_SYNC_FREQUENCY_MINUTES,
                })}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
