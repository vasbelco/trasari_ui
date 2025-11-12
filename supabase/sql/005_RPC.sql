/* ==========================================================
   RPC: redeem_invite(token_plano, user_id)
   Objetivo:
   - Validar una invitación (token hash → fila válida, no expirada, pendiente).
   - Crear el app_user vinculado al auth.uid() actual.
   - Marcar la invitación como 'used' con timestamp.
   - Devolver datos clave del usuario creado.

   Requisitos:
   - Extensión pgcrypto habilitada (para SHA-256).
   - Tablas: public.invites, public.app_users, public.companies.
   - Triggers ya crean login_id = user_id@companie_code.
   - Llamada debe hacerse autenticado (auth.uid() ≠ NULL).

   Seguridad:
   - SECURITY DEFINER para ejecutar con el owner de la función.
   - GRANT EXECUTE solo a 'authenticated'.
   ========================================================== */

-- 0) Asegura pgcrypto (hash SHA-256)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Crear/actualizar función
CREATE OR REPLACE FUNCTION public.redeem_invite(
  _token   text,   -- token plano recibido por email/enlace
  _user_id text    -- identificador deseado dentro de la empresa (ej. "jperez")
)
RETURNS TABLE (
  app_user_id uuid,
  company_id  uuid,
  user_id     text,
  login_id    text,
  role        public.user_role,
  email       text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_hash text;
  v_inv        public.invites%ROWTYPE;
  v_me_uid     uuid;  -- auth.uid() del usuario autenticado
  v_new_user   public.app_users%ROWTYPE;
BEGIN
  -- 1) Debe estar autenticado (post sign-up). Si no, error.
  v_me_uid := auth.uid();
  IF v_me_uid IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to redeem invite';
  END IF;

  -- 2) Hash del token de entrada (SHA-256 hex) para comparar con invites.token_hash
  v_token_hash := encode(digest(_token, 'sha256'), 'hex');

  -- 3) Leer y bloquear (FOR UPDATE) la invitación válida (pendiente y no expirada)
  SELECT * INTO v_inv
  FROM public.invites
  WHERE token_hash = v_token_hash
    AND status     = 'pending'
    AND now()      < expires_at
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  -- 4) Evitar duplicados de user_id dentro de la misma empresa
  IF EXISTS (
    SELECT 1
    FROM public.app_users u
    WHERE u.company_id = v_inv.company_id
      AND u.user_id    = _user_id
  ) THEN
    RAISE EXCEPTION 'user_id "%" already exists in this company', _user_id;
  END IF;

  -- 5) Crear el app_user:
  --    - company_id desde la invitación
  --    - auth_uid = auth.uid() actual
  --    - email     = email del invite (fuente de verdad para el alta)
  --    - user_id   = provisto por el invitado (_user_id)
  --    - name      = alias inicial (parte local del email) — editable luego en Perfil
  --    - role      = rol del invite
  --    - status    = 'active'
  INSERT INTO public.app_users (
    company_id, auth_uid, email, user_id, name, role, status
  )
  VALUES (
    v_inv.company_id,
    v_me_uid,
    v_inv.email,
    _user_id,
    COALESCE(split_part(v_inv.email, '@', 1), 'user'),
    v_inv.role,
    'active'
  )
  RETURNING * INTO v_new_user;

  -- 6) Marcar la invitación como usada
  UPDATE public.invites
  SET status = 'used',
      used_at = now()
  WHERE id = v_inv.id;

  -- 7) Devolver datos clave del usuario creado
  app_user_id := v_new_user.id;
  company_id  := v_new_user.company_id;
  user_id     := v_new_user.user_id;
  login_id    := v_new_user.login_id; -- generado por trigger (user_id@companie_code)
  role        := v_new_user.role;
  email       := v_new_user.email;
  RETURN;
END;
$$;

-- 2) Asegurar que la función la posea el mismo owner que las tablas (para bypass RLS por owner)
-- (Opcional; en Supabase suele ser 'postgres')
-- ALTER FUNCTION public.redeem_invite(text, text) OWNER TO postgres;

-- 3) Permisos de ejecución:
REVOKE ALL ON FUNCTION public.redeem_invite(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_invite(text, text) TO authenticated;

-- ✅ Pruebas sugeridas (manual, no ejecutar aquí):
-- 1) Como owner/admin autenticado, crear un invite con token_hash (SHA-256 del token plano) y expires_at > now().
-- 2) Como nuevo usuario: signUp(email_del_invite, password) → obtienes sesión (auth.uid()).
-- 3) Llamar RPC: SELECT * FROM public.redeem_invite('<token_plano>', '<user_id_deseado>');
-- 4) Verificar:
--    - app_users tiene el nuevo registro (company_id de la invitación, login_id generado, rol correcto).
--    - invites.status = 'used' y used_at con timestamp.
