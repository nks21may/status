# ADR-0002 — Corre en un Worker de Cloudflare, fuera de la VPS, en el plan Free

- **Estado:** aceptado (decidido por el usuario el 2026-11-02)
- **Fecha:** 2026-11-02
- **Decide:** dónde corre el status, y qué de Cloudflare puede usar sin generar gasto.

## Contexto

Una página de status tiene que seguir andando cuando lo que mide se cae. discordstatus.com no la
sirve Discord: la sirve Atlassian Statuspage, en otra infraestructura.

Si el status fuera un stack más de la VPS, detrás del mismo túnel, el día que se cae la VPS o el
túnel la página mostraría el error de Cloudflare en vez de "caído". Y las sondas de blackbox salen
de la VPS (`stacks/metricas/blackbox/blackbox.yml` en `infra`): con la VPS abajo, nadie mide.

Otra VM no hay: la VPS usa todo el cupo always free de Oracle (ADR-0009 de `infra`). Lo que queda
gratis y fuera de la VPS es Cloudflare, donde ya están el dominio, el túnel y Access.

En `infra` rige el costo cero: ningún recurso nuevo, en Oracle, Cloudflare, GitHub o un SaaS, puede
generar gasto (su ADR-0009). Cloudflare no tiene tope duro de gasto, y la cuenta tiene un medio de
pago cargado por el dominio y por R2 (ADR-0008 de `infra`): un producto que cobra lo que se pasa de
su cupo cobra en lugar de fallar.

La documentación de Cloudflare, consultada el 2026-11-02:

- **Workers Free:** 100.000 pedidos por día (pasado eso, error 1027 hasta la medianoche UTC), 5 cron
  triggers por cuenta, 10 ms de CPU y 50 subpedidos por invocación.
- **Archivos estáticos:** los pedidos son gratis y sin límite, mientras no pasen por el Worker.
- **D1 Free:** 5 millones de filas leídas y 100.000 escritas por día. Pasado eso, las consultas dan
  error hasta la medianoche UTC, y lo guardado no se pierde.

## Decisión

- **Un Worker de Cloudflare, en el plan Free.** La página son archivos estáticos; la API y el MCP
  son del Worker y leen D1; un cron por minuto prueba las URLs públicas desde afuera.
- **Nada que cobre lo que se pasa de su cupo:** ni Workers Paid ni R2. Un producto nuevo de
  Cloudflare entra con un ADR que dice su cupo gratis, como pide el ADR-0009 de `infra`.
- **La cuenta, a ojo:** con unos 10 componentes, el cron son 1.440 invocaciones por día, cada una
  con unas 10 sondas y una escritura en lote (menos de 50 subpedidos), y unas 14.400 filas escritas
  por día si se escribe una por componente y por minuto.

## Consecuencias

**A favor:**

- La página sigue arriba si se cae la VPS o el túnel, y mide como mide un visitante.
- El costo cero no depende de una alerta: pasado el cupo, el plan Free falla en lugar de cobrar.

**En contra:**

- **Un abuso de la API o del MCP agota el cupo del día**: hasta la medianoche UTC, la API y el MCP
  contestan error. La página estática sigue, pero sin datos.
- Es una plataforma más (Wrangler, D1) fuera de `infra`.
- El cron usa uno de los 5 cron triggers de la cuenta.

**Se revisa si:** Cloudflare cambia los cupos del plan Free, o el status necesita más de lo que dan.

## Alternativas consideradas

- **Todo en la VPS**, como un stack que lee Prometheus por loopback. Lo más simple, y se cae justo
  cuando hace falta.
- **GitHub Actions y Pages, como Upptime.** Independiente de la VPS, pero el cron de Actions no baja
  de cada 5 minutos y Pages sólo sirve archivos: no hay dónde correr el MCP.
- **Otra VM en Oracle.** No hay cupo (ADR-0009 de `infra`).
