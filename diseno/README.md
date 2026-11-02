# Diseño

La maqueta de la página de status, con la que se fijó el diseño antes de S2
([ADR-0008](../docs/adr/0008-la-pagina-se-disena-con-impeccable.md)). La página real la arma S2
con TDD contra [`DESIGN.md`](../DESIGN.md), y se lleva [`maqueta/estilos.css`](maqueta/estilos.css)
y las tipografías.

**Los datos de la maqueta son de demostración, no mediciones.** Las fichas (nombre, URL, fecha de
publicación y descripciones) son las del catálogo de `infra` al 2026-11-02. Los minutos, las
latencias y los estados los inventa [`maqueta/generar.ts`](maqueta/generar.ts) con una semilla
fija.

## Cómo se ve

```bash
node diseno/maqueta/generar.ts
```

Escribe las páginas y `lectura.js` en `diseno/maqueta/`, que no se versionan: se generan. Para
abrirlas hace falta servir la carpeta, porque las tipografías no cargan desde `file://`:

```bash
python -m http.server 4610 --bind 127.0.0.1 --directory diseno/maqueta
```

Hay tres escenarios en los dos idiomas:

| Escenario | Inglés | Español |
|---|---|---|
| Un servicio caído | `index.html` | `es.html` |
| Todo anda | `normal.html` | `normal.es.html` |
| La API no contestó | `sin-datos.html` | `sin-datos.es.html` |

## Qué hay

- `estilos.css`: el sistema entero, con los tokens arriba y los temas claro y oscuro.
- `lectura.ts`: recorrer el gráfico de 90 días con el puntero, el dedo o las flechas, y copiar la
  URL del MCP.
- `generar.ts`: las fichas, los datos de demostración y el HTML de cada escenario.
- `fuentes/`: Archivo y Chivo Mono, de Omnibus-Type, con su licencia OFL.
