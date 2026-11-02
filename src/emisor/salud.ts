import {createServer} from 'node:http';
import type {Server} from 'node:http';

/**
 * La salud del emisor, para el healthcheck de `infra` (S11): un `/healthz` en `127.0.0.1` que dice si
 * el emisor está haciendo su trabajo, que es mandarle el envío al Worker cada minuto. El gate de
 * `infra` le pide a todo servicio un healthcheck contra `127.0.0.1`, y su deploy vuelve a la imagen
 * anterior si el contenedor no queda healthy.
 */

/** El puerto si falta `PUERTO_SALUD`. Está documentado en el README, e `infra` lo registra. */
const PUERTO_POR_DEFECTO = 8460;

/** Un envío bueno vale por tres ciclos de un minuto: pasado eso, el ciclo se trabó. */
const VIGENCIA_MS = 3 * 60_000;

/** Lo que pasó con los envíos: cuándo salió bien el último bueno y si el último de todos falló. */
export class RegistroDeEnvios {
  private ultimoBien: number | null = null;
  private ultimoFallo = false;

  anotar(salioBien: boolean, cuando: number): void {
    this.ultimoFallo = !salioBien;
    if (salioBien) {
      this.ultimoBien = cuando;
    }
  }

  /** `null` si el emisor está sano a la hora `ahora`, o el motivo por el que no lo está. */
  problema(ahora: number): string | null {
    if (this.ultimoBien === null) {
      return 'todavía no salió ningún envío bueno';
    }
    if (this.ultimoFallo) {
      return 'el último envío falló';
    }
    if (ahora - this.ultimoBien > VIGENCIA_MS) {
      return 'el último envío bueno tiene más de 3 minutos';
    }
    return null;
  }
}

/** El puerto de `PUERTO_SALUD`, o 8460 si la variable falta o está vacía. */
export function puertoDeSalud(variable: string | undefined): number {
  if (variable === undefined || variable === '') {
    return PUERTO_POR_DEFECTO;
  }
  const puerto = Number(variable);
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65_535) {
    throw new Error(`PUERTO_SALUD tiene que ser un puerto entre 1 y 65535, y es "${variable}".`);
  }
  return puerto;
}

/** Levanta el servidor de salud en `127.0.0.1`, sólo IPv4, como lo consulta el healthcheck de `infra`. */
export function servirSalud(registro: RegistroDeEnvios, puerto: number, ahora: () => number = Date.now): Promise<Server> {
  const servidor = createServer((pedido, respuesta) => {
    respuesta.setHeader('content-type', 'text/plain; charset=utf-8');
    if (pedido.url !== '/healthz') {
      respuesta.writeHead(404).end('Not found\n');
      return;
    }
    const problema = registro.problema(ahora());
    respuesta.writeHead(problema ? 503 : 200).end(problema ? `${problema}\n` : 'ok\n');
  });
  return new Promise((listo, fallo) => {
    servidor.once('error', fallo);
    servidor.listen(puerto, '127.0.0.1', () => listo(servidor));
  });
}
