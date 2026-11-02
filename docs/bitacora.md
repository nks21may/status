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
