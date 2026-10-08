import { Eye, EyeOff, LockKeyhole, type LucideIcon } from "lucide-react";
import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { strings } from "../strings.js";
import { GlassInput } from "./GlassInput.js";

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  icon?: LucideIcon;
  invalid?: boolean;
};

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ icon = LockKeyhole, ...rest }, ref) => {
    const [visible, setVisible] = useState(false);
    return (
      <GlassInput
        {...rest}
        ref={ref}
        type={visible ? "text" : "password"}
        icon={icon}
        trailing={
          <button
            type="button"
            className="input-reveal"
            aria-pressed={visible}
            aria-label={visible ? strings.register.password.hide : strings.register.password.show}
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? <EyeOff size={20} strokeWidth={1.75} aria-hidden="true" /> : <Eye size={20} strokeWidth={1.75} aria-hidden="true" />}
          </button>
        }
      />
    );
  }
);

PasswordField.displayName = "PasswordField";
