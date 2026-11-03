/**
 * El loop de vista previa que el hub muestra en el recuadro del status (ADR-0019). El archivo es
 * `public/vista.mp4`, pero los archivos estáticos no contestan `Range`, y Safari no reproduce un video
 * sin un 206: por eso `/vista.mp4` pasa primero por el Worker, que lo lee de `ASSETS` y corta el
 * tramo.
 */

/** Una hora: el nombre es fijo, y un loop regrabado tiene que llegar en horas, no en días. */
const CACHE = 'public, max-age=3600';

/** Un tramo de bytes, con los dos extremos adentro. */
interface Tramo {
  desde: number;
  hasta: number;
}

/**
 * Lee un `Range: bytes=...` de un solo tramo contra un archivo de `total` bytes. Devuelve el tramo,
 * recortado al final del archivo; `'fuera'` si empieza después del final; o `null` si no lo entiende
 * (otra unidad, varios tramos, números al revés), y entonces va el archivo entero, como deja el
 * RFC 9110.
 */
function leerRango(cabecera: string | null, total: number): Tramo | 'fuera' | null {
  const partes = /^bytes=(\d*)-(\d*)$/.exec(cabecera?.trim() ?? '');
  if (!partes) {
    return null;
  }
  const [, desde = '', hasta = ''] = partes;
  if (desde === '') {
    // De sufijo: los últimos `hasta` bytes.
    if (hasta === '') {
      return null;
    }
    const cuantos = Number(hasta);
    return cuantos === 0 ? 'fuera' : {desde: Math.max(total - cuantos, 0), hasta: total - 1};
  }
  const inicio = Number(desde);
  if (inicio >= total) {
    return 'fuera';
  }
  const fin = hasta === '' ? total - 1 : Number(hasta);
  if (fin < inicio) {
    return null;
  }
  return {desde: inicio, hasta: Math.min(fin, total - 1)};
}

/** Contesta `/vista.mp4` con el video entero o con el tramo que pide `Range`. */
export async function servirVista(pedido: Request, assets: Fetcher): Promise<Response> {
  // Sin los encabezados del pedido: ASSETS ignora Range, y con un If-None-Match contestaría un 304
  // sin el cuerpo.
  const archivo = await assets.fetch(new URL('/vista.mp4', pedido.url));
  if (!archivo.ok) {
    return archivo;
  }
  const video = await archivo.arrayBuffer();
  const total = video.byteLength;
  // Sin Cross-Origin-Resource-Policy: el hub lo pide desde otro origen.
  const headers = new Headers({'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': CACHE});

  const tramo = leerRango(pedido.headers.get('Range'), total);
  if (tramo === 'fuera') {
    headers.set('Content-Range', `bytes */${total}`);
    return new Response(null, {status: 416, headers});
  }
  if (tramo) {
    headers.set('Content-Range', `bytes ${tramo.desde}-${tramo.hasta}/${total}`);
  }
  const cuerpo = tramo ? video.slice(tramo.desde, tramo.hasta + 1) : video;
  return new Response(pedido.method === 'HEAD' ? null : cuerpo, {status: tramo ? 206 : 200, headers});
}
