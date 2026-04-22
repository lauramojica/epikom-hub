-- ========================================
-- Epikom Ops Hub — Seed del Crew
-- ========================================
-- Run this AFTER creating the users in Supabase Auth.
-- Process:
-- 1. Use Supabase dashboard > Authentication > Add user (with auto-generated password)
-- 2. For each user, copy the resulting UUID
-- 3. Replace the UUIDs below with the actual ones from Supabase
-- 4. Update email and phone numbers to the real ones
-- 5. Run this SQL
-- ========================================

-- IMPORTANT: Replace UUIDs below with real ones from Supabase Auth

INSERT INTO public.users (id, email, slug, name, role, phone)
VALUES
  (
    '00000000-0000-0000-0000-000000000001', -- REPLACE with Lau's auth.users UUID
    'lau@epikom.com',
    'lau',
    'Laura Mojica',
    'admin',
    '+1787XXXXXXX' -- REPLACE with real phone
  ),
  (
    '00000000-0000-0000-0000-000000000002', -- REPLACE with Onasis's UUID
    'onasis@epikom.com',
    'onasis',
    'Samael Onasis',
    'crew',
    '+1787XXXXXXX'
  ),
  (
    '00000000-0000-0000-0000-000000000003', -- REPLACE with Christopher's UUID
    'christopher@epikom.com',
    'christopher',
    'Christopher',
    'crew',
    '+1787XXXXXXX'
  ),
  (
    '00000000-0000-0000-0000-000000000004', -- REPLACE with Alexander's UUID
    'alexander@epikom.com',
    'alexander',
    'Alexander J Santiago',
    'crew',
    '+1787XXXXXXX'
  ),
  (
    '00000000-0000-0000-0000-000000000005', -- REPLACE with Elissa's UUID
    'elissa@epikom.com',
    'elissa',
    'Elissa Colón',
    'crew',
    '+1787XXXXXXX'
  )
ON CONFLICT (id) DO NOTHING;

-- Verify the seed worked
SELECT slug, name, role, phone FROM public.users ORDER BY role DESC, name;
