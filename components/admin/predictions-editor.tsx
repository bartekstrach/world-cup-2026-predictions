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

interface ParticipantOption {
  id: number;
  name: string;
}

interface MatchOption {
  id: number;
  matchNumber: number;
  homeTeamCode: string;
  awayTeamCode: string;
}

interface PredictionRow {
  id: number;
  participantId: number;
  participantName: string;
  matchId: number;
  matchNumber: number;
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

        return a.matchId - b.matchId;
      });
  }, [rows, participantFilter, matchFilter]);

  const editedCount = rows.filter(
    (row) =>
      row.nextHomeScore !== row.homeScore ||
      row.nextAwayScore !== row.awayScore,
  ).length;

  const shownCount = visibleRows.length;

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
      toast.error("No changes", {
        description: "Edit scores before saving.",
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
            throw new Error(data?.error || "Failed to update prediction");
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

      toast.success("Predictions updated", {
        description: `${responses.length} prediction${responses.length > 1 ? "s" : ""} saved successfully.`,
      });
    } catch (error) {
      toast.error("Failed to update predictions", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prediction Editor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="participant-filter">Participant</Label>
            <Select
              value={participantFilter}
              onValueChange={setParticipantFilter}
            >
              <SelectTrigger id="participant-filter">
                <SelectValue placeholder="All participants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All participants</SelectItem>
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

          <div className="space-y-2">
            <Label htmlFor="match-filter">Match</Label>
            <Select value={matchFilter} onValueChange={setMatchFilter}>
              <SelectTrigger id="match-filter">
                <SelectValue placeholder="All matches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All matches</SelectItem>
                {matches.map((match) => (
                  <SelectItem key={match.id} value={match.id.toString()}>
                    #{match.matchNumber} {match.homeTeamCode} vs{" "}
                    {match.awayTeamCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border rounded-lg max-h-[520px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participant</TableHead>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Match</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Points</TableHead>
                <TableHead className="text-right">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    No predictions found for current filters.
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
                      className={isDirty ? "bg-blue-50" : ""}
                    >
                      <TableCell className="font-medium">
                        {row.participantName}
                      </TableCell>
                      <TableCell>#{row.matchNumber}</TableCell>
                      <TableCell>
                        {row.homeTeamCode} vs {row.awayTeamCode}
                      </TableCell>
                      <TableCell>
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
                            className="w-16 text-center"
                          />
                          <span className="text-muted-foreground">:</span>
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
                            className="w-16 text-center"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {row.points}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
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

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {editedCount} edited row{editedCount === 1 ? "" : "s"} •{" "}
            {shownCount} shown prediction{shownCount === 1 ? "" : "s"}
          </p>
          <Button onClick={saveSelected} disabled={saving || editedCount === 0}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
