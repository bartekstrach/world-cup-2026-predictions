import { Calendar } from "lucide-react";

import { KickoffDateLabel } from "@/components/kickoff-date-label";
import { getMatchTeamNames } from "@/lib/teams";
import { getT } from "@/lib/i18n/server";

interface NextMatchInsightItem {
  matchDate: Date;
  stage: string;
  homeTeamCode: string;
  awayTeamCode: string;
}

interface NextMatchInsightListProps {
  nextMatches: NextMatchInsightItem[];
  nextStage: string | null;
}

export async function NextMatchInsightList({
  nextMatches,
  nextStage,
}: NextMatchInsightListProps) {
  const t = await getT();

  if (!nextMatches.length) {
    return (
      <div className="space-y-2">
        <div className="text-lg font-semibold text-[#0a192f]">
          {t("admin.dashboard.noUpcomingTitle")}
        </div>
        <p className="text-sm text-slate-500">
          {t("admin.dashboard.noUpcomingDescription")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
        <Calendar className="w-4 h-4 text-[#10b981]" />
        {t("admin.dashboard.nextMatchInsight")}
      </div>

      <div className="space-y-3">
        {nextMatches.map((match, index) => (
          <div key={`${match.homeTeamCode}-${match.awayTeamCode}-${index}`}>
            <div className="text-2xl font-bold text-[#0a192f] flex items-center gap-2">
              {getMatchTeamNames({
                displayFlags: true,
                homeTeamCode: match.homeTeamCode,
                awayTeamCode: match.awayTeamCode,
              })}
            </div>
            <KickoffDateLabel date={match.matchDate} />
          </div>
        ))}
      </div>

      {nextStage ? (
        <p className="text-sm text-slate-500">
          {t("admin.dashboard.upcomingStage", {
            stage: t(`predictionSheets.stages.${nextStage}`),
          })}
        </p>
      ) : null}
    </div>
  );
}
