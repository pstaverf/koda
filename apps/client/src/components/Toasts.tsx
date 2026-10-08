import { CircleAlert, CircleCheck, Info, TriangleAlert, X, type LucideIcon } from "lucide-react";
import { strings } from "../strings.js";
import { useToastStore, type ToastKind } from "../store/toasts.js";

const icons: Record<ToastKind, LucideIcon> = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
  warning: TriangleAlert
};

export const Toasts = () => {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  return (
    <section className="toasts" aria-label={strings.common.notifications} aria-live="polite">
      {toasts.map((item) => {
        const Icon = icons[item.kind];
        return (
          <div key={item.id} className={`toast glass-strong toast-${item.kind} slide-up`} role={item.kind === "error" ? "alert" : "status"}>
            <Icon size={20} strokeWidth={1.75} aria-hidden="true" className="toast-icon" />
            <span className="toast-text">{item.text}</span>
            <button type="button" className="toast-close" onClick={() => dismiss(item.id)} aria-label={strings.common.dismiss}>
              <X size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </section>
  );
};
