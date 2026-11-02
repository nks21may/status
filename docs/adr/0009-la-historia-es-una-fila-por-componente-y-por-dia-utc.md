# ADR-0009 — La historia en D1 es una fila por componente y por día UTC

- **Estado:** propuesto (por la iteración S1 del loop, el 2026-11-02; falta que lo confirme el
  usuario)
- **Fecha:** 2026-11-02
- **Decide:** cómo se guarda en D1 lo que mide el cron, con qué clave, y qué cuenta como un minuto
  arriba.

## Contexto

El cron prueba la URL de cada componente una vez por minuto
([ADR-0002](0002-corre-en-un-worker-de-cloudflare-en-el-plan-free.md)). Lo que se muestra después
(S2 y el MCP) es el estado actual y una barra por día de los últimos 90 días, como en
discordstatus.com. Lo que se guarda es un formato que se persiste: una vez que hay historia en la
base remota, cambiarlo es una migración de datos.

Los cupos de D1 Free, de la documentación consultada el 2026-11-02 (ADR-0002): 5 millones de filas
leídas y 100.000 escritas por día. La cuenta de ADR-0002 supone **una escritura por componente y
por minuto**: unas 14.400 por día con 10 componentes.

Lo que pesa al elegir la granularidad es lo que lee cada pedido de S2, que pide los 90 días de
todos los componentes. Con 10 componentes:

| Se guarda | Filas en 90 días | Pedidos de S2 hasta agotar las lecturas del día |
|---|---|---|
| una fila por sonda | 1.296.000 | 3 |
| una fila por hora | 21.600 | 231 |
| una fila por día | 900 | 5.555 |

La identidad de un componente: el catálogo del hub trae, por cada stack, `stack` (el nombre de su
carpeta en `stacks/` de `infra`, único en el catálogo) y la ficha, con un `nombre` que es texto para
mostrar (ADR-0010 del hub).

Qué cuenta como "arriba" ya está decidido del otro lado: el módulo `http_2xx` de blackbox en
`infra` (`stacks/metricas/blackbox/blackbox.yml`) sigue las redirecciones y pide un 2xx al final,
con un timeout de 10 s.

## Decisión

- **Una fila por componente y por día UTC** en la tabla `historia`, con dos contadores: los
  minutos medidos y los minutos arriba. Cada sonda suma un minuto medido, y uno arriba si
  corresponde. La disponibilidad de un día es el cociente de los dos.
- **El día es el UTC de la hora programada del cron** (`scheduledTime`), no la del reloj cuando
  corre: una corrida que arranca tarde suma al minuto que le tocaba. El día cambia a la medianoche
  UTC, la misma en la que se reponen los cupos de Cloudflare.
- **La última sonda vive en la fila del día** (por ahora, su latencia). Así una sonda es una sola
  escritura, la que contó ADR-0002, y no hay otra tabla que actualizar cada minuto.
- **Un componente se identifica por su `stack`**, no por el `nombre` de la ficha: el nombre se puede
  corregir en `infra` sin que el componente pierda su historia. La tabla `componentes` tiene el
  `stack` y la `url` que se prueba; lo demás de la ficha lo suma S4, que es quien la recibe
  ([ADR-0007](0007-los-componentes-salen-del-catalogo-del-hub.md)).
- **Un minuto arriba es una respuesta 2xx, después de seguir las redirecciones**, como `http_2xx`
  en blackbox. Cualquier otra respuesta es un minuto abajo.
- **Una corrida es un solo `batch` de D1**, con un upsert por componente.
- **El esquema se escribe con migraciones de D1**, en `migrations/` y con el formato de Wrangler
  (`NNNN_nombre.sql`). Los tests las aplican al D1 local. Una migración que ya se aplicó no se
  edita: un cambio es una migración nueva. Aplicarlas a la base remota es parte de cómo se publica
  el Worker, que está parkeado.
- **No se borra historia vieja**: lo que S2 no muestra queda guardado. Son 3.650 filas por año con
  10 componentes; si algún día hace falta podar, es un ítem.

## Consecuencias

**A favor:**

- Lo que lee S2 es chico y no crece con el tiempo: una fila por componente y por día mostrado.
- Las escrituras son las que contó ADR-0002: una por componente y por minuto.
- Renombrar un proyecto en su ficha no le borra la historia.

**En contra:**

- **La historia no se puede rearmar en otra zona horaria ni con otra granularidad.** Un visitante
  en Buenos Aires ve que el día cambia a las 21 h, y no hay cómo mostrarle una barra por día local.
- **Una corrida repetida para el mismo minuto suma dos veces.** Hasta que un ítem lo resuelva, un
  cron que se dispara dos veces infla los contadores.
- Un `stack` que se renombra en `infra` es un componente nuevo y empieza sin historia.
- La latencia que se guarda es la de la última sonda del día, no un promedio.

**Se revisa si:** la página necesita días en la hora local del visitante, una vista más fina que el
día, o una latencia que no sea la de la última sonda.

## Alternativas consideradas

- **Una fila por sonda**, la historia cruda. Se puede reagregar como se quiera, pero 90 días son 1,3
  millones de filas con 10 componentes: S2 las tendría que leer en cada pedido (tres pedidos agotan
  las lecturas del día) o mantener aparte un agregado como éste, y entonces son dos escrituras por
  sonda.
- **Una fila por componente y por hora.** Dejaría armar días en zonas con un desfase entero, pero
  lee 24 veces más por pedido, y la página y el MCP sólo muestran días.
- **La última sonda en la tabla de componentes.** Más natural de leer, pero son dos escrituras por
  componente y por minuto, el doble de lo que contó ADR-0002.
- **El `nombre` de la ficha como clave.** Es el que se muestra, pero corregir una tilde le cortaría
  la historia al componente.
