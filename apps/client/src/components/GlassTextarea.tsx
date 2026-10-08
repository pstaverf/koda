import { forwardRef, type TextareaHTMLAttributes } from "react";
import { strings } from "../strings.js";

type GlassTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
  showCounter?: boolean;
};

export const GlassTextarea = forwardRef<HTMLTextAreaElement, GlassTextareaProps>(
  ({ invalid = false, showCounter = false, className, maxLength, value, ...rest }, ref) => {
    const length = typeof value === "string" ? value.length : 0;
    return (
      <span className={["glass-textarea", invalid ? "is-invalid" : null, className].filter(Boolean).join(" ")}>
        <textarea ref={ref} className="glass-textarea-control" aria-invalid={invalid} maxLength={maxLength} value={value} {...rest} />
        {showCounter && maxLength !== undefined ? (
          <span className={["glass-textarea-counter", length >= maxLength ? "is-limit" : null].filter(Boolean).join(" ")} aria-live="polite">
            {strings.textarea.counter(length, maxLength)}
          </span>
        ) : null}
      </span>
    );
  }
);

GlassTextarea.displayName = "GlassTextarea";
