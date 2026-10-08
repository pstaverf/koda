import { useEffect } from "react";

export const glassFilterId = "koda-glass-distortion";

const isChromium = (): boolean => {
  const agent = navigator.userAgent;
  return /Chrome\/|Chromium\/|CriOS\/|Edg\//.test(agent) && !/Firefox\/|FxiOS\//.test(agent);
};

const supportsSvgFilter = (): boolean =>
  typeof CSS !== "undefined" &&
  typeof CSS.supports === "function" &&
  CSS.supports("filter", `url(#${glassFilterId})`) &&
  isChromium();

export const GlassDefs = () => {
  useEffect(() => {
    document.documentElement.dataset["glassFilter"] = supportsSvgFilter() ? "supported" : "none";
  }, []);

  return (
    <svg className="glass-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <filter id={glassFilterId} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.01 0.01" numOctaves="2" seed="7" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="1.5" result="softNoise" />
          <feSpecularLighting
            in="softNoise"
            surfaceScale="3"
            specularConstant="0.6"
            specularExponent="18"
            lightingColor="#ffffff"
            result="specular"
          >
            <feDistantLight azimuth="235" elevation="52" />
          </feSpecularLighting>
          <feComposite in="specular" in2="softNoise" operator="in" result="specularMasked" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softNoise"
            scale="14"
            xChannelSelector="R"
            yChannelSelector="G"
            result="displaced"
          />
          <feBlend in="displaced" in2="specularMasked" mode="screen" />
        </filter>
      </defs>
    </svg>
  );
};
