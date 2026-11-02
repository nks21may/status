# ADR-0015 — El envío del emisor: `POST /api/report` con un token, y la última lista reemplaza a la anterior

- **Estado:** aceptado (propuesto por la iteración S4 del loop el 2026-11-02; confirmado por el
  usuario el 2026-11-02)
- **Fecha:** 2026-11-02
- **Decide:** la ruta y la autenticación del envío, el contrato del cuerpo que comparten el emisor y
  el Worker, qué guarda el Worker, y cómo arma el envío el emisor.

## Contexto

[ADR-0003](0003-la-vps-empuja-lo-de-adentro.md) decidió que cada minuto el emisor de la VPS le
hace un POST al Worker:
- autenticado con un token, que el Worker guarda como secreto;
- sin token, o con uno equivocado, el Worker contesta 401 y no escribe nada;
- la comparación es de tiempo constante.

[ADR-0007](0007-los-componentes-salen-del-catalogo-del-hub.md) decidió que el envío trae el
catálogo, y que el Worker se queda con la última lista. [ADR-0014](0014-la-salud-de-adentro-llega-con-la-etiqueta-del-stack.md)
decidió cómo se agrupa la salud por stack. Falta lo que queda escrito en D1 y en el contrato entre
los dos repos.

El catálogo es el del ADR-0010 del hub: `{version: 1, stacks: [{stack, apagado, hub}]}`, donde
`hub` es una ficha (`nombre`, `url`, `desde`, `descripcion` con `es` y `en`) o un `oculto`. Lo
escribe el deploy de `infra` en cada ciclo. `infra_contenedor_sano` se lee de Prometheus con su API
de consultas (`/api/v1/query`).

## Decisión

### El endpoint

- **`POST /api/report`**, con `Authorization: Bearer <token>`. Cualquier otro método contesta 405.
- **El token es el secreto `EMISOR_TOKEN` del Worker.** Se compara el hash SHA-256 de los dos con
  `crypto.subtle.timingSafeEqual`: la comparación no depende del largo ni de dónde difieren. Si el
  secreto no está configurado, todo envío contesta 401.
- **Sin token, con uno equivocado o con un encabezado mal formado: 401**, y el cuerpo ni se lee.
- **El cuerpo se valida entero antes de escribir.** Uno que no cumple el contrato contesta 400 con
  el motivo, y no escribe nada. Uno válido contesta 204.

### El contrato (un tipo de TypeScript que comparten el emisor y el Worker)

Es interno entre dos programas de este repo, así que va en español, como las fichas:

```json
{
  "componentes": [
    {
      "stack": "bot_discord",
      "nombre": "Audio",
      "url": "https://audio.nicolasdalessandro.dev/",
      "descripcion": {"es": "…", "en": "…"},
      "sano": true
    }
  ]
}
```

- **`stack`:** minúsculas, cifras, `_` o `-`, de hasta 64 caracteres, sin repetirse.
- **`nombre`:** de 1 a 20 caracteres.
- **`url`:** empieza con `https://`.
- **`descripcion`:** trae al menos un idioma, de 1 a 90 caracteres cada uno. Son los límites de la
  ficha.
- **`sano`:** `true` si todos los contenedores del stack están sanos, `false` si alguno no, y `null`
  si no hay datos de adentro (ADR-0014).
- **La lista:** hasta 50 componentes.

### Lo que guarda el Worker

- **Una migración nueva le suma a `componentes`** el nombre, las dos descripciones y la salud de
  adentro (`NULL` es sin datos).
- **Una tabla nueva, `envios`,** tiene una sola fila: la hora en que el Worker recibió el último
  envío, con su propio reloj y no con el de la VPS.
- **Cada envío reemplaza la lista**, en un solo batch de D1: actualiza los componentes que vienen,
  borra los que ya no vienen y anota la hora. **La historia no se borra** (ADR-0009): si un stack
  vuelve, sigue con la suya.

### El emisor

- **Vive en `src/emisor/`, en TypeScript para Node.** El Node 24 de la imagen lo corre sin
  compilar. La imagen y su publicación siguen parkeadas en el backlog.
- **Cada minuto** lee el catálogo de un archivo, le pide `infra_contenedor_sano` a Prometheus y
  manda el envío. Recibe por variables de entorno lo que ADR-0004 enumera: `PROMETHEUS_URL`,
  `CATALOGO`, `STATUS_URL` y `STATUS_TOKEN`.
- **Del catálogo toma las fichas visibles**: ni `oculto` ni de un stack `apagado` (ADR-0007). Una
  ficha que no cumple el contrato se descarta con su motivo en el log, sin tirar el resto, como en
  el hub.
- **Si Prometheus no contesta**, manda la lista igual, con `sano: null` en todos: lo de afuera y la
  lista siguen al día.
- **Si el catálogo no se puede leer, no manda nada.** Una lista vacía por un error borraría todos
  los componentes.

## Consecuencias

**A favor:**

- El Worker no escribe nada que no venga autenticado y validado entero.
- Robar el token sirve para publicar un estado falso, y nada más (ADR-0003). Validar el cuerpo
  impide además meter HTML, URLs que no son `https` o listas enormes.
- Lo que un envío deja escrito es chico: con 6 componentes, unas 8 filas por minuto.

**En contra:**

- Los límites de la ficha se validan en tres lugares: `infra`, el hub y acá.
- Un catálogo legítimo sin fichas visibles borra la lista. Es lo que pasa de verdad, pero un error
  de `infra` que lo vacíe también lo hace hasta el envío siguiente.
- La API y la página todavía no muestran el nombre, la descripción ni la salud de adentro: es un
  ítem nuevo, que también decide cuántos minutos sin envío cuentan como corte (ADR-0003).

**Se revisa si:** el catálogo cambia de `version`, el envío necesita más que un resumen por minuto,
o el token pasa a rotarse solo.

## Alternativas consideradas

- **La hora del envío con el reloj de la VPS.** Un reloj corrido mostraría envíos del futuro o del
  pasado. La del Worker es la que importa para saber si se cortaron.
- **Descartar en el Worker sólo los componentes inválidos**, como el hub. Al Worker sólo le escribe
  el emisor, que ya filtró: un cuerpo inválido es un error del emisor o un intento de abuso, y no
  se escribe nada.
- **Un cuerpo en inglés.** No lo lee nadie de afuera (ADR-0005 pide inglés para lo público), y en
  español se mapea uno a uno con las fichas.
- **Firmar el cuerpo con HMAC en lugar de un token.** Protege contra un cuerpo alterado en el
  camino, pero el envío va por HTTPS y ADR-0003 ya eligió un token.
