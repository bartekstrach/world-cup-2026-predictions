import type { LeaderboardEntry } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { getShortMatchTeamNames } from "@/lib/teams";

interface LeaderboardTableProps {
  data: LeaderboardEntry[];
}

const getBackground = (rank: number) => {
  switch (rank) {
    case 1:
      return "bg-[#10b981]/30 hover:bg-[#10b981]/40 border-l-4 border-[#10b981]";
    case 2:
      return "bg-[#10b981]/20 hover:bg-[#10b981]/30";
    case 3:
      return "bg-[#10b981]/10 hover:bg-[#10b981]/20";
    default:
      return "bg-white hover:bg-slate-50";
  }
};

export function LeaderboardTable({ data }: LeaderboardTableProps) {
  return (
    <Card className="w-full max-w-full overflow-hidden rounded-2xl border-slate-100 p-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
      <div className="overflow-x-auto public-table-scroll">
        <Table className="table-auto min-w-max">
          <TableHeader>
            <TableRow className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
              <TableHead className="sticky left-0 z-20 bg-slate-50/50 whitespace-nowrap min-w-14 text-center p-4 h-auto">
                Rank
              </TableHead>
              <TableHead className="sticky left-14 z-20 bg-slate-50/50 whitespace-nowrap min-w-36 sm:min-w-44 p-4 h-auto">
                Participant
              </TableHead>
              <TableHead className="sticky left-[12.5rem] sm:left-[14.5rem] z-20 bg-slate-50/50 text-center whitespace-nowrap min-w-16 p-4 h-auto">
                Points
              </TableHead>
              {data[0].nextMatches.map((match) => (
                <TableHead
                  key={match.id}
                  className="text-center whitespace-nowrap min-w-24 p-4 h-auto"
                >
                  {getShortMatchTeamNames({
                    displayFlags: true,
                    homeTeamCode: match.homeTeamCode,
                    awayTeamCode: match.awayTeamCode,
                  })}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((entry, index) => (
              <TableRow key={entry.id} className={getBackground(index + 1)}>
                <TableCell className="font-medium text-center sticky left-0 z-10 bg-inherit whitespace-nowrap p-4">
                  {entry.rank}
                </TableCell>
                <TableCell className="font-medium sticky left-14 z-10 bg-inherit whitespace-nowrap max-w-36 sm:max-w-44 truncate p-4 text-slate-700">
                  {entry.name}
                </TableCell>
                <TableCell
                  className={`text-center font-mono font-bold sticky left-[12.5rem] sm:left-[14.5rem] z-10 bg-inherit whitespace-nowrap p-4 ${
                    index === 0 ? "text-[#10b981] text-lg" : "text-[#0a192f]"
                  }`}
                >
                  {entry.total_points}
                </TableCell>
                {entry.nextPredictions.map((prediction) => (
                  <TableCell
                    key={`${entry.id}+${prediction.matchId}`}
                    className="text-center font-mono text-slate-600 whitespace-nowrap p-4"
                  >
                    {prediction.homeScore}:{prediction.awayScore}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
