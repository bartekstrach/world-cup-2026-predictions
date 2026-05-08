import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MissingByParticipantItem {
  participantId: number;
  participantName: string;
  missingCount: number;
}

interface MissingByMatchItem {
  matchId: number;
  matchNumber: number;
  homeTeamCode: string;
  awayTeamCode: string;
  missingCount: number;
}

interface MissingPredictionsCardProps {
  totalMissingPredictions: number;
  byParticipant: MissingByParticipantItem[];
  byMatch: MissingByMatchItem[];
}

export function MissingPredictionsCard({
  totalMissingPredictions,
  byParticipant,
  byMatch,
}: MissingPredictionsCardProps) {
  const topParticipants = byParticipant.slice(0, 5);
  const topMatches = byMatch.slice(0, 5);

  return (
    <Card className="rounded-2xl border-slate-100 p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] gap-0">
      <CardHeader className="p-0">
        <CardTitle className="text-lg font-bold text-[#0a192f]">
          Missing Predictions (Scheduled Matches)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-0 mt-4">
        <div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-[#0a192f]">
              {totalMissingPredictions}
            </span>
            <span className="text-sm text-slate-500">
              Participant × scheduled match gaps
            </span>
          </div>
          <p className="sr-only">Participant × scheduled match gaps</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Top by participant
            </h4>
            {topParticipants.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {topParticipants.map((item) => (
                  <li
                    key={item.participantId}
                    className="flex items-center justify-between py-2 border-b border-slate-50"
                  >
                    <span className="truncate font-medium text-slate-700">
                      {item.participantName}
                    </span>
                    <span className="font-mono text-[#0a192f] font-bold">
                      {item.missingCount}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No missing predictions.</p>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Top by match
            </h4>
            {topMatches.length > 0 ? (
              <ul className="space-y-2">
                {topMatches.map((item) => (
                  <li
                    key={item.matchId}
                    className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0"
                  >
                    <span className="truncate text-slate-600 font-mono text-sm">
                      #{item.matchNumber} {item.homeTeamCode} vs{" "}
                      {item.awayTeamCode}
                    </span>
                    <span className="font-mono text-[#10b981] font-bold text-sm">
                      {item.missingCount}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No missing predictions.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
