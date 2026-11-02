# ADR-0010 — Los tests del Worker usan `@cloudflare/vitest-plugin` con Vitest 4, y el gate chequea dos programas de TypeScript

- **Estado:** aceptado (decidido por el usuario el 2026-11-02)
- **Fecha:** 2026-11-02
- **Decide:** con qué paquete corren los tests del Worker en workerd, con qué Vitest, y cómo
  chequea los tipos el gate.
- **Reemplaza:** la parte de [ADR-0001](0001-typescript-vitest-4-y-gate-en-el-host.md) que nombra
  el paquete del pool de Workers y el `tsc --noEmit` del gate. El resto de ADR-0001 sigue en pie.

## Contexto

ADR-0001 eligió `@cloudflare/vitest-pool-workers` con Vitest 4, porque la 0.23.0 pide
`vitest ^4.1.0`. En S1 (2026-11-02) apareció que esa versión es la última: el paquete está
deprecado ("renamed to @cloudflare/vitest-plugin. This package will not receive future updates",
según `npm view`), y el gate lo avisaba en cada corrida. De las 17 vulnerabilidades que daba
`npm audit`, las 6 altas (`undici`, `zod`, `sharp`) venían de las dependencias que fija el pool;
las 11 moderadas, de `minimatch` por eslint, son de antes y no dependen de esto.

El sucesor, `@cloudflare/vitest-plugin` 1.4.12 (publicado el 2026-11-01), expone la misma API
(`cloudflareTest`, `readD1Migrations` y el módulo `cloudflare:test`) y pide
`vitest ^4.1.0 || ^5.0.0`. Se cumple el "se revisa si" de ADR-0001.

S1 mostró, además, que en un solo programa de TypeScript los globales de Node y los de Workers
chocan: con los dos juegos de tipos, el `URL` global de `tests/harness.test.ts` pasó a ser el de
Workers, y `readFileSync` dejó de aceptarlo.

## Decisión

- **Los tests del Worker corren con `@cloudflare/vitest-plugin`**, en versión exacta. El `wrangler`
  del repo va en la misma versión exacta que fija el plugin, así no hay dos.
- **Vitest sigue en 4** (`^4.1`). El usuario eligió el sucesor sin cambiar de versión mayor
  (2026-11-02). Pasar a Vitest 5, como el hub, queda para cuando haga falta.
- **El gate chequea dos programas de TypeScript**: el de Node (`tsconfig.json`) y el del Worker
  (`tsconfig.worker.json`, con los tipos de workerd y del plugin, sin los de Node). El gate queda
  `tsc --noEmit && tsc --noEmit -p tsconfig.worker.json && eslint . --max-warnings=0 && vitest run`.
- **La fecha de compatibilidad del Worker no puede ser posterior a la del workerd que trae el
  plugin**, y `@cloudflare/workers-types` va en la versión de esa fecha.

## Consecuencias

**A favor:**

- El harness vuelve a recibir arreglos, y el gate deja de avisar del deprecado.
- Vitest 5 queda a un cambio de versión, sin cambiar de paquete.
- El código de Node no ve los globales de workerd, y el del Worker no ve `Buffer` ni `process`, que
  en workerd no están.

**En contra:**

- El plugin es joven (la 1.0.0 es del 2026-08-20) y saca versiones casi a diario: se fija la
  versión exacta, y se sube a mano.
- Vitest sigue en otra versión mayor que la del hub.
- Hay dos `tsconfig`: una carpeta nueva del Worker que no entre en `tsconfig.worker.json` no se
  chequea con los tipos de workerd.

**Se revisa si:** el plugin deja de soportar Vitest 4, o hace falta algo de Vitest 5 que use el hub.

## Alternativas consideradas

- **Quedarse con `@cloudflare/vitest-pool-workers` 0.23.0.** Anda hoy, pero no recibe arreglos, y lo
  que fija tiene vulnerabilidades conocidas.
- **El sucesor con Vitest 5, como el hub.** Deja una sola versión de Vitest en los repos de `P:\`,
  pero cambia dos cosas a la vez. El usuario prefirió no hacerlo ahora.
- **Un solo programa de TypeScript, con `URL` importado de `node:url` donde haga falta.** Arregla el
  síntoma, pero el código de Node seguiría viendo los globales de workerd, y el del Worker los de
  Node.
