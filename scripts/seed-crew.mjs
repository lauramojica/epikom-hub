#!/usr/bin/env node
// Seed the 4 remaining crew members:
//   - Create each in Supabase Auth (email_confirm=true, no password)
//   - Insert a matching row in public.users (role=crew)
// Idempotent: if an auth user or public.users row already exists, we keep it.
//
// Run: node scripts/seed-crew.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.local manually (Node doesn't read it automatically).
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const crew = [
  { slug: "onasis", name: "Samael Onasis", email: "onasis@epikom.com" },
  { slug: "christopher", name: "Christopher", email: "christopher@epikom.com" },
  { slug: "alexander", name: "Alexander J Santiago", email: "alexander@epikom.com" },
  { slug: "elissa", name: "Elissa Colón", email: "elissa@epikom.com" },
];

async function findAuthUserByEmail(email) {
  // Paginate through all users. In practice we have <10, so one page is enough.
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function ensureAuthUser({ email }) {
  const existing = await findAuthUserByEmail(email);
  if (existing) return { id: existing.id, created: false };

  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error) throw error;
  return { id: data.user.id, created: true };
}

async function ensurePublicUser({ id, email, slug, name }) {
  const { data: existing } = await admin
    .from("users")
    .select("id, slug")
    .eq("id", id)
    .maybeSingle();
  if (existing) return { action: "kept" };

  const { error } = await admin.from("users").insert({
    id,
    email,
    slug,
    name,
    role: "crew",
    phone: null, // Fill in later once Lau provides E.164 numbers.
  });
  if (error) throw error;
  return { action: "inserted" };
}

const results = [];
for (const member of crew) {
  try {
    const { id, created } = await ensureAuthUser({ email: member.email });
    const { action } = await ensurePublicUser({
      id,
      email: member.email,
      slug: member.slug,
      name: member.name,
    });
    results.push({ slug: member.slug, id, auth: created ? "created" : "existed", profile: action });
  } catch (err) {
    results.push({ slug: member.slug, error: err instanceof Error ? err.message : String(err) });
  }
}

console.log("");
console.log("Seed results:");
console.table(results);
console.log("");
console.log("Now:");
console.log("  SELECT slug, name, role FROM public.users ORDER BY role DESC, name;");
console.log("");
