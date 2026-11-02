# ADR-0012 — La página es un archivo estático que arma el navegador, y el gate chequea tres programas de TypeScript

- **Estado:** aceptado (propuesto por la iteración S2 del loop el 2026-11-02; confirmado por el
  usuario el 2026-11-02)
- **Fecha:** 2026-11-02
- **Decide:** cómo se sirve la página, dónde vive su código, cómo se compila y se prueba, y cómo
  recuerda el idioma.
- **Reemplaza:** la parte de [ADR-0010](0010-los-tests-del-worker-usan-vitest-plugin-con-vitest-4.md)
  que dice que el gate chequea dos programas de TypeScript. El resto de ADR-0010 sigue en pie.

## Contexto

ADR-0002 decidió que la página son archivos estáticos: sus pedidos son gratis y sin límite mientras
no pasen por el Worker. Armarla en el Worker gastaría un pedido del cupo por cada visita. Así que
el HTML lo arma el navegador, con los datos de la API (ADR-0011).

`PRODUCT.md` eligió HTML y CSS a mano con TypeScript sin framework. `DESIGN.md` describe el sistema,
y la maqueta de `diseno/` tiene el CSS, las tipografías y la interacción del gráfico.

El código de la página corre en el navegador: necesita los tipos del DOM, que no son los de Node ni
los de workerd. ADR-0010 ya separó dos programas porque los globales chocan.

## Decisión

- **Los archivos estáticos de Workers sirven `public/`** (`assets` en `wrangler.jsonc`). Lo que
  no es un archivo de ahí, como `/api/status` o `/mcp`, va al Worker.
- **`public/` tiene el HTML, el CSS y las tipografías.** `estilos.css` y `fuentes/` se mudan de la
  maqueta a `public/`, y la maqueta pasa a leerlos de ahí: hay una sola copia del sistema.
- **El código de la página vive en `src/pagina/`** y esbuild lo empaqueta en `public/pagina.js`,
  que no se versiona. Lo compila `npm run build:pagina`, y Wrangler lo corre antes de `dev` y de
  `deploy` (`build` en `wrangler.jsonc`).
- **El HTML de la página lo arma una función pura**, que recibe la respuesta de la API (o nada, si
  la API no contestó) y el idioma y devuelve el HTML, con todo dato escapado. Se prueba en Node. Lo
  que toca el navegador (pedir la API, el selector de idioma, recorrer el gráfico, copiar) queda
  en un archivo aparte, chico, sin test propio.
- **Los textos de la página viven en un solo lugar**, en los dos idiomas: ningún texto visible se
  escribe suelto en el HTML.
- **El idioma:** inglés por defecto, y español si el visitante lo elige en el selector (ADR-0005).
  La elección se recuerda en el navegador (`localStorage`). No se adivina por el idioma del
  navegador.
- **El gate chequea tres programas de TypeScript:** el de Node, el del Worker y el de la página
  (`tsconfig.pagina.json`, con los tipos del DOM y sin los de Node). El gate queda
  `tsc --noEmit && tsc --noEmit -p tsconfig.worker.json && tsc --noEmit -p tsconfig.pagina.json && eslint . --max-warnings=0 && vitest run`.
- **esbuild entra como dependencia directa**, en la versión exacta que ya traen Wrangler y el
  plugin.

## Consecuencias

**A favor:**

- Las visitas a la página no gastan cupo, y la página sigue en pie aunque la API falle: muestra que
  no hay datos.
- Lo que se ve, el HTML de cada estado en los dos idiomas, tiene test sin navegador ni dependencias
  nuevas.
- La maqueta y la página usan el mismo CSS.

**En contra:**

- Sin JavaScript la página no muestra nada más que el aviso de que lo necesita.
- Lo que toca el navegador no tiene test: lo cuidan los tipos del DOM y una prueba a mano.
- El gate no empaqueta la página: un error de esbuild aparece en `wrangler dev`, no en el gate. Es
  el mismo hueco del empaquetado del Worker, que sigue parkeado.

**Se revisa si:** la página necesita andar sin JavaScript, o el código del navegador crece hasta
necesitar sus propios tests.

## Alternativas consideradas

- **Armar el HTML en el Worker.** Cada visita sería un pedido del cupo, y si el Worker falla no
  queda nada en pie.
- **Probar la página con un DOM simulado (happy-dom o jsdom).** Es una dependencia más para
  probar lo mismo que ya prueba la función pura.
- **Sumar los tipos del DOM al programa de Node.** Ahorra un programa, pero el código de Node
  pasaría a ver `document` y `window` como si existieran.
- **Recordar el idioma en la URL (`/es/`).** Haría falta un HTML por idioma o reescrituras en el
  Worker, y un link compartido fijaría el idioma de quien lo compartió.
