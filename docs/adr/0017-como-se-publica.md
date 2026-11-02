# ADR-0017 — Cómo se publica: el repo público en GitHub, el CI publica el Worker y la imagen, y el dominio se crea a mano

- **Estado:** aceptado (decidido por el usuario el 2026-11-02)
- **Fecha:** 2026-11-02
- **Decide:** dónde vive el repo, quién publica el Worker y la imagen del emisor y con qué
  credenciales, y cómo se crea `status.nicolasdalessandro.dev`.

## Contexto

Hasta acá todo corrió en local: el loop no toca la cuenta de Cloudflare ni tiene remoto. Para que
el status esté en línea hay que publicar tres cosas:
- el Worker, con sus migraciones de D1 en la base remota;
- la imagen del emisor ([ADR-0004](0004-el-emisor-vive-aca-y-lo-despliega-infra.md));
- el dominio.

Así lo hacen los repos hermanos, leídos el 2026-11-02:

- **Las apps viven en GitHub** (`nks21may/hub`, `museo`, `nonograma`). Su CI construye la imagen
  en cada push a `main`, con un runner arm porque la VPS es arm, y la publica en GHCR como
  `ghcr.io/nks21may/<app>:latest` y `:<sha>`. El Dockerfile corre el gate antes: si falla, no se
  publica nada. La VPS baja `:latest` sola, en el ciclo del deploy.
- **El DNS de la zona lo sigue el OpenTofu de `infra`, con un token de sólo lectura** (su
  ADR-0018). Un registro nuevo se crea a mano en el dashboard, y el código lo importa. El usuario
  descartó ahí un token de edición sobre la zona: una máquina comprometida podría redirigir el
  dominio.

## Decisión

### El repo

- **`github.com/nks21may/status`, público**, como el portafolio y el museo. El status es parte del
  CV y el repo no guarda nada secreto: los tokens van como secretos de GitHub, de Cloudflare y de
  sops en `infra`.

### El CI publica, en cada push a `main`

- **Primero, el gate.** Si falla, no se publica nada.
- **El Worker:** se aplican las migraciones a la base D1 remota (`wrangler d1 migrations apply
  --remote`) y después se corre `wrangler deploy`, que empaqueta la página con el `build` de
  `wrangler.jsonc`.
- **El token de Cloudflare es de la cuenta, con Workers Scripts y D1 en edición, y nada más.** No
  tiene permisos sobre la zona: no puede tocar DNS, rutas ni otros dominios. Vive como secreto del
  repo en GitHub, junto con el id de la cuenta.
- **La imagen del emisor:** `ghcr.io/nks21may/status-emisor`, con el mismo esquema que las demás
  apps: runner arm, `:latest` y `:<sha>`, y el gate en el Dockerfile. La imagen final tiene Node 24
  y el código del emisor, sin dependencias ni compilación, y corre sin root.
- **El subdominio `workers.dev` va apagado** (`workers_dev: false`): el status tiene una sola
  puerta pública.

### El dominio, a mano y una sola vez

- **`status.nicolasdalessandro.dev` es un Custom Domain del Worker, creado en el dashboard** después
  del primer deploy. El OpenTofu de `infra` lo importa en lectura, como los demás registros (su
  ADR-0018). Ninguna credencial de este repo toca la zona.

### Los pasos de una vez, que hace el usuario

1. Crear el repo público en GitHub y subir `main`.
2. Crear la base D1 (`wrangler d1 create status`) y anotar su `database_id` en `wrangler.jsonc`.
3. Crear el token de Cloudflare con Workers Scripts y D1 en edición, y guardar en GitHub los
   secretos `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`.
4. Cargar el token del emisor como secreto del Worker (`wrangler secret put EMISOR_TOKEN`), y el
   mismo valor en `infra`, cifrado con sops (ADR-0003).
5. Después del primer deploy, sumar el Custom Domain en el dashboard.

Lo que falta del lado de `infra` se pide en su backlog:
- importar el Custom Domain en OpenTofu;
- el stack del emisor, con el token y el catálogo;
- la etiqueta `stack` de ADR-0014.

## Consecuencias

**A favor:**

- Publicar es hacer push a `main`, como en las demás apps. Las migraciones van antes del código
  que las usa.
- El token del CI no puede redirigir el dominio ni tocar el DNS.
- El código se puede mostrar: es el mismo que corre.

**En contra:**

- **El token del CI puede publicar cualquier Worker en la cuenta y escribir en D1.** Con el repo o
  sus Actions comprometidos, alguien podría publicar un status falso o borrar la historia. Los
  secretos sólo los usa `main`.
- **Una migración que falla a mitad deja la base adelantada al código.** Se arregla con una
  migración nueva, nunca editando la que se aplicó (ADR-0009).
- **El dominio y los secretos son pasos a mano**, fuera del historial. El Custom Domain queda
  versionado en `infra` cuando OpenTofu lo importa.
- **El repo es público**: un ADR o un comentario que nombre algo privado queda a la vista.

**Se revisa si:** la cuenta suma otros Workers que el token no debería poder tocar, el status
necesita más de un entorno, o el usuario quiere crear el DNS desde el código, con un token de
edición y su propio ADR, como prevé el ADR-0018 de `infra`.

## Alternativas consideradas

- **Publicar el Worker a mano desde la laptop**, con el login de wrangler. No hay ningún token de
  escritura fuera de la máquina del usuario, pero cada cambio se publica a mano y las migraciones
  dependen de acordarse.
- **El dominio declarado en `wrangler.jsonc`**, que lo crea el deploy. La credencial que publica
  necesitaría editar la zona, que es lo que `infra` evitó.
- **El repo privado.** El CI funciona igual, pero el status no se puede mostrar como parte del CV.
