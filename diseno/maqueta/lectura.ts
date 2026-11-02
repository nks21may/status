/**
 * La interacción de la maqueta es la de la página (ADR-0012): recorrer el gráfico de 90 días y copiar
 * la URL del MCP. `generar.ts` empaqueta este archivo con esbuild como `lectura.js`.
 */
import {iniciar} from '../../src/pagina/interaccion.ts';

iniciar(document);
