import {
  DEFAULT_UPLOAD_COMPETITION,
  DEFAULT_UPLOAD_STAGE,
  type SubmissionStage,
} from "@/lib/constants";

const FALLBACK_PARTICIPANT_SLUG = "unknown-participant";
const FALLBACK_EXT = "jpg";

function slugify(value: string, fallback: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || fallback;
}

function sanitizeExtension(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (!ext || !/^[a-z0-9]{2,10}$/.test(ext)) {
    return FALLBACK_EXT;
  }

  return ext;
}

type BuildPredictionBlobPathInput = {
  participantName?: string | null;
  stage?: string | null;
  competitionName?: string | null;
  originalFileName: string;
};

export function normalizeSubmissionStage(
  stage: string | null | undefined,
): SubmissionStage {
  const normalizedStage = stage?.trim().toLowerCase();

  if (!normalizedStage) {
    return DEFAULT_UPLOAD_STAGE;
  }

  if (
    normalizedStage === "group" ||
    normalizedStage === "round_16" ||
    normalizedStage === "quarter" ||
    normalizedStage === "semi" ||
    normalizedStage === "final"
  ) {
    return normalizedStage;
  }

  return DEFAULT_UPLOAD_STAGE;
}

export function buildPredictionBlobPath({
  participantName,
  stage,
  competitionName,
  originalFileName,
}: BuildPredictionBlobPathInput) {
  const participantSlug = slugify(
    participantName ?? "",
    FALLBACK_PARTICIPANT_SLUG,
  );
  const stageSlug = normalizeSubmissionStage(stage);
  const competitionSlug = slugify(
    competitionName ?? DEFAULT_UPLOAD_COMPETITION.name,
    DEFAULT_UPLOAD_COMPETITION.name,
  );

  const ext = sanitizeExtension(originalFileName);
  const timestamp = Date.now();
  const fileName = `${participantSlug}-${stageSlug}-${timestamp}.${ext}`;

  return `/predictions/${competitionSlug}/${stageSlug}/${participantSlug}/${fileName}`;
}
