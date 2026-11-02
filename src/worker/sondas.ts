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

/** Suma una sonda a la fila del día, o la abre si es la primera del día (ADR-0009). */
const SUMAR_MINUTO = `
  INSERT INTO historia (stack, dia, minutos_medidos, minutos_arriba, ultima_latencia_ms)
  VALUES (?1, ?2, 1, ?3, ?4)
  ON CONFLICT (stack, dia) DO UPDATE SET
    minutos_medidos = minutos_medidos + 1,
    minutos_arriba = minutos_arriba + excluded.minutos_arriba,
    ultima_latencia_ms = excluded.ultima_latencia_ms`;

/** Prueba la URL: arriba si contesta 2xx, después de seguir las redirecciones (ADR-0009). */
async function probar({stack, url}: Componente): Promise<Sonda> {
  const inicio = Date.now();
  const respuesta = await fetch(url);
  return {stack, arriba: respuesta.ok, latenciaMs: Date.now() - inicio};
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
    sondas.map(({stack, arriba, latenciaMs}) => sumar.bind(stack, dia, arriba ? 1 : 0, latenciaMs)),
  );
}
