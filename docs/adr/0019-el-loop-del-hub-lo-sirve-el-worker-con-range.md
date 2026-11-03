# ADR-0019 — El loop de vista previa del hub es `public/vista.mp4`, y lo sirve el Worker para contestar `Range`

- **Estado:** propuesto (a pedido de la sesión del hub, el 2026-11-03; falta la confirmación del
  usuario)
- **Fecha:** 2026-11-03
- **Decide:** dónde vive el loop que el hub muestra en el recuadro del status, cómo se sirve en
  `/vista.mp4` y cómo se graba.
- **Amplía:** [ADR-0012](0012-la-pagina-la-arma-el-navegador.md), que manda al Worker sólo lo que
  no es un archivo de `public/`. `/vista.mp4` es un archivo de ahí y pasa primero por el Worker.

## Contexto

El I87 de `infra` le sumó al stack `status` una ficha `x-hub` visible, sin `vista`, y el hub la
muestra con su relleno. El ADR-0010 del hub fija el loop: lo sirve la propia app, en el mismo host
que la `url` de la ficha, y es un MP4 H.264 sin pista de audio, 4:3, de 640×480, de hasta 8 s en
loop y de hasta 1,5 MB. El hub lo pide desde otro origen con
`<video muted loop playsInline autoPlay>`.

Museo y `bot_discord` ya lo sirven. Los dos contestan `Range` con 206, porque Safari no reproduce
un video si el servidor no lo hace: museo con el nginx de su imagen, y `bot_discord` con el código
de su servidor (`src/byteRange.js`). Los dos lo graban con una herramienta propia, que toma el
screencast de Chrome y lo pasa por ffmpeg.

Acá, los archivos estáticos de Workers no contestan `Range`. El 2026-11-03, `estilos.css` y la
tipografía de `public/` dieron 200 con el archivo entero a un `Range: bytes=0-99`: en producción
(`curl` contra `status.nicolasdalessandro.dev`) y en el workerd local de los tests (con
`env.ASSETS.fetch`).

Lo que pasa por el Worker es un pedido de los 100.000 por día del plan Free (ADR-0002); lo que
sirven los archivos estáticos es gratis y sin límite.

## Decisión

- **El loop es `public/vista.mp4`, versionado en el repo.** Un test lee las cajas del MP4 y fija
  el contrato del hub: una sola pista, de video H.264, de 640×480, de hasta 8 s, y hasta 1,5 MB
  (1.500.000 bytes). Como el CI corre el gate antes de publicar (ADR-0017), un loop regrabado
  que no cumple no llega a producción.
- **`/vista.mp4` pasa primero por el Worker** (`run_worker_first: ["/vista.mp4"]` en
  `wrangler.jsonc`), y ninguna otra ruta. El Worker lee el archivo de `ASSETS` y contesta:
  - sin `Range`, 200 con el video entero;
  - con un `Range` de un solo tramo, 206 con ese tramo: cerrado, abierto o de sufijo, y recortado
    al final del archivo si se pasa;
  - si el tramo empieza después del final, 416 con el tamaño;
  - si no entiende el `Range` (otra unidad, varios tramos, números al revés), 200 con todo, como
    deja el RFC 9110;
  - a `HEAD`, lo mismo sin el cuerpo.

  Siempre como `video/mp4`, con `Accept-Ranges: bytes` y `Cache-Control: public, max-age=3600`:
  el nombre es fijo, y un loop regrabado tiene que llegar en horas, no en días, como en museo.
  Sin `Cross-Origin-Resource-Policy`, que dejaría al hub sin cargarlo.
- **Lo graba `herramientas/grabar-vista.ts`**, que no está en el gate: necesita Google Chrome y
  ffmpeg. Maneja a Chrome por CDP con el `WebSocket` de Node 24, sin dependencias nuevas, y comprueba
  el contrato con ffprobe al terminar. Por defecto graba la página publicada, con sus datos de
  verdad, en el tema claro, que es el de la boleta (`DESIGN.md`): un momento quieto arriba, el
  recorrido hasta el talón y un fundido a blanco que vuelve al primer cuadro, así el loop no
  salta.

## Consecuencias

**A favor:**

- El loop se ve en Safari, igual que el de museo y el de `bot_discord`.
- La página sigue sin pasar por el Worker: sólo `/vista.mp4` gasta cupo.
- El contrato del hub tiene test en el gate, sin Chrome ni ffmpeg.

**En contra:**

- Cada pedido de `/vista.mp4` es un pedido del cupo del Worker. Un visitante del hub pide uno o
  pocos (Safari, unos tres), y el navegador lo guarda una hora. Si el cupo del día se agota, el hub
  se queda sin el loop del status hasta la medianoche UTC, igual que la API sin datos.
- El Worker tiene el video entero en memoria (1,5 MB como mucho) para cortar el tramo.
- Cada regrabado suma hasta 1,5 MB a la historia de git, que es pública.
- Lo que muestra es una foto: la historia de ese día y el diseño de ese momento. Hay que regrabarlo
  si cambia el aspecto de la página.

**Se revisa si:** los archivos estáticos de Workers empiezan a contestar `Range` (entonces
`run_worker_first` se va y el archivo se sirve solo), o los pedidos de `/vista.mp4` pesan en el
cupo del día.

## Alternativas consideradas

- **Servirlo como un archivo estático más, sin pasar por el Worker.** Es gratis y sin límite, pero
  sin 206 Safari no lo reproduce, y en el hub el recuadro del status quedaría vacío ahí.
- **Mandar todo al Worker primero (`run_worker_first: true`).** Cada visita a la página gastaría
  cupo, que es lo que ADR-0012 evita.
- **Servirlo desde R2 o desde la VPS.** R2 cobra lo que se pasa de su cupo, y ADR-0002 lo deja
  afuera. La VPS es lo que el status mide, y el ADR-0010 del hub pide el mismo host que la `url`.
- **Grabar la página local con 90 días de historia sembrada.** Se vería el gráfico lleno, pero
  sería una historia inventada en la vista previa de una página de status.
- **Grabarlo con `playwright-core`, como museo.** Es una dependencia más para lo que Node 24 ya
  hace con su `WebSocket`, como `bot_discord` lo hace con `ws`.
