import type { LeaderboardEntry } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface LeaderboardTableProps {
  data: LeaderboardEntry[];
}

export function LeaderboardTable({ data }: LeaderboardTableProps) {
  const getMedalEmoji = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return null;
  };

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Rank</TableHead>
            <TableHead>Participant</TableHead>
            <TableHead className="text-center">Points</TableHead>
            <TableHead className="text-center">Exact</TableHead>
            <TableHead className="text-center">Correct</TableHead>
            <TableHead className="text-center">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((entry, index) => (
            <TableRow
              key={entry.id}
              className={index < 3 ? "bg-yellow-50/50" : ""}
            >
              <TableCell className="font-medium">
                {getMedalEmoji(index) || index + 1}
              </TableCell>
              <TableCell className="font-medium">{entry.name}</TableCell>
              <TableCell className="text-center">
                <Badge variant="default" className="font-bold">
                  {entry.total_points}
                </Badge>
              </TableCell>
              <TableCell className="text-center text-muted-foreground">
                {entry.exact_scores}
              </TableCell>
              <TableCell className="text-center text-muted-foreground">
                {entry.correct_outcomes}
              </TableCell>
              <TableCell className="text-center text-muted-foreground">
                {entry.predictions_count}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
