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

export const formatDateTime = ({ date }: { date: Date }) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}.${month} ${hours}:${minutes}`;
};
