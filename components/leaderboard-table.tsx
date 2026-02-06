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
  const getMedalEmoji = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return null;
  };

  return (
    <Card className="w-fit">
      <Table className="table-auto">
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>Participant</TableHead>
            <TableHead className="text-center">Points</TableHead>
            <TableHead className="text-center">NEXT_GAME prediction</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((entry, index) => (
            <TableRow key={entry.id} className={getBackground(index + 1)}>
              <TableCell className="font-medium text-center">
                {getMedalEmoji(index) || index + 1}
              </TableCell>
              <TableCell className="font-medium">{entry.name}</TableCell>
              <TableCell className="text-end font-mono font-bold">
                {entry.total_points}
              </TableCell>
              <TableCell className="text-center font-mono text-muted-foreground">
                1:2
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
