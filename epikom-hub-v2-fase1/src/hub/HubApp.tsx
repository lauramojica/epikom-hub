"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ContentPost, Project, Client, User, Notification, View, DeliverableStatus, Document, AttachedFile, ProjectPhase } from "./types";
import { useHubData } from "./useHubData";
import { todayPR, computeStreak } from "./adapters";
import MyWeek from "./views/MyWeek";
import ContentCalendar from "./views/ContentCalendar";
import ProjectsView from "./views/ProjectsView";
import ClientsView from "./views/ClientsView";
import Analytics from "./views/Analytics";
import NotificationsView from "./views/NotificationsView";
import RolesView from "./views/RolesView";
import SettingsView from "./views/SettingsView";
import DocumentsView from "./views/DocumentsView";
import Avatar from "./components/Avatar";
import UserProfilePanel from "./components/UserProfilePanel";
import Confetti from "./components/Confetti";
import { ToastProvider, useToast } from "./components/Toast";
import ConfirmModal from "./components/ConfirmModal";

const navItems: { key: View; label: string; icon: React.ReactElement }[] = [
  { key: "myweek", label: "Mi Semana", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="3" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M1 7H17" stroke="currentColor" strokeWidth="1.5"/><path d="M5 1V4M13 1V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><rect x="4" y="10" width="2" height="2" rx="0.5" fill="currentColor"/><rect x="8" y="10" width="2" height="2" rx="0.5" fill="currentColor"/></svg> },
  { key: "calendar", label: "Calendario", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 3H15C16.1 3 17 3.9 17 5V15C17 16.1 16.1 17 15 17H3C1.9 17 1 16.1 1 15V5C1 3.9 1.9 3 3 3Z" stroke="currentColor" strokeWidth="1.5"/><path d="M1 8H17" stroke="currentColor" strokeWidth="1.5"/><circle cx="6" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><path d="M5 1V4M13 1V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { key: "projects", label: "Proyectos", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M1 5C1 3.9 1.9 3 3 3H7L9 5H15C16.1 5 17 5.9 17 7V14C17 15.1 16.1 16 15 16H3C1.9 16 1 15.1 1 14V5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg> },
  { key: "clients", label: "Clientes", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="3" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M1 7H17" stroke="currentColor" strokeWidth="1.5"/><path d="M5 11H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { key: "analytics", label: "Analítica", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M1 14L5 9L8 12L12 6L17 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 17H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { key: "notifications", label: "Notificaciones", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2C9 2 4 5 4 10V13H14V10C14 5 9 2 9 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/><path d="M7 13V14C7 15.1 7.9 16 9 16C10.1 16 11 15.1 11 14V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="2" r="1" fill="currentColor"/></svg> },
  { key: "roles", label: "Roles", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M1 15C1 12.8 3.2 11 6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M17 15C17 12.8 14.8 11 12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { key: "documents", label: "Documentos", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 2H11L15 6V16C15 16.6 14.6 17 14 17H4C3.4 17 3 16.6 3 16V3C3 2.4 3.4 2 4 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M11 2V6H15" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M6 10H12M6 13H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { key: "settings", label: "Configuración", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M9 1.5V3M9 15V16.5M16.5 9H15M3 9H1.5M14.6 3.4L13.5 4.5M4.5 13.5L3.4 14.6M14.6 14.6L13.5 13.5M4.5 4.5L3.4 3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
];

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "ahora";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function NotifDropdown({ notifications, onMarkRead, onMarkAllRead, onViewAll, onClose }: {
  notifications: Notification[]; onMarkRead: (id: string) => void;
  onMarkAllRead: () => void; onViewAll: () => void; onClose: () => void;
}) {
  const unread = notifications.filter((n) => !n.read).slice(0, 6);
  const typeColors: Record<string, string> = { alert: "#ef4444", approval: "#f59e0b", mention: "#a78bfa", publish: "#31b498", system: "#6b6b8a" };
  const typeIcons: Record<string, string> = { alert: "⚠", approval: "✓", mention: "@", publish: "▶", system: "⚙" };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-line rounded-2xl shadow-2xl z-50 overflow-hidden animate-pop-in">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Notificaciones</span>
        {unread.length > 0 && (
          <button onClick={onMarkAllRead} className="text-[10px] font-mono text-primary hover:underline">Todo leído</button>
        )}
      </div>
      {unread.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-2xl mb-1">🎊</p>
          <p className="text-xs text-muted">Estás al día, bestie</p>
        </div>
      ) : (
        <div className="divide-y divide-line max-h-72 overflow-y-auto">
          {unread.map((n) => (
            <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-surface2 transition-colors group">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5" style={{ background: `${typeColors[n.type]}18`, color: typeColors[n.type] }}>
                {typeIcons[n.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-600 text-ink leading-tight">{n.title}</p>
                <p className="text-[11px] text-muted mt-0.5 leading-snug line-clamp-2">{n.message}</p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-[9px] font-mono text-muted">{timeAgo(n.timestamp)}</span>
                <button onClick={() => onMarkRead(n.id)} className="text-[9px] font-mono text-muted/40 hover:text-primary opacity-0 group-hover:opacity-100 transition-all">✓</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="px-4 py-3 border-t border-line">
        <button onClick={() => { onViewAll(); onClose(); }} className="w-full text-center text-xs font-mono text-primary hover:underline">
          Ver todas las notificaciones →
        </button>
      </div>
    </div>
  );
}

function AvatarDropdown({ user, onProfile, onSettings, onClose, onLogout }: {
  user: User; onProfile: () => void; onSettings: () => void; onClose: () => void; onLogout: () => void;
}) {
  const statusColors: Record<string, string> = { active: "#22c55e", away: "#f59e0b", offline: "#6b6b8a" };
  return (
    <div className="absolute right-0 top-full mt-2 w-52 bg-surface border border-line rounded-2xl shadow-2xl z-50 overflow-hidden animate-pop-in">
      <div className="px-4 py-4 border-b border-line flex items-center gap-3">
        <div className="relative">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-display font-700 text-sm" style={{ background: `${user.color}25`, color: user.color }}>
            {user.initials}
          </div>
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface" style={{ background: statusColors[user.status] }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-600 text-ink truncate">{user.name}</p>
          <p className="text-[10px] font-mono text-muted uppercase">{user.role}</p>
        </div>
      </div>
      <div className="py-2">
        {[
          { icon: "👤", label: "Mi perfil", action: onProfile },
          { icon: "⚙️", label: "Configuración", action: onSettings },
          { icon: "🌐", label: "Idioma: ES", action: () => {} },
        ].map(({ icon, label, action }) => (
          <button key={label} onClick={() => { action(); onClose(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-surface2 transition-colors text-left">
            <span className="text-base w-5 text-center">{icon}</span>
            <span className="font-500">{label}</span>
          </button>
        ))}
        <div className="my-1.5 border-t border-line" />
        <button onClick={() => { onLogout(); onClose(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-danger/5 transition-colors text-left">
          <span className="text-base w-5 text-center">🚪</span>
          <span className="font-500">Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
}

function AppInner({ authUserId }: { authUserId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [view, setView] = useState<View>("myweek");
  const {
    posts, clients, users: rawUsers, notifications, loading, error,
    movePost: dbMovePost, addPost: dbAddPost, updatePost: dbUpdatePost,
    markNotifRead, markAllRead: dbMarkAllRead,
  } = useHubData(authUserId);
  // Racha calculada con datos reales
  const users = useMemo(
    () => rawUsers.map((u) => ({ ...u, streak: computeStreak(posts, u.id) })),
    [rawUsers, posts]
  );
  // Proyectos y documentos: locales en Fase 1 (se conectan en Fase 2)
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lightMode, setLightMode] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  // Usuario activo = el logueado; admins pueden "ver como" otro en Mi Semana
  const loggedUser = users.find((u) => u.id === authUserId);
  const [viewAsId, setViewAsId] = useState<string | null>(null);
  const activeUser = users.find((u) => u.id === (viewAsId ?? authUserId)) ?? loggedUser ?? {
    id: authUserId, name: "Cargando…", email: "", phone: "", role: "crew" as const,
    initials: "…", color: "#31b498", assignedClientIds: [], alertThresholdDays: 3,
    emailNotifications: true, status: "active" as const, joinDate: "", skills: [], streak: 0,
  };
  const [confettiActive, setConfettiActive] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
  const [confirm, setConfirm] = useState<null | { title: string; message: string; danger?: boolean; onConfirm: () => void }>(null);

  const notifRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifDropdown(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setShowAvatarDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleTheme = () => {
    setLightMode((v) => {
      document.documentElement.classList.toggle("light", !v);
      toast(!v ? "🌙 Modo oscuro activado" : "☀️ Modo claro, fresh!", "info");
      return !v;
    });
  };

  const triggerConfetti = useCallback(() => {
    setConfettiActive(true);
    setTimeout(() => setConfettiActive(false), 3200);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const movePost = (postId: string, newStatus: ContentPost["status"]) => {
    if (newStatus === "published") { triggerConfetti(); toast("🚀 ¡Publicado! Salió al mundo.", "success"); }
    dbMovePost(postId, newStatus).catch(() => toast("✕ No se pudo mover. Intenta de nuevo.", "error"));
  };

  const addPost = (post: ContentPost) => {
    dbAddPost(post)
      .then(() => toast("✓ Post creado y listo.", "success"))
      .catch(() => toast("✕ No se pudo crear el post.", "error"));
  };

  const updatePost = (id: string, updates: Partial<ContentPost>) => {
    dbUpdatePost(id, updates)
      .then(() => toast("✓ Cambios guardados.", "success"))
      .catch(() => toast("✕ No se pudo guardar.", "error"));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const updateDeliverable = (projectId: string, delivId: string, status: DeliverableStatus, reason?: string) => {
    if (status === "approved") { triggerConfetti(); toast("💯 Entregable aprobado. Let's go!", "success"); }
    if (status === "rejected") toast("✕ Entregable rechazado. Ya saben qué hacer.", "error");
    setProjects((prev) => prev.map((p) => p.id !== projectId ? p : {
      ...p,
      deliverables: p.deliverables.map((d) => d.id !== delivId ? d : { ...d, status, rejectionReason: reason }),
    }));
  };

  const moveProjectPhase = (projectId: string, phase: ProjectPhase) => {
    setProjects((prev) => prev.map((p) => p.id !== projectId ? p : { ...p, currentPhase: phase }));
    toast("✓ Fase actualizada.", "success");
  };

  const addProject = (project: Omit<Project, "id" | "phases" | "deliverables">) => {
    const newProject: Project = { ...project, id: `p${Date.now()}`, phases: [], deliverables: [] };
    setProjects((prev) => [...prev, newProject]);
    toast("✓ Proyecto creado. A darle 💪", "success");
  };

  const markAllRead = () => { dbMarkAllRead(); toast("✓ Todo marcado como leído.", "success"); };

  const updateClient = (_id: string, _updates: object) => {
    toast("La edición de clientes se conecta en la Fase 2.", "info");
  };

  const addDocument = (doc: Document) => { setDocuments((prev) => [doc, ...prev]); toast("✓ Documento subido.", "success"); };
  const deleteDocument = (id: string) => setDocuments((prev) => prev.filter((d) => d.id !== id));

  const addPostFile = (postId: string, file: AttachedFile) => {
    const post = posts.find((p) => p.id === postId);
    dbUpdatePost(postId, { attachedFiles: [...(post?.attachedFiles || []), file] })
      .catch(() => toast("✕ No se pudo adjuntar el archivo.", "error"));
  };

  const removePostFile = (postId: string, fileId: string) => {
    const post = posts.find((p) => p.id === postId);
    dbUpdatePost(postId, { attachedFiles: (post?.attachedFiles || []).filter((f) => f.id !== fileId) })
      .catch(() => toast("✕ No se pudo quitar el archivo.", "error"));
  };

  const addDeliverableFile = (projectId: string, delivId: string, file: AttachedFile) =>
    setProjects((prev) => prev.map((p) => p.id !== projectId ? p : {
      ...p,
      deliverables: p.deliverables.map((d) => d.id !== delivId ? d : { ...d, attachedFiles: [...(d.attachedFiles || []), file] }),
    }));

  const removeDeliverableFile = (projectId: string, delivId: string, fileId: string) =>
    setProjects((prev) => prev.map((p) => p.id !== projectId ? p : {
      ...p,
      deliverables: p.deliverables.map((d) => d.id !== delivId ? d : { ...d, attachedFiles: (d.attachedFiles || []).filter((f) => f.id !== fileId) }),
    }));

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-bg text-ink">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-accent mx-auto mb-4 animate-pulse flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
              <path d="M2 9L5 5L7.5 7.5L10 4L13 6.5" stroke="#0a0a0d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="11" r="2.5" fill="#0a0a0d"/>
            </svg>
          </div>
          <p className="font-mono text-xs text-muted uppercase tracking-widest">Cargando tu hub…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-bg text-ink">
        <div className="text-center max-w-sm px-6">
          <p className="text-3xl mb-3">😵</p>
          <p className="text-sm font-600 mb-1">Algo salió mal cargando los datos</p>
          <p className="text-xs text-muted mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="text-xs font-mono px-4 py-2 rounded-lg bg-primary text-bg font-600">Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-bg text-ink overflow-hidden">
      <Confetti active={confettiActive} />

      {/* Sidebar */}
      <aside className={`flex-shrink-0 flex flex-col border-r border-line bg-surface transition-all duration-200 ${sidebarOpen ? "w-52" : "w-14"}`}>
        <div className="flex items-center gap-3 px-4 py-5 border-b border-line">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-accent flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 9L5 5L7.5 7.5L10 4L13 6.5" stroke="#0a0a0d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="11" r="2.5" fill="#0a0a0d"/>
            </svg>
          </div>
          {sidebarOpen && (
            <div>
              <p className="font-display text-base font-800 uppercase tracking-widest text-ink leading-none">Epikom</p>
              <p className="font-mono text-[9px] text-muted uppercase tracking-widest">Hub Interno</p>
            </div>
          )}
        </div>

        <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                title={!sidebarOpen ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all relative ${isActive ? "bg-accent/10 text-accent" : "text-muted hover:text-ink hover:bg-surface2"}`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {sidebarOpen && <span className="text-sm font-500 truncate">{item.label}</span>}
                {item.key === "notifications" && unreadCount > 0 && (
                  <span className={`flex-shrink-0 text-[10px] font-mono font-700 bg-danger text-ink px-1.5 py-0.5 rounded-full leading-none ${sidebarOpen ? "ml-auto" : "absolute top-1 right-1"}`}>
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-line space-y-2">
          <button
            onClick={() => setShowProfile(true)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface2 transition-all w-full text-left ${sidebarOpen ? "" : "justify-center"}`}
          >
            <Avatar initials={activeUser.initials} color={activeUser.color} size="sm" />
            {sidebarOpen && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-600 text-ink truncate">{activeUser.name}</p>
                <p className="text-[10px] text-muted font-mono uppercase">{activeUser.role}</p>
              </div>
            )}
            {sidebarOpen && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-muted flex-shrink-0">
                <circle cx="6" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M2 10C2 8.3 3.8 7 6 7C8.2 7 10 8.3 10 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            )}
          </button>
          <button
            onClick={() => setSidebarOpen((p) => !p)}
            className="w-full flex items-center justify-center gap-2 text-muted hover:text-ink py-1.5 rounded-lg hover:bg-surface2 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`transition-transform ${sidebarOpen ? "" : "rotate-180"}`}>
              <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {sidebarOpen && <span className="text-xs font-mono">Colapsar</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex-shrink-0 flex items-center justify-between px-8 py-4 border-b border-line bg-surface/60 backdrop-blur-sm">
          <p className="font-mono text-xs text-muted uppercase tracking-widest">
            {navItems.find((n) => n.key === view)?.label}
          </p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-muted">{new Intl.DateTimeFormat("es-PR", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Puerto_Rico" }).format(new Date())}</span>

            {/* Dark mode */}
            <button onClick={toggleTheme} title={lightMode ? "Modo oscuro" : "Modo claro"} className="w-8 h-8 rounded-lg border border-line bg-surface2 flex items-center justify-center text-muted hover:text-ink transition-all">
              {lightMode
                ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1V2M7 12V13M1 7H2M12 7H13M2.9 2.9L3.6 3.6M10.4 10.4L11.1 11.1M2.9 11.1L3.6 10.4M10.4 3.6L11.1 2.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg>
                : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11.5 8.5A5 5 0 0 1 5.5 2.5a5 5 0 1 0 6 6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              }
            </button>

            {/* Notification bell with dropdown */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => { setShowNotifDropdown((v) => !v); setShowAvatarDropdown(false); }}
                className="relative w-8 h-8 rounded-lg border border-line bg-surface2 flex items-center justify-center text-muted hover:text-ink transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><path d="M9 2C9 2 4 5 4 10V13H14V10C14 5 9 2 9 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/><path d="M7 13V14C7 15.1 7.9 16 9 16C10.1 16 11 15.1 11 14V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="2" r="1" fill="currentColor"/></svg>
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger rounded-full text-[9px] font-mono font-700 text-ink flex items-center justify-center">{unreadCount}</span>}
              </button>
              {showNotifDropdown && (
                <NotifDropdown
                  notifications={notifications}
                  onMarkRead={markNotifRead}
                  onMarkAllRead={markAllRead}
                  onViewAll={() => setView("notifications")}
                  onClose={() => setShowNotifDropdown(false)}
                />
              )}
            </div>

            {/* Avatar with dropdown */}
            <div ref={avatarRef} className="relative">
              <button
                onClick={() => { setShowAvatarDropdown((v) => !v); setShowNotifDropdown(false); }}
                className="rounded-full hover:ring-2 hover:ring-primary/40 transition-all"
              >
                <Avatar initials={activeUser.initials} color={activeUser.color} size="sm" />
              </button>
              {showAvatarDropdown && (
                <AvatarDropdown
                  user={loggedUser ?? activeUser}
                  onProfile={() => setShowProfile(true)}
                  onSettings={() => setView("settings")}
                  onClose={() => setShowAvatarDropdown(false)}
                  onLogout={handleLogout}
                />
              )}
            </div>
          </div>
        </header>

        <main key={view} className="flex-1 overflow-y-auto animate-view-in">
          {view === "myweek" && <MyWeek posts={posts} projects={projects} clients={clients} users={users} activeUser={activeUser} today={todayPR()} onMovePost={movePost} onSwitchUser={(u) => setViewAsId(u.id)} />}
          {view === "calendar" && <ContentCalendar posts={posts} clients={clients} users={users} today={todayPR()} onMovePost={movePost} onAddPost={addPost} onUpdatePost={updatePost} onAddPostFile={addPostFile} onRemovePostFile={removePostFile} />}
          {view === "projects" && <ProjectsView projects={projects} clients={clients} users={users} onUpdateDeliverable={updateDeliverable} onAddDeliverableFile={addDeliverableFile} onRemoveDeliverableFile={removeDeliverableFile} onMoveProjectPhase={moveProjectPhase} onAddProject={addProject} />}
          {view === "clients" && <ClientsView clients={clients} projects={projects} posts={posts} onUpdateClient={updateClient} />}
          {view === "analytics" && <Analytics posts={posts} projects={projects} clients={clients} users={users} />}
          {view === "notifications" && <NotificationsView notifications={notifications} clients={clients} onMarkRead={markNotifRead} onMarkAllRead={markAllRead} />}
          {view === "roles" && <RolesView users={users} clients={clients} />}
          {view === "documents" && <DocumentsView documents={documents} clients={clients} projects={projects} onAdd={addDocument} onDelete={deleteDocument} />}
          {view === "settings" && <SettingsView isDark={!lightMode} onToggleTheme={toggleTheme} onConfirm={setConfirm} />}
        </main>
      </div>

      {showProfile && (
        <UserProfilePanel
          user={activeUser}
          onClose={() => setShowProfile(false)}
          onUpdate={() => toast("La edición de perfil se conecta en la Fase 3.", "info")}
        />
      )}

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          danger={confirm.danger}
          confirmLabel={confirm.danger ? "Sí, proceder" : "Confirmar"}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

export default function HubApp({ authUserId }: { authUserId: string }) {
  return (
    <ToastProvider>
      <AppInner authUserId={authUserId} />
    </ToastProvider>
  );
}
