import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {armarEnvio} from '../../src/emisor/armar-envio.ts';
import {enviarUnaVez} from '../../src/emisor/enviar.ts';
import type {Envio} from '../../src/envio.ts';

const CATALOGO = readFileSync(new URL('./ejemplos/catalogo.json', import.meta.url), 'utf8');
const PROMETHEUS: unknown = JSON.parse(readFileSync(new URL('./ejemplos/prometheus.json', import.meta.url), 'utf8'));

const AUDIO = {
  stack: 'bot_discord',
  nombre: 'Audio',
  url: 'https://audio.nicolasdalessandro.dev/',
  descripcion: {
    es: 'Pasa el audio de una pestaña de Chrome a un canal de voz de Discord.',
    en: 'Pipes the audio of a Chrome tab into a Discord voice channel.',
  },
};
const MUSEO = {
  stack: 'museo',
  nombre: 'Museo',
  url: 'https://museo.nicolasdalessandro.dev/',
  descripcion: {
    es: 'Shaders de un tuit corriendo en vivo, que se recorren como canales de tele.',
    en: 'Tweet-sized shaders running live, browsed like TV channels.',
  },
};
const NEONDUEL = {
  stack: 'neonduel',
  nombre: 'Neonduel',
  url: 'https://neonduel.nicolasdalessandro.dev/',
  descripcion: {en: 'A 1v1 browser 3D shooter with Counter-Strike movement.'},
};

describe('el emisor arma el envío', () => {
  it('con las fichas visibles del catálogo y la salud de cada stack, sano si todos sus contenedores lo están', () => {
    const {envio} = armarEnvio(CATALOGO, PROMETHEUS);

    expect(envio).toEqual<Envio>({
      componentes: [
        {...AUDIO, sano: false},
        {...MUSEO, sano: true},
        {...NEONDUEL, sano: null},
      ],
    });
  });

  it('descarta la ficha que no cumple el contrato, con su motivo, sin tirar el resto', () => {
    const {envio, descartes} = armarEnvio(CATALOGO, PROMETHEUS);

    expect(envio.componentes.map((componente) => componente.stack)).not.toContain('portafolio');
    expect(descartes).toHaveLength(1);
    expect(descartes[0]).toContain('portafolio');
    expect(descartes[0]).toContain('url');
  });

  it('sin respuesta de Prometheus, manda la salud de todos sin datos', () => {
    const {envio} = armarEnvio(CATALOGO, null);

    expect(envio.componentes.map((componente) => componente.sano)).toEqual([null, null, null]);
  });

  it('un catálogo que no se puede leer no arma ningún envío', () => {
    expect(() => armarEnvio('no es JSON', PROMETHEUS)).toThrow(/catálogo/);
    expect(() => armarEnvio(JSON.stringify({version: 2, stacks: []}), PROMETHEUS)).toThrow(/version/);
    expect(() => armarEnvio(JSON.stringify({version: 1}), PROMETHEUS)).toThrow(/stacks/);
  });
});

describe('el emisor manda el envío', () => {
  const CONFIGURACION = {
    prometheusUrl: 'http://127.0.0.1:9090',
    catalogo: '/srv/cache/hub/catalogo.json',
    statusUrl: 'https://status.example',
    statusToken: 'secreto',
  };

  /** Un fetch de mentira que contesta a Prometheus y al Worker, y anota lo que le piden. */
  function simular(prometheus: Response | Error) {
    const pedidos: {url: string; init?: RequestInit}[] = [];
    const fetch = async (entrada: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const url = String(entrada);
      pedidos.push({url, init});
      if (url.startsWith(CONFIGURACION.prometheusUrl)) {
        if (prometheus instanceof Error) {
          throw prometheus;
        }
        return prometheus;
      }
      return new Response(null, {status: 204});
    };
    const lineas: string[] = [];
    return {pedidos, lineas, fetch, registrar: (linea: string) => lineas.push(linea)};
  }

  it('le pide la salud a Prometheus y le manda el cuerpo al Worker con el token', async () => {
    const simulado = simular(Response.json(PROMETHEUS));

    const enviado = await enviarUnaVez(CONFIGURACION, {...simulado, leerArchivo: async () => CATALOGO});

    expect(enviado).toBe(true);
    expect(simulado.pedidos.map((pedido) => pedido.url)).toEqual([
      'http://127.0.0.1:9090/api/v1/query?query=infra_contenedor_sano',
      'https://status.example/api/report',
    ]);
    const envio = simulado.pedidos[1]?.init;
    expect(envio?.method).toBe('POST');
    expect(new Headers(envio?.headers).get('authorization')).toBe('Bearer secreto');
    expect(new Headers(envio?.headers).get('content-type')).toBe('application/json');
    expect(JSON.parse(String(envio?.body))).toEqual(armarEnvio(CATALOGO, PROMETHEUS).envio);
    expect(simulado.lineas.join('\n')).toContain('portafolio');
  });

  it('si Prometheus no contesta, manda igual con la salud sin datos', async () => {
    const simulado = simular(new TypeError('connect ECONNREFUSED 127.0.0.1:9090'));

    const enviado = await enviarUnaVez(CONFIGURACION, {...simulado, leerArchivo: async () => CATALOGO});

    expect(enviado).toBe(true);
    expect(JSON.parse(String(simulado.pedidos[1]?.init?.body))).toEqual(armarEnvio(CATALOGO, null).envio);
    expect(simulado.lineas.join('\n')).toContain('Prometheus');
  });

  it('si el catálogo no se puede leer, no manda nada', async () => {
    const simulado = simular(Response.json(PROMETHEUS));

    const enviado = await enviarUnaVez(CONFIGURACION, {
      ...simulado,
      leerArchivo: async () => {
        throw new Error("ENOENT: no such file or directory, open '/srv/cache/hub/catalogo.json'");
      },
    });

    expect(enviado).toBe(false);
    expect(simulado.pedidos.some((pedido) => pedido.url.includes('/api/report'))).toBe(false);
    expect(simulado.lineas.join('\n')).toContain('catálogo');
  });
});
