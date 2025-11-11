import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // 👈 habilita el modo oscuro por clase ("dark")
  content: [
    "./src/**/*.{js,ts,jsx,tsx}", // 👈 asegura que Tailwind escanee toda tu app
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"], // 👈 fuente global
      },
      colors: {
        brand: {
          50: "#f1f5f9",
          100: "#e2e8f0",
          500: "#334155",   // gris azulado intermedio
          700: "#1e293b",   // oscuro (fondo branding)
          900: "#0f172a",   // más oscuro
        },
      },
    },
  },
  plugins: [],
};

export default config;
