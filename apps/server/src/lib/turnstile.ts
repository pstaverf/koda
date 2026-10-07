import { env } from "../env.js";
import { AppError } from "./errors.js";

const verifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileResponse = {
  success?: boolean;
};

export const verifyTurnstile = async (token: string, ip: string | null): Promise<void> => {
  const body = new URLSearchParams({ secret: env.turnstileSecretKey, response: token });
  if (ip !== null) {
    body.set("remoteip", ip);
  }
  const response = await fetch(verifyUrl, { method: "POST", body });
  if (!response.ok) {
    throw new AppError("TURNSTILE_FAILED");
  }
  const result = (await response.json()) as TurnstileResponse;
  if (result.success !== true) {
    throw new AppError("TURNSTILE_FAILED");
  }
};
