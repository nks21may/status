import {armarEnvio} from './armar-envio.ts';

/**
 * Un envío del emisor (ADR-0003 y ADR-0015): lee el catálogo, le pide la salud a Prometheus y le
 * manda el resumen al Worker con el token. Lo que toca afuera llega por `dependencias`, así se
 * prueba sin red ni archivos.
 */

/** Lo que el emisor recibe por variables de entorno (ADR-0004). */
export interface Configuracion {
  prometheusUrl: string;
  catalogo: string;
  statusUrl: string;
  statusToken: string;
}

export interface Dependencias {
  leerArchivo: (ruta: string) => Promise<string>;
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
  registrar: (linea: string) => void;
}

function motivo(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function unir(base: string, ruta: string): string {
  return `${base.replace(/\/+$/, '')}${ruta}`;
}

/** Hace un envío. Devuelve si el Worker lo aceptó. */
export async function enviarUnaVez(configuracion: Configuracion, dependencias: Dependencias): Promise<boolean> {
  const {leerArchivo, fetch, registrar} = dependencias;

  let catalogo: string;
  try {
    catalogo = await leerArchivo(configuracion.catalogo);
  } catch (error) {
    // Una lista vacía por un error borraría todos los componentes: mejor no mandar nada.
    registrar(`No se pudo leer el catálogo (${configuracion.catalogo}): ${motivo(error)} No se manda nada.`);
    return false;
  }

  let prometheus: unknown = null;
  try {
    const respuesta = await fetch(unir(configuracion.prometheusUrl, '/api/v1/query?query=infra_contenedor_sano'));
    if (respuesta.ok) {
      prometheus = await respuesta.json();
    } else {
      registrar(`Prometheus contestó ${respuesta.status}: la salud va sin datos.`);
    }
  } catch (error) {
    registrar(`Prometheus no contestó (${motivo(error)}): la salud va sin datos.`);
  }

  let armado: ReturnType<typeof armarEnvio>;
  try {
    armado = armarEnvio(catalogo, prometheus, configuracion.statusUrl);
  } catch (error) {
    registrar(`${motivo(error)} No se manda nada.`);
    return false;
  }
  for (const descarte of armado.descartes) {
    registrar(`Se descarta la ficha de ${descarte}.`);
  }

  try {
    const respuesta = await fetch(unir(configuracion.statusUrl, '/api/report'), {
      method: 'POST',
      headers: {authorization: `Bearer ${configuracion.statusToken}`, 'content-type': 'application/json'},
      body: JSON.stringify(armado.envio),
    });
    if (!respuesta.ok) {
      registrar(`El Worker contestó ${respuesta.status}: ${await respuesta.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    registrar(`No se pudo mandar el envío: ${motivo(error)}`);
    return false;
  }
}
