"use client";

import type { LeaderboardEntry } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { useSelectedParticipant } from "@/components/selected-participant-provider";
import { getShortMatchTeamNames } from "@/lib/teams";
import { withMatchMedal } from "@/components/tournament-medal-ui";
import { useTranslation } from "react-i18next";

interface LeaderboardTableProps {
  data: LeaderboardEntry[];
}

const getBackground = () => "bg-white hover:bg-slate-50";

export function LeaderboardTable({ data }: LeaderboardTableProps) {
  const { t } = useTranslation();
  const { selectedParticipantId } = useSelectedParticipant();
  const visibleMatches = data[0]?.nextMatches.slice(0, 2) ?? [];
  const showSecondMatch = visibleMatches.length === 2;
  const matchColumns = showSecondMatch
    ? visibleMatches
    : visibleMatches.slice(0, 1);

  return (
    <Card className="w-full max-w-full rounded-2xl border-slate-100 p-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
      <div className="w-full">
        <table className="w-full border-collapse table-auto text-sm">
          <colgroup>
            <col className="w-px" />
            <col className="w-px" />
            <col className="w-px" />
            {matchColumns.map((match) => (
              <col
                key={match.id}
                className={matchColumns.length === 2 ? "w-1/2" : "w-full"}
              />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
              <th className="border-b border-r border-slate-100 p-4 h-auto text-left w-px whitespace-nowrap">
                {t("leaderboard.rank")}
              </th>
              <th className="border-b border-r border-slate-100 p-4 h-auto text-left w-px whitespace-nowrap">
                {t("leaderboard.participant")}
              </th>
              <th className="border-b border-slate-100 p-4 h-auto text-center w-px whitespace-nowrap">
                {t("leaderboard.points")}
              </th>
              {matchColumns.map((match) => (
                <th
                  key={match.id}
                  className="border-b border-slate-100 p-4 h-auto text-center truncate"
                >
                  {withMatchMedal(
                    getShortMatchTeamNames({
                      displayFlags: true,
                      homeTeamCode: match.homeTeamCode,
                      awayTeamCode: match.awayTeamCode,
                    }),
                    {
                      matchNumber: match.matchNumber,
                      matchId: match.id,
                      homeTeamCode: match.homeTeamCode,
                      awayTeamCode: match.awayTeamCode,
                    },
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((entry) => {
              const isSelected = selectedParticipantId === entry.id;
              const nextPredictions = entry.nextPredictions.slice(
                0,
                matchColumns.length,
              );

              return (
                <tr
                  key={entry.id}
                  className={`border-b border-slate-100 ${getBackground()} ${
                    isSelected ? "selected-highlight-row" : ""
                  }`}
                >
                  <td className="bg-inherit border-r border-slate-100 whitespace-nowrap p-2 sm:p-3 text-slate-700 text-center font-semibold text-[clamp(0.72rem,3vw,0.9rem)]">
                    {entry.rank}
                  </td>
                  <td className="bg-inherit border-r border-slate-100 whitespace-nowrap p-2 sm:p-3 text-slate-700">
                    <span className="font-medium text-[clamp(0.74rem,3.2vw,0.94rem)] leading-tight">
                      {entry.name}
                    </span>
                  </td>
                  <td className="bg-inherit text-center font-mono tabular-nums font-bold whitespace-nowrap p-2 sm:p-3 text-[#0a192f] text-[clamp(0.7rem,3vw,0.9rem)]">
                    {entry.total_points}
                  </td>
                  {nextPredictions.map((prediction) => (
                    <td
                      key={`${entry.id}+${prediction.matchId}`}
                      className="bg-inherit text-center font-mono tabular-nums text-slate-700 whitespace-nowrap p-2 sm:p-3 text-[clamp(0.68rem,2.9vw,0.88rem)] leading-none"
                    >
                      {prediction.homeScore !== null &&
                      prediction.awayScore !== null
                        ? `${prediction.homeScore}:${prediction.awayScore}`
                        : "-"}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
