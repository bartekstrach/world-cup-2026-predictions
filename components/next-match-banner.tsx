"use client";

import type { NextMatchBannerData } from "@/lib/types";
import { formatWeekdayDateTime } from "@/lib/date";
import { getMatchTeamNames } from "@/lib/teams";
import { withMatchMedal } from "@/components/tournament-medal-ui";
import { useTranslation } from "react-i18next";

interface NextMatchBannerProps {
  data: NextMatchBannerData;
}

export function NextMatchBanner({ data }: NextMatchBannerProps) {
  const { t } = useTranslation();
  const teamsLabel = data.matches
    .map((match) =>
      withMatchMedal(
        getMatchTeamNames({
          displayFlags: false,
          homeTeamCode: match.homeTeamCode,
          awayTeamCode: match.awayTeamCode,
        }),
        {
          homeTeamCode: match.homeTeamCode,
          awayTeamCode: match.awayTeamCode,
        },
      ),
    )
    .join(` ${t("common.and")} `);

  const formattedMatchDate = formatWeekdayDateTime({
    date: data.matchDate,
  });

  return (
    <p
      className="text-[#10b981] font-medium mt-1 text-sm sm:text-base"
      suppressHydrationWarning
    >
      {t("nextMatchBanner.label", {
        teamsLabel,
        formattedMatchDate,
        count: data.matches.length,
      })}
    </p>
  );
}
