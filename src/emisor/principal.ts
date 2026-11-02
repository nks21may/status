import {readFile} from 'node:fs/promises';
import {enviarUnaVez} from './enviar.ts';
import type {Configuracion} from './enviar.ts';
import {RegistroDeEnvios, puertoDeSalud, servirSalud} from './salud.ts';

/**
 * La entrada del emisor en la VPS (ADR-0003 y ADR-0004): un envío al arrancar y después uno por
 * minuto, y el `/healthz` que consulta el healthcheck de `infra` (S11). Lo corre Node 24 sin
 * compilar. Cómo y dónde corre lo decide `infra`.
 */

const INTERVALO_MS = 60_000;

/** Lo que espera cada pedido antes de darse por vencido, como las sondas del Worker. */
const TIMEOUT_MS = 10_000;

function variable(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    console.error(`Falta la variable de entorno ${nombre}.`);
    process.exit(1);
  }
  return valor;
}

const configuracion: Configuracion = {
  prometheusUrl: variable('PROMETHEUS_URL'),
  catalogo: variable('CATALOGO'),
  statusUrl: variable('STATUS_URL'),
  statusToken: variable('STATUS_TOKEN'),
};

const dependencias = {
  leerArchivo: (ruta: string) => readFile(ruta, 'utf8'),
  fetch: (url: string, init?: RequestInit) => fetch(url, {...init, signal: AbortSignal.timeout(TIMEOUT_MS)}),
  registrar: (linea: string) => console.log(`${new Date().toISOString()} ${linea}`),
};

const registro = new RegistroDeEnvios();
await servirSalud(registro, puertoDeSalud(process.env.PUERTO_SALUD));

async function ciclo(): Promise<void> {
  registro.anotar(await enviarUnaVez(configuracion, dependencias), Date.now());
}

await ciclo();
setInterval(() => void ciclo(), INTERVALO_MS);
