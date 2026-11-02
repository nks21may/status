import {exports} from 'cloudflare:workers';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {sembrar} from './sembrar.ts';

const AHORA = '2026-11-02T13:05:42Z';
const MUSEO = 'https://museo.example/';
const NEONDUEL = 'https://neonduel.example/';

/** Un mensaje de JSON-RPC 2.0 que contesta el servidor MCP. */
interface Respuesta {
  jsonrpc: string;
  id: number;
  result?: Record<string, unknown>;
  error?: {code: number; message: string};
}

/** El resultado de `tools/call`. */
interface ResultadoTool {
  content: {type: string; text: string}[];
  structuredContent?: unknown;
  isError?: boolean;
}

interface Tool {
  name: string;
  description: string;
  inputSchema: {type: string; properties?: Record<string, {type: string; minimum?: number; maximum?: number}>; required?: string[]};
  annotations?: {readOnlyHint?: boolean};
}

/** Manda un mensaje a `/mcp` como lo manda un cliente por Streamable HTTP. */
function enviar(mensaje: unknown): Promise<Response> {
  return exports.default.fetch('https://status.example/mcp', {
    method: 'POST',
    headers: {'content-type': 'application/json', accept: 'application/json, text/event-stream'},
    body: JSON.stringify(mensaje),
  });
}

async function pedir(method: string, params?: Record<string, unknown>): Promise<Respuesta> {
  const respuesta = await enviar({jsonrpc: '2.0', id: 1, method, params});
  expect(respuesta.status).toBe(200);
  expect(respuesta.headers.get('content-type')).toContain('application/json');
  return respuesta.json<Respuesta>();
}

async function llamarTool(name: string, args: Record<string, unknown> = {}): Promise<ResultadoTool> {
  const {result, error} = await pedir('tools/call', {name, arguments: args});
  expect(error).toBeUndefined();
  return result as unknown as ResultadoTool;
}

describe('el MCP', () => {
  beforeEach(async () => {
    vi.useFakeTimers({toFake: ['Date']});
    vi.setSystemTime(new Date(AHORA));
    await sembrar(
      [
        ['museo', MUSEO],
        ['neonduel', NEONDUEL, {nombre: 'Neonduel', en: 'A 1v1 browser 3D shooter.'}],
      ],
      [
        {stack: 'museo', dia: '2026-10-30', medidos: 1440, arriba: 1380, latenciaMs: 190, sondaEn: '2026-10-30T23:59:00Z', ultimaArriba: true},
        {stack: 'museo', dia: '2026-11-02', medidos: 785, arriba: 785, latenciaMs: 182, sondaEn: '2026-11-02T13:05:00Z', ultimaArriba: true},
        {stack: 'neonduel', dia: '2026-11-02', medidos: 785, arriba: 761, latenciaMs: 41, sondaEn: '2026-11-02T13:05:00Z', ultimaArriba: false},
      ],
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('contesta initialize con la versión que pide el cliente y sus capacidades', async () => {
    const {result} = await pedir('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: {name: 'test', version: '0.0.0'},
    });

    expect(result).toMatchObject({protocolVersion: '2025-06-18', capabilities: {tools: {}}});
    expect(result?.serverInfo).toMatchObject({name: expect.any(String), version: expect.any(String)});

    const avisoDeInicio = await enviar({jsonrpc: '2.0', method: 'notifications/initialized'});
    expect(avisoDeInicio.status).toBe(202);
    expect(await avisoDeInicio.text()).toBe('');
  });

  it('a una versión que no conoce le contesta con la más nueva', async () => {
    const {result} = await pedir('initialize', {
      protocolVersion: '1999-01-01',
      capabilities: {},
      clientInfo: {name: 'test', version: '0.0.0'},
    });

    expect(result?.protocolVersion).toBe('2025-11-25');
  });

  it('lista las tres tools de sólo lectura, con nombres y descripciones en inglés', async () => {
    const {result} = await pedir('tools/list');
    const tools = (result?.tools ?? []) as Tool[];

    expect(tools.map((tool) => tool.name).sort()).toEqual(['get_component', 'get_component_history', 'get_status']);
    for (const tool of tools) {
      expect(tool.description).toMatch(/^[A-Z][\x20-\x7e]+$/);
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.annotations?.readOnlyHint).toBe(true);
    }
    const historia = tools.find((tool) => tool.name === 'get_component_history');
    expect(historia?.inputSchema.required).toEqual(['component']);
    expect(historia?.inputSchema.properties?.days).toMatchObject({type: 'integer', minimum: 1, maximum: 90});
  });

  it('el estado general devuelve lo mismo que la API', async () => {
    const api = await (await exports.default.fetch('https://status.example/api/status')).json();

    const resultado = await llamarTool('get_status');

    expect(resultado.isError).toBeFalsy();
    expect(resultado.structuredContent).toEqual(api);
    expect(resultado.content).toHaveLength(1);
    expect(JSON.parse(resultado.content[0]?.text ?? '')).toEqual(api);
  });

  it('el estado de un componente es el de la API, con su ficha y sin la lista de días', async () => {
    const resultado = await llamarTool('get_component', {component: 'neonduel'});

    expect(resultado.isError).toBeFalsy();
    expect(resultado.structuredContent).toEqual({
      id: 'neonduel',
      name: 'Neonduel',
      description: {en: 'A 1v1 browser 3D shooter.', es: null},
      inside: 'no_data',
      url: NEONDUEL,
      status: 'down',
      last_check: {at: '2026-11-02T13:05:00.000Z', up: false, latency_ms: 41},
      uptime_90d: 761 / 785,
    });
  });

  it('la historia de un componente trae los últimos días pedidos y su disponibilidad', async () => {
    const resultado = await llamarTool('get_component_history', {component: 'museo', days: 4});

    expect(resultado.isError).toBeFalsy();
    expect(resultado.structuredContent).toEqual({
      id: 'museo',
      uptime: (1380 + 785) / (1440 + 785),
      days: [
        {date: '2026-10-30', minutes_measured: 1440, minutes_up: 1380},
        {date: '2026-10-31', minutes_measured: 0, minutes_up: 0},
        {date: '2026-11-01', minutes_measured: 0, minutes_up: 0},
        {date: '2026-11-02', minutes_measured: 785, minutes_up: 785},
      ],
    });

    const sinDias = await llamarTool('get_component_history', {component: 'museo'});
    expect((sinDias.structuredContent as {days: unknown[]}).days).toHaveLength(90);
  });

  it('un componente que no existe es un error de la tool, con los que hay', async () => {
    for (const tool of ['get_component', 'get_component_history']) {
      const resultado = await llamarTool(tool, {component: 'pinball'});

      expect(resultado.isError).toBe(true);
      expect(resultado.content[0]?.text).toContain('pinball');
      expect(resultado.content[0]?.text).toContain('museo, neonduel');
    }
    expect((await llamarTool('get_component')).isError).toBe(true);
  });

  it('una cantidad de días fuera de rango o que no es un entero es un error de la tool', async () => {
    for (const days of [0, 91, 1.5, '7', null]) {
      const resultado = await llamarTool('get_component_history', {component: 'museo', days});

      expect(resultado.isError).toBe(true);
      expect(resultado.content[0]?.text).toContain('days');
    }
  });

  it('una tool o un método que no existen son errores de JSON-RPC, no un 500', async () => {
    const {error: sinTool} = await pedir('tools/call', {name: 'drop_table', arguments: {}});
    expect(sinTool?.code).toBe(-32602);

    const {error: sinMetodo} = await pedir('resources/list');
    expect(sinMetodo?.code).toBe(-32601);
  });

  it('sin sesiones ni stream: GET contesta 405', async () => {
    const respuesta = await exports.default.fetch('https://status.example/mcp');

    expect(respuesta.status).toBe(405);
    expect(respuesta.headers.get('allow')).toBe('POST');
  });
});
