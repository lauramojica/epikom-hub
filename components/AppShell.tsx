"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarRange,
  Briefcase,
  ShieldCheck,
  Upload,
  UserCircle2,
  LogOut,
  Menu,
  X,
  ChevronsLeft,
  ChevronsRight,
  Sun,
  Moon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/semana", label: "Mi semana", Icon: CalendarRange },
  { href: "/clientes", label: "Cliente por cliente", Icon: Briefcase },
  { href: "/admin", label: "Admin", Icon: ShieldCheck, adminOnly: true },
  { href: "/admin/upload", label: "Subir semana", Icon: Upload, adminOnly: true },
];

const SIDEBAR_STATE_KEY = "sidebar-expanded";
const THEME_KEY = "theme";

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
  const [expanded, setExpanded] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const pathname = usePathname();
  const items = navItems.filter((n) => !n.adminOnly || role === "admin");

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STATE_KEY);
    if (stored === "0") setExpanded(false);
    const storedTheme = localStorage.getItem(THEME_KEY);
    const initialTheme =
      storedTheme === "dark" || storedTheme === "light"
        ? storedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
  }, []);

  function toggleExpanded() {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_STATE_KEY, next ? "1" : "0");
      return next;
    });
  }

  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, next);
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  }

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  const initial = (firstName[0] ?? "·").toUpperCase();

  return (
    <div className="min-h-screen lg:flex" style={{ background: "var(--bg-2)" }}>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex shrink-0 flex-col transition-[width] duration-200 ease-out ${
          expanded ? "w-60" : "w-16"
        }`}
        style={{
          background: "var(--bg)",
          borderRight: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          height: "100vh",
          padding: expanded ? "20px 16px" : "20px 12px",
        }}
      >
        <Link
          href="/dashboard"
          aria-label="Epikom"
          className="mb-6 flex items-center gap-2.5 px-1"
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ background: "var(--brand-turquesa)" }}
          >
            E
          </div>
          {expanded && (
            <>
              <div
                className="text-[15px] font-semibold"
                style={{ letterSpacing: "-0.01em", color: "var(--text)" }}
              >
                epikom
              </div>
              <div
                className="ml-auto text-[11px] font-medium uppercase"
                style={{ letterSpacing: "0.04em", color: "var(--text-3)" }}
              >
                Hub
              </div>
            </>
          )}
        </Link>

        <nav className="flex flex-1 flex-col gap-0.5">
          {items.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                title={expanded ? undefined : label}
                aria-label={label}
                className={`flex items-center gap-2.5 rounded-md text-sm transition ${
                  expanded ? "px-2.5 py-2" : "justify-center p-2"
                }`}
                style={{
                  background: active ? "var(--bg-2)" : "transparent",
                  color: active ? "var(--text)" : "var(--text-2)",
                  fontWeight: active ? 500 : 400,
                }}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                {expanded && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>

        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: 16,
            marginTop: 16,
          }}
        >
          <div className={`flex items-center gap-2.5 ${expanded ? "px-1" : "justify-center"}`}>
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-medium"
              style={{ background: "var(--bg-3)", color: "var(--text)" }}
            >
              {initial}
            </div>
            {expanded && (
              <div className="min-w-0 leading-tight">
                <div className="text-[13px] font-medium truncate" style={{ color: "var(--text)" }}>
                  {firstName}
                </div>
                <div className="text-[11px]" style={{ color: "var(--text-3)" }}>
                  {role}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-1">
            <Link
              href="/perfil"
              title={expanded ? undefined : "Perfil"}
              aria-label="Perfil"
              className="flex h-8 w-8 items-center justify-center rounded-md transition"
              style={{ color: "var(--text-2)" }}
            >
              <UserCircle2 className="h-4 w-4" strokeWidth={1.75} />
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === "dark" ? "Tema claro" : "Tema oscuro"}
              aria-label="Cambiar tema"
              className="flex h-8 w-8 items-center justify-center rounded-md transition"
              style={{ color: "var(--text-2)" }}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" strokeWidth={1.75} />
              ) : (
                <Moon className="h-4 w-4" strokeWidth={1.75} />
              )}
            </button>
            <form action="/auth/signout" method="post" className="flex">
              <button
                type="submit"
                title={expanded ? "Cerrar sesión" : "Salir"}
                aria-label="Cerrar sesión"
                className="flex h-8 w-8 items-center justify-center rounded-md transition"
                style={{ color: "var(--text-2)" }}
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </form>
            <button
              type="button"
              onClick={toggleExpanded}
              aria-label={expanded ? "Contraer" : "Expandir"}
              title={expanded ? "Contraer" : "Expandir"}
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-md transition"
              style={{ color: "var(--text-3)" }}
            >
              {expanded ? (
                <ChevronsLeft className="h-4 w-4" strokeWidth={2} />
              ) : (
                <ChevronsRight className="h-4 w-4" strokeWidth={2} />
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div
        className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3"
        style={{
          background: "var(--bg)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Link href="/dashboard" className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ background: "var(--brand-turquesa)" }}
          >
            E
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            epikom <span style={{ color: "var(--text-3)" }}>Hub</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Menú"
          className="flex h-9 w-9 items-center justify-center rounded-md"
          style={{ border: "1px solid var(--border)", color: "var(--text)" }}
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 backdrop-blur-sm"
            style={{ background: "rgba(26,26,26,0.3)" }}
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="absolute inset-y-0 left-0 w-72 p-5"
            style={{ background: "var(--bg)", boxShadow: "var(--shadow-md)" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ background: "var(--brand-turquesa)" }}
                >
                  E
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    epikom <span style={{ color: "var(--text-3)" }}>Hub</span>
                  </div>
                  <div
                    className="text-[10px] uppercase"
                    style={{ letterSpacing: "0.06em", color: "var(--text-3)" }}
                  >
                    {role}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar"
                className="flex h-8 w-8 items-center justify-center rounded-md"
                style={{ color: "var(--text-2)" }}
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <nav className="mt-6 space-y-0.5">
              {items.map(({ href, label, Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm transition"
                    style={{
                      background: active ? "var(--bg-2)" : "transparent",
                      color: active ? "var(--text)" : "var(--text-2)",
                      fontWeight: active ? 500 : 400,
                    }}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div
              className="mt-6 pt-4 space-y-0.5"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <Link
                href="/perfil"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm"
                style={{ color: "var(--text-2)" }}
              >
                <UserCircle2 className="h-4 w-4" strokeWidth={1.75} />
                Perfil
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm hover:bg-red-50"
                  style={{ color: "#C0392B" }}
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.75} />
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
