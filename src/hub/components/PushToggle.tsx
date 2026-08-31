"use client";
import { useEffect, useState } from "react";

type State = "unsupported" | "denied" | "off" | "on" | "working";

/** Convierte la clave VAPID base64url a Uint8Array */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function PushToggle({ onToast }: { onToast?: (m: string, k?: "success" | "error" | "info") => void }) {
  const [state, setState] = useState<State>("off");
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") { setState("denied"); return; }
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    });
  }, []);

  const enable = async () => {
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        onToast?.("Permiso de notificaciones denegado.", "error");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapid) {
        setState("off");
        setDetail("Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY en Vercel. Añádela y haz Redeploy.");
        onToast?.("Falta la clave push en el servidor.", "error");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "No se pudo guardar la suscripción");
      }

      setState("on");
      setDetail(null);
      onToast?.("🔔 Notificaciones activadas en este dispositivo.", "success");

      // Notificación local inmediata para confirmar que funciona
      const reg2 = await navigator.serviceWorker.ready;
      reg2.showNotification("Epikom Hub", {
        body: "¡Listo! Las notificaciones están activas en este dispositivo.",
        icon: "/icon-192.png",
        badge: "/badge-72.png",
      });
    } catch (err) {
      console.error("Push error:", err);
      setState("off");
      setDetail(err instanceof Error ? err.message : "Error desconocido");
      onToast?.("No se pudieron activar las notificaciones.", "error");
    }
  };

  const disable = async () => {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
      onToast?.("Notificaciones desactivadas en este dispositivo.", "info");
    } catch {
      setState("on");
    }
  };

  if (state === "unsupported") {
    return <p className="text-xs text-muted">Este navegador no soporta notificaciones push.</p>;
  }

  if (state === "denied") {
    return (
      <p className="text-xs text-muted leading-relaxed">
        Bloqueaste las notificaciones para este sitio. Actívalas desde la configuración del navegador
        (el candado 🔒 junto a la dirección) y recarga.
      </p>
    );
  }

  return (
    <div className="space-y-2">
    <div className="flex items-center gap-3">
      <button
        onClick={state === "on" ? disable : enable}
        disabled={state === "working"}
        className={`text-xs font-mono px-4 py-2 rounded-lg font-600 transition-all disabled:opacity-50 ${
          state === "on"
            ? "border border-line text-muted hover:text-danger hover:border-danger/40"
            : "bg-primary text-bg hover:opacity-90"
        }`}
      >
        {state === "working" ? "…" : state === "on" ? "Desactivar en este dispositivo" : "🔔 Activar notificaciones"}
      </button>
      {state === "on" && <span className="text-[10px] font-mono text-primary">✓ activas aquí</span>}
    </div>
    {detail && (
      <p className="text-[11px] text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 leading-relaxed">
        {detail}
      </p>
    )}
    {state === "on" && (
      <p className="text-[10px] text-muted leading-relaxed">
        Si no ves las notificaciones, revisa que el navegador y el sistema las tengan permitidas
        (en Mac: Configuración → Notificaciones → tu navegador).
      </p>
    )}
    </div>
  );
}
