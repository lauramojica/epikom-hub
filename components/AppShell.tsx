"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarRange,
  ShieldCheck,
  Upload,
  UserCircle2,
  LogOut,
  Menu,
  X,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Hoy", Icon: LayoutDashboard },
  { href: "/semana", label: "Mi semana", Icon: CalendarRange },
  { href: "/admin", label: "Admin", Icon: ShieldCheck, adminOnly: true },
  { href: "/admin/upload", label: "Subir semana", Icon: Upload, adminOnly: true },
];

const SIDEBAR_STATE_KEY = "sidebar-expanded";

export function AppShell({
  role,
  firstName,
  children,
}: {
  role: "admin" | "crew";
  firstName: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();
  const items = navItems.filter((n) => !n.adminOnly || role === "admin");

  // Persist expand/collapse preference.
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STATE_KEY);
    if (stored === "1") setExpanded(true);
  }, []);

  function toggleExpanded() {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_STATE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  const initial = (firstName[0] ?? "·").toUpperCase();
  const asideWidth = expanded ? "w-56" : "w-16";
  const itemWidth = expanded ? "w-full justify-start gap-3 px-3" : "w-10 justify-center";

  return (
    <div className="min-h-screen bg-white lg:flex">
      {/* Desktop sidebar (collapsible) */}
      <aside
        className={`hidden lg:flex ${asideWidth} shrink-0 flex-col border-r border-neutral-100 py-4 transition-[width] duration-200 ease-out ${
          expanded ? "px-3" : "items-center"
        }`}
      >
        <div className={`mb-6 flex items-center ${expanded ? "justify-between" : "justify-center"}`}>
          <Link href="/dashboard" className="flex items-center gap-2" aria-label="Epikom">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ background: "var(--brand-turquesa)" }}
            >
              E
            </div>
            {expanded && (
              <div className="min-w-0">
                <div className="text-sm font-semibold tracking-tight truncate">Epikom Hub</div>
                <div className="text-[10px] uppercase tracking-widest text-neutral-400">{role}</div>
              </div>
            )}
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {items.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                title={expanded ? undefined : label}
                aria-label={label}
                className={`flex h-10 items-center rounded-xl text-sm transition ${itemWidth} ${
                  active
                    ? "bg-[var(--brand-turquesa)]/10 text-[var(--brand-turquesa-ink)] font-medium"
                    : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                {expanded && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-1">
          <Link
            href="/perfil"
            title={expanded ? undefined : "Perfil"}
            aria-label="Perfil"
            className={`flex h-10 items-center rounded-xl text-sm transition ${itemWidth} ${
              isActive("/perfil")
                ? "bg-[var(--brand-turquesa)]/10 text-[var(--brand-turquesa-ink)] font-medium"
                : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
            }`}
          >
            <UserCircle2 className="h-5 w-5 shrink-0" strokeWidth={1.75} />
            {expanded && <span className="truncate">Perfil</span>}
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              title={expanded ? undefined : "Salir"}
              aria-label="Salir"
              className={`flex h-10 w-full items-center rounded-xl text-sm text-neutral-500 transition hover:bg-red-50 hover:text-red-600 ${itemWidth}`}
            >
              <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.75} />
              {expanded && <span className="truncate">Salir</span>}
            </button>
          </form>

          <div className={`mt-2 flex items-center ${expanded ? "gap-2 px-3" : "justify-center"}`}>
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ background: "var(--brand-turquesa-ink)" }}
            >
              {initial}
            </div>
            {expanded && (
              <div className="min-w-0 text-xs">
                <div className="font-medium truncate">{firstName}</div>
                <div className="text-neutral-400 text-[10px] uppercase tracking-widest">{role}</div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={toggleExpanded}
            aria-label={expanded ? "Contraer menú" : "Expandir menú"}
            title={expanded ? "Contraer" : "Expandir"}
            className={`mt-3 flex h-8 items-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-800 ${
              expanded ? "w-full justify-start gap-2 px-3" : "w-10 justify-center self-center"
            }`}
          >
            {expanded ? (
              <>
                <ChevronsLeft className="h-4 w-4" strokeWidth={2} />
                <span className="text-xs">Contraer</span>
              </>
            ) : (
              <ChevronsRight className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-neutral-100 bg-white/90 px-4 py-3 backdrop-blur">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ background: "var(--brand-turquesa)" }}
          >
            E
          </div>
          <span className="text-sm font-semibold tracking-tight">Epikom Hub</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Menú"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-700"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-neutral-900/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ background: "var(--brand-turquesa)" }}
                >
                  E
                </div>
                <div>
                  <div className="text-sm font-semibold">Epikom Hub</div>
                  <div className="text-[10px] uppercase tracking-widest text-neutral-400">
                    {role}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <nav className="mt-6 space-y-1">
              {items.map(({ href, label, Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                      active
                        ? "bg-[var(--brand-turquesa)]/10 text-[var(--brand-turquesa-ink)] font-medium"
                        : "text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-6 border-t border-neutral-100 pt-4 space-y-1">
              <Link
                href="/perfil"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
              >
                <UserCircle2 className="h-5 w-5" strokeWidth={1.75} />
                Perfil
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-5 w-5" strokeWidth={1.75} />
                  Cerrar sesión
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
