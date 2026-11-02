import {env, exports} from 'cloudflare:workers';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {sembrar} from './sembrar.ts';

/** El token con el que corren los tests (`vitest.config.ts`). */
const TOKEN = 'token-de-prueba';
const AHORA = '2026-11-02T13:05:42Z';

function enviar(cuerpo: string, autorizacion?: string, metodo = 'POST'): Promise<Response> {
  const headers = new Headers({'content-type': 'application/json'});
  if (autorizacion !== undefined) {
    headers.set('authorization', autorizacion);
  }
  return exports.default.fetch('https://status.example/api/report', {
    method: metodo,
    headers,
    body: metodo === 'GET' ? undefined : cuerpo,
  });
}

/** Lo que dejó escrito el último envío: los componentes y la hora en que llegó. */
async function leerLoEnviado() {
  const [{results: componentes}, {results: envios}, {results: historia}] = await Promise.all([
    env.DB.prepare(
      'SELECT stack, url, nombre, descripcion_es, descripcion_en, sano_adentro FROM componentes ORDER BY stack',
    ).all(),
    env.DB.prepare('SELECT recibido_en FROM envios').all(),
    env.DB.prepare('SELECT stack FROM historia ORDER BY stack').all(),
  ]);
  return {componentes, envios, historia};
}

function componente(stack: string, cambios: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    stack,
    nombre: stack[0]?.toUpperCase() + stack.slice(1),
    url: `https://${stack}.example/`,
    descripcion: {es: `El ${stack}.`, en: `The ${stack}.`},
    sano: true,
    ...cambios,
  };
}

describe('el envío del emisor', () => {
  beforeEach(async () => {
    vi.useFakeTimers({toFake: ['Date']});
    vi.setSystemTime(new Date(AHORA));
    await env.DB.prepare('DELETE FROM envios').run();
    await sembrar(
      [
        ['museo', 'https://museo.example/'],
        ['pinball', 'https://pinball.example/'],
      ],
      [{stack: 'pinball', dia: '2026-11-01', medidos: 1440, arriba: 1440, latenciaMs: 90, sondaEn: '2026-11-01T23:59:00Z', ultimaArriba: true}],
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sin token, con uno equivocado o mal formado contesta 401 y no escribe nada', async () => {
    const antes = await leerLoEnviado();
    const cuerpo = JSON.stringify({componentes: [componente('museo')]});

    for (const autorizacion of [undefined, '', 'Bearer ', 'Bearer otro-token', `bearer${TOKEN}`, TOKEN, `Basic ${TOKEN}`, `Bearer ${TOKEN}x`]) {
      const respuesta = await enviar(cuerpo, autorizacion);
      expect(respuesta.status, String(autorizacion)).toBe(401);
    }

    expect(await leerLoEnviado()).toEqual(antes);
  });

  it('con el token guarda los componentes del catálogo, la salud de cada uno y la hora del envío', async () => {
    const respuesta = await enviar(
      JSON.stringify({
        componentes: [
          componente('museo', {sano: true}),
          componente('bot_discord', {nombre: 'Audio', descripcion: {en: 'Pipes audio into Discord.'}, sano: false}),
          componente('neonduel', {sano: null}),
        ],
      }),
      `Bearer ${TOKEN}`,
    );

    expect(respuesta.status).toBe(204);
    const {componentes, envios, historia} = await leerLoEnviado();
    expect(componentes).toEqual([
      {stack: 'bot_discord', url: 'https://bot_discord.example/', nombre: 'Audio', descripcion_es: null, descripcion_en: 'Pipes audio into Discord.', sano_adentro: 0},
      {stack: 'museo', url: 'https://museo.example/', nombre: 'Museo', descripcion_es: 'El museo.', descripcion_en: 'The museo.', sano_adentro: 1},
      {stack: 'neonduel', url: 'https://neonduel.example/', nombre: 'Neonduel', descripcion_es: 'El neonduel.', descripcion_en: 'The neonduel.', sano_adentro: null},
    ]);
    expect(envios).toEqual([{recibido_en: Date.parse(AHORA)}]);
    // Pinball ya no viene en la lista, pero su historia queda.
    expect(historia).toEqual([{stack: 'pinball'}]);
  });

  it('un cuerpo que no cumple el contrato contesta 400 y no escribe nada', async () => {
    const antes = await leerLoEnviado();
    const invalidos = [
      'esto no es JSON',
      JSON.stringify([]),
      JSON.stringify({componentes: 'museo'}),
      JSON.stringify({componentes: [componente('Museo!')]}),
      JSON.stringify({componentes: [componente('m'.repeat(65))]}),
      JSON.stringify({componentes: [componente('museo', {url: 'http://museo.example/'})]}),
      JSON.stringify({componentes: [componente('museo', {nombre: ''})]}),
      JSON.stringify({componentes: [componente('museo', {nombre: 'N'.repeat(21)})]}),
      JSON.stringify({componentes: [componente('museo', {descripcion: {}})]}),
      JSON.stringify({componentes: [componente('museo', {descripcion: {es: 'D'.repeat(91)}})]}),
      JSON.stringify({componentes: [componente('museo', {sano: 'sí'})]}),
      JSON.stringify({componentes: [componente('museo'), componente('museo')]}),
      JSON.stringify({componentes: Array.from({length: 51}, (_, indice) => componente(`stack-${indice}`))}),
    ];

    for (const cuerpo of invalidos) {
      const respuesta = await enviar(cuerpo, `Bearer ${TOKEN}`);
      expect(respuesta.status, cuerpo.slice(0, 80)).toBe(400);
      expect(await respuesta.text()).not.toBe('');
    }

    expect(await leerLoEnviado()).toEqual(antes);
  });

  it('sólo acepta POST', async () => {
    const respuesta = await enviar('', `Bearer ${TOKEN}`, 'GET');

    expect(respuesta.status).toBe(405);
    expect(respuesta.headers.get('allow')).toBe('POST');
  });
});
