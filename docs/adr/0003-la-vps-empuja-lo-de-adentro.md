# ADR-0003 — La VPS empuja lo de adentro; el Worker no le pregunta nada a la VPS

- **Estado:** aceptado (decidido por el usuario el 2026-11-02)
- **Fecha:** 2026-11-02
- **Decide:** cómo llega al Worker lo que sólo se ve desde adentro de la VPS, y quién le habla a
  quién.

## Contexto

Desde afuera sólo se ve si una URL contesta y cuánto tarda. Que un contenedor esté sano es otra
cosa: la landing de `audio.` puede contestar con el puente de audio caído
(`discord-voice-bridge`). Eso lo sabe Prometheus, en la métrica `infra_contenedor_sano`, y
Prometheus escucha sólo en `127.0.0.1:9090` (ADR-0013 de `infra`).

Para que el Worker le pregunte a la VPS haría falta una puerta nueva al host: un hostname del túnel
que conteste a internet, o uno detrás de Access con un token guardado en el Worker.

## Decisión

- **Cada minuto, el emisor de la VPS le hace un POST al Worker** con un resumen de lo de adentro,
  autenticado con un token. El Worker lo tiene como secreto, y en la VPS va cifrado con sops (eso lo
  decide `infra`). Sin token, o con uno equivocado, el Worker contesta 401 y no escribe nada; la
  comparación es de tiempo constante.
- **La página, la API y el MCP sólo leen D1.** Ningún pedido de un visitante llega a la VPS.
- **Si los envíos se cortan**, lo de adentro se muestra como "sin datos de adentro", y la página
  sigue con lo que mide desde afuera. Cuántos minutos sin envío cuentan como corte lo fija el ítem
  que lo implementa.
- **El POST sale de la VPS por internet directo, no por el túnel.** Así se distinguen dos fallas:

  | Envíos de la VPS | Sondas desde afuera | Qué está fallando |
  |---|---|---|
  | llegan | fallan | el túnel |
  | se cortan | fallan | la VPS |

## Consecuencias

**A favor:** el host no expone nada nuevo: sólo hace pedidos hacia afuera. La carga de los
visitantes queda en Cloudflare.

**En contra:**

- **Una credencial más en el host**, que escribe en el Worker. Robada, sirve para publicar un estado
  falso; nada más, porque el endpoint sólo guarda el resumen.
- Los envíos gastan cupo: unos 1.440 pedidos y sus escrituras por día.
- Un proceso más en la VPS, que `infra` tiene que desplegar y cuidar.

**Se revisa si:** la VPS pierde la salida directa a internet, o el Worker necesita de la VPS algo
que no entra en un resumen por minuto.

## Alternativas consideradas

- **Que el Worker le pregunte a la VPS**, por un hostname nuevo del túnel o con un token de servicio
  de Access. Es una puerta nueva al host, y cae junto con el túnel: no distingue las dos fallas.
- **Que la página le pregunte a la VPS en el momento.** Se queda sin datos cuando la VPS se cae, y
  cada visita le pega al host.
- **Sólo el webhook de Alertmanager.** Avisa cuando algo cambia, no que todo sigue bien: un silencio
  no se distingue de un "todo en orden".
