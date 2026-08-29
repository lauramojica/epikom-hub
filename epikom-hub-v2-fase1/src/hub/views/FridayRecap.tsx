import { useState } from "react";
import type { ContentPost, Project, User } from "../types";

interface Props {
  posts: ContentPost[];
  projects: Project[];
  users: User[];
  activeUser: User;
  onClose: () => void;
}

const BG_GRADIENTS = [
  "radial-gradient(ellipse at 20% 30%, #dbfa4525 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, #e040fb20 0%, transparent 55%), radial-gradient(ellipse at 60% 10%, #31b49820 0%, transparent 50%)",
  "radial-gradient(ellipse at 70% 20%, #a78bfa30 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, #dbfa4520 0%, transparent 55%)",
  "radial-gradient(ellipse at 50% 50%, #31b49830 0%, transparent 65%), radial-gradient(ellipse at 90% 10%, #f59e0b20 0%, transparent 40%)",
  "radial-gradient(ellipse at 30% 70%, #e040fb25 0%, transparent 55%), radial-gradient(ellipse at 80% 30%, #dbfa4520 0%, transparent 45%)",
  "radial-gradient(ellipse at 50% 20%, #a78bfa25 0%, transparent 60%), radial-gradient(ellipse at 40% 80%, #22c55e20 0%, transparent 50%)",
];

export default function FridayRecap({ posts, projects, users, activeUser, onClose }: Props) {
  const [slide, setSlide] = useState(0);
  const [exiting, setExiting] = useState(false);

  const weekStart = "2026-08-24";
  const weekEnd = "2026-08-28";
  const publishedThisWeek = posts.filter(
    (p) => p.status === "published" && p.publishedDate && p.publishedDate >= weekStart && p.publishedDate <= weekEnd
  );
  const approvedDelivs = projects.flatMap((p) => p.deliverables).filter((d) => d.status === "approved");
  const totalReach = publishedThisWeek.reduce((sum, p) => sum + (p.reach || 0), 0);

  // Find the MVP (most reach this week)
  const mvpPost = publishedThisWeek.reduce<ContentPost | null>((best, p) =>
    !best || (p.reach || 0) > (best.reach || 0) ? p : best, null);
  const mvpUser = mvpPost ? users.find((u) => u.id === mvpPost.assigneeId) || users[0] : users[0];

  const userStreak = activeUser.streak ?? 12;

  const goNext = () => {
    if (slide < 4) {
      setExiting(true);
      setTimeout(() => { setSlide((s) => s + 1); setExiting(false); }, 280);
    } else {
      onClose();
    }
  };

  const slides = [
    // 0 — Intro
    <div key="intro" className="flex flex-col items-center justify-center h-full text-center px-10 gap-6">
      <div className="text-6xl animate-bounce-slow">🚀</div>
      <div>
        <p className="font-mono text-[10px] text-primary uppercase tracking-widest mb-3">Semana del 24–28 ago 2026</p>
        <h1 className="font-display text-6xl font-800 uppercase text-ink leading-none mb-3">
          Tu Semana<br />En Review
        </h1>
        <p className="text-muted">Spoiler: la rompiste. Let's see how 👀</p>
      </div>
    </div>,

    // 1 — Posts published
    <div key="posts" className="flex flex-col items-center justify-center h-full text-center px-10 gap-4">
      <p className="font-mono text-[10px] text-muted uppercase tracking-widest">Posts que salieron al mundo 🌍</p>
      <div className="font-display font-800 uppercase leading-none" style={{ fontSize: "clamp(80px, 22vw, 110px)", color: "#dbfa45" }}>
        {publishedThisWeek.length}
      </div>
      <div className="space-y-1">
        <p className="text-ink text-lg font-500">posts publicados esta semana</p>
        {totalReach > 0 && (
          <p className="text-muted text-sm">
            Llegaste a <span className="text-primary font-600">{totalReach.toLocaleString()}</span> personas. Not bad fr fr.
          </p>
        )}
      </div>
      {publishedThisWeek.length === 0 && (
        <p className="text-muted/60 text-sm italic">Semana tranquila… que sea la última 😅</p>
      )}
    </div>,

    // 2 — Deliverables
    <div key="tasks" className="flex flex-col items-center justify-center h-full text-center px-10 gap-4">
      <p className="font-mono text-[10px] text-muted uppercase tracking-widest">Entregables aprobados ✅</p>
      <div className="font-display font-800 uppercase leading-none" style={{ fontSize: "clamp(80px, 22vw, 110px)", color: "#31b498" }}>
        {approvedDelivs.length}
      </div>
      <div className="space-y-1">
        <p className="text-ink text-lg font-500">entregables cerrados con fuego</p>
        <p className="text-muted text-sm">El equipo no para. Periodt. 🔥</p>
      </div>
    </div>,

    // 3 — Team highlight / shoutout
    <div key="highlight" className="flex flex-col items-center justify-center h-full text-center px-10 gap-5">
      <p className="font-mono text-[10px] text-muted uppercase tracking-widest">⭐ El crush de la semana</p>
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center font-display text-2xl font-800 uppercase border-2"
        style={{ background: `${mvpUser.color}22`, color: mvpUser.color, borderColor: mvpUser.color }}
      >
        {mvpUser.initials}
      </div>
      <div>
        <h2 className="font-display text-4xl font-800 uppercase text-ink mb-1">{mvpUser.name}</h2>
        {mvpPost ? (
          <>
            <p className="text-muted text-sm">Publicó «{mvpPost.title}»</p>
            <p className="font-mono text-sm mt-1" style={{ color: mvpUser.color }}>
              {(mvpPost.reach || 0).toLocaleString()} personas alcanzadas 👑
            </p>
          </>
        ) : (
          <p className="text-muted text-sm">Moviendo en silencio. Big moves only 🤫</p>
        )}
      </div>
      <div className="px-4 py-2 rounded-xl border border-accent/30 bg-accent/10">
        <p className="text-xs text-accent font-mono">Dale el shoutout que se merece 👇</p>
      </div>
    </div>,

    // 4 — Streak
    <div key="streak" className="flex flex-col items-center justify-center h-full text-center px-10 gap-4">
      <p className="font-mono text-[10px] text-muted uppercase tracking-widest">Tu racha actual</p>
      <div className="text-7xl">🔥</div>
      <div className="font-display font-800 uppercase leading-none" style={{ fontSize: "clamp(70px, 20vw, 96px)", color: "#dbfa45" }}>
        {userStreak}
      </div>
      <div className="space-y-1">
        <p className="text-ink text-lg font-500">días sin tareas vencidas</p>
        <p className="text-muted text-sm">¡Que no se rompa, pa! Keep it up 💪</p>
      </div>
      <div className="flex gap-2 mt-2">
        {Array.from({ length: Math.min(userStreak, 14) }, (_, i) => (
          <div key={i} className="w-2 h-2 rounded-full bg-accent opacity-80" style={{ opacity: 0.4 + (i / 14) * 0.6 }} />
        ))}
        {userStreak > 14 && <span className="font-mono text-[10px] text-muted">+{userStreak - 14}</span>}
      </div>
    </div>,
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bg/90 backdrop-blur-2xl" onClick={onClose} />
      <div
        className="relative w-full max-w-[360px] rounded-3xl overflow-hidden border border-line/60"
        style={{ height: "600px", background: "var(--color-surface)" }}
      >
        {/* Animated gradient BG */}
        <div
          className="absolute inset-0 transition-all duration-700"
          style={{ background: BG_GRADIENTS[slide] }}
        />

        {/* Story progress bars */}
        <div className="absolute top-0 left-0 right-0 flex gap-1 px-4 pt-3 z-10">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  background: "#dbfa45",
                  width: i < slide ? "100%" : i === slide ? "100%" : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-4 z-10 w-7 h-7 rounded-full flex items-center justify-center text-muted hover:text-ink transition-colors"
          style={{ background: "rgba(0,0,0,0.3)" }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Slide content */}
        <div
          className="relative h-full transition-all duration-280"
          style={{
            opacity: exiting ? 0 : 1,
            transform: exiting ? "translateY(12px)" : "translateY(0)",
          }}
        >
          {slides[slide]}
        </div>

        {/* Next / CTA */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
          <button
            onClick={goNext}
            className="px-8 py-3 rounded-full font-display font-700 uppercase text-sm tracking-wide transition-all hover:scale-105 active:scale-95"
            style={{ background: "#dbfa45", color: "#0a0a0d" }}
          >
            {slide < 4 ? "Siguiente →" : "¡Eso es todo! 🎉"}
          </button>
        </div>
      </div>
    </div>
  );
}
