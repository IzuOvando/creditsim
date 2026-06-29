# CreditSim

Simulador de créditos con tabla de amortización (Sistema Francés) y auditoría de riesgo asíncrona.

- **Demo en vivo**: https://creditsim.vercel.app
- **API docs (Swagger)**: https://creditsim-backend-xmvz.onrender.com/docs
- **Diseño técnico**: [docs/specs/2026-06-26-creditsim-design.md](docs/specs/2026-06-26-creditsim-design.md)
- **Guía de decisiones**: [docs/study/decisiones-explicadas.md](docs/study/decisiones-explicadas.md)

---

## Stack

| Capa | Tecnología |
|---|---|
| Backend | FastAPI + SQLModel + SQLite |
| Background | FastAPI BackgroundTasks (mock scoring) |
| Frontend | Next.js 16 (App Router) + Tailwind CSS |
| Deploy backend | Render (free tier) |
| Deploy frontend | Vercel |

## Arquitectura en 30 segundos

```
[Usuario] → [Next.js] ──POST /simulate──→ [FastAPI]
                                              ├─ calcular_frances()  (<50ms, pura)
                                              ├─ INSERT simulation   (status=pending)
                                              ├─ respuesta al usuario (<200ms total)
                                              └─ background: run_risk_audit()
                                                    └─ 1-3s después: UPDATE status

[Usuario] ←── polling GET /simulations/{id} cada 1.5s ───── [FastAPI]
```

### Decisiones clave

- **Tabla no persistida**: la amortización es derivable, se recalcula on-demand. No duplicamos datos.
- **BackgroundTasks**: la respuesta sale en <200ms; el scoring corre después sin bloquear.
- **SQLModel**: una clase unifica la tabla de BD y la validación Pydantic — sin duplicar código.
- **Decimal**: todo dinero usa `Decimal` (nunca `float`) para cumplir precisión financiera.
- **App Router + `"use client"` selectivo**: solo los componentes con estado son Client Components.
- **localStorage con flag `loaded`**: hidratación sin sobrescribir datos guardados en el primer render.

---

## Cómo correr localmente

### Backend

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
# → http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
# → http://localhost:3000
```

### Tests

```bash
cd backend
pytest -v
# → 3 passed
```

---

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/simulate` | Calcula tabla, persiste simulación, dispara auditoría |
| `GET` | `/simulations/{id}` | Estado actual de la auditoría (polling) |
| `GET` | `/healthz` | Health check para Render |
| `GET` | `/docs` | Swagger UI |

**Request de ejemplo:**

```json
POST /simulate
{
  "monto": 10000,
  "tasa_anual": 20,
  "plazo_meses": 12
}
```

**Response:**
```json
{
  "id": 1,
  "cuota_mensual": "926.35",
  "total_pagado": "11116.20",
  "total_intereses": "1116.14",
  "tabla": [{ "mes": 1, "cuota": "926.35", "interes": "166.67", "capital": "759.68", "saldo": "9240.32" }, "..."],
  "audit_status": "pending"
}
```

---

## Decisiones de scope (qué dejé fuera y por qué)

- **Tests de frontend**: prioricé donde un bug duele más — el cálculo financiero en backend.
- **Auth**: el reto no la pide.
- **Postgres**: SQLite alcanza para el scope; migrar es cambiar una URL gracias a SQLModel.
- **Zod + react-hook-form**: para 3 campos, `useState` + función `validate()` plana es más legible y defendible.
- **Celery/Redis**: el PDF pide mock. En producción real, cola persistente con reintentos.

## Qué mejoraría en producción

- Cola persistente (Celery + Redis o SQS) para auditorías que sobrevivan reinicios.
- Postgres + Alembic para migraciones versionadas.
- Scoring real: integración con buró de crédito, modelo ML interno, variables del solicitante.
- Sentry para errores de frontend, logs estructurados en backend.
- E2E con Playwright para el flujo crítico completo.

---

## Estructura del proyecto

```
creditsim/
├── backend/
│   ├── app/
│   │   ├── core/         # config (Pydantic Settings), database engine
│   │   ├── models/       # SQLModel — tabla BD
│   │   ├── schemas/      # Pydantic — DTOs HTTP
│   │   ├── routers/      # endpoints HTTP
│   │   ├── services/     # lógica pura (amortización, auditoría mock)
│   │   └── main.py       # FastAPI app + CORS + lifespan
│   └── tests/            # pytest — 3 tests unitarios
├── frontend/
│   ├── app/              # rutas (Next.js App Router)
│   ├── components/       # SimulationForm, AmortizationTable, AuditStatusBadge
│   ├── lib/              # api.ts, storage.ts, validate.ts
│   └── types/            # interfaces TypeScript
└── docs/
    ├── specs/            # diseño formal del sistema
    ├── study/            # guía didáctica para defender el proyecto
    └── superpowers/      # plan de implementación
```

---

> Reto técnico para Creditaria · Junio 2026
