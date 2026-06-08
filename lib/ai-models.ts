export const AI_MODEL_OPTIONS = ["gpt-4o-2024-08-06", "gpt-4o-mini"] as const;

export type AiModel = (typeof AI_MODEL_OPTIONS)[number];

export const ACTIVE_AI_MODEL_KEY = "active_ai_model";
export const DEFAULT_AI_MODEL: AiModel = "gpt-4o-2024-08-06";

export function isAiModel(value: string): value is AiModel {
  return (AI_MODEL_OPTIONS as readonly string[]).includes(value);
}
