import { emailSchema, passwordSchema, resetPasswordConfirmInput } from "@koda/shared/auth";
import { ArrowLeft, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { confirmPasswordReset, requestPasswordReset } from "../api/auth.js";
import { ApiError } from "../api/http.js";
import { CodeInput } from "../components/CodeInput.js";
import { Field } from "../components/Field.js";
import { GlassButton } from "../components/GlassButton.js";
import { GlassInput } from "../components/GlassInput.js";
import { GlassPanel } from "../components/GlassPanel.js";
import { KodaLogo } from "../components/KodaLogo.js";
import { PasswordField } from "../components/PasswordField.js";
import { PasswordStrength } from "../components/PasswordStrength.js";
import { paths } from "../routes.js";
import { asErrorCode, errorText, strings, type ClientErrorCode } from "../strings.js";
import { toast } from "../store/toasts.js";

type RequestForm = {
  email: string;
};

type ConfirmForm = {
  code: string;
  password: string;
  passwordConfirmation: string;
};

export const ResetPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const request = useForm<RequestForm>({ mode: "onSubmit", defaultValues: { email: "" } });
  const confirm = useForm<ConfirmForm>({
    mode: "onChange",
    defaultValues: { code: "", password: "", passwordConfirmation: "" }
  });
  const password = confirm.watch("password");
  const code = confirm.watch("code");
  const ready =
    resetPasswordConfirmInput.safeParse({
      email: email ?? "",
      code,
      password,
      passwordConfirmation: confirm.watch("passwordConfirmation")
    }).success && score !== null && score >= strings.register.password.minScore;

  const onRequest = request.handleSubmit(async (values) => {
    setSending(true);
    try {
      await requestPasswordReset(values.email);
      setEmail(values.email);
      toast.success(strings.reset.sent);
    } catch (failure) {
      toast.error(errorText(failure instanceof ApiError ? failure.code : "NETWORK_ERROR"));
    } finally {
      setSending(false);
    }
  });

  const onConfirm = confirm.handleSubmit(async (values) => {
    if (email === null) {
      return;
    }
    try {
      await confirmPasswordReset({
        email,
        code: values.code,
        password: values.password,
        passwordConfirmation: values.passwordConfirmation
      });
      toast.success(strings.reset.done);
      navigate(paths.login, { replace: true });
    } catch (failure) {
      const failureCode: ClientErrorCode = failure instanceof ApiError ? failure.code : "NETWORK_ERROR";
      if (failure instanceof ApiError && failure.fields !== undefined) {
        for (const [field, failureValue] of Object.entries(failure.fields)) {
          if (field === "code" || field === "password" || field === "passwordConfirmation") {
            confirm.setError(field, { type: "server", message: failureValue });
          }
        }
      }
      toast.error(errorText(failureCode));
    }
  });

  return (
    <div className="screen-center">
      <GlassPanel variant="strong" className="register-card">
        <header className="register-head">
          <KodaLogo size={44} withWordmark />
          <p className="text-secondary">{strings.reset.subtitle}</p>
        </header>
        {email === null ? (
          <form className="register-form" onSubmit={onRequest} noValidate>
            <div className="register-title">
              <h1 className="title-3">{strings.reset.title}</h1>
              <p className="text-secondary">{strings.reset.text}</p>
            </div>
            <Field
              label={strings.reset.emailLabel}
              htmlFor="reset-email"
              hint={strings.reset.hint}
              error={asErrorCode(request.formState.errors.email?.message)}
            >
              <GlassInput
                id="reset-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="name@example.com"
                icon={Mail}
                invalid={request.formState.errors.email !== undefined}
                {...request.register("email", {
                  validate: (value) =>
                    emailSchema.safeParse(value).success ? true : (strings.login.emailRequired as string)
                })}
              />
            </Field>
            <GlassButton type="submit" variant="primary" block loading={sending}>
              {strings.reset.submit}
            </GlassButton>
            <Link className="register-alt" to={paths.login}>
              <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" /> {strings.reset.back}
            </Link>
          </form>
        ) : (
          <form className="register-form" onSubmit={onConfirm} noValidate>
            <div className="register-title">
              <h1 className="title-3">{strings.reset.confirmTitle}</h1>
              <p className="text-secondary">
                {strings.reset.confirmText} <span className="text-mono">{email}</span>
              </p>
            </div>
            <CodeInput
              value={code}
              invalid={confirm.formState.errors.code !== undefined}
              onChange={(value) => confirm.setValue("code", value, { shouldValidate: true })}
            />
            <Field label={strings.reset.passwordLabel} htmlFor="reset-password">
              <PasswordField
                id="reset-password"
                autoComplete="new-password"
                {...confirm.register("password", {
                  validate: (value) => (passwordSchema.safeParse(value).success ? true : "PASSWORD_INVALID")
                })}
              />
            </Field>
            <PasswordStrength password={password} onScore={setScore} />
            <Field label={strings.reset.confirmationLabel} htmlFor="reset-password-confirmation">
              <PasswordField
                id="reset-password-confirmation"
                autoComplete="new-password"
                {...confirm.register("passwordConfirmation", {
                  validate: (value) =>
                    value === confirm.getValues("password") ? true : "PASSWORD_MISMATCH"
                })}
              />
            </Field>
            <GlassButton type="submit" variant="primary" block loading={confirm.formState.isSubmitting} disabled={!ready}>
              {strings.reset.confirmSubmit}
            </GlassButton>
            <GlassButton variant="ghost" onClick={() => setEmail(null)}>
              {strings.reset.otherEmail}
            </GlassButton>
          </form>
        )}
      </GlassPanel>
    </div>
  );
};
