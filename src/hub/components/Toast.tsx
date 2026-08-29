import { useState, useEffect, createContext, useContext, useCallback } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastCtx>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let idCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const icons: Record<ToastType, string> = {
    success: "✓",
    error: "✕",
    info: "ℹ",
  };
  const colors: Record<ToastType, string> = {
    success: "#22c55e",
    error: "#ef4444",
    info: "#31b498",
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[99] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg pointer-events-auto animate-pop-in"
            style={{
              background: "var(--color-surface)",
              borderColor: `${colors[t.type]}40`,
              minWidth: 240,
              maxWidth: 340,
            }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-700 flex-shrink-0"
              style={{ background: `${colors[t.type]}20`, color: colors[t.type] }}
            >
              {icons[t.type]}
            </div>
            <p className="text-sm text-ink flex-1 font-500">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-muted hover:text-ink transition-colors flex-shrink-0 text-[12px]"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
