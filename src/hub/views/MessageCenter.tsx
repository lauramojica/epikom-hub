"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, ContentPost } from "../types";
import Avatar from "./../components/Avatar";
import { todayPR } from "../adapters";

interface HubMessage {
  id: string;
  subject: string;
  body: string;
  sender_id: string;
  recipient_ids: string[];
  template_key: string | null;
  channels: string[];
  sent_at: string;
}

const TEMPLATES = [
  {
    key: "week_assigned",
    icon: "📋",
    name: "Semana asignada",
    subject: "Tus tareas de esta semana están listas",
    body: "¡Hola {nombre}!\n\nTus tareas de esta semana fueron asignadas. Pasa por el Hub para ver tus pendientes y organizar tu semana.\n\nCualquier duda, aquí estamos. 💪",
  },
  {
    key: "pending_tasks",
    icon: "⏰",
    name: "Tareas pendientes",
    subject: "Tienes tareas sin completar",
    body: "¡Hola {nombre}!\n\nVemos que tienes {pendientes} tareas sin completar. Pasa por el Hub para marcarlas como completas.\n\nSi necesitas ayuda para completar alguna, déjanos saber. 🙌",
  },
  {
    key: "good_work",
    icon: "🎉",
    name: "Reconocimiento",
    subject: "¡Buen trabajo esta semana!",
    body: "¡{nombre}!\n\nCerraste la semana completa. Gracias por el trabajo y la constancia. 🔥",
  },
  {
    key: "custom",
    icon: "✍️",
    name: "Mensaje libre",
    subject: "",
    body: "",
  },
];

export default function MessageCenter({ users, posts, currentUserId, canSend }: {
  users: User[];
  posts: ContentPost[];
  currentUserId: string;
  canSend: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<HubMessage[]>([]);
  const [tab, setTab] = useState<"compose" | "history">("compose");
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [subject, setSubject] = useState(TEMPLATES[0].subject);
  const [body, setBody] = useState(TEMPLATES[0].body);
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [channels, setChannels] = useState<string[]>(["hub", "email", "push"]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const crew = users.filter((u) => u.role !== "client");
  const today = todayPR();

  const pendingByUser = useMemo(() => {
    const map: Record<string, number> = {};
    posts.forEach((p) => {
      if (p.assigneeId && p.scheduledDate && p.scheduledDate < today && p.status !== "published") {
        map[p.assigneeId] = (map[p.assigneeId] ?? 0) + 1;
      }
    });
    return map;
  }, [posts, today]);

  const load = useCallback(async () => {
    const { data } = await supabase.from("hub_messages").select("*").order("sent_at", { ascending: false }).limit(30);
    setMessages((data ?? []) as HubMessage[]);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const pickTemplate = (t: typeof TEMPLATES[number]) => {
    setTemplate(t);
    setSubject(t.subject);
    setBody(t.body);
  };

  const toggleUser = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const selectAll = () => setSelected(selected.length === crew.length ? [] : crew.map((u) => u.id));

  const selectPending = () => setSelected(crew.filter((u) => (pendingByUser[u.id] ?? 0) > 0).map((u) => u.id));

  /** Reemplaza {nombre} y {pendientes} por destinatario */
  const personalize = (text: string, u: User) =>
    text
      .replace(/\{nombre\}/g, u.name.split(" ")[0])
      .replace(/\{pendientes\}/g, String(pendingByUser[u.id] ?? 0));

  const send = async () => {
    if (selected.length === 0 || !subject.trim() || !body.trim() || channels.length === 0) return;
    setSending(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          message: body.trim(),
          recipientIds: selected,
          channels,
          templateKey: template.key,
          pendingByUser,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al enviar");

      const r = json.results ?? {};
      const parts: string[] = [];
      if (r.hub) parts.push(`${r.hub} en el Hub`);
      if (r.email) parts.push(`${r.email} por email`);
      if (r.push) parts.push(`${r.push} push`);
      const diag = (json.diagnostics ?? []) as string[];
      setFeedback(
        parts.length
          ? `✓ Enviado: ${parts.join(" · ")}${r.failed ? ` · ${r.failed} fallaron` : ""}${diag.length ? ` — ${diag.join("; ")}` : ""}`
          : `✓ Registrado${diag.length ? ` — ${diag.join("; ")}` : ""}`
      );
      setSelected([]);
      load();
    } catch (err) {
      setFeedback(`✕ ${err instanceof Error ? err.message : "No se pudo enviar."}`);
    } finally {
      setSending(false);
    }
  };

  const previewUser = users.find((u) => u.id === selected[0]) ?? crew[0];

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <p className="font-mono text-muted text-xs tracking-widest uppercase mb-1">Comunicación interna</p>
        <h1 className="font-display text-3xl md:text-5xl font-700 tracking-tight text-ink uppercase">Mensajes</h1>
      </div>

      {!canSend ? (
        <p className="text-xs text-warning bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
          Solo los admins pueden enviar mensajes al crew.
        </p>
      ) : (
        <div className="flex gap-1 bg-surface border border-line rounded-xl p-1 w-fit">
          {(["compose", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wide transition-all ${
                tab === t ? "bg-primary text-bg font-600" : "text-muted hover:text-ink"
              }`}
            >
              {t === "compose" ? "Redactar" : "Historial"}
            </button>
          ))}
        </div>
      )}

      {canSend && tab === "compose" && (
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Redacción */}
          <div className="lg:col-span-2 space-y-4">
            {/* Plantillas */}
            <div>
              <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">Plantilla</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => pickTemplate(t)}
                    className={`px-3 py-2.5 rounded-lg border text-left transition-all ${
                      template.key === t.key ? "border-primary/50 bg-primary/5" : "border-line hover:border-muted"
                    }`}
                  >
                    <span className="text-base">{t.icon}</span>
                    <p className="text-[11px] font-500 text-ink mt-0.5 leading-tight">{t.name}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] text-muted uppercase tracking-widest block mb-1.5">Asunto</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Asunto del mensaje"
                className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-primary/40 placeholder:text-muted/50"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] text-muted uppercase tracking-widest block mb-1.5">Mensaje</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={7}
                placeholder="Escribe tu mensaje…"
                className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-primary/40 resize-none leading-relaxed placeholder:text-muted/50"
              />
              <p className="font-mono text-[9px] text-muted/70 mt-1.5">
                Variables: <span className="text-primary">{"{nombre}"}</span> · <span className="text-primary">{"{pendientes}"}</span> — se reemplazan por cada persona
              </p>
            </div>

            {/* Vista previa */}
            {previewUser && body && (
              <div className="bg-surface border border-line rounded-xl p-4">
                <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">
                  Vista previa · como lo vería {previewUser.name.split(" ")[0]}
                </p>
                <p className="text-sm font-600 text-ink mb-1">{personalize(subject, previewUser)}</p>
                <p className="text-xs text-muted whitespace-pre-wrap leading-relaxed">{personalize(body, previewUser)}</p>
              </div>
            )}

            {feedback && (
              <p className={`text-xs rounded-lg px-3 py-2 border ${feedback.startsWith("✓") ? "text-primary bg-primary/10 border-primary/20" : "text-danger bg-danger/10 border-danger/20"}`}>
                {feedback}
              </p>
            )}

            {/* Canales de envío */}
            <div>
              <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">Enviar por</p>
              <div className="flex gap-2 flex-wrap">
                {([
                  ["hub", "🔔 Hub", "Aparece en sus notificaciones"],
                  ["email", "✉️ Email", "Llega a su correo"],
                  ["push", "📱 Push", "Aviso en su dispositivo"],
                ] as const).map(([key, label, hint]) => {
                  const on = channels.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => setChannels((prev) => on ? prev.filter((c) => c !== key) : [...prev, key])}
                      title={hint}
                      className={`text-xs font-mono px-3 py-2 rounded-lg border transition-all ${
                        on ? "border-primary/50 bg-primary/10 text-primary" : "border-line text-muted hover:text-ink"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={send}
              disabled={sending || selected.length === 0 || !subject.trim() || !body.trim() || channels.length === 0}
              className="text-xs font-mono px-5 py-2.5 rounded-lg bg-primary text-bg font-600 hover:opacity-90 disabled:opacity-30 transition-opacity"
            >
              {sending ? "Enviando…" : selected.length === 0 ? "Selecciona destinatarios" : `Enviar a ${selected.length} ${selected.length === 1 ? "persona" : "personas"}`}
            </button>
          </div>

          {/* Destinatarios */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] text-muted uppercase tracking-widest">Destinatarios</p>
              <div className="flex gap-2">
                <button onClick={selectPending} className="text-[10px] font-mono text-warning hover:opacity-80">con atrasos</button>
                <button onClick={selectAll} className="text-[10px] font-mono text-primary hover:opacity-80">
                  {selected.length === crew.length ? "ninguno" : "todos"}
                </button>
              </div>
            </div>

            <div className="bg-surface border border-line rounded-xl divide-y divide-line overflow-hidden">
              {crew.map((u) => {
                const on = selected.includes(u.id);
                const pending = pendingByUser[u.id] ?? 0;
                return (
                  <label key={u.id} className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors ${on ? "bg-primary/5" : "hover:bg-surface2"}`}>
                    <input type="checkbox" checked={on} onChange={() => toggleUser(u.id)} className="accent-[#31b498]" />
                    <Avatar initials={u.initials} color={u.color} size="xs" src={u.avatarUrl} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-ink truncate">{u.name}</p>
                      <p className="font-mono text-[9px] text-muted uppercase">{u.role}</p>
                    </div>
                    {pending > 0 && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/30">
                        {pending}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
            <p className="text-[10px] text-muted/70 leading-relaxed">
              El número ámbar indica piezas atrasadas de esa persona.
            </p>
          </div>
        </div>
      )}

      {/* Historial */}
      {(tab === "history" || !canSend) && (
        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted">Aún no se han enviado mensajes.</p>
          ) : (
            messages.map((m) => {
              const sender = users.find((u) => u.id === m.sender_id);
              const tpl = TEMPLATES.find((t) => t.key === m.template_key);
              return (
                <div key={m.id} className="bg-surface border border-line rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{tpl?.icon ?? "✉️"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-600 text-ink">{m.subject}</p>
                      <p className="text-xs text-muted whitespace-pre-wrap leading-relaxed mt-1 line-clamp-3">{m.body}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="font-mono text-[10px] text-muted">
                          {sender?.name.split(" ")[0] ?? "—"} · {new Intl.DateTimeFormat("es-PR", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Puerto_Rico" }).format(new Date(m.sent_at))}
                        </span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-line text-muted">
                          {m.recipient_ids.length} {m.recipient_ids.length === 1 ? "destinatario" : "destinatarios"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
