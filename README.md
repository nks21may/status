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

El Worker en local, con su D1 local. Nada de esto toca la cuenta de Cloudflare:

```bash
npx wrangler d1 migrations apply status --local
```

```bash
npx wrangler dev
```

`wrangler dev` empaqueta la página antes de arrancar (`npm run build:pagina`). Para probar el
envío del emisor, el Worker necesita su token en `.dev.vars`, que no se versiona:

```
EMISOR_TOKEN=un-token-de-desarrollo
```

## La publicación

En cada push a `main`, el CI ([`publicar.yml`](.github/workflows/publicar.yml)) corre el gate y, si
pasa, hace dos cosas:

- **El Worker:** aplica las migraciones a la base D1 remota y lo publica.
- **La imagen del emisor:** publica `ghcr.io/nks21may/status-emisor` desde un runner arm.

Los pasos de una vez (el repo, la base D1, los tokens y el Custom Domain) están en
[ADR-0017](docs/adr/0017-como-se-publica.md).

## El emisor

Corre en la VPS y cada minuto le manda al Worker la lista de componentes y su salud de adentro
([ADR-0003](docs/adr/0003-la-vps-empuja-lo-de-adentro.md),
[ADR-0015](docs/adr/0015-el-envio-del-emisor.md)). Node 24 lo corre sin compilar:

```bash
node src/emisor/principal.ts
```

Lo que recibe por variables de entorno es el contrato con el stack de `infra`
([ADR-0004](docs/adr/0004-el-emisor-vive-aca-y-lo-despliega-infra.md)): un cambio acá pide un
commit allá.

| Variable | Qué es |
|---|---|
| `PROMETHEUS_URL` | La URL de Prometheus, por ejemplo `http://127.0.0.1:9090`. |
| `CATALOGO` | La ruta del `catalogo.json` que escribe el deploy, montado de sólo lectura. |
| `STATUS_URL` | La URL del Worker, por ejemplo `https://status.nicolasdalessandro.dev`. |
| `STATUS_TOKEN` | El token del envío: el mismo valor que el secreto `EMISOR_TOKEN` del Worker. |
| `PUERTO_SALUD` | Opcional: el puerto del `/healthz`, en `127.0.0.1`. Si falta, **8460**. |

De Prometheus lee `infra_contenedor_sano` y la agrupa por su etiqueta `stack`
([ADR-0014](docs/adr/0014-la-salud-de-adentro-llega-con-la-etiqueta-del-stack.md)).

Del catálogo manda las fichas visibles, salvo la que tiene el mismo host que `STATUS_URL`: el
status aparece en el hub, pero no se lista a sí mismo
([ADR-0018](docs/adr/0018-el-status-no-se-lista-a-si-mismo.md)).

Para el healthcheck de `infra` sirve `GET http://127.0.0.1:8460/healthz`, sólo en IPv4 y en
loopback. Contesta 200 si el último envío lo aceptó el Worker hace 3 minutos o menos, y 503 si no:
antes del primer envío, si el último falló, o si el ciclo se trabó. En la imagen está el `wget` de
busybox:

```bash
wget --no-verbose --tries=1 --spider http://127.0.0.1:8460/healthz
```

## La vista previa del hub

El hub (<https://hub.nicolasdalessandro.dev>) muestra el recuadro del status con
[public/vista.mp4](public/vista.mp4), que pide a <https://status.nicolasdalessandro.dev/vista.mp4>
([ADR-0019](docs/adr/0019-el-loop-del-hub-lo-sirve-el-worker-con-range.md)). Es un loop de 7,6 s:
quieto en el estado general, el recorrido por los servicios hasta el talón y un fundido a blanco que
vuelve al primer cuadro, así el loop no salta.

El formato es un contrato con el hub (su ADR-0010): MP4 H.264 **sin pista de audio**, 640×480, hasta
8 s y hasta 1,5 MB. El gate lo comprueba leyendo las cajas del archivo. Para regrabarlo hacen falta
Google Chrome y `ffmpeg` y `ffprobe` en el PATH:

```bash
node herramientas/grabar-vista.ts
```

Graba la página publicada, con sus datos de verdad, a 1280×960 y en el tema claro, y ffmpeg la baja a
640×480: prueba CRF de mejor a peor calidad y se queda con el primero que entra en 1,5 MB. Para grabar
el Worker local se le pasa su URL, por ejemplo `http://127.0.0.1:8787/`. Hay que regrabarlo si cambia
el aspecto de la página.

`/vista.mp4` pasa primero por el Worker (`run_worker_first` en `wrangler.jsonc`), que contesta
`Range` con 206: los archivos estáticos no lo hacen, y Safari no reproduce un video sin eso. Cada
pedido gasta uno del cupo del Worker, y el navegador lo guarda una hora.

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
