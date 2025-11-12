-- se cambio columna slug a companie_code en tabal companies
ALTER TABLE public.companies RENAME COLUMN slug TO companie_code;
CREATE UNIQUE INDEX IF NOT EXISTS ux_companies_companie_code ON public.companies (companie_code);

* ==========================================================
   🔸 PASO 2 — Ajustar tabla app_users
   Objetivo: usar user_id como identificador lógico, 
   crear login_id (user_id@companie_code) y control de estado.
   ========================================================== */

-- 1️⃣ Renombrar columna user_name → user_id
-- (Solo si existe user_name y aún no se renombró)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='app_users' AND column_name='user_name'
  ) THEN
    ALTER TABLE public.app_users RENAME COLUMN user_name TO user_id;
  END IF;
END$$;

--------------------------------------------------------------

-- 2️⃣ Agregar columnas nuevas: status y login_id
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS login_id text;

--------------------------------------------------------------

-- 3️⃣ Validación de valores permitidos en status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname='chk_app_users_status'
      AND conrelid='public.app_users'::regclass
  ) THEN
    ALTER TABLE public.app_users
    ADD CONSTRAINT chk_app_users_status
      CHECK (status IN ('active','inactive','pending','banned'));
  END IF;
END$$;

--------------------------------------------------------------

-- 4️⃣ Reglas de unicidad
--    a) Unicidad de user_id dentro de cada empresa
--    b) Unicidad global del login_id
DO $$
BEGIN
  -- (a)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='ux_app_users_company_user'
      AND conrelid='public.app_users'::regclass
  ) THEN
    ALTER TABLE public.app_users
    ADD CONSTRAINT ux_app_users_company_user UNIQUE (company_id, user_id);
  END IF;

  -- (b)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='ux_app_users_login_id'
      AND conrelid='public.app_users'::regclass
  ) THEN
    ALTER TABLE public.app_users
    ADD CONSTRAINT ux_app_users_login_id UNIQUE (login_id);
  END IF;
END$$;

--------------------------------------------------------------

-- 5️⃣ Trigger automático para generar login_id = user_id@companie_code
CREATE OR REPLACE FUNCTION public.set_login_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  v_code text;
BEGIN
  -- Buscar companie_code de la empresa
  SELECT c.companie_code INTO v_code
  FROM public.companies c
  WHERE c.id = NEW.company_id;

  IF v_code IS NULL THEN
    RAISE EXCEPTION 'Company % has no companie_code', NEW.company_id;
  END IF;

  -- Generar el login_id
  NEW.login_id := lower(NEW.user_id || '@' || v_code);
  RETURN NEW;
END$$;

-- Crear triggers para INSERT y UPDATE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_app_users_set_login_id_ins') THEN
    CREATE TRIGGER trg_app_users_set_login_id_ins
    BEFORE INSERT ON public.app_users
    FOR EACH ROW EXECUTE FUNCTION public.set_login_id();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_app_users_set_login_id_upd') THEN
    CREATE TRIGGER trg_app_users_set_login_id_upd
    BEFORE UPDATE OF user_id, company_id ON public.app_users
    FOR EACH ROW EXECUTE FUNCTION public.set_login_id();
  END IF;
END$$;

--------------------------------------------------------------

-- 6️⃣ Backfill: generar login_id para los registros existentes (si los hay)
UPDATE public.app_users u
SET login_id = lower(u.user_id || '@' || c.companie_code)
FROM public.companies c
WHERE u.company_id = c.id
  AND (u.login_id IS NULL OR u.login_id = '');

--------------------------------------------------------------

-- 7️⃣ Marcar login_id como obligatorio (NOT NULL)
ALTER TABLE public.app_users
  ALTER COLUMN login_id SET NOT NULL;

--------------------------------------------------------------

-- 8️⃣ Índices útiles para consultas
CREATE INDEX IF NOT EXISTS idx_app_users_company_user ON public.app_users(company_id, user_id);
CREATE INDEX IF NOT EXISTS idx_app_users_status ON public.app_users(status);

--------------------------------------------------------------

-- ✅ Verificación rápida
-- SELECT company_id, user_id, login_id, status FROM public.app_users LIMIT 10;
