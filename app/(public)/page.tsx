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
  // TODO: can I move these functions inside of child components?
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Results
          </h2>
          <div className="text-muted-foreground mt-1">
            <LastFinishedMatches />
          </div>
          {nextMatchBannerData && (
            <NextMatchBanner data={nextMatchBannerData} />
          )}
        </div>
      </div>

      <LeaderboardTable data={leaderboard} />

      <div>
        <h2 className="text-2xl font-bold text-slate-900">Predictions</h2>
        <p className="text-muted-foreground mt-1 mb-1">
          Uploaded prediction sheets
        </p>
        <PredictionSheetsLinks data={predictionSheetLinks} />
      </div>

      <PredictionsGrid data={predictionsData} />
    </div>
  );
}
