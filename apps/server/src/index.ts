import type { ScheduledTask } from "node-cron";
import { buildApp } from "./app.js";
import { closeDatabase, pingDatabase } from "./db/client.js";
import { env } from "./env.js";
import { startCleanupJob } from "./jobs/cleanup.js";
import { loggableError } from "./lib/errors.js";
import { closeRedis, pingRedis } from "./redis/client.js";
import { handleUserEvent } from "./ws/friends.js";
import { closeHub, startHub } from "./ws/hub.js";
import { broadcastPresenceChange } from "./ws/presence.js";

const app = buildApp();
let cleanupTask: ScheduledTask | null = null;
let shuttingDown = false;

const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  app.log.info({ signal }, "shutting down");
  try {
    if (cleanupTask !== null) {
      await cleanupTask.destroy();
    }
    await closeHub();
    await app.close();
    await closeRedis();
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    app.log.error({ err: loggableError(error) }, "shutdown failed");
    process.exit(1);
  }
};

const start = async (): Promise<void> => {
  await pingDatabase();
  await pingRedis();
  await startHub({ onUserEvent: handleUserEvent, onPresenceChanged: broadcastPresenceChange });
  await app.listen({ host: env.host, port: env.port });
  cleanupTask = startCleanupJob(app.log);
  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
};

start().catch((error: unknown) => {
  app.log.error({ err: loggableError(error) }, "startup failed");
  process.exit(1);
});
