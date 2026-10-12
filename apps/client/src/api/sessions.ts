import type { SessionList } from "@koda/shared/sessions";
import { http } from "./http.js";

export const fetchSessions = (): Promise<SessionList> => http.get<SessionList>("/sessions");

export const revokeSession = (sessionId: string): Promise<null> =>
  http.delete<null>(`/sessions/${encodeURIComponent(sessionId)}`);
