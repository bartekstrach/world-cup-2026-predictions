import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { PredictionsGrid } from "@/components/predictions-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import type { PredictionsGridData, Prediction } from "@/lib/types";

export const revalidate = 60;

async function getPredictionsData(): Promise<PredictionsGridData> {
  const matches = await db.query.matches.findMany({
    with: {
      homeTeam: true,
      awayTeam: true,
    },
    orderBy: (matches, { asc }) => [asc(matches.matchNumber)],
  });

  const participants = await db.query.participants.findMany({
    orderBy: (participants, { asc }) => [asc(participants.name)],
  });

  const allPredictions = await db.query.predictions.findMany();

  const predictions: Record<string, Prediction> = {};
  allPredictions.forEach((pred) => {
    const key = `${pred.matchId}-${pred.participantId}`;
    predictions[key] = {
      participantId: pred.participantId,
      matchId: pred.matchId,
      homeScore: pred.homeScore,
      awayScore: pred.awayScore,
      points: pred.points || 0,
    };
  });

  return { matches, participants, predictions };
}

export default async function PredictionsPage() {
  const data = await getPredictionsData();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <FileSpreadsheet className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-3xl font-bold text-slate-900">All Predictions</h2>
          <p className="text-muted-foreground mt-1">
            {data.matches.length} matches × {data.participants.length}{" "}
            participants
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Leaderboard
          </Link>
        </Button>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <strong>Legend:</strong>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-600">3pt</Badge>
              <span className="text-muted-foreground">Exact score</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">1pt</Badge>
              <span className="text-muted-foreground">Correct outcome</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">0pt</Badge>
              <span className="text-muted-foreground">Wrong prediction</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <PredictionsGrid data={data} />
    </div>
  );
}
