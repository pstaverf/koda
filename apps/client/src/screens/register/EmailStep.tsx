import { emailSchema } from "@koda/shared/auth";
import { Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { requestRegistrationCode, startResendWindow, storeRegistrationEmail } from "../../api/auth.js";
import { ApiError } from "../../api/http.js";
import { Field } from "../../components/Field.js";
import { GlassButton } from "../../components/GlassButton.js";
import { GlassInput } from "../../components/GlassInput.js";
import { paths } from "../../routes.js";
import { asErrorCode, errorText, strings } from "../../strings.js";
import { toast } from "../../store/toasts.js";

type EmailForm = {
  email: string;
};

const validateEmail = (value: string): true | string => {
  const parsed = emailSchema.safeParse(value);
  return parsed.success ? true : (parsed.error.issues[0]?.message ?? "EMAIL_INVALID");
};

export const EmailStep = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, setError, formState } = useForm<EmailForm>({
    mode: "onSubmit",
    defaultValues: { email: "" }
  });
  const emailError = asErrorCode(formState.errors.email?.message);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await requestRegistrationCode(values.email);
      storeRegistrationEmail(values.email);
      startResendWindow(strings.register.code.resendSeconds);
      toast.success(strings.register.email.sent);
      navigate(paths.registerCode);
    } catch (error) {
      if (error instanceof ApiError && error.fields?.email !== undefined) {
        setError("email", { type: "server", message: error.fields.email });
        return;
      }
      toast.error(errorText(error instanceof ApiError ? error.code : "NETWORK_ERROR"));
    }
  });

  return (
    <form className="register-form" onSubmit={onSubmit} noValidate>
      <div className="register-title">
        <h1 className="title-3">{strings.register.email.title}</h1>
        <p className="text-secondary">{strings.register.email.text}</p>
      </div>
      <Field
        label={strings.register.email.label}
        htmlFor="register-email"
        hint={strings.register.email.hint}
        error={emailError}
      >
        <GlassInput
          id="register-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="name@example.com"
          icon={Mail}
          invalid={emailError !== undefined}
          {...register("email", { validate: validateEmail })}
        />
      </Field>
      <GlassButton type="submit" variant="primary" block loading={formState.isSubmitting}>
        {strings.register.email.submit}
      </GlassButton>
      <p className="register-alt">
        {strings.register.email.alt} <Link to={paths.login}>{strings.register.email.altAction}</Link>
      </p>
    </form>
  );
};
