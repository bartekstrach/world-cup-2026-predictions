import type { NextMatchBannerData } from "@/lib/types";
import { formatDateTime, getShortWeekday } from "@/lib/date";
import { getMatchTeamNames } from "@/lib/teams";

interface NextMatchBannerProps {
  data: NextMatchBannerData;
}

export function NextMatchBanner({ data }: NextMatchBannerProps) {
  const teamsLabel = data.matches
    .map((match) =>
      getMatchTeamNames({
        displayFlags: false,
        homeTeamCode: match.homeTeamCode,
        awayTeamCode: match.awayTeamCode,
      }),
    )
    .join(" and ");

  const formattedMatchDate = `${getShortWeekday({
    date: data.matchDate,
  })} ${formatDateTime({
    date: data.matchDate,
  })}`;

  return (
    <p className="text-[#10b981] font-medium mt-1 text-sm sm:text-base">
      {`Next matches: ${teamsLabel} (${formattedMatchDate})`}
    </p>
  );
}
