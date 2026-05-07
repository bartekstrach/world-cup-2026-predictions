import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { participants } from "@/lib/schema";
import { revalidatePath } from "next/cache";

type CreateParticipantPayload = {
  name?: unknown;
  email?: unknown;
};

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

export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db.query.participants.findMany({
    orderBy: (participants, { asc }) => [asc(participants.name)],
  });

  return NextResponse.json({ participants: rows });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as CreateParticipantPayload;
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
    where: (participants, { eq }) => eq(participants.name, name),
  });

  if (existing) {
    return NextResponse.json(
      { error: "Participant with this name already exists" },
      { status: 409 },
    );
  }

  const [created] = await db
    .insert(participants)
    .values({ name, email })
    .returning();

  revalidatePath("/admin/participants");
  revalidatePath("/admin/predictions/manual");

  return NextResponse.json({ participant: created }, { status: 201 });
}
