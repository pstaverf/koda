import { DELETED_ACCOUNT_RETENTION_DAYS } from "@koda/shared/constants";
import { DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { and, eq, isNotNull, lt } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import cron, { type ScheduledTask } from "node-cron";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { env } from "../env.js";
import { loggableError } from "../lib/errors.js";
import { s3 } from "../media/storage.js";
import { presenceKey } from "../profile/service.js";
import { redis } from "../redis/client.js";

const hourlyExpression = "0 * * * *";
const batchSize = 100;
const dayMs = 24 * 60 * 60 * 1000;

const deletePrefix = async (prefix: string): Promise<void> => {
  let continuationToken: string | undefined;
  do {
    const listed = await s3.send(
      new ListObjectsV2Command({ Bucket: env.s3.bucket, Prefix: prefix, ContinuationToken: continuationToken })
    );
    const objects = (listed.Contents ?? []).flatMap((item) => (item.Key === undefined ? [] : [{ Key: item.Key }]));
    if (objects.length > 0) {
      await s3.send(new DeleteObjectsCommand({ Bucket: env.s3.bucket, Delete: { Objects: objects, Quiet: true } }));
    }
    continuationToken = listed.IsTruncated === true ? listed.NextContinuationToken : undefined;
  } while (continuationToken !== undefined);
};

const purgeUser = async (userId: string, cutoff: Date): Promise<void> => {
  await deletePrefix(`avatars/${userId}/`);
  await deletePrefix(`banners/${userId}/`);
  await db.delete(users).where(and(eq(users.id, userId), isNotNull(users.deletedAt), lt(users.deletedAt, cutoff)));
  await redis.del(presenceKey(userId), `presence:pg_write:${userId}`, `email_change:${userId}`);
};

export const purgeDeletedAccounts = async (log: FastifyBaseLogger): Promise<number> => {
  const cutoff = new Date(Date.now() - DELETED_ACCOUNT_RETENTION_DAYS * dayMs);
  const failed = new Set<string>();
  let purged = 0;
  for (;;) {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(isNotNull(users.deletedAt), lt(users.deletedAt, cutoff)))
      .limit(batchSize + failed.size);
    const pending = rows.filter((row) => !failed.has(row.id));
    if (pending.length === 0) {
      return purged;
    }
    for (const row of pending) {
      try {
        await purgeUser(row.id, cutoff);
        purged += 1;
      } catch (error) {
        failed.add(row.id);
        log.error({ err: loggableError(error) }, "deleted account purge failed");
      }
    }
  }
};

export const startCleanupJob = (log: FastifyBaseLogger): ScheduledTask =>
  cron.schedule(
    hourlyExpression,
    async () => {
      try {
        const purged = await purgeDeletedAccounts(log);
        if (purged > 0) {
          log.info({ purged }, "deleted accounts purged");
        }
      } catch (error) {
        log.error({ err: loggableError(error) }, "cleanup job failed");
      }
    },
    { name: "cleanup-deleted-accounts", noOverlap: true }
  );
