// Predictions
export const PERFECT_PREDICTION = 3;
export const GOOD_PREDICTION = 1;
export const BAD_PREDICTION = 0;

// Teams
export const TEAMS_SEPARATOR = "-";

// Matches
export const SCORE_SEPARATOR = ":";
export const NO_RESULT = "-";

export const MATCH_STATUSES = {
  SCHEDULED: "scheduled",
  LIVE: "live",
  FINISHED: "finished",
} as const;

export const NON_FINISHED_STATUSES: MatchStatus[] = [
  MATCH_STATUSES.LIVE,
  MATCH_STATUSES.SCHEDULED,
];

export const FINISHED_STATUS: MatchStatus = MATCH_STATUSES.FINISHED;

export type MatchStatus = (typeof MATCH_STATUSES)[keyof typeof MATCH_STATUSES];
