import type { AuthSession } from "@koda/shared/auth";
import { API_PREFIX, CLIENT_HEADER, TIMEZONE_HEADER } from "@koda/shared/constants";
import { isErrorCode, type FieldErrors } from "@koda/shared/errors";
import { getTimeZone } from "../lib/timezone.js";
import { strings, type ClientErrorCode } from "../strings.js";
import { useSessionStore } from "../store/session.js";
import { toast } from "../store/toasts.js";

export const clientId = "web";

export class ApiError extends Error {
  readonly code: ClientErrorCode;
  readonly status: number;
  readonly fields: FieldErrors | undefined;

  constructor(code: ClientErrorCode, status: number, message: string, fields?: FieldErrors) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
};

const refreshPath = "/auth/refresh";
const supersededRetryDelayMs = 400;

let refreshInFlight: Promise<boolean> | null = null;
let signOutHandlers: (() => void)[] = [];

export const onSignOut = (handler: () => void): (() => void) => {
  signOutHandlers = [...signOutHandlers, handler];
  return () => {
    signOutHandlers = signOutHandlers.filter((item) => item !== handler);
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const parseFields = (value: unknown): FieldErrors | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const fields: FieldErrors = {};
  for (const [key, code] of Object.entries(value)) {
    if (typeof code === "string" && isErrorCode(code)) {
      fields[key] = code;
    }
  }
  return fields;
};

const readJson = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (text.length === 0) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
};

const toApiError = (status: number, body: unknown): ApiError => {
  if (isRecord(body) && typeof body["code"] === "string" && isErrorCode(body["code"])) {
    const message = typeof body["message"] === "string" ? body["message"] : body["code"];
    return new ApiError(body["code"], status, message, parseFields(body["fields"]));
  }
  return new ApiError(status >= 500 ? "INTERNAL_ERROR" : "UNKNOWN_ERROR", status, `http ${status}`);
};

const unwrap = <T>(body: unknown): T => {
  if (isRecord(body) && "data" in body) {
    return body["data"] as T;
  }
  return body as T;
};

const buildHeaders = (body: unknown, accessToken: string | null): Headers => {
  const headers = new Headers();
  headers.set(CLIENT_HEADER, clientId);
  headers.set(TIMEZONE_HEADER, getTimeZone());
  headers.set("Accept", "application/json");
  if (body !== undefined && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken !== null) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return headers;
};

const send = async (path: string, options: RequestOptions, accessToken: string | null): Promise<Response> => {
  const body = options.body;
  const init: RequestInit = {
    method: options.method ?? "GET",
    headers: buildHeaders(body, accessToken),
    credentials: "include"
  };
  if (body !== undefined) {
    init.body = body instanceof FormData ? body : JSON.stringify(body);
  }
  if (options.signal !== undefined) {
    init.signal = options.signal;
  }
  try {
    return await fetch(`${API_PREFIX}${path}`, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ApiError("NETWORK_ERROR", 0, "network error");
  }
};

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const refreshOnce = async (): Promise<AuthSession | null> => {
  const response = await send(refreshPath, { method: "POST" }, null);
  if (!response.ok) {
    return null;
  }
  return unwrap<AuthSession>(await readJson(response));
};

const performRefresh = async (): Promise<boolean> => {
  try {
    const session = (await refreshOnce()) ?? (await wait(supersededRetryDelayMs).then(refreshOnce));
    if (session === null) {
      return false;
    }
    useSessionStore.getState().setSession(session.accessToken, session.user);
    return true;
  } catch {
    return false;
  }
};

export const refreshSession = (): Promise<boolean> => {
  if (refreshInFlight === null) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

export const signOutLocally = (notify: boolean): void => {
  const wasAuthenticated = useSessionStore.getState().status === "authenticated";
  useSessionStore.getState().clear();
  for (const handler of signOutHandlers) {
    handler();
  }
  if (notify && wasAuthenticated) {
    toast.info(strings.session.expired);
  }
};

export const restoreSession = async (): Promise<void> => {
  if (useSessionStore.getState().status !== "loading") {
    return;
  }
  const restored = await refreshSession();
  if (!restored) {
    useSessionStore.getState().clear();
  }
};

const isUnauthorized = (response: Response, body: unknown): boolean =>
  response.status === 401 && isRecord(body) && body["code"] === "UNAUTHORIZED";

export const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const useAuth = options.auth ?? true;
  const token = useAuth ? useSessionStore.getState().accessToken : null;
  let response = await send(path, options, token);
  let body = await readJson(response);
  if (useAuth && isUnauthorized(response, body)) {
    const refreshed = await refreshSession();
    if (!refreshed) {
      signOutLocally(true);
      throw toApiError(response.status, body);
    }
    response = await send(path, options, useSessionStore.getState().accessToken);
    body = await readJson(response);
    if (isUnauthorized(response, body)) {
      signOutLocally(true);
    }
  }
  if (!response.ok) {
    throw toApiError(response.status, body);
  }
  return unwrap<T>(body);
};

export const http = {
  get: <T>(path: string, options: Omit<RequestOptions, "method" | "body"> = {}): Promise<T> =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}): Promise<T> =>
    request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}): Promise<T> =>
    request<T>(path, { ...options, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}): Promise<T> =>
    request<T>(path, { ...options, method: "PUT", body }),
  delete: <T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}): Promise<T> =>
    request<T>(path, { ...options, method: "DELETE", body })
};
