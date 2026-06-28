export interface FormValues {
  monto: string;
  tasa_anual: string;
  plazo_meses: string;
}

export interface AmortizationRow {
  mes: number;
  cuota: string;
  interes: string;
  capital: string;
  saldo: string;
}

export type AuditStatus = "pending" | "approved" | "rejected" | "failed";

export interface SimulationResponse {
  id: number;
  monto: string;
  tasa_anual: string;
  plazo_meses: number;
  cuota_mensual: string;
  total_intereses: string;
  total_pagado: string;
  tabla: AmortizationRow[];
  audit_status: AuditStatus;
  audit_message: string | null;
}

export interface SimulationStatusResponse {
  id: number;
  audit_status: AuditStatus;
  audit_message: string | null;
  audited_at: string | null;
}
