import {validarComponente} from '../envio.ts';
import type {ComponenteEnviado, Envio} from '../envio.ts';

/**
 * Arma el envío del emisor (ADR-0015) con el catálogo de `infra` (ADR-0010 del hub) y la respuesta
 * de Prometheus a `infra_contenedor_sano`. Es una función pura: no lee archivos ni pide nada.
 */

type Objeto = Record<string, unknown>;

function esObjeto(valor: unknown): valor is Objeto {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/** Las entradas del catálogo. Si el texto no es un catálogo que el emisor sepa leer, falla con el motivo. */
function leerCatalogo(texto: string): unknown[] {
  let catalogo: unknown;
  try {
    catalogo = JSON.parse(texto);
  } catch (error) {
    throw new Error(`El catálogo no es JSON: ${error instanceof Error ? error.message : String(error)}.`, {
      cause: error,
    });
  }
  if (!esObjeto(catalogo) || catalogo.version !== 1) {
    const version = esObjeto(catalogo) ? JSON.stringify(catalogo.version) : 'ninguna';
    throw new Error(`El catálogo trae la version ${version}, y el emisor lee la 1.`);
  }
  if (!Array.isArray(catalogo.stacks)) {
    throw new Error('El catálogo no trae la lista de stacks.');
  }
  return catalogo.stacks;
}

/**
 * La salud de cada stack (ADR-0014): sano si todos sus contenedores dan 1. Las series sin la
 * etiqueta `stack` no cuentan. Sin respuesta de Prometheus, o con una que no se entiende, no hay
 * datos de adentro.
 */
function saludPorStack(prometheus: unknown): Map<string, boolean> | null {
  if (!esObjeto(prometheus) || prometheus.status !== 'success' || !esObjeto(prometheus.data)) {
    return null;
  }
  const series = prometheus.data.result;
  if (!Array.isArray(series)) {
    return null;
  }
  const salud = new Map<string, boolean>();
  for (const serie of series) {
    if (!esObjeto(serie) || !esObjeto(serie.metric) || !Array.isArray(serie.value)) {
      continue;
    }
    const stack = serie.metric.stack;
    if (typeof stack === 'string' && stack !== '') {
      salud.set(stack, (salud.get(stack) ?? true) && serie.value[1] === '1');
    }
  }
  return salud;
}

/**
 * El envío con las fichas visibles del catálogo: ni `oculto` ni de un stack `apagado` (ADR-0007).
 * Una ficha que no cumple el contrato se descarta con su motivo, sin tirar el resto.
 */
export function armarEnvio(textoCatalogo: string, prometheus: unknown): {envio: Envio; descartes: string[]} {
  const entradas = leerCatalogo(textoCatalogo);
  const salud = saludPorStack(prometheus);
  const componentes: ComponenteEnviado[] = [];
  const descartes: string[] = [];

  for (const entrada of entradas) {
    if (!esObjeto(entrada) || !esObjeto(entrada.hub)) {
      descartes.push(`una entrada del catálogo sin ficha: ${JSON.stringify(entrada)}`);
      continue;
    }
    const {stack, apagado, hub} = entrada;
    if ('oculto' in hub || apagado === true) {
      continue;
    }
    const componente = validarComponente({
      stack,
      nombre: hub.nombre,
      url: hub.url,
      descripcion: hub.descripcion,
      sano: typeof stack === 'string' ? (salud?.get(stack) ?? null) : null,
    });
    if (typeof componente === 'string') {
      descartes.push(`${String(stack)}: ${componente}`);
    } else if (componentes.some((otro) => otro.stack === componente.stack)) {
      descartes.push(`${componente.stack}: el stack está repetido en el catálogo`);
    } else {
      componentes.push(componente);
    }
  }
  return {envio: {componentes}, descartes};
}
