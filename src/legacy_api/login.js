// Archivo: pages/api/login.js
// Propósito: Autenticar por email + password en Supabase Auth,
//            actualizar last_login en app_users y devolver sesión + datos básicos.
// Notas de seguridad:
//  - Este endpoint se ejecuta en servidor (Vercel Function). Aquí SÍ podemos usar SERVICE_ROLE
//    para actualizar la BD (last_login). Nunca expongas SERVICE_ROLE al cliente.
//  - Los tokens que devolvemos son los de Supabase Auth (access_token y refresh_token).
// Requisitos de entorno (Vercel):
//  - NEXT_PUBLIC_SUPABASE_URL
//  - NEXT_PUBLIC_SUPABASE_ANON_KEY
//  - SUPABASE_SERVICE_ROLE

import { createClient } from "@supabase/supabase-js";

// ————————————————————————————————————————
// Utilidades de cabeceras (CORS / preflight)
// ————————————————————————————————————————
function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*"); // En prod: restringe a tu dominio
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// ————————————————————————————————————————
// Clientes Supabase
// - clientePublic: para login (Auth) con ANON KEY
// - admin: para escribir en tablas protegidas (SERVICE ROLE)
// ————————————————————————————————————————
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE;

const clientePublic = createClient(URL, ANON);
const admin = createClient(URL, SERVICE);

// ————————————————————————————————————————
// Handler principal
// ————————————————————————————————————————
export default async function handler(req, res) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método no permitido" });

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Faltan email y/o password en el body" });
  }

  try {
    // 1) Autenticación en Supabase Auth (con ANON KEY)
    const { data: signInData, error: signInErr } =
      await clientePublic.auth.signInWithPassword({ email, password });

    if (signInErr || !signInData?.user || !signInData?.session) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const { user, session } = signInData;
    const auth_uid = user.id; // UUID del usuario en Auth

    // 2) Buscar fila en app_users por auth_uid
    const { data: appUser, error: userErr } = await admin
      .from("app_users")
      .select("id, company_id, role, active, name, user_name")
      .eq("auth_uid", auth_uid)
      .maybeSingle();

    if (userErr) throw userErr;
    if (!appUser) {
      // Usuario autenticado en Auth, pero no tiene fila en app_users → inconsistencia
      return res.status(409).json({
        error: "Usuario sin registro interno (app_users)",
      });
    }
    if (!appUser.active) {
      return res.status(403).json({ error: "Usuario desactivado" });
    }

    // 3) Actualizar last_login (solo información, no bloquea el login si falla)
    try {
      await admin
        .from("app_users")
        .update({ last_login: new Date().toISOString() })
        .eq("id", appUser.id);
    } catch (_) {
      // Opcional: loguear en Sentry/LogDrain, pero no romper el flujo de login
    }

    // 4) Respuesta con tokens y datos mínimos para el cliente
    return res.status(200).json({
      ok: true,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      token_type: session.token_type,
      user: {
        auth_uid,
        email: user.email,
        name: appUser.name,
        user_name: appUser.user_name,
        role: appUser.role,
        company_id: appUser.company_id,
      },
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Error en login" });
  }
}
