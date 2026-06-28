import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

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
    <html lang="es" className={inter.variable}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <nav className="border-b border-slate-200 bg-white shadow-sm">
          <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-white font-bold text-sm select-none">
              CS
            </div>
            <div>
              <span className="font-semibold text-slate-900 tracking-tight">CreditSim</span>
              <span className="ml-2 text-xs text-slate-500 hidden sm:inline">
                Simulador de crédito — Sistema Francés
              </span>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
