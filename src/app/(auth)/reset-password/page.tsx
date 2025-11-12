// Página de restablecimiento de contraseña de Finkus
"use client";
import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/logo.svg";

export default function ResetPasswordPage() {
  return (
    <div className="bg-slate-700 min-h-screen w-full flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 p-8">
        {/* LOGO con enlace a la landing */}
        <div className="mx-auto mb-6 flex justify-center">
          <Link href="https://finkus.app/" target="_blank">
            <Image
              src={logo}
              alt="Logo Finkus"
              width={96}
              height={96}
              className="opacity-90 hover:opacity-100 transition cursor-pointer"
              priority
            />
          </Link>
        </div>

        {/* TÍTULO */}
        <h1 className="text-center text-3xl font-light text-white leading-relaxed mb-2">
          Restablecer contraseña
        </h1>
        <p className="text-center text-white/70 text-sm mb-6">
          Ingresa tu nueva contraseña y confírmala para continuar.
        </p>

        {/* FORMULARIO */}
        <form className="space-y-4">
          <div>
            <input
              type="password"
              placeholder="Nueva contraseña"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Confirmar contraseña"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40"
            />
          </div>

          {/* BOTÓN PRINCIPAL */}
          <button
            type="submit"
            className="bg-slate-100 w-full rounded-xl  py-3 font-medium text-bg-700 shadow-md hover:opacity-80 transition"
          >
            Guardar nueva contraseña
          </button>
        </form>

        {/* ENLACE DE REGRESO */}
        <div className="mt-6 text-center text-sm text-white/70">
          <Link href="/login" className="underline underline-offset-4 hover:text-white">
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
