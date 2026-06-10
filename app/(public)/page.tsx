import { LastFinishedMatches } from "@/components/last-finished-matches";
import { HallOfFameTable } from "@/components/hall-of-fame-table";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { NextMatchBanner } from "@/components/next-match-banner";
import { PredictionSheetsLinks } from "@/components/prediction-sheets-links";
import { PredictionsGrid } from "@/components/predictions-grid";
import { ParticipantSelector } from "@/components/participant-selector";
import { SelectedParticipantProvider } from "@/components/selected-participant-provider";
import {
  getNextMatchBannerData,
  getPredictionSheetLinks,
  getPredictionsData,
} from "@/lib/predictions";
import { getLeaderboard } from "@/lib/scoring";
import { getT } from "@/lib/i18n/server";
import { Card } from "@/components/ui/card";

export const revalidate = 60;

export default async function MainPage() {
  const t = await getT();
  const [
    leaderboard,
    predictionsData,
    nextMatchBannerData,
    predictionSheetLinks,
  ] = await Promise.all([
    getLeaderboard(),
    getPredictionsData(),
    getNextMatchBannerData(),
    getPredictionSheetLinks(),
  ]);

  const hasVisiblePredictions = predictionsData.matches.length > 0;

  return (
    <SelectedParticipantProvider>
      <div className="space-y-3 sm:space-y-5 min-w-0">
        <section className="space-y-2 sm:space-y-3 w-full xl:w-1/2 xl:transition-all xl:duration-300 mx-auto">
          <ParticipantSelector participants={predictionsData.participants} />
        </section>

        <section className="space-y-2 sm:space-y-3 w-full xl:w-1/2 xl:transition-all xl:duration-300 mx-auto">
          <div className="min-w-0 w-full">
            <h2 className="text-[clamp(1rem,4.8vw,1.45rem)] sm:text-2xl font-bold text-[#0a192f] leading-tight">
              {t("public.results")}
            </h2>
            <div className="text-slate-500 mt-1 text-[clamp(0.72rem,3.3vw,0.95rem)] sm:text-base">
              <LastFinishedMatches />
            </div>
            {nextMatchBannerData && (
              <NextMatchBanner data={nextMatchBannerData} />
            )}
          </div>
          <LeaderboardTable data={leaderboard} />
        </section>

        <section className="space-y-2 sm:space-y-4 pt-2 sm:pt-4">
          <h2 className="text-[clamp(1rem,4.8vw,1.45rem)] sm:text-2xl font-bold text-[#0a192f]">
            {t("public.predictions")}
          </h2>

          {hasVisiblePredictions ? (
            <PredictionsGrid data={predictionsData} />
          ) : (
            <Card className="p-4 text-sm text-muted-foreground w-full">
              {t("public.visibility.noPredictions")}
            </Card>
          )}
        </section>

        <section className="space-y-2 sm:space-y-4 pt-2 sm:pt-4 w-full xl:w-3/4 xl:transition-all xl:duration-300 mx-auto">
          <HallOfFameTable
            hallOfFameTitle={t("public.hallOfFame.title")}
            hallOfShameTitle={t("public.hallOfShame.title")}
            nameHeader={t("public.hallOfFame.headers.name")}
            medalsHeader={t("public.hallOfFame.headers.medals")}
            heroHeader={t("public.hallOfShame.headers.hero")}
          />
        </section>

        <section className="space-y-2 sm:space-y-4 pt-2 sm:pt-4 w-full xl:w-3/4 xl:transition-all xl:duration-300 mx-auto">
          <div className="space-y-1">
            <h2 className="text-[clamp(1rem,4.8vw,1.45rem)] sm:text-2xl font-bold text-[#0a192f]">
              {t("public.uploadedPredictionSheets")}
            </h2>
          </div>
          <PredictionSheetsLinks data={predictionSheetLinks} />
        </section>
      </div>
    </SelectedParticipantProvider>
  );
}
