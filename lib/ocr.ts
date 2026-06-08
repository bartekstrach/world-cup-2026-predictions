async function checkVisionApiAccess(): Promise<{
  hasAccess: boolean;
  reason: string;
}> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;

  if (!apiKey) {
    return {
      hasAccess: false,
      reason: "GOOGLE_VISION_API_KEY is not configured.",
    };
  }

  // A tiny 1x1 pixel transparent PNG encoded in Base64.
  // This minimizes bandwidth and processing time.
  const tinyImageBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: tinyImageBase64 },
              features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
              imageContext: { languageHints: ["pl"] },
            },
          ],
        }),
      },
    );

    const data = await response.json();

    // 1. Check for top-level API errors (e.g., Invalid API Key, Billing disabled)
    if (data.error) {
      return {
        hasAccess: false,
        reason: `API Error [${data.error.code}]: ${data.error.message}`,
      };
    }

    // 2. Check for image-specific processing errors
    if (data.responses?.[0]?.error) {
      return {
        hasAccess: false,
        reason: `Processing Error: ${data.responses[0].error.message}`,
      };
    }

    // If we reach here, the API accepted the key, processed the payload,
    // and successfully returned a (likely empty) result.
    return {
      hasAccess: true,
      reason: "API key is valid and working correctly.",
    };
  } catch (error: any) {
    // Catches network errors or issues with the fetch request itself
    return {
      hasAccess: false,
      reason: `Network/Execution Error: ${error.message}`,
    };
  }
}

interface ExtractedPrediction {
  participantName: string;
  rawText: string;
  scores: Array<{
    matchedLine: string;
    homeScore: number;
    awayScore: number;
    rawTeamsText: string;
  }>;
}

type VisionApiWord = {
  description?: string;
  boundingPoly?: {
    vertices?: Array<{
      x?: number;
      y?: number;
    }>;
  };
};

type VisionApiResponse = {
  responses?: Array<{
    error?: { message?: string };
    textAnnotations?: VisionApiWord[];
  }>;
};

async function extractVisionDataFromImage(
  imageBase64: string,
): Promise<VisionApiResponse> {
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
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
            imageContext: { languageHints: ["pl"] },
          },
        ],
      }),
    },
  );

  const data = (await response.json()) as VisionApiResponse;

  if (data.responses?.[0]?.error) {
    throw new Error(data.responses[0].error.message);
  }

  return data;
}

function extractParticipantName(text: string): string {
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Match "Imię: Name" or "Name: Name"
    const nameMatch = trimmed.match(/(?:imię|name|nazwa|uczestnik):?\s*(.+)/i);
    if (nameMatch) {
      return nameMatch[1].trim();
    }

    // If first line and no colon, might be just the name
    if (
      lines.indexOf(line) < 3 &&
      trimmed.length > 2 &&
      !trimmed.includes(":")
    ) {
      // Check if it's not a date or match info
      if (!/\d{2}\.\d{2}/.test(trimmed) && !/\d+:\d+/.test(trimmed)) {
        return trimmed;
      }
    }
  }

  return "Unknown";
}

function extractScores(
  text: string,
): Array<{ homeScore: number | null; awayScore: number | null }> {
  const scores: Array<{ homeScore: number | null; awayScore: number | null }> =
    [];

  // Find all patterns that look like scores
  // Patterns: "2:1", "2 - 1", "2-1", "2 1", "[2] : [1]", etc.
  const patterns = [
    /(\d)\s*:\s*(\d)/g, // 2:1
    /(\d)\s*-\s*(\d)/g, // 2-1 or 2 - 1
    /\[(\d)\]\s*:\s*\[(\d)\]/g, // [2] : [1]
    /(\d)\s+(\d)(?!\d)/g, // 2 1 (but not part of larger number)
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const homeScore = parseInt(match[1]);
      const awayScore = parseInt(match[2]);

      // Validate scores (0-9 range for football)
      if (
        homeScore >= 0 &&
        homeScore <= 9 &&
        awayScore >= 0 &&
        awayScore <= 9
      ) {
        scores.push({ homeScore, awayScore });
      }
    }
  }

  return scores;
}

function getWordCenterY(word: VisionApiWord): number {
  const vertices = word.boundingPoly?.vertices;

  if (!vertices || vertices.length === 0) {
    return Number.NaN;
  }

  const ys = vertices
    .map((vertex) => vertex.y)
    .filter((value): value is number => typeof value === "number");

  if (ys.length === 0) {
    return Number.NaN;
  }

  return ys.reduce((sum, y) => sum + y, 0) / ys.length;
}

function getWordLeftX(word: VisionApiWord): number {
  const vertices = word.boundingPoly?.vertices;

  if (!vertices || vertices.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  const xs = vertices
    .map((vertex) => vertex.x)
    .filter((value): value is number => typeof value === "number");

  if (xs.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.min(...xs);
}

function firstScoreFromLine(
  line: string,
): { homeScore: number; awayScore: number; rawTeamsText: string } | null {
  const patterns = [
    /(\d)\s*:\s*(\d)/,
    /(\d)\s*-\s*(\d)/,
    /\[(\d)\]\s*:\s*\[(\d)\]/,
    /(\d)\s+(\d)(?!\d)/,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (!match) {
      continue;
    }

    const homeScore = Number.parseInt(match[1], 10);
    const awayScore = Number.parseInt(match[2], 10);

    if (
      Number.isNaN(homeScore) ||
      Number.isNaN(awayScore) ||
      homeScore < 0 ||
      homeScore > 9 ||
      awayScore < 0 ||
      awayScore > 9
    ) {
      continue;
    }

    const rawTeamsText = line
      .replace(pattern, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

    return {
      homeScore,
      awayScore,
      rawTeamsText,
    };
  }

  return null;
}

export function parseSpatialPredictions(data: VisionApiResponse):
  | Array<{
      matchedLine: string;
      homeScore: number;
      awayScore: number;
      rawTeamsText: string;
    }>
  | [] {
  const textAnnotations = data.responses?.[0]?.textAnnotations;

  if (!textAnnotations || textAnnotations.length <= 1) {
    return [];
  }

  const words = textAnnotations
    .slice(1)
    .map((word) => ({
      text: word.description?.trim() ?? "",
      centerY: getWordCenterY(word),
      leftX: getWordLeftX(word),
    }))
    .filter((word) => word.text.length > 0 && Number.isFinite(word.centerY));

  const lines: Array<{ baselineY: number; words: typeof words }> = [];
  const lineTolerance = 18;

  for (const word of words) {
    const existingLine = lines.find(
      (line) => Math.abs(line.baselineY - word.centerY) <= lineTolerance,
    );

    if (existingLine) {
      existingLine.words.push(word);
      existingLine.baselineY =
        existingLine.words.reduce((sum, item) => sum + item.centerY, 0) /
        existingLine.words.length;
      continue;
    }

    lines.push({ baselineY: word.centerY, words: [word] });
  }

  return lines
    .sort((a, b) => a.baselineY - b.baselineY)
    .map((line) => {
      const sortedWords = [...line.words].sort((a, b) => a.leftX - b.leftX);
      const matchedLine = sortedWords
        .map((word) => word.text)
        .join(" ")
        .trim();
      const scoreMatch = firstScoreFromLine(matchedLine);

      if (!scoreMatch) {
        return null;
      }

      const hasTeamLikeText = /[\p{L}]{3,}/u.test(scoreMatch.rawTeamsText);
      if (!hasTeamLikeText) {
        return null;
      }

      return {
        matchedLine,
        homeScore: scoreMatch.homeScore,
        awayScore: scoreMatch.awayScore,
        rawTeamsText: scoreMatch.rawTeamsText,
      };
    })
    .filter(
      (
        line,
      ): line is {
        matchedLine: string;
        homeScore: number;
        awayScore: number;
        rawTeamsText: string;
      } => Boolean(line),
    );
}

function parsePredictionsText(text: string): ExtractedPrediction {
  const participantName = extractParticipantName(text);
  const scores = extractScores(text).map((item) => ({
    matchedLine: `${item.homeScore}:${item.awayScore}`,
    homeScore: item.homeScore ?? 0,
    awayScore: item.awayScore ?? 0,
    rawTeamsText: "",
  }));

  return {
    participantName,
    rawText: text,
    scores,
  };
}

export async function processImageToPredictions(
  imageBase64: string,
): Promise<ExtractedPrediction | undefined> {
  const { hasAccess, reason } = await checkVisionApiAccess();

  if (!hasAccess) {
    console.error(reason);
    return;
  }

  const data = await extractVisionDataFromImage(imageBase64);
  const textAnnotations = data.responses?.[0]?.textAnnotations;

  if (!textAnnotations || textAnnotations.length === 0) {
    throw new Error("No text detected in image");
  }

  const rawText = textAnnotations[0]?.description || "";
  const participantName = extractParticipantName(rawText);
  const scores = parseSpatialPredictions(data);

  if (scores.length > 0) {
    return {
      participantName,
      rawText,
      scores,
    };
  }

  return parsePredictionsText(rawText);
}

export async function processImagesToPredictions(
  imagesBase64: string[],
): Promise<ExtractedPrediction | undefined> {
  const validImages = imagesBase64.filter(
    (image) => typeof image === "string" && image.length > 0,
  );

  if (validImages.length === 0) {
    throw new Error("No images provided");
  }

  const extractedResults = await Promise.all(
    validImages.map((imageBase64) => processImageToPredictions(imageBase64)),
  );

  const parsedResults = extractedResults.filter(
    (result): result is ExtractedPrediction => Boolean(result),
  );

  if (parsedResults.length === 0) {
    return;
  }

  const participantName = parsedResults.find(
    (result) => result.participantName && result.participantName !== "Unknown",
  )?.participantName;

  return {
    participantName: participantName ?? parsedResults[0].participantName,
    rawText: parsedResults
      .map((result) => result.rawText)
      .join("\n\n--- PAGE BREAK ---\n\n"),
    scores: parsedResults.flatMap((result) => result.scores),
  };
}
