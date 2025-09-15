"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  timeout?: number;
};

type ToastContextType = {
  push: (t: Omit<Toast, "id">) => string;
  pop: (id: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = (t: Omit<Toast, "id">) => {
    const id = uuidv4();
    const toast: Toast = { id, ...t, timeout: t.timeout ?? 4000 };
    setToasts((s) => [...s, toast]);

    if (toast.timeout && toast.timeout > 0) {
      setTimeout(() => {
        setToasts((s) => s.filter((x) => x.id !== id));
      }, toast.timeout);
    }
    return id;
  };

  const pop = (id: string) => {
    setToasts((s) => s.filter((t) => t.id !== id));
  };

  const value = useMemo(() => ({ push, pop }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={pop} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onClose,
}: {
  toasts: Toast[];
  onClose: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      className="fixed z-50 right-4 top-4 flex flex-col gap-2 max-w-xs card"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`w-full rounded-lg shadow-lg p-3 border flex items-start gap-3 ${
            t.type === "success"
              ? "text-positive border-green-200"
              : t.type === "error"
              ? "text-negative border-red-200"
              : "text-gray-200 border-gray-200"
          }`}
        >
          <div className="flex-0">
            {t.type === "success" ? (
              <span className="flex w-6 h-6 rounded-full bg-green-500 text-white text-xs items-center justify-center">
                ✓
              </span>
            ) : t.type === "error" ? (
              <span className="flex w-6 h-6 rounded-full bg-red-500 text-white text-xs items-center justify-center">
                !
              </span>
            ) : (
              <span className="flex w-6 h-6 rounded-full bg-gray-500 text-white text-xs items-center justify-center">
                i
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {t.title && <div className="font-semibold text-sm">{t.title}</div>}
            <div className="text-sm text-[color:var(--muted)] break-words">
              {t.message}
            </div>
          </div>

          <div className="flex-0 self-start">
            <button
              onClick={() => onClose(t.id)}
              aria-label="Close notification"
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
