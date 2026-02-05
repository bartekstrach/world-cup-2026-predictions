import { getLeaderboard } from "@/lib/scoring";
import { LeaderboardTable } from "@/components/leaderboard-table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, CheckCircle, XCircle } from "lucide-react";

export const revalidate = 60;

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Leaderboard
          </h2>
          <p className="text-muted-foreground mt-1">Competition standings</p>
        </div>
        <Button asChild>
          <Link href="/predictions">View All Predictions</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scoring Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-green-600" />
            <strong>Exact score:</strong> 3 points
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-yellow-600" />
            <strong>Correct winner/draw:</strong> 1 point
          </div>
          <div className="flex items-center gap-2 text-sm">
            <XCircle className="h-4 w-4 text-slate-400" />
            <strong>Wrong prediction:</strong> 0 points
          </div>
        </CardContent>
      </Card>

      <LeaderboardTable data={leaderboard} />
    </div>
  );
}
