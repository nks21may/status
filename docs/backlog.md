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

Chequea tres programas de TypeScript: el de Node (`tsconfig.json`), el del Worker
(`tsconfig.worker.json`), que ve los globales de workerd y no los de Node
([ADR-0010](adr/0010-los-tests-del-worker-usan-vitest-plugin-con-vitest-4.md)), y el de la página
(`tsconfig.pagina.json`), que ve los del DOM
([ADR-0012](adr/0012-la-pagina-la-arma-el-navegador.md)).

---

## Fase 0 — Fundaciones

- [x] **S0 — Harness y estructura.** El gate corre, tiene el lint adentro,
      sabe ponerse rojo y da verde. Lo arma la sesión de preparación, no el loop.

---

## Fase 1 — El status de punta a punta

- [x] **S1 — El cron prueba cada URL pública y suma el minuto a la historia del día.** *Depende de S0.*
      *Test:* con dos componentes en D1, uno cuya URL contesta 200 y otro 503 (con el `fetch`
      simulado), una corrida del handler `scheduled` le suma un minuto medido a los dos y un minuto
      arriba sólo al primero, en la fila del día UTC, y guarda la latencia de la última sonda de
      cada uno.
      **Se espera rojo:** el Worker no tiene handler `scheduled`, así que no hay fila del día.
      Trae el pool de Workers de Vitest y el D1 local
      ([ADR-0001](adr/0001-typescript-vitest-4-y-gate-en-el-host.md)). Ver
      [ADR-0002](adr/0002-corre-en-un-worker-de-cloudflare-en-el-plan-free.md).

- [x] **S2 — La API pública da el estado y los 90 días de cada componente, y la página lo muestra.** *Depende de S1.*
      *Test:* con D1 sembrado, el `GET` de la API de estado contesta 200 con una entrada por
      componente: su estado actual y una por cada uno de los últimos 90 días, en inglés y sin campos
      internos. Un componente sin sonda en los últimos minutos sale sin datos, no como arriba. La
      página, servida como archivo estático, pide esa API y muestra un renglón por componente, en
      inglés, y en español si el visitante lo elige.
      **Se espera rojo:** la ruta de la API contesta 404.
      La página se arma contra `PRODUCT.md` y `DESIGN.md`
      ([ADR-0008](adr/0008-la-pagina-se-disena-con-impeccable.md)), y se lleva `estilos.css` y las
      tipografías de la maqueta de [`diseno/`](../diseno/README.md). La maqueta muestra lo que la API
      tiene que dar: la URL de la ficha (la descripción llega con el emisor, en S4), la hora y la
      latencia de la última sonda, los minutos medidos y arriba de cada día, y la disponibilidad de
      los 90 días.
      Ver [ADR-0002](adr/0002-corre-en-un-worker-de-cloudflare-en-el-plan-free.md) y
      [ADR-0005](adr/0005-ingles-por-defecto-y-espanol.md).

- [x] **S3 — El MCP remoto contesta en `/mcp` con las tools de sólo lectura.** *Depende de S2.*
      *Test:* un cliente MCP contra `/mcp` hace `initialize`; `tools/list` devuelve las tools del
      estado general, de un componente y de su historia, con nombres y descripciones en inglés; y
      `tools/call` del estado general devuelve lo mismo que la API de S2. Un nombre de componente que
      no existe o una cantidad de días fuera de rango devuelve un error de la tool, no un 500.
      **Se espera rojo:** `POST /mcp` contesta 404.
      Ver [ADR-0006](adr/0006-el-mcp-es-remoto-publico-y-de-solo-lectura.md) y
      [ADR-0005](adr/0005-ingles-por-defecto-y-espanol.md).

- [x] **S4 — La VPS manda lo de adentro: el endpoint autenticado y el emisor.** *Depende de S1.*
      *Test:* el `POST` de envío sin token, o con uno equivocado, contesta 401 y no escribe nada; con
      el token guarda los componentes del catálogo, la salud de cada uno y la hora del envío. El
      emisor, con una respuesta de Prometheus de ejemplo (`infra_contenedor_sano` con la etiqueta
      `stack`) y un `catalogo.json` de ejemplo, arma el cuerpo con el tipo que comparte con el
      Worker: un componente es sano si todos sus contenedores lo son, y sin series va sin datos de
      adentro.
      **Se espera rojo:** la ruta de envío contesta 404, y el emisor no existe.
      Ver [ADR-0003](adr/0003-la-vps-empuja-lo-de-adentro.md),
      [ADR-0004](adr/0004-el-emisor-vive-aca-y-lo-despliega-infra.md),
      [ADR-0007](adr/0007-los-componentes-salen-del-catalogo-del-hub.md) y
      [ADR-0014](adr/0014-la-salud-de-adentro-llega-con-la-etiqueta-del-stack.md).
      ⚠️ **seguridad.**

### Lo que salió de S1

- [x] **S5 — Sin componentes, el cron termina sin escribir y sin error.** *Depende de S1.*
      *Test:* con la tabla de componentes vacía (lo normal hasta el primer envío de S4), una
      corrida del handler `scheduled` resuelve y no deja filas en la historia.
      **Se espera rojo:** `D1_ERROR: No SQL statements detected.`: `sondear` le pasa a `batch` una
      lista vacía. Verificado el 2026-11-02 con un test descartable que no quedó en el árbol.

- [x] **S6 — Una sonda que no contesta cuenta como minuto abajo y no corta las demás.** *Depende de S1.*
      *Test:* con tres componentes, uno que contesta 200, uno cuyo `fetch` rechaza (error de red) y
      uno que no contesta en 10 s, una corrida suma un minuto medido a los tres y uno arriba sólo
      al primero.
      **Se espera rojo:** el rechazo del `fetch` hace fallar el `Promise.all` de `sondear`, y la
      corrida no deja ninguna fila.
      Ver [ADR-0009](adr/0009-la-historia-es-una-fila-por-componente-y-por-dia-utc.md): el timeout
      de 10 s es el de `http_2xx` en blackbox.

- [x] **S7 — Una corrida repetida para el mismo minuto no suma dos veces.** *Depende de S1.*
      *Test:* dos corridas con la misma hora programada dejan un minuto medido, no dos.
      **Se espera rojo:** `minutos_medidos` queda en 2.
      Es el "en contra" de [ADR-0009](adr/0009-la-historia-es-una-fila-por-componente-y-por-dia-utc.md),
      y necesita una migración nueva (la hora de la última sonda).

### Lo que salió de S4

- [x] **S8 — La API, la página y el MCP muestran el nombre y la descripción de la ficha.** *Depende de S4.*
      *Test:* con un envío guardado, cada componente de `GET /api/status` trae `name` y
      `description` (con `en` y `es`, o el que tenga la ficha), y `get_component` del MCP también.
      La página muestra el nombre en lugar del `id`, y la descripción en el idioma elegido, o en el
      otro si la ficha trae uno solo. Un componente sin ficha todavía (antes del primer envío) sale
      con su `id`.
      **Se espera rojo:** la respuesta de la API no trae `name`.
      Ver [ADR-0011](adr/0011-la-api-publica-de-estado.md) (lo que trae S4 entra como campos nuevos)
      y [ADR-0015](adr/0015-el-envio-del-emisor.md).

- [x] **S9 — La salud de adentro se ve en la API, la página y el MCP.** *Depende de S4.*
      *Test:* con un envío de hace menos de 5 minutos, la API trae `inside` en cada componente, y un
      componente con la URL arriba y algo de adentro no sano sale `degraded`; sin envío en los
      últimos 5 minutos, `inside` sale `no_data` y el estado vuelve a salir de afuera. La página
      dice "Degraded" / "Con fallas" y lo nombra en el estado general.
      **Se espera rojo:** la respuesta de la API no trae la salud de adentro.
      Ver [ADR-0016](adr/0016-el-estado-con-fallas-y-el-corte-del-emisor.md). El cambio visual pasa
      por impeccable y actualiza `DESIGN.md` (ADR-0008).

### Lo que salió de la publicación

- [x] **S10 — El CI publica el Worker y la imagen del emisor.** *Depende de S4.*
      *Test:* el workflow `.github/workflows/publicar.yml` corre sólo en `main`, con el gate antes
      de publicar. Aplica las migraciones remotas antes de `wrangler deploy`, con los secretos
      `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`. Publica `ghcr.io/nks21may/status-emisor` con
      `:latest` y `:<sha>` desde un runner arm. La imagen final del `Dockerfile` corre
      `node src/emisor/principal.ts` sin `node_modules` y sin root, y `wrangler.jsonc` tiene
      `workers_dev: false`. Además, `docker build` termina con exit 0.
      **Se espera rojo:** el workflow y el `Dockerfile` no existen.
      Ver [ADR-0017](adr/0017-como-se-publica.md).

### Lo que pidió `infra`

- [ ] **S11 — El emisor tiene un `/healthz` en loopback, para el healthcheck de `infra`.** *Depende de S4.*
      *Test:* el emisor levanta un servidor HTTP en `127.0.0.1`, en el puerto de `PUERTO_SALUD`, o
      en 8460 si la variable falta. `GET /healthz` contesta:
      - 503 antes del primer envío;
      - 200 después de un envío que el Worker aceptó;
      - 503 si el último envío falló, o si el último que salió bien tiene más de 3 minutos (el
        ciclo se trabó).

      Cualquier otra ruta contesta 404.
      **Se espera rojo:** el servidor de salud no existe.
      El pedido es de la sesión de `infra`, el 2026-11-02: su gate le exige a todo servicio un
      healthcheck que consulte `127.0.0.1`, y su deploy vuelve a la imagen anterior si el
      contenedor no queda healthy. Su I85 (el stack del emisor) depende de esto. El healthcheck de
      allá es `wget --no-verbose --tries=1 --spider http://127.0.0.1:<puerto>/healthz`, con el
      `wget` de busybox de la imagen. El puerto queda en el README de acá, e `infra` lo registra a
      nombre del stack `status`.

---

## Parkeados

Ideas que todavía no son trabajo tomable: les falta una decisión del usuario o un
dato. Van **sin checkbox** para que el loop no las tome ni las cuente.

- **Incidentes, en dos capas.** Se abren y se cierran solos con las alertas de Alertmanager que
  tiene sentido mostrar (`UrlCaida`, `ContenedorUnhealthy`, `TunelSinConexiones`), por webhook; y
  la explicación de qué pasó va por commit en este repo. Las alertas internas (`DiscoCasiLleno`,
  `DeployFallando`) no salen. *Falta:* que el usuario decida si entran y en qué fase. El webhook es
  un cambio en `infra`.
- **La visibilidad de la imagen en GHCR.** De los pasos de una vez de
  [ADR-0017](adr/0017-como-se-publica.md) sólo queda éste. El repo, la base D1, el token, los
  secretos y el Custom Domain se hicieron el 2026-11-02. *Falta:* que el usuario la deje igual que
  la de `hub`, para que la VPS pueda bajarla.
- **El lado de `infra`.** Cinco cosas:
  - el stack del emisor, en la red del host, para llegar a Prometheus por loopback;
  - el token, cifrado con sops;
  - el catálogo, montado de sólo lectura;
  - la etiqueta `stack` en `infra_contenedor_sano`, tomada de `com.docker.compose.project`
    ([ADR-0014](adr/0014-la-salud-de-adentro-llega-con-la-etiqueta-del-stack.md));
  - el Custom Domain `status.nicolasdalessandro.dev`, importado en el OpenTofu de lectura
    ([ADR-0017](adr/0017-como-se-publica.md)).

  *Falta:* se piden como ítems en el backlog de `infra`. La etiqueta se puede pedir ya; el stack
  del emisor, cuando exista la imagen (S10); el Custom Domain, cuando el usuario lo cree.
- **El empaquetado del Worker en el gate.** ADR-0001 dice que se suma al gate cuando llegue el
  Worker, y el Worker llegó con S1. `wrangler deploy --dry-run --outdir <dir>` empaqueta sin tocar
  la cuenta, pero el protocolo (punto 0.4) dice "nada de `wrangler deploy`". *Falta:* que el
  usuario diga si el `--dry-run` entra, o con qué otro comando se empaqueta.
- **Un abuso de la API o del MCP agota el cupo del día.** Pasados los 100.000 pedidos, la API y el
  MCP contestan error hasta la medianoche UTC. *Falta:* decidir si se cachea en el borde, se pone
  una regla de rate limit (verificar qué da el plan Free), o se acepta.
- **La página se actualiza sola.** Hoy pide el estado una vez, al cargar: una pestaña abierta se
  queda con la foto de ese momento, aunque el cron mida cada minuto. *Falta:* decidir cómo se
  prueba, porque ADR-0012 dejó sin test lo que toca el navegador.
- **Los tamaños sueltos de `public/estilos.css` pasan a tokens.** El documentador de `DESIGN.md`
  marcó los del emisor, el código del talón, el eje, los meses y la marca. *Falta:* es CSS sin
  test; se hace con impeccable, y `DESIGN.md` cambia en el mismo commit (ADR-0008).
