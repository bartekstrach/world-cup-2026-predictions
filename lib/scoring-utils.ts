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

/**
 * Merge a provider-reported score side onto the local score.
 *
 * Rule: a concrete numeric value from the provider always wins (including a
 * downgrade to a lower number or 0, e.g. a VAR-disallowed goal), while a
 * `null` from the provider (transient gap during a VAR review) keeps the
 * locally stored value so we never wipe a real score.
 */
export function reconcileScore(
  localScore: number | null,
  providerScore: number | null,
): number | null {
  return providerScore !== null ? providerScore : localScore;
}

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

/** True when total goal difference across both teams is exactly 1 (e.g. 1:0 vs 0:0, 1:1, or 2:0). */
export function isOneGoalOff(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
): boolean {
  return (
    Math.abs(actualHome - predictedHome) +
      Math.abs(actualAway - predictedAway) ===
    1
  );
}
