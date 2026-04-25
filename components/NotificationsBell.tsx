"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  UserPlus,
  AtSign,
  Users,
  AlertTriangle,
  CheckCircle2,
  StickyNote,
  X,
} from "lucide-react";
import type { NotificationRow } from "@/app/api/notifications/route";

type Props = {
  initial?: NotificationRow[];
};

const NOTIF_META: Record<
  NotificationRow["kind"],
  { icon: React.ReactNode; bg: string; fg: string }
> = {
  assign:   { icon: <UserPlus size={12} />,      bg: "var(--brand-turquesa-soft)", fg: "var(--brand-turquesa-ink)" },
  mention:  { icon: <AtSign size={12} />,        bg: "var(--brand-violeta-soft)",  fg: "var(--brand-violeta-ink)" },
  standup:  { icon: <Users size={12} />,         bg: "var(--brand-violeta-soft)",  fg: "var(--brand-violeta-ink)" },
  deadline: { icon: <AlertTriangle size={12} />, bg: "var(--warn-soft)",           fg: "var(--warn)" },
  approval: { icon: <CheckCircle2 size={12} />,  bg: "var(--brand-lima-soft, rgba(163,230,53,0.18))", fg: "var(--brand-lima-ink, rgb(77,124,15))" },
  note:     { icon: <StickyNote size={12} />,    bg: "var(--bg-3)",                fg: "var(--text-2)" },
};

export function NotificationsBell({ initial = [] }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>(initial);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = items.filter((n) => n.unread).length;

  const refresh = useCallback(async () => {
    const res = await fetch("/api/notifications", { cache: "no-store" });
    if (res.ok) {
      const { notifications } = await res.json();
      setItems(notifications);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    refresh();
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, refresh]);

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read-all" }),
    });
    router.refresh();
  }

  async function markOneRead(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Notificaciones"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md"
        style={{
          background: "var(--bg)",
          border: "1px solid var(--border)",
          color: "var(--text-2)",
        }}
      >
        <Bell size={16} strokeWidth={1.75} />
        {unreadCount > 0 && <span className="notif-dot" />}
      </button>

      {open && (
        <div
          className="fade-in absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-32px)] overflow-hidden"
          style={{
            zIndex: 60,
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div>
              <div
                className="text-[11px] font-medium uppercase"
                style={{ letterSpacing: "0.08em", color: "var(--text-3)" }}
              >
                Notificaciones
              </div>
              <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                {unreadCount === 0
                  ? "Al día"
                  : `${unreadCount} sin leer`}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="grid h-7 w-7 place-items-center rounded-md"
              style={{ color: "var(--text-3)" }}
            >
              <X size={14} />
            </button>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {items.length === 0 ? (
              <div
                className="px-4 py-8 text-center text-xs"
                style={{ color: "var(--text-3)" }}
              >
                Nada nuevo.
              </div>
            ) : (
              items.map((n) => {
                const meta = NOTIF_META[n.kind];
                const row = (
                  <div
                    className="flex gap-3 px-4 py-3 transition"
                    style={{
                      background: n.unread ? "var(--bg-2)" : "transparent",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                      style={{ background: meta.bg, color: meta.fg }}
                    >
                      {meta.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-[13px] font-medium leading-snug"
                        style={{ color: "var(--text)" }}
                      >
                        {n.title}
                      </div>
                      {n.body && (
                        <div
                          className="mt-0.5 text-[11px] leading-snug"
                          style={{ color: "var(--text-3)" }}
                        >
                          {n.body}
                        </div>
                      )}
                      <div
                        className="mt-1 text-[10px]"
                        style={{ color: "var(--text-3)" }}
                      >
                        {relativeTime(n.created_at)}
                      </div>
                    </div>
                    {n.unread && (
                      <span
                        className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: "var(--brand-turquesa)" }}
                      />
                    )}
                  </div>
                );
                return n.link ? (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => {
                      markOneRead(n.id);
                      setOpen(false);
                    }}
                    className="block"
                  >
                    {row}
                  </Link>
                ) : (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => markOneRead(n.id)}
                    className="block w-full text-left"
                  >
                    {row}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ borderTop: "1px solid var(--border)", background: "var(--bg-2)" }}
          >
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="text-[11px] font-medium disabled:opacity-40"
              style={{ color: "var(--text-2)" }}
            >
              Marcar todo leído
            </button>
            <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
              Resumen diario · 08:00
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMin = Math.round((now - then) / 60000);
  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `hace ${diffD} d`;
  return new Date(iso).toLocaleDateString("es-PR", { day: "numeric", month: "short" });
}
