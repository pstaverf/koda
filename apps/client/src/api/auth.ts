import type {
  AuthSession,
  CodeVerified,
  LoginInput,
  RegisterPasswordInput,
  ResetPasswordConfirmInput
} from "@koda/shared/auth";
import type { CurrentUser } from "@koda/shared/profile";
import { useSessionStore } from "../store/session.js";
import { ApiError, http } from "./http.js";

const registrationTokenKey = "koda:registration-token";
const registrationEmailKey = "koda:registration-email";
const resendWindowKey = "koda:registration-resend-until";

export const storeRegistrationToken = (token: string): void => {
  sessionStorage.setItem(registrationTokenKey, token);
};

export const readRegistrationToken = (): string | null => sessionStorage.getItem(registrationTokenKey);

export const clearRegistrationToken = (): void => {
  sessionStorage.removeItem(registrationTokenKey);
};

export const storeRegistrationEmail = (email: string): void => {
  sessionStorage.setItem(registrationEmailKey, email);
};

export const readRegistrationEmail = (): string | null => sessionStorage.getItem(registrationEmailKey);

export const clearRegistrationEmail = (): void => {
  sessionStorage.removeItem(registrationEmailKey);
};

export const startResendWindow = (seconds: number): void => {
  sessionStorage.setItem(resendWindowKey, String(Date.now() + seconds * 1000));
};

export const readResendDeadline = (): number => {
  const raw = sessionStorage.getItem(resendWindowKey);
  const parsed = raw === null ? 0 : Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const applySession = (session: AuthSession): void => {
  useSessionStore.getState().setSession(session.accessToken, session.user);
};

export const requestRegistrationCode = async (email: string): Promise<void> => {
  const ack = await http.post<{ ok?: boolean }>("/auth/register/email", { email }, { auth: false });
  if (ack.ok !== true) {
    throw new ApiError("UNKNOWN_ERROR", 200, "unexpected response");
  }
};

export const verifyRegistrationCode = (code: string): Promise<CodeVerified> =>
  http.post<CodeVerified>("/auth/register/code/verify", { code }, { auth: false });

export const resendRegistrationCode = (): Promise<null> =>
  http.post<null>("/auth/register/code/resend", {}, { auth: false });

export const registerPassword = async (input: RegisterPasswordInput): Promise<AuthSession> => {
  const session = await http.post<AuthSession>("/auth/register/password", input, { auth: false });
  applySession(session);
  return session;
};

export const login = async (input: LoginInput): Promise<AuthSession> => {
  const session = await http.post<AuthSession>("/auth/login", input, { auth: false });
  applySession(session);
  return session;
};

export const logout = async (): Promise<void> => {
  try {
    await http.post<null>("/auth/logout", {});
  } finally {
    useSessionStore.getState().clear();
  }
};

export const logoutAll = async (): Promise<void> => {
  try {
    await http.post<null>("/auth/logout-all", {});
  } finally {
    useSessionStore.getState().clear();
  }
};

export const requestPasswordReset = (email: string): Promise<null> =>
  http.post<null>("/auth/reset/request", { email }, { auth: false });

export const confirmPasswordReset = (input: ResetPasswordConfirmInput): Promise<null> =>
  http.post<null>("/auth/reset/confirm", input, { auth: false });

export const finishRegistration = async (displayName: string): Promise<CurrentUser> => {
  const result = await http.post<{ user: CurrentUser }>("/auth/register/name", { displayName });
  useSessionStore.getState().setUser(result.user);
  return result.user;
};
