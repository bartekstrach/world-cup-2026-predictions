import { getCountryName, getCountryFlag } from "@/lib/country-utils";
import type { PredictionsGridData } from "@/lib/types";

interface PredictionsGridProps {
  data: PredictionsGridData;
}

export function PredictionsGrid({ data }: PredictionsGridProps) {
  const { matches, participants, predictions } = data;

  const getPointsClass = (points: number): string => {
    if (points === 3) return "bg-green-100 text-green-800 font-bold";
    if (points === 1) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-600";
  };

  const formatScore = (home: number, away: number): string => `${home}:${away}`;

  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Match
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Result
            </th>
            {participants.map((p) => (
              <th
                key={p.id}
                className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap"
              >
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {matches.map((match) => (
            <tr key={match.id}>
              <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm border-r border-gray-200">
                <div className="font-medium text-gray-900">
                  #{match.matchNumber}
                </div>
                <div className="text-xs text-gray-600">
                  {getCountryFlag(match.homeTeam.code)}{" "}
                  {getCountryName(match.homeTeam.code)} vs{" "}
                  {getCountryName(match.awayTeam.code)}{" "}
                  {getCountryFlag(match.awayTeam.code)}
                </div>
                <div className="text-xs text-gray-500">
                  {match.status === "finished" && "✓ Finished"}
                  {match.status === "live" && "🔴 Live"}
                  {match.status === "scheduled" && "⏱ Scheduled"}
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                {match.homeScore !== null && match.awayScore !== null ? (
                  <span className="font-bold text-gray-900">
                    {formatScore(match.homeScore, match.awayScore)}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              {participants.map((p) => {
                const key = `${match.id}-${p.id}`;
                const pred = predictions[key];

                if (!pred) {
                  return (
                    <td key={p.id} className="px-4 py-3 text-center">
                      <span className="text-gray-400">-</span>
                    </td>
                  );
                }

                return (
                  <td key={p.id} className="px-4 py-3 text-center">
                    <div
                      className={`inline-block px-2 py-1 rounded ${getPointsClass(
                        pred.points
                      )}`}
                    >
                      {formatScore(pred.homeScore, pred.awayScore)}
                      {match.status === "finished" && (
                        <span className="ml-1 text-xs">({pred.points}pt)</span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
