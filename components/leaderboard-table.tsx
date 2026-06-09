"use client";

import type { LeaderboardEntry } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { useSelectedParticipant } from "@/components/selected-participant-provider";
import { getShortMatchTeamNames } from "@/lib/teams";

interface LeaderboardTableProps {
  data: LeaderboardEntry[];
}

const getBackground = () => "bg-white hover:bg-slate-50";

const PODIUM_RANKS = new Set(["🥇", "🥈", "🥉"]);

const formatMergedRankLabel = (rank: string) =>
  PODIUM_RANKS.has(rank) ? rank : "";

export function LeaderboardTable({ data }: LeaderboardTableProps) {
  const { selectedParticipantId } = useSelectedParticipant();
  const visibleMatches = data[0]?.nextMatches.slice(0, 2) ?? [];

  return (
    <Card className="w-full max-w-full rounded-2xl border-slate-100 p-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
      <div className="w-full">
        <table className="w-full border-collapse table-fixed text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500 font-semibold">
              <th className="bg-slate-50 border-b border-r border-slate-100 p-2 sm:p-3 h-auto text-left text-[clamp(0.62rem,2.9vw,0.78rem)] uppercase tracking-wide w-[1%] whitespace-nowrap">
                Imię
              </th>
              <th className="bg-slate-50 border-b border-slate-100 shadow-sm p-2 sm:p-3 h-auto text-center text-[clamp(0.62rem,2.9vw,0.78rem)] uppercase tracking-wide w-[1%] whitespace-nowrap">
                PKT.
              </th>
              {visibleMatches.map((match) => (
                <th
                  key={match.id}
                  className={`bg-slate-50 border-b border-slate-100 shadow-sm p-2 sm:p-3 h-auto text-center text-[clamp(0.62rem,2.9vw,0.78rem)] uppercase tracking-wide ${
                    visibleMatches.length === 2 ? "w-[49%]" : "w-auto"
                  }`}
                >
                  {getShortMatchTeamNames({
                    displayFlags: true,
                    homeTeamCode: match.homeTeamCode,
                    awayTeamCode: match.awayTeamCode,
                  })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((entry, index) => {
              const isSelected = selectedParticipantId === entry.id;
              const nextPredictions = entry.nextPredictions.slice(
                0,
                visibleMatches.length,
              );

              return (
                <tr
                  key={entry.id}
                  className={`border-b border-slate-100 ${getBackground()} ${
                    isSelected ? "selected-highlight-row" : ""
                  }`}
                >
                  <td className="bg-inherit border-r border-slate-100 whitespace-nowrap p-2 sm:p-3 text-slate-700">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <span className="inline-flex items-center justify-center text-[clamp(0.75rem,3.2vw,0.92rem)] leading-none">
                        {formatMergedRankLabel(entry.rank)}
                      </span>
                      <span className="font-medium truncate text-[clamp(0.74rem,3.2vw,0.94rem)] leading-tight">
                        {entry.name}
                      </span>
                    </div>
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
