"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

type Toast = { id: number; message: string; tone: "success" | "error" | "info" };

const ToastContext = createContext<{ push: (message: string, tone?: Toast["tone"]) => void } | null>(null);

/** Global feedback surface (§66). Every async action reports through this. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const push = (message: string, tone: Toast["tone"] = "success") => {
    counter.current += 1;
    const id = counter.current;
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 4000);
  };

  const value = useMemo(() => ({ push }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto w-full max-w-sm rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
              toast.tone === "error"
                ? "bg-red-600 text-white"
                : toast.tone === "info"
                  ? "bg-neutral-800 text-white"
                  : "bg-brand-600 text-white"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}

/**
 * Wraps a server action so buttons show a pending state and errors surface as
 * toasts rather than unhandled rejections.
 */
export function useAction() {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();

  const run = useCallback(<T,>(
    action: () => Promise<T>,
    options: { success?: string; onSuccess?: (result: T) => void } = {},
  ) => {
    startTransition(async () => {
      try {
        const result = await action();
        if (options.success) push(options.success, "success");
        options.onSuccess?.(result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Something went wrong. Please try again.";
        push(message, "error");
      }
    });
  }, [push, startTransition]);

  const refresh = useCallback(() => router.refresh(), [router]);

  return useMemo(
    () => ({ run, refresh, pending, router }),
    [run, refresh, pending, router],
  );
}

/** Debounced value for search inputs. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}