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
    <div className="space-y-6 min-w-0">
      <section className="space-y-4">
        <div className="min-w-0 w-full">
          <h2 className="text-xl sm:text-2xl font-bold text-[#0a192f] leading-tight">
            {t("public.results")}
          </h2>
          <div className="text-slate-500 mt-1 text-sm sm:text-base">
            <LastFinishedMatches />
          </div>
          {nextMatchBannerData && (
            <NextMatchBanner data={nextMatchBannerData} />
          )}
        </div>
      </section>

      <SelectedParticipantProvider>
        <LeaderboardTable data={leaderboard} />

        <section className="space-y-4 pt-4">
          <h2 className="text-xl sm:text-2xl font-bold text-[#0a192f]">
            {t("public.predictions")}
          </h2>

          {hasVisiblePredictions ? (
            <>
              <ParticipantSelector
                participants={predictionsData.participants}
              />
              <PredictionsGrid data={predictionsData} />
            </>
          ) : (
            <p className="text-sm text-slate-500">
              {t("public.visibility.noPredictions")}
            </p>
          )}

          <HallOfFameTable
            hallOfFameTitle={t("public.hallOfFame.title")}
            hallOfShameTitle={t("public.hallOfShame.title")}
            nameHeader={t("public.hallOfFame.headers.name")}
            medalsHeader={t("public.hallOfFame.headers.medals")}
            heroHeader={t("public.hallOfShame.headers.hero")}
          />

          <div className="space-y-6 pt-8 border-t border-slate-200/60 mt-8">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0a192f]">
                {t("public.uploadedPredictionSheets")}
              </h2>
              <p className="text-sm text-slate-500">
                {t("public.predictionSheetsSubtitle")}
              </p>
            </div>
            <PredictionSheetsLinks data={predictionSheetLinks} />
          </div>
        </section>
      </SelectedParticipantProvider>
    </div>
  );
}
