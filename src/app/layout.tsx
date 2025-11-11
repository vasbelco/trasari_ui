import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// src/app/layout.tsx

import "./globals.css";

// 1) Importa Inter desde next/font/google (descarga y auto-optimiza)
import { Inter } from "next/font/google";

// 2) Inicializa la fuente con los pesos que usarás
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata = {
  title: "Vasbel",
  description: "App",
};

// 3) Aplica la clase de la fuente al <html> (o al <body>)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
