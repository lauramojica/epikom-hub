import type { Notification, Client } from "../types";

interface Props {
  notifications: Notification[];
  clients: Client[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

const typeConfig: Record<string, { label: string; color: string; icon: string; casual: string }> = {
  alert:    { label: "Alerta",      color: "#ef4444", icon: "⚠",  casual: "¡Ojo ahí!" },
  approval: { label: "Aprobación",  color: "#f59e0b", icon: "✓",  casual: "Waiting on you" },
  mention:  { label: "Mención",     color: "#a78bfa", icon: "@",  casual: "Te llamaron" },
  publish:  { label: "Publicación", color: "#31b498", icon: "▶",  casual: "Salió al mundo 🚀" },
  system:   { label: "Sistema",     color: "#6b6b8a", icon: "⚙",  casual: "FYI" },
  shoutout: { label: "Shoutout",    color: "#dbfa45", icon: "⭐", casual: "¡Te ganaste esto! 🎉" },
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2)  return "ahora mismo 👀";
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

function groupByTime(notifications: Notification[]): { label: string; items: Notification[] }[] {
  const now = Date.now();
  const DAY = 86400000;
  const today: Notification[] = [];
  const thisWeek: Notification[] = [];
  const older: Notification[] = [];

  notifications.forEach((n) => {
    const diff = now - new Date(n.timestamp).getTime();
    if (diff < DAY) today.push(n);
    else if (diff < 7 * DAY) thisWeek.push(n);
    else older.push(n);
  });

  return [
    { label: "Hoy", items: today },
    { label: "Esta semana", items: thisWeek },
    { label: "Anteriores", items: older },
  ].filter((g) => g.items.length > 0);
}

function NotifItem({ n, clients, onMarkRead, dimmed = false }: { n: Notification; clients: Client[]; onMarkRead: (id: string) => void; dimmed?: boolean }) {
  const tc = typeConfig[n.type] || typeConfig.system;
  const client = n.clientId ? clients.find((c) => c.id === n.clientId) : null;
  return (
    <div className={`flex items-start gap-4 px-5 py-4 hover:bg-surface2 transition-colors group ${dimmed ? "opacity-50" : ""}`}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 font-700" style={{ background: `${tc.color}18`, color: tc.color }}>
        {tc.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-600 ${dimmed ? "text-muted" : "text-ink"}`}>{n.title}</p>
          <span className="font-mono text-[10px] text-muted flex-shrink-0 whitespace-nowrap">{timeAgo(n.timestamp)}</span>
        </div>
        <p className="text-sm text-muted mt-0.5 leading-relaxed">{n.message}</p>
        {client && <p className="text-[10px] font-mono text-muted/60 mt-1">{client.company}</p>}
      </div>
      {!n.read && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <button onClick={() => onMarkRead(n.id)} className="text-[10px] font-mono text-muted hover:text-ink border border-line px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all">
            ✓ Leído
          </button>
        </div>
      )}
    </div>
  );
}

export default function NotificationsView({ notifications, clients, onMarkRead, onMarkAllRead }: Props) {
  const unread = notifications.filter((n) => !n.read);
  const types  = Object.keys(typeConfig);

  const unreadGroups = groupByTime(unread);
  const readGroups   = groupByTime(notifications.filter((n) => n.read));

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-muted text-xs tracking-widest uppercase mb-1">Bandeja de entrada</p>
          <h1 className="font-display text-5xl font-700 tracking-tight text-ink uppercase">Notificaciones</h1>
        </div>
        {unread.length > 0 && (
          <button onClick={onMarkAllRead} className="text-xs font-mono px-4 py-2 rounded-lg border border-line text-muted hover:text-ink hover:border-muted transition-all">
            Todo leído ✓
          </button>
        )}
      </div>

      {/* Type chips */}
      <div className="flex gap-2 flex-wrap">
        {types.map((t) => {
          const tc = typeConfig[t];
          const count = notifications.filter((n) => n.type === t).length;
          if (count === 0) return null;
          return (
            <span key={t} className="text-[10px] font-mono px-2.5 py-1 rounded-full border transition-all" style={{ borderColor: `${tc.color}30`, color: tc.color, background: `${tc.color}08` }}>
              {tc.icon} {tc.casual}: {count}
            </span>
          );
        })}
      </div>

      {/* Unread grouped */}
      {unread.length > 0 && (
        <div className="space-y-4">
          <p className="font-mono text-xs text-muted uppercase tracking-widest px-1">Sin leer ({unread.length}) 🔴</p>
          {unreadGroups.map((group) => (
            <div key={group.label}>
              <p className="font-mono text-[10px] text-muted/50 uppercase tracking-widest px-1 mb-1.5">{group.label}</p>
              <div className="bg-surface border border-line rounded-xl overflow-hidden divide-y divide-line">
                {group.items.map((n) => (
                  <NotifItem key={n.id} n={n} clients={clients} onMarkRead={onMarkRead} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Read grouped */}
      {readGroups.length > 0 && (
        <div className="space-y-4">
          <p className="font-mono text-xs text-muted uppercase tracking-widest px-1">Vistas</p>
          {readGroups.map((group) => (
            <div key={group.label}>
              <p className="font-mono text-[10px] text-muted/40 uppercase tracking-widest px-1 mb-1.5">{group.label}</p>
              <div className="bg-surface border border-line rounded-xl overflow-hidden divide-y divide-line">
                {group.items.map((n) => (
                  <NotifItem key={n.id} n={n} clients={clients} onMarkRead={onMarkRead} dimmed />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {notifications.length === 0 && (
        <div className="text-center py-20 space-y-3">
          <p className="text-5xl">🎊</p>
          <p className="font-display text-4xl font-700 text-muted/30 uppercase">Cero notis</p>
          <p className="text-sm text-muted">You're living your best life right now. Disfrútalo.</p>
        </div>
      )}
      {notifications.length > 0 && unread.length === 0 && (
        <div className="text-center py-8 space-y-2">
          <p className="text-3xl">✨</p>
          <p className="text-sm text-muted">Todo al día. No hay nada más aquí, bestie.</p>
        </div>
      )}
    </div>
  );
}
