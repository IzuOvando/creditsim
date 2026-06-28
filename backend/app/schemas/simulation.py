"""Pydantic schemas for request/response DTOs.

Separate from the SQLModel `Simulation` because the API contract is not
identical to the storage shape (the response includes the derived `tabla`
which is never persisted).
"""

from decimal import Decimal

from pydantic import BaseModel, Field


class SimulationRequest(BaseModel):
    monto: Decimal = Field(gt=0, le=Decimal("100000000"))
    tasa_anual: Decimal = Field(ge=0, le=Decimal("100"))
    plazo_meses: int = Field(ge=1, le=360)


class AmortizationRowSchema(BaseModel):
    mes: int
    cuota: Decimal
    interes: Decimal
    capital: Decimal
    saldo: Decimal


class SimulationResponse(BaseModel):
    id: int
    monto: Decimal
    tasa_anual: Decimal
    plazo_meses: int
    cuota_mensual: Decimal
    total_intereses: Decimal
    total_pagado: Decimal
    tabla: list[AmortizationRowSchema]
    audit_status: str
    audit_message: str | None = None


class SimulationStatusResponse(BaseModel):
    id: int
    audit_status: str
    audit_message: str | None = None
    audited_at: str | None = None
