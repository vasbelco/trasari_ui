// Página principal del login de Finkus
"use client";
//Importa Framer Motion*
import { useState, useEffect } from "react";
import Image from "next/image";
import logo from "@/assets/logo.svg";
//import Link from "next/link";




export default function LoginPage() {


  return (
    
    // Contenedor general: ocupa toda la pantalla, centra el contenido
    <div className="bg-slate-700 min-h-screen w-full flex items-center justify-center px-4">

      {/* ─────────────────────────────── */}
      {/* TARJETA FLOTANTE (Glassmorphism) */}
      {/* ─────────────────────────────── */}
      <div
        className="
          w-full max-w-md                 /* ancho máximo  (responsive) */
          rounded-2xl                     /* bordes redondeados grandes */
          border border-white/20          /* borde blanco semitransparente */
          bg-white/10                    /* fondo blanco con opacidad (vidrio) */
          backdrop-blur-xl                /* desenfoque del fondo detrás */
          shadow-2xl shadow-black/20      /* sombra suave para flotación */
          p-8                             /* padding interno */
        "
      >

      {/* LOGO REAL (optimizado con next/image) */}
      <div className="mx-auto mb-6 flex justify-center">
   
        <Image
          src={logo} // <- desde /public
          alt="Logo Vasbel"
          width={96}                            // ajusta tamaño
          height={96}
          className="opacity-90"
          priority                               // carga prioritaria
        />
      </div>

        {/* TÍTULO PRINCIPAL */}
        <h1 className="text-center text-5xl font-ligth 300 text-white leading-relaxed">Vasbel</h1>


        {/* FORMULARIO */}
        <form className="mt-6 space-y-4">
          <div>
            <input
              type="user_id"
              placeholder="User_id"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Contraseña"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40"
            />
          </div>

          {/* BOTÓN PRINCIPAL */}
          <button
            type="submit"
            className="bg-slate-100 w-full rounded-xl  py-3 font-medium text-bg-700 shadow-md hover:opacity-80 transition"
          >
            Iniciar sesión
          </button>
        </form>

        {/* ENLACE SECUNDARIO (crear cuenta) */}
        <div className="mt-4 text-center text-sm text-white/70">
          ¿Nuevo en Vasbel?{" "}
          <a 
            href="/register" 
            className="underline underline-offset-4">Crear cuenta
          </a>
        </div>

        {/* ENLACE terciario (olvidaste contraseña) */}
        <div className="mt-2 text-center text-xs text-white/60">
          <a href="/forgot-password" className="hover:underline">
            ¿Olvidaste tu contraseña?
          </a>
        </div>

      </div>
    </div>
  );
}
