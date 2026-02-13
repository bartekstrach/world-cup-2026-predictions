import { formatDateTime, getShortWeekday } from "@/lib/date";
import {
  getFinishedMatchesByMatchDate,
  getLastCompletedMatchDate,
} from "@/lib/scoring";
import { getMatchTeamNames } from "@/lib/teams";

export const revalidate = 60;

export async function LastFinishedMatches() {
  const latestCompletedDate = await getLastCompletedMatchDate();
  if (!latestCompletedDate) return null;

  const finishedMatches = await getFinishedMatchesByMatchDate(
    latestCompletedDate
  );
  if (!finishedMatches.length) return null;

  const matchesSummary = finishedMatches
    .map(
      (m) =>
        `${getMatchTeamNames({
          displayFlags: false,
          homeTeamCode: m.homeTeamCode,
          awayTeamCode: m.awayTeamCode,
        })}`
    )
    .join(" and ");

  const formattedMatchDate = `${getShortWeekday({
    date: latestCompletedDate,
  })} ${formatDateTime({
    date: latestCompletedDate,
  })}`;

  return <>{`After ${matchesSummary} (${formattedMatchDate})`}</>;
}
