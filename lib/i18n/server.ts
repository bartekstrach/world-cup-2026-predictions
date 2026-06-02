import { createInstance } from "i18next";
import {
  DEFAULT_LANGUAGE,
  DEFAULT_NAMESPACE,
  FALLBACK_LANGUAGE,
  resources,
} from "@/lib/i18n/resources";

export async function getT() {
  const i18n = createInstance();

  await i18n.init({
    resources,
    lng: DEFAULT_LANGUAGE,
    fallbackLng: FALLBACK_LANGUAGE,
    defaultNS: DEFAULT_NAMESPACE,
    ns: [DEFAULT_NAMESPACE],
    interpolation: {
      escapeValue: false,
    },
  });

  return i18n.getFixedT(DEFAULT_LANGUAGE, DEFAULT_NAMESPACE);
}
