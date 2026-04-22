# Epikom Ops Hub

Hub interno de Epikom Interactive. Tareas semanales del crew + notificaciones SMS/push/email a las 8am. Deploy: [hub.epikom.com](https://hub.epikom.com).

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres + Auth + RLS)
- Drizzle ORM
- Resend (email) · Twilio (SMS) · Web Push (VAPID)
- PWA

## Correr local

```bash
cp .env.local.example .env.local   # llenar keys
npm run dev                        # http://localhost:3000
```

## Plan

Desarrollo por semana — ver `hub files/plan-4-semanas.md` (fuera del repo).
Semana actual: **1 — fundación / setup**.

## Deploy

Vercel proyecto `epikom-hub` (team epikominteractive). Auto-deploy al hacer push a `main`.

## Respaldo código viejo

El repo anterior (enero 2026) está preservado en el tag `archive-pre-rebuild-2026-04`.
