# Status

La página de status pública de `nicolasdalessandro.dev`, en `status.nicolasdalessandro.dev`, al
estilo de discordstatus.com: si cada proyecto publicado en la VPS está andando y su historia de los
últimos 90 días. Lo mismo se lee por un MCP remoto de sólo lectura, así cualquier cliente (Claude,
por ejemplo) puede preguntar "¿está andando museo?".

Corre en un Worker de Cloudflare, fuera de la VPS que mide: la página son archivos estáticos, la API
y el MCP leen D1, y un cron prueba las URLs públicas desde afuera cada minuto. Lo que sólo se ve de
adentro (la salud de cada contenedor) lo manda la VPS con un emisor que vive en este repo y que
despliega [`infra`](../infra). TypeScript en todo el repo.

## Arranque rápido

Todavía no hay nada que levantar: el primer ítem que lo necesite escribe esta sección.

## El gate

```bash
npm run gate
```

Corre en el host con Node 24, como el del hub: no hay servicios aparte, y nada de lo que corre
toca la cuenta de Cloudflare.

Un solo archivo, para iterar más rápido:

```bash
npx vitest run tests/harness.test.ts
```

> **Ojo con los pipes.** `comando | tail -20` devuelve el exit code de `tail`,
> que es siempre 0: te oculta el rojo. Corré sin pipe, o cerrá con
> `; echo "EXIT=$?"`.

## Cómo se construye esto

Con TDD, un ítem por iteración:

- **Qué falta:** [docs/backlog.md](docs/backlog.md)
- **Qué se hizo y con qué evidencia:** [docs/bitacora.md](docs/bitacora.md)
- **Por qué está así:** [docs/adr/](docs/adr/)
- **Cómo se ve:** [PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md) y la maqueta de
  [diseno/](diseno/README.md)

Una iteración se corre con `/tdd` (el protocolo está en
[.claude/commands/tdd.md](.claude/commands/tdd.md)). El branch de trabajo es
`loop/construccion`.

Para dejarlo iterando solo:

```
/loop /tdd
```
