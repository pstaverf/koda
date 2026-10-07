import { buildApp } from "./app.js";
import { closeDatabase, pingDatabase } from "./db/client.js";
import { env } from "./env.js";
import { closeRedis, pingRedis } from "./redis/client.js";

const app = buildApp();

const shutdown = async (signal: string): Promise<void> => {
  app.log.info({ signal }, "shutting down");
  await app.close();
  await closeRedis();
  await closeDatabase();
  process.exit(0);
};

const start = async (): Promise<void> => {
  await pingDatabase();
  await pingRedis();
  await app.listen({ host: env.host, port: env.port });
  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
};

start().catch((error: unknown) => {
  app.log.error({ err: error }, "startup failed");
  process.exit(1);
});
