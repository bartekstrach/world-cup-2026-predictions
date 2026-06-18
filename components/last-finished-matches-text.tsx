"use client";

import { formatWeekdayDateTime } from "@/lib/date";
import { useTranslation } from "react-i18next";

interface LastFinishedMatchesTextProps {
  matchesSummary: string;
  matchDate: Date | string;
  count: number;
}

export function LastFinishedMatchesText({
  matchesSummary,
  matchDate,
  count,
}: LastFinishedMatchesTextProps) {
  const { t } = useTranslation();
  const formattedMatchDate = formatWeekdayDateTime({
    date: new Date(matchDate),
  });

  return (
    <span suppressHydrationWarning>
      {t("lastFinishedMatches.after", {
        matchesSummary,
        formattedMatchDate,
        count,
      })}
    </span>
  );
}
