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
      return "bg-amber-100/50 hover:bg-amber-100/80";
    case 2:
      return "bg-slate-100/70 hover:bg-slate-100/100";
    case 3:
      return "bg-orange-950/10 hover:bg-orange-950/20";
    default:
      return "";
  }
};

export function LeaderboardTable({ data }: LeaderboardTableProps) {
  return (
    <Card className="w-full max-w-full overflow-hidden">
      <div className="overflow-x-auto public-table-scroll">
        <Table className="table-auto min-w-max">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-20 bg-card whitespace-nowrap min-w-14">
                Rank
              </TableHead>
              <TableHead className="sticky left-14 z-20 bg-card whitespace-nowrap min-w-36 sm:min-w-44">
                Participant
              </TableHead>
              <TableHead className="sticky left-[12.5rem] sm:left-[14.5rem] z-20 bg-card text-center whitespace-nowrap min-w-16">
                Points
              </TableHead>
              {data[0].nextMatches.map((match) => (
                <TableHead
                  key={match.id}
                  className="text-center whitespace-nowrap min-w-24"
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
                <TableCell className="font-medium text-center sticky left-0 z-10 bg-inherit whitespace-nowrap">
                  {entry.rank}
                </TableCell>
                <TableCell className="font-medium sticky left-14 z-10 bg-inherit whitespace-nowrap max-w-36 sm:max-w-44 truncate">
                  {entry.name}
                </TableCell>
                <TableCell className="text-end font-mono font-bold sticky left-[12.5rem] sm:left-[14.5rem] z-10 bg-inherit whitespace-nowrap">
                  {entry.total_points}
                </TableCell>
                {entry.nextPredictions.map((prediction) => (
                  <TableCell
                    key={`${entry.id}+${prediction.matchId}`}
                    className="text-center font-mono text-muted-foreground whitespace-nowrap"
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
