---
name: Status de nicolasdalessandro.dev
description: La boleta del servicio. Lo fijo va impreso en tinta violeta de formulario y lo medido en negro con letra de impresora.
colors:
  papel: "#ffffff"
  tinta: "#4b3c8f"
  trama: "#eeebf6"
  regla-suave: "#d3cce8"
  dato: "#17151c"
  dato-suave: "#4b4659"
  corte: "#b8341a"
  papel-oscuro: "#15121f"
  tinta-oscuro: "#b4a8ef"
  trama-oscuro: "#221d33"
  regla-suave-oscuro: "#3e3560"
  dato-oscuro: "#f2f0f8"
  dato-suave-oscuro: "#c4bfd2"
  corte-oscuro: "#ff7a5c"
typography:
  resumen:
    fontFamily: "Chivo Mono, ui-monospace, monospace"
    fontSize: "4.5rem"
    fontWeight: 650
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  documento:
    fontFamily: "Archivo, Arial Narrow, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "0.03em"
    fontVariation: "'wdth' 87.5"
  emisor:
    fontFamily: "Archivo, Arial Narrow, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 106"
  cuenta:
    fontFamily: "Chivo Mono, ui-monospace, monospace"
    fontSize: "1.25rem"
    fontWeight: 450
  dato:
    fontFamily: "Chivo Mono, ui-monospace, monospace"
    fontSize: "1.0625rem"
    fontWeight: 450
    lineHeight: 1.25
  base:
    fontFamily: "Archivo, Arial Narrow, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  chico:
    fontFamily: "Chivo Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 450
  rotulo:
    fontFamily: "Archivo, Arial Narrow, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 87.5"
  eje:
    fontFamily: "Chivo Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    lineHeight: 1
rounded:
  ninguno: "0"
spacing:
  e-1: "0.25rem"
  e-2: "0.5rem"
  e-3: "0.75rem"
  e-4: "1rem"
  e-5: "1.5rem"
  e-6: "2rem"
  e-7: "3rem"
  e-8: "4.5rem"
components:
  boton:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    typography: "{typography.rotulo}"
    rounded: "{rounded.ninguno}"
    padding: "0.3125rem 0.75rem"
  boton-hover:
    backgroundColor: "{colors.trama}"
    textColor: "{colors.tinta}"
  boton-activo:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel}"
  boton-error:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.corte}"
  idioma:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.ninguno}"
    width: "3.25rem"
  idioma-actual:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel}"
  resumen:
    backgroundColor: "{colors.trama}"
    textColor: "{colors.dato}"
    typography: "{typography.resumen}"
    rounded: "{rounded.ninguno}"
    padding: "3rem 2rem"
    height: "16rem"
  resumen-corte:
    backgroundColor: "{colors.trama}"
    textColor: "{colors.corte}"
  resumen-sin-datos:
    backgroundColor: "{colors.trama}"
    textColor: "{colors.tinta}"
  cabecera-servicios:
    backgroundColor: "{colors.trama}"
    textColor: "{colors.tinta}"
    typography: "{typography.rotulo}"
    padding: "0.5rem 1rem"
  servicio:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.dato}"
    rounded: "{rounded.ninguno}"
    padding: "1rem 1rem 1.5rem"
  estado-caido:
    textColor: "{colors.corte}"
  estado-sin-datos:
    textColor: "{colors.tinta}"
  grafico-consumo:
    backgroundColor: "{colors.papel}"
    height: "2.75rem"
---

# Design System: Status de nicolasdalessandro.dev

## Overview

**Creative North Star: "La boleta del servicio"**

La página es la factura de un servicio público. El formulario preimpreso (reglas, recuadros, rótulos, paneles de trama) va en una sola tinta violeta; encima, la impresora de la compañía llenó los campos en negro con letra monoespaciada. Esa división es el sistema entero: si algo es parte de la plantilla, es violeta y va en Archivo; si salió de una medición o de una ficha, es negro y va en Chivo Mono. El color de alarma aparece sólo cuando algo está caído, nunca para decir que todo anda.

La densidad es la de un formulario: todo a tamaño de boleta, salvo el total. El recuadro del estado general es lo único grande de la hoja, como el importe a pagar, y en el celular, junto con el encabezado, ocupa la primera pantalla. La impresión es plana: papel blanco liso en el tema claro, sin sombras de profundidad, sin grano, sin papel simulado. Los cambios de estado son pasos secos, sin transiciones ni easing; la impresora no anima.

Con `prefers-color-scheme: dark` es la misma boleta impresa en tinta clara sobre papel violeta casi negro: cambian los siete valores de color, nada más. Se rechaza explícitamente la banda verde y la lista de barras verdes de los status de siempre.

**Key Characteristics:**
- Dos tintas con dos tipografías: la del formulario (violeta, Archivo) y la de la impresora (negro, Chivo Mono).
- Bermellón sólo para lo caído; ningún verde en ningún lado.
- Un único elemento grande: el estado general.
- Recuadros de regla de 1 px, esquinas a escuadra, paneles de trama.
- Lo que no tiene lectura es un casillero vacío punteado, distinto de lo caído.
- Sin sombras, sin textura, sin transiciones.

## Colors

Una tinta de formulario, una tinta de impresora y un bermellón reservado, sobre papel liso.

### Primary
- **Tinta de formulario** (`tinta`): todo lo fijo de la plantilla. Reglas y recuadros de 1 px, rótulos, el nombre del emisor y el título del documento, el eje y los meses del gráfico, el casillero punteado de un día sin lectura, el anillo de foco y la selección de texto, el subrayado de los links y el idioma elegido (relleno, con letra en papel).

### Tertiary
- **Bermellón de corte** (`corte`): sólo lo caído. La frase del estado general cuando hay algo caído, la palabra y la marca del estado "caído", la parte faltante de la barra de un día con minutos abajo y el borde y la letra del botón cuando falla la copia.

### Neutral
- **Papel** (`papel`): el fondo de la hoja y de los campos del talón.
- **Trama** (`trama`): la trama al 10 % de la tinta, el relleno de los paneles del formulario (el recuadro del estado general, la cabecera de la grilla) y el hover de los controles.
- **Regla suave** (`regla-suave`): las reglas finas entre los datos de un servicio, sólo en la vista de una columna del celular.
- **Negro de impresora** (`dato`): todo lo medido o lo que trae una ficha. Nombres de servicio, cifras, horas, la frase del estado cuando todo anda, la barra de un día con lectura y la marca del estado "anda".
- **Negro de impresora suave** (`dato-suave`): lo impreso secundario: la cuenta debajo del estado general, el host y la descripción de cada servicio.

### Tema oscuro
Bajo `prefers-color-scheme: dark` los mismos siete roles toman los valores `*-oscuro` del frontmatter: papel violeta casi negro, tinta lavanda, trama y regla suave en violetas profundos, dato casi blanco y un bermellón más claro para sostener el contraste. Ningún rol se agrega ni se quita; `color-scheme` pasa a `dark` y `scrollbar-color` sigue siendo tinta sobre papel.

### Named Rules
**La regla del color que avisa.** El bermellón aparece sólo si algo está caído, afuera (la URL no contesta) o adentro (un contenedor no sano: "con fallas"). Una página donde todo anda no tiene ni un píxel de bermellón, y tampoco tiene verde: "anda" se imprime en negro.

**La regla de las dos tintas.** Si es parte de la plantilla, va en tinta violeta; si salió de una medición o de una ficha, va en negro de impresora. Un dato nunca se imprime en violeta, salvo la ausencia de dato ("sin datos"), que es el formulario vacío.

**La regla del casillero vacío.** Un día o un estado sin lectura nunca se pinta como caído ni como andando: es el casillero punteado de la tinta, vacío.

## Typography

**Display Font:** Chivo Mono (con ui-monospace, monospace), variable en peso, servida desde el sitio.
**Body Font:** Archivo (con Arial Narrow, sans-serif), variable en ancho y peso, servida desde el sitio.
**Label/Mono Font:** Archivo semicondensado para los rótulos; Chivo Mono para todo dato.

**Character:** Archivo, angosto y firme, es la letra de imprenta del formulario; Chivo Mono es la impresora que lo llenó. Las dos son OFL y van dentro del sitio, sin CDN. Todo el cuerpo usa cifras tabulares.

### Hierarchy
- **Resumen** (Chivo Mono 650, `--t-resumen`: 4.5rem en desktop, 3.5rem por debajo de 64rem, 2.75rem por debajo de 48rem; interlineado 1.04, tracking -0.035em, `text-wrap: balance`): la frase del estado general, el `h2` de la página. Es el único texto grande.
- **Documento** (Archivo 600 al 87.5 % de ancho, 1.375rem, mayúsculas, tracking 0.03em): el título del documento en el encabezado (el `h1`) y el título del talón.
- **Emisor** (Archivo 800 al 106 % de ancho, 1.125rem; en el celular 1rem al 100 %): el nombre del sitio en el encabezado, en tinta.
- **Cuenta** (Chivo Mono, 1.25rem; en el celular baja al tamaño de dato): la línea debajo del estado general ("5 de 6 andan · última lectura 13:05 UTC").
- **Dato** (Chivo Mono, 1.0625rem, interlineado 1.25; el nombre del servicio y la disponibilidad a 650): los valores de la grilla.
- **Base** (Archivo 400, 0.9375rem, interlineado 1.45): el texto corrido, como la explicación del talón, a 60ch como máximo. También el tamaño de los campos del encabezado, en Chivo Mono.
- **Chico** (Chivo Mono, 0.8125rem): host, descripción del catálogo (a 60ch), el renglón de lectura del gráfico.
- **Rótulo** (Archivo 600 al 87.5 % de ancho, 0.75rem, mayúsculas, tracking 0.06em, en tinta): el nombre impreso de cada campo del formulario. El botón usa la misma receta a 700.
- **Eje** (0.6875rem): las cifras del eje del gráfico en Chivo Mono y los meses en Archivo 600 al 87.5 %, mayúsculas, en tinta.

### Named Rules
**La regla de la impresora.** Todo lo que viene de un dato (cifras, horas, nombres de servicio, hosts y las descripciones del catálogo, que son datos de la ficha) va en Chivo Mono. Archivo es sólo para la plantilla y el texto propio de la página.

**La regla del total.** Lo único grande es el estado general. Ningún otro texto supera 1.375rem.

**La regla del rótulo de campo.** Un rótulo nombra un campo que tiene su valor al lado o debajo (Emitido, Período, Servidor MCP, Lectura). Nunca va suelto encima de un título como antetítulo: la frase del estado general es el `h2` sin rótulo.

## Layout

Una hoja centrada de 66rem como máximo, con márgenes de 1.5rem arriba, 2rem a los lados y 4.5rem abajo (1rem, 1rem y 3rem en el celular). El espaciado sale de la escala `e-1` a `e-8` (de 0.25rem a 4.5rem); entre bloques mayores se usan `e-7` y `e-8`, dentro de un recuadro `e-3` a `e-5`.

El orden de la hoja es fijo: encabezado, recuadro del estado general, grilla de servicios, talón, pie.

- **Encabezado:** una grilla de reglas con tres columnas (emisor, campos, idioma). Por debajo de 64rem los campos bajan a un renglón propio de dos columnas.
- **Estado general:** alto mínimo de 16rem en desktop; en el celular `58svh`, para que con el encabezado sea dueño de la primera pantalla.
- **Grilla de servicios:** columnas `minmax(0, 1fr) 7.5rem 11.5rem 10rem` (servicio, estado, última lectura, disponibilidad), con las tres de datos alineadas a la derecha y heredadas por subgrid. Por debajo de 48rem es una sola columna: la cabecera se oculta y cada dato se vuelve un renglón con su rótulo a la izquierda y el valor a la derecha, separado por reglas suaves.
- **Talón:** separado por una línea troquelada a 4.5rem (3rem en el celular), con campos en dos columnas que pasan a una en el celular.

Cortes: 63.99rem y 47.99rem.

## Elevation & Depth

Plano. La boleta es papel impreso: la profundidad no existe y la jerarquía la dan los recuadros de regla y los paneles de trama. No hay `box-shadow` de profundidad, ni desenfoque, ni capas.

La única sombra del CSS es un anillo sin desenfoque en el día elegido del gráfico: 1 px de papel y 1 px de tinta alrededor de la barra. Es una marca de selección, no una elevación.

### Named Rules
**La regla de la impresión plana.** Ningún elemento flota sobre otro. Para separar se usa una regla de 1 px o un panel de trama, nunca una sombra.

**La regla del paso seco.** No hay transiciones, animaciones ni easing. Un hover, una selección o el "Copiado" del botón cambian de golpe.

## Shapes

Esquinas a escuadra en todo (radio 0), también en botones y controles. El lenguaje de formas es el del formulario: recuadros de regla de 1 px en tinta que comparten bordes (el renglón de cada servicio no repite la regla superior), una línea discontinua de 1 px para el troquel del talón y un contorno discontinuo para la marca de "sin datos". La marca de estado es un cuadrado lleno de 0.6875rem.

## Components

### Buttons
Sobrios, de formulario.
- **Shape:** a escuadra (0), regla de 1 px en tinta.
- **Primary:** papel con letra en tinta, receta de rótulo a 700, relleno 0.3125rem × 0.75rem.
- **Hover / Focus:** hover en trama; activo y "Copiado" en tinta llena con letra en papel; error con borde y letra en bermellón. El foco de todo el sitio es un contorno de 2 px en tinta, separado 2 px.

### Navigation
- **Selector de idioma:** dos casilleros EN y ES dentro del encabezado, separados por reglas, de 3.25rem de ancho mínimo, Archivo 700 a 0.8125rem con tracking 0.08em. El actual va en tinta llena con letra en papel; el otro, hover en trama.
- **Links:** heredan el color del texto, subrayado de 1 px en tinta (2 px en hover), separado 0.22em. Los nombres de servicio van sin subrayado hasta el hover. El nombre del servicio caído en la frase del estado general es un link a su renglón, subrayado en el color de la frase.

### Cards / Containers
- **Corner Style:** a escuadra (0).
- **Background:** papel; trama para los paneles destacados (estado general, cabecera de la grilla).
- **Shadow Strategy:** ninguna (ver Elevation & Depth).
- **Border:** 1 px en tinta.
- **Internal Padding:** 3rem × 2rem en el estado general (2rem × 1rem en el celular); 1rem con 1.5rem abajo en cada servicio; 0.75rem × 1.5rem en los campos del encabezado.

### Campo
El par rótulo y valor del formulario: rótulo arriba en tinta, valor debajo en Chivo Mono negro, a `e-1` de distancia. Se usa en el encabezado, en el talón y en los datos de cada servicio en el celular.

### Estado
Una marca cuadrada y su palabra, a 650. "Anda": marca y palabra en negro. "Caído": las dos en bermellón. "Con fallas" ("Degraded"): la URL contesta pero algo de adentro no anda (ADR-0016); la palabra va en bermellón y la marca, partida: la mitad de arriba en bermellón y la de abajo en negro, como la barra de un día con un corte. "Sin datos": palabra en tinta a 450 y la marca vacía con contorno discontinuo. El estado nunca depende sólo del color: siempre lleva su palabra.

### Recuadro del estado general (componente firma)
El total de la boleta: un panel de trama en recuadro, con la frase en tamaño resumen y la cuenta debajo. Negro si todo anda; bermellón si algo cae o anda con fallas, nombrando primero lo caído y después lo que anda con fallas, cada uno con un link a su renglón ("Neonduel is down. Audio is degraded."); tinta si la API no contestó ("Ahora no hay datos."). Lleva `role="status"`.

### Gráfico de consumo (componente firma)
El gráfico de la boleta: 90 barras, una por día UTC, de 2.75rem de alto (2.25rem en el celular), con 2 px entre barras (1 px en el celular) y la regla de base en tinta. El eje vertical va de 95 % a 100 %, rotulado a la izquierda.
- **Día completo:** barra llena en negro.
- **Día con corte:** negro con la parte faltante arriba en bermellón, 2 px como mínimo para que un corte corto se vea.
- **Día sin lectura:** el casillero vacío, una línea vertical punteada de 1 px en tinta (2 px de trazo, 3 de hueco).
- **Día elegido:** el anillo de papel y tinta.
- **Meses:** cada mes empieza con una raya de 0.25rem colgada de la regla de base, con su nombre debajo; un mes con menos de 6 días en el gráfico apoya su nombre en el borde derecho.
- **Lectura:** el renglón de abajo, con el rótulo "Lectura" y la lectura del día en Chivo Mono chico, impresa en tramos que no se cortan, con el separador " · " pegado al tramo que le sigue.
- **Interacción:** es un `slider`; se recorre con el puntero, arrastrando con el dedo o con flechas, Re Pág y Av Pág (7 días), Inicio y Fin. Arranca en el día de hoy. Cursor en cruz.

### Talón
El talón troquelado al pie: título en receta de documento, una línea de texto y una grilla de campos con reglas de 1 px (la URL del MCP en Chivo Mono a 1.375rem, el comando a tamaño de dato, cada uno con su botón de copiar).

## Do's and Don'ts

### Do:
- **Do** imprimir en tinta violeta todo lo que es plantilla (reglas, recuadros, rótulos, ejes) y en negro de impresora, con Chivo Mono, todo lo que viene de un dato.
- **Do** reservar el bermellón para lo caído y lo que anda con fallas: la frase, la palabra y la marca del estado, y la parte faltante de un día, con 2 px como mínimo.
- **Do** dibujar un día sin lectura como el casillero punteado en tinta, y decir "sin datos" en vez de suponer que anda.
- **Do** mantener el estado general como lo único grande de la hoja, y dueño de la primera pantalla del celular junto con el encabezado.
- **Do** usar reglas de 1 px y paneles de trama para separar, con esquinas a escuadra.
- **Do** cambiar los estados en pasos secos y escribir el tema oscuro como la misma boleta con los valores `*-oscuro`.
- **Do** acompañar cada estado con su palabra.

### Don't:
- **Don't** usar verde, ni para "anda" ni para nada.
- **Don't** usar sombras de profundidad, grano, textura ni papel simulado.
- **Don't** agregar transiciones, animaciones ni easing.
- **Don't** redondear esquinas.
- **Don't** poner un rótulo encima de un título como antetítulo: los rótulos son nombres de campo.
- **Don't** pintar un día sin lectura como caído, ni como andando.
- **Don't** agregar una tercera tipografía ni cargar fuentes desde un CDN.
- **Don't** llevar a la página real la banda de aviso de la maqueta ("Mockup: demo data…") ni sus links de escenario: son sólo de la maqueta.
