import { z } from "zod";

export const sessionInfoSchema = z.object({
  id: z.uuid(),
  userAgent: z.string().nullable(),
  ip: z.string().nullable(),
  createdAt: z.string(),
  lastUsedAt: z.string(),
  current: z.boolean()
});
export type SessionInfo = z.infer<typeof sessionInfoSchema>;

export const sessionListSchema = z.object({
  sessions: z.array(sessionInfoSchema)
});
export type SessionList = z.infer<typeof sessionListSchema>;

export const sessionParamsSchema = z.object({
  sessionId: z.uuid({ error: "SESSION_NOT_FOUND" })
});
export type SessionParams = z.infer<typeof sessionParamsSchema>;
