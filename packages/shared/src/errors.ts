export const errorCodes = [
  "VALIDATION_FAILED",
  "FIELD_REQUIRED",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
  "ID_GENERATION_FAILED",
  "INVALID_ORIGIN",
  "INVALID_CLIENT",
  "EMAIL_INVALID",
  "EMAIL_ALREADY_USED",
  "EMAIL_UNCHANGED",
  "REGISTRATION_TOKEN_INVALID",
  "REGISTRATION_STEP_INVALID",
  "CODE_INVALID",
  "CODE_EXPIRED",
  "CODE_ATTEMPTS_EXCEEDED",
  "CODE_COOLDOWN",
  "CODE_LIMIT_EXCEEDED",
  "TURNSTILE_FAILED",
  "CAPTCHA_REQUIRED",
  "INVALID_CREDENTIALS",
  "PASSWORD_INVALID",
  "PASSWORD_MISMATCH",
  "PASSWORD_SAME",
  "REFRESH_TOKEN_INVALID",
  "SESSION_NOT_FOUND",
  "PROFILE_ID_INVALID",
  "DISPLAY_NAME_INVALID",
  "BIO_TOO_LONG",
  "BANNER_INVALID",
  "MEDIA_TYPE_UNSUPPORTED",
  "MEDIA_TOO_LARGE",
  "FRIEND_SELF",
  "FRIEND_REQUEST_EXISTS",
  "FRIEND_REQUEST_LIMIT",
  "FRIEND_REQUESTS_DISABLED",
  "FRIEND_REQUEST_NOT_FOUND",
  "NOT_FRIENDS",
  "BLOCK_SELF",
  "BLOCK_EXISTS",
  "BLOCK_NOT_FOUND",
  "BLOCKED",
  "ACCOUNT_DELETED",
  "PRIVACY_INVALID"
] as const;

export type ErrorCode = (typeof errorCodes)[number];

const knownCodes = new Set<string>(errorCodes);

export const isErrorCode = (value: string): value is ErrorCode => knownCodes.has(value);

export type FieldErrors = Record<string, ErrorCode>;

export type ApiErrorBody = {
  code: ErrorCode;
  message: string;
  fields?: FieldErrors;
};

export type ApiSuccess<T> = {
  data: T;
};

export type ApiEmpty = {
  data: null;
};

export type RegisterEmailAck = {
  ok: true;
};
