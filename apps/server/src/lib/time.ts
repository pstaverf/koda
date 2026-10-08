export const holdMinimumLatency = async (startedAt: number, minimumMs: number): Promise<void> => {
  const remaining = minimumMs - (Date.now() - startedAt);
  if (remaining > 0) {
    await new Promise((resolve) => {
      setTimeout(resolve, remaining);
    });
  }
};

const dayMs = 24 * 60 * 60 * 1000;

export const lastSeenLongAgoText = "был(-а) давно";
export const onlineText = "в сети";

const dayKey = (date: Date, timeZone: string): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

const yearOf = (date: Date, timeZone: string): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric" }).format(date);

const clockOf = (date: Date, timeZone: string): string =>
  new Intl.DateTimeFormat("ru-RU", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);

const dayMonthOf = (date: Date, timeZone: string): string =>
  new Intl.DateTimeFormat("ru-RU", { timeZone, day: "numeric", month: "long" }).format(date);

export const formatExactLastSeen = (lastSeenAt: Date, now: Date, timeZone: string): string => {
  const clock = clockOf(lastSeenAt, timeZone);
  if (dayKey(lastSeenAt, timeZone) === dayKey(now, timeZone)) {
    return `был(-а) в ${clock}`;
  }
  if (dayKey(lastSeenAt, timeZone) === dayKey(new Date(now.getTime() - dayMs), timeZone)) {
    return `был(-а) вчера в ${clock}`;
  }
  const dayMonth = dayMonthOf(lastSeenAt, timeZone);
  if (yearOf(lastSeenAt, timeZone) === yearOf(now, timeZone)) {
    return `был(-а) ${dayMonth} в ${clock}`;
  }
  return `был(-а) ${dayMonth} ${yearOf(lastSeenAt, timeZone)} в ${clock}`;
};

export const formatRecentLastSeen = (lastSeenAt: Date, now: Date): string => {
  const elapsed = now.getTime() - lastSeenAt.getTime();
  if (elapsed <= 3 * dayMs) {
    return "был(-а) недавно";
  }
  if (elapsed <= 7 * dayMs) {
    return "был(-а) на этой неделе";
  }
  if (elapsed <= 30 * dayMs) {
    return "был(-а) в этом месяце";
  }
  return lastSeenLongAgoText;
};
