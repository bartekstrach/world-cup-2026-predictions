"use server";

import { db } from "@/lib/db";
import { systemSettings } from "@/lib/schema";
import {
  ACTIVE_AI_MODEL_KEY,
  DEFAULT_AI_MODEL,
  isAiModel,
  type AiModel,
} from "@/lib/ai-models";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateActiveAiModel(model: string) {
  if (!isAiModel(model)) {
    throw new Error("Invalid AI model");
  }

  await db
    .insert(systemSettings)
    .values({
      key: ACTIVE_AI_MODEL_KEY,
      value: model,
    })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: {
        value: model,
        updatedAt: sql`now()`,
      },
    });

  revalidatePath("/admin");

  return { success: true, model };
}

export async function getActiveAiModel(): Promise<AiModel> {
  const setting = await db.query.systemSettings.findFirst({
    where: eq(systemSettings.key, ACTIVE_AI_MODEL_KEY),
  });

  if (!setting?.value || !isAiModel(setting.value)) {
    return DEFAULT_AI_MODEL;
  }

  return setting.value;
}
