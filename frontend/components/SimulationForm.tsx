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

  // 2) Persist inputs to localStorage on each change — but only after hydration,
  // otherwise we'd overwrite saved data with the empty initial state.
  useEffect(() => {
    if (!loaded) return;
    saveForm(form);
  }, [form, loaded]);

  // 3) Invalidate the result whenever the user changes `monto`. The previous
  // table must disappear immediately so the user is forced to recalculate.
  useEffect(() => {
    setResult(null);
  }, [form.monto]);

  // 4) Polling: while result.audit_status === "pending", refresh every 1.5s,
  // up to 5 attempts. Cancel on unmount or when the status moves on.
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
              ? {
                  ...prev,
                  audit_status: status.audit_status,
                  audit_message: status.audit_message,
                }
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
    <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">CreditSim</h1>
        <p className="text-sm text-slate-600">
          Simulador de créditos con tabla de amortización (Sistema Francés).
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            label="Monto"
            id="monto"
            value={form.monto}
            error={errors.monto}
            onChange={(v) => handleChange("monto", v)}
            placeholder="10000"
          />
          <FormField
            label="Tasa anual (%)"
            id="tasa_anual"
            value={form.tasa_anual}
            error={errors.tasa_anual}
            onChange={(v) => handleChange("tasa_anual", v)}
            placeholder="20"
          />
          <FormField
            label="Plazo (meses)"
            id="plazo_meses"
            value={form.plazo_meses}
            error={errors.plazo_meses}
            onChange={(v) => handleChange("plazo_meses", v)}
            placeholder="12"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? "Calculando…" : "Calcular"}
        </button>
        {submitError && <p className="text-sm text-rose-700">{submitError}</p>}
      </form>

      {result && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-700">
              <div>
                Cuota mensual:{" "}
                <span className="font-mono font-semibold">{result.cuota_mensual}</span>
              </div>
              <div>
                Total a pagar:{" "}
                <span className="font-mono">{result.total_pagado}</span>
              </div>
              <div>
                Total intereses:{" "}
                <span className="font-mono">{result.total_intereses}</span>
              </div>
            </div>
            <AuditStatusBadge
              status={result.audit_status}
              message={result.audit_message}
            />
          </div>

          <AmortizationTable rows={result.tabla} />
        </section>
      )}
    </div>
  );
}

interface FormFieldProps {
  label: string;
  id: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function FormField({ label, id, value, error, onChange, placeholder }: FormFieldProps) {
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="number"
        inputMode="decimal"
        step="any"
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        placeholder={placeholder}
        className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      />
      {error && <span className="mt-1 text-xs text-rose-700">{error}</span>}
    </div>
  );
}
