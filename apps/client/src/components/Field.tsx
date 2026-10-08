import type { ReactNode } from "react";
import { errorText, strings, type ClientErrorCode } from "../strings.js";

type FieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: ClientErrorCode | undefined;
  optional?: boolean;
  children: ReactNode;
};

export const Field = ({ label, htmlFor, hint, error, optional = false, children }: FieldProps) => {
  const messageId = `${htmlFor}-message`;
  return (
    <div className={["field", error === undefined ? null : "has-error"].filter(Boolean).join(" ")}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
        {optional ? <span className="field-optional">{strings.common.optional}</span> : null}
      </label>
      {children}
      {error === undefined ? (
        hint === undefined ? null : (
          <p id={messageId} className="field-hint">
            {hint}
          </p>
        )
      ) : (
        <p id={messageId} className="field-error" role="alert">
          {errorText(error)}
        </p>
      )}
    </div>
  );
};
