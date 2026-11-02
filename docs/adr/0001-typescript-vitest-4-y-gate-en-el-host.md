# ADR-0001 — TypeScript en todo el repo, Vitest 4 con el pool de Workers, gate `npm run gate` en el host

- **Estado:** aceptado (propuesto el 2026-11-02; confirmado por el usuario el 2026-11-02). El
  paquete del pool y el `tsc` del gate, reemplazados por
  [ADR-0010](0010-los-tests-del-worker-usan-vitest-plugin-con-vitest-4.md)
- **Fecha:** 2026-11-02
- **Decide:** en qué lenguaje se escriben las tres piezas del repo, con qué se testean y qué comando
  dice que algo está hecho.

## Contexto

El repo tiene tres piezas que corren en tres lugares distintos:

- **el Worker** ([ADR-0002](0002-corre-en-un-worker-de-cloudflare-en-el-plan-free.md)), que corre
  en `workerd`, el runtime de Cloudflare, y lee y escribe D1;
- **la página**, archivos estáticos que corren en el navegador;
- **el emisor** ([ADR-0004](0004-el-emisor-vive-aca-y-lo-despliega-infra.md)), que corre en la VPS,
  en un contenedor.

El usuario eligió TypeScript para el emisor (2026-11-02) para tener un solo lenguaje y que el
contrato del POST entre el emisor y el Worker sea un tipo compartido. La alternativa, Python, deja
el contrato escrito dos veces: es lo que ya paga `infra` con el catálogo del hub, cuyo formato
"vive en dos validadores mantenidos a mano" (ADR-0027 de `infra`).

El repo hermano `P:\hub` usa TypeScript con Vitest 5 y corre el gate en el host con Node 24 (su
ADR-0001). Pero el pool de Workers de Vitest, que corre los tests adentro de `workerd` con un D1
local, no acompaña esa versión: `@cloudflare/vitest-pool-workers` 0.23.0 pide `vitest ^4.1.0` como
peer (`npm view`, 2026-11-02).

## Decisión

- **TypeScript en las tres piezas**, con un solo `package.json`. El cuerpo del POST del emisor es un
  tipo que importan los dos lados.
- **Vitest 4** (`^4.1`), no el 5 del hub. Los tests del Worker corren en `workerd` con
  `@cloudflare/vitest-pool-workers` y un D1 local, sin cuenta de Cloudflare y sin red. Lo que no es
  del Worker (el emisor, la lógica pura) corre en Node. El pool entra con el primer ítem que tiene
  Worker (S1).
- **El gate es `npm run gate`**: `tsc --noEmit && eslint . --max-warnings=0 && vitest run`. Con el
  lint adentro y `--max-warnings=0`, un hallazgo es un rojo. Cuando lleguen el Worker y la página,
  su empaquetado sin publicar se suma al gate: un import que sólo se rompe al empaquetar es un rojo
  y no una sorpresa en el deploy.
- **El gate corre en el host, con Node 24**, como el del hub. No hay servicios aparte: `workerd` y
  D1 vienen como dependencias de npm.

## Consecuencias

**A favor:** un solo lenguaje, y un cambio en el contrato del POST lo ve `tsc` en los dos lados.
Los tests del Worker ejercen el runtime y el SQL de D1 de verdad, no un doble.

**En contra:**

- Vitest no es la misma versión que en el hub: lo que se aprenda allá de Vitest 5 no siempre aplica
  acá.
- El pool de Workers es 0.x: puede romper entre versiones menores.
- El emisor corre en un contenedor con su propio Node: su imagen tiene que fijar la misma versión
  mayor que el host.

**Se revisa si:** el pool de Workers pasa a soportar Vitest 5, o el emisor necesita algo que Node
no hace bien.

## Alternativas consideradas

- **Vitest 5, como el hub, con el Worker testeado en Node y D1 simulado.** Los tests no ejercerían
  `workerd` ni el SQL real de D1: el error que importa, el que sólo aparece en el runtime de
  Cloudflare, quedaría afuera del gate.
- **El gate en Docker.** No hay nada que aislar: ni servicios ni un intérprete distinto. El hub
  llegó a lo mismo.
- **El emisor en Python.** Descartado por el usuario: dos lenguajes y el contrato duplicado a mano.
