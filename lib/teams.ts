import { TEAMS_SEPARATOR } from "./constants";
import { getCountryFlag, getCountryName, toFifaCode } from "./country-utils";

export const getShortMatchTeamNames = ({
  displayFlags,
  homeTeamCode,
  awayTeamCode,
}: {
  displayFlags: boolean;
  homeTeamCode: string;
  awayTeamCode: string;
}) => {
  const chunks: string[] = [];
  const displayHomeTeamCode = toFifaCode(homeTeamCode);
  const displayAwayTeamCode = toFifaCode(awayTeamCode);

  if (displayFlags) chunks.push(getCountryFlag(homeTeamCode));
  chunks.push(displayHomeTeamCode);
  chunks.push(TEAMS_SEPARATOR);
  chunks.push(displayAwayTeamCode);
  if (displayFlags) chunks.push(getCountryFlag(awayTeamCode));

  return chunks.join(" ");
};

export const getMatchTeamNames = ({
  displayFlags,
  homeTeamCode,
  awayTeamCode,
  locale = "pl",
}: {
  displayFlags: boolean;
  homeTeamCode: string;
  awayTeamCode: string;
  locale?: "en" | "pl";
}) => {
  const chunks: string[] = [];

  if (displayFlags) chunks.push(getCountryFlag(homeTeamCode));
  chunks.push(getCountryName(homeTeamCode, locale));
  chunks.push(TEAMS_SEPARATOR);
  chunks.push(getCountryName(awayTeamCode, locale));
  if (displayFlags) chunks.push(getCountryFlag(awayTeamCode));

  return chunks.join(" ");
};
