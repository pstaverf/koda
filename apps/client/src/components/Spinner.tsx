import { LoaderCircle } from "lucide-react";

type SpinnerProps = {
  size?: number;
  label?: string;
  className?: string;
};

export const Spinner = ({ size = 18, label, className }: SpinnerProps) => (
  <span className={["spinner", className].filter(Boolean).join(" ")} role="status" aria-live="polite">
    <LoaderCircle size={size} strokeWidth={2} aria-hidden="true" className="spin" />
    {label === undefined ? null : <span className="visually-hidden">{label}</span>}
  </span>
);
