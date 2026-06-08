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
              features: [{ type: "TEXT_DETECTION" }],
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
    homeScore: number | null;
    awayScore: number | null;
  }>;
}

async function extractTextFromImage(imageBase64: string): Promise<string> {
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
            features: [
              { type: "TEXT_DETECTION" },
              { type: "DOCUMENT_TEXT_DETECTION" },
            ],
          },
        ],
      }),
    },
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

  const foundScores = new Set<string>();

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
        const key = `${homeScore}:${awayScore}`;
        if (!foundScores.has(key)) {
          foundScores.add(key);
          scores.push({ homeScore, awayScore });
        }
      }
    }
  }

  return scores;
}

function parsePredictionsText(text: string): ExtractedPrediction {
  const participantName = extractParticipantName(text);
  const scores = extractScores(text);

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

  const text = await extractTextFromImage(imageBase64);
  return parsePredictionsText(text);
}
