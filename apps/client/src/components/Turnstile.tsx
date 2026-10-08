import { useEffect, useRef, useState } from "react";
import { strings } from "../strings.js";
import { GlassButton } from "./GlassButton.js";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme?: "auto" | "light" | "dark";
      language?: string;
      appearance?: "always" | "execute" | "interaction-only";
      action?: string;
      callback: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
      "timeout-callback"?: () => void;
    }
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type TurnstileProps = {
  onToken: (token: string | null) => void;
  onError?: () => void;
  action?: string;
  resetKey?: number;
};

const scriptUrl = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let apiPromise: Promise<TurnstileApi> | null = null;

const loadApi = (): Promise<TurnstileApi> => {
  if (apiPromise === null) {
    apiPromise = new Promise<TurnstileApi>((resolve, reject) => {
      if (window.turnstile !== undefined) {
        resolve(window.turnstile);
        return;
      }
      const script = document.createElement("script");
      script.src = scriptUrl;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        const api = window.turnstile;
        if (api === undefined) {
          reject(new Error("turnstile missing"));
        } else {
          resolve(api);
        }
      };
      script.onerror = () => reject(new Error("turnstile failed"));
      document.head.append(script);
    }).catch((error: unknown) => {
      apiPromise = null;
      throw error;
    });
  }
  return apiPromise;
};

export const Turnstile = ({ onToken, onError, action, resetKey = 0 }: TurnstileProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  onTokenRef.current = onToken;
  onErrorRef.current = onError;

  useEffect(() => {
    let widgetId: string | null = null;
    let cancelled = false;
    setFailed(false);
    onTokenRef.current(null);
    void loadApi()
      .then((api) => {
        const container = containerRef.current;
        if (cancelled || container === null) {
          return;
        }
        container.replaceChildren();
        widgetId = api.render(container, {
          sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
          theme: "dark",
          language: "ru",
          appearance: "always",
          ...(action === undefined ? {} : { action }),
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "timeout-callback": () => onTokenRef.current(null),
          "error-callback": () => {
            onTokenRef.current(null);
            onErrorRef.current?.();
          }
        });
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          onErrorRef.current?.();
        }
      });
    return () => {
      cancelled = true;
      const api = window.turnstile;
      if (api !== undefined && widgetId !== null) {
        api.remove(widgetId);
      }
    };
  }, [action, attempt, resetKey]);

  return (
    <div className="turnstile-block">
      <div ref={containerRef} className="turnstile" />
      {failed ? (
        <div className="turnstile-fallback">
          <p className="turnstile-note">{strings.register.password.turnstileError}</p>
          <GlassButton size="sm" onClick={() => setAttempt((current) => current + 1)}>
            {strings.common.retry}
          </GlassButton>
        </div>
      ) : (
        <p className="turnstile-note">{strings.register.password.turnstileHint}</p>
      )}
    </div>
  );
};
