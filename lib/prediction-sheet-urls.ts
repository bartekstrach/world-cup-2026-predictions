export function encodePredictionSheetUrls(urls: string[]): string {
  const sanitized = urls
    .map((url) => (typeof url === "string" ? url.trim() : ""))
    .filter((url) => url.length > 0);

  if (sanitized.length === 0) {
    return "";
  }

  return JSON.stringify(Array.from(new Set(sanitized)));
}

export function decodePredictionSheetUrls(
  value: string | null | undefined,
): string[] {
  if (!value || typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
  } catch {
    // backwards compatibility with old single-url entries
  }

  return [trimmed];
}
