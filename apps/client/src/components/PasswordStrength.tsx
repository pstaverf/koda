import { useEffect, useRef, useState } from "react";
import { strengthLabel, strings } from "../strings.js";

type PasswordStrengthProps = {
  password: string;
  onScore?: (score: number | null) => void;
};

type StrengthCheck = (password: string) => number;

const barCount = 4;
let checkerPromise: Promise<StrengthCheck> | null = null;

const loadChecker = (): Promise<StrengthCheck> => {
  if (checkerPromise === null) {
    checkerPromise = Promise.all([import("@zxcvbn-ts/core"), import("@zxcvbn-ts/language-common")])
      .then(([core, common]) => {
        const factory = new core.ZxcvbnFactory({ dictionary: common.dictionary, graphs: common.adjacencyGraphs });
        return (password: string): number => factory.check(password).score;
      })
      .catch((error: unknown) => {
        checkerPromise = null;
        throw error;
      });
  }
  return checkerPromise;
};

const tone = (score: number | null): string => {
  if (score === null || score <= 1) {
    return "is-weak";
  }
  if (score === 2) {
    return "is-fair";
  }
  return score === 3 ? "is-good" : "is-strong";
};

export const PasswordStrength = ({ password, onScore }: PasswordStrengthProps) => {
  const [score, setScore] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const onScoreRef = useRef(onScore);
  onScoreRef.current = onScore;

  useEffect(() => {
    if (password.length === 0) {
      setScore(null);
      setPending(false);
      onScoreRef.current?.(null);
      return;
    }
    let cancelled = false;
    setPending(true);
    void loadChecker()
      .then((check) => {
        if (cancelled) {
          return;
        }
        const value = check(password);
        setScore(value);
        setPending(false);
        onScoreRef.current?.(value);
      })
      .catch(() => {
        if (!cancelled) {
          setScore(null);
          setPending(false);
          onScoreRef.current?.(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [password]);

  const label = pending ? strings.register.password.checking : strengthLabel(score);

  return (
    <div className={["password-strength", tone(score)].join(" ")}>
      <div className="strength-bars" aria-hidden="true">
        {Array.from({ length: barCount }, (_, index) => (
          <span
            key={index}
            className={["strength-bar", score !== null && index < score ? "is-active" : null].filter(Boolean).join(" ")}
          />
        ))}
      </div>
      <p className="strength-label" role="status" aria-live="polite">
        {label ?? strings.register.password.weak}
      </p>
    </div>
  );
};
