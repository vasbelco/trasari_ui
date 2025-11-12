// Página de recuperación de contraseña de Finkus
"use client";
import Image from "next/image";
import logo from "@/assets/logo.svg";

export default function ForgotPasswordPage() {
  return (
    <div className="bg-slate-700 min-h-screen w-full flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 p-8">
        {/* LOGO con enlace a la landing */}
        <div className="mx-auto mb-6 flex justify-center">
          <a href="https://finkus.app/">
            <Image
              src={logo}
              alt="Logo Finkus"
              width={96}
              height={96}
              className="opacity-90 hover:opacity-100 transition"
              priority
            />
          </a>
        </div>

        {/* TÍTULO */}
        <h1 className="text-center text-3xl font-light text-white leading-relaxed mb-2">
          Recuperar contraseña
        </h1>
        <p className="text-center text-white/70 text-sm mb-6">
          Ingresa tu correo y te enviaremos un enlace para restablecerla.
        </p>

        {/* FORMULARIO */}
        <form className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="User_id o Correo electrónico"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40"
            />
          </div>

          {/* BOTÓN PRINCIPAL */}
          <button
            type="submit"
            className="bg-slate-100 w-full rounded-xl  py-3 font-medium text-bg-700 shadow-md hover:opacity-80 transition"
          >
            Enviar enlace de recuperación
          </button>
        </form>

        {/* ENLACE DE REGRESO */}
        <div className="mt-6 text-center text-sm text-white/70">
          <a href="/login" className="underline underline-offset-4 hover:text-white">
            Volver a iniciar sesión
          </a>
        </div>
      </div>
    </div>
  );
}
