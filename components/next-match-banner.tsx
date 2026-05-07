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
    <p className="text-muted-foreground mt-1">
      {`Next matches: ${teamsLabel} (${formattedMatchDate})`}
    </p>
  );
}
