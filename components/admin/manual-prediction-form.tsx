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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const [participantId, setParticipantId] = useState<string>(
    participants[0]?.id.toString() || "",
  );
  const [predictions, setPredictions] = useState<
    Record<number, { home: number; away: number }>
  >({});

  function handleScoreChange(
    matchId: number,
    type: "home" | "away",
    value: string,
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
      }),
    );

    if (predictionsList.length === 0) {
      toast.error(t("manualPredictionForm.noPredictions"), {
        description: t("manualPredictionForm.addAtLeastOne"),
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
      toast.success(t("manualPredictionForm.saved"), {
        description: t("manualPredictionForm.savedDescription", {
          count: predictionsList.length,
        }),
      });
      setPredictions({});
    } else {
      toast.error(t("manualPredictionForm.failed"), {
        description: t("manualPredictionForm.tryAgainLater"),
      });
    }
  }

  const filledCount = Object.keys(predictions).length;

  return (
    <Card className="rounded-2xl border-slate-100 p-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] h-[600px] flex flex-col">
      <CardHeader className="p-6 border-b border-slate-100">
        <CardTitle className="text-lg font-bold text-[#0a192f]">
          {t("manualPredictionForm.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="space-y-1.5 max-w-xs">
            <Label
              htmlFor="participant"
              className="text-sm font-medium text-slate-600"
            >
              {t("manualPredictionForm.participant")}
            </Label>
            <Select value={participantId} onValueChange={setParticipantId}>
              <SelectTrigger
                id="participant"
                className="border-slate-200 rounded-lg shadow-sm py-2.5 px-3 focus:ring-[#10b981] focus:border-[#10b981] bg-white text-slate-800 font-medium"
              >
                <SelectValue
                  placeholder={t("manualPredictionForm.selectParticipant")}
                />
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
        </div>

        <div className="p-6 flex-1 overflow-y-auto bg-slate-50/50">
          <div className="space-y-3 max-w-3xl">
            {matches.map((match) => (
              <div
                key={match.id}
                className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-6 shadow-sm"
              >
                <span className="w-8 font-mono text-slate-400 font-medium">
                  #{match.matchNumber}
                </span>
                <span className="w-32 font-medium text-slate-700">
                  {match.homeTeam.code} {t("common.vs")} {match.awayTeam.code}
                </span>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="0"
                    max="9"
                    placeholder="0"
                    className="w-16 h-10 text-center font-mono font-bold text-lg border-slate-200 rounded-lg shadow-sm focus-visible:border-[#10b981] focus-visible:ring-2 focus-visible:ring-[#10b981]/30"
                    onChange={(e) =>
                      handleScoreChange(match.id, "home", e.target.value)
                    }
                  />
                  <span className="text-slate-300 font-bold">:</span>
                  <Input
                    type="number"
                    min="0"
                    max="9"
                    placeholder="0"
                    className="w-16 h-10 text-center font-mono font-bold text-lg border-slate-200 rounded-lg shadow-sm focus-visible:border-[#10b981] focus-visible:ring-2 focus-visible:ring-[#10b981]/30"
                    onChange={(e) =>
                      handleScoreChange(match.id, "away", e.target.value)
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-white rounded-b-2xl">
          <p className="text-sm text-slate-500 font-medium">
            {t("manualPredictionForm.entered", { count: filledCount })}
          </p>
          <Button
            onClick={handleSubmit}
            disabled={filledCount === 0}
            className="bg-slate-400 text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-100"
          >
            {t("manualPredictionForm.saveAll")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
