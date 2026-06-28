"""FastAPI application entry point.

Responsibilities:
- Create the `FastAPI` instance.
- Install CORS middleware restricted to the configured origins (no wildcard).
- Register routers.
- Create database tables on startup via lifespan.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import create_db_and_tables
from app.routers import simulate as simulate_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(title="CreditSim API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(simulate_router.router)


@app.get("/healthz")
def healthz() -> dict[str, bool]:
    return {"ok": True}
