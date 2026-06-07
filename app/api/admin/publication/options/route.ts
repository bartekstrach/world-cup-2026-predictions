import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUnpublishedPublicationOptions } from "@/lib/predictions";
import { publicationSettings } from "@/lib/schema";
import { PUBLICATION_SETTINGS_SINGLETON_ID } from "@/lib/constants";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeCompetition = await db.query.competitions.findFirst({
    where: (competitions, { eq }) => eq(competitions.isActive, true),
    orderBy: (competitions, { desc }) => [
      desc(competitions.year),
      desc(competitions.id),
    ],
  });

  const settings = await db.query.publicationSettings.findFirst({
    where: eq(publicationSettings.id, PUBLICATION_SETTINGS_SINGLETON_ID),
  });

  if (!activeCompetition) {
    return NextResponse.json({
      competitionId: null,
      allowAllPublishedOverride: settings?.allowAllPublishedOverride ?? false,
      unpublishedStages: [],
      unpublishedMatches: [],
    });
  }

  const options = await getUnpublishedPublicationOptions(activeCompetition.id);

  return NextResponse.json({
    competitionId: activeCompetition.id,
    allowAllPublishedOverride: settings?.allowAllPublishedOverride ?? false,
    unpublishedStages: options.unpublishedStages,
    unpublishedMatches: options.unpublishedMatches,
  });
}
