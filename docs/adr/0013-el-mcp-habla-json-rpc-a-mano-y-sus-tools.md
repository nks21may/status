# ADR-0013 — El MCP habla JSON-RPC a mano, sin el SDK, con tres tools de sólo lectura

- **Estado:** aceptado (propuesto por la iteración S3 del loop el 2026-11-02; confirmado por el
  usuario el 2026-11-02)
- **Fecha:** 2026-11-02
- **Decide:** con qué se implementa el MCP de `/mcp`, qué parte del protocolo habla y cuáles son sus
  tools, con sus nombres y parámetros públicos.

## Contexto

[ADR-0006](0006-el-mcp-es-remoto-publico-y-de-solo-lectura.md) decidió un MCP remoto en `/mcp`,
por Streamable HTTP, sin estado, sin login y de sólo lectura. Sus tools son el estado general, el
de un componente y su historia, con parámetros validados: el nombre de un componente y una cantidad
de días. Entre sus consecuencias dice que "la librería va fijada", pero no eligió ninguna.

El SDK oficial, `@modelcontextprotocol/sdk` 1.32.2 (consultado el 2026-11-02):

- trae como dependencias express, hono, cors, ajv, jose y eventsource, entre otras;
- valida los esquemas con ajv, que compila código con `new Function`, y workerd no lo permite. Para
  Workers hay que sumarle `@cfworker/json-schema`, que el SDK declara como dependencia opcional;
- en modo sin estado arma un servidor y un transporte por pedido.

El plan Free da **10 ms de CPU por pedido**
([ADR-0002](0002-corre-en-un-worker-de-cloudflare-en-el-plan-free.md)).

Sin estado, lo que el MCP tiene que hablar es poco:
- `initialize`, `ping`, `tools/list` y `tools/call`, por JSON-RPC 2.0;
- en un `POST /mcp` que contesta un solo JSON;
- las notificaciones, que no tienen respuesta.

## Decisión

- **El protocolo se implementa a mano, sin el SDK.** Es JSON-RPC 2.0 sobre `POST /mcp`, siempre
  con una respuesta `application/json` y sin SSE.
  - **Una notificación** (un mensaje sin `id`) contesta 202, sin cuerpo.
  - **`GET` y `DELETE` en `/mcp`** contestan 405: no hay sesiones ni stream que abrir.
  - **Un método desconocido** da el error JSON-RPC -32601, y una tool desconocida el -32602, como
    pide la especificación. Un JSON que no se puede leer da el -32700.
- **Versiones:** si el cliente pide una que el servidor conoce (`2025-11-25`, `2025-06-18` o
  `2025-03-26`), contesta con ésa; si no, con la más nueva. Cuando la especificación cambie, se
  revisa a mano, como ya preveía ADR-0006.
- **Las tools**, con nombres y descripciones en inglés (ADR-0005), todas con
  `readOnlyHint: true`:
  - `get_status`, sin parámetros: devuelve lo mismo que `GET /api/status` (ADR-0011).
  - `get_component`, con `component`: el `id` del componente. Devuelve su estado de ahora, su
    última sonda y la disponibilidad de los 90 días, sin la lista de días.
  - `get_component_history`, con `component` y `days` (un entero de 1 a 90; si falta, 90).
    Devuelve los últimos `days` días y la disponibilidad de ese tramo.
- **Cada resultado va dos veces:** como `structuredContent` y como texto con el mismo JSON, para
  los clientes que sólo leen texto.
- **Un parámetro que no sirve es un error de la tool** (`isError: true`), con un mensaje que dice
  qué estuvo mal: un componente que no existe (con la lista de los que hay), o `days` fuera de
  rango o que no es un entero. Nunca es un 500.
- **Las tools leen con la misma función que la API** (`leerEstado`), así dicen lo mismo.

## Consecuencias

**A favor:**

- No hay dependencias nuevas, y cada pedido hace lo justo, lejos de los 10 ms de CPU.
- Lo que el MCP contesta está entero en el repo y con test, incluida la validación.
- La página, la API y el MCP salen de una sola lectura de D1 (`PRODUCT.md`: "un dato, tres
  puertas").

**En contra:**

- Las actualizaciones de la especificación no llegan solas: lo que cambie (una versión nueva, un
  campo obligatorio) se sigue a mano.
- Sin SSE, el servidor no puede mandar notificaciones ni pedidos al cliente. Con tools de sólo
  lectura no hace falta.
- Sin CORS, un cliente MCP que corre en el navegador no puede llamarlo; los conectores de Claude
  llaman desde el servidor.

**Se revisa si:** el MCP necesita algo más que tools (recursos, prompts, notificaciones), o la
especificación cambia el transporte de forma que mantenerlo a mano cueste más que el SDK.

## Alternativas consideradas

- **El SDK oficial con su transporte para estándares web.** Es la implementación de referencia,
  pero suma una docena de dependencias, pide un validador aparte para correr en workerd y arma un
  servidor por pedido con los 10 ms de CPU del plan Free.
- **`createMcpHandler` del paquete `agents` de Cloudflare.** Envuelve el mismo SDK y suma el
  paquete de agentes, pensado para Durable Objects, que ADR-0006 dejó afuera.
- **Una sola tool que lo devuelva todo.** Obligaría al modelo a leer los 90 días de todos los
  componentes para contestar "¿está andando museo?".
