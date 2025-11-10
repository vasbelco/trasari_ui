// Archivo: pages/api/users/check-username.js
// Propósito: Verificar si un user_name está disponible y cumple las reglas del sistema.
// Uso: GET /api/users/check-username?user_name=carlos.p
// Resultado esperado: { "available": true, "normalized": "carlos.p" } o { "available": false, "reason": "taken|invalid|reserved" }

import { createClient } from "@supabase/supabase-js";

// ————————————————————————————————————————————————————————————————
// Configuración básica (cliente Supabase con llave pública)
// ————————————————————————————————————————————————————————————————
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ————————————————————————————————————————————————————————————————
// Utilidades locales
// ————————————————————————————————————————————————————————————————
function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*"); // En producción: restringir dominio
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// Normaliza un nombre de usuario (minúsculas, sin espacios ni caracteres inválidos)
function normalizeUserName(u) {
  return String(u || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]/g, "");
}

// Reglas del patrón permitido
const USERNAME_REGEX = /^[a-z0-9._-]{3,20}$/;
const RESERVED_USERNAMES = new Set([
  "admin", "owner", "support", "root", "system", "trasari",
  "api", "help", "docs", "test", "superuser"
]);

// ————————————————————————————————————————————————————————————————
// Handler principal del endpoint
// ————————————————————————————————————————————————————————————————
export default async function handler(req, res) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")
    return res.status(405).json({ error: "Método no permitido" });

  // 1️⃣ Extraer y normalizar el parámetro user_name
  const { user_name: raw } = req.query || {};
  const user_name = normalizeUserName(raw);

  if (!user_name)
    return res.status(400).json({ available: false, reason: "empty" });

  // 2️⃣ Validar formato del user_name
  if (!USERNAME_REGEX.test(user_name))
    return res.status(200).json({ available: false, reason: "invalid" });

  // 3️⃣ Verificar si está reservado
  if (RESERVED_USERNAMES.has(user_name))
    return res.status(200).json({ available: false, reason: "reserved" });

  // 4️⃣ Consultar si ya existe en la base de datos
  try {
    const { data, error } = await supabase
      .from("app_users")
      .select("id")
      .eq("user_name", user_name)
      .maybeSingle();

    if (error) throw error;

    // 5️⃣ Devolver disponibilidad
    if (data) {
      return res.status(200).json({
        available: false,
        reason: "taken",
        normalized: user_name
      });
    }

    return res.status(200).json({
      available: true,
      normalized: user_name
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error verificando nombre" });
  }
}
