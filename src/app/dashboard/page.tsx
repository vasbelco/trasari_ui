// src/app/dashboard/page.tsx (actualizado con soporte de iconos lucide-react)
// Dashboard básico de Vasbel
// - Layout con sidebar + header + contenido
// - Muestra datos simples del usuario (nombre, email, rol, empresa)
// - Sin lógica real de auth todavía: aquí todo es dummy para pruebas de UI
import Image from "next/image";
import type { ReactNode } from "react";
import logo from "@/assets/logo.svg";
// Íconos lucide-react
import { Home, FolderKanban, Wrench, Users, Building2, Settings, UserCog, LogOut } from "lucide-react";

type Role = "owner" | "company_admin" | "site_manager" | "viewer";

interface UserInfo {
  name: string;
  email: string;
  role: Role;
  companyName: string;
  companyStatus: "activa" | "inactiva";
}

// ⚠️ De momento: datos de prueba.
// Más adelante estos valores vendrán desde Supabase / sesión.
const MOCK_USER: UserInfo = {
  name: "Carlos Owner",
  email: "carlos@example.com",
  role: "owner",
  companyName: "Vasbelco",
  companyStatus: "activa",
};

export default function DashboardPage() {
  const user = MOCK_USER;

  // 💡 Lógica para saber si el usuario es owner o admin de empresa
  const isOwnerOrAdmin =
    user.role === "owner" || user.role === "company_admin";

  return (
    // 💡 COLOR FONDO GENERAL DE LA PÁGINA
    // Cambia bg-slate-100 por el que uses en las demás páginas (ej. bg-slate-50 o bg-neutral-100)
    <div className="min-h-screen flex bg-slate-100">
      {/* =============== SIDEBAR =============== */}
      {/* 💡 COLOR / ESTILO DEL SIDEBAR:
          - bg-slate-700: fondo gris oscuro (adaptado a tu tema actual)
          - text-slate-100: texto claro
          Cambia estas clases para que coincida con tu tema. */}
      <aside className="flex flex-col w-64 bg-slate-700 text-slate-100">
        {/* Zona superior: logo + nombre de la app */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          {/* 🔹 ESPACIO PARA EL LOGO */}
          <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center mr-3">
            {/* Aquí va tu logo real */}
            <Image
              src={logo}
              alt="Logo Vasbel"
              width={120}
              height={32}
              className="object-contain"
            />
          </div>

          {/* Nombre de la app */}
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-wide">Vasbel</span>
            <span className="text-xs text-slate-200">Gestión de proyectos</span>
          </div>
        </div>

        {/* Bloque: estado de la empresa (solo owner / admin) */}
        {isOwnerOrAdmin && (
          <div className="px-6 py-4 border-b border-slate-800">
            <p className="text-xs uppercase tracking-wide text-slate-300 mb-1">
              Empresa
            </p>
            <p className="text-sm font-semibold truncate mb-2">
              {user.companyName}
            </p>

            {/* 🔹 Botón de estado de la empresa
                Cambia colores según quieras: 
                - bg-emerald-500 / bg-rose-500
                - text-emerald-50 / text-rose-50 */}
            <button
              type="button"
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                user.companyStatus === "activa"
                  ? "bg-emerald-500 text-emerald-50"
                  : "bg-rose-500 text-rose-50"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full mr-2 ${
                  user.companyStatus === "activa"
                    ? "bg-emerald-100"
                    : "bg-rose-100"
                }`}
              />
              {user.companyStatus === "activa" ? "Empresa activa" : "Empresa inactiva"}
            </button>
          </div>
        )}

        {/* Navegación principal del sidebar */}
        {/* 💡 Aquí defines el orden de los ítems y sus iconos.
            Puedes jugar con tamaño, padding y colores (hover, active, etc.). */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* Item: Dashboard (activo por defecto) */}
          <SidebarItem label="Dashboard" active icon={<Home size={18} />} />

          {/* Sección principal */}
          <SidebarItem label="Proyectos" icon={<FolderKanban size={18} />} />
          <SidebarItem label="Equipos" icon={<Wrench size={18} />} />
          <SidebarItem label="Trabajadores" icon={<Users size={18} />} />

          {/* Separador visual */}
          <p className="mt-4 mb-2 text-[11px] uppercase tracking-wide text-slate-400 px-2">
            Administración
          </p>

          {/* Items visibles solo para owner/admin (a nivel lógico más adelante) */}
          <SidebarItem label="Empresa" icon={<Building2 size={18} />} />
          <SidebarItem label="Usuarios del sistema" icon={<UserCog size={18} />} />

          <p className="mt-4 mb-2 text-[11px] uppercase tracking-wide text-slate-400 px-2">
            Cuenta
          </p>

          <SidebarItem label="Mi cuenta" icon={<Settings size={18} />} />
        </nav>

        {/* =============== BOTÓN / TARJETA DE SALIDA (ABAJO) =============== */}
        {/* 💡 Este bloque queda fijo al final del sidebar. */}
        <div className="p-4 border-t border-slate-800">
          <button
            type="button"
            className="w-full inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:opacity-80 transition"
          >
            {/* Aquí podrías poner un icono de logout */}
            <LogOut size={16} className="mr-2" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* =============== ZONA PRINCIPAL (HEADER + CONTENIDO) =============== */}
      <div className="flex-1 flex flex-col">
        {/* HEADER SUPERIOR */}
        {/* 💡 Cambia bg-white / shadow-sm si quieres un header más plano o más marcado. */}
        <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200 shadow-sm">
          <div>
            <p className="text-sm text-slate-500">Dashboard</p>
            <h1 className="text-lg font-semibold text-slate-900">
              Bienvenido, {user.name.split(" ")[0]}
            </h1>
          </div>

          {/* Área futura para botones rápidos, notificaciones, etc. */}
          <div className="flex items-center gap-3">
            {/* Placeholder de avatar */}
            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL */}
        {/* 💡 Fondo del contenido: cambia bg-slate-200 si quieres otro gris o blanco puro. */}
        <main className="flex-1 bg-slate-200 px-6 py-6">
          {/* Contenedor central del dashboard */}
          {/* max-w-5xl limita el ancho; puedes quitarlo para usar todo el ancho. */}
          <div className="max-w-5xl mx-auto">
            {/* Tarjeta principal con datos del usuario */}
            {/* 💡 bg-white, shadow-sm, rounded-2xl: aquí juegas con estilo de las tarjetas. */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
              <h2 className="text-base font-semibold text-slate-900 mb-1">
                Información del usuario (MVP)
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Estos valores vendrán del usuario autenticado. Más adelante esta
                zona se reemplazará por tarjetas y gráficos según el rol.
              </p>

              {/* Grid simple para mostrar campos */}
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div>
                  <dt className="text-slate-500">Nombre</dt>
                  <dd className="font-medium text-slate-900">{user.name}</dd>
                </div>

                <div>
                  <dt className="text-slate-500">Email</dt>
                  <dd className="font-medium text-slate-900">{user.email}</dd>
                </div>

                <div>
                  <dt className="text-slate-500">Rol</dt>
                  <dd className="font-medium text-slate-900">
                    {/* Mapeo de los valores internos del rol a etiquetas legibles */}
                    {user.role === "owner" && "Owner"}
                    {user.role === "company_admin" && "Company admin"}
                    {user.role === "site_manager" && "Site manager"}
                    {user.role === "viewer" && "Viewer"}
                  </dd>
                </div>

                <div>
                  <dt className="text-slate-500">Empresa</dt>
                  <dd className="font-medium text-slate-900">
                    {user.companyName}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Bloque placeholder para futuras tarjetas / gráficos */}
            <section className="bg-slate-100 rounded-2xl border border-dashed border-slate-300 p-6">
              <p className="text-sm font-medium text-slate-700 mb-1">
                Contenido futuro del dashboard
              </p>
              <p className="text-sm text-slate-500">
                Aquí más adelante podrás agregar tarjetas, gráficos o resúmenes
                según el rol del usuario (proyectos, equipos, trabajadores,
                etc.). Por ahora solo sirve como placeholder para validar el
                layout.
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Componente pequeño para los items del sidebar.
 * La idea es reutilizarlo y solo cambiar label / icono / estado.
 */
interface SidebarItemProps {
  label: string;
  active?: boolean;
  icon?: ReactNode; // ícono opcional
}

function SidebarItem({ label, active = false, icon }: SidebarItemProps) {
  return (
    <button
      type="button"
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition
      ${
        active
          ? "bg-slate-800 text-slate-50"
          : "text-slate-300 hover:bg-slate-800 hover:text-white"
      }`}
    >
      {/* Ícono a la izquierda (si existe) */}
      {icon && <span className="flex-shrink-0">{icon}</span>}

      {/* Texto */}
      <span className="truncate">{label}</span>
    </button>
  );
}
