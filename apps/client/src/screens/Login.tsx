import { loginInput } from "@koda/shared/auth";
import { Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router";
import { login } from "../api/auth.js";
import { ApiError } from "../api/http.js";
import { Field } from "../components/Field.js";
import { GlassButton } from "../components/GlassButton.js";
import { GlassInput } from "../components/GlassInput.js";
import { GlassPanel } from "../components/GlassPanel.js";
import { KodaLogo } from "../components/KodaLogo.js";
import { PasswordField } from "../components/PasswordField.js";
import { Turnstile } from "../components/Turnstile.js";
import { paths } from "../routes.js";
import { asErrorCode, errorText, strings, type ClientErrorCode } from "../strings.js";
import { useSessionStore } from "../store/session.js";
import { toast } from "../store/toasts.js";

type LoginForm = {
  email: string;
  password: string;
};

type RedirectState = {
  from?: string;
};

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState } = useForm<LoginForm>({
    mode: "onSubmit",
    defaultValues: { email: "", password: "" }
  });

  const goNext = (): void => {
    const user = useSessionStore.getState().user;
    if (user !== null && user.displayName === null) {
      navigate(paths.registerPhoto, { replace: true });
      return;
    }
    const state = location.state as RedirectState | null;
    const target = typeof state?.from === "string" && state.from.startsWith("/") ? state.from : paths.profile;
    navigate(target, { replace: true });
  };

  const onSubmit = handleSubmit(async (values) => {
    const parsed = loginInput.safeParse({
      email: values.email,
      password: values.password,
      ...(turnstileToken === null ? {} : { turnstileToken })
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      if (issue !== undefined && issue.path[0] === "email") {
        setError("email", { type: "validate", message: issue.message });
        return;
      }
      toast.error(errorText("VALIDATION_FAILED"));
      return;
    }
    try {
      await login(parsed.data);
      toast.success(strings.login.welcome);
      goNext();
    } catch (failure) {
      const failureCode: ClientErrorCode = failure instanceof ApiError ? failure.code : "NETWORK_ERROR";
      if (failureCode === "CAPTCHA_REQUIRED") {
        setCaptchaRequired(true);
        setTurnstileToken(null);
        setTurnstileKey((value) => value + 1);
        toast.info(strings.login.captchaNeeded);
        return;
      }
      if (failureCode === "TURNSTILE_FAILED") {
        setTurnstileToken(null);
        setTurnstileKey((value) => value + 1);
      }
      toast.error(errorText(failureCode));
    }
  });

  const emailError = asErrorCode(formState.errors.email?.message);

  return (
    <div className="screen-center">
      <GlassPanel variant="strong" className="register-card">
        <header className="register-head">
          <KodaLogo size={44} withWordmark />
          <p className="text-secondary">{strings.login.subtitle}</p>
        </header>
        <form className="register-form" onSubmit={onSubmit} noValidate>
          <div className="register-title">
            <h1 className="title-3">{strings.login.title}</h1>
          </div>
          <Field label={strings.login.emailLabel} htmlFor="login-email" error={emailError}>
            <GlassInput
              id="login-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@example.com"
              icon={Mail}
              invalid={emailError !== undefined}
              {...register("email", { required: strings.login.emailRequired })}
            />
          </Field>
          <Field label={strings.login.passwordLabel} htmlFor="login-password">
            <PasswordField
              id="login-password"
              autoComplete="current-password"
              {...register("password", { required: strings.login.passwordRequired })}
            />
          </Field>
          {captchaRequired ? (
            <Turnstile action="login" resetKey={turnstileKey} onToken={setTurnstileToken} />
          ) : null}
          <GlassButton
            type="submit"
            variant="primary"
            block
            loading={formState.isSubmitting}
            disabled={captchaRequired && turnstileToken === null}
          >
            {strings.login.submit}
          </GlassButton>
          <div className="login-alt">
            <Link to={paths.reset}>{strings.login.forgot}</Link>
            <span>
              {strings.login.noAccount} <Link to={paths.register}>{strings.login.register}</Link>
            </span>
          </div>
        </form>
      </GlassPanel>
    </div>
  );
};
