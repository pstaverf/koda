import { create } from "zustand";

export type ToastKind = "success" | "error" | "info" | "warning";

export type Toast = {
  id: number;
  kind: ToastKind;
  text: string;
};

type ToastInput = {
  kind: ToastKind;
  text: string;
  durationMs?: number;
};

type ToastState = {
  toasts: Toast[];
  push: (input: ToastInput) => number;
  dismiss: (id: number) => void;
};

const defaultDurationMs = 4000;
const maxVisible = 4;
let nextId = 1;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (input) => {
    const id = nextId;
    nextId += 1;
    const toast: Toast = { id, kind: input.kind, text: input.text };
    const next = [...get().toasts, toast];
    const overflow = next.slice(0, Math.max(0, next.length - maxVisible));
    for (const item of overflow) {
      const timer = timers.get(item.id);
      if (timer !== undefined) {
        clearTimeout(timer);
        timers.delete(item.id);
      }
    }
    set({ toasts: next.slice(-maxVisible) });
    timers.set(
      id,
      setTimeout(() => {
        get().dismiss(id);
      }, input.durationMs ?? defaultDurationMs)
    );
    return id;
  },
  dismiss: (id) => {
    const timer = timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.delete(id);
    }
    set({ toasts: get().toasts.filter((toast) => toast.id !== id) });
  }
}));

export const toast = {
  success: (text: string): number => useToastStore.getState().push({ kind: "success", text }),
  error: (text: string): number => useToastStore.getState().push({ kind: "error", text }),
  info: (text: string): number => useToastStore.getState().push({ kind: "info", text }),
  warning: (text: string): number => useToastStore.getState().push({ kind: "warning", text })
};
