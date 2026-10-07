import { isErrorCode, type ApiErrorBody, type ErrorCode, type FieldErrors } from "@koda/shared/errors";
import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError, type ZodType } from "zod";

export const errorStatus: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  FIELD_REQUIRED: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  ID_GENERATION_FAILED: 500,
  INVALID_ORIGIN: 403,
  INVALID_CLIENT: 403,
  EMAIL_INVALID: 400,
  EMAIL_ALREADY_USED: 409,
  EMAIL_UNCHANGED: 400,
  REGISTRATION_TOKEN_INVALID: 400,
  REGISTRATION_STEP_INVALID: 400,
  CODE_INVALID: 400,
  CODE_EXPIRED: 400,
  CODE_ATTEMPTS_EXCEEDED: 429,
  CODE_COOLDOWN: 429,
  CODE_LIMIT_EXCEEDED: 429,
  TURNSTILE_FAILED: 400,
  CAPTCHA_REQUIRED: 400,
  INVALID_CREDENTIALS: 401,
  PASSWORD_INVALID: 400,
  PASSWORD_MISMATCH: 400,
  PASSWORD_SAME: 400,
  REFRESH_TOKEN_INVALID: 401,
  SESSION_NOT_FOUND: 404,
  PROFILE_ID_INVALID: 400,
  DISPLAY_NAME_INVALID: 400,
  BIO_TOO_LONG: 400,
  BANNER_INVALID: 400,
  MEDIA_TYPE_UNSUPPORTED: 415,
  MEDIA_TOO_LARGE: 413,
  FRIEND_SELF: 400,
  FRIEND_REQUEST_EXISTS: 409,
  FRIEND_REQUEST_LIMIT: 429,
  FRIEND_REQUESTS_DISABLED: 403,
  FRIEND_REQUEST_NOT_FOUND: 404,
  NOT_FRIENDS: 404,
  BLOCK_SELF: 400,
  BLOCK_EXISTS: 409,
  BLOCK_NOT_FOUND: 404,
  BLOCKED: 403,
  ACCOUNT_DELETED: 403,
  PRIVACY_INVALID: 400
};

export const englishMessage = (code: ErrorCode): string => code.toLowerCase().replaceAll("_", " ");

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly fields: FieldErrors | undefined;

  constructor(code: ErrorCode, fields?: FieldErrors) {
    super(englishMessage(code));
    this.name = "AppError";
    this.code = code;
    this.fields = fields;
  }
}

type IssueLike = {
  path: readonly PropertyKey[];
  message: string;
  input?: unknown;
};

const fieldCode = (issue: IssueLike): ErrorCode => {
  if (isErrorCode(issue.message)) {
    return issue.message;
  }
  if (issue.input === undefined) {
    return "FIELD_REQUIRED";
  }
  return "VALIDATION_FAILED";
};

const fieldErrors = (issues: readonly IssueLike[]): FieldErrors => {
  const result: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path.map((segment) => String(segment)).join(".") || "form";
    result[key] = fieldCode(issue);
  }
  return result;
};

export const validateInput = <T>(schema: ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (result.success) {
    return result.data;
  }
  throw new AppError("VALIDATION_FAILED", fieldErrors(result.error.issues));
};

export const errorBody = (error: AppError): ApiErrorBody => {
  if (error.fields === undefined) {
    return { code: error.code, message: error.message };
  }
  return { code: error.code, message: error.message, fields: error.fields };
};

export type LoggableError = {
  name: string;
  code: string | undefined;
  statusCode: number | undefined;
};

export const loggableError = (error: unknown): LoggableError => {
  if (error instanceof Error) {
    const candidate = error as FastifyError;
    return { name: error.name, code: candidate.code, statusCode: candidate.statusCode };
  }
  return { name: "UnknownError", code: undefined, statusCode: undefined };
};

export const registerErrorHandler = (app: FastifyInstance): void => {
  app.setNotFoundHandler(async (_request: FastifyRequest, reply: FastifyReply) => {
    await reply.status(404).send(errorBody(new AppError("NOT_FOUND")));
  });

  app.setErrorHandler(async (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof AppError) {
      await reply.status(errorStatus[error.code]).send(errorBody(error));
      return;
    }
    if (error instanceof ZodError) {
      await reply.status(400).send({
        code: "VALIDATION_FAILED",
        message: englishMessage("VALIDATION_FAILED"),
        fields: fieldErrors(error.issues)
      });
      return;
    }
    const status = typeof error.statusCode === "number" ? error.statusCode : 500;
    if (status === 413) {
      await reply.status(413).send(errorBody(new AppError("MEDIA_TOO_LARGE")));
      return;
    }
    if (status === 415) {
      await reply.status(415).send(errorBody(new AppError("MEDIA_TYPE_UNSUPPORTED")));
      return;
    }
    if (status === 400) {
      await reply.status(400).send(errorBody(new AppError("VALIDATION_FAILED")));
      return;
    }
    request.log.error({ err: loggableError(error) }, "unhandled request error");
    await reply.status(500).send(errorBody(new AppError("INTERNAL_ERROR")));
  });
};
