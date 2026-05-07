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
    <Card className="w-full max-w-full overflow-hidden">
      <div className="overflow-x-auto public-table-scroll">
        <Table className="w-full min-w-max table-auto">
          <TableHeader>
            <TableRow>
              {/* Group/stage */}
              <TableHead className="hidden sm:table-cell whitespace-nowrap min-w-12">
                Gr.
              </TableHead>

              {/* Date */}
              <TableHead className="whitespace-nowrap min-w-28">Date</TableHead>

              {/* Match + result */}
              <TableHead className="sticky left-0 z-20 bg-background whitespace-nowrap min-w-48 sm:min-w-64">
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
                <TableCell className="hidden sm:table-cell text-center text-muted-foreground whitespace-nowrap">
                  {match.stage === "group" ? match.homeTeam.group : match.stage}
                </TableCell>

                {/* Date */}
                <TableCell className="text-muted-foreground whitespace-nowrap text-xs sm:text-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2">
                    <span>{getShortWeekday({ date: match.matchDate })}</span>
                    <time>{formatDateTime({ date: match.matchDate })}</time>
                  </div>
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
                      <TableCell
                        key={p.id}
                        className="text-center whitespace-nowrap"
                      >
                        <span className="text-muted-foreground">-</span>
                      </TableCell>
                    );
                  }

                  return (
                    <TableCell
                      key={p.id}
                      className="text-center whitespace-nowrap"
                    >
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
