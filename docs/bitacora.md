# Bitácora del loop de construcción — Status

Registro append-only, una entrada por iteración. El backlog está en
[backlog.md](backlog.md) y el protocolo en
[.claude/commands/tdd.md](../.claude/commands/tdd.md).

**Para qué sirve:** una entrada sin la salida del comando pegada textualmente
**es** el delirio. Se detecta de un vistazo, sin tener que releer el diff.

Nunca se edita ni se reordena una entrada anterior. Si algo salió mal, se agrega
una entrada nueva que lo corrige.

**Formato:** ítem · archivos tocados · comando del gate · salida del rojo →
salida del verde · sha.

---

## S0 — Harness y estructura · 2026-11-02

**Archivos:** `.gitattributes`, `.gitignore`, `CLAUDE.md`, `README.md`, `.claude/settings.json`,
`.claude/commands/tdd.md`, `docs/adr/README.md`, `docs/adr/0000-plantilla.md`, los ADR 0001 a
0007, `docs/backlog.md`, `docs/bitacora.md`, `package.json`, `package-lock.json`, `tsconfig.json`,
`eslint.config.js`, `vitest.config.ts`, `src/version.ts`, `tests/harness.test.ts`.

**Gate:** `npm run gate`

**El gate sabe ponerse rojo.** Con un hallazgo de lint puesto a propósito
(`export const VERSION: any = '0.0.0';` en `src/version.ts`, que `tsc` deja pasar y `eslint` corta):

```
> status@0.0.0 gate
> tsc --noEmit && npm run lint && vitest run


> status@0.0.0 lint
> eslint . --max-warnings=0


P:\status\src\version.ts
  2:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)

EXIT=1
```

**Verde**, con el hallazgo sacado:

```
> status@0.0.0 gate
> tsc --noEmit && npm run lint && vitest run


> status@0.0.0 lint
> eslint . --max-warnings=0


 RUN  v4.1.12 P:/status


 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  10:03:09
   Duration  126ms (transform 14ms, setup 0ms, import 22ms, tests 2ms, environment 0ms)

EXIT=0
```

**Nota:** S0 lo dejó armado la sesión de preparación, no una iteración del
loop. La primera iteración real del loop es **S1**.

**Sha:** `6f6a1bd`

---

## S1 — El cron prueba cada URL y suma el minuto a la historia del día · 2026-11-02

**Archivos:** `docs/adr/0009-la-historia-es-una-fila-por-componente-y-por-dia-utc.md`,
`docs/adr/README.md`, `wrangler.jsonc`, `migrations/0001_componentes_e_historia.sql`,
`package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.worker.json`, `vitest.config.ts`,
`src/worker/index.ts`, `src/worker/sondas.ts`, `src/worker/env.d.ts`,
`tests/worker/aplicar-migraciones.ts`, `tests/worker/env.d.ts`, `tests/worker/sondas.test.ts`. En
el commit siguiente, `docs/backlog.md` (el tilde y lo que salió) y esta entrada.

**Gate:** `npm run gate`

**El ADR, primero.** El esquema de la historia es un formato que se persiste, así que
[ADR-0009](adr/0009-la-historia-es-una-fila-por-componente-y-por-dia-utc.md) se escribió antes del
test: una fila por componente y por día UTC, con la clave en el `stack`, y un minuto arriba es un
2xx. Queda **propuesto**: falta que lo confirme el usuario.

**El harness, antes del test.** Entraron `@cloudflare/vitest-pool-workers` 0.23.0 (con `wrangler`
4.124.0, la versión que fija el pool) y `@cloudflare/workers-types` 5.20260815.1 (la fecha de
compatibilidad del workerd que trae el pool). Vitest corre dos proyectos: `node` y `worker`, éste en
workerd con las migraciones aplicadas al D1 local en un setup. Con un solo programa de TypeScript,
los globales de Node y de Workers chocaron (en `tests/harness.test.ts`, el `URL` global pasó a ser
el de Workers), así que el Worker y sus tests son un segundo programa (`tsconfig.worker.json`) y el
gate chequea los dos. Con eso y un Worker sin handlers, el gate dio verde con el test de harness
solo, antes de escribir el de S1.

**Dos rojos que no eran el esperado, y no cuentan como el rojo del ítem.** Uno de `tsc`:
`exports.default.scheduled()` de `cloudflare:workers` existe en el runtime, pero no en los tipos
estables de `Fetcher`; el test pasó a llamar al handler con `createScheduledController` y
`createExecutionContext` de `cloudflare:test`. El otro, del lint (`'_' is defined but never used`),
por cómo el test le sacaba la latencia a las filas; pasó a `toMatchObject`.

**Rojo**, el esperado: el Worker no tiene handler `scheduled`, así que no hay fila del día.

```

> status@0.0.0 gate
> tsc --noEmit && tsc --noEmit -p tsconfig.worker.json && npm run lint && vitest run


> status@0.0.0 lint
> eslint . --max-warnings=0


=======================================================================================
WARNING: @cloudflare/vitest-pool-workers has been renamed to @cloudflare/vitest-plugin.
This package will not receive future updates.
Run `npx @cloudflare/codemods vitest:pool-workers-to-vitest-plugin` to migrate.
=======================================================================================


 RUN  v4.1.12 P:/status

 ❯ |worker| tests/worker/sondas.test.ts (3 tests | 3 failed) 14ms
     × suma un minuto medido a cada componente y uno arriba sólo al que contesta 200, en la fila del día UTC 6ms
     × guarda la latencia de la última sonda de cada componente 4ms
     × las corridas del mismo día UTC suman en su fila, y la medianoche UTC abre una nueva 3ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |worker| tests/worker/sondas.test.ts > el cron de las sondas > suma un minuto medido a cada componente y uno arriba sólo al que contesta 200, en la fila del día UTC
Error: el Worker no tiene handler scheduled
 ❯ correrCron tests/worker/sondas.test.ts:27:11
     25| async function correrCron(hora: string): Promise<void> {
     26|   if (!worker.scheduled) {
     27|     throw new Error('el Worker no tiene handler scheduled');
       |           ^
     28|   }
     29|   const controlador = createScheduledController({scheduledTime: new Da…
 ❯ tests/worker/sondas.test.ts:69:11

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/3]⎯

 FAIL  |worker| tests/worker/sondas.test.ts > el cron de las sondas > guarda la latencia de la última sonda de cada componente
Error: el Worker no tiene handler scheduled
 ❯ correrCron tests/worker/sondas.test.ts:27:11
     25| async function correrCron(hora: string): Promise<void> {
     26|   if (!worker.scheduled) {
     27|     throw new Error('el Worker no tiene handler scheduled');
       |           ^
     28|   }
     29|   const controlador = createScheduledController({scheduledTime: new Da…
 ❯ tests/worker/sondas.test.ts:80:11

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/3]⎯

 FAIL  |worker| tests/worker/sondas.test.ts > el cron de las sondas > las corridas del mismo día UTC suman en su fila, y la medianoche UTC abre una nueva
Error: el Worker no tiene handler scheduled
 ❯ correrCron tests/worker/sondas.test.ts:27:11
     25| async function correrCron(hora: string): Promise<void> {
     26|   if (!worker.scheduled) {
     27|     throw new Error('el Worker no tiene handler scheduled');
       |           ^
     28|   }
     29|   const controlador = createScheduledController({scheduledTime: new Da…
 ❯ tests/worker/sondas.test.ts:97:11

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/3]⎯


 Test Files  1 failed | 1 passed (2)
      Tests  3 failed | 1 passed (4)
   Start at  10:39:33
   Duration  521ms (transform 25ms, setup 37ms, import 32ms, tests 16ms, environment 0ms)

EXIT=1
```

**Verde:**

```

> status@0.0.0 gate
> tsc --noEmit && tsc --noEmit -p tsconfig.worker.json && npm run lint && vitest run


> status@0.0.0 lint
> eslint . --max-warnings=0


=======================================================================================
WARNING: @cloudflare/vitest-pool-workers has been renamed to @cloudflare/vitest-plugin.
This package will not receive future updates.
Run `npx @cloudflare/codemods vitest:pool-workers-to-vitest-plugin` to migrate.
=======================================================================================


 RUN  v4.1.12 P:/status


 Test Files  2 passed (2)
      Tests  4 passed (4)
   Start at  10:41:07
   Duration  607ms (transform 26ms, setup 41ms, import 29ms, tests 149ms, environment 0ms)

EXIT=0
```

**Lo que se vio y no entró**, porque el protocolo no deja ampliar el alcance:

- **Sin componentes, el cron falla.** `sondear` le pasa a `batch` una lista vacía. Se vio con un
  test descartable (`tests/worker/zz-descartable.test.ts`, que esperaba que `sondear` resolviera
  con la tabla vacía; se borró antes del commit):

  ```
  AssertionError: promise rejected "Error: D1_ERROR: No SQL statements detect…" instead of resolving
  Caused by: Error: D1_ERROR: No SQL statements detected.
   ❯ sondear src/worker/sondas.ts:47:3
  ```

  Es lo normal hasta el primer envío de S4: va como **S5**.
- **Un `fetch` que rechaza corta toda la corrida**, por el `Promise.all` de `sondear`. Esto sale de
  leer el código, no se corrió: va como **S6**, con el timeout de 10 s de blackbox.
- **Una corrida repetida para el mismo minuto suma dos veces** (el "en contra" de ADR-0009): va
  como **S7**.
- **El pool de Workers está deprecado**: se renombró a `@cloudflare/vitest-plugin`, que soporta
  Vitest 5, y el gate lo avisa en cada corrida. Se cumple el "se revisa si" de ADR-0001: va a
  Parkeados, para que decida el usuario.
- **El empaquetado del Worker no entró al gate**, aunque ADR-0001 lo pide cuando llega el Worker:
  `wrangler deploy --dry-run` choca con el punto 0.4 del protocolo. Va a Parkeados.

**Sha:** `186283e`

---

## Harness: el pool de Workers pasa a `@cloudflare/vitest-plugin` · 2026-11-02

No es un ítem del backlog: es el cambio que decidió el usuario sobre el parkeado "ADR-0001 se
revisa", que sale del backlog con esto. El usuario eligió el sucesor y seguir en Vitest 4.

**Archivos:** `docs/adr/0010-los-tests-del-worker-usan-vitest-plugin-con-vitest-4.md`,
`docs/adr/0001-typescript-vitest-4-y-gate-en-el-host.md` (sólo el estado), `docs/adr/README.md`,
`CLAUDE.md` (la regla 1), `package.json`, `package-lock.json`, `tsconfig.worker.json`,
`vitest.config.ts`, `wrangler.jsonc`, `docs/backlog.md`.

**Gate:** `npm run gate`

**El ADR, primero.** [ADR-0010](adr/0010-los-tests-del-worker-usan-vitest-plugin-con-vitest-4.md)
reemplaza la parte de ADR-0001 que nombra el paquete del pool, y también la del `tsc` del gate
(los dos programas de TypeScript que entraron con S1).

**Qué cambió.** Sale `@cloudflare/vitest-pool-workers` 0.23.0 y entra `@cloudflare/vitest-plugin`
1.4.12; `wrangler` pasa de 4.124.0 a 4.156.1, la versión que fija el plugin. `wrangler` 4.156.1 pide
`@cloudflare/workers-types ^5.20261101.1`, así que los tipos (5.20261101.1) y la fecha de
compatibilidad del Worker (2026-11-01) se movieron juntos a la del workerd que trae el plugin
(1.20261101.1). El código de los tests no cambió: sólo el import de `vitest.config.ts` y los tipos de
`tsconfig.worker.json`.

**`npm audit`:** de 17 vulnerabilidades (11 moderadas y 6 altas) a 11 moderadas. Las 6 altas
(`undici`, `zod`, `sharp`) venían del pool viejo. Las 11 moderadas son de `minimatch` por eslint y
ya estaban desde S0. La entrada de S1 y su reporte dijeron que las 17 eran del pool: era un error.

**El harness nuevo sabe ponerse rojo.** No hay test nuevo, así que el rojo es un bug a propósito
en `sondear` (`arriba: respuesta.status < 600`: todo cuenta como arriba), revertido con
`git checkout -- src/worker/sondas.ts` antes del verde. Un primer intento con `arriba: true` lo
cortó `tsc` (`'respuesta' is declared but its value is never read`) antes de llegar a Vitest, así
que no sirvió como prueba.

```

> status@0.0.0 gate
> tsc --noEmit && tsc --noEmit -p tsconfig.worker.json && npm run lint && vitest run


> status@0.0.0 lint
> eslint . --max-warnings=0


 RUN  v4.1.12 P:/status

 ❯ |worker| tests/worker/sondas.test.ts (3 tests | 2 failed) 214ms
     × suma un minuto medido a cada componente y uno arriba sólo al que contesta 200, en la fila del día UTC 77ms
     × las corridas del mismo día UTC suman en su fila, y la medianoche UTC abre una nueva 64ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |worker| tests/worker/sondas.test.ts > el cron de las sondas > suma un minuto medido a cada componente y uno arriba sólo al que contesta 200, en la fila del día UTC
AssertionError: expected [ { stack: 'museo', …(4) }, …(1) ] to match object [ { stack: 'museo', …(3) }, …(1) ]
(1 matching property omitted from actual)

- Expected
+ Received

@@ -5,10 +5,10 @@
      "minutos_medidos": 1,
      "stack": "museo",
    },
    {
      "dia": "2026-11-02",
-     "minutos_arriba": 0,
+     "minutos_arriba": 1,
      "minutos_medidos": 1,
      "stack": "neonduel",
    },
  ]

 ❯ tests/worker/sondas.test.ts:72:22
     70|
     71|     const historia = await leerHistoria();
     72|     expect(historia).toMatchObject([
       |                      ^
     73|       {stack: 'museo', dia: '2026-11-02', minutos_medidos: 1, minutos_…
     74|       {stack: 'neonduel', dia: '2026-11-02', minutos_medidos: 1, minut…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  |worker| tests/worker/sondas.test.ts > el cron de las sondas > las corridas del mismo día UTC suman en su fila, y la medianoche UTC abre una nueva
AssertionError: expected [ { stack: 'museo', …(4) }, …(3) ] to match object [ { stack: 'museo', …(3) }, …(3) ]
(2 matching properties omitted from actual)

- Expected
+ Received

@@ -11,16 +11,16 @@
      "minutos_medidos": 1,
      "stack": "museo",
    },
    {
      "dia": "2026-11-02",
-     "minutos_arriba": 0,
+     "minutos_arriba": 2,
      "minutos_medidos": 2,
      "stack": "neonduel",
    },
    {
      "dia": "2026-11-03",
-     "minutos_arriba": 0,
+     "minutos_arriba": 1,
      "minutos_medidos": 1,
      "stack": "neonduel",
    },
  ]

 ❯ tests/worker/sondas.test.ts:102:22
    100|
    101|     const historia = await leerHistoria();
    102|     expect(historia).toMatchObject([
       |                      ^
    103|       {stack: 'museo', dia: '2026-11-02', minutos_medidos: 2, minutos_…
    104|       {stack: 'museo', dia: '2026-11-03', minutos_medidos: 1, minutos_…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯


 Test Files  1 failed | 1 passed (2)
      Tests  2 failed | 2 passed (4)
   Start at  10:51:06
   Duration  885ms (transform 29ms, setup 44ms, import 34ms, tests 216ms, environment 0ms)

EXIT=1
```

**Verde**, con `sondear` como está en el commit y sin el aviso de deprecado:

```

> status@0.0.0 gate
> tsc --noEmit && tsc --noEmit -p tsconfig.worker.json && npm run lint && vitest run


> status@0.0.0 lint
> eslint . --max-warnings=0


 RUN  v4.1.12 P:/status


 Test Files  2 passed (2)
      Tests  4 passed (4)
   Start at  10:51:46
   Duration  868ms (transform 30ms, setup 45ms, import 33ms, tests 215ms, environment 0ms)

EXIT=0
```

**Sha:** `2c9bed5`

---

## S5 — Sin componentes, el cron termina sin escribir y sin error · 2026-11-02

**Archivos:** `src/worker/sondas.ts`, `tests/worker/sondas.test.ts`. En el commit siguiente,
`docs/backlog.md` (el tilde) y esta entrada.

**Gate:** `npm run gate`

Sin ADR: no hay decisión estructural. `sondear` vuelve antes de sondear si no hay componentes,
porque D1 no acepta un `batch` vacío.

**Rojo**, el esperado (el mismo que dio el test descartable de S1):

```

> status@0.0.0 gate
> tsc --noEmit && tsc --noEmit -p tsconfig.worker.json && npm run lint && vitest run


> status@0.0.0 lint
> eslint . --max-warnings=0


 RUN  v4.1.12 P:/status

 ❯ |worker| tests/worker/sondas.test.ts (4 tests | 1 failed) 237ms
     × sin componentes, la corrida termina sin escribir y sin error 28ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |worker| tests/worker/sondas.test.ts > el cron de las sondas > sin componentes, la corrida termina sin escribir y sin error
Error: D1_ERROR: No SQL statements detected.
 ❯ D1DatabaseSessionAlwaysPrimary._sendOrThrow cloudflare-internal:d1-api:193:19
 ❯ cloudflare-internal:d1-api:142:19
 ❯ sondear src/worker/sondas.ts:47:3
     45|   const dia = diaUtc(hora);
     46|   const sumar = db.prepare(SUMAR_MINUTO);
     47|   await db.batch(
       |   ^
     48|     sondas.map(({stack, arriba, latenciaMs}) => sumar.bind(stack, dia,…
     49|   );
 ❯ Object.scheduled src/worker/index.ts:7:5
 ❯ correrCron tests/worker/sondas.test.ts:31:3
 ❯ tests/worker/sondas.test.ts:114:5

Caused by: Error: No SQL statements detected.
 ❯ D1DatabaseSessionAlwaysPrimary._sendOrThrow cloudflare-internal:d1-api:194:24
 ❯ cloudflare-internal:d1-api:142:19
 ❯ sondear src/worker/sondas.ts:47:3
 ❯ Object.scheduled src/worker/index.ts:7:5
 ❯ correrCron tests/worker/sondas.test.ts:31:3
 ❯ tests/worker/sondas.test.ts:114:5

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed | 1 passed (2)
      Tests  1 failed | 4 passed (5)
   Start at  11:30:36
   Duration  797ms (transform 28ms, setup 41ms, import 39ms, tests 239ms, environment 0ms)

EXIT=1
```

**Verde:**

```

> status@0.0.0 gate
> tsc --noEmit && tsc --noEmit -p tsconfig.worker.json && npm run lint && vitest run


> status@0.0.0 lint
> eslint . --max-warnings=0


 RUN  v4.1.12 P:/status


 Test Files  2 passed (2)
      Tests  5 passed (5)
   Start at  11:30:46
   Duration  792ms (transform 28ms, setup 43ms, import 32ms, tests 224ms, environment 0ms)

EXIT=0
```

**Sha:** `d82cf74`

---

## S6 — Una sonda que no contesta cuenta como minuto abajo y no corta las demás · 2026-11-02

**Archivos:** `src/worker/sondas.ts`, `tests/worker/sondas.test.ts`. En el commit siguiente,
`docs/backlog.md` (el tilde) y esta entrada.

**Gate:** `npm run gate`

Sin ADR: el timeout de 10 s es el de `http_2xx` en blackbox, que ya cita ADR-0009. `probar` corta
el pedido a los 10 s con un `AbortController`, y un error de red o el corte cuentan como minuto
abajo, con la latencia hasta el error. El corte va con `setTimeout` y no con
`AbortSignal.timeout`, porque los timers simulados de Vitest no adelantan éste: el test simula sólo
`setTimeout` y `clearTimeout`, espera a que la sonda de nonograma esté colgada y adelanta el reloj
10.000 ms.

**Rojo**, el esperado: el rechazo del `fetch` rompe el `Promise.all` de `sondear`, y la corrida no
deja filas.

```

> status@0.0.0 gate
> tsc --noEmit && tsc --noEmit -p tsconfig.worker.json && npm run lint && vitest run


> status@0.0.0 lint
> eslint . --max-warnings=0


 RUN  v4.1.12 P:/status

 ❯ |worker| tests/worker/sondas.test.ts (5 tests | 1 failed) 232ms
     × una sonda que no contesta cuenta como minuto abajo y no corta las demás 11ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |worker| tests/worker/sondas.test.ts > el cron de las sondas > una sonda que no contesta cuenta como minuto abajo y no corta las demás
TypeError: Network connection lost.
 ❯ tests/worker/sondas.test.ts:140:15
    138|       }
    139|       if (url === NEONDUEL) {
    140|         throw new TypeError('Network connection lost.');
       |               ^
    141|       }
    142|       // Nonograma no contesta: el pedido sólo termina si la sonda lo …
 ❯ probar src/worker/sondas.ts:26:27
 ❯ sondear src/worker/sondas.ts:47:48
 ❯ Object.scheduled src/worker/index.ts:7:5
 ❯ correrCron tests/worker/sondas.test.ts:35:3
 ❯ tests/worker/sondas.test.ts:149:5

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed | 1 passed (2)
      Tests  1 failed | 5 passed (6)
   Start at  11:32:01
   Duration  815ms (transform 32ms, setup 42ms, import 41ms, tests 234ms, environment 0ms)

EXIT=1
```

**Verde:**

```

> status@0.0.0 gate
> tsc --noEmit && tsc --noEmit -p tsconfig.worker.json && npm run lint && vitest run


> status@0.0.0 lint
> eslint . --max-warnings=0


 RUN  v4.1.12 P:/status


 Test Files  2 passed (2)
      Tests  6 passed (6)
   Start at  11:32:14
   Duration  799ms (transform 27ms, setup 41ms, import 31ms, tests 271ms, environment 0ms)

EXIT=0
```

**El test fija los 10 s.** Con `TIMEOUT_MS = 10_001` en `src/worker/sondas.ts` la sonda colgada no
se corta al adelantar el reloj, y el test se vence (revertido después, antes del commit):

```
     × una sonda que no contesta cuenta como minuto abajo y no corta las demás 5015ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
Error: Test timed out in 5000ms.
      Tests  1 failed | 4 passed (5)
```

**Sha:** `ac53841`

---

## S7 — Una corrida repetida para el mismo minuto no suma dos veces · 2026-11-02

**Archivos:** `migrations/0002_hora_de_la_ultima_sonda.sql`, `src/worker/sondas.ts`,
`tests/worker/sondas.test.ts`. En el commit siguiente, `docs/backlog.md` (el tilde) y esta entrada.

**Gate:** `npm run gate`

Sin ADR nuevo: ADR-0009 ya pone la última sonda en la fila del día y nombra este caso como
pendiente. La migración `0002` le suma a `historia` la hora programada de la última corrida que
sumó (`ultima_sonda_en`, en milisegundos), y el upsert sólo suma si la corrida es **posterior** a
ésa. Así la hora y la latencia de la última sonda siempre son las más nuevas. El costo: si dos
corridas se pisan y la más vieja termina después, su minuto no cuenta. Con sondas de 10 s como
mucho y un cron por minuto, una corrida tendría que empezar 50 s tarde para que pase.

**Rojo**, el esperado: `minutos_medidos` queda en 2.

```

> status@0.0.0 gate
> tsc --noEmit && tsc --noEmit -p tsconfig.worker.json && npm run lint && vitest run


> status@0.0.0 lint
> eslint . --max-warnings=0


 RUN  v4.1.12 P:/status

 ❯ |worker| tests/worker/sondas.test.ts (6 tests | 1 failed) 294ms
     × una corrida repetida para el mismo minuto no suma dos veces 37ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |worker| tests/worker/sondas.test.ts > el cron de las sondas > una corrida repetida para el mismo minuto no suma dos veces
AssertionError: expected [ { stack: 'museo', …(4) }, …(1) ] to match object [ { stack: 'museo', …(3) }, …(1) ]
(2 matching properties omitted from actual)

- Expected
+ Received

  [
    {
      "dia": "2026-11-02",
-     "minutos_arriba": 1,
-     "minutos_medidos": 1,
+     "minutos_arriba": 2,
+     "minutos_medidos": 2,
      "stack": "museo",
    },
    {
      "dia": "2026-11-02",
      "minutos_arriba": 0,
-     "minutos_medidos": 1,
+     "minutos_medidos": 2,
      "stack": "neonduel",
    },
  ]

 ❯ tests/worker/sondas.test.ts:167:34
    165|     await correrCron('2026-11-02T13:05:00Z');
    166|
    167|     expect(await leerHistoria()).toMatchObject([
       |                                  ^
    168|       {stack: 'museo', dia: '2026-11-02', minutos_medidos: 1, minutos_…
    169|       {stack: 'neonduel', dia: '2026-11-02', minutos_medidos: 1, minut…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed | 1 passed (2)
      Tests  1 failed | 6 passed (7)
   Start at  11:33:06
   Duration  827ms (transform 27ms, setup 41ms, import 31ms, tests 296ms, environment 0ms)

EXIT=1
```

**Verde:**

```

> status@0.0.0 gate
> tsc --noEmit && tsc --noEmit -p tsconfig.worker.json && npm run lint && vitest run


> status@0.0.0 lint
> eslint . --max-warnings=0


 RUN  v4.1.12 P:/status


 Test Files  2 passed (2)
      Tests  7 passed (7)
   Start at  11:33:21
   Duration  815ms (transform 27ms, setup 48ms, import 31ms, tests 269ms, environment 0ms)

EXIT=0
```

**Sha:** `91f2e48`

## Diseño: `PRODUCT.md`, `DESIGN.md` y la maqueta, con impeccable · 2026-11-02

No es un ítem del loop: es la sesión con el usuario que
[ADR-0008](adr/0008-la-pagina-se-disena-con-impeccable.md) pide antes de S2. La arrancó el usuario
("Sí, arrancalo"). Con esto S2 deja de esperar el diseño.

**Archivos:**
- `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json` y el brief de la superficie en
  `.impeccable/surfaces/`;
- las capturas de la revisión en `.impeccable/review/`: escritorio y celular, en claro y en
  oscuro;
- `diseno/README.md`, y en `diseno/maqueta/`: `estilos.css`, `generar.ts`, `lectura.ts` y
  `fuentes/` (Archivo y Chivo Mono, con su OFL);
- `.claude/launch.json`, `.gitignore`, `README.md` y `docs/backlog.md` (S2).

**Gate:** `npm run gate`

**Lo que decidió el usuario:**
- **El lector principal** es el que quiere saber si un proyecto anda, desde el celular.
- **La voz** es sobria y exacta.
- **El stack** lo delegó, y quedó HTML y CSS a mano con TypeScript sin framework.
- **La maqueta** va aparte, en `diseno/`: S2 arma la página real con TDD y se lleva el CSS.
- **Además de los componentes**, la página dice cómo sumar el MCP a Claude y tiene los links al hub
  y al portfolio.
- **La dirección es "La boleta del servicio"**: la asignó la tirada de impeccable (seed
  `7febb644`), y el usuario la eligió por sobre el tablero de partidas, el horario de bolsillo y el
  status de siempre. Lo fijo va en una tinta violeta de formulario y lo medido en negro de
  impresora; el bermellón es sólo para lo caído, y no hay verde.

**La revisión final.**
- **Primera pasada:** *fix*, con siete arreglos materiales.
- **Segunda pasada:** cinco resueltos y dos parciales.
  - El recuadro del estado general todavía era más bajo que un renglón de servicio en escritorio.
    Después le puse un alto mínimo de 16rem. Medido en el panel del navegador, a 1440 de ancho,
    quedó en 256 px contra 238 de cada renglón. **Ese arreglo no pasó por una tercera revisión.**
  - El modo oscuro tenía que quedar asentado en `DESIGN.md`, y ahí está, con su paleta.

**Fuera del gate.**
- La maqueta no tiene tests: es diseño, con datos de demostración, y la página real la arma S2 con
  TDD.
- El lint del gate sí corre sobre sus `.ts`. `tsc` no, porque no están en los dos programas del
  gate: los chequeé a mano y dieron exit 0.
- Las páginas y `lectura.js` se generan con `node diseno/maqueta/generar.ts` y no se versionan.

```

> status@0.0.0 gate
> tsc --noEmit && tsc --noEmit -p tsconfig.worker.json && npm run lint && vitest run


> status@0.0.0 lint
> eslint . --max-warnings=0


 RUN  v4.1.12 P:/status


 Test Files  2 passed (2)
      Tests  7 passed (7)
   Start at  13:44:23
   Duration  2.50s (transform 1.36s, setup 51ms, import 1.36s, tests 317ms, environment 0ms)

GATE_EXIT=0
```

**Sha:** `fd21169`

## S2 — La API pública da el estado y los 90 días de cada componente, y la página lo muestra · 2026-11-02

**Archivos:**
- Worker y esquema: `src/worker/estado.ts`, `src/worker/index.ts`, `src/worker/sondas.ts`,
  `src/worker/env.d.ts`, `src/estado.ts` y `migrations/0003_resultado_de_la_ultima_sonda.sql`.
- Página: `src/pagina/` (`textos.ts`, `renderizar.ts`, `interaccion.ts` y `principal.ts`), y
  `public/` (`index.html`, más `estilos.css` y `fuentes/`, que se mudaron de la maqueta).
- Tests: `tests/worker/api.test.ts`, `tests/worker/pagina.test.ts`, `tests/worker/sondas.test.ts`
  y `tests/pagina/renderizar.test.ts`.
- Configuración: `tsconfig.json`, `tsconfig.pagina.json`, `wrangler.jsonc`, `package.json`,
  `package-lock.json` (esbuild), `.gitignore` y `.claude/launch.json`.
- Maqueta: `diseno/README.md`, y en `diseno/maqueta/`: `generar.ts`, `lectura.ts` y `maqueta.css`.
- Documentación: los ADR 0010 (sólo el estado), 0011 y 0012, `docs/adr/README.md`, `CLAUDE.md`
  (la regla 1) y `docs/backlog.md` (la nota del gate).
- En el commit siguiente: `docs/backlog.md` (el tilde, el intocable y dos parkeados) y esta
  entrada.

**Gate:** `npm run gate`

**Los ADR, primero.** Aparecieron dos decisiones caras de revertir. Las escribí como propuestas
antes del test, y el usuario las aceptó antes de escribirlo:
- [ADR-0011](adr/0011-la-api-publica-de-estado.md) fija el formato público de `GET /api/status`.
  Un componente sale `no_data` si su última sonda tiene más de 5 minutos. Además, **la fila del día
  guarda si la última sonda dio arriba** (migración 0003): con los contadores solos no se sabe si
  el último minuto anduvo.
- [ADR-0012](adr/0012-la-pagina-la-arma-el-navegador.md) decide la página:
  - son archivos estáticos que el navegador arma con una función pura, testeada en Node;
  - esbuild empaqueta el código;
  - el idioma se recuerda en `localStorage`;
  - el gate chequea un tercer programa de TypeScript, el de la página, con los tipos del DOM. Eso
    reemplaza la parte de ADR-0010 que decía dos.

**Rojo.** El backlog esperaba un 404 en la ruta de la API. Lo que dio fue que el Worker no tiene
handler `fetch`, así que ni siquiera hay ruta. Los otros dos rojos fueron los esperados: falta la
columna `ultima_arriba` y falta el módulo de la página. Los 7 tests de antes siguieron en verde.

El gate corta en `tsc`:

```
> status@0.0.0 gate
> tsc --noEmit && tsc --noEmit -p tsconfig.worker.json && npm run lint && vitest run

tests/pagina/renderizar.test.ts(2,34): error TS2307: Cannot find module '../../src/estado.ts' or its corresponding type declarations.
tests/pagina/renderizar.test.ts(3,26): error TS2307: Cannot find module '../../src/pagina/renderizar.ts' or its corresponding type declarations.
```

Y `npx vitest run`, para ver el rojo de cada test:

```
 RUN  v4.1.12 P:/status
     × se sirve como archivo estático, en inglés, y carga el código que pide la API 27ms
     × da el estado de ahora y los 90 días de cada componente, en inglés y sin campos internos 26ms
     × un componente sin medición reciente sale sin datos, no como arriba 5ms
     × un componente que nunca se midió sale sin datos, con los 90 días en cero 10ms
     × después de la medianoche UTC, el día nuevo abre en cero y la última sonda sigue siendo la de ayer 5ms
     × la última sonda guarda si dio arriba 34ms
 FAIL  |node| tests/pagina/renderizar.test.ts [ tests/pagina/renderizar.test.ts ]
Error: Cannot find module '../../src/pagina/renderizar.ts' imported from P:/status/tests/pagina/renderizar.test.ts
 FAIL  |worker| tests/worker/api.test.ts > la API de estado > da el estado de ahora y los 90 días de cada componente, en inglés y sin campos internos
Error: D1_ERROR: table historia has no column named ultima_arriba: SQLITE_ERROR
 FAIL  |worker| tests/worker/api.test.ts > la API de estado > un componente que nunca se midió sale sin datos, con los 90 días en cero
TypeError: Expected default export of P:\status\src\worker\index.ts to define a `fetch()` function
 FAIL  |worker| tests/worker/pagina.test.ts > la página > se sirve como archivo estático, en inglés, y carga el código que pide la API
TypeError: Expected default export of P:\status\src\worker\index.ts to define a `fetch()` function
 FAIL  |worker| tests/worker/sondas.test.ts > el cron de las sondas > la última sonda guarda si dio arriba
Error: D1_ERROR: no such column: ultima_arriba at offset 14: SQLITE_ERROR
 Test Files  4 failed | 1 passed (5)
      Tests  6 failed | 7 passed (13)
```

**En el camino a verde.**
- **Los archivos estáticos no se sirven en los tests.** Con `assets` en `wrangler.jsonc`, tanto
  `exports.default.fetch` como `SELF.fetch` le pegan directo al Worker y saltean el ruteo de
  assets: los dos daban el 404 del Worker. Con un binding `ASSETS`, `env.ASSETS.fetch('/')` sí da
  `index.html`. Así que el Worker le pasa a `ASSETS` todo lo que no es la API, y el test entra
  por el Worker, como cualquier visitante. En producción, `/` lo sirven los archivos estáticos sin
  pasar por el Worker (ADR-0012).
- **Dos correcciones a mis tests, antes del verde.** El texto en español es "1 de 2 anda", como en
  la maqueta, no "andan". Y el helper que saca el texto del HTML metía un espacio por cada
  etiqueta, también en el link del nombre ("museo ."): ahora las etiquetas en línea no separan.
- **Un bug que encontró la prueba a mano.** Con `wrangler dev` en local, el D1 local migrado y
  datos de demostración, "Down" salía en negro: `renderizar` armaba la clase `estado--down` y el
  CSS de `DESIGN.md` espera `estado--caido`. Sumé la aserción de las clases al test y la vi fallar
  (`expected '…' to contain '<span class="estado estado--anda">'`). Después mapeé los estados a
  las clases.
- **El resto de la prueba a mano** salió bien:
  - "Down" quedó en bermellón (`rgb(184, 52, 26)`);
  - el botón ES cambia la página, el título y `lang`, y la elección sobrevive a la recarga;
  - Inicio y Fin recorren el gráfico, y la lectura sale en tres tramos.
  Todo fue local: `wrangler d1 migrations apply --local` y `wrangler d1 execute --local`, nada
  contra la cuenta.

**Verde:**

```

> status@0.0.0 gate
> tsc --noEmit && tsc --noEmit -p tsconfig.worker.json && tsc --noEmit -p tsconfig.pagina.json && npm run lint && vitest run


> status@0.0.0 lint
> eslint . --max-warnings=0


 RUN  v4.1.12 P:/status


 Test Files  5 passed (5)
      Tests  19 passed (19)
   Start at  14:01:08
   Duration  1.13s (transform 96ms, setup 226ms, import 115ms, tests 412ms, environment 0ms)

GATE_EXIT=0
```

**Lo que no cubre el gate:**
- El código del navegador no tiene test (ADR-0012).
- El gate no empaqueta la página: `npm run build:pagina` lo corre Wrangler.
- Hasta S4 un componente no tiene nombre ni descripción: la página muestra su `id`.

**Sha:** `bd5350d`

## S3 — El MCP remoto contesta en `/mcp` con las tools de sólo lectura · 2026-11-02

**Archivos:**
- Código: `src/worker/mcp.ts` y `src/worker/index.ts`.
- Tests: `tests/worker/mcp.test.ts`, y `tests/worker/sembrar.ts`, el helper que ahora comparte con
  `tests/worker/api.test.ts`.
- Documentación: `docs/adr/0013-el-mcp-habla-json-rpc-a-mano-y-sus-tools.md`,
  `docs/adr/README.md` y `CLAUDE.md` (la regla 6).
- En el commit siguiente: `docs/backlog.md` (el tilde) y esta entrada.

**Gate:** `npm run gate`

**El ADR, primero.**
- **Qué faltaba decidir.** ADR-0006 daba por hecho una librería "fijada", pero no la elegía. Y
  los nombres de las tools son públicos.
- **Por qué no el SDK.** `@modelcontextprotocol/sdk` 1.32.2 trae express, hono, ajv y una docena
  más, y ajv compila con `new Function`, que workerd no permite. Encima, el plan Free da 10 ms de
  CPU por pedido.
- **Lo que decide.** [ADR-0013](adr/0013-el-mcp-habla-json-rpc-a-mano-y-sus-tools.md) implementa
  a mano el JSON-RPC de Streamable HTTP, sin estado y sin SSE, con tres tools: `get_status`,
  `get_component` y `get_component_history`.
- **Lo aceptó el usuario** antes del test.
- **Una línea agregada después de aceptarlo, antes del rojo:** una tool desconocida es el error
  JSON-RPC -32602, como pide la especificación, y no un error de la tool.

**Rojo**, el esperado: `POST /mcp` contesta 404 (lo contestan los archivos estáticos, porque el
Worker les pasa lo que no es suyo). Los 10 tests nuevos fallan y los 19 de antes siguen en verde.

```
> status@0.0.0 gate
> tsc --noEmit && tsc --noEmit -p tsconfig.worker.json && tsc --noEmit -p tsconfig.pagina.json && npm run lint && vitest run

> status@0.0.0 lint
> eslint . --max-warnings=0

 RUN  v4.1.12 P:/status
 ❯ |worker| tests/worker/mcp.test.ts (10 tests | 10 failed) 118ms
     × contesta initialize con la versión que pide el cliente y sus capacidades 33ms
     × a una versión que no conoce le contesta con la más nueva 8ms
     × lista las tres tools de sólo lectura, con nombres y descripciones en inglés 8ms
     × el estado general devuelve lo mismo que la API 22ms
     × el estado de un componente es el de la API, sin la lista de días 9ms
     × la historia de un componente trae los últimos días pedidos y su disponibilidad 8ms
     × un componente que no existe es un error de la tool, con los que hay 7ms
     × una cantidad de días fuera de rango o que no es un entero es un error de la tool 8ms
     × una tool o un método que no existen son errores de JSON-RPC, no un 500 10ms
     × sin sesiones ni stream: GET contesta 405 4ms
 FAIL  |worker| tests/worker/mcp.test.ts > el MCP > contesta initialize con la versión que pide el cliente y sus capacidades
AssertionError: expected 404 to be 200 // Object.is equality
 Test Files  1 failed | 5 passed (6)
      Tests  10 failed | 19 passed (29)
```

**En el camino a verde.** Una primera corrida dejó un rojo: `days: null` caía en el valor por
defecto, porque el código usaba `??`. Si falta `days`, van los 90; un `null` es un valor que no
sirve, y ahora es un error de la tool.

**Con un cliente de verdad.** Como el protocolo está escrito a mano, lo probé además con el
cliente del SDK oficial (1.32.2, instalado en el scratchpad, no en el repo). Fue contra
`wrangler dev` en local, con el D1 local:

```
servidor: {"name":"status.nicolasdalessandro.dev","title":"nicolasdalessandro.dev status","version":"1.0.0"} protocolo: 2025-11-25
tools: get_status, get_component, get_component_history
get_component: {"id":"neonduel","url":"https://neonduel.nicolasdalessandro.dev/","status":"no_data","last_check":{"at":"2026-11-02T16:59:36.107Z","up":false,"latency_ms":80},"uptime_90d":0.9970457902511078}
get_component_history: {"id":"museo","uptime":0.9989740959220312,"days":[{"date":"2026-10-31","minutes_measured":1440,"minutes_up":1436},{"date":"2026-11-01","minutes_measured":1440,"minutes_up":1440},{"date":"2026-11-02","minutes_measured":1019,"minutes_up":1019}]}
error de tool: true Unknown component "pinball". Known components: museo, neonduel, nonograma.
```

El `no_data` de neonduel es el correcto: la siembra local tenía más de 5 minutos.

**Verde:**

```

> status@0.0.0 gate
> tsc --noEmit && tsc --noEmit -p tsconfig.worker.json && tsc --noEmit -p tsconfig.pagina.json && npm run lint && vitest run


> status@0.0.0 lint
> eslint . --max-warnings=0


 RUN  v4.1.12 P:/status


 Test Files  6 passed (6)
      Tests  29 passed (29)
   Start at  14:13:10
   Duration  1.22s (transform 131ms, setup 332ms, import 208ms, tests 598ms, environment 0ms)

GATE_EXIT=0
```

**Sha:** `2bd0e08`

## S4 — La VPS manda lo de adentro: el endpoint autenticado y el emisor · 2026-11-02

⚠️ **seguridad.**

**Archivos:**
- Worker: `src/worker/envio.ts`, `src/worker/index.ts` y `src/worker/env.d.ts`.
- Contrato y esquema: `src/envio.ts`, que comparten el emisor y el Worker, y
  `migrations/0004_lo_que_manda_el_emisor.sql`.
- Emisor: `src/emisor/armar-envio.ts`, `src/emisor/enviar.ts` y `src/emisor/principal.ts`.
- Tests: `tests/worker/envio.test.ts`, `tests/emisor/emisor.test.ts` y
  `tests/emisor/ejemplos/` (un catálogo y una respuesta de Prometheus).
- Configuración y documentación: `vitest.config.ts` (el token de los tests),
  `docs/adr/0015-el-envio-del-emisor.md`, `docs/adr/README.md` y `README.md` (arranque rápido y las
  variables del emisor).
- En el commit siguiente: `docs/backlog.md` (el tilde, S8, S9 y la imagen en el parkeado de
  publicación) y esta entrada.

**Gate:** `npm run gate`

**Las decisiones, primero.**
- **De contenedor a stack:** la decidió el usuario y quedó en
  [ADR-0014](adr/0014-la-salud-de-adentro-llega-con-la-etiqueta-del-stack.md), en su propio commit
  (`9302de0`). `infra` le suma la etiqueta `stack` a `infra_contenedor_sano`, y el pedido quedó en
  la nota compartida de la sesión de `infra`.
- **El envío:** [ADR-0015](adr/0015-el-envio-del-emisor.md) lo escribí antes del test y el usuario
  lo aceptó. Decide:
  - la ruta, `POST /api/report`;
  - el token, el secreto `EMISOR_TOKEN`, comparado con `timingSafeEqual` sobre los SHA-256;
  - las respuestas: 401 sin leer el cuerpo, 400 si el cuerpo no cumple el contrato, sin escribir
    nada, y 204 si lo acepta;
  - la escritura: la lista nueva reemplaza la vieja sin borrar historia, y la hora del envío es la
    del Worker;
  - el emisor: si Prometheus no contesta, manda la salud en `null`; si el catálogo no se puede
    leer, no manda nada.

**Rojo.** El backlog esperaba que la ruta de envío contestara 404 y que el emisor no existiera:
- **El emisor:** fue lo esperado, no existía.
- **El endpoint:** los tests cayeron antes de llegar a la ruta, porque la tabla `envios` tampoco
  existía.
- **Los 29 tests de antes** siguieron en verde.

El gate corta en `tsc`:

```
> status@0.0.0 gate
> tsc --noEmit && tsc --noEmit -p tsconfig.worker.json && tsc --noEmit -p tsconfig.pagina.json && npm run lint && vitest run

tests/emisor/emisor.test.ts(3,26): error TS2307: Cannot find module '../../src/emisor/armar-envio.ts' or its corresponding type declarations.
tests/emisor/emisor.test.ts(4,28): error TS2307: Cannot find module '../../src/emisor/enviar.ts' or its corresponding type declarations.
tests/emisor/emisor.test.ts(5,26): error TS2307: Cannot find module '../../src/envio.ts' or its corresponding type declarations.
tests/emisor/emisor.test.ts(51,35): error TS7006: Parameter 'componente' implicitly has an 'any' type.
tests/emisor/emisor.test.ts(60,35): error TS7006: Parameter 'componente' implicitly has an 'any' type.
```

Y `npx vitest run`:

```
     × sin token, con uno equivocado o mal formado contesta 401 y no escribe nada 25ms
     × con el token guarda los componentes del catálogo, la salud de cada uno y la hora del envío 2ms
     × un cuerpo que no cumple el contrato contesta 400 y no escribe nada 2ms
     × sólo acepta POST 1ms
 FAIL  |node| tests/emisor/emisor.test.ts [ tests/emisor/emisor.test.ts ]
Error: Cannot find module '../../src/emisor/armar-envio.ts' imported from P:/status/tests/emisor/emisor.test.ts
 FAIL  |worker| tests/worker/envio.test.ts > el envío del emisor > sin token, con uno equivocado o mal formado contesta 401 y no escribe nada
Error: D1_ERROR: no such table: envios: SQLITE_ERROR
 Test Files  2 failed | 6 passed (8)
      Tests  4 failed | 29 passed (33)
```

**En el camino a verde.** Un rojo del lint (`preserve-caught-error`): el error de un catálogo que
no es JSON no llevaba la causa original. Ahora la lleva.

**De punta a punta, en local.** Levanté:
- el Worker con `wrangler dev`, con la migración 0004 aplicada al D1 local y un token de
  desarrollo en `.dev.vars`, que después borré;
- un Prometheus de mentira que servía `tests/emisor/ejemplos/prometheus.json`;
- el emisor de verdad (`node src/emisor/principal.ts`), contra el catálogo de ejemplo.

Lo que salió:

```
2026-11-02T18:26:32.696Z Se descarta la ficha de portafolio: la url tiene que empezar con https://.
```

En el D1 local quedaron:
- `bot_discord` con `sano_adentro` 0, porque uno de sus contenedores está mal;
- `museo` con 1;
- `neonduel` con `null`, porque no tiene series;
- la hora del envío, en `envios`.

`nonograma`, que el catálogo marca apagado, salió de la lista. Con el token equivocado, el emisor
anotó `El Worker contestó 401: Unauthorized`.

**Verde:**

```

> status@0.0.0 gate
> tsc --noEmit && tsc --noEmit -p tsconfig.worker.json && tsc --noEmit -p tsconfig.pagina.json && npm run lint && vitest run


> status@0.0.0 lint
> eslint . --max-warnings=0


 RUN  v4.1.12 P:/status


 Test Files  8 passed (8)
      Tests  40 passed (40)
   Start at  15:27:30
   Duration  1.31s (transform 195ms, setup 458ms, import 231ms, tests 825ms, environment 0ms)

GATE_EXIT=0
```

**Lo que no cubre el gate:**
- `principal.ts`, la entrada que lee las variables y repite cada minuto, no tiene test; lo cubrió
  la prueba de punta a punta.
- La imagen del emisor y el secreto del Worker en Cloudflare siguen en el parkeado de publicación.
- La API y la página todavía no muestran lo que manda el emisor: son S8 y S9.

**Sha:** `500da8a`

## S8 — La API, la página y el MCP muestran el nombre y la descripción de la ficha · 2026-11-02

**Archivos:**
- Código: `src/estado.ts`, `src/worker/estado.ts`, `src/worker/mcp.ts` y `src/pagina/renderizar.ts`.
- Tests: `tests/worker/api.test.ts`, `tests/worker/mcp.test.ts`, `tests/pagina/renderizar.test.ts`
  y `tests/worker/sembrar.ts`, que ahora también siembra la ficha.
- En el commit siguiente: `docs/backlog.md` (el tilde) y esta entrada.

**Gate:** `npm run gate`

**Sin ADR.** [ADR-0011](adr/0011-la-api-publica-de-estado.md) ya decidía que lo que trae S4 entra
como campos nuevos. La forma quedó en el tipo público (`src/estado.ts`):
- `name` es un texto, o `null` hasta que el emisor manda la ficha;
- `description` trae siempre `en` y `es`, con `null` en el idioma que la ficha no trae.

**Dos tests de antes cambiaron, porque cambió el contrato que fijaban:**
- la lista exacta de campos de cada componente de la API suma los dos nuevos;
- el resultado exacto de `get_component` suma la ficha.

**Rojo**, el esperado: la respuesta de la API no trae `name`. Tampoco lo traía `get_component`, y
la página mostraba el `id`. Los 38 tests restantes siguieron en verde.

```
     × con la ficha, muestra el nombre y la descripción en el idioma elegido, o en el otro si trae uno solo 6ms
     × da el estado de ahora y los 90 días de cada componente, en inglés y sin campos internos 26ms
     × cada componente trae el nombre y la descripción de su ficha, y sin ficha todavía, nulos 16ms
     × el estado de un componente es el de la API, con su ficha y sin la lista de días 27ms
AssertionError: expected [ 'days', 'id', 'last_check', …(3) ] to deeply equal [ 'days', 'description', 'id', …(5) ]
AssertionError: expected [ { id: 'bot_discord', …(2) }, …(2) ] to deeply equal [ { id: 'bot_discord', …(2) }, …(2) ]
AssertionError: expected { id: 'neonduel', …(4) } to deeply equal { id: 'neonduel', …(6) }
AssertionError: expected 'status.nicolasdalessandro.dev Estado …' to contain 'Neonduel está caído.'
 Test Files  3 failed | 5 passed (8)
      Tests  4 failed | 38 passed (42)
```

El gate cortó antes, en `tsc`, porque el tipo público todavía no tenía `name`:

```
tests/pagina/renderizar.test.ts(23,9): error TS2353: Object literal may only specify known properties, and 'name' does not exist in type 'ComponentePublico'.
```

**A mano, en local.** Con `wrangler dev` y las fichas que dejó en el D1 local la prueba de S4, la
página muestra "Audio", "Museo" y "Neonduel", con la descripción de la ficha.

**Verde:**

```

> status@0.0.0 gate
> tsc --noEmit && tsc --noEmit -p tsconfig.worker.json && tsc --noEmit -p tsconfig.pagina.json && npm run lint && vitest run


> status@0.0.0 lint
> eslint . --max-warnings=0


 RUN  v4.1.12 P:/status


 Test Files  8 passed (8)
      Tests  42 passed (42)
   Start at  15:30:38
   Duration  1.40s (transform 220ms, setup 481ms, import 278ms, tests 833ms, environment 0ms)

GATE_EXIT=0
```

**Sha:** `982c791`

## S9 — La salud de adentro se ve en la API, la página y el MCP · 2026-11-02

**Archivos:**
- Código: `src/estado.ts`, `src/worker/estado.ts`, `src/worker/mcp.ts`,
  `src/pagina/renderizar.ts`, `src/pagina/textos.ts` y `public/estilos.css`.
- Diseño: `DESIGN.md` y `.impeccable/design.json`.
- Tests: `tests/worker/api.test.ts`, `tests/worker/mcp.test.ts`, `tests/pagina/renderizar.test.ts`
  y `tests/worker/sembrar.ts`, que ahora también siembra la salud de adentro y la hora del envío.
- En el commit siguiente: `docs/backlog.md` (el tilde) y esta entrada.

**Gate:** `npm run gate`

**Las decisiones, primero.** El usuario decidió las dos cosas que S9 esperaba, y quedaron en
[ADR-0016](adr/0016-el-estado-con-fallas-y-el-corte-del-emisor.md), en su propio commit
(`89a1bda`):
- **Un estado más:** un servicio con la URL arriba y algo de adentro no sano sale `degraded`
  ("Degraded" / "Con fallas").
- **El corte:** lo de adentro sale sin datos si el último envío tiene más de 5 minutos.

**El diseño, con impeccable** (ADR-0008). Es una extensión del mundo de `DESIGN.md`, sin ronda de
direcciones:
- **La palabra** va en bermellón, porque algo está caído, aunque sea adentro.
- **La marca** va partida, con la mitad de arriba en bermellón y la de abajo en negro. Es la misma
  gramática que la barra de un día con un corte.
- **El estado general** nombra primero lo caído y después lo que anda con fallas.

Lo miré en una sola tanda, en escritorio claro, escritorio oscuro y celular oscuro. El detector
sobre `public/estilos.css` sólo marcó los tamaños sueltos que ya estaban parkeados.

**Dos tests de antes cambiaron, porque cambió el contrato que fijaban:**
- la lista exacta de campos de la API suma `inside`;
- el resultado exacto de `get_component` también.

**Rojo**, el esperado: la respuesta de la API no trae la salud de adentro, y la página no conoce el
estado nuevo. Los 40 tests restantes siguieron en verde. El gate corta en `tsc`:

```
tests/pagina/renderizar.test.ts(25,9): error TS2353: Object literal may only specify known properties, and 'inside' does not exist in type 'ComponentePublico'.
tests/pagina/renderizar.test.ts(36,9): error TS2353: Object literal may only specify known properties, and 'inside' does not exist in type 'ComponentePublico'.
tests/pagina/renderizar.test.ts(116,53): error TS2322: Type '"degraded"' is not assignable to type 'EstadoDeComponente'.
```

Y `npx vitest run`:

```
     × un componente con fallas adentro dice Degraded o Con fallas, y el estado general lo nombra 8ms
     × da el estado de ahora y los 90 días de cada componente, en inglés y sin campos internos 27ms
     × con un envío reciente trae la salud de adentro, y la URL arriba con algo de adentro no sano sale degraded 25ms
     × sin envío en los últimos 5 minutos, lo de adentro sale sin datos y el estado vuelve a salir de afuera 24ms
     × el estado de un componente es el de la API, con su ficha y sin la lista de días 31ms
 Test Files  3 failed | 5 passed (8)
      Tests  5 failed | 40 passed (45)
```

**A mano, en local.** Con `wrangler dev`, el emisor de verdad mandó `bot_discord` con un contenedor
no sano, y sembré sondas recientes. La API devolvió:

```
[('bot_discord', 'degraded', 'unhealthy'), ('museo', 'up', 'healthy'), ('neonduel', 'down', 'no_data')]
```

La página dijo "Neonduel is down. Audio is degraded.", con Audio en "Degraded" y su marca partida.

**Verde:**

```

> status@0.0.0 gate
> tsc --noEmit && tsc --noEmit -p tsconfig.worker.json && tsc --noEmit -p tsconfig.pagina.json && npm run lint && vitest run


> status@0.0.0 lint
> eslint . --max-warnings=0


 RUN  v4.1.12 P:/status


 Test Files  8 passed (8)
      Tests  45 passed (45)
   Start at  16:28:39
   Duration  1.46s (transform 259ms, setup 570ms, import 273ms, tests 1.08s, environment 1ms)

GATE_EXIT=0
```

**Sha:** `2f5ac23`

## S10 — El CI publica el Worker y la imagen del emisor · 2026-11-02

**Archivos:**
- La publicación: `.github/workflows/publicar.yml`, `Dockerfile` y `.dockerignore`.
- Configuración: `wrangler.jsonc` (`workers_dev: false`, y dónde va el `database_id`),
  `package.json` y `package-lock.json` (`yaml` 2.9.1, para leer el workflow en el test).
- Test y documentación: `tests/publicacion.test.ts` y `README.md` (la publicación).
- En el commit siguiente: `docs/backlog.md` (el tilde) y esta entrada.

**Gate:** `npm run gate`, y además `docker build`.

**La decisión, primero.** El usuario decidió cómo se publica, y quedó en
[ADR-0017](adr/0017-como-se-publica.md), en su propio commit (`d6fcbe2`):
- **El repo:** público en GitHub.
- **El CI:** publica el Worker con un token acotado a Workers Scripts y D1, y la imagen en GHCR.
- **El dominio:** es un Custom Domain que se crea a mano y que el OpenTofu de `infra` sigue en
  lectura.

**El test lee los archivos que publican.** El CI corre en GitHub y no se puede correr acá, así que
el test fija que el workflow, el `Dockerfile` y `wrangler.jsonc` digan lo que el ADR decidió:
- sólo `main`, y el gate antes de publicar;
- las migraciones remotas antes de `wrangler deploy`, y los secretos de Cloudflare sólo en ese
  trabajo;
- un runner arm, con `:latest` y `:<sha>`;
- la imagen final sin `node_modules` y sin root;
- `workers_dev: false`.

**Rojo**, el esperado: el workflow no existe. Los 45 tests de antes siguieron en verde.

```
 FAIL  |node| tests/publicacion.test.ts [ tests/publicacion.test.ts ]
Error: ENOENT: no such file or directory, open 'P:\status\.github\workflows\publicar.yml'
 Test Files  1 failed | 8 passed (9)
      Tests  45 passed (45)
GATE_EXIT=1
```

**El `docker build` encontró lo que el test no veía.** Con el workflow y el `Dockerfile` escritos,
el gate dio verde, pero el primer `docker build` falló en el `npm run gate` de adentro.
- **La causa:** workerd no arranca sin certificados de CA, y `node:24-bookworm-slim` no los trae.
  Los tests de Node pasaron y los del Worker no corrieron:

```
#13 4.445 service internet: TLS configuration: unexpected error: No CA certificates were loaded from the system
#13 4.761 Caused by: MiniflareCoreError [ERR_RUNTIME_FAILURE]: The Workers runtime failed to start. There was likely a problem with the workerd binary or your configuration.
ERROR: failed to build: failed to solve: process "/bin/sh -c npm run gate" did not complete successfully: exit code: 1
```

- **La aserción, primero.** Sumé al test que la etapa del gate tiene que instalar
  `ca-certificates`, y lo vi fallar
  (`expected 'node:24-bookworm-slim AS gate\nWORKDI…' to match /apt-get install[^\n]*\bca-certificate…/`).
- **El arreglo.** Después lo agregué al `Dockerfile`.
- **Una trampa en la verificación.** El primer build corrió en segundo plano dentro de un comando
  que terminaba con un `echo`. La notificación dijo exit 0, pero el que salió bien fue el `echo`.
  El código real de `docker build` estaba anotado en la salida: 1.

**La imagen, construida** (Docker 29.8.2, en amd64; el CI construye en arm con el mismo
`Dockerfile`):

```
#14 6.415  Test Files  9 passed (9)
DOCKER_BUILD_EXIT=0
status-emisor:local 244MB
--- sin variables:
Falta la variable de entorno PROMETHEUS_URL.
exit=1
--- usuario y archivos:
node
package.json
src
sin node_modules
v24.22.2
```

**Verde:**

```

> status@0.0.0 gate
> tsc --noEmit && tsc --noEmit -p tsconfig.worker.json && tsc --noEmit -p tsconfig.pagina.json && npm run lint && vitest run


> status@0.0.0 lint
> eslint . --max-warnings=0


 RUN  v4.1.12 P:/status


 Test Files  9 passed (9)
      Tests  50 passed (50)
   Start at  17:15:00
   Duration  1.77s (transform 532ms, setup 519ms, import 1.16s, tests 1.15s, environment 1ms)

GATE_EXIT=0
```

**Lo que no se probó:**
- El workflow no corrió nunca, porque el repo todavía no está en GitHub.
- El deploy necesita los pasos de una vez de ADR-0017.

**Sha:** `a552372`
