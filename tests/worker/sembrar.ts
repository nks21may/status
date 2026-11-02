import {env} from 'cloudflare:workers';

/** Una fila de la historia, con la última sonda del día (ADR-0009). */
export interface Fila {
  stack: string;
  dia: string;
  medidos: number;
  arriba: number;
  latenciaMs: number;
  sondaEn: string;
  ultimaArriba: boolean;
}

/** Deja en D1 estos componentes y estas filas de historia, y nada más. */
export async function sembrar(componentes: [string, string][], filas: Fila[]): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM historia'),
    env.DB.prepare('DELETE FROM componentes'),
    ...componentes.map(([stack, url]) =>
      env.DB.prepare('INSERT INTO componentes (stack, url) VALUES (?1, ?2)').bind(stack, url),
    ),
    ...filas.map((fila) =>
      env.DB.prepare(
        `INSERT INTO historia (stack, dia, minutos_medidos, minutos_arriba, ultima_latencia_ms, ultima_sonda_en, ultima_arriba)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      ).bind(
        fila.stack,
        fila.dia,
        fila.medidos,
        fila.arriba,
        fila.latenciaMs,
        Date.parse(fila.sondaEn),
        fila.ultimaArriba ? 1 : 0,
      ),
    ),
  ]);
}
