"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "../types";
import Avatar from "./Avatar";

export interface HubComment {
  id: string;
  entity_type: string;
  entity_id: string;
  parent_id: string | null;
  body: string;
  author_id: string;
  mentions: string[];
  reactions: Record<string, string[]>;
  edited_at: string | null;
  created_at: string;
}

const QUICK_REACTIONS = ["🔥", "💯", "👏", "👀", "✅"];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d}d`;
  return new Intl.DateTimeFormat("es-PR", { day: "numeric", month: "short", timeZone: "America/Puerto_Rico" }).format(new Date(iso));
}

export default function DiscussionBoard({ entityType, entityId, users, currentUserId, compact = false }: {
  entityType: "post" | "project" | "deliverable";
  entityId: string;
  users: User[];
  currentUserId: string;
  compact?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [comments, setComments] = useState<HubComment[]>([]);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("hub_comments")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: true });
    setComments((data ?? []) as HubComment[]);
    setLoading(false);
  }, [supabase, entityType, entityId]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  // Realtime: comentarios nuevos aparecen solos
  useEffect(() => {
    const ch = supabase
      .channel(`comments-${entityType}-${entityId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "hub_comments", filter: `entity_id=eq.${entityId}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, entityType, entityId, load]);

  /* Detecta @menciones mientras se escribe (soporta acentos y ñ) */
  const MENTION_RE = /@([\p{L}\p{N}_]*)$/u;

  const handleDraftChange = (v: string, cursorPos?: number) => {
    setDraft(v);
    const upToCursor = cursorPos !== undefined ? v.slice(0, cursorPos) : v;
    const match = upToCursor.match(MENTION_RE);
    setMentionQuery(match ? match[1].toLowerCase() : null);
  };

  const insertMention = (u: User) => {
    const firstName = u.name.split(" ")[0];
    setDraft((d) => d.replace(MENTION_RE, `@${firstName} `));
    setMentionQuery(null);
    // Devolver el foco al campo
    setTimeout(() => {
      const el = document.querySelector<HTMLTextAreaElement>("[data-comment-input]");
      el?.focus();
    }, 0);
  };

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    // Resolver @menciones a user ids
    const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const bodyNorm = norm(body);
    const mentioned = users
      .filter((u) => {
        const first = norm(u.name.split(" ")[0]);
        const full = norm(u.name).replace(/\s+/g, "");
        return bodyNorm.includes(`@${first}`) || bodyNorm.includes(`@${full}`);
      })
      .map((u) => u.id);
    const { error } = await supabase.from("hub_comments").insert({
      entity_type: entityType,
      entity_id: entityId,
      parent_id: replyTo,
      body,
      author_id: currentUserId,
      mentions: mentioned,
    });
    setSending(false);
    if (!error) { setDraft(""); setReplyTo(null); load(); }
  };

  const toggleReaction = async (c: HubComment, emoji: string) => {
    const current = c.reactions?.[emoji] ?? [];
    const mine = current.includes(currentUserId);
    const next = { ...(c.reactions ?? {}) };
    const updated = mine ? current.filter((id) => id !== currentUserId) : [...current, currentUserId];
    if (updated.length === 0) delete next[emoji];
    else next[emoji] = updated;
    setComments((prev) => prev.map((x) => (x.id === c.id ? { ...x, reactions: next } : x)));
    await supabase.from("hub_comments").update({ reactions: next }).eq("id", c.id);
  };

  const saveEdit = async (id: string) => {
    const body = editBody.trim();
    if (!body) return;
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, body, edited_at: new Date().toISOString() } : c)));
    setEditingId(null);
    await supabase.from("hub_comments").update({ body, edited_at: new Date().toISOString() }).eq("id", id);
  };

  const remove = async (id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id && c.parent_id !== id));
    await supabase.from("hub_comments").delete().eq("id", id);
  };

  const roots = comments.filter((c) => !c.parent_id);
  const repliesOf = (id: string) => comments.filter((c) => c.parent_id === id);
  const normalize = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const mentionMatches = mentionQuery !== null
    ? users
        .filter((u) => u.role !== "client")
        .filter((u) => normalize(u.name).includes(normalize(mentionQuery)))
        .slice(0, 5)
    : [];

  const renderComment = (c: HubComment, isReply = false) => {
    const author = users.find((u) => u.id === c.author_id);
    const isMine = c.author_id === currentUserId;
    const reactions = Object.entries(c.reactions ?? {}).filter(([, ids]) => ids.length > 0);

    return (
      <div key={c.id} className={isReply ? "ml-9 mt-2" : ""}>
        <div className="flex gap-2.5">
          <Avatar
            initials={author?.initials ?? "?"}
            color={author?.color ?? "#8b93a1"}
            size={isReply ? "xs" : "sm"}
            src={author?.avatarUrl}
            className="mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-xs font-600 text-ink">{author?.name ?? "Usuario"}</span>
              <span className="font-mono text-[10px] text-muted">{timeAgo(c.created_at)}</span>
              {c.edited_at && <span className="font-mono text-[9px] text-muted/60">editado</span>}
            </div>

            {editingId === c.id ? (
              <div className="mt-1.5 space-y-2">
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={2}
                  className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-primary/40 resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(c.id)} className="text-[10px] font-mono px-3 py-1 rounded-lg bg-primary text-bg font-600">Guardar</button>
                  <button onClick={() => setEditingId(null)} className="text-[10px] font-mono px-3 py-1 rounded-lg border border-line text-muted">Cancelar</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink leading-relaxed mt-0.5 whitespace-pre-wrap break-words">
                {c.body.split(/(@\w+)/g).map((part, i) =>
                  part.startsWith("@") ? (
                    <span key={i} className="text-primary font-500">{part}</span>
                  ) : part
                )}
              </p>
            )}

            {/* Reacciones */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {reactions.map(([emoji, ids]) => (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(c, emoji)}
                  className={`text-[11px] px-1.5 py-0.5 rounded-full border transition-all ${
                    ids.includes(currentUserId)
                      ? "border-primary/40 bg-primary/10"
                      : "border-line hover:border-muted"
                  }`}
                >
                  {emoji} <span className="font-mono text-[9px] text-muted">{ids.length}</span>
                </button>
              ))}

              <div className="group relative">
                <button className="text-[11px] text-muted/50 hover:text-muted px-1 transition-colors" title="Reaccionar">☺</button>
                <div className="absolute left-0 bottom-full mb-1 hidden group-hover:flex gap-0.5 bg-surface border border-line rounded-lg px-1.5 py-1 z-20 dropdown-solid">
                  {QUICK_REACTIONS.map((e) => (
                    <button key={e} onClick={() => toggleReaction(c, e)} className="text-sm hover:scale-125 transition-transform px-0.5">{e}</button>
                  ))}
                </div>
              </div>

              {!isReply && (
                <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} className="text-[10px] font-mono text-muted hover:text-primary transition-colors">
                  responder
                </button>
              )}
              {isMine && editingId !== c.id && (
                <>
                  <button onClick={() => { setEditingId(c.id); setEditBody(c.body); }} className="text-[10px] font-mono text-muted hover:text-ink transition-colors">editar</button>
                  <button onClick={() => remove(c.id)} className="text-[10px] font-mono text-muted hover:text-danger transition-colors">borrar</button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Respuestas */}
        {repliesOf(c.id).map((r) => renderComment(r, true))}

        {/* Caja de respuesta */}
        {replyTo === c.id && (
          <div className="ml-9 mt-2 relative">
            <div className="flex gap-2">
              <input
                autoFocus
                data-comment-input
                value={draft}
                onChange={(e) => handleDraftChange(e.target.value, e.target.selectionStart ?? undefined)}
                onKeyDown={(e) => {
                  if (mentionMatches.length > 0 && (e.key === "Tab" || e.key === "Enter")) {
                    e.preventDefault();
                    insertMention(mentionMatches[0]);
                    return;
                  }
                  if (e.key === "Escape") { setMentionQuery(null); return; }
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder={`Responder a ${author?.name.split(" ")[0]}… usa @ para mencionar`}
                className="flex-1 bg-surface2 border border-line rounded-lg px-3 py-1.5 text-xs text-ink outline-none focus:border-primary/40"
              />
              <button onClick={send} disabled={sending || !draft.trim()} className="text-[10px] font-mono px-3 rounded-lg bg-primary text-bg font-600 disabled:opacity-40">
                Enviar
              </button>
            </div>
            {mentionMatches.length > 0 && (
              <div className="absolute left-0 bottom-full mb-1 w-56 border border-line rounded-xl overflow-hidden z-30 dropdown-solid">
                {mentionMatches.map((u) => (
                  <button key={u.id} onClick={() => insertMention(u)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface2 transition-colors text-left">
                    <Avatar initials={u.initials} color={u.color} size="xs" src={u.avatarUrl} />
                    <span className="text-xs text-ink">{u.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-[10px] text-muted uppercase tracking-widest">
          Discusión {comments.length > 0 && `(${comments.length})`}
        </h3>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => <div key={i} className="h-12 rounded-lg skeleton-base" />)}
        </div>
      ) : roots.length === 0 ? (
        <p className="text-xs text-muted py-2">Nadie ha comentado todavía. Rompe el hielo 👇</p>
      ) : (
        <div className="space-y-4">{roots.map((c) => renderComment(c))}</div>
      )}

      {/* Nuevo comentario */}
      {replyTo === null && (
        <div className="relative">
          <div className="flex gap-2">
            <textarea
              data-comment-input
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value, e.target.selectionStart)}
              onKeyDown={(e) => {
                if (mentionMatches.length > 0 && (e.key === "Tab" || e.key === "Enter") && !e.shiftKey) {
                  e.preventDefault();
                  insertMention(mentionMatches[0]);
                  return;
                }
                if (e.key === "Escape") { setMentionQuery(null); return; }
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder="Escribe un comentario… usa @ para mencionar"
              rows={2}
              className="flex-1 bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-primary/40 resize-none placeholder:text-muted/50"
            />
          </div>

          {/* Autocompletar menciones */}
          {mentionMatches.length > 0 && (
            <div className="absolute left-0 bottom-full mb-1 w-56 border border-line rounded-xl overflow-hidden z-30 dropdown-solid">
              {mentionMatches.map((u) => (
                <button
                  key={u.id}
                  onClick={() => insertMention(u)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface2 transition-colors text-left"
                >
                  <Avatar initials={u.initials} color={u.color} size="xs" src={u.avatarUrl} />
                  <span className="text-xs text-ink">{u.name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setDraft((d) => d + "@"); setMentionQuery(""); setTimeout(() => document.querySelector<HTMLTextAreaElement>("[data-comment-input]")?.focus(), 0); }}
                className="text-[11px] font-mono text-muted hover:text-primary transition-colors"
                title="Mencionar a alguien"
              >
                @ mencionar
              </button>
              <span className="font-mono text-[9px] text-muted/60">Enter envía · Shift+Enter salta línea</span>
            </div>
            <button
              onClick={send}
              disabled={sending || !draft.trim()}
              className="text-[10px] font-mono px-4 py-1.5 rounded-lg bg-primary text-bg font-600 hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {sending ? "Enviando…" : "Comentar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
