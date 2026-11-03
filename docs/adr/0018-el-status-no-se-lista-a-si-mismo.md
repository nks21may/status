# ADR-0018 — El status no se lista a sí mismo: el emisor deja afuera la ficha con el host de `STATUS_URL`

- **Estado:** aceptado (propuesto el 2026-11-02; confirmado por el usuario el 2026-11-02)
- **Fecha:** 2026-11-02
- **Decide:** qué hace el emisor con la ficha del propio status cuando llega en el catálogo, y cómo la
  reconoce.

## Contexto

[ADR-0007](0007-los-componentes-salen-del-catalogo-del-hub.md) dice que un componente es una ficha
visible del catálogo, y el emisor manda todas. Hasta ahora el status no tenía ficha: su stack en
`infra` (I85) no expone nada, y el Worker no corre en la VPS.

El usuario quiere que el status aparezca en el hub. La lista del hub sale del mismo `catalogo.json`
(ADR-0027 de `infra`), así que el I87 de `infra` le suma un `x-hub` visible a
`stacks/status/compose.yml`, con `url: https://status.nicolasdalessandro.dev/`. Lo pidió la sesión
de `infra` el 2026-11-02, y el usuario aprobó pasarlo.

Con esa ficha, el emisor mandaría al status como un componente más. La página se listaría a sí
misma, y el cron se sondearía a sí mismo. Una página que se cae no puede decir que está caída, así
que ese renglón nunca diría nada útil.

El emisor ya sabe quién es el status: `STATUS_URL` es la dirección a la que le manda el envío
(ADR-0004), hoy `https://status.nicolasdalessandro.dev`. La ficha trae la misma con la barra final.

## Decisión

- **El emisor deja afuera la ficha cuyo `url` tiene el mismo host que `STATUS_URL`.** El host es
  el de `URL.host`: sin el esquema, sin la ruta y sin distinguir mayúsculas.
- **Queda afuera en silencio, como una ficha `oculto`**: no es un descarte y no se anota en el log,
  porque no es un error y se repetiría cada minuto.
- **Una ficha que no es una URL no se compara**: sigue su camino y la descarta la validación de
  siempre, con su motivo.
- **El resto de ADR-0007 sigue igual.** Ningún componente se escribe a mano, y el status no lleva
  una variable nueva.

## Consecuencias

**A favor:**

- El status aparece en el hub con la misma ficha de siempre, y no se lista a sí mismo.
- No hay nada que mantener en sincronía con `infra`: si el status se muda de host, `STATUS_URL`
  cambia y la ficha también.

**En contra:**

- Cualquier otra ficha en el mismo host queda afuera. Hoy no hay ninguna, y el host es del Worker.
- Si `STATUS_URL` apunta a otro host que la ficha, por ejemplo un `workers.dev`, el status se lista
  a sí mismo. Hoy no puede pasar: `wrangler.jsonc` tiene `workers_dev: false`
  ([ADR-0017](0017-como-se-publica.md)).
- El status no se mide a sí mismo. Si el Worker se cae, lo dicen las sondas de `infra`, no esta
  página.

**Se revisa si:** el status se sirve en más de un host, o hace falta que el status mida algo en su
propio host.

## Alternativas consideradas

- **Comparar la URL entera.** La ficha lleva la barra final y `STATUS_URL` no, y cualquier
  diferencia de ruta la deja pasar. Para que sirva habría que normalizar, y el host ya alcanza.
- **Dejar afuera el stack `status` por nombre.** Es un componente escrito a mano en este repo, lo
  que ADR-0007 descarta. Además, si `infra` renombra el stack, el status se lista a sí mismo sin
  que nada lo avise.
- **Una variable nueva con el stack a excluir.** Otra cosa que `infra` tiene que mantener igual
  que acá, cuando `STATUS_URL` ya dice quién es el status.
- **Marcar la ficha `oculto` en `infra`.** La saca también del hub, que es justo lo que no se
  quiere.
- **Que el Worker no sondee su propio host.** El renglón seguiría en la lista. Además, en el
  `scheduled` el Worker no sabe en qué host está, así que necesitaría una variable.
- **Un campo nuevo en la ficha, como `status: false`.** Cambia el formato del catálogo, que leen el
  gate de `infra`, el hub y el status (ADR-0010 del hub), para un solo caso.
