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
  failed: "Error en auditoría",
};

const DOT_STYLES: Record<AuditStatus, string> = {
  pending: "bg-slate-400 animate-pulse",
  approved: "bg-emerald-500",
  rejected: "bg-amber-500",
  failed: "bg-rose-500",
};

const BADGE_STYLES: Record<AuditStatus, string> = {
  pending: "border-slate-200 bg-slate-50 text-slate-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-amber-200 bg-amber-50 text-amber-800",
  failed: "border-rose-200 bg-rose-50 text-rose-800",
};

export function AuditStatusBadge({ status, message }: Props) {
  return (
    <div className={`inline-flex flex-col gap-1 rounded-lg border px-3 py-2 ${BADGE_STYLES[status]}`}>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${DOT_STYLES[status]}`} />
        <span className="text-sm font-semibold">{LABELS[status]}</span>
      </div>
      {message && (
        <span className="pl-4 text-xs opacity-75">{message}</span>
      )}
    </div>
  );
}
