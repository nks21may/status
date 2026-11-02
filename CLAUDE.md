# Notas para trabajar en este repo

## Qué es

La página de status pública de `nicolasdalessandro.dev`, en `status.nicolasdalessandro.dev`, al
estilo de discordstatus.com: si cada proyecto publicado en la VPS está andando y su historia de los
últimos 90 días. Lo mismo se lee por un MCP remoto de sólo lectura, así cualquier cliente (Claude,
por ejemplo) puede preguntar "¿está andando museo?".

Corre en un Worker de Cloudflare, fuera de la VPS que mide: la página son archivos estáticos, la API
y el MCP leen D1, y un cron prueba las URLs públicas desde afuera cada minuto. Lo que sólo se ve de
adentro (la salud de cada contenedor) lo manda la VPS con un emisor que vive en este repo y que
despliega [`infra`](../infra). TypeScript en todo el repo.

Antes de proponer un diseño, leé el [índice de ADR](docs/adr/README.md). Casi
todo lo que parece una decisión abierta ya está decidido y con motivo.

## Reglas que no se negocian desde el código

Cada una tiene un ADR detrás. Un cambio que las viole se rechaza en review,
aunque los tests pasen.

1. **TypeScript en todo el repo, y el gate es `npm run gate`.** Vitest 4, con los tests del Worker
   en `workerd` y un D1 local con `@cloudflare/vitest-plugin`; el Worker es un programa de TypeScript
   aparte, sin los globales de Node; el contrato del POST es un tipo que comparten el emisor y el
   Worker. [ADR-0001](docs/adr/0001-typescript-vitest-4-y-gate-en-el-host.md) y
   [ADR-0010](docs/adr/0010-los-tests-del-worker-usan-vitest-plugin-con-vitest-4.md)
2. **Corre en un Worker de Cloudflare, fuera de la VPS, en el plan Free.** Nada que cobre lo que se
   pasa de su cupo: ni Workers Paid ni R2. Un producto nuevo de Cloudflare entra con un ADR que dice
   su cupo gratis. [ADR-0002](docs/adr/0002-corre-en-un-worker-de-cloudflare-en-el-plan-free.md)
3. **El Worker nunca le pregunta nada a la VPS.** Lo de adentro llega por el POST autenticado del
   emisor, y la página, la API y el MCP sólo leen D1.
   [ADR-0003](docs/adr/0003-la-vps-empuja-lo-de-adentro.md)
4. **El emisor vive acá y lo despliega `infra`.** Este repo publica la imagen; cómo y dónde corre
   se decide allá. Este repo no toca la VPS.
   [ADR-0004](docs/adr/0004-el-emisor-vive-aca-y-lo-despliega-infra.md)
5. **Inglés por defecto y español.** La página está en los dos idiomas y arranca en inglés; las
   tools del MCP y la API pública, en inglés. El código, en español.
   [ADR-0005](docs/adr/0005-ingles-por-defecto-y-espanol.md)
6. **El MCP es público, sin login y de sólo lectura**, en `/mcp` del mismo Worker y sin estado.
   Ninguna tool escribe ni acepta consultas libres: sólo el nombre de un componente y una cantidad
   de días, validados. [ADR-0006](docs/adr/0006-el-mcp-es-remoto-publico-y-de-solo-lectura.md)
7. **Los componentes salen del catálogo del hub**: un componente es una ficha visible, y la lista
   la manda el emisor. Ningún componente se escribe a mano en este repo.
   [ADR-0007](docs/adr/0007-los-componentes-salen-del-catalogo-del-hub.md)
8. **El diseño de la página sale de `PRODUCT.md` y `DESIGN.md`**, escritos con `impeccable` antes
   de S2. Un color, una tipografía o un espaciado que no sale de ahí es un hallazgo de review.
   [ADR-0008](docs/adr/0008-la-pagina-se-disena-con-impeccable.md)
9. **La historia es una fila por componente y por día UTC**, con dos contadores (minutos medidos y
   arriba) y la última sonda; un componente se identifica por su `stack`, y un minuto arriba es un
   2xx después de seguir las redirecciones. El esquema cambia sólo con una migración nueva, nunca
   editando una aplicada. [ADR-0009](docs/adr/0009-la-historia-es-una-fila-por-componente-y-por-dia-utc.md)

## Convenciones

- **Código y documentación en español**, incluidos nombres de funciones,
  modelos y variables. Los nombres públicos (tools del MCP, rutas y campos de la API) van en inglés
  ([ADR-0005](docs/adr/0005-ingles-por-defecto-y-espanol.md)).
- Los identificadores no llevan tildes ni `ñ` (`tamano_bytes`, no
  `tamaño_bytes`); los comentarios y docstrings sí, con ortografía correcta.
- El lint y el formato **los corre el gate**, así que no hay que acordarse: un
  hallazgo es un rojo como cualquier otro.
- Los tests van en `tests/`, nombrados por comportamiento y no por función:
  `un componente sin medición reciente sale sin datos`, no `estado 2`.
- Los imports llevan la extensión `.ts`, como en el hub.

## Cómo se construye

Con TDD, un ítem del [backlog](docs/backlog.md) por iteración, con el protocolo
de [.claude/commands/tdd.md](.claude/commands/tdd.md). Branch: `loop/construccion`.

El ciclo es rojo → verde → refactor, en un solo commit. **El test se escribe
antes que el código**, y se verifica que falle con el error esperado: un test
que nunca falló es indistinguible de no tener test.

## El gate

```bash
npm run gate
```

Corre en el host con Node 24, como el del hub: no hay servicios aparte, y nada de lo que corre
toca la cuenta de Cloudflare ([ADR-0001](docs/adr/0001-typescript-vitest-4-y-gate-en-el-host.md)). **Nada está hecho si no lo dice un comando con exit 0** — no
reportes un ítem como resuelto en base a tu lectura del diff.

Cuidado con los pipes: `comando | tail` devuelve el exit code de `tail` y te
oculta el rojo.

## De dónde salen las decisiones

De la conversación del 2026-11-01 y el 2026-11-02 en una sesión de `P:\infra`, leyendo los repos
hermanos y la VPS en lugar de suponer:

- **`P:\infra`**: qué corre en la VPS y cómo. Sus ADR-0008 (R2 y la falta de tope de gasto en
  Cloudflare), 0009 (costo cero), 0013 (Prometheus en loopback) y 0027 (las fichas `x-hub` y
  `catalogo.json`); `stacks/metricas/` (las sondas de blackbox y las alertas) y las fichas de cada
  `stacks/*/compose.yml`. Lo que este repo necesita de allá se pide como ítem en el backlog de
  `infra`, no se toca desde acá.
- **`P:\hub`**: el modelo de stack, gate e imagen en TypeScript, y el formato de la ficha y del
  catálogo (su ADR-0010).
- **La VPS**, leída por `ssh vps` el 2026-11-02: los targets de Prometheus y las etiquetas de
  `infra_contenedor_sano`.
- **La documentación de Cloudflare** de límites y precios de Workers, archivos estáticos y D1,
  consultada el 2026-11-02.
