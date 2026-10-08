import type { HTMLAttributes } from "react";

type GlassPanelProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "glass" | "strong";
  padded?: boolean;
};

export const GlassPanel = ({ variant = "glass", padded = true, className, children, ...rest }: GlassPanelProps) => (
  <div
    className={[variant === "strong" ? "glass-strong" : "glass", "glass-panel", padded ? "glass-panel-padded" : null, className]
      .filter(Boolean)
      .join(" ")}
    {...rest}
  >
    {children}
  </div>
);
