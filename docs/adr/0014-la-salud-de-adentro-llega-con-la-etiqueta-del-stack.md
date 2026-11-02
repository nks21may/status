# ADR-0014 — La salud de adentro llega con la etiqueta del stack, que suma `infra`

- **Estado:** aceptado (decidido por el usuario el 2026-11-02)
- **Fecha:** 2026-11-02
- **Decide:** cómo se pasa de la salud de cada contenedor a la de cada componente. Es lo que
  [ADR-0007](0007-los-componentes-salen-del-catalogo-del-hub.md) dejó para antes de S4.

## Contexto

Un componente es una ficha del catálogo de `infra`, y se identifica por su `stack`: el nombre de
su carpeta en `stacks/` (ADR-0007 y ADR-0009). La salud de adentro está en la métrica
`infra_contenedor_sano` de Prometheus, que escribe el deploy de `infra`
(`herramientas/deploy.py`, `metricas_de_contenedores`). Lleva una sola etiqueta, `nombre`: el del
contenedor, que no siempre coincide con el del stack (`neonduel-neonduel-1` es de `neonduel`;
`discord-voice-bridge`, de `bot_discord`).

El deploy de `infra` levanta cada stack con `docker compose --project-name <stack>` (leído en
`herramientas/deploy.py` el 2026-11-02). Así, cada contenedor lleva la etiqueta de Docker
`com.docker.compose.project` con el nombre del stack.

ADR-0007 dejó dos caminos: que `infra` le sume a la métrica la etiqueta del stack, o una tabla en
algún lado.

## Decisión

- **`infra` le suma a `infra_contenedor_sano` la etiqueta `stack`**, tomada de la etiqueta
  `com.docker.compose.project` de cada contenedor. Queda
  `infra_contenedor_sano{nombre="discord-voice-bridge",stack="bot_discord"}`. El cambio es de
  `infra` y se pide como ítem en su backlog: este repo no lo toca (ADR-0004).
- **El emisor agrupa por `stack`:** un componente está sano por dentro si todos sus contenedores
  están sanos, y no lo está si alguno da 0.
- **Un componente sin ninguna serie con su `stack` va sin datos de adentro**, igual que cuando se
  cortan los envíos (ADR-0003). Mientras `infra` no publique la etiqueta, todos los componentes
  van así, y el status sigue con lo que mide desde afuera.
- **Un contenedor sin la etiqueta `stack`** (uno que no levantó el deploy) no cuenta para ningún
  componente.

## Consecuencias

**A favor:**

- Ninguna lista se escribe a mano: un stack nuevo trae su etiqueta y su ficha en el mismo commit
  de `infra`, como pide ADR-0007.
- Un stack con varios contenedores se resume en uno solo, sin que este repo sepa cuáles son.

**En contra:**

- El formato de la métrica pasa a tener un lector más: si `infra` cambia la etiqueta, el emisor
  deja de encontrar la salud. El contrato vive en dos repos y se documenta en los dos.
- Hasta que `infra` despliegue el cambio, no hay salud de adentro.

**Se revisa si:** `infra` deja de usar el nombre del stack como nombre del proyecto de compose, o
un componente pasa a depender de contenedores de otro stack.

## Alternativas consideradas

- **Una tabla de contenedor a stack en este repo.** Es otra lista escrita a mano, que se
  desactualiza en silencio cuando `infra` suma o renombra un contenedor. Es lo que ADR-0007
  descarta para los componentes.
- **Deducir el stack del nombre del contenedor** (`<stack>-<servicio>-<n>`). Anda con los nombres
  que pone compose, pero no con un `container_name` fijo como `discord-voice-bridge`.
