import type { LucideIcon } from "lucide-react";
import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

type GlassInputProps = InputHTMLAttributes<HTMLInputElement> & {
  icon?: LucideIcon;
  trailing?: ReactNode;
  invalid?: boolean;
};

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ icon: Icon, trailing, invalid = false, className, ...rest }, ref) => (
    <span className={["glass-input", invalid ? "is-invalid" : null, className].filter(Boolean).join(" ")}>
      {Icon === undefined ? null : <Icon className="glass-input-icon" size={18} strokeWidth={2} aria-hidden="true" />}
      <input ref={ref} className="glass-input-control" aria-invalid={invalid} {...rest} />
      {trailing === undefined ? null : <span className="glass-input-trailing">{trailing}</span>}
    </span>
  )
);

GlassInput.displayName = "GlassInput";
