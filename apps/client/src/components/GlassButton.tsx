import type { LucideIcon } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner.js";

export type GlassButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type GlassButtonSize = "sm" | "md" | "lg";

type GlassButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: GlassButtonVariant;
  size?: GlassButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
  iconOnly?: boolean;
  block?: boolean;
};

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  (
    { variant = "secondary", size = "md", loading = false, icon: Icon, iconOnly = false, block = false, className, children, disabled, type, ...rest },
    ref
  ) => {
    const classes = [
      "glass-button",
      `glass-button-${variant}`,
      `glass-button-${size}`,
      iconOnly ? "glass-button-icon" : null,
      block ? "glass-button-block" : null,
      className
    ]
      .filter(Boolean)
      .join(" ");
    const iconSize = size === "lg" ? 24 : 20;
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={classes}
        disabled={disabled === true || loading}
        aria-busy={loading}
        {...rest}
      >
        {loading ? (
          <Spinner size={iconSize} />
        ) : Icon === undefined ? null : (
          <Icon size={iconSize} strokeWidth={1.75} aria-hidden="true" />
        )}
        {iconOnly ? null : <span className="glass-button-label">{children}</span>}
      </button>
    );
  }
);

GlassButton.displayName = "GlassButton";
