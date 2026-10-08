import { API_PREFIX, BANNER_MAX_BYTES, CLIENT_HEADER, TIMEZONE_HEADER } from "@koda/shared/constants";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import Fastify, { type FastifyInstance } from "fastify";
import { registerAuthRoutes } from "./auth/routes.js";
import { registerBlockRoutes } from "./blocks/routes.js";
import { pingDatabase } from "./db/client.js";
import { registerFriendRoutes } from "./friends/routes.js";
import { registerMediaRoutes } from "./media/routes.js";
import { registerProfileRoutes } from "./profile/routes.js";
import { env } from "./env.js";
import { loggableError, registerErrorHandler } from "./lib/errors.js";
import { pingRedis } from "./redis/client.js";

const jsonBodyLimitBytes = 102400;

export const buildApp = (): FastifyInstance => {
  const app = Fastify({
    trustProxy: env.trustProxy,
    bodyLimit: jsonBodyLimitBytes,
    logger: {
      level: env.logLevel,
      redact: ["req.headers.authorization", "req.headers.cookie", "res.headers.set-cookie"]
    }
  });

  app.register(helmet, { contentSecurityPolicy: false });
  app.register(cors, {
    origin: env.allowedOrigins,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", CLIENT_HEADER, TIMEZONE_HEADER],
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"]
  });
  app.register(cookie);
  app.register(multipart, { limits: { fileSize: BANNER_MAX_BYTES, files: 1 } });

  registerErrorHandler(app);

  app.get("/healthz", async () => ({ status: "ok" }));

  app.get("/readyz", async (request, reply) => {
    try {
      await pingDatabase();
      await pingRedis();
      return { status: "ready" };
    } catch (error) {
      request.log.error({ err: loggableError(error) }, "readiness check failed");
      return reply.status(503).send({ status: "unavailable" });
    }
  });

  app.register(registerAuthRoutes, { prefix: API_PREFIX });
  app.register(registerProfileRoutes, { prefix: API_PREFIX });
  app.register(registerMediaRoutes, { prefix: API_PREFIX });
  app.register(registerFriendRoutes, { prefix: API_PREFIX });
  app.register(registerBlockRoutes, { prefix: API_PREFIX });

  return app;
};
