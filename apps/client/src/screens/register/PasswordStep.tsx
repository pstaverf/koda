import { passwordSchema } from "@koda/shared/auth";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router";
import { clearRegistrationToken, readRegistrationToken, registerPassword } from "../../api/auth.js";
import { ApiError } from "../../api/http.js";
import { Field } from "../../components/Field.js";
import { GlassButton } from "../../components/GlassButton.js";
import { PasswordField } from "../../components/PasswordField.js";
import { PasswordStrength } from "../../components/PasswordStrength.js";
import { Turnstile } from "../../components/Turnstile.js";
import { paths } from "../../routes.js";
import { asErrorCode, errorText, strings, type ClientErrorCode } from "../../strings.js";
import { toast } from "../../store/toasts.js";

type PasswordForm = {
  password: string;
  passwordConfirmation: string;
};

export const PasswordStep = () => {
  const navigate = useNavigate();
  const registrationToken = readRegistrationToken();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const { register, handleSubmit, setError, watch, getValues, formState } = useForm<PasswordForm>({
    mode: "onChange",
    defaultValues: { password: "", passwordConfirmation: "" }
  });
  const password = watch("password");
  const confirmation = watch("passwordConfirmation");
  const passwordValid = passwordSchema.safeParse(password).success;
  const strongEnough = score !== null && score >= strings.register.password.minScore;
  const ready = passwordValid && strongEnough && password === confirmation && turnstileToken !== null;

  const onSubmit = handleSubmit(async (values) => {
    if (registrationToken === null) {
      return;
    }
    try {
      await registerPassword(
        {
          registrationToken,
          password: values.password,
          passwordConfirmation: values.passwordConfirmation,
          turnstileToken: turnstileToken ?? ""
        }
      );
      clearRegistrationToken();
      toast.success(strings.register.password.created);
      navigate(paths.registerPhoto);
    } catch (failure) {
      const failureCode: ClientErrorCode = failure instanceof ApiError ? failure.code : "NETWORK_ERROR";
      if (
        failureCode === "REGISTRATION_TOKEN_INVALID" ||
        failureCode === "REGISTRATION_STEP_INVALID" ||
        failureCode === "EMAIL_ALREADY_USED"
      ) {
        clearRegistrationToken();
        toast.error(errorText(failureCode));
        navigate(paths.register);
        return;
      }
      setTurnstileToken(null);
      setTurnstileKey((value) => value + 1);
      if (failure instanceof ApiError && failure.fields !== undefined) {
        for (const [field, code] of Object.entries(failure.fields)) {
          if (field === "password" || field === "passwordConfirmation") {
            setError(field, { type: "server", message: code });
          }
        }
      }
      toast.error(errorText(failureCode));
    }
  });

  if (registrationToken === null) {
    return <Navigate to={paths.register} replace />;
  }

  return (
    <form className="register-form" onSubmit={onSubmit} noValidate>
      <div className="register-title">
        <h1 className="title-3">{strings.register.password.title}</h1>
        <p className="text-secondary">{strings.register.password.text}</p>
      </div>
      <Field label={strings.register.password.passwordLabel} htmlFor="register-password" error={asErrorCode(formState.errors.password?.message)}>
        <PasswordField
          id="register-password"
          autoComplete="new-password"
          invalid={formState.errors.password !== undefined}
          {...register("password", {
            validate: (value) => (passwordSchema.safeParse(value).success ? true : "PASSWORD_INVALID")
          })}
        />
      </Field>
      <PasswordStrength password={password} onScore={setScore} />
      <Field
        label={strings.register.password.confirmationLabel}
        htmlFor="register-password-confirmation"
        error={asErrorCode(formState.errors.passwordConfirmation?.message)}
      >
        <PasswordField
          id="register-password-confirmation"
          autoComplete="new-password"
          invalid={formState.errors.passwordConfirmation !== undefined}
          {...register("passwordConfirmation", {
            validate: (value) => (value === getValues("password") ? true : "PASSWORD_MISMATCH")
          })}
        />
      </Field>
      <Turnstile action="register" resetKey={turnstileKey} onToken={setTurnstileToken} />
      <GlassButton type="submit" variant="primary" block loading={formState.isSubmitting} disabled={!ready}>
        {strings.register.password.submit}
      </GlassButton>
    </form>
  );
};
