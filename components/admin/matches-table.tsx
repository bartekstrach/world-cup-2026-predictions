"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type MatchStatus = "scheduled" | "live" | "finished";

interface Match {
  id: number;
  matchNumber: number;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus | null;
  homeTeam: { name: string; code: string };
  awayTeam: { name: string; code: string };
}

export function MatchesTable({ matches }: { matches: Match[] }) {
  const [rows, setRows] = useState<Match[]>(matches);
  const [editing, setEditing] = useState<number | null>(null);
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);
  const [status, setStatus] = useState<MatchStatus>("scheduled");
  const [savingMatchId, setSavingMatchId] = useState<number | null>(null);

  async function handleSave(matchId: number) {
    setSavingMatchId(matchId);

    try {
      const response = await fetch("/api/admin/matches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          homeScore,
          awayScore,
          status,
        }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      setRows((currentRows) =>
        currentRows.map((row) =>
          row.id === matchId
            ? {
                ...row,
                homeScore,
                awayScore,
                status,
              }
            : row,
        ),
      );

      toast.success("Match updated!", {
        description:
          status === "finished"
            ? "Points have been recalculated."
            : "Match status and score saved.",
      });
      setEditing(null);
    } catch {
      toast.error("Failed to update match", {
        description: "Please try again.",
      });
    } finally {
      setSavingMatchId(null);
    }
  }

  const getStatusBadge = (status: MatchStatus | null) => {
    if (status === "finished") return <Badge variant="default">Finished</Badge>;
    if (status === "live") return <Badge variant="destructive">Live</Badge>;
    return <Badge variant="secondary">Scheduled</Badge>;
  };

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">#</TableHead>
            <TableHead>Match</TableHead>
            <TableHead className="text-center">Result</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((match) => (
            <TableRow key={match.id}>
              <TableCell className="font-medium">{match.matchNumber}</TableCell>
              <TableCell>
                {match.homeTeam.code} vs {match.awayTeam.code}
              </TableCell>
              <TableCell className="text-center">
                {editing === match.id ? (
                  <div className="flex items-center justify-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={homeScore}
                      onChange={(e) => setHomeScore(Number(e.target.value))}
                      className="w-16 text-center"
                    />
                    <span>:</span>
                    <Input
                      type="number"
                      min="0"
                      value={awayScore}
                      onChange={(e) => setAwayScore(Number(e.target.value))}
                      className="w-16 text-center"
                    />
                  </div>
                ) : (
                  <span className="font-medium">
                    {match.homeScore !== null && match.awayScore !== null
                      ? `${match.homeScore}:${match.awayScore}`
                      : "-"}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {editing === match.id ? (
                  <div className="flex justify-center">
                    <Select
                      value={status}
                      onValueChange={(value) => setStatus(value as MatchStatus)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                        <SelectItem value="finished">Finished</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  getStatusBadge(match.status)
                )}
              </TableCell>
              <TableCell className="text-center">
                {editing === match.id ? (
                  <div className="flex justify-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSave(match.id)}
                      variant="default"
                      disabled={savingMatchId === match.id}
                    >
                      {savingMatchId === match.id ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(null)}
                      disabled={savingMatchId === match.id}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(match.id);
                      setHomeScore(match.homeScore ?? 0);
                      setAwayScore(match.awayScore ?? 0);
                      setStatus(match.status ?? "scheduled");
                    }}
                  >
                    Edit
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
