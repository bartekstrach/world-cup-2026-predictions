import {
  getFinishedMatchesByMatchDate,
  getLastCompletedMatchDate,
} from "@/lib/scoring";
import { getMatchTeamNames } from "@/lib/teams";
import { LastFinishedMatchesText } from "@/components/last-finished-matches-text";

export const revalidate = 0;

export async function LastFinishedMatches() {
  const latestCompletedDate = await getLastCompletedMatchDate();
  if (!latestCompletedDate) return null;

  const finishedMatches =
    await getFinishedMatchesByMatchDate(latestCompletedDate);
  if (!finishedMatches.length) return null;

  const matchesSummary = finishedMatches
    .map(
      (m) =>
        `${getMatchTeamNames({
          displayFlags: false,
          homeTeamCode: m.homeTeamCode,
          awayTeamCode: m.awayTeamCode,
        })}`,
    )
    .join(" / ");

  return (
    <LastFinishedMatchesText
      matchesSummary={matchesSummary}
      matchDate={latestCompletedDate}
      count={finishedMatches.length}
    />
  );
}
