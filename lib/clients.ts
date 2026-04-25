// Client catalog helpers.
// The DB table `public.clients` is the source of truth (migration 002).
// This module provides a hard-coded fallback + normalization for display,
// so the UI still renders correct tier/lang badges even if the task row
// references a client by a free-text `client_name` that isn't in the DB yet.

export type ClientTier = "A" | "B+" | "B" | "C";
export type ClientLang = "es" | "en";

export type ClientMeta = {
  slug: string;
  name: string;
  tier: ClientTier;
  lang: ClientLang;
};

// Keep in sync with supabase/migrations/002_clients_and_notifications.sql
const FALLBACK: ClientMeta[] = [
  { slug: "national",      name: "National",                   tier: "A",  lang: "es" },
  { slug: "pitusa",        name: "Pitusa",                     tier: "A",  lang: "es" },
  { slug: "ig_sports",     name: "IG Sports Academy",          tier: "A",  lang: "en" },
  { slug: "misresultados", name: "misResultados",              tier: "A",  lang: "es" },
  { slug: "mesalve",       name: "Mesalve",                    tier: "A",  lang: "es" },
  { slug: "el_alamo",      name: "Panadería El Alamo",         tier: "B",  lang: "es" },
  { slug: "priority1",     name: "Priority 1 Sign",            tier: "B",  lang: "es" },
  { slug: "shops_caguas",  name: "Shops@Caguas",               tier: "A",  lang: "es" },
  { slug: "montehiedra",   name: "The Outlets at Montehiedra", tier: "A",  lang: "es" },
  { slug: "plaza_centro",  name: "Plaza Centro",               tier: "B+", lang: "es" },
  { slug: "acha",          name: "ACHA Trading",               tier: "A",  lang: "es" },
  { slug: "lumen",         name: "Lumen Studio",               tier: "B",  lang: "es" },
  { slug: "cardona",       name: "Cardona",                    tier: "A",  lang: "es" },
  { slug: "orbe",          name: "Orbe Café",                  tier: "C",  lang: "es" },
];

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const INDEX = new Map<string, ClientMeta>();
for (const c of FALLBACK) {
  INDEX.set(norm(c.slug), c);
  INDEX.set(norm(c.name), c);
}
// aliases
INDEX.set(norm("national lumber"), FALLBACK.find((c) => c.slug === "national")!);
INDEX.set(norm("el alamo"),        FALLBACK.find((c) => c.slug === "el_alamo")!);
INDEX.set(norm("ig sports"),       FALLBACK.find((c) => c.slug === "ig_sports")!);
INDEX.set(norm("shops caguas"),    FALLBACK.find((c) => c.slug === "shops_caguas")!);
INDEX.set(norm("outlets montehiedra"), FALLBACK.find((c) => c.slug === "montehiedra")!);

const DEFAULT_META: Omit<ClientMeta, "name" | "slug"> = { tier: "B", lang: "es" };

/**
 * Look up client metadata by free-text name.
 * Falls back to { tier: 'B', lang: 'es' } for unknown clients.
 */
export function clientMeta(name: string): ClientMeta {
  const hit = INDEX.get(norm(name));
  if (hit) return hit;
  return { slug: norm(name).replace(/\s+/g, "_"), name, ...DEFAULT_META };
}

export function clientCatalog(): ClientMeta[] {
  return FALLBACK.slice();
}
