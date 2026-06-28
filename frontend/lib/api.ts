import type {
  SimulationResponse,
  SimulationStatusResponse,
} from "@/types/simulation";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is required. Set it in .env.local for local dev, or in the Vercel dashboard for production."
  );
}

export async function postSimulate(payload: {
  monto: number;
  tasa_anual: number;
  plazo_meses: number;
}): Promise<SimulationResponse> {
  const res = await fetch(`${API_URL}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`POST /simulate failed: ${res.status}`);
  }
  return (await res.json()) as SimulationResponse;
}

export async function getSimulationStatus(
  id: number
): Promise<SimulationStatusResponse> {
  const res = await fetch(`${API_URL}/simulations/${id}`);
  if (!res.ok) {
    throw new Error(`GET /simulations/${id} failed: ${res.status}`);
  }
  return (await res.json()) as SimulationStatusResponse;
}
