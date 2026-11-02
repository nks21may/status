# ADR de Status

Architecture Decision Records. Un archivo por decisión, numerado, append-only:
una decisión que cambia **no se edita**, se escribe una nueva que la reemplaza y
la vieja pasa a estado `reemplazado por`. El historial es el punto.

Plantilla: [0000-plantilla.md](0000-plantilla.md).

| # | Decisión | Estado |
|---|---|---|
| [0001](0001-typescript-vitest-4-y-gate-en-el-host.md) | TypeScript en todo el repo, Vitest 4 con el pool de Workers, gate `npm run gate` en el host | aceptado |
| [0002](0002-corre-en-un-worker-de-cloudflare-en-el-plan-free.md) | Corre en un Worker de Cloudflare, fuera de la VPS, en el plan Free | aceptado |
| [0003](0003-la-vps-empuja-lo-de-adentro.md) | La VPS empuja lo de adentro; el Worker no le pregunta nada a la VPS | aceptado |
| [0004](0004-el-emisor-vive-aca-y-lo-despliega-infra.md) | El emisor vive en este repo, se publica como imagen en GHCR y lo despliega `infra` | aceptado |
| [0005](0005-ingles-por-defecto-y-espanol.md) | Inglés por defecto y español; el MCP, en inglés | aceptado |
| [0006](0006-el-mcp-es-remoto-publico-y-de-solo-lectura.md) | El MCP es remoto, público, sin login y de sólo lectura | aceptado |
| [0007](0007-los-componentes-salen-del-catalogo-del-hub.md) | Los componentes salen del catálogo del hub, y los manda el emisor | aceptado |
| [0008](0008-la-pagina-se-disena-con-impeccable.md) | La página se diseña con la skill `impeccable`, antes de S2 | aceptado |
| [0009](0009-la-historia-es-una-fila-por-componente-y-por-dia-utc.md) | La historia en D1 es una fila por componente y por día UTC; un minuto arriba es un 2xx | propuesto |

## Cuándo escribir uno

Cuando la decisión sea cara de revertir: una pieza de infraestructura, un límite
entre componentes, un formato que se persiste, una postura de seguridad.

**No** hace falta para elegir una librería de utilidad, nombrar un módulo o
acomodar un layout de carpetas.

Si durante el loop TDD aparece una decisión de este calibre, el protocolo
([.claude/commands/tdd.md](../../.claude/commands/tdd.md)) manda parar y escribir
el ADR **antes** del test.
