import { CODE_LENGTH } from "@koda/shared/constants";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import {
  readRegistrationEmail,
  readResendDeadline,
  resendRegistrationCode,
  startResendWindow,
  storeRegistrationToken,
  verifyRegistrationCode
} from "../../api/auth.js";
import { ApiError } from "../../api/http.js";
import { CodeInput } from "../../components/CodeInput.js";
import { GlassButton } from "../../components/GlassButton.js";
import { paths } from "../../routes.js";
import { errorText, strings, type ClientErrorCode } from "../../strings.js";
import { toast } from "../../store/toasts.js";

export const CodeStep = () => {
  const navigate = useNavigate();
  const email = readRegistrationEmail();
  const [code, setCode] = useState("");
  const [deadline, setDeadline] = useState<number>(() => {
    const stored = readResendDeadline();
    if (stored > Date.now()) {
      return stored;
    }
    startResendWindow(strings.register.code.resendSeconds);
    return readResendDeadline();
  });
  const [seconds, setSeconds] = useState<number>(() => Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<ClientErrorCode | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [focusKey, setFocusKey] = useState(0);

  useEffect(() => {
    if (seconds <= 0) {
      return;
    }
    const timer = setTimeout(() => {
      setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 1000);
    return () => clearTimeout(timer);
  }, [seconds, deadline]);

  if (email === null) {
    return <Navigate to={paths.register} replace />;
  }

  const verify = async (value: string): Promise<void> => {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await verifyRegistrationCode(value);
      storeRegistrationToken(result.registrationToken);
      toast.success(strings.register.code.verified);
      navigate(paths.registerPassword);
    } catch (failure) {
      const failureCode: ClientErrorCode = failure instanceof ApiError ? failure.code : "NETWORK_ERROR";
      if (failureCode === "CODE_ATTEMPTS_EXCEEDED" || failureCode === "REGISTRATION_TOKEN_INVALID") {
        toast.error(errorText(failureCode));
        navigate(paths.register);
        return;
      }
      setError(failureCode);
      setCode("");
      setShakeKey((value2) => value2 + 1);
      setFocusKey((value2) => value2 + 1);
      toast.error(errorText(failureCode));
    } finally {
      setBusy(false);
    }
  };

  const resend = async (): Promise<void> => {
    if (resending || seconds > 0) {
      return;
    }
    setResending(true);
    try {
      await resendRegistrationCode();
      startResendWindow(strings.register.code.resendSeconds);
      setDeadline(readResendDeadline());
      setCode("");
      setError(null);
      toast.success(strings.register.code.resent);
    } catch (failure) {
      toast.error(errorText(failure instanceof ApiError ? failure.code : "NETWORK_ERROR"));
    } finally {
      setResending(false);
    }
  };

  return (
    <div key={shakeKey} className={["register-form", error === null ? null : "shake"].filter(Boolean).join(" ")}>
      <div className="register-title">
        <h1 className="title-3">{strings.register.code.title}</h1>
        <p className="text-secondary">
          {strings.register.code.text} <span className="text-mono">{email}</span>
        </p>
      </div>
      <CodeInput
        value={code}
        invalid={error !== null}
        disabled={busy}
        focusSignal={focusKey}
        onChange={(value) => {
          setError(null);
          setCode(value);
          if (value.length === CODE_LENGTH) {
            void verify(value);
          }
        }}
      />
      {error === null ? <p className="field-hint">{strings.register.code.hint}</p> : <p className="field-error">{errorText(error)}</p>}
      <div className="resend-row">
        <GlassButton size="sm" variant="ghost" loading={resending} disabled={seconds > 0} onClick={() => void resend()}>
          {strings.register.code.resend}
        </GlassButton>
        <span>{seconds > 0 ? strings.register.code.resendIn(seconds) : null}</span>
      </div>
      <Link className="register-alt" to={paths.register}>
        <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" /> {strings.register.code.changeEmail}
      </Link>
    </div>
  );
};
