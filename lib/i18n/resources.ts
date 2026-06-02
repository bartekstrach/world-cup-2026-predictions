import enCommon from "@/locales/en/common.json";
import plCommon from "@/locales/pl/common.json";

export const DEFAULT_LANGUAGE = "pl";
export const FALLBACK_LANGUAGE = "en";
export const DEFAULT_NAMESPACE = "common";

export const resources = {
  en: {
    common: enCommon,
  },
  pl: {
    common: plCommon,
  },
} as const;

export type AppLanguage = keyof typeof resources;
