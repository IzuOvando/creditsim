"use client";

import { useEffect, useRef, useState } from "react";

import { AmortizationTable } from "@/components/AmortizationTable";
import { AuditStatusBadge } from "@/components/AuditStatusBadge";
import { getSimulationStatus, postSimulate } from "@/lib/api";
import { loadForm, saveForm } from "@/lib/storage";
import { validate } from "@/lib/validate";
import type { FormValues, SimulationResponse } from "@/types/simulation";

const EMPTY_FORM: FormValues = { monto: "", tasa_anual: "", plazo_meses: "" };
const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 5;

function fmtCurrency(value: string): string {
  const n = Number(value);
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function SimulationForm() {
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1) Hydrate inputs from localStorage on mount.
  useEffect(() => {
    const saved = loadForm();
    if (saved) setForm(saved);
    setLoaded(true);
  }, []);

  // 2) Persist inputs to localStorage on each change — only after hydration.
  useEffect(() => {
    if (!loaded) return;
    saveForm(form);
  }, [form, loaded]);

  // 3) Invalidate the result whenever the user changes `monto`.
  useEffect(() => {
    setResult(null);
  }, [form.monto]);

  // 4) Polling while audit_status === "pending".
  useEffect(() => {
    if (!result || result.audit_status !== "pending") return;

    let attempts = 0;
    pollTimer.current = setInterval(async () => {
      attempts += 1;
      try {
        const status = await getSimulationStatus(result.id);
        if (status.audit_status !== "pending" || attempts >= MAX_POLL_ATTEMPTS) {
          if (pollTimer.current) clearInterval(pollTimer.current);
          pollTimer.current = null;
          setResult((prev) =>
            prev
              ? { ...prev, audit_status: status.audit_status, audit_message: status.audit_message }
              : prev
          );
        }
      } catch {
        if (pollTimer.current) clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      pollTimer.current = null;
    };
  }, [result?.id, result?.audit_status]);

  function handleChange(field: keyof FormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setSubmitError(null);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const res = await postSimulate({
        monto: Number(form.monto),
        tasa_anual: Number(form.tasa_anual),
        plazo_meses: Number(form.plazo_meses),
      });
      setResult(res);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6">

      {/* ── Form card ── */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-slate-900 tracking-tight">
          Parámetros del crédito
        </h2>
        <p className="mb-5 text-sm text-slate-500">
          Ingresá el monto, la tasa nominal anual y el plazo para calcular tu tabla.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              label="Monto principal"
              hint="MXN"
              id="monto"
              value={form.monto}
              error={errors.monto}
              onChange={(v) => handleChange("monto", v)}
              placeholder="10 000"
            />
            <FormField
              label="Tasa nominal anual"
              hint="%"
              id="tasa_anual"
              value={form.tasa_anual}
              error={errors.tasa_anual}
              onChange={(v) => handleChange("tasa_anual", v)}
              placeholder="20"
            />
            <FormField
              label="Plazo"
              hint="meses"
              id="plazo_meses"
              value={form.plazo_meses}
              error={errors.plazo_meses}
              onChange={(v) => handleChange("plazo_meses", v)}
              placeholder="12"
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <>
                  <Spinner />
                  Calculando…
                </>
              ) : (
                "Calcular tabla"
              )}
            </button>
            {submitError && (
              <p className="text-sm text-rose-600">{submitError}</p>
            )}
          </div>
        </form>
      </section>

      {/* ── Results ── */}
      {result && (
        <section className="space-y-4">
          {/* Stat cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Cuota mensual"
              value={`$ ${fmtCurrency(result.cuota_mensual)}`}
              accent
            />
            <StatCard
              label="Total a pagar"
              value={`$ ${fmtCurrency(result.total_pagado)}`}
            />
            <StatCard
              label="Total intereses"
              value={`$ ${fmtCurrency(result.total_intereses)}`}
              sub={`${result.plazo_meses} cuotas`}
            />
          </div>

          {/* Audit badge */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <span className="text-sm font-medium text-slate-700">
              Auditoría de riesgo
            </span>
            <AuditStatusBadge
              status={result.audit_status}
              message={result.audit_message}
            />
          </div>

          {/* Table */}
          <AmortizationTable rows={result.tabla} />
        </section>
      )}
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────── */

interface FormFieldProps {
  label: string;
  hint?: string;
  id: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function FormField({ label, hint, id, value, error, onChange, placeholder }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      <input
        id={id}
        name={id}
        type="number"
        inputMode="decimal"
        step="any"
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        placeholder={placeholder}
        style={{ color: "#0f172a" }}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      />
      {error && (
        <span className="text-xs text-rose-600">{error}</span>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}

function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        accent
          ? "border-indigo-200 bg-indigo-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-1 font-mono text-xl font-bold tabular-nums ${
          accent ? "text-indigo-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
