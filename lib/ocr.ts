import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import plLocale from "i18n-iso-countries/langs/pl.json";

countries.registerLocale(enLocale);
countries.registerLocale(plLocale);

export interface ExtractedPrediction {
  participantName: string;
  rawText: string;
  predictions: Array<{
    matchNumber?: number;
    date?: string;
    time?: string;
    group?: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number | null;
    awayScore: number | null;
  }>;
}

/**
 * Get ISO alpha-3 code from country name (Polish or English)
 */
function getCountryCode(countryName: string): string | null {
  const normalized = countryName.trim();

  // Try Polish → alpha-2
  let alpha2 = countries.getAlpha2Code(normalized, "pl");

  // Try English → alpha-2
  if (!alpha2) {
    alpha2 = countries.getAlpha2Code(normalized, "en");
  }

  // Try case-insensitive
  if (!alpha2) {
    const allCountriesPL = countries.getNames("pl");
    const allCountriesEN = countries.getNames("en");

    const foundPL = Object.entries(allCountriesPL).find(
      ([, name]) => name.toLowerCase() === normalized.toLowerCase()
    );

    const foundEN = Object.entries(allCountriesEN).find(
      ([, name]) => name.toLowerCase() === normalized.toLowerCase()
    );

    alpha2 = foundPL?.[0] || foundEN?.[0];
  }

  if (!alpha2) {
    return null;
  }

  // Convert to alpha-3 (BRA, DEU, JPN, etc.)
  return countries.alpha2ToAlpha3(alpha2) || null;
}

export async function extractTextFromImage(
  imageBase64: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_VISION_API_KEY not configured");
  }

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: "TEXT_DETECTION" }],
          },
        ],
      }),
    }
  );

  const data = await response.json();

  if (data.responses?.[0]?.error) {
    throw new Error(data.responses[0].error.message);
  }

  const textAnnotations = data.responses?.[0]?.textAnnotations;

  if (!textAnnotations || textAnnotations.length === 0) {
    throw new Error("No text detected in image");
  }

  return textAnnotations[0].description || "";
}

export function parsePredictionsText(text: string): ExtractedPrediction {
  const lines = text.split("\n").filter((line) => line.trim());

  let participantName = "Unknown";
  const predictions: ExtractedPrediction["predictions"] = [];
  let currentDate = "";

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Extract participant name
    const nameMatch = trimmedLine.match(
      /(?:name|imię|nazwa|uczestnik):?\s*(.+)/i
    );
    if (nameMatch) {
      participantName = nameMatch[1].trim();
      continue;
    }

    // Extract date
    const dateMatch = trimmedLine.match(/(\d{2}\.\d{2})\s*(\w+)?/);
    if (dateMatch && trimmedLine.length < 30) {
      currentDate = dateMatch[1];
      continue;
    }

    // Parse match line
    const matchPattern =
      /([A-L])?\s*(\d{1,2}:\d{2})?\s*([^\d:_]+?)\s*([_\d])\s*:\s*([_\d])\s*(.+)/i;
    const matchMatch = trimmedLine.match(matchPattern);

    if (matchMatch) {
      const group = matchMatch[1] || undefined;
      const time = matchMatch[2] || undefined;
      const homeTeamRaw = matchMatch[3].trim();
      const homeScoreRaw = matchMatch[4].trim();
      const awayScoreRaw = matchMatch[5].trim();
      const awayTeamRaw = matchMatch[6].trim();

      const homeCode = getCountryCode(homeTeamRaw);
      const awayCode = getCountryCode(awayTeamRaw);

      predictions.push({
        date: currentDate || undefined,
        time,
        group,
        homeTeam: homeCode || homeTeamRaw,
        awayTeam: awayCode || awayTeamRaw,
        homeScore: homeScoreRaw === "_" ? null : parseInt(homeScoreRaw),
        awayScore: awayScoreRaw === "_" ? null : parseInt(awayScoreRaw),
      });
    }
  }

  return {
    participantName,
    rawText: text,
    predictions,
  };
}

export async function processImageToPredictions(
  imageBase64: string
): Promise<ExtractedPrediction> {
  const text = await extractTextFromImage(imageBase64);
  return parsePredictionsText(text);
}
