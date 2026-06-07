"use client";

import { Fragment, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, getShortWeekday } from "@/lib/date";
import { calculatePoints, formatScore } from "@/lib/scoring-utils";
import { getMatchTeamNames, getShortMatchTeamNames } from "@/lib/teams";
import type { PredictionsGridData } from "@/lib/types";
import { MATCH_STAGES, NO_RESULT, type MatchStage } from "@/lib/constants";
import { useTranslation } from "react-i18next";

interface PredictionsGridProps {
  data: PredictionsGridData;
}

export function PredictionsGrid({ data }: PredictionsGridProps) {
  const { t } = useTranslation();
  const { matches, participants, predictions } = data;

  const groupedMatches = useMemo(() => {
    return MATCH_STAGES.map((stage) => ({
      stage,
      matches: matches.filter((match) => match.stage === stage),
    })).filter((group) => group.matches.length > 0);
  }, [matches]);

  const [collapsedStages, setCollapsedStages] = useState<
    Partial<Record<MatchStage, boolean>>
  >({});

  function toggleStage(stage: MatchStage) {
    setCollapsedStages((prev) => ({
      ...prev,
      [stage]: !prev[stage],
    }));
  }

  const participantPointTotals = participants.reduce<
    Record<number, { withoutLive: number; withLive: number }>
  >((acc, participant) => {
    let withoutLive = 0;
    let withLive = 0;

    for (const match of matches) {
      const prediction = predictions[`${match.id}-${participant.id}`];
      if (!prediction) continue;

      if (match.status === "finished") {
        withoutLive += prediction.points;
        withLive += prediction.points;
        continue;
      }

      if (match.status === "live") {
        withLive += calculatePoints(
          prediction.homeScore,
          prediction.awayScore,
          match.homeScore ?? 0,
          match.awayScore ?? 0,
        );
      }
    }

    acc[participant.id] = { withoutLive, withLive };
    return acc;
  }, {});

  return (
    <Card className="w-full max-w-full overflow-hidden rounded-2xl border-slate-100 p-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
      <div className="overflow-x-auto public-table-scroll">
        <Table className="w-full min-w-max table-auto">
          <TableHeader>
            <TableRow className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
              {/* Group/stage */}
              <TableHead className="hidden sm:table-cell whitespace-nowrap min-w-12 p-4 h-auto">
                {t("predictionsGrid.headers.group")}
              </TableHead>

              {/* Date */}
              <TableHead className="whitespace-nowrap min-w-28 p-4 h-auto">
                {t("predictionsGrid.headers.date")}
              </TableHead>

              {/* Match + result */}
              <TableHead className="sticky left-0 z-20 bg-slate-50 whitespace-nowrap min-w-48 sm:min-w-64 p-4 h-auto">
                {t("predictionsGrid.headers.match")}
              </TableHead>
              <TableHead className="sticky left-48 sm:left-64 z-20 bg-slate-50 whitespace-nowrap min-w-24 text-center p-4 h-auto">
                {t("predictionsGrid.headers.result")}
              </TableHead>

              {/* Participants */}
              {participants.map((p) => (
                <TableHead
                  key={p.id}
                  className="text-center whitespace-nowrap min-w-24 p-4 h-auto"
                >
                  {p.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedMatches.map((group) => {
              const isCollapsed = Boolean(collapsedStages[group.stage]);
              const stageLabel = t(`predictionSheets.stages.${group.stage}`);

              return (
                <Fragment key={`stage-${group.stage}`}>
                  <TableRow
                    data-no-hover="true"
                    className="stage-section-header bg-emerald-50/70 border-emerald-100"
                  >
                    <TableCell
                      colSpan={4 + participants.length}
                      className="p-0 whitespace-normal"
                    >
                      <button
                        type="button"
                        onClick={() => toggleStage(group.stage)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-2 text-left"
                        aria-expanded={!isCollapsed}
                        aria-label={
                          isCollapsed
                            ? t("predictionsGrid.stageHeader.expand", {
                                stage: stageLabel,
                              })
                            : t("predictionsGrid.stageHeader.collapse", {
                                stage: stageLabel,
                              })
                        }
                      >
                        <span className="font-semibold text-emerald-900 text-xs sm:text-sm uppercase tracking-wide">
                          {stageLabel}
                        </span>
                        <span className="text-emerald-700 font-mono text-xs sm:text-sm">
                          {isCollapsed ? "▸" : "▾"}{" "}
                          {t("predictionsGrid.stageHeader.matches", {
                            count: group.matches.length,
                          })}
                        </span>
                      </button>
                    </TableCell>
                  </TableRow>

                  {!isCollapsed &&
                    group.matches.map((match) => (
                      <TableRow key={match.id}>
                        {/* Group/stage */}
                        <TableCell className="hidden sm:table-cell text-center text-slate-400 whitespace-nowrap p-4">
                          {match.stage.startsWith("group_")
                            ? match.homeTeam.group
                            : t(`predictionSheets.stages.${match.stage}`)}
                        </TableCell>

                        {/* Date */}
                        <TableCell className="text-slate-500 whitespace-nowrap text-xs sm:text-sm p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2">
                            <span>
                              {getShortWeekday({ date: match.matchDate })}
                            </span>
                            <time>
                              {formatDateTime({ date: match.matchDate })}
                            </time>
                          </div>
                        </TableCell>

                        {/* Match */}
                        <TableCell className="sticky left-0 z-10 bg-white p-4">
                          <div className="block md:hidden font-medium text-slate-700 whitespace-nowrap">
                            {getShortMatchTeamNames({
                              displayFlags: true,
                              homeTeamCode: match.homeTeam.code,
                              awayTeamCode: match.awayTeam.code,
                            })}
                          </div>
                          <div className="hidden md:block font-medium text-slate-700 whitespace-nowrap">
                            {getMatchTeamNames({
                              displayFlags: true,
                              homeTeamCode: match.homeTeam.code,
                              awayTeamCode: match.awayTeam.code,
                            })}
                          </div>
                        </TableCell>

                        {/* Result */}
                        <TableCell className="sticky left-48 sm:left-64 z-10 bg-white p-4 text-center whitespace-nowrap">
                          {match.status === "live" ? (
                            <div className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 px-2.5 py-1 rounded-full text-xs font-bold border border-red-100">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                              </span>
                              <span className="font-mono text-sm">
                                {match.homeScore !== null &&
                                match.awayScore !== null
                                  ? formatScore({
                                      homeScore: match.homeScore,
                                      awayScore: match.awayScore,
                                    })
                                  : NO_RESULT}
                              </span>
                            </div>
                          ) : (
                            <span
                              className={`font-mono font-bold ${
                                match.homeScore !== null &&
                                match.awayScore !== null
                                  ? "text-[#0a192f]"
                                  : "text-slate-300"
                              }`}
                            >
                              {match.homeScore !== null &&
                              match.awayScore !== null
                                ? formatScore({
                                    homeScore: match.homeScore,
                                    awayScore: match.awayScore,
                                  })
                                : NO_RESULT}
                            </span>
                          )}
                        </TableCell>

                        {/* Participants */}
                        {participants.map((p) => {
                          const key = `${match.id}-${p.id}`;
                          const pred = predictions[key];

                          if (!pred) {
                            return (
                              <TableCell
                                key={p.id}
                                className="text-center whitespace-nowrap p-4"
                              >
                                <span className="text-muted-foreground">-</span>
                              </TableCell>
                            );
                          }

                          return (
                            <TableCell
                              key={p.id}
                              className="text-center whitespace-nowrap p-4"
                            >
                              <div className="flex items-center justify-center gap-2">
                                <span className="font-mono text-slate-700 w-8 text-center">
                                  {formatScore({
                                    homeScore: pred.homeScore,
                                    awayScore: pred.awayScore,
                                  })}
                                </span>
                                <span className="text-slate-200">|</span>
                                {(() => {
                                  const points =
                                    match.status === "finished"
                                      ? pred.points
                                      : match.status === "live"
                                        ? calculatePoints(
                                            pred.homeScore,
                                            pred.awayScore,
                                            match.homeScore ?? 0,
                                            match.awayScore ?? 0,
                                          )
                                        : null;

                                  return (
                                    <span
                                      className={`text-xs font-mono font-bold w-4 flex justify-center ${
                                        points === 3
                                          ? "text-[#10b981]"
                                          : points && points > 0
                                            ? "text-[#0a192f]"
                                            : "text-slate-300"
                                      }`}
                                    >
                                      {points ?? "-"}
                                    </span>
                                  );
                                })()}
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                </Fragment>
              );
            })}
            <TableRow className="bg-[#f0f7ff] border-b border-slate-100">
              <TableCell className="hidden sm:table-cell text-center text-slate-400 whitespace-nowrap p-4" />
              <TableCell className="text-slate-500 whitespace-nowrap text-xs sm:text-sm p-4 font-semibold" />
              <TableCell className="sticky left-0 z-10 bg-[#f0f7ff] p-4 font-semibold text-[#0a192f] whitespace-nowrap" />
              <TableCell className="sticky left-48 sm:left-64 z-10 bg-[#f0f7ff] p-4 text-center text-xs text-slate-500 whitespace-nowrap" />
              {participants.map((participant) => {
                const totals = participantPointTotals[participant.id] ?? {
                  withoutLive: 0,
                  withLive: 0,
                };

                return (
                  <TableCell
                    key={participant.id}
                    className="text-center whitespace-nowrap p-4"
                  >
                    <span className="font-mono font-bold text-[#0a192f]">
                      {totals.withoutLive}
                    </span>
                    <span className="text-slate-300 px-1">(</span>
                    <span className="font-mono font-bold text-[#10b981]">
                      {totals.withLive}
                    </span>
                    <span className="text-slate-300 px-1">)</span>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
