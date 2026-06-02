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
    timeZone: "Europe/Warsaw",
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
    timeZone: "Europe/Warsaw",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${map.day}.${map.month} ${map.hour}:${map.minute}`;
};
