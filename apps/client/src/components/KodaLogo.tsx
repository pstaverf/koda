import { useId } from "react";

type KodaLogoProps = {
  size?: number;
  withWordmark?: boolean;
  className?: string;
};

export const KodaLogo = ({ size = 40, withWordmark = false, className }: KodaLogoProps) => {
  const gradientId = useId();
  return (
    <span className={["koda-logo", className].filter(Boolean).join(" ")}>
      <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Koda">
        <defs>
          <linearGradient id={gradientId} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#5EA8FF" />
            <stop offset="0.55" stopColor="#7C6CFF" />
            <stop offset="1" stopColor="#38D6C4" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="56" height="56" rx="18" fill={`url(#${gradientId})`} />
        <rect x="4.5" y="4.5" width="55" height="55" rx="17.5" fill="none" stroke="rgba(255,255,255,0.35)" />
        <path
          d="M23 18v28M23 33l15-15M28.5 28.5L41 46"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {withWordmark ? <span className="koda-wordmark">Koda</span> : null}
    </span>
  );
};
