/**
 * TEMP WC 2026 UI only — remove after the tournament.
 * 3rd place (#103) and final (#104) both use stage "final" in the DB.
 */

const THIRD_PLACE_MATCH_NUMBER = 103;
const FINAL_MATCH_NUMBER = 104;

type MatchMedalLookup = {
  matchNumber?: number;
  matchId?: number;
  homeTeamCode?: string;
  awayTeamCode?: string;
};

function normalizeCode(code?: string) {
  return code?.toUpperCase() ?? "";
}

export function getMatchMedalEmoji(lookup: MatchMedalLookup): string | null {
  if (lookup.matchNumber === THIRD_PLACE_MATCH_NUMBER) return "🥉";
  if (lookup.matchNumber === FINAL_MATCH_NUMBER) return "🥇";

  const home = normalizeCode(lookup.homeTeamCode);
  const away = normalizeCode(lookup.awayTeamCode);

  if (home === "FRA" && away === "ENG") return "🥉";
  if (home === "ESP" && away === "ARG") return "🥇";

  return null;
}

export function withMatchMedal(
  label: string,
  lookup: MatchMedalLookup,
): string {
  const medal = getMatchMedalEmoji(lookup);
  return medal ? `${medal} ${label}` : label;
}
