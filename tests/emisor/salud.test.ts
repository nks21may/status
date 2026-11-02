import type {Server} from 'node:http';
import type {AddressInfo} from 'node:net';
import {afterEach, describe, expect, it} from 'vitest';
import {RegistroDeEnvios, puertoDeSalud, servirSalud} from '../../src/emisor/salud.ts';

const AHORA = Date.parse('2026-11-02T13:05:00Z');
const MINUTO = 60_000;

let servidor: Server | undefined;

/** Levanta el servidor de salud en un puerto libre, con el reloj dado. */
async function levantar(registro: RegistroDeEnvios, ahora = () => AHORA): Promise<string> {
  const nuevo = await servirSalud(registro, 0, ahora);
  servidor = nuevo;
  const {address, port} = nuevo.address() as AddressInfo;
  return `http://${address}:${port}`;
}

describe('la salud del emisor', () => {
  afterEach(async () => {
    await new Promise((listo) => servidor?.close(listo) ?? listo(undefined));
    servidor = undefined;
  });

  it('escucha sólo en 127.0.0.1, y antes del primer envío contesta 503', async () => {
    const base = await levantar(new RegistroDeEnvios());

    expect((servidor?.address() as AddressInfo).address).toBe('127.0.0.1');
    expect((await fetch(`${base}/healthz`)).status).toBe(503);
  });

  it('después de un envío que el Worker aceptó, contesta 200', async () => {
    const registro = new RegistroDeEnvios();
    registro.anotar(true, AHORA - MINUTO);
    const base = await levantar(registro);

    const respuesta = await fetch(`${base}/healthz`);
    expect(respuesta.status).toBe(200);
  });

  it('si el último envío falló, contesta 503 aunque antes alguno haya salido bien', async () => {
    const registro = new RegistroDeEnvios();
    registro.anotar(true, AHORA - 2 * MINUTO);
    registro.anotar(false, AHORA - MINUTO);
    const base = await levantar(registro);

    const respuesta = await fetch(`${base}/healthz`);
    expect(respuesta.status).toBe(503);
    expect(await respuesta.text()).not.toBe('');
  });

  it('si el último envío bueno tiene más de 3 minutos, contesta 503: el ciclo se trabó', async () => {
    const registro = new RegistroDeEnvios();
    registro.anotar(true, AHORA - 3 * MINUTO);
    let ahora = AHORA;
    const base = await levantar(registro, () => ahora);

    expect((await fetch(`${base}/healthz`)).status).toBe(200);
    ahora += 1;
    expect((await fetch(`${base}/healthz`)).status).toBe(503);
  });

  it('cualquier otra ruta contesta 404', async () => {
    const registro = new RegistroDeEnvios();
    registro.anotar(true, AHORA);
    const base = await levantar(registro);

    expect((await fetch(`${base}/`)).status).toBe(404);
    expect((await fetch(`${base}/metrics`)).status).toBe(404);
  });

  it('el puerto sale de PUERTO_SALUD, o es 8460 si falta', () => {
    expect(puertoDeSalud(undefined)).toBe(8460);
    expect(puertoDeSalud('')).toBe(8460);
    expect(puertoDeSalud('9460')).toBe(9460);
    for (const invalido of ['abc', '0', '65536', '8460.5', '-1']) {
      expect(() => puertoDeSalud(invalido), invalido).toThrow(/PUERTO_SALUD/);
    }
  });
});
