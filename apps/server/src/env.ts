import { z } from "zod";

const csvList = z
  .string()
  .min(1)
  .transform((value) => value.split(",").map((item) => item.trim()).filter((item) => item.length > 0));

const booleanFlag = z.enum(["true", "false"]).transform((value) => value === "true");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  HOST: z.string().min(1).optional(),
  PORT: z.coerce.number().int().min(1).max(65535).optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(86400).optional(),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).optional(),
  CODE_HASH_SECRET: z.string().min(32),
  EMAIL_HASH_SECRET: z.string().min(32),
  ARGON2_MEMORY_KIB: z.coerce.number().int().min(8192).optional(),
  ARGON2_TIME_COST: z.coerce.number().int().min(2).max(10).optional(),
  ARGON2_PARALLELISM: z.coerce.number().int().min(1).max(4).optional(),
  ALLOWED_ORIGINS: csvList,
  ALLOWED_CLIENTS: csvList.optional(),
  COOKIE_SECURE: booleanFlag.optional(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535),
  SMTP_SECURE: booleanFlag.optional(),
  SMTP_USER: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  SMTP_FROM: z.string().min(1),
  S3_ENDPOINT: z.string().min(1),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: booleanFlag.optional(),
  S3_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(604800).optional(),
  TURNSTILE_SECRET_KEY: z.string().min(1)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  throw new Error(`Invalid environment configuration: ${problems}`);
}

const raw = parsed.data;

export const env = {
  nodeEnv: raw.NODE_ENV ?? "development",
  isProduction: (raw.NODE_ENV ?? "development") === "production",
  isTest: raw.NODE_ENV === "test",
  host: raw.HOST ?? "0.0.0.0",
  port: raw.PORT ?? 4000,
  logLevel: raw.LOG_LEVEL ?? "info",
  databaseUrl: raw.DATABASE_URL,
  redisUrl: raw.REDIS_URL,
  accessTokenSecret: raw.ACCESS_TOKEN_SECRET,
  accessTokenTtlSeconds: raw.ACCESS_TOKEN_TTL_SECONDS ?? 900,
  refreshTokenTtlDays: raw.REFRESH_TOKEN_TTL_DAYS ?? 30,
  codeHashSecret: raw.CODE_HASH_SECRET,
  emailHashSecret: raw.EMAIL_HASH_SECRET,
  argon2: {
    memoryKib: raw.ARGON2_MEMORY_KIB ?? 19456,
    timeCost: raw.ARGON2_TIME_COST ?? 2,
    parallelism: raw.ARGON2_PARALLELISM ?? 1
  },
  allowedOrigins: raw.ALLOWED_ORIGINS,
  allowedClients: raw.ALLOWED_CLIENTS ?? ["web"],
  cookieSecure: raw.COOKIE_SECURE ?? false,
  smtp: {
    host: raw.SMTP_HOST,
    port: raw.SMTP_PORT,
    secure: raw.SMTP_SECURE ?? false,
    user: raw.SMTP_USER,
    password: raw.SMTP_PASSWORD,
    from: raw.SMTP_FROM
  },
  s3: {
    endpoint: raw.S3_ENDPOINT,
    region: raw.S3_REGION,
    bucket: raw.S3_BUCKET,
    accessKey: raw.S3_ACCESS_KEY,
    secretKey: raw.S3_SECRET_KEY,
    forcePathStyle: raw.S3_FORCE_PATH_STYLE ?? true,
    urlTtlSeconds: raw.S3_URL_TTL_SECONDS ?? 3600
  },
  turnstileSecretKey: raw.TURNSTILE_SECRET_KEY
};

export type Env = typeof env;
