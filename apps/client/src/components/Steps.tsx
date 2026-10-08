import { Check } from "lucide-react";
import { strings } from "../strings.js";

type StepsProps = {
  steps: readonly string[];
  current: number;
};

export const Steps = ({ steps, current }: StepsProps) => (
  <nav className="steps" aria-label={strings.steps.label}>
    <p className="visually-hidden">{strings.steps.progress(current + 1, steps.length)}</p>
    <ol className="steps-list">
      {steps.map((title, index) => {
        const state = index < current ? "done" : index === current ? "current" : "upcoming";
        return (
          <li key={title} className={`steps-item is-${state}`} aria-current={state === "current" ? "step" : undefined}>
            <span className="steps-dot">
              {state === "done" ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : <span>{index + 1}</span>}
            </span>
            <span className="steps-title">{title}</span>
          </li>
        );
      })}
    </ol>
  </nav>
);
