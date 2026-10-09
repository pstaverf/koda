import { UserRound } from "lucide-react";

type AvatarProps = {
  name: string | null;
  url: string | null;
  size?: number;
  online?: boolean;
  className?: string;
};

export const Avatar = ({ name, url, size = 44, online = false, className }: AvatarProps) => {
  const initial = name?.trim().slice(0, 1).toUpperCase() ?? "";
  return (
    <span
      className={["avatar", className].filter(Boolean).join(" ")}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {url !== null ? (
        <img src={url} alt={name ?? ""} />
      ) : initial.length > 0 ? (
        <span className="avatar-initial" style={{ fontSize: `${Math.round(size * 0.4)}px` }}>
          {initial}
        </span>
      ) : (
        <UserRound size={Math.round(size * 0.55)} strokeWidth={1.75} aria-hidden="true" />
      )}
      {online ? <span className="avatar-online" /> : null}
    </span>
  );
};
