# ADR-0007 — Los componentes salen del catálogo del hub, y los manda el emisor

- **Estado:** propuesto
- **Fecha:** 2026-11-02
- **Decide:** qué es un componente del status, de dónde sale la lista y la URL que se prueba.

## Contexto

`infra` ya tiene una lista de lo publicado, legible por máquina (su ADR-0027): cada stack que
expone algo a internet lleva una ficha `x-hub`, y el deploy junta todas en
`/srv/cache/hub/catalogo.json` en cada ciclo. El formato es el del ADR-0010 del hub. Una ficha
visible trae `nombre`, `url` y `descripcion` en español e inglés. El catálogo también lleva las
`oculto`, con su motivo, y si cada stack está `apagado`.

Hoy (2026-11-02) hay seis fichas visibles: Surf & Bhop Daily, Audio, Museo, Neonduel, Nonograma y
Portfolio. Minecraft y el hub van `oculto`.

La salud de adentro no viene por stack. `infra_contenedor_sano` lleva el nombre del contenedor
(`nombre="neonduel-neonduel-1"`, `nombre="discord-voice-bridge"`), que no siempre coincide con el
del stack (`neonduel`, `bot_discord`).

## Decisión

- **Un componente es una ficha visible del catálogo**: ni `oculto` ni de un stack `apagado`. Es el
  mismo filtro que el del hub (su ADR-0005).
- **Su nombre y sus descripciones salen de la ficha, y la sonda prueba su `url`.**
- **El catálogo lo manda el emisor**, en cada POST junto con la salud, leyendo el archivo que
  `infra` le monte de sólo lectura. El Worker se queda con la última lista que recibió: si la VPS
  se cae, la lista sigue y las sondas también.
- **Antes de S4 se decide cómo se pasa de contenedor a stack**: que `infra` le sume a la métrica la
  etiqueta del stack, o una tabla en algún lado.

## Consecuencias

**A favor:** publicar algo y que aparezca en el hub y en el status es el mismo commit en `infra`.
El Worker no le pregunta nada a la VPS
([ADR-0003](0003-la-vps-empuja-lo-de-adentro.md)).

**En contra:**

- El formato de la ficha pasa a tener tres lectores: el gate de `infra`, el hub y el status. Si
  cambia la `version` del catálogo, cambian los tres.
- Hasta el primer envío del emisor no hay componentes ni sondas.
- Lo que no tiene ficha no aparece en el status, aunque corra en la VPS.

**Se revisa si:** el hub cambia la `version` del catálogo, o el status necesita componentes que no
son proyectos publicados (el túnel, la VPS misma).

## Alternativas consideradas

- **Que el Worker pida el `catalogo.json` público del hub.** Es un pedido a la VPS por el túnel:
  cuando el túnel se cae, el Worker se queda sin lista. Y si sólo la cachea, es lo mismo que recibirla
  del emisor, pero con un camino más.
- **La lista escrita a mano en este repo.** Otra lista que mantener, y que se desactualiza en
  silencio cuando `infra` publica algo nuevo.
