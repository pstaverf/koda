import { env } from "../env.js";
import { AppError } from "./errors.js";

const verifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileResponse = {
  success?: boolean;
};

const verifyTimeoutMs = 5000;

const requestVerification = async (body: URLSearchParams): Promise<TurnstileResponse> => {
  try {
    const response = await fetch(verifyUrl, { method: "POST", body, signal: AbortSignal.timeout(verifyTimeoutMs) });
    if (!response.ok) {
      return {};
    }
    return (await response.json()) as TurnstileResponse;
  } catch {
    return {};
  }
};

export const verifyTurnstile = async (token: string, ip: string | null): Promise<void> => {
  const body = new URLSearchParams({ secret: env.turnstileSecretKey, response: token });
  if (ip !== null) {
    body.set("remoteip", ip);
  }
  const result = await requestVerification(body);
  if (result.success !== true) {
    throw new AppError("TURNSTILE_FAILED");
  }
};
