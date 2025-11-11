# 📘 Trasari MVP – Esquema Base (Supabase / PostgreSQL)

## 🔹 Tabla: `public.companies`
**Propósito:** Define la empresa (tenant) principal del sistema.

| Columna | Tipo | Restricciones | Descripción |
|----------|------|----------------|--------------|
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Identificador único de empresa. |
| `name` | `text` | `NOT NULL` | Nombre de la empresa. |
| `slug` | `text` | `UNIQUE`, `NOT NULL` | Identificador legible o subdominio único. |
| `plan` | `text` | `NOT NULL`, `DEFAULT 'trial'`, `CHECK (plan IN ('trial','basic','pro','enterprise'))` | Nivel de plan. |
| `phone` | `text` | — | Teléfono de contacto. |
| `email` | `text` | `CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$')` | Correo de contacto. |
| `address` | `text` | — | Dirección comercial. |
| `city` | `text` | — | Ciudad principal. |
| `nit` | `text` | — | Número de identificación tributaria. |
| `plan_limit_users` | `integer` | `NOT NULL DEFAULT 5` | Límite de usuarios del plan. |
| `plan_limit_projects` | `integer` | `NOT NULL DEFAULT 2` | Límite de proyectos del plan. |
| `is_active` | `boolean` | `NOT NULL DEFAULT true` | Estado activo de la empresa. |
| `terms_accepted` | `boolean` | `NOT NULL DEFAULT false` | Indica si aceptó términos y condiciones. |
| `terms_accepted_at` | `timestamptz` | — | Fecha/hora de aceptación de términos. |
| `created_at` | `timestamptz` | `DEFAULT now()` | Fecha de creación. |
| `updated_at` | `timestamptz` | `DEFAULT now()`, trigger `trg_companies_updated_at` | Última actualización. |

**Índices:**  
- `idx_companies_slug` – búsqueda rápida por slug.  
- `idx_companies_plan_active` – consultas de gestión.  

---

## 🔹 Tabla: `public.app_users`
**Propósito:** Usuarios internos del sistema asociados a cada empresa (multi-tenant).

| Columna | Tipo | Restricciones | Descripción |
|----------|------|----------------|--------------|
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Identificador único. |
| `company_id` | `uuid` | `FK → companies(id)`, `ON DELETE CASCADE` | Relación con empresa. |
| `auth_uid` | `uuid` | `UNIQUE (company_id, auth_uid)` | ID en Supabase Auth. |
| `email` | `text` | `NOT NULL`, `UNIQUE (company_id, email)`, `CHECK (email formato)` | Correo de usuario. |
| `user_name` | `text` | `UNIQUE GLOBAL`, `NOT NULL` | Identificador visible del usuario. |
| `name` | `text` | `NOT NULL` | Nombre completo. |
| `phone` | `text` | — | Teléfono de contacto. |
| `role` | `text` | `CHECK (role IN ('owner','super_admin','admin','operator','supervisor','auditor'))`, `DEFAULT 'operator'` | Rol funcional. |
| `active` | `boolean` | `NOT NULL DEFAULT true` | Estado activo. |
| `terms_accepted` | `boolean` | `NOT NULL DEFAULT false` | Aceptación de términos individuales. |
| `created_at` | `timestamptz` | `DEFAULT now()` | Fecha de creación. |
| `updated_at` | `timestamptz` | `DEFAULT now()`, trigger `trg_app_users_updated_at` | Última actualización. |
| `last_login` | `timestamptz` | — | Último acceso registrado. |
| `deleted_at` | `timestamptz` | (opcional) | Eliminación lógica (si se implementa). |
| `terms_accepted_at` | `timestamptz` | `CHECK (NOT terms_accepted OR terms_accepted_at IS NOT NULL)` | Timestamp de aceptación de TyC. Se autocompleta al pasar `terms_accepted` a `true`. |


**Índices:**  
- `idx_app_users_company_id` – acceso rápido por empresa.  
- `idx_app_users_role` – filtrado por rol.  
- `idx_app_users_active` – filtrado por estado.  

---

## 🔹 Triggers y funciones

| Nombre | Tipo | Tabla | Descripción |
|---------|------|--------|-------------|
| `set_updated_at()` | `FUNCTION` | global | Actualiza `updated_at` automáticamente. |
| `trg_companies_updated_at` | `TRIGGER` | companies | Llama a `set_updated_at()`. |
| `trg_app_users_updated_at` | `TRIGGER` | app_users | Llama a `set_updated_at()`. |
| `set_terms_accepted_at_app_users()` | `FUNCTION` | app_users | Setea `terms_accepted_at` cuando `terms_accepted` pasa a `true`. |
| `trg_app_users_terms_accepted_at`   | `TRIGGER`  | app_users | BEFORE INSERT/UPDATE → llama a `set_terms_accepted_at_app_users()`. |

---

## 🧩 Notas para RLS (Row Level Security)
- Activar solo después de propagar `company_id` en JWT.  
- Política base:
  ```sql
  CREATE POLICY "users_can_access_own_company"
  ON app_users
  FOR ALL
  USING (company_id = current_setting('request.jwt.claims.company_id', true)::uuid);
- Consistencia TyC en `app_users`: `chk_app_users_terms_consistency` exige que, si `terms_accepted = true`, entonces `terms_accepted_at` no sea `NULL`.

  
## Acutalizacion


