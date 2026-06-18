"use client";

import { formatDateTime } from "@/lib/date";
import { useTranslation } from "react-i18next";

export function KickoffDateLabel({ date }: { date: Date | string }) {
  const { t } = useTranslation();
  const matchDate = new Date(date);

  return (
    <p className="text-sm text-slate-500 font-mono" suppressHydrationWarning>
      {t("admin.dashboard.kickoff", {
        date: formatDateTime({ date: matchDate }),
      })}
    </p>
  );
}
