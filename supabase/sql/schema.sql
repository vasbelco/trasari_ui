-- Project: trasari_mvp
-- Language: SQL (Postgres / Supabase)
-- Scope: Minimal, step-by-step migrations to start the multi-tenant schema
-- Run each block separately in Supabase SQL editor and verify before continuing.


/* ===============================
001_create_companies.sql
=============================== */
-- companies: tenant root table
create table if not exists public.companies (
id uuid primary key default gen_random_uuid(),
name text not null,
slug text unique,
plan text not null default 'trial',
created_at timestamptz not null default now()
);


create index if not exists idx_companies_slug on public.companies(slug);

/* ===============================
002_create_app_users.sql
=============================== */
-- roles enum for application users (kept simple for MVP)
DO $$
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
CREATE TYPE public.user_role AS ENUM (
'owner', -- company owner (billing/transfer ownership)
'super_admin', -- full admin for the company
'admin', -- ops admin (hr/warehouse)
'operator', -- warehouse / rrhh data entry
'supervisor', -- site engineer; limited to assigned works
'auditor' -- read-only
);
END IF;
END$$;


-- application users (distinct from auth.users)
create table if not exists public.app_users (
id uuid primary key default gen_random_uuid(),
company_id uuid not null references public.companies(id) on delete cascade,
auth_uid uuid unique, -- optional link to auth.users.id
email text not null,
name text not null,
phone text,
role public.user_role not null default 'operator',
active boolean not null default true,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
);


// File: /api/signup.ts (Next.js / Vercel Serverless Function)
// Purpose: Create auth user, company, and app_user (owner) – minimal MVP
// Prereqs:
//  - npm i @supabase/supabase-js
//  - Environment vars in Vercel (.env.local for local dev):
//      NEXT_PUBLIC_SUPABASE_URL=...           // from Supabase project settings
//      SUPABASE_SERVICE_ROLE=...              // service_role key (NEVER expose to browser)
// Notes:
//  - Sequential inserts for MVP. Later we can wrap in a Postgres function for true transaction.
//  - RLS should remain OFF until we propagate company_id in JWT.

import type { VercelRequest, VercelResponse } from 'vercel'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { company_name, company_slug, email, password, name, phone } = req.body || {}
  if (!company_name || !email || !password || !name) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // 1) Create auth user (email/password)
    const { data: userCreated, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true // for MVP testing; remove to enforce email confirmation later
    })
    if (authErr || !userCreated?.user) throw authErr || new Error('Auth user not created')

    const auth_uid = userCreated.user.id

    // 2) Create company
    const { data: companyIns, error: compErr } = await supabaseAdmin
      .from('companies')
      .insert([{ name: company_name, slug: company_slug || null }])
      .select('id')
      .single()
    if (compErr || !companyIns?.id) throw compErr || new Error('Company insert failed')

    const company_id = companyIns.id

    // 3) Create app_user as owner
    const { error: appUserErr } = await supabaseAdmin
      .from('app_users')
      .insert([{ company_id, auth_uid, email, name, phone: phone || null, role: 'owner' }])
    if (appUserErr) throw appUserErr

    // (Optional) Issue a session (login) – For MVP we can let the frontend call signIn afterwards.

    return res.status(200).json({ ok: true, company_id, auth_uid })
  } catch (e: any) {
    // naive rollback attempt (best-effort):
    // If company created but app_user failed, you may want to delete the company to avoid orphans.
    // In production, wrap with a Postgres function/transaction.
    console.error(e)
    return res.status(500).json({ error: e?.message || 'Internal error' })
  }
}

-- Completar tabla existente: public.companies (SIN romper el signup actual)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS phone               text,
  ADD COLUMN IF NOT EXISTS email               text,
  ADD COLUMN IF NOT EXISTS address             text,
  ADD COLUMN IF NOT EXISTS city                text,
  ADD COLUMN IF NOT EXISTS nit                 text,
  ADD COLUMN IF NOT EXISTS plan_limit_users    integer    NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS plan_limit_projects integer    NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS is_active           boolean    NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at          timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at          timestamptz NOT NULL DEFAULT now();

-- Asegurar índice único del slug (el signup ya lo usa)
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_slug ON public.companies (slug);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_companies_updated_at') THEN
    CREATE TRIGGER trg_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- 🔹 Tabla: app_users
-- Objetivo: almacenar los usuarios de cada empresa (multi-tenant)
-- Incluye relación con Supabase Auth y control de roles internos.

CREATE TABLE IF NOT EXISTS app_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),             -- Identificador único del registro
    company_id uuid NOT NULL REFERENCES companies(id)           -- Relación con la empresa (FK)
        ON DELETE CASCADE,                                      -- Si se elimina la empresa, se eliminan sus usuarios
    auth_uid uuid NOT NULL,                                     -- ID del usuario en Supabase Auth
    email text NOT NULL,                                        -- Correo del usuario
    user_name text NOT NULL,                                    -- Nombre de usuario (único visible)
    name text NOT NULL,                                         -- Nombre completo
    phone text,                                                 -- Teléfono opcional
    role text NOT NULL CHECK (role IN 
        ('owner', 'super_admin', 'admin', 'operator', 'supervisor', 'auditor')),  -- Roles definidos del sistema
    active boolean NOT NULL DEFAULT true,                       -- Estado activo o inactivo
    created_at timestamptz NOT NULL DEFAULT now(),              -- Fecha de creación
    last_login timestamptz                                      -- Último acceso opcional
);

-- 🔸 Reglas de unicidad
-- 1. Unicidad por email dentro de la empresa
ALTER TABLE app_users ADD CONSTRAINT unique_email_per_company UNIQUE (company_id, email);

-- 2. Unicidad por auth_uid dentro de la empresa
ALTER TABLE app_users ADD CONSTRAINT unique_auth_per_company UNIQUE (company_id, auth_uid);

-- 3. Unicidad global de user_name (identificador único en todo el sistema)
ALTER TABLE app_users ADD CONSTRAINT unique_global_username UNIQUE (user_name);

-- 🔸 Índices recomendados para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_app_users_company_id ON app_users(company_id);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);
CREATE INDEX IF NOT EXISTS idx_app_users_active ON app_users(active);

-- 🔸 Comentarios para documentación
COMMENT ON TABLE app_users IS 'Usuarios del sistema asociados a una empresa. Control multi-tenant por company_id.';
COMMENT ON COLUMN app_users.company_id IS 'Referencia a la empresa propietaria (companies.id)';
COMMENT ON COLUMN app_users.auth_uid IS 'ID del usuario en Supabase Auth. Se usa para login y JWT.';
COMMENT ON COLUMN app_users.user_name IS 'Identificador único visible del usuario (handle).';
COMMENT ON COLUMN app_users.role IS 'Rol funcional dentro de la empresa. owner = dueño principal.';

-- 1) Añadir columna si no existe
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS user_name text;

-- 2) Rellenar user_name para filas existentes (si está NULL)
--    Base: parte local del email, normalizada a [a-z0-9._-]
UPDATE public.app_users
SET user_name = lower(regexp_replace(split_part(email,'@',1), '[^a-z0-9._-]', '', 'g'))
WHERE user_name IS NULL;

-- 3) Resolver duplicados añadiendo sufijo -xxxxxx cuando haya colisiones
WITH d AS (
  SELECT id, user_name,
         row_number() OVER (PARTITION BY user_name ORDER BY id) AS rn
  FROM public.app_users
)
UPDATE public.app_users u
SET user_name = u.user_name || '-' || substr(u.id::text, 1, 6)
FROM d
WHERE u.id = d.id AND d.rn > 1;

-- 4) Crear la UNIQUE global (solo si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_global_username'
      AND conrelid = 'public.app_users'::regclass
  ) THEN
    ALTER TABLE public.app_users
    ADD CONSTRAINT unique_global_username UNIQUE (user_name);
  END IF;
END$$;

-- (Opcional) Marcar como NOT NULL cuando ya esté todo poblado
ALTER TABLE public.app_users
  ALTER COLUMN user_name SET NOT NULL;


-- 🔹 Agregar columna last_login a app_users (si no existe)
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS last_login timestamptz;

-- 🔸 Comentario descriptivo
COMMENT ON COLUMN public.app_users.last_login IS
'Fecha y hora del último inicio de sesión del usuario. Se actualiza cuando el usuario inicia sesión.';

-- ✅ Verificación rápida (opcional): mostrar columnas principales
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'app_users';


/* =====================================================
   🔧 UPDATE SCHEMA — Trasari MVP
   Author: Carlos Vasbelco
   Purpose: Completar integridad, trazabilidad y campos legales
   Date: 2025-11-10
   ===================================================== */

/* ------------------------------
   🔹 TABLE: public.companies
   ------------------------------ */

-- 1️⃣ Asegurar columnas adicionales
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS terms_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2️⃣ Validación de plan (solo valores esperados)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_companies_plan'
  ) THEN
    ALTER TABLE public.companies
    ADD CONSTRAINT chk_companies_plan CHECK (plan IN ('trial', 'basic', 'pro', 'enterprise'));
  END IF;
END$$;

-- 3️⃣ Validación básica de email si existe columna email
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='email') THEN
    ALTER TABLE public.companies
    DROP CONSTRAINT IF EXISTS chk_companies_email_format;
    ALTER TABLE public.companies
    ADD CONSTRAINT chk_companies_email_format CHECK (email IS NULL OR email ~* '^[^@]+@[^@]+\.[^@]+$');
  END IF;
END$$;

-- 4️⃣ Trigger para mantener updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_companies_updated_at') THEN
    CREATE TRIGGER trg_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- 5️⃣ Índice combinado para gestión rápida
CREATE INDEX IF NOT EXISTS idx_companies_plan_active
  ON public.companies(plan, is_active);


/* ------------------------------
   🔹 TABLE: public.app_users
   ------------------------------ */

-- 1️⃣ Agregar campos de mantenimiento y legales
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS terms_accepted boolean NOT NULL DEFAULT false;

-- 2️⃣ Validación de formato de email
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_app_users_email_format'
  ) THEN
    ALTER TABLE public.app_users
    ADD CONSTRAINT chk_app_users_email_format CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$');
  END IF;
END$$;

-- 3️⃣ Trigger para updated_at automático
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_app_users_updated_at') THEN
    CREATE TRIGGER trg_app_users_updated_at
    BEFORE UPDATE ON public.app_users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- 4️⃣ (Opcional) Soft delete para futuro — solo si se planea usar
-- ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS deleted_at timestamptz;


/* ✅ End of update script */

/* =====================================================
   PATCH: app_users — términos y consistencia
   Objetivo: timestamp de aceptación + coherencia y autollenado
   ===================================================== */

-- 1) Columna de timestamp (si no existe)
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

COMMENT ON COLUMN public.app_users.terms_accepted_at IS
'Fecha/hora en que el usuario aceptó T&C. Se autocompleta cuando terms_accepted pasa a true.';

-- 2) Regla de consistencia: si terms_accepted es true, debe existir terms_accepted_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_app_users_terms_consistency'
      AND conrelid = 'public.app_users'::regclass
  ) THEN
    ALTER TABLE public.app_users
    ADD CONSTRAINT chk_app_users_terms_consistency
      CHECK (NOT terms_accepted OR terms_accepted_at IS NOT NULL);
  END IF;
END$$;

-- 3) Trigger: autollenar terms_accepted_at cuando cambie a true (insert/update)
CREATE OR REPLACE FUNCTION public.set_terms_accepted_at_app_users()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- Si pasa a true y no tiene timestamp, se setea ahora
  IF NEW.terms_accepted = true
     AND (NEW.terms_accepted_at IS NULL)
     AND (TG_OP = 'INSERT' OR COALESCE(OLD.terms_accepted,false) IS DISTINCT FROM true) THEN
    NEW.terms_accepted_at := now();
  END IF;

  -- Si alguien marca en falso, NO borramos el timestamp (histórico); se puede cambiar esta lógica si lo requieres.
  RETURN NEW;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_app_users_terms_accepted_at') THEN
    CREATE TRIGGER trg_app_users_terms_accepted_at
    BEFORE INSERT OR UPDATE ON public.app_users
    FOR EACH ROW
    EXECUTE FUNCTION public.set_terms_accepted_at_app_users();
  END IF;
END$$;

