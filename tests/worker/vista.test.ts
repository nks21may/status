import {env, exports} from 'cloudflare:workers';
import {describe, expect, it} from 'vitest';

/**
 * `/vista.mp4`, el loop que el hub muestra en el recuadro del status, con
 * `<video muted loop playsInline autoPlay>` desde otro origen (ADR-0019). Safari no reproduce un
 * video si el servidor no contesta `Range` con 206, y los archivos estáticos no lo hacen: lo
 * contesta el Worker.
 */

const VISTA = 'https://status.example/vista.mp4';

/** El archivo tal como está en `public/`, pedido a los archivos estáticos: la referencia. */
async function archivo(): Promise<Uint8Array> {
  const respuesta = await env.ASSETS.fetch(VISTA);
  expect(respuesta.status, 'public/vista.mp4').toBe(200);
  return new Uint8Array(await respuesta.arrayBuffer());
}

/** Una huella del contenido: comparar 1,5 MB byte a byte deja un diff ilegible si falla. */
async function huella(datos: ArrayBuffer | Uint8Array): Promise<string> {
  const resumen = new Uint8Array(await crypto.subtle.digest('SHA-256', datos));
  return Array.from(resumen, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function pedir(headers: Record<string, string> = {}, method = 'GET'): Promise<Response> {
  return exports.default.fetch(VISTA, {method, headers});
}

describe('el loop de vista previa del hub, en /vista.mp4', () => {
  it('sin Range contesta 200 con el video entero, cacheable y sin Cross-Origin-Resource-Policy', async () => {
    const video = await archivo();
    const respuesta = await pedir();

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('content-type')).toBe('video/mp4');
    expect(respuesta.headers.get('accept-ranges')).toBe('bytes');
    expect(respuesta.headers.get('cache-control')).toBe('public, max-age=3600');
    // El hub lo pide desde otro origen: un `same-origin` lo dejaría sin cargar.
    expect(respuesta.headers.get('cross-origin-resource-policy')).toBeNull();
    expect(await huella(await respuesta.arrayBuffer())).toBe(await huella(video));
  });

  it('con un Range contesta 206 con el tramo pedido y su Content-Range', async () => {
    const video = await archivo();
    const total = video.length;
    const casos = [
      {range: 'bytes=0-99', desde: 0, hasta: 99},
      {range: 'bytes=100-', desde: 100, hasta: total - 1},
      // De sufijo: así busca Safari el índice cuando está al final del archivo.
      {range: 'bytes=-50', desde: total - 50, hasta: total - 1},
      // Lo que pasa del final se recorta al final.
      {range: `bytes=${total - 10}-${total + 5000}`, desde: total - 10, hasta: total - 1},
    ];

    for (const {range, desde, hasta} of casos) {
      const respuesta = await pedir({Range: range});

      expect(respuesta.status, range).toBe(206);
      expect(respuesta.headers.get('content-type'), range).toBe('video/mp4');
      expect(respuesta.headers.get('content-range'), range).toBe(`bytes ${desde}-${hasta}/${total}`);
      expect(await huella(await respuesta.arrayBuffer()), range).toBe(await huella(video.subarray(desde, hasta + 1)));
    }
  });

  it('un Range que empieza después del final contesta 416 con el tamaño', async () => {
    const total = (await archivo()).length;
    const respuesta = await pedir({Range: `bytes=${total}-`});

    expect(respuesta.status).toBe(416);
    expect(respuesta.headers.get('content-range')).toBe(`bytes */${total}`);
  });

  it('un Range que no entiende lo ignora y contesta el video entero', async () => {
    // El RFC 9110 deja ignorar un Range de otra unidad o de varios tramos: 200 con todo es válido.
    const video = await archivo();

    for (const range of ['items=0-5', 'bytes=0-5,10-15', 'bytes=abc', 'bytes=9-3']) {
      const respuesta = await pedir({Range: range});

      expect(respuesta.status, range).toBe(200);
      expect(await huella(await respuesta.arrayBuffer()), range).toBe(await huella(video));
    }
  });

  it('a HEAD le contesta los encabezados del GET, sin el cuerpo', async () => {
    await archivo();
    const respuesta = await pedir({}, 'HEAD');

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('content-type')).toBe('video/mp4');
    expect(respuesta.headers.get('accept-ranges')).toBe('bytes');
    expect((await respuesta.arrayBuffer()).byteLength).toBe(0);
  });
});
