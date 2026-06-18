"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCountdownParts } from "@/lib/date";
import { useTranslation } from "react-i18next";

interface CountdownValue {
  days: number;
  hours: number;
  minutes: number;
}

interface NextEventCountersCardProps {
  nextMatchTargetDate: Date | string | null;
  nextStageTargetDate: Date | string | null;
}

const formatCountdown = ({
  countdown,
  t,
}: {
  countdown: CountdownValue;
  t: ReturnType<typeof useTranslation>["t"];
}) => {
  return t("admin.dashboard.nextEvents.countdownPattern", {
    days: countdown.days,
    hours: countdown.hours,
    minutes: String(countdown.minutes).padStart(2, "0"),
  });
};

export function NextEventCountersCard({
  nextMatchTargetDate,
  nextStageTargetDate,
}: NextEventCountersCardProps) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const nextMatchCountdown = nextMatchTargetDate
    ? getCountdownParts({
        targetDate: new Date(nextMatchTargetDate),
        now,
      })
    : null;
  const nextStageCountdown = nextStageTargetDate
    ? getCountdownParts({
        targetDate: new Date(nextStageTargetDate),
        now,
      })
    : null;

  return (
    <Card className="rounded-2xl border-slate-100 p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] gap-0">
      <CardHeader className="p-0">
        <CardTitle className="text-lg font-bold text-[#0a192f]">
          {t("admin.dashboard.nextEvents.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {t("admin.dashboard.nextEvents.nextMatchLabel")}
          </p>
          <p
            className="mt-2 text-2xl font-mono font-bold text-[#0a192f]"
            suppressHydrationWarning
          >
            {nextMatchCountdown
              ? formatCountdown({ countdown: nextMatchCountdown, t })
              : t("admin.dashboard.nextEvents.emptyNextMatch")}
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {t("admin.dashboard.nextEvents.nextStageLabel")}
          </p>
          <p
            className="mt-2 text-2xl font-mono font-bold text-[#0a192f]"
            suppressHydrationWarning
          >
            {nextStageCountdown
              ? formatCountdown({ countdown: nextStageCountdown, t })
              : t("admin.dashboard.nextEvents.emptyNextStage")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
