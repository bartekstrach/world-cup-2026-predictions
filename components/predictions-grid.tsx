import { getCountryName, getCountryFlag } from "@/lib/country-utils";
import type { PredictionsGridData } from "@/lib/types";
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

interface PredictionsGridProps {
  data: PredictionsGridData;
}

export function PredictionsGrid({ data }: PredictionsGridProps) {
  const { matches, participants, predictions } = data;

  const getPointsBadge = (points: number) => {
    if (points === 3) return <Badge className="bg-green-600">3pt</Badge>;
    if (points === 1) return <Badge variant="secondary">1pt</Badge>;
    return <Badge variant="outline">0pt</Badge>;
  };

  const formatScore = (home: number, away: number): string => `${home}:${away}`;

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-background">
                Match
              </TableHead>
              <TableHead className="text-center">Result</TableHead>
              {participants.map((p) => (
                <TableHead key={p.id} className="text-center whitespace-nowrap">
                  {p.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matches.map((match) => (
              <TableRow key={match.id}>
                <TableCell className="sticky left-0 z-10 bg-background border-r">
                  <div className="space-y-1">
                    <div className="font-medium">#{match.matchNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      {getCountryFlag(match.homeTeam.code)}{" "}
                      {getCountryName(match.homeTeam.code)}
                      {" vs "}
                      {getCountryName(match.awayTeam.code)}{" "}
                      {getCountryFlag(match.awayTeam.code)}
                    </div>
                    <div className="text-xs">
                      {match.status === "finished" && (
                        <Badge variant="outline" className="text-green-600">
                          Finished
                        </Badge>
                      )}
                      {match.status === "live" && (
                        <Badge variant="destructive">Live</Badge>
                      )}
                      {match.status === "scheduled" && (
                        <Badge variant="secondary">Scheduled</Badge>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {match.homeScore !== null && match.awayScore !== null ? (
                    <span className="font-bold">
                      {formatScore(match.homeScore, match.awayScore)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                {participants.map((p) => {
                  const key = `${match.id}-${p.id}`;
                  const pred = predictions[key];

                  if (!pred) {
                    return (
                      <TableCell key={p.id} className="text-center">
                        <span className="text-muted-foreground">-</span>
                      </TableCell>
                    );
                  }

                  return (
                    <TableCell key={p.id} className="text-center">
                      <div className="space-y-1">
                        <div className="font-mono text-sm">
                          {formatScore(pred.homeScore, pred.awayScore)}
                        </div>
                        {match.status === "finished" &&
                          getPointsBadge(pred.points)}
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
