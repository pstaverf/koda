import type { BannerStyleValue } from "./profile.js";

export const API_PREFIX = "/api/v1";
export const WS_PATH = "/api/v1/ws";
export const CLIENT_HEADER = "X-Koda-Client";
export const TIMEZONE_HEADER = "X-Timezone";

export const REFRESH_COOKIE_NAME = "koda_refresh";
export const REFRESH_COOKIE_PATH = "/api/v1/auth";

export const ACCESS_TOKEN_TTL_SECONDS = 900;
export const REFRESH_TOKEN_TTL_DAYS = 30;
export const REFRESH_TOKEN_BYTES = 32;
export const REGISTRATION_TOKEN_BYTES = 32;
export const REGISTRATION_TTL_SECONDS = 1800;

export const CODE_LENGTH = 6;
export const CODE_TTL_SECONDS = 600;
export const CODE_MAX_ATTEMPTS = 5;
export const CODE_RESEND_COOLDOWN_SECONDS = 60;
export const CODE_EMAIL_HOURLY_LIMIT = 10;
export const CODE_IP_HOURLY_LIMIT = 20;

export const LOGIN_FAILURES_BEFORE_CAPTCHA = 3;
export const LOGIN_FAILURE_TTL_SECONDS = 3600;
export const LOGIN_IP_HOURLY_LIMIT = 30;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export const DISPLAY_NAME_MIN_LENGTH = 1;
export const DISPLAY_NAME_MAX_LENGTH = 32;
export const BIO_MAX_LENGTH = 200;

export const PUBLIC_ID_LENGTH = 9;
export const PUBLIC_ID_ATTEMPTS = 3;

export const FRIEND_REQUESTS_PER_DAY = 50;

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const BANNER_MAX_BYTES = 10 * 1024 * 1024;
export const AVATAR_SIZE = 512;
export const BANNER_WIDTH = 1500;
export const BANNER_HEIGHT = 500;

export const PRESENCE_TTL_SECONDS = 90;
export const PRESENCE_HEARTBEAT_SECONDS = 30;
export const PRESENCE_LAST_SEEN_WRITE_SECONDS = 30;

export const WS_AUTH_TIMEOUT_MS = 5000;
export const WS_PING_INTERVAL_MS = 25000;
export const WS_PONG_TIMEOUT_MS = 60000;
export const WS_RECONNECT_MIN_MS = 1000;
export const WS_RECONNECT_MAX_MS = 30000;
export const WS_SUBSCRIBE_MAX_USERS = 200;

export const DELETED_ACCOUNT_RETENTION_DAYS = 14;
export const S3_URL_TTL_SECONDS = 3600;

export const bannerPalette: readonly { id: string; style: BannerStyleValue }[] = [
  { id: "graphite", style: { type: "color", value: "#1F1F24" } },
  { id: "violet", style: { type: "color", value: "#6D5DF6" } },
  { id: "blue", style: { type: "color", value: "#2E7DF7" } },
  { id: "teal", style: { type: "color", value: "#1FB6A6" } },
  { id: "amber", style: { type: "color", value: "#F5A623" } },
  { id: "rose", style: { type: "color", value: "#F2557A" } },
  { id: "dusk", style: { type: "gradient", from: "#6D5DF6", to: "#F2557A", angle: 135 } },
  { id: "ocean", style: { type: "gradient", from: "#2E7DF7", to: "#1FB6A6", angle: 120 } },
  { id: "aurora", style: { type: "gradient", from: "#35C759", to: "#2E7DF7", angle: 150 } },
  { id: "ember", style: { type: "gradient", from: "#F5A623", to: "#F2557A", angle: 45 } },
  { id: "candy", style: { type: "gradient", from: "#F2557A", to: "#6D5DF6", angle: 210 } },
  { id: "mint", style: { type: "gradient", from: "#1FB6A6", to: "#35C759", angle: 90 } }
];

export const publicIdHue = (publicId: string): number => parseInt(publicId.slice(1, 5), 16) % 360;

export const avatarPlaceholderColor = (publicId: string): string => `hsl(${publicIdHue(publicId)}, 70%, 55%)`;

export const avatarPlaceholderLetter = (displayName: string): string => {
  const letter = displayName.trim().charAt(0);
  return letter.length > 0 ? letter.toUpperCase() : "K";
};

export const isValidTimeZone = (value: string): boolean => {
  if (value.length === 0 || value.length > 64) {
    return false;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

export const clientTimeZone = (): string => {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return isValidTimeZone(zone) ? zone : "UTC";
};
