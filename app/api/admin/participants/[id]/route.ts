import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { participants } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type UpdateParticipantPayload = {
  name?: unknown;
  email?: unknown;
};

function parseParticipantId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeName(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidEmail(email: string | null) {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
  const participantId = parseParticipantId(idParam);

  if (!participantId) {
    return NextResponse.json(
      { error: "Invalid participant id" },
      { status: 400 },
    );
  }

  const payload = (await request.json()) as UpdateParticipantPayload;
  const name = normalizeName(payload.name);
  const email = normalizeEmail(payload.email);

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Email format is invalid" },
      { status: 400 },
    );
  }

  const existing = await db.query.participants.findFirst({
    where: (participants, { eq }) => eq(participants.id, participantId),
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Participant not found" },
      { status: 404 },
    );
  }

  const duplicate = await db.query.participants.findFirst({
    where: (participants, { and, eq, ne }) =>
      and(eq(participants.name, name), ne(participants.id, participantId)),
  });

  if (duplicate) {
    return NextResponse.json(
      { error: "Participant with this name already exists" },
      { status: 409 },
    );
  }

  const [updated] = await db
    .update(participants)
    .set({ name, email })
    .where(eq(participants.id, participantId))
    .returning();

  revalidatePath("/admin/participants");
  revalidatePath("/admin/predictions/manual");

  return NextResponse.json({ participant: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idParam } = await params;
  const participantId = parseParticipantId(idParam);

  if (!participantId) {
    return NextResponse.json(
      { error: "Invalid participant id" },
      { status: 400 },
    );
  }

  const existing = await db.query.participants.findFirst({
    where: (participants, { eq }) => eq(participants.id, participantId),
    with: {
      predictions: true,
      predictionSubmissions: true,
    },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Participant not found" },
      { status: 404 },
    );
  }

  if (
    existing.predictions.length > 0 ||
    existing.predictionSubmissions.length > 0
  ) {
    return NextResponse.json(
      {
        error:
          "Cannot delete participant with existing predictions or uploaded sheets.",
      },
      { status: 409 },
    );
  }

  await db.delete(participants).where(eq(participants.id, participantId));

  revalidatePath("/admin/participants");
  revalidatePath("/admin/predictions/manual");

  return NextResponse.json({ success: true });
}
