import { Radio } from "lucide-react";
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
import { calculatePoints, formatScore } from "@/lib/scoring";
import { getMatchTeamNames, getShortMatchTeamNames } from "@/lib/teams";
import type { PredictionsGridData } from "@/lib/types";
import { NO_RESULT } from "@/lib/constants";

interface PredictionsGridProps {
  data: PredictionsGridData;
}

export function PredictionsGrid({ data }: PredictionsGridProps) {
  const { matches, participants, predictions } = data;

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              {/* Group/stage */}
              <TableHead>Gr.</TableHead>

              {/* Date */}
              <TableHead>Date</TableHead>

              {/* Match + result */}
              <TableHead className="sticky left-0 z-10 bg-background">
                <div className="flex justify-between items-center">
                  <span>Match</span>
                  <span>Result</span>
                </div>
              </TableHead>

              {/* Participants */}
              {participants.map((p) => (
                <TableHead
                  key={p.id}
                  className="text-center whitespace-nowrap min-w-24"
                >
                  {p.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matches.map((match) => (
              <TableRow key={match.id}>
                {/* Group/stage */}
                <TableCell className="text-center text-muted-foreground">
                  {match.stage === "group" ? match.homeTeam.group : match.stage}
                </TableCell>

                {/* Date */}
                <TableCell className="text-muted-foreground flex justify-between">
                  <span>{getShortWeekday({ date: match.matchDate })}</span>
                  <time>{formatDateTime({ date: match.matchDate })}</time>
                </TableCell>

                {/* Match + result */}
                <TableCell className="sticky left-0 z-10 bg-background">
                  <div className="gap-4 flex justify-between items-center">
                    <>
                      <div className="block md:hidden">
                        {getShortMatchTeamNames({
                          displayFlags: true,
                          homeTeamCode: match.homeTeam.code,
                          awayTeamCode: match.awayTeam.code,
                        })}
                      </div>
                      <div className="hidden md:block">
                        {getMatchTeamNames({
                          displayFlags: true,
                          homeTeamCode: match.homeTeam.code,
                          awayTeamCode: match.awayTeam.code,
                        })}
                      </div>
                    </>
                    <div className="flex items-center gap-3">
                      {match.status === "live" && (
                        <Radio className="h-4 w-4 text-red-700 animate-ping hidden md:block" />
                      )}
                      {match.homeScore !== null && match.awayScore !== null ? (
                        <span
                          className={`font-bold font-mono ${
                            match.status === "live" && "text-red-700"
                          }`}
                        >
                          {formatScore({
                            homeScore: match.homeScore,
                            awayScore: match.awayScore,
                          })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-mono">
                          {NO_RESULT}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Participants */}
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
                      <span className="font-mono">
                        {formatScore({
                          homeScore: pred.homeScore,
                          awayScore: pred.awayScore,
                        })}
                        <span className="text-muted-foreground">{` | ${
                          match.status === "finished"
                            ? pred.points
                            : match.status === "live"
                              ? calculatePoints(
                                  pred.homeScore,
                                  pred.awayScore,
                                  match.homeScore ?? 0,
                                  match.awayScore ?? 0,
                                )
                              : "-"
                        }`}</span>
                      </span>
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
