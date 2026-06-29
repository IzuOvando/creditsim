"""Tests for the pure French amortization function.

Three tests on purpose: a typical scenario, an edge case (zero rate), and
an invariant (final balance equals zero). Together they cover the math
that matters in production.
"""

from decimal import Decimal

import pytest

from app.services.amortization import calcular_frances


def test_caso_tipico_10k_20pct_12m():
    """For 10_000 at 20% TNA over 12 months, monthly payment is 926.35."""
    result = calcular_frances(Decimal("10000"), Decimal("20"), 12)

    assert result.cuota_mensual == Decimal("926.35")
    assert len(result.tabla) == 12
    assert result.tabla[0].mes == 1
    assert result.tabla[-1].mes == 12


def test_consistencia_total_pagado():
    """Invariant: total_pagado == monto + total_intereses (to the cent)."""
    monto = Decimal("10000")
    result = calcular_frances(monto, Decimal("20"), 12)
    assert result.total_pagado == monto + result.total_intereses


def test_tasa_cero():
    """Zero interest rate: monthly payment equals principal / months, zero interest."""
    result = calcular_frances(Decimal("12000"), Decimal("0"), 12)

    assert result.cuota_mensual == Decimal("1000.00")
    assert result.total_intereses == Decimal("0.00")
    for row in result.tabla:
        assert row.interes == Decimal("0.00")


def test_saldo_final_es_cero():
    """Invariant: the last row's saldo is exactly zero (rounding adjusted)."""
    result = calcular_frances(Decimal("15000"), Decimal("18.5"), 24)
    assert result.tabla[-1].saldo == Decimal("0.00")
