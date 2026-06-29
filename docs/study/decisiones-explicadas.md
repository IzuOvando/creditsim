# CreditSim — Guía de Estudio para el Panel Técnico

> Documento didáctico, no formal. Pensado para que repases antes del panel
> y entiendas el **por qué** de cada decisión, no solo el **qué**. Si te
> sentás en la entrevista con esto leído y razonado, podés defender el
> proyecto sin improvisar.

---

## Tabla de contenidos

1. [Entendimiento del negocio crediticio](#1-entendimiento-del-negocio-crediticio)
2. [Decisiones técnicas, una por una](#2-decisiones-técnicas-una-por-una)
3. [Conceptos transversales](#3-conceptos-transversales)
4. [Gotchas técnicos defendibles](#4-gotchas-técnicos-defendibles)
5. [Narrativa de los 10 minutos del panel](#5-narrativa-de-los-10-minutos-del-panel)
6. [Glosario rápido](#6-glosario-rápido)

---

## 1. Entendimiento del negocio crediticio

> Esta sección es para que entres a la entrevista con vocabulario de
> dominio. No es solo para "el panel" — es para que como tech lead puedas
> sentarte con un product owner de Creditaria y aportar.

### 1.1 ¿Qué es un crédito? (modelo mental básico)

Un **crédito** es un acuerdo donde el **acreedor** (banco, fintech) le presta
dinero al **deudor** (cliente). El deudor se compromete a devolverlo en
cuotas a lo largo de un **plazo**, pagando además **intereses** como
compensación por el uso del dinero y por el **riesgo** que asume el
acreedor.

Tres variables fundamentales:

| Término | Qué es | En CreditSim |
|---|---|---|
| **Capital / Principal / Monto** | La plata prestada | `monto` |
| **Tasa de interés** | Costo del dinero, expresado como % | `tasa_anual` (en %) |
| **Plazo** | Tiempo para devolver | `plazo_meses` |

Con esas 3 variables, **toda la matemática del crédito está determinada**.
Por eso en la BD guardamos solo eso + el resumen — la tabla mes a mes es
derivable.

### 1.2 ¿Qué es "amortizar"?

**Amortizar** un crédito = ir pagando el capital prestado a lo largo del
plazo. Cada cuota mensual tiene **dos componentes**:

- **Interés del mes**: lo que cobra el banco por haberte prestado durante
  ese mes. Se calcula sobre el **saldo pendiente** (no sobre el monto
  original).
- **Capital del mes** (o "amortización pura"): la parte de la cuota que
  efectivamente baja tu deuda.

```
Cuota = Interés + Capital
```

A medida que pagás capital, el saldo baja → el interés del mes siguiente
es menor → si la cuota total es constante, más plata va a capital. Por
eso al principio "pagás más intereses" y al final "pagás más capital".

### 1.3 Sistema Francés vs Alemán vs Americano

Hay distintas formas de armar la **tabla de amortización**:

| Sistema | Cómo funciona | Cuándo se usa | Pro / Con |
|---|---|---|---|
| **Francés** | **Cuota constante** todos los meses | El más común en hipotecas y créditos personales | Pro: cuota previsible para el cliente. Con: al principio amortizás poco capital. |
| **Alemán** | **Capital constante** todos los meses. La cuota baja con el tiempo. | Créditos comerciales, algunos productivos | Pro: pagás menos intereses totales. Con: cuotas iniciales altas. |
| **Americano** | Solo intereses cada mes, y **todo el capital al final** | Bonos, créditos puente, inversores | Pro: cuotas mensuales bajísimas. Con: hay que tener el capital completo al final ("bullet payment"). |

**El PDF pide Francés** — el más común porque la previsibilidad de la
cuota es lo que el cliente promedio entiende y quiere.

**Fórmula del Sistema Francés (memorizá esta):**
```
i = tasa_anual / 12 / 100              (tasa mensual en decimal)
cuota = monto * (i * (1+i)^n) / ((1+i)^n - 1)
```
Caso borde: si tasa es 0, la cuota es simplemente `monto / n`.

### 1.4 Tasa nominal anual (TNA) vs tasa efectiva anual (TEA) vs TIN/TAE

Este punto **siempre** confunde y vale oro saberlo.

- **TNA / TIN (Tasa Nominal Anual / Tipo de Interés Nominal)**: la tasa
  "etiqueta" que se publica. Es lo que pone el banco en el cartel: "20%
  anual". **No incluye el efecto de capitalización** (que se cobre cada
  mes y se acumule).

- **TEA / TAE (Tasa Efectiva Anual / Tasa Anual Equivalente)**: la tasa
  real que pagás al cabo del año, incluyendo capitalización mensual.
  Siempre es **mayor** que la TNA cuando hay capitalización.

  ```
  TEA = (1 + TNA/12)^12 - 1
  ```

  Una TNA de 20% capitalizada mensual da una TEA ≈ 21.94%.

- **Tasa mensual**: lo que usamos en la fórmula del Sistema Francés. Si
  el cliente te da TNA, dividís por 12. Si te da TEA, hacés
  `(1+TEA)^(1/12) - 1`.

**En CreditSim** asumimos que `tasa_anual` es TNA (nominal). Dividimos por
12. Es la convención más común para créditos personales y la simplifica
el cliente promedio.

**Pregunta posible del panel:**
> *"¿Y si el negocio quisiera trabajar con TEA en lugar de TNA?"*

Respuesta:
> *"Cambiaría la conversión a tasa mensual en `services/amortization.py`: en lugar de `tasa_anual/12`, usaría `(1+tasa_anual)^(1/12) - 1`. La función pura aísla ese cambio — no impactaría ni router ni BD ni frontend."*

### 1.5 ¿Por qué existe la "Auditoría de Riesgo"?

Esta es la parte más interesante del PDF y la que **conecta tu app con
el negocio real**.

**El problema de negocio**: cuando alguien pide un crédito, el banco no le
presta a ciegas. Tiene que evaluar:
- ¿Es esta persona quien dice ser? (KYC)
- ¿Tiene historial de pagar a tiempo? (buró de crédito)
- ¿Ya está endeudada hasta el cuello? (ratio deuda/ingreso)
- ¿Su perfil socioeconómico encaja? (scoring)

Esto se llama **suscripción** (underwriting) o **evaluación crediticia**.
El resultado es un **score** (un número, ej: 0-1000) que predice la
probabilidad de que la persona pague.

En Creditaria real, esto no lo hacen ellos solos — consultan a:
- **Burós de crédito** (Equifax, Experian, Transunion, DataCrédito según país)
- **Modelos internos de ML** entrenados con datos históricos
- **Reglas de negocio** (mínimo de edad, máximo de DTI, etc.)

Todo eso es un **servicio externo** (microservicio interno o API de
tercero) que **tarda** y a veces **falla** (timeout, servicio caído).

**Por qué la auditoría debe ser asíncrona en CreditSim:**

Si el usuario tiene que esperar 3 segundos para ver su simulación porque
el scoring tarda, **abandona**. Hay un dato bien conocido en fintech:

> Cada 1 segundo adicional de latencia en el formulario inicial reduce
> la conversión ~7%.

Por eso la respuesta sale en <200ms con la **tabla** (que es la
información que el usuario quiere ver para decidir), y el **scoring**
viaja en background. Cuando termina, se actualiza el estado y se le
muestra al usuario "aprobado / rechazado / en revisión".

Esto es **patrón estándar de fintech moderna**. El PDF pide que lo
implementes a escala chiquita.

**Frase para el panel:**
> *"La auditoría asíncrona refleja un patrón real: en fintech, el cálculo de cuotas es matemática local y rápida, pero la evaluación crediticia depende de servicios externos (burós, modelos de ML) que tardan y a veces fallan. Desacoplarlas mejora la conversión y permite manejar fallos del scoring sin romper la experiencia del usuario."*

### 1.6 Glosario de negocio crediticio

| Término | Significado |
|---|---|
| **Capital / Principal** | Monto prestado |
| **Cuota / Mensualidad** | Pago mensual del deudor |
| **Plazo / Term** | Tiempo total del crédito |
| **Tasa nominal (TNA / TIN)** | Tasa anual sin efecto de capitalización |
| **Tasa efectiva (TEA / TAE)** | Tasa anual real, incluyendo capitalización |
| **Amortización** | Pago del capital a lo largo del plazo |
| **Sistema Francés** | Cuotas constantes (el de CreditSim) |
| **Sistema Alemán** | Capital constante, cuotas decrecientes |
| **Mora** | Atraso en el pago de una cuota |
| **Default / Incumplimiento** | Cuando el deudor deja definitivamente de pagar |
| **Scoring** | Modelo que predice probabilidad de default |
| **Buró de crédito** | Entidad que almacena historial crediticio de personas |
| **KYC (Know Your Customer)** | Proceso de verificar identidad del cliente |
| **DTI (Debt-to-Income)** | Ratio deuda/ingreso, métrica de capacidad de pago |
| **Originación** | Proceso completo desde solicitud hasta desembolso |
| **Desembolso** | Momento en que el dinero llega al cliente |
| **Suscripción / Underwriting** | Evaluación crediticia del solicitante |
| **Saldo pendiente** | Capital que falta amortizar en un momento dado |

### 1.7 Cómo lo técnico se conecta con el negocio

| Decisión técnica | Razón de negocio |
|---|---|
| `Decimal` en lugar de `float` | Regulación financiera: la cuota debe coincidir al centavo con el cálculo del regulador. `float` introduce errores acumulados. |
| Tabla NO persistida | Auditoría: lo que importa para riesgo son los **inputs y el veredicto**, no el detalle aritmético. |
| Auditoría asíncrona | Conversión: cada 1s de latencia = ~7% menos solicitudes completadas. |
| 4 estados de auditoría | Trazabilidad: el equipo de riesgo necesita distinguir `failed` (problema técnico) de `rejected` (decisión de negocio). |
| `total_pagado` = suma de cuotas | Consistencia: el resumen en la UI nunca debe contradecir el detalle. |
| Polling, no WebSocket | Simplicidad: el flujo es "una vez por solicitud", no necesita push continuo. |
| Pydantic Settings | Compliance: en fintech, cada variable de entorno auditable. Validación al arranque = falla rápido si falta config. |

---

## 2. Decisiones técnicas, una por una

Para cada decisión: **qué pide el enunciado**, **qué descartamos y por qué**, **qué elegimos y por qué**, y **una frase corta para defender en el panel**.

### 2.1 Modelo de datos: qué guardamos en la tabla `simulations`

**Qué pide el PDF**: "guardar cada simulación en BD con ORM". Ambiguo a propósito.

**Lo que descartamos**:
- Guardar la tabla de amortización completa en una columna JSON → duplicación, fila pesada (360 filas para una hipoteca).
- Crear tabla `amortization_rows` normalizada con FK → JOINs innecesarios, sobre-ingeniería para una sola feature.

**Lo que elegimos**: solo inputs + resumen + audit_status + audit_message + timestamps.

**Por qué**: la tabla mes a mes es **derivable** de los inputs vía función pura determinística. Persistir lo derivable = duplicación + riesgo de inconsistencia.

**Frase para el panel:**
> *"No persistí la tabla porque es derivable. Guardo los 3 inputs y el resumen. Si mañana alguien necesita la tabla histórica de la simulación #42, leo los inputs y llamo `calcular_frances`. Por ser función pura, sale exactamente la misma tabla que vio el usuario."*

---

### 2.2 Estructura de carpetas del backend

**Qué pide el PDF**: "calidad de código, buenas prácticas".

**Lo que descartamos**:
- Todo plano en una sola carpeta → no escala, no comunica criterio.
- Por feature/DDD (vertical slices) → sobre-ingeniería para 1 feature.

**Lo que elegimos**: por capas — `app/{core, models, schemas, routers, services}` + `tests/`.

**Por qué**: cada carpeta responde una pregunta única:
- `models/` → ¿qué se persiste?
- `schemas/` → ¿qué entra y sale por la API?
- `services/` → ¿qué hace el negocio?
- `routers/` → ¿cómo se expone?
- `core/` → ¿cómo arranca?

Patrón canónico de FastAPI, el panel lo lee en 30 segundos.

**Frase para el panel:**
> *"Estructura por capas. Cada carpeta una responsabilidad. Eso me permite testear `services/amortization.py` sin levantar FastAPI ni tocar BD — es función pura."*

---

### 2.3 Cálculo del Sistema Francés: función pura con `Decimal`

**Qué pide el PDF**: tabla de amortización Sistema Francés.

**Lo que descartamos**:
- Función dentro del router → mezcla matemática con HTTP, no testeable aislada.
- Strategy pattern con clase `AmortizationCalculator` → patrón clásico pero overkill para un solo método.
- `float` → errores de precisión inaceptables para dinero.

**Lo que elegimos**: función pura `calcular_frances(monto, tasa_anual, plazo_meses) -> AmortizationResult` en `services/amortization.py`, con `Decimal`.

**Por qué**:
- **Pura** = sin side effects, sin BD, sin HTTP → tests baratos y rápidos.
- **Determinística** = mismos inputs → mismo output → casos de prueba fáciles de escribir y mantener.
- **`Decimal`** = precisión exacta. `0.1 + 0.2 == 0.3` falla con float y es verdad con Decimal. En dinero, ese error se acumula y se nota.

**Frase para el panel:**
> *"Función pura en `services/amortization.py`. Uso `Decimal` porque en cálculos monetarios `float` introduce errores binarios que se acumulan. Es testeable sin infra y la matemática del negocio queda separada del HTTP."*

---

### 2.4 Auditoría de Riesgo en background

**Qué pide el PDF**: mock que tarda 1-3s, falla 10%, respuesta al usuario <200ms, auditoría en segundo plano.

**Lo que descartamos**:
- Esperar la auditoría dentro del request → no cumple SLA, mala UX.
- Celery + Redis → sobre-ingeniería para un mock; el PDF pide una función simulada, no un microservicio real.
- `asyncio.create_task` directo → no garantiza que la response se envíe antes de la tarea, perdés cobertura de errores.

**Lo que elegimos**: `BackgroundTasks` de FastAPI + `asyncio.sleep`. 4 estados: `pending | approved | rejected | failed`. Frontend hace polling cada 1.5s, máximo 5 intentos.

**Por qué**:
- Built-in, sin infra extra.
- FastAPI garantiza que la response se envía **antes** de ejecutar la task.
- 4 estados modelan los 4 desenlaces reales (aprobado, rechazado por negocio, falló por error técnico, pendiente).
- Polling sobre WebSocket: más simple, alcanza para "una respuesta única por solicitud".

**Frase para el panel:**
> *"BackgroundTasks de FastAPI porque es lo que pide el PDF: un mock. En producción real con miles de simulaciones por minuto migraría a Celery + Redis o SQS por persistencia y reintentos — BackgroundTasks vive en el mismo proceso y se pierde si el server reinicia. Pero para mock está perfecto y no agrega infra."*

---

### 2.5 Next.js App Router vs Pages Router

**Qué pide el PDF**: frontend React.

**Lo que descartamos**:
- Pages Router → modo "legacy soportado" en 2026, panel puede preguntar "¿por qué no App Router?".
- Vite + React puro → ya descartado por integración con Vercel.

**Lo que elegimos**: Next.js 16 App Router. State management: `useState` + props (sin Redux/Zustand).

**Por qué**:
- App Router es el modelo recomendado de Next.js desde 2023.
- Deja la puerta abierta a Server Components si después agrego una página `/history`.
- Para 1 form + 1 tabla, `useState` alcanza. Introducir Zustand sería sobre-ingeniería.

**Frase para el panel:**
> *"App Router por ser el estándar actual. En este reto casi todos los componentes son `'use client'` porque la página es totalmente interactiva, pero la estructura me deja la puerta abierta a sumar páginas server-rendered sin reescribir."*

---

### 2.6 Estado "inteligente" en el frontend: localStorage + invalidación

**Qué pide el PDF**: inputs persisten al cerrar pestaña; al cambiar monto, la tabla previa desaparece.

**Lo que descartamos**:
- Guardar form + tabla juntos en localStorage → al volver verías una tabla "stale" tras cambiar el monto. Viola el requisito.
- Custom hook `useLocalStorage` para un solo caso → abstracción prematura.

**Lo que elegimos**: dos estados separados (`form` persistido, `result` efímero), tres `useEffect` (hidratar, persistir, invalidar). Flag `loaded` para evitar pisar localStorage en el primer render.

**Por qué**:
- Separa los dos requisitos del enunciado en código → si los mezclás, ninguno funciona bien.
- La tabla nunca toca localStorage → coherente con el principio "no persistir lo derivable" del backend.

**Frase para el panel:**
> *"Separé el estado en dos: inputs van a localStorage para sobrevivir al cierre de pestaña; la tabla vive solo en `useState`. Un `useEffect` observa el monto y resetea la tabla apenas cambia. Misma filosofía del backend: lo derivable no se guarda."*

---

### 2.7 Validación del formulario: `useState` plano (no Zod + RHF)

**Qué pide el PDF**: nada explícito, pero se asume.

**Lo que descartamos** (pero conocemos):
- `react-hook-form + zod` → potentes, ideales para 10+ campos o validación cruzada. Para 3 campos sería sobre-ingeniería.

**Lo que elegimos**: `useState` + función `validate()` que devuelve un map de errores.

**Por qué**:
- 3 campos → la validación a mano se lee en 10 líneas.
- Cero dependencias extra.
- Más visible para el panel: cualquier dev de React lee y entiende sin pre-requisitos.

**Frase para el panel:**
> *"Validación manual con `useState` por simplicidad — son 3 campos. Conozco react-hook-form + zod y los hubiera elegido con 10+ campos o validación cruzada. La regla es introducir abstracciones cuando duele no tenerlas, no antes."*

#### Bonus: ¿qué son Zod y react-hook-form?

- **Zod**: librería de schemas declarativos. Definís las reglas una vez (`z.object({monto: z.number().positive()})`) y obtenés **validación en runtime + tipo TypeScript** derivado automáticamente del schema. Misma idea que SQLModel/Pydantic en backend: una sola declaración para reglas + tipos.
- **react-hook-form (RHF)**: librería de manejo de formularios. Gestiona estado, validación, errores, `touched`/`dirty`, submit. Súper performante (no re-renderiza todo en cada keystroke). Se integra con Zod vía `@hookform/resolvers/zod`.
- **Cuándo combinarlos**: form de 10+ campos, validación cruzada compleja, querés tipos derivados del schema. **En CreditSim no aplica.**

---

### 2.8 Estrategia de testing: mínima y enfocada

**Qué pide el PDF**: nada explícito, pero "buenas prácticas" lo asume.

**Lo que descartamos**:
- Tests de frontend (Jest, Vitest, Testing Library) → setup costoso, prioricé donde el bug duele.
- Tests E2E (Playwright) → fuera del alcance de 4-6h.
- Tests exhaustivos del endpoint → es orquestación delgada, no aporta tanto.

**Lo que elegimos**: pytest, 2-3 tests sobre la función pura del cálculo. Fixture mínima.

**Por qué**:
- El bug que más duele es uno de **cálculo financiero**.
- Tests de función pura son los más baratos por minuto invertido.
- Mejor pocos tests bien justificados que muchos por compromiso.

**Frase para el panel:**
> *"Tests automatizados solo sobre el cálculo francés: caso típico, caso borde (tasa 0%) e invariante (saldo final cero). Es donde un bug duele más y donde el test cuesta menos. Endpoint y mock los verifiqué manualmente. En productivo agregaría integration tests con TestClient y un E2E con Playwright sobre el flujo crítico."*

---

### 2.9 Configuración: Pydantic Settings (no `os.getenv`)

**Qué pide el PDF**: nada explícito. Despliegue en plataforma externa lo asume.

**Lo que descartamos** (lo que ya conocías):
- `os.getenv()` suelto → sin tipos, sin validación, disperso, sin autocompletado.

**Lo que elegimos**: `BaseSettings` de `pydantic-settings` en `app/core/config.py`.

**Por qué**:
- Validación al arranque: si falta una variable obligatoria, la app no levanta.
- Tipado: `port: int` castea automáticamente; si llega texto, error claro.
- Una sola fuente de verdad: `config.py` muestra TODAS las variables que usa la app.
- Autocompletado en IDE.
- Mismo principio que SQLModel/Pydantic ya usados: una declaración para reglas + tipos.

**Frase para el panel:**
> *"Pydantic Settings en lugar de `os.getenv`. Una sola declaración de configuración con tipos y defaults; si falta una variable obligatoria, la app no levanta. Es la diferencia entre fallar rápido al arranque y fallar a las 3am cuando alguien llama el endpoint."*

---

### 2.10 README y narrativa para el panel

**Qué pide el PDF**: "explicarás tu arquitectura (10 min)".

**Lo que descartamos**: README genérico ("App que calcula. Tecnologías: X, Y. Cómo correr: pip install").

**Lo que elegimos**: README que vende decisiones (sección "Decisiones de scope", sección "Qué mejoraría en producción"), diagrama ASCII del flujo, link a este doc de estudio.

**Por qué**: el README es lo primero que ve el panel. Antes de mirar una línea de código, ya tiene que estar convencido de que pensaste el problema.

---

## 3. Conceptos transversales

### 3.1 ORM (Object-Relational Mapper)

Una BD relacional habla **SQL** (tablas, filas, columnas). Python habla **objetos** (clases, atributos). Un ORM traduce entre ambos.

```python
# Sin ORM (raw SQL)
cursor.execute("INSERT INTO simulations (monto, tasa_anual) VALUES (?, ?)", (10000, 0.20))

# Con ORM
sim = Simulation(monto=10000, tasa_anual=0.20)
session.add(sim); session.commit()
```

**Ventajas**: autocompletado, refactor seguro, queries seguras contra inyección SQL, menos código de plomería.
**Costo**: una capa de abstracción más; a veces conviene SQL crudo para queries complejas.

### 3.2 SQLAlchemy vs Pydantic vs SQLModel

- **SQLAlchemy**: el ORM más usado de Python. Maduro, potente, un poco verboso.
- **Pydantic**: librería de validación y serialización de datos. No tiene nada que ver con BD. Es lo que FastAPI usa para validar requests/responses.
- **SQLModel** (lo que usamos): librería de Sebastián Ramírez (creador de FastAPI). **Une las dos** en una sola clase. Una sola declaración para tabla BD + schema de validación.

```python
class Simulation(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    monto: Decimal
    # ... una sola fuente de verdad
```

Por dentro SQLModel hereda de SQLAlchemy + Pydantic. No los reemplaza, los combina.

**Frase para el panel:**
> *"SQLModel para evitar duplicar el modelo de BD y el schema de validación. Es la capa que une SQLAlchemy y Pydantic — tengo lo mejor de ambos sin sincronizar dos definiciones a mano."*

### 3.3 Función pura y determinismo

- **Función pura**: (1) mismos inputs → mismo output, (2) sin side effects (no escribe en BD, no manda emails, no toca variables globales).
- **Determinística**: mismos inputs → mismo output, sin azar, sin reloj, sin red.
- **Side effect**: cualquier cosa "hacia afuera" además de calcular y devolver.

`calcular_frances` es pura y determinística → tests triviales, sin mocks.

### 3.4 Síncrono vs asíncrono, polling vs push

- **Síncrono**: el cliente espera. "Pedís café y te quedás en la barra."
- **Asíncrono**: cliente recibe "recibido" inmediato y sigue. "Pedís delivery."
- **Polling**: cliente pregunta cada X segundos "¿ya?". Más simple, más tráfico.
- **Push (WebSocket/SSE)**: server avisa al cliente. Más eficiente, más complejo.

CreditSim usa **respuesta sincrónica** (tabla en <200ms) + **background async** (auditoría) + **polling** (estado de auditoría). Combinación práctica y simple.

### 3.5 Rendering en Next.js (CSR, SSR, SSG, ISR, RSC)

| Sigla | Qué es | Cuándo se usa |
|---|---|---|
| **CSR** (Client-Side Rendering) | Server manda HTML vacío + JS bundle. Browser ejecuta JS y dibuja. | SPAs detrás de login (no necesitás SEO). |
| **SSR** (Server-Side Rendering) | Cada request, el server genera HTML y lo manda. Después se hidrata. | Páginas con datos en vivo que necesitan SEO. |
| **SSG** (Static Site Generation) | En el `build`, Next pre-genera HTML. Se sirve desde CDN. | Blogs, landings, docs. |
| **ISR** (Incremental Static Regeneration) | SSG + refresca cada X segundos en background. | E-commerce con miles de productos. |
| **RSC** (React Server Components) | Componentes que se renderizan en el server por componente, no por página. Pueden hacer `await fetch(...)` en su cuerpo. | El modelo nuevo de React; lo que App Router usa por debajo. |

**App Router** no es una sigla — es la **infraestructura** que te deja mezclar todos esos modos por página o por componente.

### 3.6 Server Components vs Client Components

| | Server | Client (`"use client"`) |
|---|---|---|
| Dónde corre | En el server (Node.js de Vercel) | En el browser |
| Llega al bundle del cliente | No | Sí |
| Puede usar `useState`/`useEffect`/eventos | **No** | **Sí** |
| Puede leer BD/files directo | Sí | No |
| Puede acceder a `localStorage` | No | Sí |

**Regla práctica**: marcá `"use client"` si el componente usa hooks de estado, handlers de eventos, o APIs del browser. Si no, dejalo como server.

**Detalle importante**: un Server Component puede importar Client Components, pero NO al revés.

### 3.7 Variables de entorno

**Backend (`.env` + Pydantic Settings)**:
- `.env` local con valores de desarrollo.
- `.env.example` comiteado como plantilla.
- En Render: configurás en el dashboard.
- Pydantic Settings valida al arranque.

**Frontend (`.env.local` + `process.env`)**:
- `NEXT_PUBLIC_` prefix = variable inyectada en el bundle del cliente. **Visible en DevTools**, solo para valores públicos.
- Sin prefijo = solo accesible en código del server.
- En Vercel: configurás en el dashboard.

En CreditSim solo necesitamos `NEXT_PUBLIC_API_URL` en el frontend.

### 3.8 CORS (Cross-Origin Resource Sharing)

Política del browser que bloquea pedidos entre dominios distintos a menos que el server lo permita.

- Frontend en `https://creditsim.vercel.app`
- Backend en `https://creditsim-backend.onrender.com`

Sin CORS configurado en backend → el browser rechaza el fetch.

**Regla**: configurar `allow_origins` con la lista específica de dominios permitidos. **Nunca** `allow_origins=["*"]` en producción.

### 3.9 12-Factor App

Metodología clásica (Heroku, 2011) para apps modernas. El punto que aplicamos: **config en el entorno, no en el código**. Decir "seguí el principio 12-factor" gana puntos en cualquier panel.

---

## 4. Gotchas técnicos defendibles

> Detalles puntuales que el panel valora porque demuestran cuidado.

### 4.1 Atrapar TODAS las excepciones en la background task

**El problema**: si `run_risk_audit` lanza excepción no atrapada, la fila queda con `audit_status="pending"` para siempre.

**La solución**: try/except total que setea `audit_status="failed"` en cualquier error.

**Frase para el panel:**
> *"En la background task atrapo todas las excepciones para garantizar que el estado final siempre se persiste — sea `approved`, `rejected` o `failed`. Si dejara propagar, una fila quedaría como `pending` eterno."*

### 4.2 Nueva session de BD dentro de la background task

**El problema**: la session de la request original ya está cerrada cuando arranca el task.

**La solución**: dentro de `run_risk_audit`, abrir nueva session con `with Session(engine) as session:`.

**Frase para el panel:**
> *"No reuso la session de la request en el background task porque ya está cerrada cuando la tarea arranca. Abro una nueva con context manager dentro de la función."*

### 4.3 Flag `loaded` para evitar pisar localStorage

**El problema**: sin el flag, el primer render del cliente tiene `form` vacío, dispara `useEffect [form]`, escribe vacío en localStorage, y **pierde** los datos del usuario.

**La solución**: bandera `loaded` que solo se activa después de hidratar.

**Frase para el panel:**
> *"Uso una bandera `loaded` para no escribir en localStorage antes de haber leído. Sin eso, el primer render del cliente sobrescribiría los datos guardados con el estado inicial vacío."*

### 4.4 `Decimal` en todo el flujo monetario

**El problema**: `0.1 + 0.2 == 0.30000000000000004` en float. En cálculos de cuotas acumulados, el error se nota.

**La solución**: `Decimal` desde el request (`condecimal` en Pydantic), en BD (`Decimal` en SQLModel), en cálculos, en respuesta.

**Frase para el panel:**
> *"Decimal end-to-end: request, modelo BD, cálculo, response. Para dinero `float` introduce errores binarios que se acumulan. En fintech el regulador exige que tu cálculo coincida al centavo."*

### 4.5 Commit antes de disparar background task

**El problema**: si dispararas el background task antes del `commit`, la fila podría no existir todavía cuando la task la consulte.

**La solución**: orden estricto — `session.add(sim); session.commit(); session.refresh(sim); background_tasks.add_task(run_risk_audit, sim.id)`.

### 4.6 `NEXT_PUBLIC_API_URL` validada al cargar `lib/api.ts`

**El problema**: si la variable falta en Vercel, el primer fetch tira un error confuso ("undefined/simulate").

**La solución**: `if (!API_URL) throw new Error(...)` al inicio del archivo.

**Frase para el panel:**
> *"Verifico `NEXT_PUBLIC_API_URL` al cargar el módulo. Si falta, throw inmediato — falla rápido, igual que Pydantic Settings en el backend."*

### 4.7 Consistencia entre resumen y detalle (`total_pagado`) — bug real corregido

Este gotcha se materializó en producción y lo detectamos antes del panel. Vale la pena entenderlo bien.

**El escenario**: tienes una cuota fija de $926.35. En el Sistema Francés esa cuota se calcula con la fórmula y se redondea a 2 decimales. Durante 11 meses se paga exactamente 926.35. Pero en el mes 12, el saldo restante no es exactamente 926.35 — el redondeo acumulado deja un saldo de por ejemplo $911.10 en lugar del esperado. La cuota real del mes 12 es entonces $15.19 (interés) + $911.10 (capital) = **$926.29**, no $926.35.

**El bug original**: la última fila mostraba cuota = 926.35 (la cuota fija) aunque el pago real era 926.29. Resultado visible en la UI:

```
Suma de columna cuota:  11,116.20  (11 × 926.35 + 926.35)
Total intereses + monto: 11,116.14  (1,116.14 + 10,000.00)
Diferencia: $0.06  ← el usuario lo nota si suma las columnas
```

**Por qué pasa**: la fórmula del Sistema Francés asume división exacta. En la realidad, cada interés mensual se redondea (ej: 166.666... → 166.67) y ese centavo extra se va acumulando. La última cuota absorbe esa diferencia para que el saldo cierre exactamente en $0.00. Si la cuota de la última fila no refleja ese ajuste, el total de la columna no cuadra con el resumen.

**La corrección**:
```python
if mes == n:
    capital = _round(capital + new_saldo)  # absorbe el centavo restante
    cuota_fila = interes + capital          # cuota real: 15.19 + 911.10 = 926.29
```

Ahora la tabla muestra:
```
Mes 12: cuota = 926.29, interés = 15.19, capital = 911.10, saldo = 0.00
Total cuotas: 11,116.14  ==  intereses (1,116.14) + monto (10,000.00) ✓
```

**Principio general**: dos lugares de la UI nunca calculan el mismo número por caminos distintos. El resumen se calcula sumando el detalle — nunca por fórmula separada.

**Frase para el panel:**
> *"Detecté que la suma de la columna cuota no coincidía con el total mostrado en el resumen — diferencia de $0.06 por el redondeo acumulado en el mes 12. Lo corregí haciendo que la última cuota refleje el pago real ajustado, no la cuota fija. Así total_pagado == monto + total_intereses al centavo."*

### 4.8 CORS estricto, no wildcard

**El problema**: `allow_origins=["*"]` deja la API abierta a cualquier dominio.

**La solución**: lista explícita con el dominio de Vercel + localhost para dev.

### 4.9 SQLite efímero en Render Free (decisión consciente)

**El problema**: el filesystem de Render Free se borra en cada deploy → las simulaciones se pierden.

**La solución**: documentado en README como decisión consciente del alcance del reto. Migrar a Postgres = cambiar una URL gracias a SQLModel.

**Frase para el panel:**
> *"SQLite en Render Free es efímero. Es una decisión consciente del alcance — para una prueba técnica no quería agregar Postgres. Lo documenté en el README y migrar es cambiar una URL gracias a SQLModel."*

### 4.10 `z.coerce.number()` (si en el futuro migrás a Zod)

Detalle para tu referencia: `<input type="number">` devuelve **strings**. Si validás con `z.number()` directo, falla siempre. `z.coerce.number()` los convierte primero.

---

## 5. Narrativa de los 10 minutos del panel

> Guion sugerido. Cronometralo en casa — los nervios aceleran y en vivo lo que en casa dura 6 min puede durar 10.

### Frase de apertura

> *"CreditSim es una app pequeña pero arquitectónicamente sólida, como pedía el enunciado. Backend FastAPI + SQLModel, frontend Next.js, auditoría asíncrona en BackgroundTasks. Lo que más cuidé fue la separación de responsabilidades, no persistir lo derivable, y dejar claro en cada decisión qué descarté y por qué."*

### Minuto 0-1 — Problema y solución

> *"El reto era simular un crédito y notificar a un scoring que tarda y a veces falla, sin bloquear al usuario. La solución corre el cálculo sincrónico, devuelve la tabla en <200ms, y dispara la auditoría como background task que actualiza la fila cuando termina."*

### Minuto 1-3 — Diagrama de flujo

Compartís pantalla con el diagrama ASCII del README. Recorrés:
1. POST /simulate llega.
2. Calculo (función pura, <50ms).
3. INSERT en BD con status `pending`.
4. Disparo background task.
5. Response al usuario (<200ms).
6. Task corre 1-3s, actualiza fila.
7. Frontend polling cada 1.5s consulta GET /simulations/{id}.
8. Badge cambia a approved / rejected / failed.

### Minuto 3-5 — Stack y por qué

Por cada elección, una frase:
- **FastAPI**: async nativo, BackgroundTasks built-in.
- **SQLModel**: unifica BD + validación.
- **App Router de Next.js**: estándar actual.
- **BackgroundTasks**: el PDF pide mock; en prod usaría Celery+Redis.
- **SQLite**: alcance del reto; migrar a Postgres es 1 línea.

### Minuto 5-7 — Decisiones de criterio (acá ganás puntos)

Las "decisiones de scope" del README:
- Por qué NO persistí la tabla de amortización.
- Por qué NO usé Zod/RHF.
- Por qué tests solo en el cálculo.
- Por qué Pydantic Settings y no `os.getenv`.

Hablás como "elegí X en lugar de Y porque…". El panel registra **criterio**, no listas de tecnologías.

### Minuto 7-9 — Estructura de carpetas

Mostrás `app/{models, schemas, routers, services, core}`. Explicás que cada carpeta responde una pregunta única.

### Minuto 9-10 — Cierre

- "En producción agregaría cola persistente, Postgres, observabilidad."
- "Lo que más me costó / más aprendí / haría distinto: …" (humaniza la presentación).

### Tips de oratoria

- **Hablá lento**. Los nervios aceleran.
- **Mostrá código mientras hablás**, no solo diagramas.
- **Si te preguntan algo, repetí la pregunta en voz alta**. Compra 3 segundos.
- **Si no sabés algo, decilo**: *"Eso no lo evalué, pero el primer paso sería investigar X y Y."* Mil veces mejor que improvisar mal.

### Para el live coding

Tené todo abierto antes:
- VSCode con el repo abierto.
- Terminal con `uvicorn` corriendo.
- Browser con la app andando.
- DevTools abierto.

Si te piden "agregame X":
1. Repetí la pregunta.
2. Decí dónde irías a tocar y por qué.
3. Empezá por el test si aplica.
4. Hablá mientras tipeás.

---

## 6. Glosario rápido

### Backend
- **ORM**: traductor entre objetos Python y SQL.
- **SQLModel**: SQLAlchemy + Pydantic en una sola clase.
- **Pydantic Settings**: validación y carga de variables de entorno con tipos.
- **BackgroundTasks**: mecanismo de FastAPI para tareas que corren después de la response.
- **Función pura**: sin side effects, determinística.
- **Decimal**: tipo Python para aritmética exacta de decimales. Usar en dinero.
- **CORS**: política del browser que bloquea pedidos entre dominios distintos sin permiso explícito.
- **Fixture (pytest)**: objeto de prueba reutilizable, inyectado en tests.
- **TestClient**: cliente HTTP de prueba de FastAPI, no levanta servidor.

### Frontend
- **App Router**: modelo de rutas de Next.js basado en carpetas con `page.tsx`.
- **Server Component**: corre en server, no llega al bundle del cliente, no puede usar hooks de estado.
- **Client Component**: marcado con `"use client"`, corre en el browser, puede usar hooks.
- **Hidratación**: el browser recibe HTML del server y lo "enciende" con JS para hacerlo interactivo.
- **`NEXT_PUBLIC_`**: prefijo que expone una variable al bundle del cliente.
- **`useEffect`**: hook que corre después del render para sincronizar con cosas externas.
- **`localStorage`**: almacén clave-valor del browser. Sobrevive al cierre de pestaña.

### Conceptos
- **Determinístico**: mismos inputs → mismo output.
- **On-demand**: calcular cuando se pide, no precomputar.
- **Side effect**: cualquier cosa "hacia afuera" además de calcular y devolver.
- **Over-engineering**: agregar complejidad para problemas que no existen hoy.
- **Idempotente**: hacer la operación 1 vez o 10 = mismo resultado.

### Negocio crediticio
- **Amortización**: ir pagando el capital a lo largo del plazo.
- **Sistema Francés**: cuota constante. El más común.
- **TNA / TIN**: tasa nominal anual.
- **TEA / TAE**: tasa efectiva anual (incluye capitalización).
- **Scoring**: modelo que predice probabilidad de default.
- **Mora**: atraso en el pago.
- **KYC**: verificación de identidad del cliente.
- **DTI**: ratio deuda/ingreso.

---

## Cierre

Si llegaste hasta acá, **ya sabés más sobre CreditSim que un dev que solo
lo programó sin pensar el por qué**. Eso es exactamente lo que distingue
a un tech lead de un developer.

**Antes del panel, repasá:**
1. La sección 1 (entendimiento de negocio) — vocabulario de dominio.
2. Las frases para el panel de cada decisión en sección 2.
3. La narrativa de los 10 minutos en sección 5.
4. Los gotchas defendibles en sección 4 — son las "perlas" que diferencian.

Suerte. Lo vas a hacer bien.
