// Archivo: pages/api/users/invite.js
// Propósito: Invitar/crear un nuevo usuario dentro de una empresa existente.
// Requisitos de seguridad:
//  - SOLO puede llamar este endpoint un usuario autenticado con rol owner o admin de ESA company.
//  - El token se pasa en Authorization: Bearer <access_token> (obtenido en /api/login).
// Qué hace:
//  1) Verifica token -> obtiene auth_uid del solicitante
//  2) Busca su fila en app_users -> valida rol (owner|admin) y company_id
//  3) Valida payload (email, password, user_name, name, role permitido)
//  4) Valida unicidad user_name global y (company_id, email)
//  5) Valida límite de plan (plan_limit_users)
//  6) Crea usuario en Supabase Auth y en app_users (con rollback si falla)
//  7) Devuelve ids creados
//
// Variables de entorno necesarias (Vercel):
//  - NEXT_PUBLIC_SUPABASE_URL
//  - NEXT_PUBLIC_SUPABASE_ANON_KEY
//  - SUPABASE_SERVICE_ROLE

import { createClient } from "@supabase/supabase-js";

// ————————————————————————————————————————
// Utilidades comunes
// ————————————————————————————————————————
function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*"); // En prod: restringe dominio
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function normalizeUserName(u) {
  return String(u || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]/g, "");
}

// Reglas de user_name
const USERNAME_REGEX = /^[a-z0-9._-]{3,20}$/;
const RESERVED_USERNAMES = new Set([
  "admin", "owner", "support", "root", "system", "trasari", "api", "help", "docs", "test", "superuser"
]);

// ————————————————————————————————————————
// Clientes Supabase
// - clientePublic: se usará con el token del solicitante (para leer su user auth)
// - admin: con SERVICE ROLE para escribir en tablas y crear/borrar usuarios en Auth
// ————————————————————————————————————————
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE;

// Crea un cliente público con el token del solicitante en headers (para getUser)
function publicClientWithToken(accessToken) {
  return createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
const admin = createClient(URL, SERVICE);

// ————————————————————————————————————————
// Handler principal
// ————————————————————————————————————————
export default async function handler(req, res) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método no permitido" });

  // 1) Extraer y validar Authorization: Bearer <token>
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Falta token en Authorization" });
  }

  // 2) Obtener usuario autenticado (solicitante) desde el token
  const pub = publicClientWithToken(token);
  const { data: userData, error: userErr } = await pub.auth.getUser();
  if (userErr || !userData?.user) {
    return res.status(401).json({ error: "Token inválido" });
  }
  const requester_auth_uid = userData.user.id;

  // 3) Leer fila del solicitante en app_users (para company_id y rol)
  const { data: requesterRow, error: reqRowErr } = await admin
    .from("app_users")
    .select("id, company_id, role, active")
    .eq("auth_uid", requester_auth_uid)
    .maybeSingle();

  if (reqRowErr) return res.status(500).json({ error: reqRowErr.message });
  if (!requesterRow) return res.status(403).json({ error: "Usuario sin registro interno" });
  if (!requesterRow.active) return res.status(403).json({ error: "Usuario desactivado" });
  if (!["owner", "admin"].includes(requesterRow.role)) {
    return res.status(403).json({ error: "Permisos insuficientes (requiere owner o admin)" });
  }

  // 4) Validar payload del nuevo usuario
  const { company_id, user } = req.body || {};
  if (!company_id || !user) {
    return res.status(400).json({ error: "Faltan company_id y/o user en el body" });
  }
  if (company_id !== requesterRow.company_id) {
    return res.status(403).json({ error: "No puedes invitar a otra empresa" });
  }

  const { email, password, user_name: rawUserName, name, phone, role } = user;
  if (!email || !password || !rawUserName || !name || !role) {
    return res.status(400).json({ error: "Faltan campos requeridos (email, password, user_name, name, role)" });
  }
  if (role === "owner") {
    return res.status(400).json({ error: "No se puede invitar rol 'owner'" });
  }
  if (!["admin", "operator", "supervisor", "auditor"].includes(role)) {
    return res.status(400).json({ error: "Rol inválido" });
  }

  const user_name = normalizeUserName(rawUserName);
  if (!USERNAME_REGEX.test(user_name)) {
    return res.status(400).json({ error: "user_name inválido. Use 3–20 caracteres: a-z, 0-9, . _ -" });
  }
  if (RESERVED_USERNAMES.has(user_name)) {
    return res.status(409).json({ error: "user_name no disponible (reservado)" });
  }

  // 5) Validar unicidad de user_name global y (company_id, email)
  try {
    // user_name global
    const { data: unameExists, error: unameErr } = await admin
      .from("app_users")
      .select("id")
      .eq("user_name", user_name)
      .maybeSingle();
    if (unameErr) throw unameErr;
    if (unameExists) return res.status(409).json({ error: "user_name no disponible" });

    // email único por empresa
    const { data: mailExists, error: mailErr } = await admin
      .from("app_users")
      .select("id")
      .eq("company_id", company_id)
      .eq("email", email)
      .maybeSingle();
    if (mailErr) throw mailErr;
    if (mailExists) return res.status(409).json({ error: "Email ya existe en la empresa" });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Error validando unicidad" });
  }

  // 6) Validar límite del plan (plan_limit_users)
  //    Contamos usuarios activos en esa company y comparamos con companies.plan_limit_users
  try {
    const [{ data: compRow, error: compErr }, { data: countRows, error: countErr }] = await Promise.all([
      admin.from("companies").select("id, plan, plan_limit_users").eq("id", company_id).maybeSingle(),
      admin.from("app_users").select("id", { count: "exact", head: true }).eq("company_id", company_id).eq("active", true),
    ]);

    if (compErr) throw compErr;
    if (!compRow) return res.status(404).json({ error: "Empresa no encontrada" });
    if (countErr) throw countErr;

    const activeUsersCount = countRows?.length === 0 ? 0 : countRows; // Supabase head count devuelve número en propiedad 'count' en versiones nuevas
    const allowed = compRow.plan_limit_users ?? 1;

    // Ajuste por API: algunas versiones devuelven count en 'count' en vez de data.
    const { count: headCount } = await admin
      .from("app_users")
      .select("*", { count: "exact", head: true })
      .eq("company_id", company_id)
      .eq("active", true);

    const currentActive = typeof headCount === "number" ? headCount : (typeof activeUsersCount === "number" ? activeUsersCount : 0);

    if (currentActive >= allowed) {
      return res.status(409).json({ error: "Límite de usuarios del plan alcanzado" });
    }
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Error validando límite de plan" });
  }

  // 7) Crear usuario en Auth y en app_users (con rollback)
  let new_auth_uid = null;
  let new_app_user_id = null;

  try {
    // a) Crear en Supabase Auth
    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone: phone || null },
    });
    if (authErr || !created?.user) throw authErr || new Error("No se pudo crear usuario en Auth");
    new_auth_uid = created.user.id;

    // b) Insertar en app_users
    const insertUser = {
      company_id,
      auth_uid: new_auth_uid,
      email,
      user_name,
      name,
      phone: phone || null,
      role,
      active: true,
      // created_at: automático; updated_at por trigger; last_login se setea en /api/login
    };

    const { data: row, error: insErr } = await admin
      .from("app_users")
      .insert([insertUser])
      .select("id")
      .single();

    if (insErr) throw insErr;
    new_app_user_id = row.id;

    // c) OK
    return res.status(200).json({
      ok: true,
      app_user_id: new_app_user_id,
      auth_uid: new_auth_uid,
    });
  } catch (err) {
    // Rollback (mejor esfuerzo)
    if (new_auth_uid) {
      try { await admin.auth.admin.deleteUser(new_auth_uid); } catch (_) {}
    }
    return res.status(500).json({ error: err?.message || "Error invitando usuario" });
  }
}
