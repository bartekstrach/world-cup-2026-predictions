const WARSAW_TIME_ZONE = "Europe/Warsaw";

export const getShortWeekday = ({
  date,
  locale = "pl-PL",
  options,
}: {
  date: Date;
  locale?: Intl.LocalesArgument;
  options?: Intl.DateTimeFormatOptions;
}) => {
  const weekday = new Intl.DateTimeFormat(locale, {
    timeZone: WARSAW_TIME_ZONE,
    weekday: "short",
    ...options,
  })
    .format(date)
    .toLowerCase()
    .replace(".", "")
    .slice(0, 2);

  return weekday;
};

export const formatDateTime = ({ date }: { date: Date }) => {
  const parts = new Intl.DateTimeFormat("pl-PL", {
    timeZone: WARSAW_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${map.day}.${map.month} ${map.hour}:${map.minute}`;
};

const toWarsawTimestamp = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: WARSAW_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
};

export const getWarsawCountdownParts = ({
  targetDate,
  now = new Date(),
}: {
  targetDate: Date;
  now?: Date;
}) => {
  const diffMs = toWarsawTimestamp(targetDate) - toWarsawTimestamp(now);

  if (diffMs <= 0) {
    return null;
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  return {
    days,
    hours,
    minutes,
  };
};
