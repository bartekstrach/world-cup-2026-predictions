"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { getMatchTeamNames } from "@/lib/teams";
import { withMatchMedal } from "@/components/tournament-medal-ui";

interface ParticipantOption {
  id: number;
  name: string;
}

interface MatchOption {
  id: number;
  matchNumber: number;
  matchDate: string;
  homeTeamCode: string;
  awayTeamCode: string;
}

interface PredictionRow {
  id: number;
  participantId: number;
  participantName: string;
  matchId: number;
  matchNumber: number;
  matchDate: string;
  homeTeamCode: string;
  awayTeamCode: string;
  homeScore: number;
  awayScore: number;
  points: number;
  updatedAt: string | null;
}

interface EditablePrediction extends PredictionRow {
  nextHomeScore: number;
  nextAwayScore: number;
}

export function PredictionsEditor({
  participants,
  matches,
  predictions,
}: {
  participants: ParticipantOption[];
  matches: MatchOption[];
  predictions: PredictionRow[];
}) {
  const { t } = useTranslation();
  const [participantFilter, setParticipantFilter] = useState<string>("all");
  const [matchFilter, setMatchFilter] = useState<string>("all");
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<EditablePrediction[]>(
    predictions.map((prediction) => ({
      ...prediction,
      nextHomeScore: prediction.homeScore,
      nextAwayScore: prediction.awayScore,
    })),
  );

  const visibleRows = useMemo(() => {
    return rows
      .filter((row) => {
        const byParticipant =
          participantFilter === "all" ||
          row.participantId.toString() === participantFilter;
        const byMatch =
          matchFilter === "all" || row.matchId.toString() === matchFilter;
        return byParticipant && byMatch;
      })
      .sort((a, b) => {
        if (a.participantId !== b.participantId) {
          return a.participantId - b.participantId;
        }

        const byDate =
          new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime();
        if (byDate !== 0) return byDate;

        return a.matchNumber - b.matchNumber;
      });
  }, [rows, participantFilter, matchFilter]);

  const editedCount = rows.filter(
    (row) =>
      row.nextHomeScore !== row.homeScore ||
      row.nextAwayScore !== row.awayScore,
  ).length;

  const shownCount = visibleRows.length;

  function formatMatchLabel(
    homeTeamCode: string,
    awayTeamCode: string,
    matchNumber?: number,
  ) {
    return withMatchMedal(
      getMatchTeamNames({
        displayFlags: true,
        homeTeamCode,
        awayTeamCode,
      }),
      { matchNumber, homeTeamCode, awayTeamCode },
    );
  }

  function updateScore(
    id: number,
    field: "nextHomeScore" | "nextAwayScore",
    value: string,
  ) {
    const parsed = Number.parseInt(value, 10);
    const score = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;

    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: score,
            }
          : row,
      ),
    );
  }

  async function saveSelected() {
    const updates = rows.filter(
      (row) =>
        row.nextHomeScore !== row.homeScore ||
        row.nextAwayScore !== row.awayScore,
    );

    if (updates.length === 0) {
      toast.error(t("predictionsEditor.noChanges"), {
        description: t("predictionsEditor.editBeforeSaving"),
      });
      return;
    }

    setSaving(true);

    try {
      const responses = await Promise.all(
        updates.map(async (row) => {
          const response = await fetch(`/api/admin/predictions/${row.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              homeScore: row.nextHomeScore,
              awayScore: row.nextAwayScore,
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(
              data?.error || t("predictionsEditor.failedSingleFallback"),
            );
          }

          return data.prediction as {
            id: number;
            homeScore: number;
            awayScore: number;
            points: number;
            updatedAt: string | null;
          };
        }),
      );

      const responseById = new Map(responses.map((item) => [item.id, item]));

      setRows((currentRows) =>
        currentRows.map((row) => {
          const updated = responseById.get(row.id);
          if (!updated) return row;

          return {
            ...row,
            homeScore: updated.homeScore,
            awayScore: updated.awayScore,
            points: updated.points,
            updatedAt: updated.updatedAt,
            nextHomeScore: updated.homeScore,
            nextAwayScore: updated.awayScore,
          };
        }),
      );

      toast.success(t("predictionsEditor.updated"), {
        description: t("predictionsEditor.updatedDescription", {
          count: responses.length,
          suffix: responses.length > 1 ? "s" : "",
        }),
      });
    } catch (error) {
      toast.error(t("predictionsEditor.failed"), {
        description:
          error instanceof Error
            ? error.message
            : t("predictionsEditor.tryAgain"),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="rounded-2xl border-slate-100 p-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] h-[700px] flex flex-col">
      <CardHeader className="p-6 border-b border-slate-100">
        <CardTitle className="text-lg font-bold text-[#0a192f]">
          {t("predictionsEditor.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex flex-col flex-1">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-6">
            <div className="space-y-1.5 w-64">
              <Label
                htmlFor="participant-filter"
                className="text-sm font-medium text-slate-600"
              >
                {t("predictionsEditor.participant")}
              </Label>
              <Select
                value={participantFilter}
                onValueChange={setParticipantFilter}
              >
                <SelectTrigger
                  id="participant-filter"
                  className="border-slate-200 rounded-lg shadow-sm py-2 px-3 focus:ring-[#10b981] focus:border-[#10b981] bg-white text-slate-700"
                >
                  <SelectValue
                    placeholder={t("predictionsEditor.allParticipants")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("predictionsEditor.allParticipants")}
                  </SelectItem>
                  {participants.map((participant) => (
                    <SelectItem
                      key={participant.id}
                      value={participant.id.toString()}
                    >
                      {participant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 w-64">
              <Label
                htmlFor="match-filter"
                className="text-sm font-medium text-slate-600"
              >
                {t("predictionsEditor.match")}
              </Label>
              <Select value={matchFilter} onValueChange={setMatchFilter}>
                <SelectTrigger
                  id="match-filter"
                  className="border-slate-200 rounded-lg shadow-sm py-2 px-3 focus:ring-[#10b981] focus:border-[#10b981] bg-white text-slate-700"
                >
                  <SelectValue
                    placeholder={t("predictionsEditor.allMatches")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("predictionsEditor.allMatches")}
                  </SelectItem>
                  {matches.map((match) => (
                    <SelectItem key={match.id} value={match.id.toString()}>
                      #{match.matchNumber}{" "}
                      {formatMatchLabel(
                        match.homeTeamCode,
                        match.awayTeamCode,
                        match.matchNumber,
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <Table className="min-w-[800px]">
            <TableHeader className="sticky top-0 bg-white/90 backdrop-blur-sm z-10">
              <TableRow className="bg-slate-50/90 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <TableHead className="p-4 h-auto">
                  {t("predictionsEditor.headers.participant")}
                </TableHead>
                <TableHead className="w-16 p-4 h-auto">
                  {t("predictionsEditor.headers.matchNumber")}
                </TableHead>
                <TableHead className="p-4 h-auto">
                  {t("predictionsEditor.headers.match")}
                </TableHead>
                <TableHead className="text-center p-4 h-auto">
                  {t("predictionsEditor.headers.score")}
                </TableHead>
                <TableHead className="text-center p-4 h-auto">
                  {t("predictionsEditor.headers.points")}
                </TableHead>
                <TableHead className="text-right p-4 h-auto">
                  {t("predictionsEditor.headers.updated")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-slate-500 py-8"
                  >
                    {t("predictionsEditor.noneFound")}
                  </TableCell>
                </TableRow>
              ) : (
                visibleRows.map((row) => {
                  const isDirty =
                    row.nextHomeScore !== row.homeScore ||
                    row.nextAwayScore !== row.awayScore;

                  return (
                    <TableRow
                      key={row.id}
                      className={
                        isDirty
                          ? "bg-[#10b981]/5 hover:bg-[#10b981]/10"
                          : "hover:bg-slate-50"
                      }
                    >
                      <TableCell className="p-4 font-medium text-[#0a192f]">
                        {row.participantName}
                      </TableCell>
                      <TableCell className="p-4 font-mono text-slate-400">
                        #{row.matchNumber}
                      </TableCell>
                      <TableCell className="p-4 font-medium text-slate-700">
                        {formatMatchLabel(
                          row.homeTeamCode,
                          row.awayTeamCode,
                          row.matchNumber,
                        )}
                      </TableCell>
                      <TableCell className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            value={row.nextHomeScore}
                            onChange={(e) =>
                              updateScore(
                                row.id,
                                "nextHomeScore",
                                e.target.value,
                              )
                            }
                            className="w-12 h-8 text-center font-mono font-bold border-slate-200 rounded-md shadow-sm focus-visible:border-[#10b981] focus-visible:ring-1 focus-visible:ring-[#10b981]"
                          />
                          <span className="text-slate-300 font-bold">:</span>
                          <Input
                            type="number"
                            min="0"
                            value={row.nextAwayScore}
                            onChange={(e) =>
                              updateScore(
                                row.id,
                                "nextAwayScore",
                                e.target.value,
                              )
                            }
                            className="w-12 h-8 text-center font-mono font-bold border-slate-200 rounded-md shadow-sm focus-visible:border-[#10b981] focus-visible:ring-1 focus-visible:ring-[#10b981]"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="p-4 text-center font-mono font-bold text-slate-600">
                        {row.points}
                      </TableCell>
                      <TableCell className="p-4 text-right font-mono text-xs text-slate-400">
                        {row.updatedAt
                          ? new Date(row.updatedAt).toLocaleString()
                          : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 rounded-b-2xl">
          <p className="text-sm text-slate-500 font-medium">
            {t("predictionsEditor.editedRows", {
              count: editedCount,
              suffix: editedCount === 1 ? "" : "s",
            })}{" "}
            •{" "}
            {t("predictionsEditor.shownPredictions", {
              count: shownCount,
              suffix: shownCount === 1 ? "" : "s",
            })}
          </p>
          <Button
            onClick={saveSelected}
            disabled={saving || editedCount === 0}
            className="bg-slate-400 text-white px-6 py-2 rounded-xl text-sm font-medium disabled:opacity-100"
          >
            {saving
              ? t("predictionsEditor.saving")
              : t("predictionsEditor.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
