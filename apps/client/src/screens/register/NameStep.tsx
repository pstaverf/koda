import { displayNameSchema } from "@koda/shared/profile";
import { UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router";
import { clearRegistrationEmail, finishRegistration } from "../../api/auth.js";
import { ApiError } from "../../api/http.js";
import { Field } from "../../components/Field.js";
import { GlassButton } from "../../components/GlassButton.js";
import { GlassInput } from "../../components/GlassInput.js";
import { paths } from "../../routes.js";
import { asErrorCode, errorText, strings } from "../../strings.js";
import { useSessionStore } from "../../store/session.js";
import { toast } from "../../store/toasts.js";

type NameForm = {
  displayName: string;
};

const validateName = (value: string): true | string => {
  const parsed = displayNameSchema.safeParse(value);
  return parsed.success ? true : (parsed.error.issues[0]?.message ?? "DISPLAY_NAME_INVALID");
};

export const NameStep = () => {
  const navigate = useNavigate();
  const user = useSessionStore((state) => state.user);
  const { register, handleSubmit, setError, formState } = useForm<NameForm>({
    mode: "onSubmit",
    defaultValues: { displayName: user?.displayName ?? "" }
  });
  const nameError = asErrorCode(formState.errors.displayName?.message);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await finishRegistration(values.displayName);
      clearRegistrationEmail();
      toast.success(strings.register.name.done);
      navigate(paths.profile);
    } catch (failure) {
      if (failure instanceof ApiError && failure.fields?.displayName !== undefined) {
        setError("displayName", { type: "server", message: failure.fields.displayName });
        return;
      }
      toast.error(errorText(failure instanceof ApiError ? failure.code : "NETWORK_ERROR"));
    }
  });

  if (user === null) {
    return null;
  }
  if (user.displayName !== null) {
    return <Navigate to={paths.profile} replace />;
  }

  return (
    <form className="register-form" onSubmit={onSubmit} noValidate>
      <div className="register-title">
        <h1 className="title-3">{strings.register.name.title}</h1>
        <p className="text-secondary">{strings.register.name.text}</p>
      </div>
      <Field label={strings.register.name.label} htmlFor="register-name" hint={strings.register.name.hint} error={nameError}>
        <GlassInput
          id="register-name"
          type="text"
          autoComplete="nickname"
          placeholder="Алия"
          icon={UserRound}
          invalid={nameError !== undefined}
          {...register("displayName", { validate: validateName })}
        />
      </Field>
      <GlassButton type="submit" variant="primary" block loading={formState.isSubmitting}>
        {strings.register.name.submit}
      </GlassButton>
    </form>
  );
};
