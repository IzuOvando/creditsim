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

export function AmortizationTable({ rows }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Mes</th>
            <th className="px-3 py-2 text-right font-semibold">Cuota</th>
            <th className="px-3 py-2 text-right font-semibold">Interés</th>
            <th className="px-3 py-2 text-right font-semibold">Capital</th>
            <th className="px-3 py-2 text-right font-semibold">Saldo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.mes} className="hover:bg-slate-50">
              <td className="px-3 py-2">{row.mes}</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(row.cuota)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(row.interes)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(row.capital)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(row.saldo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
