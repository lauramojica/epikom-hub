"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";

type State = "loading" | "unsupported" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export function EnablePushButton() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [endpoint, setEndpoint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === "undefined") return;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setState("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        const sub = (await reg?.pushManager.getSubscription?.()) ?? null;
        if (!cancelled) {
          setEndpoint(sub?.endpoint ?? null);
          setState(sub ? "on" : "off");
        }
      } catch {
        if (!cancelled) setState("off");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapid) {
        alert("Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY en el server.");
        return;
      }
      const reg =
        (await navigator.serviceWorker.getRegistration("/sw.js")) ??
        (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;

      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          user_agent: navigator.userAgent,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`No se pudo guardar la suscripción: ${data.error ?? res.status}`);
        return;
      }
      setEndpoint(json.endpoint ?? null);
      setState("on");
    } catch (err) {
      console.error(err);
      alert("Error activando notificaciones.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      const ep = sub?.endpoint ?? endpoint;
      if (sub) await sub.unsubscribe();
      if (ep) {
        await fetch(
          `/api/push/subscribe?endpoint=${encodeURIComponent(ep)}`,
          { method: "DELETE" }
        );
      }
      setEndpoint(null);
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return null;

  if (state === "unsupported") {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs"
        style={{
          background: "var(--bg-2)",
          border: "1px solid var(--border)",
          color: "var(--text-3)",
        }}
      >
        <BellOff size={14} />
        Tu navegador no soporta notificaciones push
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs"
        style={{
          background: "var(--warn-soft)",
          border: "1px solid var(--warn-soft)",
          color: "var(--warn)",
        }}
      >
        <BellOff size={14} />
        Notificaciones bloqueadas. Habilítalas en ajustes del navegador.
      </div>
    );
  }

  if (state === "on") {
    return (
      <button
        type="button"
        onClick={disable}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition disabled:opacity-60"
        style={{
          background: "var(--brand-turquesa-soft)",
          border: "1px solid var(--brand-turquesa-soft)",
          color: "var(--brand-turquesa-ink)",
        }}
      >
        <BellRing size={14} />
        Notificaciones activas · desactivar
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={enable}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition disabled:opacity-60"
      style={{
        background: "var(--bg)",
        border: "1px solid var(--border)",
        color: "var(--text)",
      }}
    >
      <Bell size={14} />
      Activar notificaciones del navegador
    </button>
  );
}
