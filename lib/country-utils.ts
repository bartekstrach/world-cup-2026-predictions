import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import plLocale from "i18n-iso-countries/langs/pl.json";

countries.registerLocale(enLocale);
countries.registerLocale(plLocale);

export function getCountryName(
  isoCode: string,
  locale: "en" | "pl" = "en"
): string {
  // Try alpha-3 first
  const alpha2 = countries.alpha3ToAlpha2(isoCode);

  if (alpha2) {
    return countries.getName(alpha2, locale) || isoCode;
  }

  // Fallback: try as alpha-2
  return countries.getName(isoCode, locale) || isoCode;
}

export function getCountryFlag(isoCode: string): string {
  const alpha2 = countries.alpha3ToAlpha2(isoCode) || isoCode;

  // Regional indicator symbols (emoji flags)
  const codePoints = alpha2
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}
