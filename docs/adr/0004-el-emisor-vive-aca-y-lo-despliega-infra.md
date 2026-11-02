# ADR-0004 — El emisor vive en este repo, se publica como imagen en GHCR y lo despliega `infra`

- **Estado:** aceptado (decidido por el usuario el 2026-11-02)
- **Fecha:** 2026-11-02
- **Decide:** dónde vive el código del emisor de la VPS, cómo llega al host y qué parte es de
  `infra`.

## Contexto

En `infra` las apps viven en sus propios repos y sólo publican imágenes en GHCR; qué corre en la
VPS, y cómo, se decide allá (su `CLAUDE.md` y su ADR-0002). El usuario lo pidió para este proyecto
también: `infra` sólo se encarga de los deploys (2026-11-02).

El emisor ([ADR-0003](0003-la-vps-empuja-lo-de-adentro.md)) corre en la VPS, pero su lógica (qué
leer de Prometheus, cómo armar el resumen, el contrato con el Worker) es de este proyecto.

## Decisión

- **El código del emisor vive en este repo**, en TypeScript, y comparte con el Worker el tipo del
  cuerpo del POST ([ADR-0001](0001-typescript-vitest-4-y-gate-en-el-host.md)).
- **Se publica como imagen en GHCR**, bajo `ghcr.io/nks21may/`, como las demás apps.
- **Cómo corre es de `infra`:** su stack, la red, el secreto, los reinicios. Lo que el emisor
  necesita lo recibe por variables de entorno: la URL de Prometheus, la ruta del catálogo, la URL
  del Worker y el token.
- **Este repo no toca la VPS.** Lo que necesita de allá se pide como ítem en el backlog de `infra`.

## Consecuencias

**A favor:** `infra` sigue siendo sólo deploys y config. El emisor se testea acá, con respuestas de
Prometheus y catálogos de ejemplo.

**En contra:** el contrato entre la imagen y el stack (las variables de entorno) vive en dos repos:
se documenta en el README de acá, y un cambio necesita un commit en cada uno.

**Se revisa si:** el emisor necesita algo del host que no se le puede pasar por variables ni por un
montaje de sólo lectura.

## Alternativas consideradas

- **El emisor como herramienta de `infra`**, en Python, junto a `bin/verificar`. Lógica de la app en
  el repo de deploys, que es lo que el usuario no quiere, y el contrato escrito en dos lenguajes.
- **Alertmanager como emisor.** Su config es de `infra` y sólo manda alertas: no dice que todo sigue
  bien ([ADR-0003](0003-la-vps-empuja-lo-de-adentro.md)).
