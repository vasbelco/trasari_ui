// src/app/api/health/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { ok: false, error: "Faltan variables de entorno" },
      { status: 500 }
    );
  }

  try {
    // Hacemos una llamada simple al endpoint de Auth de Supabase
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, status: response.status, msg: "Supabase no responde" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      status: 200,
      msg: "Conexión con Supabase exitosa ✅",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "Error desconocido" },
      { status: 500 }
    );
  }
}
