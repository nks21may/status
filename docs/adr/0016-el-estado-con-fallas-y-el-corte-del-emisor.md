# ADR-0016 — Un servicio con la URL arriba y algo de adentro caído está "con fallas"; el emisor se corta a los 5 minutos

- **Estado:** aceptado (decidido por el usuario el 2026-11-02)
- **Fecha:** 2026-11-02
- **Decide:** cómo entra la salud de adentro en el estado de un componente, cómo sale en la API, y
  cuántos minutos sin envío del emisor cuentan como corte.

## Contexto

Desde afuera, el cron sabe si la URL pública contesta 2xx (ADR-0009). Desde adentro, el emisor
dice si todos los contenedores de cada stack están sanos (ADR-0014 y ADR-0015). Las dos cosas
pueden no coincidir: la landing de `audio.` contesta 200 con el puente a Discord caído. Es el caso
que ADR-0003 puso como ejemplo.

`PRODUCT.md` dejó por decidir cómo se muestra. [ADR-0003](0003-la-vps-empuja-lo-de-adentro.md)
dejó al ítem que lo implementa cuántos minutos sin envío cuentan como corte.
[ADR-0011](0011-la-api-publica-de-estado.md) definió `status` como `up`, `down` o `no_data`.

## Decisión

- **Un estado más: `degraded`** ("Degraded" en inglés, "Con fallas" en español). Lo eligió el
  usuario el 2026-11-02. El estado de ahora queda así:

  | Sonda de afuera | Salud de adentro | `status` |
  |---|---|---|
  | sin lectura en 5 minutos | cualquiera | `no_data` |
  | caído | cualquiera | `down` |
  | arriba | no sana | `degraded` |
  | arriba | sana o sin datos | `up` |

  Sin datos de adentro, el estado sale de afuera solo, como antes de S4.
- **La API suma el campo `inside`**: `healthy`, `unhealthy` o `no_data`, así quien la lee ve lo de
  adentro aparte del estado.
- **Lo de adentro sale `no_data` si el último envío tiene más de 5 minutos**, el mismo umbral que
  usan las sondas. También sale así si el emisor nunca mandó nada, o si mandó la salud del stack
  en `null`.
- **La historia de 90 días sigue saliendo sólo de las sondas de afuera.** Un día con algo de
  adentro caído y la URL arriba cuenta como día arriba.
- **El cambio visual** (la palabra y la marca del estado nuevo) pasa por impeccable y queda en
  `DESIGN.md` en el mismo commit (ADR-0008).

## Consecuencias

**A favor:**

- Quien no puede usar el puente de audio ve "con fallas", y no un "anda" que lo contradice.
- Un emisor que deja de mandar no deja pegada una falla vieja: a los 5 minutos lo de adentro pasa a
  sin datos, y el estado vuelve a salir de afuera.

**En contra:**

- `status` tiene un valor más: un cliente de la API que sólo esperaba tres tiene que conocer el
  cuarto.
- Un contenedor sano por dentro pero que no hace lo suyo (el bot conectado a Discord sin audio)
  sigue sin verse: la salud es la del healthcheck de cada contenedor.
- La disponibilidad de 90 días no cuenta las fallas de adentro.

**Se revisa si:** hace falta la salud de adentro en la historia, o un estado más fino que "con
fallas".

## Alternativas consideradas

- **"Anda" con una marca aparte.** Mantiene tres estados, pero el estado dice "anda" justo cuando
  el visitante no puede usar el servicio.
- **Mostrarla sólo en la API y en el MCP.** La página, que es lo que mira el lector principal,
  seguiría diciendo "anda".
- **Cortar a los 3 o a los 10 minutos.** Con 3, un reinicio del emisor ya lo pasa a sin datos; con
  10, una VPS que dejó de mandar tarda más en notarse. Con 5, es el mismo umbral que las sondas.
