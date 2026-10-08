import {
  CODE_EMAIL_HOURLY_LIMIT,
  CODE_IP_HOURLY_LIMIT,
  CODE_LENGTH,
  CODE_MAX_ATTEMPTS,
  CODE_RESEND_COOLDOWN_SECONDS,
  CODE_TTL_SECONDS
} from "@koda/shared/constants";
import { randomInt } from "node:crypto";
import { AppError } from "../lib/errors.js";
import { hashCode, randomHex, safeEqualHex } from "../lib/hash.js";
import { consumeLimit } from "../lib/rateLimit.js";
import { emailChangeCodeMail, passwordResetCodeMail, registrationCodeMail, type MailContent } from "../mail/templates.js";
import { redis } from "../redis/client.js";

export const codePurposes = ["register", "reset", "change_email"] as const;
export type CodePurpose = (typeof codePurposes)[number];

type CodeRecord = {
  hash: string;
  salt: string;
  purpose: CodePurpose;
  attempts: number;
};

const hourSeconds = 3600;

const codeKey = (emailHash: string): string => `code:${emailHash}`;
const cooldownKey = (emailHash: string): string => `cooldown:code:${emailHash}`;
const emailLimitKey = (emailHash: string): string => `rl:code:email:${emailHash}`;
const ipLimitKey = (ip: string): string => `rl:code:ip:${ip}`;

const mailForPurpose: Record<CodePurpose, (code: string) => MailContent> = {
  register: registrationCodeMail,
  reset: passwordResetCodeMail,
  change_email: emailChangeCodeMail
};

export const codeMail = (purpose: CodePurpose, code: string): MailContent => mailForPurpose[purpose](code);

export const createCode = (): string => randomInt(0, 10 ** CODE_LENGTH).toString().padStart(CODE_LENGTH, "0");

export const consumeCodeLimits = async (emailHash: string, ip: string): Promise<boolean> => {
  const [emailAllowed, ipAllowed] = await Promise.all([
    consumeLimit(emailLimitKey(emailHash), CODE_EMAIL_HOURLY_LIMIT, hourSeconds),
    consumeLimit(ipLimitKey(ip), CODE_IP_HOURLY_LIMIT, hourSeconds)
  ]);
  return emailAllowed && ipAllowed;
};

export const issueCode = async (emailHash: string, purpose: CodePurpose): Promise<string> => {
  const code = createCode();
  const salt = randomHex(16);
  const record: CodeRecord = { hash: hashCode(code, salt), salt, purpose, attempts: 0 };
  await redis.set(codeKey(emailHash), JSON.stringify(record), "EX", CODE_TTL_SECONDS);
  return code;
};

export const startCodeCooldown = async (emailHash: string): Promise<void> => {
  await redis.set(cooldownKey(emailHash), "1", "EX", CODE_RESEND_COOLDOWN_SECONDS);
};

export const cooldownActive = async (emailHash: string): Promise<boolean> =>
  (await redis.ttl(cooldownKey(emailHash))) > 0;

export const assertCooldownPassed = async (emailHash: string): Promise<void> => {
  if (await cooldownActive(emailHash)) {
    throw new AppError("CODE_COOLDOWN");
  }
};

export type CodeCheck = "valid" | "invalid" | "expired" | "exceeded";

const attemptScript = `
local raw = redis.call("GET", KEYS[1])
if not raw then
  return {"missing"}
end
local record = cjson.decode(raw)
if record.purpose ~= ARGV[1] then
  return {"mismatch"}
end
record.attempts = record.attempts + 1
if record.attempts > tonumber(ARGV[2]) then
  redis.call("DEL", KEYS[1])
  return {"exceeded"}
end
redis.call("SET", KEYS[1], cjson.encode(record), "KEEPTTL")
return {"pending", record.hash, record.salt, tostring(record.attempts)}
`;

const parseAttempt = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => String(item)) : [];

export const checkCode = async (emailHash: string, code: string, purpose: CodePurpose): Promise<CodeCheck> => {
  const key = codeKey(emailHash);
  const [state, hash, salt, attempts] = parseAttempt(
    await redis.eval(attemptScript, 1, key, purpose, String(CODE_MAX_ATTEMPTS))
  );
  if (state === "missing") {
    return "expired";
  }
  if (state === "exceeded") {
    return "exceeded";
  }
  if (state !== "pending" || hash === undefined || salt === undefined || attempts === undefined) {
    return "invalid";
  }
  if (safeEqualHex(hash, hashCode(code, salt))) {
    const removed = await redis.del(key);
    return removed === 1 ? "valid" : "invalid";
  }
  if (Number(attempts) >= CODE_MAX_ATTEMPTS) {
    await redis.del(key);
    return "exceeded";
  }
  return "invalid";
};

const codeCheckErrors = {
  invalid: "CODE_INVALID",
  expired: "CODE_EXPIRED",
  exceeded: "CODE_ATTEMPTS_EXCEEDED"
} as const;

export const verifyCode = async (emailHash: string, code: string, purpose: CodePurpose): Promise<void> => {
  const result = await checkCode(emailHash, code, purpose);
  if (result !== "valid") {
    throw new AppError(codeCheckErrors[result]);
  }
};
