import type { NextMatchBannerData } from "@/lib/types";
import { formatDateTime, getShortWeekday } from "@/lib/date";
import { getMatchTeamNames } from "@/lib/teams";
import { getT } from "@/lib/i18n/server";

interface NextMatchBannerProps {
  data: NextMatchBannerData;
}

export async function NextMatchBanner({ data }: NextMatchBannerProps) {
  const t = await getT();
  const teamsLabel = data.matches
    .map((match) =>
      getMatchTeamNames({
        displayFlags: false,
        homeTeamCode: match.homeTeamCode,
        awayTeamCode: match.awayTeamCode,
      }),
    )
    .join(` ${t("common.and")} `);

  const formattedMatchDate = `${getShortWeekday({
    date: data.matchDate,
  })} ${formatDateTime({
    date: data.matchDate,
  })}`;

  return (
    <p className="text-[#10b981] font-medium mt-1 text-sm sm:text-base">
      {t("nextMatchBanner.label", {
        teamsLabel,
        formattedMatchDate,
        count: data.matches.length,
      })}
    </p>
  );
}
