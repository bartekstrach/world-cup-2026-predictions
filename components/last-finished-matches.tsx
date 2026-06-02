import { formatDateTime, getShortWeekday } from "@/lib/date";
import {
  getFinishedMatchesByMatchDate,
  getLastCompletedMatchDate,
} from "@/lib/scoring";
import { getMatchTeamNames } from "@/lib/teams";
import { getT } from "@/lib/i18n/server";

export const revalidate = 60;

export async function LastFinishedMatches() {
  const t = await getT();
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
    .join(` ${t("common.and")} `);

  const formattedMatchDate = `${getShortWeekday({
    date: latestCompletedDate,
  })} ${formatDateTime({
    date: latestCompletedDate,
  })}`;

  return (
    <>
      {t("lastFinishedMatches.after", {
        matchesSummary,
        formattedMatchDate,
      })}
    </>
  );
}
