"use client";

import { useState } from "react";

interface Match {
  id: number;
  matchNumber: number;
  homeScore: number | null;
  awayScore: number | null;
  status: string | null;
  homeTeam: { name: string; code: string };
  awayTeam: { name: string; code: string };
}

export function MatchesTable({ matches }: { matches: Match[] }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);

  async function handleSave(matchId: number) {
    const response = await fetch("/api/admin/matches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchId,
        homeScore,
        awayScore,
        status: "finished",
      }),
    });

    if (response.ok) {
      setEditing(null);
      window.location.reload();
    }
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              #
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Match
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Result
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {matches.map((match) => (
            <tr key={match.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {match.matchNumber}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {match.homeTeam.code} vs {match.awayTeam.code}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                {editing === match.id ? (
                  <div className="flex items-center justify-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={homeScore}
                      onChange={(e) => setHomeScore(Number(e.target.value))}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                    />
                    <span>:</span>
                    <input
                      type="number"
                      min="0"
                      value={awayScore}
                      onChange={(e) => setAwayScore(Number(e.target.value))}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                    />
                  </div>
                ) : (
                  <span className="font-medium">
                    {match.homeScore !== null && match.awayScore !== null
                      ? `${match.homeScore}:${match.awayScore}`
                      : "-"}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    match.status === "finished"
                      ? "bg-green-100 text-green-800"
                      : match.status === "live"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {match.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                {editing === match.id ? (
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => handleSave(match.id)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditing(match.id);
                      setHomeScore(match.homeScore ?? 0);
                      setAwayScore(match.awayScore ?? 0);
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Edit
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
