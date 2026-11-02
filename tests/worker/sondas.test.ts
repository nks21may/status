import {createExecutionContext, createScheduledController, waitOnExecutionContext} from 'cloudflare:test';
import {env} from 'cloudflare:workers';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import worker from '../../src/worker/index.ts';

const MUSEO = 'https://museo.example/';
const NEONDUEL = 'https://neonduel.example/';

/** Cuánto tarda en contestar la URL que anda, en la sonda simulada. */
const DEMORA_MS = 40;

/** Simula las URLs públicas: la de museo contesta 200 después de `demoraMs`, la otra 503. */
function simularUrls(demoraMs: number): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (entrada) => {
    const url = entrada instanceof Request ? entrada.url : String(entrada);
    if (url === MUSEO) {
      await new Promise((resolver) => setTimeout(resolver, demoraMs));
      return new Response('ok', {status: 200});
    }
    return new Response('caído', {status: 503});
  });
}

/** Corre el handler `scheduled` del Worker como lo dispara el cron, a la hora programada dada. */
async function correrCron(hora: string): Promise<void> {
  if (!worker.scheduled) {
    throw new Error('el Worker no tiene handler scheduled');
  }
  const controlador = createScheduledController({scheduledTime: new Date(hora), cron: '* * * * *'});
  const ctx = createExecutionContext();
  await worker.scheduled(controlador, env, ctx);
  await waitOnExecutionContext(ctx);
}

async function leerHistoria() {
  const {results} = await env.DB.prepare(
    'SELECT stack, dia, minutos_medidos, minutos_arriba, ultima_latencia_ms FROM historia ORDER BY stack, dia',
  ).all<{
    stack: string;
    dia: string;
    minutos_medidos: number;
    minutos_arriba: number;
    ultima_latencia_ms: number;
  }>();
  return results;
}

describe('el cron de las sondas', () => {
  beforeEach(async () => {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM historia'),
      env.DB.prepare('DELETE FROM componentes'),
      env.DB.prepare('INSERT INTO componentes (stack, url) VALUES (?1, ?2), (?3, ?4)').bind(
        'museo',
        MUSEO,
        'neonduel',
        NEONDUEL,
      ),
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('suma un minuto medido a cada componente y uno arriba sólo al que contesta 200, en la fila del día UTC', async () => {
    simularUrls(DEMORA_MS);

    await correrCron('2026-11-02T13:05:00Z');

    const historia = await leerHistoria();
    expect(historia).toMatchObject([
      {stack: 'museo', dia: '2026-11-02', minutos_medidos: 1, minutos_arriba: 1},
      {stack: 'neonduel', dia: '2026-11-02', minutos_medidos: 1, minutos_arriba: 0},
    ]);
  });

  it('guarda la latencia de la última sonda de cada componente', async () => {
    simularUrls(DEMORA_MS);
    await correrCron('2026-11-02T13:05:00Z');

    const [museo, neonduel] = await leerHistoria();
    expect(museo?.ultima_latencia_ms).toBeGreaterThanOrEqual(DEMORA_MS);
    expect(neonduel?.ultima_latencia_ms).toBeGreaterThanOrEqual(0);

    // La sonda siguiente contesta al toque: queda su latencia, no la más alta del día.
    simularUrls(0);
    await correrCron('2026-11-02T13:06:00Z');

    const [museoDespues] = await leerHistoria();
    expect(museoDespues?.ultima_latencia_ms).toBeLessThan(DEMORA_MS);
  });

  it('las corridas del mismo día UTC suman en su fila, y la medianoche UTC abre una nueva', async () => {
    simularUrls(0);

    await correrCron('2026-11-02T13:05:00Z');
    await correrCron('2026-11-02T23:59:00Z');
    await correrCron('2026-11-03T00:00:00Z');

    const historia = await leerHistoria();
    expect(historia).toMatchObject([
      {stack: 'museo', dia: '2026-11-02', minutos_medidos: 2, minutos_arriba: 2},
      {stack: 'museo', dia: '2026-11-03', minutos_medidos: 1, minutos_arriba: 1},
      {stack: 'neonduel', dia: '2026-11-02', minutos_medidos: 2, minutos_arriba: 0},
      {stack: 'neonduel', dia: '2026-11-03', minutos_medidos: 1, minutos_arriba: 0},
    ]);
  });
});
