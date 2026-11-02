---
version: 1
slug: "diseno-maqueta-index-html"
primary_target: "diseno/maqueta/index.html"
related_targets: []
---

# La página de status

**Alcance:** la única pantalla de `status.nicolasdalessandro.dev`. Modo: Operate. Esta sesión la
construye como maqueta estática en `diseno/maqueta/`, con datos de demostración; S2 arma la
página real con TDD y se lleva su CSS.

**Lector y tarea:** el que no puede entrar a un proyecto y quiere saber si está caído, desde el
celular. Segundo, el que evalúa el oficio y mira la historia. Contenido elegido además de los
componentes: cómo sumar el MCP y los links al hub y al portfolio (no "cómo se mide" ni el link a
la API).

**Sin resolver:** cómo se ve la salud de adentro que llega con S4; los incidentes.

## Direction contract

THESIS: La página es la boleta del servicio: lo fijo, impreso en la tinta del formulario; lo
medido, impreso en negro encima. Rechaza la banda verde y la lista de barras verdes del status de
siempre: acá el color aparece sólo cuando algo falla.

OWN-WORLD: Papel blanco plano y una sola tinta violeta de formulario para las reglas, los rótulos y
los recuadros con trama al 10 %. Los datos van en negro con letra de impresora (Chivo Mono) sobre el
formulario en Archivo. El rojo bermellón queda sólo para lo caído, y lo que no tiene lectura es un
casillero punteado y vacío. Sin sombras, sin grano y sin papel simulado.

STORY: El visitante lee el estado general en una línea, encuentra su servicio en la grilla del
formulario y, si quiere, recorre su consumo de 90 días día por día. Se va sabiendo si el problema
es del servidor o suyo.

FIRST VIEWPORT: Arriba, el encabezado del formulario: el emisor, la fecha de emisión y el período,
y el selector EN/ES. Debajo, el recuadro del estado general, el más grande de la página, con la
frase impresa en negro (o en bermellón si algo cae) y la cuenta "4 de 6 en servicio · última
lectura 13:05 UTC". Empieza la grilla de servicios: nombre, estado, última lectura y la
disponibilidad de 90 días. En el celular, el recuadro del estado es dueño de la primera pantalla.

FORM: La boleta del servicio, sexta de mi lista. Seed key 7febb644. Raises: el resumen grande y lo
demás a tamaño de formulario (especimen); cambios en pasos secos, sin easing (manual); un día
caído nunca se borra de su casillero (billetera); impresión plana (mapa); la respuesta es dueña
de la primera pantalla del celular (feed). La interacción que la distingue: arrastrar o recorrer
con las flechas el gráfico de consumo, que imprime la lectura de cada día en el renglón de abajo.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
