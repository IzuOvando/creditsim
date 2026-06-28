import type { FormValues } from "@/types/simulation";

export const STORAGE_KEY = "creditsim:form";

export function loadForm(): FormValues | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FormValues>;
    if (
      typeof parsed.monto !== "string" ||
      typeof parsed.tasa_anual !== "string" ||
      typeof parsed.plazo_meses !== "string"
    ) {
      return null;
    }
    return {
      monto: parsed.monto,
      tasa_anual: parsed.tasa_anual,
      plazo_meses: parsed.plazo_meses,
    };
  } catch {
    return null;
  }
}

export function saveForm(form: FormValues): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
}
