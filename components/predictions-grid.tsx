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
import { Card } from "@/components/ui/card";
import { Radio } from "lucide-react";
import { calculatePoints } from "@/lib/scoring";

interface PredictionsGridProps {
  data: PredictionsGridData;
}

export function PredictionsGrid({ data }: PredictionsGridProps) {
  const { matches, participants, predictions } = data;

  const getPointsBadge = (points: number) => {
    if (points === 3) return "";
    if (points === 1) return "";
    return "";
  };

  const formatScore = (home: number, away: number): string => `${home}:${away}`;

  const formatDate = (date: Date, locale = "pl-PL") => {
    const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" })
      .format(date)
      .toLowerCase()
      .replace(".", "")
      .slice(0, 2);

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return (
      <div className="flex justify-between">
        <span>{weekday}</span>
        <time>{`${day}.${month} ${hours}:${minutes}`}</time>
      </div>
    );
  };

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
                <TableCell className="text-muted-foreground">
                  {formatDate(match.matchDate)}
                </TableCell>

                {/* Match + result */}
                <TableCell className="sticky left-0 z-10 bg-background">
                  <div className="gap-4 flex justify-between items-center">
                    <>
                      <div className="block md:hidden">
                        {getCountryFlag(match.homeTeam.code)}{" "}
                        {match.homeTeam.code}
                        {" - "}
                        {match.awayTeam.code}{" "}
                        {getCountryFlag(match.awayTeam.code)}
                      </div>
                      <div className="hidden md:block">
                        {getCountryFlag(match.homeTeam.code)}{" "}
                        {getCountryName(match.homeTeam.code)}
                        {" - "}
                        {getCountryName(match.awayTeam.code)}{" "}
                        {getCountryFlag(match.awayTeam.code)}
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
                          {formatScore(match.homeScore, match.awayScore)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-mono">
                          -:-
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
                    <TableCell
                      key={p.id}
                      className={`text-center ${getPointsBadge(pred.points)}`}
                    >
                      <span className="font-mono text-sm">
                        {formatScore(pred.homeScore, pred.awayScore)}
                        <span className="text-muted-foreground">{` | ${
                          match.status === "finished"
                            ? pred.points
                            : match.status === "live"
                            ? calculatePoints(
                                pred.homeScore,
                                pred.awayScore,
                                match.homeScore ?? 0,
                                match.awayScore ?? 0
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
