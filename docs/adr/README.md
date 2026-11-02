# ADR de Status

Architecture Decision Records. Un archivo por decisión, numerado, append-only:
una decisión que cambia **no se edita**, se escribe una nueva que la reemplaza y
la vieja pasa a estado `reemplazado por`. El historial es el punto.

Plantilla: [0000-plantilla.md](0000-plantilla.md).

| # | Decisión | Estado |
|---|---|---|
| [0001](0001-typescript-vitest-4-y-gate-en-el-host.md) | TypeScript en todo el repo, Vitest 4 con el pool de Workers, gate `npm run gate` en el host | aceptado; en parte reemplazado por [0010](0010-los-tests-del-worker-usan-vitest-plugin-con-vitest-4.md) |
| [0002](0002-corre-en-un-worker-de-cloudflare-en-el-plan-free.md) | Corre en un Worker de Cloudflare, fuera de la VPS, en el plan Free | aceptado |
| [0003](0003-la-vps-empuja-lo-de-adentro.md) | La VPS empuja lo de adentro; el Worker no le pregunta nada a la VPS | aceptado |
| [0004](0004-el-emisor-vive-aca-y-lo-despliega-infra.md) | El emisor vive en este repo, se publica como imagen en GHCR y lo despliega `infra` | aceptado |
| [0005](0005-ingles-por-defecto-y-espanol.md) | Inglés por defecto y español; el MCP, en inglés | aceptado |
| [0006](0006-el-mcp-es-remoto-publico-y-de-solo-lectura.md) | El MCP es remoto, público, sin login y de sólo lectura | aceptado |
| [0007](0007-los-componentes-salen-del-catalogo-del-hub.md) | Los componentes salen del catálogo del hub, y los manda el emisor | aceptado; el paso de contenedor a stack, en [0014](0014-la-salud-de-adentro-llega-con-la-etiqueta-del-stack.md) |
| [0008](0008-la-pagina-se-disena-con-impeccable.md) | La página se diseña con la skill `impeccable`, antes de S2 | aceptado |
| [0009](0009-la-historia-es-una-fila-por-componente-y-por-dia-utc.md) | La historia en D1 es una fila por componente y por día UTC; un minuto arriba es un 2xx | aceptado |
| [0010](0010-los-tests-del-worker-usan-vitest-plugin-con-vitest-4.md) | Los tests del Worker usan `@cloudflare/vitest-plugin` con Vitest 4; el gate chequea dos programas de TypeScript | aceptado; en parte reemplazado por [0012](0012-la-pagina-la-arma-el-navegador.md) |
| [0011](0011-la-api-publica-de-estado.md) | La API pública de estado: `GET /api/status`, y qué es "up", "down" y "no_data" | aceptado |
| [0012](0012-la-pagina-la-arma-el-navegador.md) | La página es un archivo estático que arma el navegador; el gate chequea tres programas de TypeScript | aceptado |
| [0013](0013-el-mcp-habla-json-rpc-a-mano-y-sus-tools.md) | El MCP habla JSON-RPC a mano, sin el SDK, con tres tools de sólo lectura | aceptado |
| [0014](0014-la-salud-de-adentro-llega-con-la-etiqueta-del-stack.md) | La salud de adentro llega con la etiqueta del stack, que suma `infra` | aceptado |
| [0015](0015-el-envio-del-emisor.md) | El envío del emisor: `POST /api/report` con un token, y la última lista reemplaza a la anterior | aceptado |

## Cuándo escribir uno

Cuando la decisión sea cara de revertir: una pieza de infraestructura, un límite
entre componentes, un formato que se persiste, una postura de seguridad.

**No** hace falta para elegir una librería de utilidad, nombrar un módulo o
acomodar un layout de carpetas.

Si durante el loop TDD aparece una decisión de este calibre, el protocolo
([.claude/commands/tdd.md](../../.claude/commands/tdd.md)) manda parar y escribir
el ADR **antes** del test.
