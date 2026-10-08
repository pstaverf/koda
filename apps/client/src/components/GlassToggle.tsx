import { useId } from "react";

type GlassToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
};

export const GlassToggle = ({ checked, onChange, label, description, disabled = false }: GlassToggleProps) => {
  const labelId = useId();
  const descriptionId = useId();
  return (
    <div className={["glass-toggle-row", disabled ? "is-disabled" : null].filter(Boolean).join(" ")}>
      <span className="glass-toggle-text">
        <span id={labelId} className="glass-toggle-label">
          {label}
        </span>
        {description === undefined ? null : (
          <span id={descriptionId} className="glass-toggle-description">
            {description}
          </span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description === undefined ? undefined : descriptionId}
        disabled={disabled}
        className={["glass-toggle", checked ? "is-on" : null].filter(Boolean).join(" ")}
        onClick={() => onChange(!checked)}
      >
        <span className="glass-toggle-thumb" />
      </button>
    </div>
  );
};
