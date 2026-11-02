# Diseño

La maqueta de la página de status, con la que se fijó el diseño antes de S2
([ADR-0008](../docs/adr/0008-la-pagina-se-disena-con-impeccable.md)). La página real la armó S2
con TDD contra [`DESIGN.md`](../DESIGN.md), y la maqueta usa su CSS, sus tipografías y su
interacción, que viven en [`public/`](../public/) y [`src/pagina/`](../src/pagina/)
([ADR-0012](../docs/adr/0012-la-pagina-la-arma-el-navegador.md)): hay una sola copia del sistema.

**Los datos de la maqueta son de demostración, no mediciones.** Las fichas (nombre, URL, fecha de
publicación y descripciones) son las del catálogo de `infra` al 2026-11-02. Los minutos, las
latencias y los estados los inventa [`maqueta/generar.ts`](maqueta/generar.ts) con una semilla
fija.

## Cómo se ve

```bash
node diseno/maqueta/generar.ts
```

Escribe las páginas y `lectura.js` en `diseno/maqueta/`, que no se versionan: se generan. Para
abrirlas hace falta servir la raíz del repo, porque el CSS está en `public/` y las tipografías no
cargan desde `file://`. Después, abrí `http://127.0.0.1:4610/diseno/maqueta/`:

```bash
python -m http.server 4610 --bind 127.0.0.1
```

Hay tres escenarios en los dos idiomas:

| Escenario | Inglés | Español |
|---|---|---|
| Un servicio caído | `index.html` | `es.html` |
| Todo anda | `normal.html` | `normal.es.html` |
| La API no contestó | `sin-datos.html` | `sin-datos.es.html` |

## Qué hay

- `generar.ts`: las fichas, los datos de demostración y el HTML de cada escenario.
- `maqueta.css`: sólo la banda que avisa que los datos son de demostración.
- `lectura.ts`: la entrada que le da a la maqueta la interacción de la página.
