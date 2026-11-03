import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {describe, expect, it} from 'vitest';

/**
 * El loop de vista previa que el hub muestra en el recuadro del status (ADR-0019). El formato es el
 * contrato del ADR-0010 del hub: MP4 H.264 sin pista de audio, 640×480, hasta 8 s y hasta 1,5 MB. Se
 * lee de las cajas del archivo, sin ffprobe, para que el gate no necesite nada instalado.
 */

const MAX_BYTES = 1_500_000;
const MAX_SEGUNDOS = 8;

interface Caja {
  tipo: string;
  datos: Buffer;
}

/** Las cajas de un tramo de un MP4: cuatro bytes de tamaño, cuatro de tipo y el contenido. */
function cajas(datos: Buffer): Caja[] {
  const lista: Caja[] = [];
  let desde = 0;
  while (desde + 8 <= datos.length) {
    let tamano = datos.readUInt32BE(desde);
    let cabecera = 8;
    if (tamano === 1) {
      // El tamaño de 64 bits va después del tipo.
      tamano = Number(datos.readBigUInt64BE(desde + 8));
      cabecera = 16;
    } else if (tamano === 0) {
      // Llega hasta el final.
      tamano = datos.length - desde;
    }
    if (tamano < cabecera) {
      throw new Error(`una caja de ${tamano} bytes en el byte ${desde}`);
    }
    lista.push({
      tipo: datos.toString('latin1', desde + 4, desde + 8),
      datos: datos.subarray(desde + cabecera, desde + tamano),
    });
    desde += tamano;
  }
  return lista;
}

/** El contenido de la única caja de cada tipo del camino: `caja(video, 'moov', 'mvhd')`. */
function caja(datos: Buffer, ...camino: string[]): Buffer {
  return camino.reduce((dentro, tipo) => {
    const encontradas = cajas(dentro).filter((cada) => cada.tipo === tipo);
    const [unica] = encontradas;
    if (encontradas.length !== 1 || !unica) {
      throw new Error(`se esperaba una caja ${tipo} y hay ${encontradas.length}`);
    }
    return unica.datos;
  }, datos);
}

function leer(ruta: string): Buffer {
  return readFileSync(new URL(`../${ruta}`, import.meta.url));
}

describe('el loop de vista previa del hub', () => {
  it('public/vista.mp4 cumple el contrato del hub: una sola pista, de video H.264, de 640×480, de hasta 8 s y hasta 1,5 MB', () => {
    const video = leer('public/vista.mp4');

    expect(video.length).toBeLessThanOrEqual(MAX_BYTES);
    expect(cajas(video)[0]?.tipo).toBe('ftyp');

    // La duración: en la versión 0, la escala y la duración van en los bytes 12 y 16, de 32 bits; en
    // la 1, en el 20 y el 24, la duración de 64.
    const mvhd = caja(video, 'moov', 'mvhd');
    const [escala, duracion] =
      mvhd[0] === 1
        ? [mvhd.readUInt32BE(20), Number(mvhd.readBigUInt64BE(24))]
        : [mvhd.readUInt32BE(12), mvhd.readUInt32BE(16)];
    expect(duracion / escala).toBeGreaterThan(0);
    expect(duracion / escala).toBeLessThanOrEqual(MAX_SEGUNDOS);

    // Una sola pista, y de video: sin audio.
    const pistas = cajas(caja(video, 'moov')).filter((cada) => cada.tipo === 'trak');
    expect(pistas).toHaveLength(1);
    const pista = pistas[0]?.datos ?? Buffer.alloc(0);
    expect(caja(pista, 'mdia', 'hdlr').toString('latin1', 8, 12)).toBe('vide');

    // H.264: la primera entrada de stsd es avc1, con el ancho y el alto codificados en los bytes 24 y 26.
    const [entrada] = cajas(caja(pista, 'mdia', 'minf', 'stbl', 'stsd').subarray(8));
    expect(entrada?.tipo).toBe('avc1');
    expect([entrada?.datos.readUInt16BE(24), entrada?.datos.readUInt16BE(26)]).toEqual([640, 480]);

    // El tamaño en pantalla, en punto fijo 16.16, son los últimos ocho bytes de tkhd.
    const tkhd = caja(pista, 'tkhd');
    expect([tkhd.readUInt32BE(tkhd.length - 8) / 0x10000, tkhd.readUInt32BE(tkhd.length - 4) / 0x10000]).toEqual([
      640, 480,
    ]);
  });

  it('el pedido de /vista.mp4, y ningún otro, pasa por el Worker antes que por los archivos estáticos', () => {
    // Los archivos estáticos no contestan Range, y Safari no reproduce un video sin 206 (ADR-0019).
    const {config, error} = ts.parseConfigFileTextToJson('wrangler.jsonc', leer('wrangler.jsonc').toString('utf8'));

    expect(error).toBeUndefined();
    expect(config.assets.run_worker_first).toEqual(['/vista.mp4']);
  });
});
