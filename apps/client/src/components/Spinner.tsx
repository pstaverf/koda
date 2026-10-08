import { LoaderCircle } from "lucide-react";

type SpinnerProps = {
  size?: number;
  label?: string;
  className?: string;
};

export const Spinner = ({ size = 20, label, className }: SpinnerProps) => (
  <span className={["spinner", className].filter(Boolean).join(" ")} role="status" aria-live="polite">
    <LoaderCircle size={size} strokeWidth={1.75} aria-hidden="true" className="spin" />
    {label === undefined ? null : <span className="visually-hidden">{label}</span>}
  </span>
);
