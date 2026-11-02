import type {ComponentePublico, EstadoDeComponente, EstadoPublico, SaludDeAdentro, SondaPublica} from '../estado.ts';

/** Cuántos días UTC de historia da la API, contando el de hoy (ADR-0011). */
const DIAS = 90;

/** Pasado este tiempo sin sonda, un componente sale sin datos (ADR-0011); sin envío, lo de adentro (ADR-0016). */
const SIN_DATOS_MS = 5 * 60_000;

const DIA_MS = 86_400_000;

interface FilaComponente {
  stack: string;
  url: string;
  nombre: string | null;
  descripcion_es: string | null;
  descripcion_en: string | null;
  sano_adentro: number | null;
}

interface FilaDia {
  stack: string;
  dia: string;
  minutos_medidos: number;
  minutos_arriba: number;
}

interface FilaUltimaSonda {
  stack: string;
  ultima_sonda_en: number;
  ultima_arriba: number;
  ultima_latencia_ms: number;
}

/** La última sonda de cada componente vive en su fila del día más reciente (ADR-0009). */
const ULTIMAS_SONDAS = `
  SELECT stack, ultima_sonda_en, ultima_arriba, ultima_latencia_ms
  FROM historia AS fila
  WHERE dia = (SELECT MAX(dia) FROM historia WHERE stack = fila.stack)`;

function diaUtc(hora: number): string {
  return new Date(hora).toISOString().slice(0, 10);
}

/** El estado de ahora (ADR-0016): el de afuera, salvo una URL arriba con algo de adentro no sano. */
function estadoDeAhora(sonda: SondaPublica | null, adentro: SaludDeAdentro, ahora: number): EstadoDeComponente {
  if (!sonda || ahora - Date.parse(sonda.at) > SIN_DATOS_MS) {
    return 'no_data';
  }
  if (!sonda.up) {
    return 'down';
  }
  return adentro === 'unhealthy' ? 'degraded' : 'up';
}

/** Lo de adentro sólo vale si el último envío tiene 5 minutos o menos. */
function saludDeAdentro(sano: number | null, envioReciente: boolean): SaludDeAdentro {
  if (!envioReciente || sano === null) {
    return 'no_data';
  }
  return sano === 1 ? 'healthy' : 'unhealthy';
}

/**
 * El estado de cada componente a la hora `ahora`: el de su última sonda y los 90 días UTC que
 * terminan hoy, del más viejo al más nuevo, con los días sin fila en cero.
 */
export async function leerEstado(db: D1Database, ahora: number): Promise<EstadoPublico> {
  const fechas = Array.from({length: DIAS}, (_, indice) => diaUtc(ahora - (DIAS - 1 - indice) * DIA_MS));
  const [{results: componentes}, {results: filasDias}, {results: ultimas}, envio] = await Promise.all([
    db
      .prepare('SELECT stack, url, nombre, descripcion_es, descripcion_en, sano_adentro FROM componentes ORDER BY stack')
      .all<FilaComponente>(),
    db
      .prepare(
        'SELECT stack, dia, minutos_medidos, minutos_arriba FROM historia WHERE dia BETWEEN ?1 AND ?2',
      )
      .bind(fechas[0], fechas[DIAS - 1])
      .all<FilaDia>(),
    db.prepare(ULTIMAS_SONDAS).all<FilaUltimaSonda>(),
    db.prepare('SELECT recibido_en FROM envios WHERE id = 1').first<{recibido_en: number}>(),
  ]);
  const envioReciente = envio !== null && ahora - envio.recibido_en <= SIN_DATOS_MS;

  const diasPorStack = new Map<string, Map<string, FilaDia>>();
  for (const fila of filasDias) {
    const delStack = diasPorStack.get(fila.stack) ?? new Map<string, FilaDia>();
    delStack.set(fila.dia, fila);
    diasPorStack.set(fila.stack, delStack);
  }
  const ultimaPorStack = new Map(ultimas.map((fila) => [fila.stack, fila]));

  const componentesPublicos = componentes.map((componente): ComponentePublico => {
    const {stack, url, nombre, descripcion_es, descripcion_en, sano_adentro} = componente;
    const delStack = diasPorStack.get(stack);
    const dias = fechas.map((fecha) => {
      const fila = delStack?.get(fecha);
      return {date: fecha, minutes_measured: fila?.minutos_medidos ?? 0, minutes_up: fila?.minutos_arriba ?? 0};
    });
    const medidos = dias.reduce((suma, dia) => suma + dia.minutes_measured, 0);
    const arriba = dias.reduce((suma, dia) => suma + dia.minutes_up, 0);
    const ultima = ultimaPorStack.get(stack);
    const sonda = ultima
      ? {
          at: new Date(ultima.ultima_sonda_en).toISOString(),
          up: ultima.ultima_arriba === 1,
          latency_ms: ultima.ultima_latencia_ms,
        }
      : null;
    const adentro = saludDeAdentro(sano_adentro, envioReciente);
    return {
      id: stack,
      name: nombre,
      description: {en: descripcion_en, es: descripcion_es},
      inside: adentro,
      url,
      status: estadoDeAhora(sonda, adentro, ahora),
      last_check: sonda,
      uptime_90d: medidos === 0 ? null : arriba / medidos,
      days: dias,
    };
  });

  return {generated_at: new Date(ahora).toISOString(), components: componentesPublicos};
}
