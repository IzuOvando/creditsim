import type { FormValues } from "@/types/simulation";

export function validate(values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  const monto = Number(values.monto);
  if (values.monto === "" || !Number.isFinite(monto) || monto <= 0) {
    errors.monto = "El monto debe ser mayor a 0.";
  } else if (monto > 100_000_000) {
    errors.monto = "El monto máximo es 100.000.000.";
  }

  const tasa = Number(values.tasa_anual);
  if (values.tasa_anual === "" || !Number.isFinite(tasa) || tasa < 0) {
    errors.tasa_anual = "La tasa debe ser un número mayor o igual a 0.";
  } else if (tasa > 100) {
    errors.tasa_anual = "La tasa máxima es 100%.";
  }

  const plazo = Number(values.plazo_meses);
  if (values.plazo_meses === "" || !Number.isInteger(plazo) || plazo < 1) {
    errors.plazo_meses = "El plazo mínimo es 1 mes.";
  } else if (plazo > 360) {
    errors.plazo_meses = "El plazo máximo es 360 meses.";
  }

  return errors;
}
