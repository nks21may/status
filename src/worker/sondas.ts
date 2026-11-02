/** Un componente que el cron prueba: su stack y su URL pública. */
interface Componente {
  stack: string;
  url: string;
}

/** Lo que dejó la sonda de un componente. */
interface Sonda {
  stack: string;
  arriba: boolean;
  latenciaMs: number;
}

/**
 * Suma una sonda a la fila del día, o la abre si es la primera del día (ADR-0009), y deja en la fila
 * la última sonda: su latencia, su hora y si dio arriba (ADR-0011). Sólo suma si la corrida es
 * posterior a la última que sumó: una repetida para el mismo minuto no cuenta doble.
 */
const SUMAR_MINUTO = `
  INSERT INTO historia (stack, dia, minutos_medidos, minutos_arriba, ultima_latencia_ms, ultima_sonda_en, ultima_arriba)
  VALUES (?1, ?2, 1, ?3, ?4, ?5, ?3)
  ON CONFLICT (stack, dia) DO UPDATE SET
    minutos_medidos = minutos_medidos + 1,
    minutos_arriba = minutos_arriba + excluded.minutos_arriba,
    ultima_latencia_ms = excluded.ultima_latencia_ms,
    ultima_sonda_en = excluded.ultima_sonda_en,
    ultima_arriba = excluded.ultima_arriba
  WHERE excluded.ultima_sonda_en > historia.ultima_sonda_en`;

/** Lo que espera una sonda antes de darse por vencida: el timeout de `http_2xx` en blackbox. */
const TIMEOUT_MS = 10_000;

/**
 * Prueba la URL: arriba si contesta 2xx, después de seguir las redirecciones (ADR-0009). Un error
 * de red o un pedido que pasa el timeout cuentan como abajo, sin cortar las otras sondas.
 */
async function probar({stack, url}: Componente): Promise<Sonda> {
  const inicio = Date.now();
  // Con setTimeout y no con AbortSignal.timeout, que los timers simulados del test no adelantan.
  const corte = new AbortController();
  const temporizador = setTimeout(() => corte.abort(), TIMEOUT_MS);
  try {
    const respuesta = await fetch(url, {signal: corte.signal});
    return {stack, arriba: respuesta.ok, latenciaMs: Date.now() - inicio};
  } catch {
    return {stack, arriba: false, latenciaMs: Date.now() - inicio};
  } finally {
    clearTimeout(temporizador);
  }
}

/** El día UTC de una hora en milisegundos, como `AAAA-MM-DD`. */
function diaUtc(hora: number): string {
  return new Date(hora).toISOString().slice(0, 10);
}

/**
 * Prueba la URL de cada componente y suma el minuto a su fila del día UTC de `hora`, la hora
 * programada del cron. Las sondas van en paralelo, y lo que dejan, en un solo batch.
 */
export async function sondear(db: D1Database, hora: number): Promise<void> {
  const {results: componentes} = await db
    .prepare('SELECT stack, url FROM componentes')
    .all<Componente>();
  // Antes del primer envío del emisor no hay componentes, y D1 no acepta un batch vacío.
  if (componentes.length === 0) {
    return;
  }
  const sondas = await Promise.all(componentes.map(probar));

  const dia = diaUtc(hora);
  const sumar = db.prepare(SUMAR_MINUTO);
  await db.batch(
    sondas.map(({stack, arriba, latenciaMs}) =>
      sumar.bind(stack, dia, arriba ? 1 : 0, latenciaMs, hora),
    ),
  );
}
