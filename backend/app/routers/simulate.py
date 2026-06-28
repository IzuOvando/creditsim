"""HTTP routes for simulation creation and audit status polling.

The router is intentionally thin: it orchestrates services (calculate, persist,
schedule audit) and shapes the response. Business logic lives in `services/`.
"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlmodel import Session

from app.core.database import get_session
from app.models.simulation import AuditStatus, Simulation
from app.schemas.simulation import (
    AmortizationRowSchema,
    SimulationRequest,
    SimulationResponse,
    SimulationStatusResponse,
)
from app.services.amortization import calcular_frances
from app.services.risk_audit import run_risk_audit

router = APIRouter()


@router.post("/simulate", response_model=SimulationResponse)
def simulate(
    req: SimulationRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
) -> SimulationResponse:
    result = calcular_frances(req.monto, req.tasa_anual, req.plazo_meses)

    sim = Simulation(
        monto=req.monto,
        tasa_anual=req.tasa_anual,
        plazo_meses=req.plazo_meses,
        cuota_mensual=result.cuota_mensual,
        total_intereses=result.total_intereses,
        total_pagado=result.total_pagado,
        audit_status=AuditStatus.PENDING,
    )
    session.add(sim)
    session.commit()
    session.refresh(sim)

    # Schedule the audit AFTER commit so the row is guaranteed to exist
    # by the time the background task queries it.
    background_tasks.add_task(run_risk_audit, sim.id)

    return SimulationResponse(
        id=sim.id,
        monto=sim.monto,
        tasa_anual=sim.tasa_anual,
        plazo_meses=sim.plazo_meses,
        cuota_mensual=sim.cuota_mensual,
        total_intereses=sim.total_intereses,
        total_pagado=sim.total_pagado,
        tabla=[
            AmortizationRowSchema(
                mes=row.mes,
                cuota=row.cuota,
                interes=row.interes,
                capital=row.capital,
                saldo=row.saldo,
            )
            for row in result.tabla
        ],
        audit_status=sim.audit_status.value,
        audit_message=sim.audit_message,
    )


@router.get("/simulations/{sim_id}", response_model=SimulationStatusResponse)
def get_simulation_status(
    sim_id: int,
    session: Session = Depends(get_session),
) -> SimulationStatusResponse:
    sim = session.get(Simulation, sim_id)
    if sim is None:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return SimulationStatusResponse(
        id=sim.id,
        audit_status=sim.audit_status.value,
        audit_message=sim.audit_message,
        audited_at=sim.audited_at.isoformat() if sim.audited_at else None,
    )
