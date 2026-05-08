import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { predictions } from "@/lib/schema";
import { calculatePoints } from "@/lib/scoring";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { MATCH_STATUSES } from "@/lib/constants";

type UpdatePredictionPayload = {
  homeScore?: unknown;
  awayScore?: unknown;
};

function parsePredictionId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseScore(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return null;
  }

  return value;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idParam } = await params;
  const predictionId = parsePredictionId(idParam);

  if (!predictionId) {
    return NextResponse.json(
      { error: "Invalid prediction id" },
      { status: 400 },
    );
  }

  const payload = (await request.json()) as UpdatePredictionPayload;
  const homeScore = parseScore(payload.homeScore);
  const awayScore = parseScore(payload.awayScore);

  if (homeScore === null || awayScore === null) {
    return NextResponse.json(
      { error: "homeScore and awayScore must be non-negative integers" },
      { status: 400 },
    );
  }

  const existing = await db.query.predictions.findFirst({
    where: (predictions, { eq }) => eq(predictions.id, predictionId),
    with: {
      match: true,
    },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Prediction not found" },
      { status: 404 },
    );
  }

  let points = 0;
  if (
    existing.match.status === MATCH_STATUSES.FINISHED &&
    existing.match.homeScore !== null &&
    existing.match.awayScore !== null
  ) {
    points = calculatePoints(
      homeScore,
      awayScore,
      existing.match.homeScore,
      existing.match.awayScore,
    );
  }

  const [updated] = await db
    .update(predictions)
    .set({
      homeScore,
      awayScore,
      points,
      updatedAt: new Date(),
    })
    .where(eq(predictions.id, predictionId))
    .returning();

  revalidatePath("/");
  revalidatePath("/predictions");
  revalidatePath("/admin/predictions/edit");

  return NextResponse.json({
    success: true,
    prediction: {
      id: updated.id,
      homeScore: updated.homeScore,
      awayScore: updated.awayScore,
      points: updated.points ?? 0,
      updatedAt: updated.updatedAt ? updated.updatedAt.toISOString() : null,
    },
  });
}
