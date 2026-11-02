import {validarEnvio} from '../envio.ts';

/**
 * El envío del emisor (ADR-0003 y ADR-0015): un `POST` autenticado con el token del emisor. Sin el
 * token, el cuerpo ni se lee; con el token, se valida entero y recién ahí se escribe.
 */

const AUTORIZACION = /^Bearer (.+)$/i;

/** Compara el token sin que el tiempo dependa del largo ni de dónde difieren. */
async function mismoToken(recibido: string, esperado: string): Promise<boolean> {
  const codificador = new TextEncoder();
  const hashRecibido = await crypto.subtle.digest('SHA-256', codificador.encode(recibido));
  const hashEsperado = await crypto.subtle.digest('SHA-256', codificador.encode(esperado));
  return crypto.subtle.timingSafeEqual(hashRecibido, hashEsperado);
}

/** Actualiza un componente que viene en el envío; si no cambió nada, no escribe. */
const GUARDAR_COMPONENTE = `
  INSERT INTO componentes (stack, url, nombre, descripcion_es, descripcion_en, sano_adentro)
  VALUES (?1, ?2, ?3, ?4, ?5, ?6)
  ON CONFLICT (stack) DO UPDATE SET
    url = excluded.url,
    nombre = excluded.nombre,
    descripcion_es = excluded.descripcion_es,
    descripcion_en = excluded.descripcion_en,
    sano_adentro = excluded.sano_adentro
  WHERE (url, nombre, descripcion_es, descripcion_en, sano_adentro)
    IS NOT (excluded.url, excluded.nombre, excluded.descripcion_es, excluded.descripcion_en, excluded.sano_adentro)`;

/** Los componentes que ya no vienen salen de la lista; su historia queda (ADR-0009). */
const BORRAR_LOS_QUE_NO_VIENEN = 'DELETE FROM componentes WHERE stack NOT IN (SELECT value FROM json_each(?1))';

const ANOTAR_ENVIO = `
  INSERT INTO envios (id, recibido_en) VALUES (1, ?1)
  ON CONFLICT (id) DO UPDATE SET recibido_en = excluded.recibido_en`;

function rechazo(estado: number, motivo: string): Response {
  return new Response(motivo, {status: estado, headers: {'content-type': 'text/plain; charset=utf-8'}});
}

export async function recibirEnvio(pedido: Request, env: Cloudflare.Env, ahora: number): Promise<Response> {
  if (pedido.method !== 'POST') {
    return new Response(null, {status: 405, headers: {allow: 'POST'}});
  }
  const token = AUTORIZACION.exec(pedido.headers.get('authorization') ?? '')?.[1];
  if (!token || !env.EMISOR_TOKEN || !(await mismoToken(token, env.EMISOR_TOKEN))) {
    return rechazo(401, 'Unauthorized');
  }

  let cuerpo: unknown;
  try {
    cuerpo = await pedido.json();
  } catch {
    return rechazo(400, 'El cuerpo no es JSON.');
  }
  const envio = validarEnvio(cuerpo);
  if (typeof envio === 'string') {
    return rechazo(400, `El envío no cumple el contrato: ${envio}.`);
  }

  const db = env.DB;
  const guardar = db.prepare(GUARDAR_COMPONENTE);
  await db.batch([
    ...envio.componentes.map(({stack, url, nombre, descripcion, sano}) =>
      guardar.bind(stack, url, nombre, descripcion.es ?? null, descripcion.en ?? null, sano === null ? null : Number(sano)),
    ),
    db.prepare(BORRAR_LOS_QUE_NO_VIENEN).bind(JSON.stringify(envio.componentes.map((componente) => componente.stack))),
    db.prepare(ANOTAR_ENVIO).bind(ahora),
  ]);
  return new Response(null, {status: 204});
}
