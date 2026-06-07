import {
  BAD_PREDICTION,
  GOOD_PREDICTION,
  PERFECT_PREDICTION,
  SCORE_SEPARATOR,
} from "./constants";

export const formatScore = ({
  homeScore,
  awayScore,
}: {
  homeScore?: number;
  awayScore?: number;
}): string => [homeScore ?? "-", SCORE_SEPARATOR, awayScore ?? "-"].join("");

export function calculatePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
): number {
  if (predictedHome === actualHome && predictedAway === actualAway) {
    return PERFECT_PREDICTION;
  }

  const predictedOutcome =
    predictedHome > predictedAway
      ? "home"
      : predictedHome < predictedAway
        ? "away"
        : "draw";

  const actualOutcome =
    actualHome > actualAway
      ? "home"
      : actualHome < actualAway
        ? "away"
        : "draw";

  if (predictedOutcome === actualOutcome) {
    return GOOD_PREDICTION;
  }

  return BAD_PREDICTION;
}
