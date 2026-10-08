import { isValidTimeZone } from "@koda/shared/constants";

const fallbackTimeZone = "UTC";

export const getTimeZone = (): string => {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof zone === "string" && isValidTimeZone(zone) ? zone : fallbackTimeZone;
  } catch {
    return fallbackTimeZone;
  }
};
