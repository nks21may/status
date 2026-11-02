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

/** Lo que trae la ficha de un componente, como lo guarda el envío del emisor (ADR-0015). */
export interface Ficha {
  nombre: string;
  es?: string;
  en?: string;
  /** La salud de adentro que mandó el emisor; sin ella, sin datos. */
  sano?: boolean | null;
}

/**
 * Deja en D1 estos componentes y estas filas de historia, y nada más. `envioEn` es la hora del último
 * envío del emisor; sin ella, el emisor nunca mandó nada.
 */
export async function sembrar(componentes: [string, string, Ficha?][], filas: Fila[], envioEn?: string): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM historia'),
    env.DB.prepare('DELETE FROM componentes'),
    env.DB.prepare('DELETE FROM envios'),
    ...(envioEn ? [env.DB.prepare('INSERT INTO envios (id, recibido_en) VALUES (1, ?1)').bind(Date.parse(envioEn))] : []),
    ...componentes.map(([stack, url, ficha]) =>
      env.DB.prepare(
        'INSERT INTO componentes (stack, url, nombre, descripcion_es, descripcion_en, sano_adentro) VALUES (?1, ?2, ?3, ?4, ?5, ?6)',
      ).bind(
        stack,
        url,
        ficha?.nombre ?? null,
        ficha?.es ?? null,
        ficha?.en ?? null,
        ficha?.sano === undefined || ficha.sano === null ? null : Number(ficha.sano),
      ),
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
