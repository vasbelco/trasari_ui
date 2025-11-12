//PAgian de registro

"use client"; // 👈 Indica que este componente se ejecuta en el cliente (usa hooks).

import { useState, useEffect } from "react"; // 👈 Para manejar el estado del formulario.
import { slugify } from "@/lib/slugify"; // 👈 Función auxiliar para generar el slug automáticamente.
import Image from "next/image";
import logo from "@/assets/logo.svg";


// 🔹 Página de registro (mitad izquierda branding / mitad derecha formulario)
export default function RegisterPage() {
  // =====================
  // 🔹 Estados del formulario
  // =====================
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  
  // Owner (admin principal)
  const [ownerName, setOwnerName] = useState("");
 
  // Password
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  // ⚑ Flags: si el usuario edita, dejamos de sincronizar automáticamente
    const [ownerEmailTouched, setOwnerEmailTouched] = useState(false);
    const [usernameEdited, setUsernameEdited] = useState(false);

  function toUsernameBase(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "")
    .slice(0, 20);
    }   
  
  

    return (
    // Layout general: dos columnas (mobile = 1, desktop = 2)
    <main className="grid grid-cols-1 md:grid-cols-2 md:h-screen">
      
      {/* ========================== */}
      {/* BLOQUE IZQUIERDO (BRANDING) */}
      {/* ========================== */}
      <section className="relative hidden md:flex bg-slate-700 text-slate-100 md:sticky md:top-0 md:h-screen items-center">
        {/* Barra superior: logo + enlace "Iniciar sesión" */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-6">
       {/* <div className="mx-auto max-w-md p-10">*/}
          <Image
            src={logo}
            alt="Logo Vasbel"
            width={120}
            height={32}
            className="object-contain"
            />

          {/* 👆 Esto es el logo por ahora (texto simple, luego se puede cambiar por SVG o imagen) */}
          
          <a 
            href="/login" 
            className="text-sm hover:underline opacity-80 hover:opacity-100"
          >
            Iniciar sesión
          </a>
        </div>

        {/* Contenido central (texto de presentación) */}
        <div className="m-auto max-w-md p-10">
          <h2 className="text-2xl font-semibold mb-3">
            Admisitra tu empresa con VasBel
          </h2>
          <p className="text-slate-300">
            Gestión simple y profesional para tu operación. Multi-empresa, roles y control.
          </p>
        </div>
      </section>


      {/* ========================== */}
      {/* BLOQUE DERECHO (FORMULARIO) */}
      {/* ========================== */}
      {/*<section className="bg-slate-50 flex items-center justify-center p-6">*/}
      <section className="bg-slate-50 flex justify-center p-6 md:h-screen md:overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Encabezado */}
          <h1 className="text-2xl font-semibold text-slate-900">
            Crear cuenta
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            Registra tu empresa y empieza gratis.
          </p>

          {/* ========================== */}
          {/* BLOQUE EMPRESA */} 
          {/* Tarjeta del formulario */}
          <div className="bg-white border border-slate-200 shadow-lg rounded-2xl p-6 space-y-4">

            {/* Campo: Nombre de empresa */}
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Nombre de empresa *
              </label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 
                           outline-none focus:ring focus:ring-slate-200"
                placeholder="Ej. Construcciones VasBel"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
              
            </div>


            {/* Campo: Correo empresa */}
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Correo *
              </label>
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 
                           outline-none focus:ring focus:ring-slate-200"
                placeholder="Ej. contacto@vasbel.com"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
              />
            </div>

           

              {/* ========================== */}
               {/* BLOQUE OWNER */} 
                

            <h3 className="text-sm font-semibold text-slate-700 mb-2">
            Administrador principal *
            </h3>

            {/* Nombre completo */}
            <div>
            <label className="block text-sm font-medium text-slate-700">
                Nombre completo *
            </label>
            <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring focus:ring-slate-200"
                placeholder="Ej. Carlos Vasbelco"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                
            />
            </div>

            

            {/* Password */}
            <div>
            <label className="block text-sm font-medium text-slate-700">
                Contraseña *
            </label>
            <input
                type="password"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring focus:ring-slate-200"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            </div>

            {/* Confirmación */}
            <div>
            <label className="block text-sm font-medium text-slate-700">
                Confirmar contraseña *
            </label>
            <input
                type="password"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring focus:ring-slate-200"
                placeholder="Repite la contraseña"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
            />
            {/* Mensaje simple de validación en cliente (visual) */}
            {password && password2 && password !== password2 && (
                <p className="mt-1 text-xs text-red-600">
                Las contraseñas no coinciden.
                </p>
            )}
            </div>

          </div>

            {/* ========================== */}
            {/* Aceptar términos y botón */}
            {/* ========================== */}
            <div className="mt-6 space-y-4">

            {/* Checkbox de términos */}
            <label className="flex items-start space-x-3 text-sm text-slate-700">
                <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-slate-400"
                    required
                />
                <span>
                Acepto los{" "}
                <a href="/terminos" target="_blank" className="underline text-slate-800">
                    Términos y Condiciones
                </a>{" "}
                y la{" "}
                <a href="/privacidad" target="_blank" className="underline text-slate-800">
                    Política de Privacidad
                </a>.
                </span>
            </label>

            {/* Botón principal */}
            <button
                type="submit"
                className="w-full bg-slate-700 text-white font-medium py-2.5 rounded-lg
                        hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
                Crear cuenta
            </button>
            </div>


            {/* Enlace inferior (para usuarios existentes) */}
            <p className="text-sm text-slate-600 mt-4 pb-10 text-center">
                ¿Ya tienes cuenta?{" "}
                <a href="/login" className="underline">Inicia sesión</a>
            </p>

        </div>

      </section>

    </main>
  );
}

