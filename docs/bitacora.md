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
