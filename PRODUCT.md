# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegado (el usuario, 2026-11-02, "lo que recomiendes"). La elección: **HTML y CSS escritos a mano,
y TypeScript sin framework** para pedir la API, dibujar los renglones y cambiar el idioma. Lo sirve
el Worker como archivos estáticos (ADR-0002: esos pedidos son gratis y sin límite). El motivo: es
una sola pantalla, sin estado que justifique React, y queda en el mismo repo y el mismo gate que el
Worker. Las tipografías van dentro del sitio, sin CDN ni terceros en el navegador. El paso de build
del TypeScript de la página lo suma S2.

## Users

- **El que pregunta si anda** (lector principal, confirmado el 2026-11-02). Un amigo o alguien de
  Discord que no puede entrar a neonduel, a surf o al puente de audio, y quiere saber si el problema
  es el servidor o es él. Llega por un link, muchas veces desde el celular, y lo que mira es el
  estado de ahora.
- **El que evalúa el oficio.** Recruiters y tech leads que llegan desde el portfolio: la página es
  parte del CV (ADR-0005 y ADR-0008), y es la prueba de que el dueño opera lo que publica. Miran la
  historia, en desktop y en inglés.
- **Un cliente MCP** (Claude u otro modelo) que pregunta "¿está andando museo?" por `/mcp`. No ve la
  página, pero lee el mismo dato (ADR-0006).

## Product Purpose

Decir si cada proyecto publicado en `nicolasdalessandro.dev` está andando ahora, y cómo anduvo los
últimos 90 días, medido desde afuera de la VPS que lo sirve.

El éxito es que quien no puede entrar a un proyecto sepa en segundos si está caído o si el problema
es de su lado, y que quien evalúa vea una historia verdadera, con sus días malos incluidos.

## Positioning

Lo mide algo que no depende de lo medido: un Worker de Cloudflare prueba las URLs públicas cada
minuto, desde afuera, como un visitante, y sigue en pie cuando la VPS o el túnel se caen (ADR-0002).
La lista de componentes no la escribe nadie: sale del catálogo de fichas de `infra`, el mismo del
hub, así que publicar algo es aparecer acá (ADR-0007). Y el mismo dato sale por tres puertas: la
página, la API y un MCP público, que cualquier modelo puede consultar.

El formato es el de discordstatus.com, que el usuario nombró como modelo: el estado de ahora y una
barra de 90 días por componente.

## Operating Context

- El link se pega en Discord y se abre desde el celular; desde el portfolio llegan en desktop.
- La página es estática y pide los datos a la API cuando carga. La API puede fallar (pasado el cupo
  del plan Free contesta error hasta la medianoche UTC, ADR-0002) y la página tiene que seguir en
  pie y decir que no tiene datos.
- Una sonda por minuto: lo que se muestra tiene hasta un minuto de atraso.
- **Los días son UTC** (ADR-0009): para un visitante en Buenos Aires el día cambia a las 21 h.
- Al 2026-11-02 hay seis componentes, las fichas visibles del catálogo: Surf & Bhop Daily, Audio,
  Museo, Neonduel, Nonograma y Portfolio. Cada ficha trae `nombre`, `url`, `desde` (la fecha de
  publicación) y una descripción en español y en inglés.

## Capabilities and Constraints

- **Por componente:** el estado de ahora y una barra por cada uno de los últimos 90 días, con la
  disponibilidad del día (minutos arriba sobre minutos medidos) y la latencia de la última sonda
  (ADR-0009).
- **Un minuto arriba es un 2xx** después de seguir las redirecciones, con un timeout de 10 s, como
  la sonda `http_2xx` de blackbox en `infra` (ADR-0009).
- **Un componente sin medición reciente sale "sin datos", nunca "arriba"** (S2 en el backlog).
- **Un día sin mediciones es un día sin datos**, distinto de un día caído: pasa antes de la fecha
  `desde` de la ficha y antes de que el status empezara a medir.
- **Inglés por defecto y español** (ADR-0005); los nombres y las descripciones de cada componente
  salen de su ficha, que los trae en los dos idiomas.
- **Pública, sin login y de sólo lectura**, como la API y el MCP (ADR-0006).
- **Por decidir:**
  - los incidentes (parkeados en el backlog). Hoy no hay, y la página no muestra ninguno inventado;
  - cómo se muestra la salud de adentro que manda la VPS con S4 (un contenedor no sano con la URL
    arriba);
  - cómo se publican el Worker y el dominio.

## Brand Commitments

- **Voz sobria y exacta**, como un status de verdad: estados claros, cifras con su unidad y nada de
  chistes (el usuario, 2026-11-02). El humor de carteles escritos a mano es del hub, no de acá. En
  español, rioplatense con voseo, como los demás sitios.
- **Es parte de `nicolasdalessandro.dev`**, en `status.nicolasdalessandro.dev`, junto al portfolio
  (monograma "ND"), el hub y los proyectos.

## Evidence on Hand

- Las seis fichas reales, con sus textos en los dos idiomas: `P:\infra\stacks/*/compose.yml`, bajo
  `x-hub`.
- **No hay historia real todavía:** el Worker no está publicado y D1 sólo existe en local. Toda
  maqueta con barras o porcentajes usa datos de demostración, rotulados como tales, y ninguna cifra
  de disponibilidad se presenta como medida.
- **No hay incidentes** ni capturas de caídas reales.

## Product Principles

1. **La verdad antes que el verde.** Lo que no se midió dice "sin datos". Nada se redondea para
   arriba ni se inventa.
2. **La respuesta en un vistazo.** "¿Anda o no?" se contesta en la primera pantalla del celular,
   sin scrollear ni tocar nada.
3. **Lo último que se cae.** Sin VPS, sin túnel o sin API, la página sigue en pie y dice qué sabe y
   qué no.
4. **Un dato, tres puertas.** La página, la API y el MCP dicen lo mismo.

## Accessibility & Inclusion

Inferido de los sitios hermanos, sin confirmar como requisito propio:

- WCAG 2.2 AA como piso: contraste de 4.5:1 en el texto y 3:1 en el foco y en las barras.
- El estado nunca depende sólo del color: cada uno tiene su palabra.
- Las barras de los días se recorren con el teclado y un lector de pantalla lee su dato.
- Se usa con el dedo en el celular, y lo que se mueve respeta `prefers-reduced-motion`.
