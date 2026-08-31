import { useState, useEffect } from "react";
import type { ContentPost, Project, Client, User } from "../types";
import FridayRecap from "./FridayRecap";
import EmojiReactions from "../components/EmojiReactions";
import AnimatedNumber from "../components/AnimatedNumber";
import DailyWidget from "../components/DailyWidget";

interface Props {
  posts: ContentPost[];
  projects: Project[];
  clients: Client[];
  users: User[];
  activeUser: User;
  loggedUser?: User;
  today: string;
  onMovePost: (id: string, status: ContentPost["status"]) => void;
  onSwitchUser?: (user: User) => void;
}

const channelColors: Record<string, string> = {
  Instagram: "#e1306c", Facebook: "#1877f2", "FB + IG": "#a855f7", TikTok: "#00f2ea",
  LinkedIn: "#0a66c2", YouTube: "#ff0000", Email: "#f59e0b",
};

const statusColors: Record<string, string> = {
  idea: "#6b6b8a", creation: "#a78bfa", design: "#e040fb",
  review: "#f59e0b", approved: "#22c55e", scheduled: "#31b498", published: "#dbfa45",
};

function getWeekDates(refDate: string, offset = 0): string[] {
  const d = new Date(refDate);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd.toISOString().split("T")[0];
  });
}

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatDay(dateStr: string) {
  const d = new Date(dateStr);
  return { day: d.getDate(), month: MONTHS[d.getMonth()] };
}

const EMPTY_DAY_QUIPS = [
  "Nada hoy. A descansar 💆",
  "Free day! Living your best life ✌️",
  "Vacío… por ahora 👀",
  "No hay nada. Yet. 🌚",
  "Un break merecido 🌴",
];

function StreakBadge({ streak, color }: { streak: number; color: string }) {
  const fire = streak >= 14 ? "🔥🔥" : streak >= 7 ? "🔥" : "✨";
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono font-600 animate-pop-in"
      style={{ borderColor: `${color}40`, background: `${color}12`, color }}
    >
      <span className="animate-streak inline-block">{fire}</span>
      <span><AnimatedNumber value={streak} /> días de racha</span>
    </div>
  );
}

function ShoutoutCard({ users, posts, today }: { users: User[]; posts: ContentPost[]; today: string }) {
  const weekStart = (() => {
    const d = new Date(today);
    const day = d.getDay();
    const mon = new Date(d);
    mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return mon.toISOString().split("T")[0];
  })();

  const publishedThisWeek = posts.filter(
    (p) => p.status === "published" && p.publishedDate && p.publishedDate >= weekStart
  );

  if (publishedThisWeek.length === 0) return null;

  const topPost = publishedThisWeek.reduce<ContentPost | null>(
    (best, p) => (!best || (p.reach || 0) > (best.reach || 0) ? p : best), null
  );
  if (!topPost) return null;

  const mvp = users.find((u) => u.id === topPost.assigneeId);
  if (!mvp) return null;

  return (
    <div
      className="rounded-xl p-4 flex items-center gap-4 border animate-pop-in"
      style={{ background: `${mvp.color}10`, borderColor: `${mvp.color}30` }}
    >
      <div className="text-2xl">🌟</div>
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-widest mb-0.5" style={{ color: mvp.color }}>
          Shoutout de la semana
        </p>
        <p className="text-sm font-600 text-ink">
          <span style={{ color: mvp.color }}>{mvp.name.split(" ")[0]}</span>
          {` publicó «${topPost.title}» — `}
          <span className="font-mono">{(topPost.reach || 0).toLocaleString()} personas</span> alcanzadas 🔥
        </p>
      </div>
      <EmojiReactions initialCounts={{ "🔥": 3, "💯": 1 }} compact />
    </div>
  );
}

export default function MyWeek({ posts, projects, clients, users, activeUser, loggedUser, today, onMovePost, onSwitchUser }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [showRecap, setShowRecap] = useState(false);
  const [viewingUser, setViewingUser] = useState(activeUser);
  useEffect(() => { setViewingUser(activeUser); }, [activeUser.id]);
  const [groupByClient, setGroupByClient] = useState(true);
  const me = loggedUser ?? activeUser;
  const canSwitchUsers = me.role === "superadmin";
  const weekDates = getWeekDates(today, weekOffset);

  const switchUser = (u: User) => setViewingUser(u);

  const myPosts = posts.filter((p) => p.assigneeId === viewingUser.id);
  const unscheduled = myPosts.filter((p) => !p.scheduledDate || p.scheduledDate === "");

  const postsByDay: Record<string, ContentPost[]> = {};
  weekDates.forEach((d) => { postsByDay[d] = []; });
  myPosts.forEach((p) => {
    if (postsByDay[p.scheduledDate]) postsByDay[p.scheduledDate].push(p);
  });

  const overdue = myPosts.filter((p) => {
    const d = new Date(p.scheduledDate);
    const t = new Date(today);
    return d < t && p.status !== "published";
  });

  const myProjects = projects.filter((p) =>
    clients.some((c) => c.projectIds.includes(p.id) && (viewingUser.assignedClientIds.includes(c.id) || viewingUser.role !== "crew"))
  );

  const weekLabel = (() => {
    const first = weekDates[0];
    const last = weekDates[6];
    const f = new Date(first);
    const l = new Date(last);
    if (f.getMonth() === l.getMonth())
      return `${f.getDate()}–${l.getDate()} ${MONTHS[f.getMonth()]} ${f.getFullYear()}`;
    return `${f.getDate()} ${MONTHS[f.getMonth()]} – ${l.getDate()} ${MONTHS[l.getMonth()]} ${l.getFullYear()}`;
  })();

  // Weekly progress
  const weekTotal = myPosts.filter((p) => weekDates.includes(p.scheduledDate)).length;
  const weekDone = myPosts.filter(
    (p) => weekDates.includes(p.scheduledDate || "") && (p.status === "published" || p.status === "scheduled" || p.status === "approved")
  ).length;
  const weekGoal = Math.max(12, weekTotal);
  const progressPct = weekGoal > 0 ? Math.round((weekDone / weekGoal) * 100) : 0;
  const streak = viewingUser.streak ?? 0;

  const isFriday = new Date(today).getDay() === 5;

  return (
    <>
      <div className="p-4 md:p-8 space-y-7">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="font-mono text-muted text-xs tracking-widest uppercase mb-1">
              {canSwitchUsers && viewingUser.id !== me.id
                ? `Viendo semana de ${viewingUser.name.split(" ")[0]} 👀`
                : `Hola, ${viewingUser.name.split(" ")[0]} 👋`}
            </p>
            <h1 className="font-display text-3xl md:text-5xl font-700 tracking-tight text-ink uppercase">Mi Semana</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Admin crew switcher */}
            {canSwitchUsers && (
              <div className="flex items-center gap-1 bg-surface border border-line rounded-xl p-1">
                {users.filter((u) => u.role === "crew" || u.role === "admin" || u.role === "superadmin").map((u) => (
                  <button
                    key={u.id}
                    onClick={() => switchUser(u)}
                    title={u.name}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-700 transition-all ${viewingUser.id === u.id ? "ring-2" : "hover:opacity-80 opacity-50"}`}
                    style={{
                      background: `${u.color}25`,
                      color: u.color,
                      outline: viewingUser.id === u.id ? `2px solid ${u.color}` : "none",
                    }}
                  >
                    {u.initials[0]}
                  </button>
                ))}
              </div>
            )}
            {streak > 0 && <StreakBadge streak={streak} color={viewingUser.color} />}
            {(isFriday || true) && (
              <button
                onClick={() => setShowRecap(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-600 border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 transition-all"
              >
                <span>✨</span> Friday Recap
              </button>
            )}
          </div>
        </div>

        <DailyWidget userName={me.name} />

        {/* Weekly progress bar */}
        <div className="bg-surface border border-line rounded-xl px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs text-muted uppercase tracking-widest">Progreso semanal</span>
            <span className="font-mono text-sm font-600 text-ink">
              <AnimatedNumber value={weekDone} /> de {weekGoal} esta semana {weekDone >= weekGoal ? "🔥" : ""}
            </span>
          </div>
          <div className="w-full h-2 bg-surface2 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full progress-fill"
              style={{
                width: `${progressPct}%`,
                background: progressPct >= 100
                  ? "#dbfa45"
                  : progressPct >= 60
                    ? "#31b498"
                    : "#f59e0b",
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="font-mono text-[10px] text-muted">{progressPct}% completado</span>
            {progressPct >= 100 && (
              <span className="font-mono text-[10px] text-accent animate-bounce-slow">¡Meta cumplida! 🎉</span>
            )}
          </div>
        </div>

        {/* Shoutout */}
        <ShoutoutCard users={users} posts={posts} today={today} />

        {/* Nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="w-8 h-8 rounded-lg border border-line bg-surface2 flex items-center justify-center text-muted hover:text-ink transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <span className="font-mono text-xs text-muted px-3">{weekLabel}</span>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            className="w-8 h-8 rounded-lg border border-line bg-surface2 flex items-center justify-center text-muted hover:text-ink transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-xs font-mono text-primary border border-primary/30 px-3 py-1 rounded-lg hover:bg-primary/10 transition-all"
            >
              Hoy
            </button>
          )}
          <div className="flex gap-1 bg-surface border border-line rounded-lg p-0.5 ml-auto">
            {([["clients", "Por cliente"], ["days", "Solo mías"]] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setGroupByClient(k === "clients")}
                className={`px-3 py-1 rounded-md text-[10px] font-mono uppercase tracking-wide transition-all ${
                  (k === "clients") === groupByClient ? "bg-primary text-bg font-600" : "text-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Esta semana", value: Object.values(postsByDay).flat().length, color: "var(--stat-teal)" },
            { label: "Vencidos", value: overdue.length, color: overdue.length > 0 ? "#ef4444" : "var(--app-muted)" },
            { label: "Publicados hoy", value: myPosts.filter((p) => p.publishedDate === today).length, color: "var(--stat-lime)" },
            { label: "Proyectos activos", value: myProjects.filter((p) => p.status === "active").length, color: "var(--stat-violet)" },
          ].map((s) => (
            <div key={s.label} className="bg-surface border border-line rounded-xl p-4 hover:border-muted/40 transition-all">
              <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">{s.label}</p>
              <p className="font-mono text-4xl font-700" style={{ color: s.color }}><AnimatedNumber value={s.value} /></p>
            </div>
          ))}
        </div>

        {/* Weekly grid */}
        <div className="bg-surface border border-line rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <div className="grid grid-cols-7 border-b border-line min-w-[640px]">
            {weekDates.map((date, i) => {
              const { day, month } = formatDay(date);
              const isToday = date === today;
              return (
                <div
                  key={date}
                  className={`px-3 py-3 text-center border-r border-line last:border-r-0 ${isToday ? "bg-accent/5" : ""}`}
                >
                  <p className={`font-mono text-[10px] uppercase tracking-widest ${isToday ? "text-accent" : "text-muted"}`}>
                    {DAY_NAMES[i]}
                  </p>
                  <p className={`font-mono text-lg font-700 ${isToday ? "text-accent" : "text-ink"}`}>{day}</p>
                  <p className="font-mono text-[9px] text-muted uppercase">{month}</p>
                </div>
              );
            })}
          </div>
          {groupByClient ? (
            /* Vista agrupada: una fila por cliente (todos, tengan o no tareas) */
            <div className="min-w-[640px]">
              {clients.map((client) => {
                const clientPosts = myPosts.filter((p) => p.clientId === client.id);
                const hasAny = clientPosts.some((p) => weekDates.includes(p.scheduledDate));
                return (
                  <div key={client.id} className="border-b border-line last:border-b-0">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-surface2/40">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: client.color }} />
                      <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: hasAny ? client.color : "var(--app-muted)" }}>
                        {client.company}
                      </span>
                      {!hasAny && <span className="font-mono text-[9px] text-muted/40 ml-auto">sin contenido esta semana</span>}
                    </div>
                    <div className="grid grid-cols-7 min-h-[64px]">
                      {weekDates.map((date) => {
                        const cellPosts = clientPosts.filter((p) => p.scheduledDate === date);
                        const isToday = date === today;
                        return (
                          <div key={date} className={`p-1.5 border-r border-line last:border-r-0 space-y-1 ${isToday ? "bg-accent/[0.03]" : ""}`}>
                            {cellPosts.map((post) => (
                              <div
                                key={post.id}
                                className="rounded-md p-2 cursor-pointer hover-lift"
                                style={{ background: `${channelColors[post.channel]}15`, borderLeft: `2px solid ${channelColors[post.channel]}` }}
                              >
                                <p className="text-[11px] font-700 text-ink leading-snug truncate">{post.title}</p>
                                <div className="flex items-center justify-between mt-0.5">
                                  <span className="text-[9px] font-mono" style={{ color: channelColors[post.channel] }}>
                                    {post.channel.slice(0, 2).toUpperCase()}
                                  </span>
                                  <span className="text-[9px] font-mono capitalize" style={{ color: statusColors[post.status] }}>
                                    {post.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {clients.length === 0 && (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted">Aún no hay clientes registrados.</p>
                </div>
              )}
            </div>
          ) : (
            /* Vista simple: solo mis tareas por día */
            <div className="grid grid-cols-7 min-h-[200px] min-w-[640px]">
              {weekDates.map((date, i) => {
                const dayPosts = postsByDay[date] || [];
                const isToday = date === today;
                return (
                  <div key={date} className={`p-2 border-r border-line last:border-r-0 space-y-1.5 ${isToday ? "bg-accent/[0.03]" : ""}`}>
                    {dayPosts.map((post) => {
                      const client = clients.find((c) => c.id === post.clientId);
                      return (
                        <div
                          key={post.id}
                          className="rounded-lg p-2 cursor-pointer hover-lift"
                          style={{ background: `${channelColors[post.channel]}15`, borderLeft: `2px solid ${channelColors[post.channel]}` }}
                        >
                          <p className="text-[11px] font-700 text-ink leading-snug truncate">{post.title}</p>
                          <p className="text-[10px] text-muted truncate">{client?.company}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[9px] font-mono" style={{ color: channelColors[post.channel] }}>
                              {post.channel.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="text-[9px] font-mono capitalize px-1 rounded" style={{ color: statusColors[post.status] }}>
                              {post.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {dayPosts.length === 0 && (
                      <div className="h-full min-h-[80px] flex items-center justify-center px-1">
                        <span className="text-[9px] text-muted/25 text-center leading-snug">
                          {EMPTY_DAY_QUIPS[i % EMPTY_DAY_QUIPS.length]}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>

        {/* Sin fecha */}
        {unscheduled.length > 0 && (
          <div className="bg-surface border border-line rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-muted opacity-50" />
              <h3 className="font-display text-lg font-700 uppercase text-muted">Sin fecha ({unscheduled.length})</h3>
              <span className="text-[10px] font-mono text-muted/60 ml-1">• esperando que alguien los ubique 🗓️</span>
            </div>
            <div className="flex gap-3 p-4 overflow-x-auto">
              {unscheduled.map((post) => {
                const client = clients.find((c) => c.id === post.clientId);
                return (
                  <div key={post.id} className="flex-shrink-0 w-44 rounded-lg p-3 border border-line bg-surface2 hover:border-muted/40 transition-all">
                    <p className="text-xs font-600 text-ink leading-tight mb-1 line-clamp-2">{post.title}</p>
                    <p className="text-[10px] text-muted mb-2">{client?.company}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${channelColors[post.channel]}15`, color: channelColors[post.channel] }}>
                        {post.channel.slice(0, 3)}
                      </span>
                      <span className="text-[9px] font-mono text-muted capitalize">{post.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          {/* Overdue */}
          {overdue.length > 0 && (
            <div className="bg-surface border border-danger/20 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-danger/20 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                <h3 className="font-display text-lg font-700 uppercase text-danger">
                  ¡Ojo! Vencidos ({overdue.length})
                </h3>
              </div>
              <div className="divide-y divide-line">
                {overdue.map((post) => {
                  const client = clients.find((c) => c.id === post.clientId);
                  return (
                    <div key={post.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: channelColors[post.channel] }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-500 text-ink truncate">{post.title}</p>
                        <p className="text-xs text-muted">{client?.company} · {post.scheduledDate}</p>
                      </div>
                      <button
                        onClick={() => onMovePost(post.id, "published")}
                        className="text-[10px] font-mono text-success border border-success/30 px-2 py-1 rounded hover:bg-success/10 transition-all flex-shrink-0"
                      >
                        Publicar ✓
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upcoming deliverables */}
          <div className={`bg-surface border border-line rounded-xl overflow-hidden ${overdue.length === 0 ? "col-span-2" : ""}`}>
            <div className="px-5 py-4 border-b border-line">
              <h3 className="font-display text-lg font-700 uppercase text-ink">Entregables próximos</h3>
            </div>
            <div className="divide-y divide-line">
              {myProjects
                .flatMap((p) => p.deliverables.filter((d) => d.status !== "approved").map((d) => ({ proj: p, deliv: d })))
                .slice(0, 5)
                .map(({ proj, deliv }) => {
                  const client = clients.find((c) => c.id === proj.clientId);
                  return (
                    <div key={deliv.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: proj.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-500 text-ink truncate">{deliv.title}</p>
                        <p className="text-xs text-muted">{client?.company} · {proj.name}</p>
                      </div>
                      <EmojiReactions compact />
                      <span
                        className={`text-[10px] font-mono flex-shrink-0 px-2 py-0.5 rounded border ${
                          deliv.status === "in-review"
                            ? "text-warning border-warning/30"
                            : deliv.status === "rejected"
                              ? "text-danger border-danger/30"
                              : "text-muted border-line"
                        }`}
                      >
                        {deliv.status}
                      </span>
                      <span className="text-xs font-mono text-muted flex-shrink-0">{deliv.dueDate.slice(5)}</span>
                    </div>
                  );
                })}
              {myProjects.flatMap((p) => p.deliverables.filter((d) => d.status !== "approved")).length === 0 && (
                <div className="px-5 py-10 text-center">
                  <p className="text-2xl mb-2">🎊</p>
                  <p className="text-sm font-500 text-ink">Todo al día</p>
                  <p className="text-xs text-muted mt-1">No hay entregables pendientes. You're winning.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showRecap && (
        <FridayRecap
          posts={posts}
          projects={projects}
          users={users}
          activeUser={activeUser}
          onClose={() => setShowRecap(false)}
        />
      )}
    </>
  );
}
