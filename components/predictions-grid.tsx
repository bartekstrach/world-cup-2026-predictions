"use client";

import { Fragment, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { formatDateTime, getShortWeekday } from "@/lib/date";
import { calculatePoints, formatScore } from "@/lib/scoring-utils";
import { getMatchTeamNames, getShortMatchTeamNames } from "@/lib/teams";
import type { PredictionsGridData } from "@/lib/types";
import { MATCH_STAGES, NO_RESULT, type MatchStage } from "@/lib/constants";
import { useTranslation } from "react-i18next";
import { useSelectedParticipant } from "@/components/selected-participant-provider";

interface PredictionsGridProps {
  data: PredictionsGridData;
}

export function PredictionsGrid({ data }: PredictionsGridProps) {
  const { t } = useTranslation();
  const { selectedParticipantId } = useSelectedParticipant();
  const { matches, participants, predictions } = data;
  const hasLiveMatch = useMemo(
    () => matches.some((match) => match.status === "live"),
    [matches],
  );

  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      const byDate = a.matchDate.getTime() - b.matchDate.getTime();
      if (byDate !== 0) return byDate;

      return a.matchNumber - b.matchNumber;
    });
  }, [matches]);

  const groupedMatches = useMemo(() => {
    const groups = new Map<MatchStage, typeof sortedMatches>();

    for (const match of sortedMatches) {
      const stage = match.stage;
      const existing = groups.get(stage);

      if (existing) {
        existing.push(match);
      } else {
        groups.set(stage, [match]);
      }
    }

    return Array.from(groups.entries()).map(([stage, stageMatches]) => ({
      stage,
      matches: stageMatches,
    }));
  }, [sortedMatches]);

  const [collapsedStages, setCollapsedStages] = useState<
    Partial<Record<MatchStage, boolean>>
  >(() => {
    const initial: Partial<Record<MatchStage, boolean>> = {};
    const now = Date.now();
    const firstMatch = sortedMatches[0] ?? null;
    const shouldKeepFirstGroupOpen =
      firstMatch !== null && now < firstMatch.matchDate.getTime();

    for (const stage of MATCH_STAGES) {
      const stageMatches = sortedMatches.filter(
        (match) => match.stage === stage,
      );
      if (stageMatches.length === 0) continue;

      const allFinished = stageMatches.every(
        (match) => match.status === "finished",
      );
      const allUpcoming = stageMatches.every(
        (match) => match.status === "scheduled",
      );

      const defaultCollapsed = allFinished || allUpcoming;
      initial[stage] =
        stage === "group_1" && shouldKeepFirstGroupOpen
          ? false
          : defaultCollapsed;
    }

    return initial;
  });

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

    for (const match of sortedMatches) {
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
    <Card className="w-full max-w-full rounded-2xl border-slate-100 p-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
      <div className="relative overflow-auto max-h-[80vh] w-full predictions-grid-table public-table-scroll">
        <table className="w-full border-collapse table-auto min-w-max text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
              {/* Group/stage */}
              <th className="sticky top-0 z-50 bg-slate-50 hidden sm:table-cell whitespace-nowrap min-w-12 p-2 sm:p-4 h-auto text-left align-middle">
                {t("predictionsGrid.headers.group")}
              </th>

              {/* Date */}
              <th className="sticky top-0 z-50 bg-slate-50 whitespace-nowrap min-w-28 p-2 sm:p-4 h-auto text-left align-middle">
                {t("predictionsGrid.headers.date")}
              </th>

              {/* Match + result */}
              <th className="sticky top-0 left-0 z-[70] bg-slate-50 border-r border-slate-100 whitespace-nowrap w-40 min-w-40 max-w-40 md:w-80 md:min-w-80 md:max-w-80 transition-all duration-300 p-2 sm:p-4 h-auto shadow-[0_2px_8px_-6px_rgba(15,23,42,0.5)] text-left align-middle">
                {t("predictionsGrid.headers.match")}
              </th>
              <th className="sticky top-0 left-40 md:left-80 z-[65] bg-slate-50 whitespace-nowrap w-20 min-w-20 max-w-20 lg:w-24 lg:min-w-24 lg:max-w-24 transition-all duration-300 text-center p-2 sm:p-1 md:p-2 h-auto border-l border-r border-slate-100 shadow-[0_2px_8px_-6px_rgba(15,23,42,0.5),-1px_0_0_0_rgba(226,232,240,1)] align-middle">
                {t("predictionsGrid.headers.result")}
              </th>

              {/* Participants */}
              {participants.map((p) => (
                <th
                  key={p.id}
                  className={`sticky top-0 z-50 bg-slate-50 text-center whitespace-nowrap min-w-24 p-2 sm:p-4 h-auto align-middle ${
                    selectedParticipantId === p.id
                      ? "selected-highlight-col selected-highlight-col-top"
                      : ""
                  }`}
                >
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedMatches.map((group) => {
              const isCollapsed = false; // Boolean(collapsedStages[group.stage]);
              const stageLabel = t(`predictionSheets.stages.${group.stage}`);

              return (
                <Fragment key={`stage-${group.stage}`}>
                  <tr
                    data-no-hover="true"
                    className="stage-section-header selected-highlight-row border-b"
                  >
                    {/* ZMIANA 1: Rozdzielenie colSpan na dwie komórki w celu zachowania poprawnej struktury siatki na małych ekranach */}
                    <td className="hidden sm:table-cell p-0 border-none"></td>
                    <td
                      colSpan={3 + participants.length}
                      className="p-0 whitespace-normal"
                    >
                      <button
                        type="button"
                        onClick={() => toggleStage(group.stage)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-left"
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
                        <span className="text-emerald-700 font-mono text-xs sm:text-sm shrink-0">
                          {isCollapsed ? "▸" : "▾"}
                        </span>
                        <span className="font-semibold text-emerald-900 text-xs sm:text-sm uppercase tracking-wide">
                          {stageLabel}
                        </span>
                      </button>
                    </td>
                  </tr>

                  {!isCollapsed &&
                    group.matches.map((match) => (
                      <tr
                        key={match.id}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        {/* Group/stage */}
                        <td className="hidden sm:table-cell text-center text-slate-400 whitespace-nowrap p-2 sm:p-4 align-middle">
                          {match.stage.startsWith("group_")
                            ? match.homeTeam.group
                            : t(`predictionSheets.stages.${match.stage}`)}
                        </td>

                        {/* Date */}
                        <td className="text-slate-500 whitespace-nowrap text-xs sm:text-sm p-2 sm:p-4 align-middle">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2">
                            <span>
                              {getShortWeekday({ date: match.matchDate })}
                            </span>
                            <time>
                              {formatDateTime({ date: match.matchDate })}
                            </time>
                          </div>
                        </td>

                        {/* Match */}
                        <td className="sticky left-0 z-30 bg-white border-r border-slate-100 p-2 sm:p-4 align-middle w-40 min-w-40 max-w-40 md:w-80 md:min-w-80 md:max-w-80 transition-all duration-300">
                          <div className="block md:hidden font-medium text-slate-700 whitespace-nowrap truncate">
                            {getShortMatchTeamNames({
                              displayFlags: true,
                              homeTeamCode: match.homeTeam.code,
                              awayTeamCode: match.awayTeam.code,
                            })}
                          </div>
                          <div className="hidden md:block font-medium text-slate-700 whitespace-nowrap truncate">
                            {getMatchTeamNames({
                              displayFlags: true,
                              homeTeamCode: match.homeTeam.code,
                              awayTeamCode: match.awayTeam.code,
                            })}
                          </div>
                        </td>

                        {/* Result */}
                        <td className="sticky left-40 md:left-80 z-20 bg-slate-50 hover:bg-slate-100 p-1 md:p-1 text-center whitespace-nowrap border-l border-r border-slate-100 shadow-[-1px_0_0_0_rgba(226,232,240,1)] align-middle w-20 min-w-20 max-w-20 lg:w-24 lg:min-w-24 lg:max-w-24 transition-all duration-300">
                          {match.status === "live" ? (
                            <span className="inline-flex h-6 items-center gap-1.5 bg-red-50 text-red-600 px-2 rounded-full text-xs font-bold border border-red-100 leading-none">
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
                            </span>
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
                        </td>

                        {/* Participants */}
                        {participants.map((p) => {
                          const key = `${match.id}-${p.id}`;
                          const pred = predictions[key];

                          if (!pred) {
                            return (
                              <td
                                key={p.id}
                                className={`text-center whitespace-nowrap p-2 sm:p-4 ${
                                  selectedParticipantId === p.id
                                    ? "selected-highlight-col"
                                    : ""
                                }`}
                              >
                                <span className="text-muted-foreground">-</span>
                              </td>
                            );
                          }

                          return (
                            <td
                              key={p.id}
                              className={`text-center whitespace-nowrap p-2 sm:p-4 ${
                                selectedParticipantId === p.id
                                  ? "selected-highlight-col"
                                  : ""
                              }`}
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
                                        match.status === "live"
                                          ? "text-red-600"
                                          : points === 3
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
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-semibold">
              <td className="hidden sm:table-cell sticky bottom-[41px] sm:bottom-[57px] z-40 bg-slate-50 border-t border-slate-200 whitespace-nowrap min-w-12 p-2 sm:p-3 text-center" />
              <td className="sticky bottom-[41px] sm:bottom-[57px] z-40 bg-slate-50 border-t border-slate-200 whitespace-nowrap min-w-28 p-2 sm:p-3" />
              <td className="sticky bottom-[41px] sm:bottom-[57px] left-0 z-[50] bg-slate-50 border-t border-slate-200 border-r border-slate-100 whitespace-nowrap w-40 min-w-40 max-w-40 md:w-80 md:min-w-80 md:max-w-80 transition-all duration-300 p-2 sm:p-3 shadow-[0_-6px_12px_-8px_rgba(15,23,42,0.55)]" />
              <td className="sticky bottom-[41px] sm:bottom-[57px] left-40 md:left-80 z-[45] bg-slate-50 border-t border-slate-200 whitespace-nowrap w-20 min-w-20 max-w-20 lg:w-24 lg:min-w-24 lg:max-w-24 transition-all duration-300 text-center p-2 sm:p-1 md:p-1 border-l border-r border-slate-100 shadow-[0_-6px_12px_-8px_rgba(15,23,42,0.55),-1px_0_0_0_rgba(226,232,240,1)]" />
              {participants.map((p) => (
                <td
                  key={`summary-header-${p.id}`}
                  className={`sticky bottom-[41px] sm:bottom-[57px] z-40 bg-slate-50 border-t border-slate-200 text-center whitespace-nowrap min-w-24 p-2 sm:p-3 ${
                    selectedParticipantId === p.id
                      ? "selected-highlight-col selected-highlight-col-bottom"
                      : ""
                  }`}
                >
                  {p.name}
                </td>
              ))}
            </tr>

            <tr className="selected-highlight-row border-b border-slate-100">
              {/* ZMIANA 2: Dodano brakujące hidden sm:table-cell, które rozsadzało kalkulację szerokości komórek poniżej 640px */}
              <td className="hidden sm:table-cell sticky bottom-0 z-50 border-t border-slate-200 text-center text-slate-400 whitespace-nowrap p-2 sm:p-4 bg-[#ddf5ea] hover:bg-[#c9eedf]" />
              <td className="sticky bottom-0 z-50 border-t border-slate-200 text-slate-500 whitespace-nowrap text-xs sm:text-sm p-2 sm:p-4 font-semibold bg-[#ddf5ea] hover:bg-[#c9eedf]" />
              <td className="sticky bottom-0 left-0 z-[60] border-t border-r border-slate-200 p-2 sm:p-4 font-semibold text-[#0a192f] whitespace-nowrap shadow-[0_-6px_12px_-8px_rgba(15,23,42,0.55)] bg-[#ddf5ea] hover:bg-[#c9eedf] w-40 min-w-40 max-w-40 md:w-80 md:min-w-80 md:max-w-80 transition-all duration-300">
                {""}
              </td>
              <td className="sticky bottom-0 left-40 md:left-80 z-[55] border-t border-l border-r border-slate-200 p-2 sm:p-1 md:p-1 text-center text-xs text-slate-500 whitespace-nowrap shadow-[0_-6px_12px_-8px_rgba(15,23,42,0.55),-1px_0_0_0_rgba(226,232,240,1)] bg-[#ddf5ea] hover:bg-[#c9eedf] w-20 min-w-20 max-w-20 lg:w-24 lg:min-w-24 lg:max-w-24 transition-all duration-300">
                {""}
              </td>
              {participants.map((participant) => {
                const totals = participantPointTotals[participant.id] ?? {
                  withoutLive: 0,
                  withLive: 0,
                };
                const isSelected = selectedParticipantId === participant.id;

                return (
                  <td
                    key={participant.id}
                    className={`sticky bottom-0 z-50 border-t border-slate-200 text-center whitespace-nowrap p-2 sm:p-4 ${
                      isSelected
                        ? "bg-[var(--selected-participant-bg)] hover:bg-[var(--selected-participant-bg-hover)] selected-highlight-col selected-highlight-col-bottom"
                        : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <span className="font-mono font-bold text-[#0a192f]">
                      {totals.withoutLive}
                    </span>
                    {hasLiveMatch ? (
                      <>
                        <span className="text-slate-400 px-1">(</span>
                        <span className="font-mono font-bold text-red-600">
                          {totals.withLive}
                        </span>
                        <span className="text-slate-400 px-1">)</span>
                      </>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}
