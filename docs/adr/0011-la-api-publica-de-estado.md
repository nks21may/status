# ADR-0011 — La API pública de estado: `GET /api/status`, y qué es "up", "down" y "no_data"

- **Estado:** aceptado (propuesto por la iteración S2 del loop el 2026-11-02; confirmado por el
  usuario el 2026-11-02)
- **Fecha:** 2026-11-02
- **Decide:** la ruta y el formato de la API pública que leen la página y el MCP, y cómo se calcula
  el estado de ahora de un componente.

## Contexto

S2 pide que el `GET` de la API conteste una entrada por componente, con su estado de ahora y una por
cada uno de los últimos 90 días, en inglés y sin campos internos. Un componente sin sonda en los
últimos minutos tiene que salir sin datos, no como arriba. S3 pide que la tool del estado general
del MCP devuelva lo mismo que esta API. Es un formato público: una vez que lo lee alguien de afuera,
renombrar o sacar un campo lo rompe.

Lo que hay en D1 (ADR-0009): por componente, una fila por día UTC con los minutos medidos y arriba,
y la última sonda del día (su latencia y, desde S7, su hora). **No está guardado si la última sonda
dio arriba:** con los contadores solos no se sabe si el último minuto anduvo.

La página de la maqueta (`DESIGN.md`) muestra, por servicio: el estado, la hora y la latencia de la
última lectura, la disponibilidad de los 90 días y los minutos medidos y arriba de cada día. El
nombre y la descripción salen de la ficha, que manda el emisor con S4 (ADR-0007); hasta S4 la tabla
de componentes sólo tiene el `stack` y la `url`.

## Decisión

- **`GET /api/status`**, en JSON. Los campos van en inglés (ADR-0005) y en `snake_case`.
- **El formato:**

  ```json
  {
    "generated_at": "2026-11-02T13:05:42.000Z",
    "components": [
      {
        "id": "museo",
        "url": "https://museo.nicolasdalessandro.dev/",
        "status": "up",
        "last_check": {"at": "2026-11-02T13:05:00.000Z", "up": true, "latency_ms": 182},
        "uptime_90d": 0.9971,
        "days": [{"date": "2026-08-05", "minutes_measured": 1440, "minutes_up": 1438}]
      }
    ]
  }
  ```

  - `id` es el `stack` del componente (ADR-0009), y los componentes van ordenados por `id`.
  - `status` es `up`, `down` o `no_data`.
  - `last_check` es la última sonda, o `null` si nunca hubo una.
  - `uptime_90d` es la suma de los minutos arriba sobre la de los medidos en los 90 días, entre 0 y
    1 y sin redondear, o `null` si no se midió ningún minuto.
  - `days` tiene siempre 90 entradas, del día UTC más viejo al de hoy (el de `generated_at`). Un día
    sin fila va con los dos contadores en 0.
- **El estado de ahora sale de la última sonda:** `up` si dio arriba, `down` si no, y `no_data` si
  la última sonda tiene más de 5 minutos o si no hay ninguna. Los 5 minutos dejan pasar un par de
  corridas perdidas del cron sin decir "sin datos", y no dejan que un cron frenado se lea como
  "anda".
- **La última sonda guarda si dio arriba.** Una migración nueva le suma a la fila del día la columna
  `ultima_arriba`, que escribe el cron junto con la latencia y la hora. Es lo que ya decide
  ADR-0009: la última sonda vive en la fila del día.
- **Sin campos internos:** no salen los nombres de las columnas ni las horas en milisegundos.
- **Lo que trae S4 entra como campos nuevos** (`name` y `description` en los dos idiomas, de la
  ficha). Agregar un campo no rompe a nadie; renombrar o sacar uno se decide con otro ADR.

## Consecuencias

**A favor:**

- La página y el MCP leen lo mismo, con una sola consulta a D1 de unas 900 filas para 10
  componentes, dentro de lo que contó ADR-0009.
- Un cron frenado se ve como "sin datos" a los 5 minutos, no como "anda".
- Los 90 días llegan completos: quien lee no tiene que rellenar huecos.

**En contra:**

- Hasta S4 un componente no tiene nombre para mostrar: la página usa el `id`.
- Cada pedido a la API es un pedido al Worker, del cupo de 100.000 por día. El abuso que lo agota
  sigue parkeado en el backlog.
- `uptime_90d` sin redondear expone la precisión entera del cociente: redondea quien lo muestra.

**Se revisa si:** un cliente de afuera necesita otro formato, el cron empieza a correr menos de una
vez por minuto, o hace falta un estado intermedio (con S4, un contenedor no sano con la URL
arriba).

## Alternativas consideradas

- **Inferir el estado de ahora de los contadores.** Con dos números del día no se sabe si el último
  minuto anduvo: un componente caído hace un minuto, con el resto del día arriba, saldría "up".
- **Guardar el estado de ahora en la tabla de componentes.** Son dos escrituras por sonda, lo que
  ADR-0009 ya descartó.
- **Los días como porcentajes en lugar de minutos.** Se pierde cuánto se midió: un día con un
  minuto medido y uno con 1.440 se verían igual, y la página muestra los dos números.
- **`camelCase`.** Es tan válido como `snake_case`, pero `snake_case` es el de las APIs de status
  conocidas (Statuspage) y el de las columnas de D1, así el mapeo es directo.
