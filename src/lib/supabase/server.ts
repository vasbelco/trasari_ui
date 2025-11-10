// src/lib/supabase/server.ts
import { createClient } from "@supabase/supabase-js";

/**
 * Crea un cliente de Supabase usando la clave del servidor.
 * Este cliente tiene permisos ampliados (solo úsalo en el backend o en rutas API).
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}
