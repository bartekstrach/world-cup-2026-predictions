import { PredictionsEditor } from "@/components/admin/predictions-editor";
import { db } from "@/lib/db";
import { PencilLine } from "lucide-react";

async function getData() {
  const participants = await db.query.participants.findMany({
    orderBy: (participants, { asc }) => [asc(participants.name)],
  });

  const matches = await db.query.matches.findMany({
    with: {
      homeTeam: true,
      awayTeam: true,
    },
    orderBy: (matches, { asc }) => [asc(matches.matchNumber)],
  });

  const predictionRows = await db.query.predictions.findMany({
    with: {
      participant: true,
      match: {
        with: {
          homeTeam: true,
          awayTeam: true,
        },
      },
    },
    orderBy: (predictions, { asc, desc }) => [
      desc(predictions.updatedAt),
      asc(predictions.id),
    ],
  });

  return {
    participants: participants.map((participant) => ({
      id: participant.id,
      name: participant.name,
    })),
    matches: matches.map((match) => ({
      id: match.id,
      matchNumber: match.matchNumber,
      homeTeamCode: match.homeTeam.code,
      awayTeamCode: match.awayTeam.code,
    })),
    predictions: predictionRows.map((prediction) => ({
      id: prediction.id,
      participantId: prediction.participantId,
      participantName: prediction.participant.name,
      matchId: prediction.matchId,
      matchNumber: prediction.match.matchNumber,
      homeTeamCode: prediction.match.homeTeam.code,
      awayTeamCode: prediction.match.awayTeam.code,
      homeScore: prediction.homeScore,
      awayScore: prediction.awayScore,
      points: prediction.points ?? 0,
      updatedAt: prediction.updatedAt
        ? prediction.updatedAt.toISOString()
        : null,
    })),
  };
}

export default async function EditPredictionsPage() {
  const { participants, matches, predictions } = await getData();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <PencilLine className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            Edit Predictions
          </h2>
          <p className="text-muted-foreground mt-1">
            Filter by participant or match, update scores, and save selected
            changes
          </p>
        </div>
      </div>

      <PredictionsEditor
        participants={participants}
        matches={matches}
        predictions={predictions}
      />
    </div>
  );
}
