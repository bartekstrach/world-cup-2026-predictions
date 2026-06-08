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

export const MATCH_STAGES = [
  "group_1",
  "group_2",
  "group_3",
  "round_32",
  "round_16",
  "quarter",
  "semi",
  "final",
] as const;

export type MatchStage = (typeof MATCH_STAGES)[number];

export const NON_FINISHED_STATUSES: MatchStatus[] = [
  MATCH_STATUSES.LIVE,
  MATCH_STATUSES.SCHEDULED,
];

export const FINISHED_STATUS: MatchStatus = MATCH_STATUSES.FINISHED;

// Live matches sync
export const LIVE_MATCHES_PROVIDERS = {
  MOCK: "mock",
  FOOTBALL_DATA: "football-data",
} as const;

export const LIVE_MATCHES_PROVIDER_NAME =
  process.env.LIVE_MATCHES_PROVIDER_NAME ?? LIVE_MATCHES_PROVIDERS.MOCK;
export const LIVE_MATCHES_API_URL = process.env.LIVE_MATCHES_API_URL ?? "";
export const LIVE_MATCHES_API_KEY = process.env.LIVE_MATCHES_API_KEY ?? "";
export const LIVE_MATCHES_ID_MAP = process.env.LIVE_MATCHES_ID_MAP ?? "{}";
export const LIVE_MATCHES_TIMEOUT_MS = Number(
  process.env.LIVE_MATCHES_TIMEOUT_MS ?? "10000",
);
export const LIVE_SYNC_FREQUENCY_MINUTES = Number(
  process.env.LIVE_SYNC_FREQUENCY_MINUTES ?? "1",
);

export const CRON_SYNC_SECRET = process.env.CRON_SYNC_SECRET ?? "";

export type MatchStatus = (typeof MATCH_STATUSES)[keyof typeof MATCH_STATUSES];

export const SUBMISSION_STAGES = [
  "group_1",
  "group_2",
  "group_3",
  "round_32",
  "round_16",
  "quarter",
  "semi",
  "final",
] as const;

export type SubmissionStage = (typeof SUBMISSION_STAGES)[number];

export const TWO_PAGE_SUBMISSION_STAGES = [
  "group_1",
  "group_2",
  "group_3",
  "round_32",
] as const;

export const STAGE_ORDER: Record<SubmissionStage, number> = {
  group_1: 0,
  group_2: 1,
  group_3: 2,
  round_32: 3,
  round_16: 4,
  quarter: 5,
  semi: 6,
  final: 7,
};

export const PUBLICATION_SETTINGS_SINGLETON_ID = 1;

export const DEFAULT_UPLOAD_STAGE: SubmissionStage = "group_1";

export const DEFAULT_UPLOAD_COMPETITION = {
  name: process.env.UPLOAD_COMPETITION_NAME ?? "world-cup",
  year: Number(process.env.UPLOAD_COMPETITION_YEAR ?? "2026"),
} as const;
