import { LastFinishedMatches } from "@/components/last-finished-matches";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { NextMatchBanner } from "@/components/next-match-banner";
import { PredictionSheetsLinks } from "@/components/prediction-sheets-links";
import { PredictionsGrid } from "@/components/predictions-grid";
import {
  getNextMatchBannerData,
  getPredictionSheetLinks,
  getPredictionsData,
} from "@/lib/predictions";
import { getLeaderboard } from "@/lib/scoring";

export const revalidate = 60;

export default async function MainPage() {
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

  return (
    <div className="space-y-6 min-w-0">
      <section className="space-y-4">
        <div className="min-w-0 w-full">
          <h2 className="text-xl sm:text-2xl font-bold text-[#0a192f] leading-tight">
            Results
          </h2>
          <div className="text-slate-500 mt-1 text-sm sm:text-base">
            <LastFinishedMatches />
          </div>
          {nextMatchBannerData && (
            <NextMatchBanner data={nextMatchBannerData} />
          )}
        </div>
      </section>

      <LeaderboardTable data={leaderboard} />

      <section className="space-y-4 pt-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#0a192f]">
          Predictions
        </h2>

        <PredictionsGrid data={predictionsData} />

        <div className="space-y-6 pt-8 border-t border-slate-200/60 mt-8">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-[#0a192f]">
              Uploaded prediction sheets
            </h2>
            <p className="text-sm text-slate-500">
              Participant prediction blobs grouped by stage
            </p>
          </div>
          <PredictionSheetsLinks data={predictionSheetLinks} />
        </div>
      </section>
    </div>
  );
}
