"use client";

import type { AuditStatus } from "@/types/simulation";

interface Props {
  status: AuditStatus;
  message: string | null;
}

const LABELS: Record<AuditStatus, string> = {
  pending: "Auditoría en curso…",
  approved: "Crédito aprobado",
  rejected: "Crédito rechazado",
  failed: "Auditoría falló",
};

const STYLES: Record<AuditStatus, string> = {
  pending: "bg-slate-100 text-slate-700 border-slate-300",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-300",
  rejected: "bg-amber-100 text-amber-800 border-amber-300",
  failed: "bg-rose-100 text-rose-800 border-rose-300",
};

export function AuditStatusBadge({ status, message }: Props) {
  return (
    <div className={`inline-flex flex-col gap-1 rounded-md border px-3 py-2 ${STYLES[status]}`}>
      <span className="text-sm font-medium">{LABELS[status]}</span>
      {message && <span className="text-xs opacity-80">{message}</span>}
    </div>
  );
}
