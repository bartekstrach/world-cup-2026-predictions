"use client";

import { useState } from "react";

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
  const [participantId, setParticipantId] = useState<number>(
    participants[0]?.id || 0
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

    const response = await fetch("/api/admin/predictions/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId,
        predictions: predictionsList,
      }),
    });

    if (response.ok) {
      alert("Predictions saved!");
      setPredictions({});
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Participant
        </label>
        <select
          value={participantId}
          onChange={(e) => setParticipantId(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          {participants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {matches.map((match) => (
          <div
            key={match.id}
            className="flex items-center gap-4 p-2 border rounded"
          >
            <span className="text-sm font-medium w-12">
              #{match.matchNumber}
            </span>
            <span className="text-sm w-32">
              {match.homeTeam.code} vs {match.awayTeam.code}
            </span>
            <input
              type="number"
              min="0"
              placeholder="0"
              className="w-16 px-2 py-1 border rounded text-center"
              onChange={(e) =>
                handleScoreChange(match.id, "home", e.target.value)
              }
            />
            <span>:</span>
            <input
              type="number"
              min="0"
              placeholder="0"
              className="w-16 px-2 py-1 border rounded text-center"
              onChange={(e) =>
                handleScoreChange(match.id, "away", e.target.value)
              }
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Save All Predictions
      </button>
    </div>
  );
}
