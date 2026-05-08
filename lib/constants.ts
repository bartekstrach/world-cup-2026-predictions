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

export const SUBMISSION_STAGES = [
  "group",
  "round_16",
  "quarter",
  "semi",
  "final",
] as const;

export type SubmissionStage = (typeof SUBMISSION_STAGES)[number];

export const DEFAULT_UPLOAD_STAGE: SubmissionStage = "group";

export const DEFAULT_UPLOAD_COMPETITION = {
  name: process.env.UPLOAD_COMPETITION_NAME ?? "world-cup",
  year: Number(process.env.UPLOAD_COMPETITION_YEAR ?? "2026"),
} as const;
