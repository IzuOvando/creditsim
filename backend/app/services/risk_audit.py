"""Mock of an external risk-scoring service.

This stands in for what would be an HTTP call to a real scoring provider
(credit bureau, internal ML model). For the challenge it:

- Sleeps 2-5 seconds (simulated latency).
- Raises an exception 10% of the time (simulated outage).
- Otherwise approves/rejects randomly.

All exceptions are caught so the row always reaches a terminal state; a
silently-failing background task would otherwise leave it as `pending`
forever.

A fresh SQLModel `Session` is opened here because the request-scoped one
is already closed by the time FastAPI runs the background task.
"""

import asyncio
import random
from datetime import datetime, timezone

from sqlmodel import Session

from app.core.database import engine
from app.models.simulation import AuditStatus, Simulation

_FAILURE_RATE = 0.10
_APPROVAL_RATE_GIVEN_NO_FAILURE = 0.70


async def run_risk_audit(sim_id: int) -> None:
    await asyncio.sleep(random.uniform(2.0, 5.0))

    try:
        if random.random() < _FAILURE_RATE:
            raise RuntimeError("Scoring service unavailable")
        approved = random.random() < _APPROVAL_RATE_GIVEN_NO_FAILURE
        status = AuditStatus.APPROVED if approved else AuditStatus.REJECTED
        message = None if approved else "Score por debajo del umbral"
    except Exception as exc:  # noqa: BLE001
        status = AuditStatus.FAILED
        message = str(exc)

    with Session(engine) as session:
        sim = session.get(Simulation, sim_id)
        if sim is None:
            return
        sim.audit_status = status
        sim.audit_message = message
        sim.audited_at = datetime.now(timezone.utc)
        session.add(sim)
        session.commit()
