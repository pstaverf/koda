import { useEffect } from "react";

export const glassFilterId = "koda-glass-distortion";

const supportsSvgBackdrop = (): boolean => {
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") {
    return false;
  }
  if (!CSS.supports("backdrop-filter", `url(#${glassFilterId})`)) {
    return false;
  }
  const agent = navigator.userAgent;
  return /Chrome\/|Chromium\/|Edg\//.test(agent) && !/Firefox\//.test(agent);
};

export const GlassDefs = () => {
  useEffect(() => {
    document.documentElement.dataset["glassFilter"] = supportsSvgBackdrop() ? "supported" : "none";
  }, []);

  return (
    <svg className="glass-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <filter id={glassFilterId} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.008" numOctaves="2" seed="7" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2" result="softNoise" />
          <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="18" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
};
