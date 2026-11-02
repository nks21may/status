import {exports} from 'cloudflare:workers';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {sembrar} from './sembrar.ts';

/** El formato público de `GET /api/status` (ADR-0011), tal como lo lee alguien de afuera. */
interface Dia {
  date: string;
  minutes_measured: number;
  minutes_up: number;
}

interface Componente {
  id: string;
  name: string | null;
  description: {en: string | null; es: string | null};
  inside: string;
  url: string;
  status: string;
  last_check: {at: string; up: boolean; latency_ms: number} | null;
  uptime_90d: number | null;
  days: Dia[];
}

interface Estado {
  generated_at: string;
  components: Componente[];
}

const MUSEO = 'https://museo.example/';
const NEONDUEL = 'https://neonduel.example/';
const NONOGRAMA = 'https://nonograma.example/';

/** Pide el estado como cualquiera de afuera, a la hora dada. */
async function pedirEstado(ahora: string): Promise<{respuesta: Response; estado: Estado}> {
  vi.setSystemTime(new Date(ahora));
  const respuesta = await exports.default.fetch('https://status.example/api/status');
  return {respuesta, estado: await respuesta.json<Estado>()};
}

describe('la API de estado', () => {
  beforeEach(() => {
    vi.useFakeTimers({toFake: ['Date']});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('da el estado de ahora y los 90 días de cada componente, en inglés y sin campos internos', async () => {
    await sembrar(
      [
        ['neonduel', NEONDUEL],
        ['museo', MUSEO],
      ],
      [
        {stack: 'museo', dia: '2026-10-07', medidos: 1440, arriba: 1393, latenciaMs: 201, sondaEn: '2026-10-07T23:59:00Z', ultimaArriba: true},
        {stack: 'museo', dia: '2026-11-02', medidos: 785, arriba: 785, latenciaMs: 182, sondaEn: '2026-11-02T13:05:00Z', ultimaArriba: true},
        {stack: 'neonduel', dia: '2026-11-02', medidos: 785, arriba: 761, latenciaMs: 41, sondaEn: '2026-11-02T13:05:00Z', ultimaArriba: false},
      ],
    );

    const {respuesta, estado} = await pedirEstado('2026-11-02T13:05:42Z');

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('content-type')).toContain('application/json');
    expect(Object.keys(estado).sort()).toEqual(['components', 'generated_at']);
    expect(estado.generated_at).toBe('2026-11-02T13:05:42.000Z');
    expect(estado.components.map((componente) => componente.id)).toEqual(['museo', 'neonduel']);

    const [museo, neonduel] = estado.components;
    expect(Object.keys(museo ?? {}).sort()).toEqual([
      'days',
      'description',
      'id',
      'inside',
      'last_check',
      'name',
      'status',
      'uptime_90d',
      'url',
    ]);
    expect(museo).toMatchObject({
      id: 'museo',
      url: MUSEO,
      status: 'up',
      last_check: {at: '2026-11-02T13:05:00.000Z', up: true, latency_ms: 182},
      uptime_90d: (785 + 1393) / (785 + 1440),
    });
    expect(museo?.days).toHaveLength(90);
    expect(museo?.days[0]).toEqual({date: '2026-08-05', minutes_measured: 0, minutes_up: 0});
    expect(museo?.days.find((dia) => dia.date === '2026-10-07')).toEqual({
      date: '2026-10-07',
      minutes_measured: 1440,
      minutes_up: 1393,
    });
    expect(museo?.days.at(-1)).toEqual({date: '2026-11-02', minutes_measured: 785, minutes_up: 785});
    expect(neonduel).toMatchObject({
      id: 'neonduel',
      status: 'down',
      last_check: {at: '2026-11-02T13:05:00.000Z', up: false, latency_ms: 41},
      uptime_90d: 761 / 785,
    });
  });

  it('cada componente trae el nombre y la descripción de su ficha, y sin ficha todavía, nulos', async () => {
    await sembrar(
      [
        ['bot_discord', 'https://audio.example/', {nombre: 'Audio', en: 'Pipes audio into Discord.'}],
        ['museo', MUSEO, {nombre: 'Museo', es: 'Shaders como canales de tele.', en: 'Shaders browsed like TV channels.'}],
        ['neonduel', NEONDUEL],
      ],
      [],
    );

    const {estado} = await pedirEstado('2026-11-02T13:05:42Z');

    expect(estado.components.map(({id, name, description}) => ({id, name, description}))).toEqual([
      {id: 'bot_discord', name: 'Audio', description: {en: 'Pipes audio into Discord.', es: null}},
      {id: 'museo', name: 'Museo', description: {en: 'Shaders browsed like TV channels.', es: 'Shaders como canales de tele.'}},
      {id: 'neonduel', name: null, description: {en: null, es: null}},
    ]);
  });

  it('con un envío reciente trae la salud de adentro, y la URL arriba con algo de adentro no sano sale degraded', async () => {
    const arriba = {dia: '2026-11-02', medidos: 785, arriba: 785, latenciaMs: 90, sondaEn: '2026-11-02T13:05:00Z', ultimaArriba: true};
    await sembrar(
      [
        ['bot_discord', 'https://audio.example/', {nombre: 'Audio', en: 'Audio.', sano: false}],
        ['museo', MUSEO, {nombre: 'Museo', en: 'Museo.', sano: true}],
        ['neonduel', NEONDUEL, {nombre: 'Neonduel', en: 'Neonduel.', sano: false}],
        ['nonograma', NONOGRAMA, {nombre: 'Nonograma', en: 'Nonograma.', sano: null}],
      ],
      [
        {stack: 'bot_discord', ...arriba},
        {stack: 'museo', ...arriba},
        {stack: 'neonduel', ...arriba, arriba: 760, ultimaArriba: false},
        {stack: 'nonograma', ...arriba},
      ],
      '2026-11-02T13:01:00Z',
    );

    const {estado} = await pedirEstado('2026-11-02T13:05:42Z');

    expect(estado.components.map(({id, status, inside}) => ({id, status, inside}))).toEqual([
      {id: 'bot_discord', status: 'degraded', inside: 'unhealthy'},
      {id: 'museo', status: 'up', inside: 'healthy'},
      {id: 'neonduel', status: 'down', inside: 'unhealthy'},
      {id: 'nonograma', status: 'up', inside: 'no_data'},
    ]);
  });

  it('sin envío en los últimos 5 minutos, lo de adentro sale sin datos y el estado vuelve a salir de afuera', async () => {
    const componentes: [string, string, {nombre: string; en: string; sano: boolean}][] = [
      ['bot_discord', 'https://audio.example/', {nombre: 'Audio', en: 'Audio.', sano: false}],
    ];
    const filas = [
      {stack: 'bot_discord', dia: '2026-11-02', medidos: 785, arriba: 785, latenciaMs: 90, sondaEn: '2026-11-02T13:05:00Z', ultimaArriba: true},
    ];

    await sembrar(componentes, filas, '2026-11-02T12:59:00Z');
    const {estado: viejo} = await pedirEstado('2026-11-02T13:05:42Z');
    expect(viejo.components).toMatchObject([{id: 'bot_discord', status: 'up', inside: 'no_data'}]);

    await sembrar(componentes, filas);
    const {estado: nunca} = await pedirEstado('2026-11-02T13:05:42Z');
    expect(nunca.components).toMatchObject([{id: 'bot_discord', status: 'up', inside: 'no_data'}]);
  });

  it('un componente sin medición reciente sale sin datos, no como arriba', async () => {
    await sembrar(
      [
        ['museo', MUSEO],
        ['neonduel', NEONDUEL],
      ],
      [
        // Seis minutos y 42 segundos antes del pedido: pasó el umbral de 5 minutos.
        {stack: 'museo', dia: '2026-11-02', medidos: 779, arriba: 779, latenciaMs: 182, sondaEn: '2026-11-02T12:59:00Z', ultimaArriba: true},
        // Justo 5 minutos antes: todavía cuenta.
        {stack: 'neonduel', dia: '2026-11-02', medidos: 781, arriba: 781, latenciaMs: 41, sondaEn: '2026-11-02T13:00:42Z', ultimaArriba: true},
      ],
    );

    const {estado} = await pedirEstado('2026-11-02T13:05:42Z');

    expect(estado.components).toMatchObject([
      {id: 'museo', status: 'no_data', last_check: {at: '2026-11-02T12:59:00.000Z', up: true}},
      {id: 'neonduel', status: 'up'},
    ]);
  });

  it('un componente que nunca se midió sale sin datos, con los 90 días en cero', async () => {
    await sembrar([['nonograma', NONOGRAMA]], []);

    const {estado} = await pedirEstado('2026-11-02T13:05:42Z');

    expect(estado.components).toHaveLength(1);
    const [nonograma] = estado.components;
    expect(nonograma).toMatchObject({id: 'nonograma', status: 'no_data', last_check: null, uptime_90d: null});
    expect(nonograma?.days).toHaveLength(90);
    expect(nonograma?.days.every((dia) => dia.minutes_measured === 0 && dia.minutes_up === 0)).toBe(true);
  });

  it('después de la medianoche UTC, el día nuevo abre en cero y la última sonda sigue siendo la de ayer', async () => {
    await sembrar(
      [['museo', MUSEO]],
      [{stack: 'museo', dia: '2026-11-02', medidos: 1440, arriba: 1440, latenciaMs: 182, sondaEn: '2026-11-02T23:59:00Z', ultimaArriba: true}],
    );

    const {estado} = await pedirEstado('2026-11-03T00:00:30Z');

    const [museo] = estado.components;
    expect(museo).toMatchObject({status: 'up', last_check: {at: '2026-11-02T23:59:00.000Z'}});
    expect(museo?.days[0]?.date).toBe('2026-08-06');
    expect(museo?.days.at(-2)).toEqual({date: '2026-11-02', minutes_measured: 1440, minutes_up: 1440});
    expect(museo?.days.at(-1)).toEqual({date: '2026-11-03', minutes_measured: 0, minutes_up: 0});
  });
});
