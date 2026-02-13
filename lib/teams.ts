import { TEAMS_SEPARATOR } from "./constants";
import { getCountryFlag, getCountryName } from "./country-utils";

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

  if (displayFlags) chunks.push(getCountryFlag(homeTeamCode));
  chunks.push(homeTeamCode);
  chunks.push(TEAMS_SEPARATOR);
  chunks.push(awayTeamCode);
  if (displayFlags) chunks.push(getCountryFlag(awayTeamCode));

  return chunks.join(" ");
};

export const getMatchTeamNames = ({
  displayFlags,
  homeTeamCode,
  awayTeamCode,
}: {
  displayFlags: boolean;
  homeTeamCode: string;
  awayTeamCode: string;
}) => {
  const chunks: string[] = [];

  if (displayFlags) chunks.push(getCountryFlag(homeTeamCode));
  chunks.push(getCountryName(homeTeamCode));
  chunks.push(TEAMS_SEPARATOR);
  chunks.push(getCountryName(awayTeamCode));
  if (displayFlags) chunks.push(getCountryFlag(awayTeamCode));

  return chunks.join(" ");
};
