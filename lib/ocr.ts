export interface ExtractedPrediction {
  participantName: string;
  predictions: Array<{
    matchNumber: number;
    homeScore: number;
    awayScore: number;
  }>;
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
  const predictions: Array<{
    matchNumber: number;
    homeScore: number;
    awayScore: number;
  }> = [];

  for (const line of lines) {
    // Extract name - supports formats like "Name: John Doe" or "Name John Doe"
    const nameMatch = line.match(/name:?\s*(.+)/i);
    if (nameMatch) {
      participantName = nameMatch[1].trim();
      continue;
    }

    // Extract predictions - supports formats like:
    // "1. 2:1" or "1) 2-1" or "1: 2:1" or "1 2:1"
    const predMatch = line.match(/(\d+)[\.\):\s]+(\d+)[\:\-](\d+)/);
    if (predMatch) {
      const matchNumber = parseInt(predMatch[1]);
      const homeScore = parseInt(predMatch[2]);
      const awayScore = parseInt(predMatch[3]);

      predictions.push({ matchNumber, homeScore, awayScore });
    }
  }

  return { participantName, predictions };
}

export async function processImageToPredictions(
  imageBase64: string
): Promise<ExtractedPrediction> {
  const text = await extractTextFromImage(imageBase64);
  return parsePredictionsText(text);
}
