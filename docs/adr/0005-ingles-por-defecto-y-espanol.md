# ADR-0005 — Inglés por defecto y español; el MCP, en inglés

- **Estado:** aceptado (decidido por el usuario el 2026-11-02)
- **Fecha:** 2026-11-02
- **Decide:** en qué idioma habla el status con quien lo usa desde afuera.

## Contexto

Los sitios de `nicolasdalessandro.dev` son bilingües: el hub (su ADR-0008) y las fichas `x-hub`
de `infra` traen sus textos en español y en inglés. Este proyecto es además para el CV, donde el
público es, por defecto, el que lee inglés.

Una tool de MCP tiene un solo nombre y una sola descripción: no tiene selector de idioma.

## Decisión

- **La página está en inglés y en español, con inglés por defecto.** Se muestra en inglés salvo que
  el visitante elija español.
- **Lo que se lee desde afuera sin elegir idioma va en inglés:** los nombres y las descripciones de
  las tools del MCP, los textos que devuelven, y las rutas y los campos de la API pública.
- **Los nombres y las descripciones de cada componente** salen de su ficha, que ya los trae en los
  dos idiomas.
- **El código sigue en español**, como en todos los repos: los nombres públicos (tools, rutas,
  campos) son datos de la interfaz, no identificadores.

## Consecuencias

**A favor:** el MCP y la API los puede usar cualquiera, y la página sigue la línea de los demás
sitios.

**En contra:** dos idiomas en el mismo código: un campo público en inglés se mapea desde un tipo con
nombres en español.

**Se revisa si:** el status deja de ser parte del CV, o aparece un público que pida otro idioma.

## Alternativas consideradas

- **Sólo inglés.** Más simple, pero rompe con el resto de los sitios, que son bilingües.
- **Español por defecto.** Coherente con el código, con menos alcance para el CV.
