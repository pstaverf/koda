import { avatarPlaceholderColor, avatarPlaceholderLetter } from "@koda/shared/constants";

type AvatarProps = {
  name: string | null;
  publicId: string;
  url: string | null;
  size?: number;
  online?: boolean;
  className?: string;
};

export const Avatar = ({ name, publicId, url, size = 44, online = false, className }: AvatarProps) => {
  const classes = ["avatar", className].filter(Boolean).join(" ");
  const dimensions = { width: `${size}px`, height: `${size}px` };
  if (url !== null) {
    return (
      <span className={classes} style={dimensions}>
        <img src={url} alt={name ?? ""} />
        {online ? <span className="avatar-online" /> : null}
      </span>
    );
  }
  return (
    <span
      className={classes}
      style={{ ...dimensions, background: avatarPlaceholderColor(publicId), color: "#FFFFFF" }}
      role="img"
      aria-label={name ?? publicId}
    >
      <span className="avatar-initial" style={{ fontSize: `${Math.round(size * 0.4)}px` }}>
        {avatarPlaceholderLetter(name ?? "")}
      </span>
      {online ? <span className="avatar-online" /> : null}
    </span>
  );
};
