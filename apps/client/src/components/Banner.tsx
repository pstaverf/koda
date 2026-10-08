import type { BannerStyle, PublicUser } from "@koda/shared/profile";

type BannerProps = {
  user: Pick<PublicUser, "bannerUrl" | "bannerStyle">;
  height?: number;
  rounded?: boolean;
};

const styleFor = (style: BannerStyle): { background: string } | undefined => {
  if (style === null || style.type === "image") {
    return undefined;
  }
  if (style.type === "color") {
    return { background: style.value };
  }
  return { background: `linear-gradient(${style.angle}deg, ${style.from}, ${style.to})` };
};

export const Banner = ({ user, height = 180, rounded = false }: BannerProps) => {
  const custom = user.bannerUrl === null ? styleFor(user.bannerStyle) : undefined;
  return (
    <div
      className={["banner", rounded ? "is-rounded" : null].filter(Boolean).join(" ")}
      style={{ height: `${height}px`, ...custom }}
    >
      {user.bannerUrl === null ? null : <img src={user.bannerUrl} alt="" />}
    </div>
  );
};
