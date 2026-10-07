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

export const assertCooldownPassed = async (emailHash: string): Promise<void> => {
  const ttl = await redis.ttl(cooldownKey(emailHash));
  if (ttl > 0) {
    throw new AppError("CODE_COOLDOWN");
  }
};

export const verifyCode = async (emailHash: string, code: string, purpose: CodePurpose): Promise<void> => {
  const raw = await redis.get(codeKey(emailHash));
  if (raw === null) {
    throw new AppError("CODE_EXPIRED");
  }
  const record = JSON.parse(raw) as CodeRecord;
  if (record.purpose !== purpose) {
    throw new AppError("CODE_INVALID");
  }
  if (!safeEqualHex(record.hash, hashCode(code, record.salt))) {
    const attempts = record.attempts + 1;
    if (attempts >= CODE_MAX_ATTEMPTS) {
      await redis.del(codeKey(emailHash));
      throw new AppError("CODE_ATTEMPTS_EXCEEDED");
    }
    await redis.set(codeKey(emailHash), JSON.stringify({ ...record, attempts }), "KEEPTTL");
    throw new AppError("CODE_INVALID");
  }
  await redis.del(codeKey(emailHash));
};
