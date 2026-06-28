"""SQLModel definition of the `simulations` table and audit status enum."""

from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum

from sqlmodel import Field, SQLModel


class AuditStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    FAILED = "failed"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Simulation(SQLModel, table=True):
    __tablename__ = "simulations"

    id: int | None = Field(default=None, primary_key=True)
    monto: Decimal = Field(max_digits=15, decimal_places=2)
    tasa_anual: Decimal = Field(max_digits=7, decimal_places=4)
    plazo_meses: int
    cuota_mensual: Decimal = Field(max_digits=15, decimal_places=2)
    total_intereses: Decimal = Field(max_digits=15, decimal_places=2)
    total_pagado: Decimal = Field(max_digits=15, decimal_places=2)
    audit_status: AuditStatus = Field(default=AuditStatus.PENDING)
    audit_message: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=_utcnow)
    audited_at: datetime | None = Field(default=None)
