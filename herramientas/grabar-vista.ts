/**
 * Regraba `public/vista.mp4`: el loop que el hub muestra en el recuadro del status (ADR-0019). Maneja
 * Google Chrome por CDP con el `WebSocket` de Node y arma el video con el `ffmpeg` del PATH, así que
 * no suma dependencias. No está en el gate, porque necesita Chrome y ffmpeg: el gate comprueba lo que
 * deja.
 *
 *   node herramientas/grabar-vista.ts [url] [salida.mp4]
 *
 * Por defecto graba la página publicada, con sus datos de verdad, y escribe `public/vista.mp4`. Para
 * grabar el Worker local, levantarlo con `npx wrangler dev` y pasarle su URL. Chrome se busca en la
 * ruta de Windows, o en la de la variable `CHROME`.
 *
 * El formato es el contrato del ADR-0010 del hub: MP4 H.264 sin pista de audio, 4:3 a 640×480, hasta
 * 8 s y hasta 1,5 MB. Se graba a 1280×960 para que se vea la página de escritorio y no la del
 * celular, y ffmpeg la baja a la mitad. Al final se comprueba el contrato con ffprobe.
 */
import {execFileSync, spawn} from 'node:child_process';
import {copyFileSync, mkdtempSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PUERTO = 9335;

const [
  url = 'https://status.nicolasdalessandro.dev/',
  salida = fileURLToPath(new URL('../public/vista.mp4', import.meta.url)),
] = process.argv.slice(2);

// El contrato del hub.
const ANCHO = 640;
const ALTO = 480;
const MAX_SEGUNDOS = 8;
const MAX_BYTES = 1_500_000;

// La toma: quieta arriba, en el estado general; el recorrido por los servicios hasta el talón; quieta
// abajo, y un fundido a blanco, el papel de la boleta, que vuelve al primer cuadro. Termina en el
// cuadro con el que empieza, así que el loop no salta.
const ESPERA_S = 0.8;
const RECORRIDO_S = 5.6;
const PAUSA_S = 0.8;
const FUNDIDO_S = 0.6;
/** Lo que dura el primer cuadro que vuelve, contando el propio fundido. */
const COLA_S = 1.0;
const TOMA_S = ESPERA_S + RECORRIDO_S + PAUSA_S;
const TOTAL_S = TOMA_S - FUNDIDO_S + COLA_S;
const FPS = 30;
/** De mejor a peor calidad, hasta que entre en el tope. */
const CRFS = [18, 20, 22, 24, 26, 28, 30, 32];

interface Cuadro {
  /** Cuándo lo pintó Chrome, en segundos. */
  segundos: number;
  /** El JPEG, en base64. */
  datos: string;
}

interface MensajeCdp {
  id?: number;
  result?: unknown;
  error?: {message: string};
  method?: string;
  params?: unknown;
}

const pausa = (ms: number): Promise<void> => new Promise((listo) => setTimeout(listo, ms));

/** La URL del WebSocket de la pestaña que abre Chrome. */
async function pestana(): Promise<string> {
  for (let intento = 0; intento < 60; intento += 1) {
    try {
      const respuesta = await fetch(`http://127.0.0.1:${PUERTO}/json/list`);
      const objetivos = (await respuesta.json()) as {type: string; webSocketDebuggerUrl: string}[];
      const pagina = objetivos.find((cada) => cada.type === 'page');
      if (pagina) {
        return pagina.webSocketDebuggerUrl;
      }
    } catch {
      // Chrome todavía no escucha.
    }
    await pausa(250);
  }
  throw new Error('Chrome no abrió ninguna pestaña en 15 s');
}

/** Una conexión CDP mínima: cada comando espera su respuesta, y cada evento tiene un oyente. */
async function conectar(direccion: string) {
  const socket = new WebSocket(direccion);
  await new Promise((listo, fallo) => {
    socket.addEventListener('open', listo, {once: true});
    socket.addEventListener('error', fallo, {once: true});
  });

  let ultimo = 0;
  const pendientes = new Map<number, {listo: (resultado: unknown) => void; fallo: (error: Error) => void}>();
  const oyentes = new Map<string, (parametros: unknown) => void>();
  socket.addEventListener('message', (evento) => {
    const mensaje = JSON.parse(String(evento.data)) as MensajeCdp;
    const pendiente = mensaje.id === undefined ? undefined : pendientes.get(mensaje.id);
    if (pendiente && mensaje.id !== undefined) {
      pendientes.delete(mensaje.id);
      if (mensaje.error) {
        pendiente.fallo(new Error(mensaje.error.message));
      } else {
        pendiente.listo(mensaje.result);
      }
    } else if (mensaje.method) {
      oyentes.get(mensaje.method)?.(mensaje.params);
    }
  });

  const enviar = (metodo: string, parametros: object = {}): Promise<unknown> =>
    new Promise((listo, fallo) => {
      ultimo += 1;
      pendientes.set(ultimo, {listo, fallo});
      socket.send(JSON.stringify({id: ultimo, method: metodo, params: parametros}));
    });

  /** Evalúa una expresión en la página, esperando la promesa si devuelve una. */
  const evaluar = async (expresion: string): Promise<unknown> => {
    const {result, exceptionDetails} = (await enviar('Runtime.evaluate', {
      expression: expresion,
      awaitPromise: true,
      returnByValue: true,
    })) as {result: {value?: unknown}; exceptionDetails?: {exception?: {description?: string}; text: string}};
    if (exceptionDetails) {
      throw new Error(`la página tiró: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
    }
    return result.value;
  };

  return {enviar, evaluar, oyentes, cerrar: () => socket.close()};
}

async function grabar(): Promise<Cuadro[]> {
  const cdp = await conectar(await pestana());
  try {
    await cdp.enviar('Page.enable');
    await cdp.enviar('Emulation.setDeviceMetricsOverride', {
      width: ANCHO * 2,
      height: ALTO * 2,
      deviceScaleFactor: 1,
      mobile: false,
    });
    // El tema claro es el de la boleta; el oscuro es la misma con otros siete valores (DESIGN.md).
    await cdp.enviar('Emulation.setEmulatedMedia', {
      features: [
        {name: 'prefers-color-scheme', value: 'light'},
        {name: 'prefers-reduced-motion', value: 'no-preference'},
      ],
    });

    const cargada = new Promise((listo) => cdp.oyentes.set('Page.loadEventFired', listo));
    await cdp.enviar('Page.navigate', {url});
    await Promise.race([cargada, pausa(15_000)]);
    // La página se arma con lo que contesta la API: hay que esperar los servicios y las tipografías.
    await cdp.evaluar(`new Promise((listo, fallo) => {
      const inicio = performance.now();
      const mirar = () => {
        if (document.querySelector('.servicios')) {
          document.fonts.ready.then(listo);
        } else if (performance.now() - inicio > 15000) {
          fallo(new Error('la página no mostró los servicios en 15 s'));
        } else {
          setTimeout(mirar, 100);
        }
      };
      mirar();
    })`);
    await pausa(1000);
    const distancia = Number(await cdp.evaluar('document.documentElement.scrollHeight - innerHeight'));
    console.log(`recorrido de ${distancia} px sobre ${url}`);

    const cuadros: Cuadro[] = [];
    cdp.oyentes.set('Page.screencastFrame', (parametros) => {
      const {data, metadata, sessionId} = parametros as {
        data: string;
        metadata: {timestamp: number};
        sessionId: number;
      };
      cuadros.push({segundos: metadata.timestamp, datos: data});
      cdp.enviar('Page.screencastFrameAck', {sessionId}).catch(() => {});
    });
    await cdp.enviar('Page.startScreencast', {
      format: 'jpeg',
      quality: 92,
      maxWidth: ANCHO * 2,
      maxHeight: ALTO * 2,
      everyNthFrame: 1,
    });

    await pausa(ESPERA_S * 1000);
    await cdp.evaluar(`new Promise((listo) => {
      const inicio = performance.now();
      const paso = (ahora) => {
        const t = Math.min(1, (ahora - inicio) / ${RECORRIDO_S * 1000});
        // Seno de entrada y salida: arranca y frena sin tirones.
        scrollTo({top: (0.5 - 0.5 * Math.cos(Math.PI * t)) * ${distancia}, behavior: 'instant'});
        if (t < 1) {
          requestAnimationFrame(paso);
        } else {
          listo();
        }
      };
      requestAnimationFrame(paso);
    })`);
    await pausa(PAUSA_S * 1000);
    await cdp.enviar('Page.stopScreencast');
    return cuadros;
  } finally {
    cdp.cerrar();
  }
}

/**
 * Escribe los cuadros y la lista del demuxer concat de ffmpeg. El screencast manda un cuadro sólo
 * cuando la página cambia: cada uno dura hasta que llega el siguiente, y el último, hasta completar
 * la toma.
 */
function escribirCuadros(cuadros: Cuadro[], carpeta: string): void {
  const inicio = cuadros[0]?.segundos ?? 0;
  const nombre = (indice: number): string => `c${String(indice).padStart(5, '0')}.jpg`;
  let lista = '';
  cuadros.forEach((cuadro, indice) => {
    writeFileSync(join(carpeta, nombre(indice)), Buffer.from(cuadro.datos, 'base64'));
    // Sin un mínimo de 1/FPS: Chrome manda más de 30 cuadros por segundo, y con el mínimo la toma se
    // estira y el corte de TOMA_S deja afuera el final. El filtro fps los lleva a 30 después.
    const siguiente = cuadros[indice + 1];
    const duracion = siguiente ? siguiente.segundos - cuadro.segundos : Math.max(inicio + TOMA_S - cuadro.segundos, 1 / FPS);
    lista += `file '${nombre(indice)}'\nduration ${duracion.toFixed(6)}\n`;
  });
  lista += `file '${nombre(cuadros.length - 1)}'\n`;
  writeFileSync(join(carpeta, 'lista.txt'), lista);
}

/**
 * Codifica la toma con un CRF y devuelve lo que pesa. Los JPEG de Chrome son BT.601 de rango
 * completo: se pasan a BT.709 de rango limitado y se etiquetan, así todos los navegadores pintan los
 * mismos colores. El fundido es a blanco y no un disolver: texto sobre texto a mitad de camino se ve
 * sucio.
 */
function codificar(carpeta: string, crf: number, destino: string): number {
  const repeticiones = Math.round(COLA_S * FPS) - 1;
  const filtro = [
    `[0:v]fps=${FPS},scale=${ANCHO}:${ALTO}:flags=lanczos+accurate_rnd:in_range=pc:in_color_matrix=bt601:out_range=tv:out_color_matrix=bt709,setsar=1,format=yuv420p,split[toma][copia]`,
    `[copia]trim=end_frame=1,loop=loop=${repeticiones}:size=1,setpts=N/(${FPS}*TB),fps=${FPS}[cola]`,
    `[toma][cola]xfade=transition=fadewhite:duration=${FUNDIDO_S}:offset=${(TOMA_S - FUNDIDO_S).toFixed(3)},format=yuv420p[v]`,
  ].join(';');
  execFileSync(
    'ffmpeg',
    [
      '-loglevel', 'error', '-y',
      '-f', 'concat', '-safe', '0', '-t', String(TOMA_S), '-i', 'lista.txt',
      '-filter_complex', filtro,
      '-map', '[v]', '-an',
      '-c:v', 'libx264', '-preset', 'veryslow', '-crf', String(crf),
      '-profile:v', 'main', '-level', '3.1', '-r', String(FPS),
      '-x264-params', 'aq-mode=3:colorprim=bt709:transfer=bt709:colormatrix=bt709:fullrange=off',
      '-movflags', '+faststart', '-map_metadata', '-1',
      destino,
    ],
    {cwd: carpeta, stdio: 'inherit'},
  );
  return statSync(destino).size;
}

/** Lo que no cumple el contrato del hub, según ffprobe. */
function comprobar(archivo: string): string[] {
  const sonda = JSON.parse(
    execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', archivo]).toString(),
  ) as {
    streams: {codec_type: string; codec_name: string; width: number; height: number; pix_fmt: string}[];
    format: {duration: string};
  };
  const [video] = sonda.streams;
  const segundos = Number(sonda.format.duration);
  const bytes = statSync(archivo).size;
  const problemas: string[] = [];
  if (sonda.streams.length !== 1 || video?.codec_type !== 'video') {
    problemas.push('tiene que tener una sola pista, la de video (sin audio)');
  }
  if (video?.codec_name !== 'h264') {
    problemas.push(`el codec es ${video?.codec_name}, no h264`);
  }
  if (video?.width !== ANCHO || video.height !== ALTO) {
    problemas.push(`mide ${video?.width}×${video?.height}`);
  }
  if (video?.pix_fmt !== 'yuv420p') {
    problemas.push(`pix_fmt ${video?.pix_fmt}, no yuv420p`);
  }
  if (!(segundos > 0 && segundos <= MAX_SEGUNDOS)) {
    problemas.push(`dura ${segundos} s`);
  }
  if (bytes > MAX_BYTES) {
    problemas.push(`pesa ${bytes} bytes`);
  }
  return problemas;
}

if (TOTAL_S > MAX_SEGUNDOS) {
  throw new Error(`la toma dura ${TOTAL_S} s y el tope es ${MAX_SEGUNDOS}`);
}

const perfil = mkdtempSync(join(tmpdir(), 'vista-chrome-'));
const carpeta = mkdtempSync(join(tmpdir(), 'vista-cuadros-'));
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--remote-debugging-port=${PUERTO}`,
    `--user-data-dir=${perfil}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    'about:blank',
  ],
  {stdio: 'ignore'},
);

try {
  const cuadros = await grabar();
  if (cuadros.length < 2) {
    throw new Error('el screencast no entregó cuadros');
  }
  escribirCuadros(cuadros, carpeta);
  const segundos = (cuadros.at(-1)?.segundos ?? 0) - (cuadros[0]?.segundos ?? 0);
  console.log(`${cuadros.length} cuadros en ${segundos.toFixed(2)} s, de ${TOMA_S.toFixed(1)} s de toma`);

  const video = join(carpeta, 'vista.mp4');
  const elegido = CRFS.find((crf) => {
    const bytes = codificar(carpeta, crf, video);
    console.log(`crf ${crf}: ${bytes} bytes`);
    return bytes <= MAX_BYTES;
  });
  if (elegido === undefined) {
    throw new Error(`ni con crf ${CRFS.at(-1)} entra en ${MAX_BYTES} bytes`);
  }

  const problemas = comprobar(video);
  if (problemas.length > 0) {
    throw new Error(`no cumple el contrato del hub: ${problemas.join('; ')}`);
  }
  copyFileSync(video, salida);
  console.log(`listo ${salida}: crf ${elegido}, ${statSync(salida).size} bytes, ${TOTAL_S.toFixed(1)} s`);
} finally {
  chrome.kill();
  rmSync(carpeta, {recursive: true, force: true});
  rmSync(perfil, {recursive: true, force: true, maxRetries: 5, retryDelay: 200});
}
