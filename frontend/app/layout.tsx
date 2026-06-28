import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CreditSim — Simulador de Créditos",
  description: "Calculá tu tabla de amortización al instante.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
