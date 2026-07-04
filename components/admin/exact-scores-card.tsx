"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface ExactScoresItem {
  participantId: number;
  participantName: string;
  exactScoreCount: number;
  onePointCount: number;
  oneAndThreePointCount: number;
  oneGoalOffCount: number;
}

type SortKey =
  | "participant"
  | "exactScore"
  | "onePoint"
  | "oneAndThreePoint"
  | "oneGoalOff";
type SortDir = "asc" | "desc";

interface ExactScoresCardProps {
  rows: ExactScoresItem[];
}

function SortIndicator({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDir;
}) {
  if (!active) return null;

  return (
    <span className="ml-1 text-slate-400" aria-hidden="true">
      {direction === "asc" ? "↑" : "↓"}
    </span>
  );
}

export function ExactScoresCard({ rows }: ExactScoresCardProps) {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<SortKey>("exactScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDir(key === "participant" ? "asc" : "desc");
  }

  const sortedRows = useMemo(() => {
    const sorted = [...rows];

    sorted.sort((a, b) => {
      let cmp = 0;

      switch (sortKey) {
        case "participant":
          cmp = a.participantName.localeCompare(b.participantName);
          break;
        case "exactScore":
          cmp = a.exactScoreCount - b.exactScoreCount;
          break;
        case "onePoint":
          cmp = a.onePointCount - b.onePointCount;
          break;
        case "oneAndThreePoint":
          cmp = a.oneAndThreePointCount - b.oneAndThreePointCount;
          break;
        case "oneGoalOff":
          cmp = a.oneGoalOffCount - b.oneGoalOffCount;
          break;
      }

      if (cmp === 0 && sortKey !== "participant") {
        cmp = a.participantName.localeCompare(b.participantName);
      }

      return sortDir === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [rows, sortKey, sortDir]);

  const headerClass = (key: SortKey, align: "left" | "right") =>
    cn(
      "w-[20%] px-2 font-medium py-2 cursor-pointer select-none hover:text-slate-700 transition-colors",
      align === "left" ? "text-left" : "text-right",
      sortKey === key && "text-slate-700",
    );

  const cellClass = (align: "left" | "right") =>
    cn(
      "w-[20%] px-2 py-2.5",
      align === "left" ? "text-left" : "text-right font-mono text-slate-600",
    );

  return (
    <Card className="rounded-2xl border-slate-100 p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] gap-0">
      <CardHeader className="p-0">
        <CardTitle className="text-lg font-bold text-[#0a192f]">
          {t("admin.exactScores.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 mt-4">
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                {Array.from({ length: 5 }).map((_, index) => (
                  <col key={index} style={{ width: "20%" }} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th
                    className={headerClass("participant", "left")}
                    onClick={() => handleSort("participant")}
                  >
                    {t("admin.exactScores.headers.participant")}
                    <SortIndicator
                      active={sortKey === "participant"}
                      direction={sortDir}
                    />
                  </th>
                  <th
                    className={headerClass("exactScore", "right")}
                    onClick={() => handleSort("exactScore")}
                  >
                    {t("admin.exactScores.headers.count")}
                    <SortIndicator
                      active={sortKey === "exactScore"}
                      direction={sortDir}
                    />
                  </th>
                  <th
                    className={headerClass("onePoint", "right")}
                    onClick={() => handleSort("onePoint")}
                  >
                    {t("admin.exactScores.headers.onePointCount")}
                    <SortIndicator
                      active={sortKey === "onePoint"}
                      direction={sortDir}
                    />
                  </th>
                  <th
                    className={headerClass("oneAndThreePoint", "right")}
                    onClick={() => handleSort("oneAndThreePoint")}
                  >
                    {t("admin.exactScores.headers.oneAndThreePointCount")}
                    <SortIndicator
                      active={sortKey === "oneAndThreePoint"}
                      direction={sortDir}
                    />
                  </th>
                  <th
                    className={headerClass("oneGoalOff", "right")}
                    onClick={() => handleSort("oneGoalOff")}
                  >
                    {t("admin.exactScores.headers.oneGoalOffCount")}
                    <SortIndicator
                      active={sortKey === "oneGoalOff"}
                      direction={sortDir}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr
                    key={row.participantId}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className={cn(cellClass("left"), "font-medium text-slate-700")}>
                      {row.participantName}
                    </td>
                    <td className={cellClass("right")}>{row.exactScoreCount}</td>
                    <td className={cellClass("right")}>{row.onePointCount}</td>
                    <td className={cellClass("right")}>
                      {row.oneAndThreePointCount}
                    </td>
                    <td className={cellClass("right")}>{row.oneGoalOffCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">{t("admin.exactScores.none")}</p>
        )}
      </CardContent>
    </Card>
  );
}
