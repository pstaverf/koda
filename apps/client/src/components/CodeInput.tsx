import { CODE_LENGTH } from "@koda/shared/constants";
import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { strings } from "../strings.js";

type CodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  focusSignal?: number;
  label?: string;
};

const digitsOnly = (value: string): string => value.replace(/\D/g, "");

export const CodeInput = ({
  value,
  onChange,
  length = CODE_LENGTH,
  disabled = false,
  invalid = false,
  autoFocus = true,
  focusSignal = 0,
  label = strings.register.code.label
}: CodeInputProps) => {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? "");

  const focusCell = (index: number): void => {
    const target = refs.current[Math.min(length - 1, Math.max(0, index))];
    target?.focus();
    target?.select();
  };

  useEffect(() => {
    if (!autoFocus) {
      return;
    }
    const first = refs.current[0];
    first?.focus();
    first?.select();
  }, [autoFocus, focusSignal]);

  const commit = (next: string[], cursor: number): void => {
    onChange(next.join("").slice(0, length));
    focusCell(cursor);
  };

  const handleInput = (index: number, raw: string): void => {
    const cleaned = digitsOnly(raw);
    if (cleaned.length === 0) {
      const next = digits.slice();
      next[index] = "";
      onChange(next.join("").slice(0, length));
      return;
    }
    const spread = index === 0 && cleaned.length > 1;
    const next = digits.slice();
    let cursor = spread ? 0 : index;
    for (const digit of cleaned.split("")) {
      if (cursor >= length) {
        break;
      }
      next[cursor] = digit;
      cursor += 1;
    }
    commit(next, cursor);
  };

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>): void => {
    const cleaned = digitsOnly(event.clipboardData.getData("text"));
    if (cleaned.length === 0) {
      return;
    }
    event.preventDefault();
    const next = digits.slice();
    let cursor = index;
    for (const digit of cleaned.split("")) {
      if (cursor >= length) {
        break;
      }
      next[cursor] = digit;
      cursor += 1;
    }
    commit(next, cursor);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Backspace" && digits[index] === "") {
      if (index > 0) {
        event.preventDefault();
        const next = digits.slice();
        next[index - 1] = "";
        commit(next, index - 1);
      }
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusCell(index - 1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusCell(index + 1);
    }
  };

  return (
    <div className={["code-input", invalid ? "is-invalid" : null].filter(Boolean).join(" ")} role="group" aria-label={label}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          className="code-cell"
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={index === 0 ? length : 1}
          value={digit}
          disabled={disabled}
          aria-label={strings.code.cell(index + 1, length)}
          aria-invalid={invalid}
          autoFocus={autoFocus && index === 0}
          onChange={(event) => handleInput(index, event.target.value)}
          onPaste={(event) => handlePaste(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onFocus={(event) => event.currentTarget.select()}
        />
      ))}
    </div>
  );
};
