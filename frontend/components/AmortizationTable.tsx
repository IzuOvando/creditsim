"use client";

import type { AmortizationRow } from "@/types/simulation";

interface Props {
  rows: AmortizationRow[];
}

function fmt(value: string): string {
  const n = Number(value);
  return n.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function sumCol(rows: AmortizationRow[], col: keyof AmortizationRow): string {
  const total = rows.reduce((acc, r) => acc + Number(r[col]), 0);
  return total.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function AmortizationTable({ rows }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
          Tabla de amortización
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {rows.length} cuotas · Sistema Francés (cuota fija, interés decreciente)
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 text-left">Mes</th>
              <th className="px-4 py-3 text-right">Cuota</th>
              <th className="px-4 py-3 text-right">Interés</th>
              <th className="px-4 py-3 text-right">Capital</th>
              <th className="px-4 py-3 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.mes}
                className={`border-b border-slate-100 transition-colors hover:bg-indigo-50/40 ${
                  i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                }`}
              >
                <td className="px-4 py-2.5 text-slate-500 text-xs font-medium">
                  {row.mes}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-slate-900">
                  {fmt(row.cuota)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-rose-600">
                  {fmt(row.interes)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-emerald-700">
                  {fmt(row.capital)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-slate-700">
                  {fmt(row.saldo)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-slate-100 font-semibold text-slate-900">
              <td className="px-4 py-3 text-xs uppercase tracking-wide text-slate-600">
                Total
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {sumCol(rows, "cuota")}
              </td>
              <td className="px-4 py-3 text-right font-mono text-rose-700">
                {sumCol(rows, "interes")}
              </td>
              <td className="px-4 py-3 text-right font-mono text-emerald-800">
                {sumCol(rows, "capital")}
              </td>
              <td className="px-4 py-3 text-right font-mono text-slate-400">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
