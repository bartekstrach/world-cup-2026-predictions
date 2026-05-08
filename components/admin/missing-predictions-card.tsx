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
    <Card>
      <CardHeader>
        <CardTitle>Missing Predictions (Scheduled Matches)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1">
          <div className="text-2xl font-bold">{totalMissingPredictions}</div>
          <p className="text-xs text-muted-foreground">
            Participant × scheduled match gaps
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Top by participant</h4>
            {topParticipants.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {topParticipants.map((item) => (
                  <li
                    key={item.participantId}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{item.participantName}</span>
                    <span className="font-mono text-muted-foreground">
                      {item.missingCount}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No missing predictions.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Top by match</h4>
            {topMatches.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {topMatches.map((item) => (
                  <li
                    key={item.matchId}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate">
                      #{item.matchNumber} {item.homeTeamCode} vs{" "}
                      {item.awayTeamCode}
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {item.missingCount}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No missing predictions.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
