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
    weekday: "short",
    ...options,
  })
    .format(date)
    .toLowerCase()
    .replace(".", "")
    .slice(0, 2);

  return weekday;
};

export const formatDateTime = ({
  date,
  locale = "pl-PL",
}: {
  date: Date;
  locale?: Intl.LocalesArgument;
}) => {
  const parts = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${map.day}.${map.month} ${map.hour}:${map.minute}`;
};

export const formatWeekdayDateTime = ({
  date,
  locale = "pl-PL",
}: {
  date: Date;
  locale?: Intl.LocalesArgument;
}) => {
  return `${getShortWeekday({ date, locale })} ${formatDateTime({ date, locale })}`;
};

export const getCountdownParts = ({
  targetDate,
  now = new Date(),
}: {
  targetDate: Date;
  now?: Date;
}) => {
  const diffMs = targetDate.getTime() - now.getTime();

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
