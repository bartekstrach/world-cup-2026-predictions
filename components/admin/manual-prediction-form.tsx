"use client";

import { useState } from "react";
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
import { toast } from "sonner";

interface Participant {
  id: number;
  name: string;
}

interface Match {
  id: number;
  matchNumber: number;
  homeTeam: { code: string };
  awayTeam: { code: string };
}

export function ManualPredictionForm({
  participants,
  matches,
}: {
  participants: Participant[];
  matches: Match[];
}) {
  const [participantId, setParticipantId] = useState<string>(
    participants[0]?.id.toString() || ""
  );
  const [predictions, setPredictions] = useState<
    Record<number, { home: number; away: number }>
  >({});

  function handleScoreChange(
    matchId: number,
    type: "home" | "away",
    value: string
  ) {
    const score = parseInt(value) || 0;
    setPredictions((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [type]: score,
      },
    }));
  }

  async function handleSubmit() {
    const predictionsList = Object.entries(predictions).map(
      ([matchId, scores]) => ({
        matchId: parseInt(matchId),
        homeScore: scores.home || 0,
        awayScore: scores.away || 0,
      })
    );

    if (predictionsList.length === 0) {
      toast.error("No predictions", {
        description: "Please add at least one prediction",
      });
      return;
    }

    const response = await fetch("/api/admin/predictions/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId: parseInt(participantId),
        predictions: predictionsList,
      }),
    });

    if (response.ok) {
      toast.success("Predictions saved!", {
        description: `${predictionsList.length} predictions have been saved successfully.`,
      });
      setPredictions({});
    } else {
      toast.error("Failed to save predictions", {
        description: "Please try again later.",
      });
    }
  }

  const filledCount = Object.keys(predictions).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Prediction Entry</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="participant">Participant</Label>
          <Select value={participantId} onValueChange={setParticipantId}>
            <SelectTrigger id="participant">
              <SelectValue placeholder="Select participant" />
            </SelectTrigger>
            <SelectContent>
              {participants.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4">
          {matches.map((match) => (
            <div
              key={match.id}
              className="flex items-center gap-4 p-2 border rounded-lg hover:bg-muted/50 transition"
            >
              <span className="text-sm font-medium w-12">
                #{match.matchNumber}
              </span>
              <span className="text-sm w-32 text-muted-foreground">
                {match.homeTeam.code} vs {match.awayTeam.code}
              </span>
              <Input
                type="number"
                min="0"
                max="9"
                placeholder="0"
                className="w-16 text-center"
                onChange={(e) =>
                  handleScoreChange(match.id, "home", e.target.value)
                }
              />
              <span className="text-muted-foreground">:</span>
              <Input
                type="number"
                min="0"
                max="9"
                placeholder="0"
                className="w-16 text-center"
                onChange={(e) =>
                  handleScoreChange(match.id, "away", e.target.value)
                }
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filledCount} predictions entered
          </p>
          <Button onClick={handleSubmit} disabled={filledCount === 0}>
            Save All Predictions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
