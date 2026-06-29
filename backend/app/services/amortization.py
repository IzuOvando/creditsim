"""Pure French amortization calculator.

Deterministic, no side effects. Lives in `services/` so it can be tested
without standing up FastAPI or a database. Money flows entirely through
`Decimal` — `float` would accumulate binary rounding errors.
"""

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal


@dataclass(frozen=True)
class AmortizationRow:
    mes: int
    cuota: Decimal
    interes: Decimal
    capital: Decimal
    saldo: Decimal


@dataclass(frozen=True)
class AmortizationResult:
    cuota_mensual: Decimal
    total_intereses: Decimal
    total_pagado: Decimal
    tabla: list[AmortizationRow]


_CENT = Decimal("0.01")


def _round(value: Decimal) -> Decimal:
    return value.quantize(_CENT, rounding=ROUND_HALF_UP)


def calcular_frances(
    monto: Decimal,
    tasa_anual_pct: Decimal,
    plazo_meses: int,
) -> AmortizationResult:
    """Compute French-system amortization schedule.

    Args:
        monto: Principal (positive Decimal, currency units).
        tasa_anual_pct: Nominal annual rate as a percentage (e.g. 20 = 20%).
        plazo_meses: Number of monthly installments (positive integer).

    Returns:
        AmortizationResult with constant monthly cuota plus row-by-row table.
        The final row's `saldo` is adjusted to exactly zero so the schedule
        reconciles to the cent.
    """
    if plazo_meses <= 0:
        raise ValueError("plazo_meses must be > 0")
    if monto <= 0:
        raise ValueError("monto must be > 0")
    if tasa_anual_pct < 0:
        raise ValueError("tasa_anual_pct must be >= 0")

    n = plazo_meses
    i = (tasa_anual_pct / Decimal("100")) / Decimal("12")

    if i == 0:
        cuota = _round(monto / Decimal(n))
    else:
        factor = (Decimal("1") + i) ** n
        cuota = _round(monto * (i * factor) / (factor - Decimal("1")))

    tabla: list[AmortizationRow] = []
    saldo = monto
    total_intereses = Decimal("0")

    for mes in range(1, n + 1):
        interes = _round(saldo * i)
        capital = _round(cuota - interes)
        new_saldo = _round(saldo - capital)

        if mes == n:
            # Ajuste de centavos en la última fila para cerrar el saldo en 0.
            # La cuota de esta fila es interes + capital ajustado (puede diferir
            # de la cuota fija por centavos de redondeo) — así la suma de la
            # columna cuota == monto + total_intereses al centavo.
            capital = _round(capital + new_saldo)
            cuota_fila = interes + capital
            new_saldo = Decimal("0.00")
        else:
            cuota_fila = cuota

        total_intereses += interes
        tabla.append(
            AmortizationRow(
                mes=mes,
                cuota=cuota_fila,
                interes=interes,
                capital=capital,
                saldo=new_saldo,
            )
        )
        saldo = new_saldo

    total_pagado = sum((row.cuota for row in tabla), start=Decimal("0"))

    return AmortizationResult(
        cuota_mensual=cuota,
        total_intereses=total_intereses,
        total_pagado=total_pagado,
        tabla=tabla,
    )
