import { z } from "zod";
import { CODE_LENGTH, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "./constants.js";
import { displayNameSchema, type CurrentUser } from "./profile.js";

const codePattern = new RegExp(`^\\d{${CODE_LENGTH}}$`);
const registrationTokenPattern = /^[A-Za-z0-9_-]{32,128}$/;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, { error: "EMAIL_INVALID" })
  .pipe(z.email({ error: "EMAIL_INVALID" }));

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, { error: "PASSWORD_INVALID" })
  .max(MAX_PASSWORD_LENGTH, { error: "PASSWORD_INVALID" });

export const codeSchema = z.string().regex(codePattern, { error: "CODE_INVALID" });

export const registrationTokenSchema = z
  .string()
  .regex(registrationTokenPattern, { error: "REGISTRATION_TOKEN_INVALID" });

export const turnstileTokenSchema = z.string().min(1, { error: "TURNSTILE_FAILED" }).max(4096, { error: "TURNSTILE_FAILED" });

export const registrationSteps = ["email", "code", "password", "photo", "name"] as const;
export type RegistrationStep = (typeof registrationSteps)[number];

export const registerEmailInput = z.object({
  email: emailSchema
});
export type RegisterEmailInput = z.infer<typeof registerEmailInput>;

export const verifyCodeInput = z.object({
  code: codeSchema
});
export type VerifyCodeInput = z.infer<typeof verifyCodeInput>;

export const registerPasswordInput = z
  .object({
    registrationToken: registrationTokenSchema,
    password: passwordSchema,
    passwordConfirmation: z.string().min(1, { error: "FIELD_REQUIRED" }),
    turnstileToken: turnstileTokenSchema
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    error: "PASSWORD_MISMATCH",
    path: ["passwordConfirmation"]
  });
export type RegisterPasswordInput = z.infer<typeof registerPasswordInput>;

export const resendCodeInput = z.object({});
export type ResendCodeInput = z.infer<typeof resendCodeInput>;

export const finishRegistrationInput = z.object({
  displayName: displayNameSchema
});
export type FinishRegistrationInput = z.infer<typeof finishRegistrationInput>;

export const loginInput = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "FIELD_REQUIRED" }).max(MAX_PASSWORD_LENGTH, { error: "INVALID_CREDENTIALS" }),
  turnstileToken: turnstileTokenSchema.optional()
});
export type LoginInput = z.infer<typeof loginInput>;

export const resetPasswordRequestInput = z.object({
  email: emailSchema
});
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestInput>;

export const resetPasswordConfirmInput = z
  .object({
    email: emailSchema,
    code: codeSchema,
    password: passwordSchema,
    passwordConfirmation: z.string().min(1, { error: "FIELD_REQUIRED" })
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    error: "PASSWORD_MISMATCH",
    path: ["passwordConfirmation"]
  });
export type ResetPasswordConfirmInput = z.infer<typeof resetPasswordConfirmInput>;

export const changePasswordInput = z
  .object({
    currentPassword: z.string().min(1, { error: "FIELD_REQUIRED" }),
    password: passwordSchema,
    passwordConfirmation: z.string().min(1, { error: "FIELD_REQUIRED" })
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    error: "PASSWORD_MISMATCH",
    path: ["passwordConfirmation"]
  })
  .refine((value) => value.currentPassword !== value.password, {
    error: "PASSWORD_SAME",
    path: ["password"]
  });
export type ChangePasswordInput = z.infer<typeof changePasswordInput>;

export const changeEmailInput = z.object({
  email: emailSchema
});
export type ChangeEmailInput = z.infer<typeof changeEmailInput>;

export const confirmEmailInput = z.object({
  email: emailSchema,
  code: codeSchema
});
export type ConfirmEmailInput = z.infer<typeof confirmEmailInput>;

export const deleteAccountInput = z.object({
  password: z.string().min(1, { error: "FIELD_REQUIRED" })
});
export type DeleteAccountInput = z.infer<typeof deleteAccountInput>;

export type CodeVerified = {
  registrationToken: string;
};

export type AuthSession = {
  accessToken: string;
  user: CurrentUser;
};
