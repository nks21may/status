# Backlog de construcción — Status

Worklist del loop TDD. El protocolo por iteración está en
[.claude/commands/tdd.md](../.claude/commands/tdd.md) y se invoca con `/tdd`.

Cada ítem es **una iteración y un commit**, con su ciclo rojo → verde → refactor
adentro. La suite queda verde al final de cada uno.

Branch: `loop/construccion`. Alcance: sólo el repo `status`.

**El backlog cita símbolos por nombre, nunca por línea.** Cada commit invalida los
números de línea; los nombres sobreviven.

## Cómo se escribe un ítem

Un checkbox markdown (sin tildar, o tildado cuando se cierra) seguido de:

```
**SN — Qué hace, en una línea.** *Depende de SM.*
*Test:* el comportamiento que el test fija, en términos observables.
**Se espera rojo:** la falla concreta que tiene que dar antes del código.
Ver [ADR-NNNN](adr/NNNN-....md) si lo sostiene una decisión.
⚠️ **pérdida de datos** / ⚠️ **seguridad**, cuando corresponda.
```

Un ítem que no dice qué test lo cierra no está listo para el loop.

## Archivos intocables

Vacío. Si al empezar una iteración `git status --short` muestra cambios que **no**
son de ella, se anotan acá y **no** entran en su commit.

## El gate

```bash
npm run gate
```

---

## Fase 0 — Fundaciones

- [x] **S0 — Harness y estructura.** El gate corre, tiene el lint adentro,
      sabe ponerse rojo y da verde. Lo arma la sesión de preparación, no el loop.

---

## Fase 1 — El status de punta a punta

- [ ] **S1 — El cron prueba cada URL pública y suma el minuto a la historia del día.** *Depende de S0.*
      *Test:* con dos componentes en D1, uno cuya URL contesta 200 y otro 503 (con el `fetch`
      simulado), una corrida del handler `scheduled` le suma un minuto medido a los dos y un minuto
      arriba sólo al primero, en la fila del día UTC, y guarda la latencia de la última sonda de
      cada uno.
      **Se espera rojo:** el Worker no tiene handler `scheduled`, así que no hay fila del día.
      Trae el pool de Workers de Vitest y el D1 local
      ([ADR-0001](adr/0001-typescript-vitest-4-y-gate-en-el-host.md)). Ver
      [ADR-0002](adr/0002-corre-en-un-worker-de-cloudflare-en-el-plan-free.md).

- [ ] **S2 — La API pública da el estado y los 90 días de cada componente, y la página lo muestra.** *Depende de S1.*
      *Test:* con D1 sembrado, el `GET` de la API de estado contesta 200 con una entrada por
      componente: su estado actual y una por cada uno de los últimos 90 días, en inglés y sin campos
      internos. Un componente sin sonda en los últimos minutos sale sin datos, no como arriba. La
      página, servida como archivo estático, pide esa API y muestra un renglón por componente, en
      inglés, y en español si el visitante lo elige.
      **Se espera rojo:** la ruta de la API contesta 404.
      Ver [ADR-0002](adr/0002-corre-en-un-worker-de-cloudflare-en-el-plan-free.md) y
      [ADR-0005](adr/0005-ingles-por-defecto-y-espanol.md).

- [ ] **S3 — El MCP remoto contesta en `/mcp` con las tools de sólo lectura.** *Depende de S2.*
      *Test:* un cliente MCP contra `/mcp` hace `initialize`; `tools/list` devuelve las tools del
      estado general, de un componente y de su historia, con nombres y descripciones en inglés; y
      `tools/call` del estado general devuelve lo mismo que la API de S2. Un nombre de componente que
      no existe o una cantidad de días fuera de rango devuelve un error de la tool, no un 500.
      **Se espera rojo:** `POST /mcp` contesta 404.
      Ver [ADR-0006](adr/0006-el-mcp-es-remoto-publico-y-de-solo-lectura.md) y
      [ADR-0005](adr/0005-ingles-por-defecto-y-espanol.md).

- [ ] **S4 — La VPS manda lo de adentro: el endpoint autenticado y el emisor.** *Depende de S1, y de
      que el usuario decida cómo se pasa de contenedor a stack (ADR-0007): hasta entonces, no es
      tomable.*
      *Test:* el `POST` de envío sin token, o con uno equivocado, contesta 401 y no escribe nada; con
      el token guarda los componentes del catálogo, la salud de cada uno y la hora del envío. El
      emisor, con una respuesta de Prometheus de ejemplo (`infra_contenedor_sano`) y un
      `catalogo.json` de ejemplo, arma el cuerpo con el tipo que comparte con el Worker.
      **Se espera rojo:** la ruta de envío contesta 404, y el emisor no existe.
      Ver [ADR-0003](adr/0003-la-vps-empuja-lo-de-adentro.md),
      [ADR-0004](adr/0004-el-emisor-vive-aca-y-lo-despliega-infra.md) y
      [ADR-0007](adr/0007-los-componentes-salen-del-catalogo-del-hub.md).
      ⚠️ **seguridad.**

---

## Parkeados

Ideas que todavía no son trabajo tomable: les falta una decisión del usuario o un
dato. Van **sin checkbox** para que el loop no las tome ni las cuente.

- **Incidentes, en dos capas.** Se abren y se cierran solos con las alertas de Alertmanager que
  tiene sentido mostrar (`UrlCaida`, `ContenedorUnhealthy`, `TunelSinConexiones`), por webhook; y
  la explicación de qué pasó va por commit en este repo. Las alertas internas (`DiscoCasiLleno`,
  `DeployFallando`) no salen. *Falta:* que el usuario decida si entran y en qué fase. El webhook es
  un cambio en `infra`.
- **Cómo se publican el Worker, la imagen del emisor y el dominio.** El Worker y la imagen, ¿desde
  el CI de este repo, con un token de Cloudflare que sólo toque Workers y el de GHCR que ya usan las
  demás apps? El dominio `status.`, ¿lo crea Wrangler o lo maneja OpenTofu en `infra` (su
  ADR-0018)? *Falta:* la decisión del usuario, con su ADR acá y en `infra`.
- **El lado de `infra`.** El stack del emisor (en la red del host, para llegar a Prometheus por
  loopback), el token cifrado con sops, y el catálogo montado de sólo lectura. *Falta:* que exista
  la imagen (S4); se pide como ítem en el backlog de `infra`.
- **Un abuso de la API o del MCP agota el cupo del día.** Pasados los 100.000 pedidos, la API y el
  MCP contestan error hasta la medianoche UTC. *Falta:* decidir si se cachea en el borde, se pone
  una regla de rate limit (verificar qué da el plan Free), o se acepta.
