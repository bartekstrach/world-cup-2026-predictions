import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import plLocale from "i18n-iso-countries/langs/pl.json";

countries.registerLocale(enLocale);
countries.registerLocale(plLocale);

const CUSTOM_COUNTRIES = {
  ENG: {
    names: { en: "England", pl: "Anglia" },
    flag: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}",
  },
  SCO: {
    names: { en: "Scotland", pl: "Szkocja" },
    flag: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}",
  },
} as const;

const FIFA_TO_ISO_ALPHA3: Record<string, string> = {
  GER: "DEU",
  CRO: "HRV",
  SUI: "CHE",
  NED: "NLD",
  POR: "PRT",
  KSA: "SAU",
  RSA: "ZAF",
  URU: "URY",
  ALG: "DZA",
};

const PL_SHORT_NAMES: Record<string, string> = {
  ZAF: "RPA",
  BIH: "Bośnia i Herc.",
  USA: "USA",
  CIV: "Wybrzeże Kości Sł.",
  CPV: "Republika Ziel. Przyl.",
  COD: "DR Kongo",
  SAU: "Arabia Saud.",
};

export function getCountryName(
  isoCode: string,
  locale: "en" | "pl" = "pl",
): string {
  const normalizedCode = isoCode.toUpperCase();

  const customCountry =
    CUSTOM_COUNTRIES[normalizedCode as keyof typeof CUSTOM_COUNTRIES];

  if (customCountry) {
    return customCountry.names[locale];
  }

  const resolvedCode = FIFA_TO_ISO_ALPHA3[normalizedCode] || normalizedCode;

  if (locale === "pl" && PL_SHORT_NAMES[resolvedCode]) {
    return PL_SHORT_NAMES[resolvedCode];
  }

  // Try alpha-3 first
  const alpha2 = countries.alpha3ToAlpha2(resolvedCode);

  if (alpha2) {
    return countries.getName(alpha2, locale) || isoCode;
  }

  // Fallback: try as alpha-2
  return countries.getName(resolvedCode, locale) || isoCode;
}

export function getCountryFlag(isoCode: string): string {
  const normalizedCode = isoCode.toUpperCase();

  const customCountry =
    CUSTOM_COUNTRIES[normalizedCode as keyof typeof CUSTOM_COUNTRIES];

  if (customCountry) {
    return customCountry.flag;
  }

  const resolvedCode = FIFA_TO_ISO_ALPHA3[normalizedCode] || normalizedCode;
  const alpha2 = countries.alpha3ToAlpha2(resolvedCode) || resolvedCode;

  // Regional indicator symbols (emoji flags)
  const codePoints = alpha2
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}
