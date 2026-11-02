# ADR-0006 — El MCP es remoto, público, sin login y de sólo lectura

- **Estado:** aceptado (propuesto el 2026-11-02; confirmado por el usuario el 2026-11-02)
- **Fecha:** 2026-11-02
- **Decide:** cómo se ofrece el MCP, quién lo puede usar y qué puede hacer.

## Contexto

La idea del usuario (2026-11-01): una página de status cuyos datos, que son de sólo lectura, se
puedan leer también por un MCP. Es un proyecto para el CV, así que importa que se pueda mostrar
rápido.

Un MCP remoto, por HTTP, se agrega como conector con una URL, sin instalar nada. Uno local (stdio)
hay que instalarlo antes de usarlo.

Que un status se lea por MCP no es nuevo: productos como Instatus ya lo ofrecen. Lo que distingue a
este es de dónde salen los datos, no la idea.

Todo lo que el status sabe ya es público: la página lo muestra a cualquiera.

## Decisión

- **El MCP vive en `/mcp` del mismo Worker**, por Streamable HTTP y sin estado: cada pedido se
  contesta solo, sin sesiones ni Durable Objects.
- **Sin login:** lo que devuelve ya está en la página.
- **Sólo lectura, sobre las mismas funciones que la API:** el estado general, el de un componente y
  su historia (y los incidentes, cuando existan). Ninguna tool escribe.
- **Ninguna tool acepta consultas libres** (ni PromQL ni SQL). Los parámetros son el nombre de un
  componente y una cantidad de días, y se validan.

## Consecuencias

**A favor:** se muestra en un paso: se agrega la URL en Claude y se le pregunta. No guarda estado
y gasta del mismo cupo que la API.

**En contra:**

- Gasta de los 100.000 pedidos por día
  ([ADR-0002](0002-corre-en-un-worker-de-cloudflare-en-el-plan-free.md)): un cliente que pregunte
  sin parar se come el cupo.
- La especificación de MCP sigue cambiando: la librería va fijada y hay que subirla a mano.

**Se revisa si:** el MCP necesita datos privados. Eso sería otro MCP, con login, no éste.

## Alternativas consideradas

- **Un MCP local (stdio), publicado en npm, que lea la API pública.** Hay que instalarlo antes de
  usarlo: menos demostrable, y otro paquete que publicar.
- **El MCP privado por `ssh vps`**, discutido el 2026-11-01 en `infra`. Contesta otras preguntas
  (cuánta RAM usa un contenedor, qué dicen los logs) y no puede ser público.
