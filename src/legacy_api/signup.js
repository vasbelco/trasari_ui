// Archivo: pages/api/signup.js
// Propósito: Crear empresa COMPLETA en `companies` + usuario owner en `app_users` y Supabase Auth
// Notas:
//  - Comentarios en español para claridad del equipo
//  - Identificadores/columnas en inglés (consistencia con BD)
//  - Maneja CORS y preflight
//  - Validaciones de campos y unicidad (slug y user_name)
//  - Lógica de "rollback" si una operación intermedia falla
//  - created_at / updated_at (companies) y last_login (app_users) NO se gestionan aquí:
//      * created_at/updated_at los maneja la BD (DEFAULT + trigger)
//      * last_login se actualizará cuando el usuario inicie sesión (no en signup)

import { createClient } from "@supabase/supabase-js";

// ————————————————————————————————————————————————————————————————
// Utilidades
// ————————————————————————————————————————————————————————————————
function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*"); // En producción, restringe dominio
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function toSlug(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quitar acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function normalizeUserName(u) {
  return String(u || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]/g, "");
}

const USERNAME_REGEX = /^[a-z0-9._-]{3,20}$/;
const RESERVED_USERNAMES = new Set([
  "admin", "owner", "support", "root", "system", "trasari", "api", "docs", "help"
]);

// ————————————————————————————————————————————————————————————————
// Supabase Admin (usa Service Role para administrar Auth y escribir en tablas)
// ————————————————————————————————————————————————————————————————
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  // Extraer payload
  const { company, owner } = req.body || {};
  if (!company || !owner) {
    return res.status(400).json({ error: "Faltan objetos 'company' y/o 'owner' en el body" });
  }

  // Validaciones mínimas de company
  const {
    name,
    slug: rawSlug,
    nit,
    email: company_email,
    phone: company_phone,
    address,
    city,
    plan = "basic",
    plan_limit_users = 5,
    plan_limit_projects = 2,
    is_active = true
  } = company;

  if (!name || !nit || !company_email || !company_phone || !address || !city) {
    return res.status(400).json({ error: "Faltan campos requeridos en company (name, nit, email, phone, address, city)" });
  }

  const slug = rawSlug && String(rawSlug).trim() !== "" ? rawSlug : toSlug(name);
  if (!slug) return res.status(400).json({ error: "No se pudo derivar un slug válido" });

  // Validaciones mínimas de owner
  const {
    email: owner_email,
    password,
    user_name: rawUserName,
    name: owner_name,
    phone: owner_phone
  } = owner;

  if (!owner_email || !password || !owner_name || !rawUserName) {
    return res.status(400).json({ error: "Faltan campos requeridos en owner (email, password, name, user_name)" });
  }

  const user_name = normalizeUserName(rawUserName);
  if (!USERNAME_REGEX.test(user_name)) {
    return res.status(400).json({ error: "user_name inválido. Use 3–20 caracteres: a-z, 0-9, . _ -" });
  }
  if (RESERVED_USERNAMES.has(user_name)) {
    return res.status(409).json({ error: "user_name no disponible" });
  }

  // ————————————————————————————————————————————————————————————————
  // Comprobaciones de unicidad previas: slug y user_name
  // ————————————————————————————————————————————————————————————————
  try {
    // slug único en companies
    const { data: slugExists, error: slugErr } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (slugErr) throw slugErr;
    if (slugExists) return res.status(409).json({ error: "slug ya en uso" });

    // user_name único global en app_users (si hay constraint global, esto es redundante pero más claro para UX)
    const { data: unameExists, error: unameErr } = await supabaseAdmin
      .from("app_users")
      .select("id")
      .eq("user_name", user_name)
      .maybeSingle();
    if (unameErr) throw unameErr;
    if (unameExists) return res.status(409).json({ error: "user_name no disponible" });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Error validando unicidad" });
  }

  // ————————————————————————————————————————————————————————————————
  // Crear Auth user → luego company → luego app_user. Con rollback si falla algo.
  // ————————————————————————————————————————————————————————————————
  let auth_uid = null;
  let company_id = null;

  try {
    // 1) Crear usuario en Supabase Auth (email/password)
    const { data: created, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: owner_email,
      password,
      user_metadata: { name: owner_name, phone: owner_phone || null },
      email_confirm: true
    });
    if (authErr || !created?.user) throw authErr || new Error("No se pudo crear el usuario en Auth");
    auth_uid = created.user.id;

    // 2) Crear empresa en companies
    const insertCompany = {
      name,
      slug,
      nit,
      email: company_email,
      phone: company_phone,
      address,
      city,
      plan,
      plan_limit_users,
      plan_limit_projects,
      is_active
      // created_at / updated_at: automáticos en la BD
    };
    const { data: companyRow, error: compErr } = await supabaseAdmin
      .from("companies")
      .insert([insertCompany])
      .select("id, slug")
      .single();
    if (compErr || !companyRow?.id) throw compErr || new Error("No se pudo crear la empresa");
    company_id = companyRow.id;

    // 3) Crear app_user (owner) vinculado
    const insertUser = {
      company_id,
      auth_uid,
      email: owner_email,
      user_name,
      name: owner_name,
      phone: owner_phone || null,
      role: "owner",
      active: true
      // created_at: automático; last_login: se actualizará en login
    };
    const { error: appUserErr } = await supabaseAdmin
      .from("app_users")
      .insert([insertUser]);
    if (appUserErr) throw appUserErr;

    // Éxito
    return res.status(200).json({ ok: true, company_id, auth_uid, slug });
  } catch (err) {
    // Rollback: intentar limpiar lo creado parcialmente
    if (company_id) {
      await supabaseAdmin.from("companies").delete().eq("id", company_id);
    }
    if (auth_uid) {
      // Eliminar usuario en Auth (requiere Service Role)
      try { await supabaseAdmin.auth.admin.deleteUser(auth_uid); } catch (_) {}
    }
    const msg = err?.message || "Error en signup";
    return res.status(500).json({ error: msg });
  }
}
