/**
 * Genera la maqueta de la página de status (ADR-0008) con **datos de demostración**: las fichas son
 * las reales del catálogo de `infra`, pero los minutos, las latencias y los estados son inventados
 * y no son mediciones. Escribe tres escenarios en los dos idiomas, y empaqueta `lectura.ts` como
 * `lectura.js`. El CSS y las tipografías son los de la página, en `public/` (ADR-0012):
 *
 * - `index.html` y `es.html`: un servicio caído;
 * - `normal.html` y `normal.es.html`: todo anda;
 * - `sin-datos.html` y `sin-datos.es.html`: la API no contestó.
 *
 * Se corre con `node diseno/maqueta/generar.ts`.
 */
import {buildSync} from 'esbuild';
import {writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

type Idioma = 'en' | 'es';
type Escenario = 'incidente' | 'normal' | 'sin-datos';
type Estado = 'anda' | 'caido';

interface Ficha {
  nombre: string;
  url: string;
  desde: string;
  descripcion: Record<Idioma, string>;
}

/** Un día de la historia; sin minutos medidos, es un día sin lectura. */
interface Dia {
  fecha: string;
  medidos: number;
  arriba: number;
}

interface Servicio {
  ficha: Ficha;
  estado: Estado;
  latenciaMs: number;
  dias: Dia[];
}

const CARPETA = dirname(fileURLToPath(import.meta.url));

/** La hora de la última lectura de la maqueta, y el día UTC en que cae. */
const HOY = '2026-11-02';
const HORA = '13:05';
const MINUTOS_HOY = 13 * 60 + 5;
const DIAS = 90;
const MINUTOS_POR_DIA = 1440;

/** Un mes con menos días que éstos al final del gráfico apoya su nombre en el borde derecho. */
const DIAS_PARA_ROTULAR = 6;

/** El día en que la VPS entera estuvo caída 47 minutos: una columna roja en todos los gráficos. */
const DIA_DE_LA_VPS = '2026-10-07';
const MINUTOS_SIN_VPS = 47;

/** En el escenario del incidente, Neonduel no contesta desde las 12:41. */
const CAIDO = 'Neonduel';
const MINUTOS_CAIDO_HOY = 24;

const MCP = 'https://status.nicolasdalessandro.dev/mcp';
const COMANDO = `claude mcp add --transport http status ${MCP}`;

/** Las fichas visibles del catálogo de `infra` al 2026-11-02, por orden alfabético. */
const FICHAS: Ficha[] = [
  {
    nombre: 'Audio',
    url: 'https://audio.nicolasdalessandro.dev/',
    desde: '2026-08-09',
    descripcion: {
      es: 'Pasa el audio de una pestaña de Chrome a un canal de voz de Discord.',
      en: 'Pipes the audio of a Chrome tab into a Discord voice channel.',
    },
  },
  {
    nombre: 'Museo',
    url: 'https://museo.nicolasdalessandro.dev/',
    desde: '2026-09-26',
    descripcion: {
      es: 'Shaders de un tuit corriendo en vivo, que se recorren como canales de tele.',
      en: 'Tweet-sized shaders running live, browsed like TV channels.',
    },
  },
  {
    nombre: 'Neonduel',
    url: 'https://neonduel.nicolasdalessandro.dev/',
    desde: '2026-09-04',
    descripcion: {
      es: 'Shooter 3D uno contra uno en el navegador, con movimiento de Counter-Strike.',
      en: 'A 1v1 browser 3D shooter with Counter-Strike movement.',
    },
  },
  {
    nombre: 'Nonograma',
    url: 'https://nonograma.nicolasdalessandro.dev/',
    desde: '2026-10-19',
    descripcion: {
      es: 'Nonogramas sin fin, de dibujos de pixel art y grillas aleatorias.',
      en: 'Endless nonograms, from pixel-art drawings and random grids.',
    },
  },
  {
    nombre: 'Portfolio',
    url: 'https://nicolasdalessandro.dev/',
    desde: '2026-09-07',
    descripcion: {
      es: 'Quién soy, qué hice y con qué: la versión seria.',
      en: "Who I am, what I've built and with what: the serious version.",
    },
  },
  {
    nombre: 'Surf & Bhop Daily',
    url: 'https://surf.nicolasdalessandro.dev/',
    desde: '2026-09-08',
    descripcion: {
      es: 'Surf y bunnyhop estilo Source, con una pista nueva cada día y ranking.',
      en: 'Source-style surf and bhop, with a new track every day and leaderboards.',
    },
  },
];

const MESES: Record<Idioma, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
};

const TEXTOS = {
  en: {
    titulo: 'Service status',
    aviso: 'Mockup: demo data, not measurements.',
    escenarios: {incidente: 'One down', normal: 'All up', 'sin-datos': 'No data'},
    emitido: 'Issued',
    periodo: 'Period, UTC days',
    dias: 'days',
    idioma: 'Language',
    todoAnda: 'All services are up.',
    caidos: (nombres: string) => `${nombres} ${nombres.includes(' and ') ? 'are' : 'is'} down.`,
    y: 'and',
    cuenta: (arriba: number, total: number) => `${arriba} of ${total} up · last reading ${HORA} UTC`,
    sinDatos: 'No data right now.',
    sinDatosCuenta: 'The status API did not answer. Try again in a minute.',
    servicios: 'Services',
    columnas: ['Service', 'Status', 'Last reading', '90-day availability'],
    estados: {anda: 'Up', caido: 'Down'},
    grafico: (nombre: string) => `${nombre}, daily availability for the last 90 days`,
    lectura: 'Reading',
    diaConLectura: (fecha: string, arriba: string, medidos: string, porcentaje: string) =>
      `${fecha} · up ${arriba} of ${medidos} min · ${porcentaje}`,
    diaSinLectura: (fecha: string) => `${fecha} · no reading`,
    talon: 'Check it from Claude',
    talonTexto: 'This status is also a public, read-only MCP server. Add it to Claude and ask.',
    servidor: 'MCP server',
    enClaude: 'On claude.ai',
    rutaClaude: 'Settings → Connectors → Add custom connector',
    pregunta: 'Then ask',
    ejemplo: '“Is museo up?”',
    copiar: 'Copy',
    copiado: 'Copied',
    error: "Couldn't copy",
    tambien: 'Also on nicolasdalessandro.dev',
  },
  es: {
    titulo: 'Estado del servicio',
    aviso: 'Maqueta: datos de demostración, no son mediciones.',
    escenarios: {incidente: 'Uno caído', normal: 'Todo anda', 'sin-datos': 'Sin datos'},
    emitido: 'Emitido',
    periodo: 'Período, días UTC',
    dias: 'días',
    idioma: 'Idioma',
    todoAnda: 'Todos los servicios andan.',
    caidos: (nombres: string) => `${nombres} ${nombres.includes(' y ') ? 'están caídos' : 'está caído'}.`,
    y: 'y',
    cuenta: (arriba: number, total: number) =>
      `${arriba} de ${total} ${arriba === 1 ? 'anda' : 'andan'} · última lectura ${HORA} UTC`,
    sinDatos: 'Ahora no hay datos.',
    sinDatosCuenta: 'La API del status no contestó. Probá de nuevo en un minuto.',
    servicios: 'Servicios',
    columnas: ['Servicio', 'Estado', 'Última lectura', 'Disponibilidad 90 días'],
    estados: {anda: 'Anda', caido: 'Caído'},
    grafico: (nombre: string) => `${nombre}, disponibilidad diaria de los últimos 90 días`,
    lectura: 'Lectura',
    diaConLectura: (fecha: string, arriba: string, medidos: string, porcentaje: string) =>
      `${fecha} · anduvo ${arriba} de ${medidos} min · ${porcentaje}`,
    diaSinLectura: (fecha: string) => `${fecha} · sin lectura`,
    talon: 'Consultalo desde Claude',
    talonTexto:
      'Este status también es un servidor MCP público y de sólo lectura. Sumalo a Claude y preguntale.',
    servidor: 'Servidor MCP',
    enClaude: 'En claude.ai',
    rutaClaude: 'Settings → Connectors → Add custom connector',
    pregunta: 'Después preguntale',
    ejemplo: '«¿Está andando museo?»',
    copiar: 'Copiar',
    copiado: 'Copiado',
    error: 'No se pudo copiar',
    tambien: 'También en nicolasdalessandro.dev',
  },
} as const;

/** Un generador pseudoaleatorio con semilla (mulberry32): la maqueta sale igual cada vez. */
function azar(semilla: number): () => number {
  let estado = semilla;
  return () => {
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function semillaDe(texto: string): number {
  return [...texto].reduce((suma, letra) => (Math.imul(suma, 31) + letra.charCodeAt(0)) | 0, 7);
}

function sumarDias(fecha: string, dias: number): string {
  const dia = new Date(`${fecha}T00:00:00Z`);
  dia.setUTCDate(dia.getUTCDate() + dias);
  return dia.toISOString().slice(0, 10);
}

/** Los minutos caídos de un día común: casi siempre ninguno, a veces un reinicio, rara vez más. */
function minutosCaidos(tirar: () => number): number {
  const tirada = tirar();
  if (tirada < 0.84) {
    return 0;
  }
  if (tirada < 0.96) {
    return 1 + Math.floor(tirar() * 9);
  }
  if (tirada < 0.993) {
    return 15 + Math.floor(tirar() * 80);
  }
  return 240 + Math.floor(tirar() * 420);
}

function historia(ficha: Ficha, escenario: Escenario): Dia[] {
  const tirar = azar(semillaDe(ficha.nombre));
  const primero = sumarDias(HOY, -(DIAS - 1));
  return Array.from({length: DIAS}, (_, indice) => {
    const fecha = sumarDias(primero, indice);
    const caidos = minutosCaidos(tirar);
    if (fecha < ficha.desde) {
      return {fecha, medidos: 0, arriba: 0};
    }
    if (fecha === HOY) {
      const hoyCaidos = escenario === 'incidente' && ficha.nombre === CAIDO ? MINUTOS_CAIDO_HOY : 0;
      return {fecha, medidos: MINUTOS_HOY, arriba: MINUTOS_HOY - hoyCaidos};
    }
    const total = fecha === DIA_DE_LA_VPS ? Math.max(caidos, MINUTOS_SIN_VPS) : caidos;
    return {fecha, medidos: MINUTOS_POR_DIA, arriba: MINUTOS_POR_DIA - total};
  });
}

function servicios(escenario: Escenario): Servicio[] {
  return FICHAS.map((ficha) => {
    const tirar = azar(semillaDe(`${ficha.nombre}/latencia`));
    const caido = escenario === 'incidente' && ficha.nombre === CAIDO;
    return {
      ficha,
      estado: caido ? 'caido' : 'anda',
      // Detrás del túnel, un origen caído contesta 502 al toque: la latencia sigue siendo chica.
      latenciaMs: caido ? 41 : 70 + Math.floor(tirar() * 260),
      dias: historia(ficha, escenario),
    };
  });
}

/** El ancla del renglón de un servicio, para llegar desde el estado general. */
function ancla(nombre: string): string {
  return nombre
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapar(texto: string): string {
  return texto
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function fecha(iso: string, idioma: Idioma): string {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return `${dia} ${MESES[idioma][(mes ?? 1) - 1]} ${anio}`;
}

function numero(valor: number, idioma: Idioma): string {
  return valor.toLocaleString(idioma === 'en' ? 'en-US' : 'es-AR');
}

function porcentaje(fraccion: number, idioma: Idioma): string {
  const cifra = (fraccion * 100).toFixed(2);
  return idioma === 'en' ? `${cifra}%` : `${cifra.replace('.', ',')} %`;
}

function disponibilidad(dias: Dia[]): number {
  const medidos = dias.reduce((suma, dia) => suma + dia.medidos, 0);
  const arriba = dias.reduce((suma, dia) => suma + dia.arriba, 0);
  return medidos === 0 ? 0 : arriba / medidos;
}

/** La altura de la barra: el eje va de 95 % a 100 %, así un día con un corte corto se ve. */
function altura(dia: Dia): number {
  return Math.min(Math.max((dia.arriba / dia.medidos - 0.95) / 0.05, 0), 1);
}

function barra(dia: Dia, idioma: Idioma): string {
  const textos = TEXTOS[idioma];
  const cuando = fecha(dia.fecha, idioma);
  if (dia.medidos === 0) {
    return `<span class="dia dia--sin-lectura" data-lectura="${escapar(textos.diaSinLectura(cuando))}"></span>`;
  }
  const lectura = textos.diaConLectura(
    cuando,
    numero(dia.arriba, idioma),
    numero(dia.medidos, idioma),
    porcentaje(dia.arriba / dia.medidos, idioma),
  );
  const clase = dia.arriba < dia.medidos ? 'dia dia--corte' : 'dia';
  const estilo = dia.arriba < dia.medidos ? ` style="--h: ${altura(dia).toFixed(3)}"` : '';
  return `<span class="${clase}"${estilo} data-lectura="${escapar(lectura)}"></span>`;
}

function meses(dias: Dia[], idioma: Idioma): string {
  return dias
    .map((dia, indice) =>
      indice === 0 || dia.fecha.endsWith('-01')
        ? dias.length - indice < DIAS_PARA_ROTULAR
          ? `<span class="mes--corto" style="grid-column: ${indice + 1} / -1">${MESES[idioma][Number(dia.fecha.slice(5, 7)) - 1]}</span>`
          : `<span style="grid-column: ${indice + 1}">${MESES[idioma][Number(dia.fecha.slice(5, 7)) - 1]}</span>`
        : '',
    )
    .join('');
}

function renglon(servicio: Servicio, idioma: Idioma): string {
  const textos = TEXTOS[idioma];
  const {ficha, estado} = servicio;
  const host = new URL(ficha.url).host;
  return `
      <li class="servicio" id="${ancla(ficha.nombre)}">
        <div class="servicio__fila">
          <div class="servicio__identidad">
            <h3 class="servicio__nombre"><a href="${ficha.url}">${escapar(ficha.nombre)}</a></h3>
            <p class="servicio__direccion">${host}</p>
            <p class="servicio__descripcion">${escapar(ficha.descripcion[idioma])}</p>
          </div>
          <dl class="servicio__datos">
            <div class="dato">
              <dt class="rotulo">${textos.columnas[1]}</dt>
              <dd><span class="estado estado--${estado}"><span class="marca"></span>${textos.estados[estado]}</span></dd>
            </div>
            <div class="dato">
              <dt class="rotulo">${textos.columnas[2]}</dt>
              <dd>${HORA} UTC · ${servicio.latenciaMs} ms</dd>
            </div>
            <div class="dato dato--disponibilidad">
              <dt class="rotulo">${textos.columnas[3]}</dt>
              <dd>${porcentaje(disponibilidad(servicio.dias), idioma)}</dd>
            </div>
          </dl>
        </div>
        <div class="consumo">
          <div class="consumo__eje" aria-hidden="true"><span>${idioma === 'en' ? '100%' : '100 %'}</span><span>${idioma === 'en' ? '95%' : '95 %'}</span></div>
          <div class="grafico" role="slider" tabindex="0" aria-label="${escapar(textos.grafico(ficha.nombre))}" aria-valuemin="1" aria-valuemax="${DIAS}" aria-valuenow="${DIAS}">
            ${servicio.dias.map((dia) => barra(dia, idioma)).join('')}
          </div>
          <div class="consumo__meses" aria-hidden="true">${meses(servicio.dias, idioma)}</div>
          <p class="consumo__lectura"><span class="rotulo">${textos.lectura}</span> <output class="consumo__valor"></output></p>
        </div>
      </li>`;
}

function resumen(lista: Servicio[], escenario: Escenario, idioma: Idioma): string {
  const textos = TEXTOS[idioma];
  if (escenario === 'sin-datos') {
    return `
    <section class="recuadro resumen resumen--sin-datos" role="status">
      <h2 class="resumen__frase">${textos.sinDatos}</h2>
      <p class="resumen__cuenta">${textos.sinDatosCuenta}</p>
    </section>`;
  }
  const caidos = lista
    .filter((servicio) => servicio.estado === 'caido')
    .map((servicio) => `<a href="#${ancla(servicio.ficha.nombre)}">${escapar(servicio.ficha.nombre)}</a>`);
  const frase =
    caidos.length === 0
      ? textos.todoAnda
      : textos.caidos(
          caidos.length === 1
            ? (caidos[0] ?? '')
            : `${caidos.slice(0, -1).join(', ')} ${textos.y} ${caidos.at(-1)}`,
        );
  const clase = caidos.length === 0 ? 'resumen' : 'resumen resumen--corte';
  return `
    <section class="recuadro ${clase}" role="status">
      <h2 class="resumen__frase">${frase}</h2>
      <p class="resumen__cuenta">${textos.cuenta(lista.length - caidos.length, lista.length)}</p>
    </section>`;
}

function copiar(texto: string, idioma: Idioma): string {
  const textos = TEXTOS[idioma];
  return `<button class="boton" type="button" data-copiar="${escapar(texto)}" data-copiado="${textos.copiado}" data-error="${escapar(textos.error)}">${textos.copiar}</button>`;
}

function archivo(escenario: Escenario, idioma: Idioma): string {
  const base = escenario === 'incidente' ? 'index' : escenario;
  if (idioma === 'en') {
    return `${base}.html`;
  }
  return escenario === 'incidente' ? 'es.html' : `${base}.es.html`;
}

function pagina(escenario: Escenario, idioma: Idioma): string {
  const textos = TEXTOS[idioma];
  const lista = servicios(escenario);
  const primero = sumarDias(HOY, -(DIAS - 1));
  const desde = primero.slice(0, 4) === HOY.slice(0, 4) ? fecha(primero, idioma).slice(0, -5) : fecha(primero, idioma);
  const periodo = `${desde} – ${fecha(HOY, idioma)}`;
  const escenarios = (['incidente', 'normal', 'sin-datos'] as const)
    .map((otro) => {
      const actual = otro === escenario ? ' aria-current="page"' : '';
      return `<a href="${archivo(otro, idioma)}"${actual}>${textos.escenarios[otro]}</a>`;
    })
    .join('');
  const idiomas = (['en', 'es'] as const)
    .map((otro) => {
      const actual = otro === idioma ? ' aria-current="page"' : '';
      return `<a class="idioma__opcion" href="${archivo(escenario, otro)}" lang="${otro}" hreflang="${otro}"${actual}>${otro.toUpperCase()}</a>`;
    })
    .join('');
  const grilla =
    escenario === 'sin-datos'
      ? ''
      : `
    <section class="servicios" aria-labelledby="servicios">
      <h2 class="oculto" id="servicios">${textos.servicios}</h2>
      <div class="servicios__cabecera rotulo" aria-hidden="true">${textos.columnas.map((columna) => `<span>${columna}</span>`).join('')}</div>
      <ol class="servicios__lista">${lista.map((servicio) => renglon(servicio, idioma)).join('')}
      </ol>
    </section>`;

  return `<!doctype html>
<html lang="${idioma}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${textos.titulo} · nicolasdalessandro.dev</title>
  <meta name="color-scheme" content="light dark">
  <link rel="preload" href="../../public/fuentes/chivo-mono-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="../../public/estilos.css">
  <link rel="stylesheet" href="maqueta.css">
  <script src="lectura.js" defer></script>
</head>
<body>
  <main class="hoja">
    <p class="aviso rotulo">${textos.aviso} <span class="aviso__escenarios">${escenarios}</span></p>

    <header class="encabezado">
      <div class="emisor">
        <p class="emisor__nombre">status.<wbr>nicolasdalessandro.dev</p>
        <h1 class="emisor__documento">${textos.titulo}</h1>
      </div>
      <dl class="campos">
        <div class="campo"><dt class="rotulo">${textos.emitido}</dt><dd>${fecha(HOY, idioma)}, ${HORA} UTC</dd></div>
        <div class="campo"><dt class="rotulo">${textos.periodo}</dt><dd>${periodo} · ${DIAS} ${textos.dias}</dd></div>
      </dl>
      <nav class="idioma" aria-label="${textos.idioma}">${idiomas}</nav>
    </header>
${resumen(lista, escenario, idioma)}
${grilla}

    <section class="talon" aria-labelledby="talon">
      <h2 class="talon__titulo" id="talon">${textos.talon}</h2>
      <p class="talon__texto">${textos.talonTexto}</p>
      <dl class="talon__campos">
        <div class="campo campo--ancho">
          <dt class="rotulo">${textos.servidor}</dt>
          <dd class="codigo"><span class="codigo__texto">${MCP.replace('/mcp', '<wbr>/mcp')}</span>${copiar(MCP, idioma)}</dd>
        </div>
        <div class="campo campo--ancho">
          <dt class="rotulo">Claude Code</dt>
          <dd class="codigo"><span class="codigo__texto codigo__texto--comando">${COMANDO.replace(' https', ' <wbr>https')}</span>${copiar(COMANDO, idioma)}</dd>
        </div>
        <div class="campo">
          <dt class="rotulo">${textos.enClaude}</dt>
          <dd>${textos.rutaClaude}</dd>
        </div>
        <div class="campo">
          <dt class="rotulo">${textos.pregunta}</dt>
          <dd class="impreso">${textos.ejemplo}</dd>
        </div>
      </dl>
    </section>

    <footer class="pie">
      <p class="rotulo">${textos.tambien}</p>
      <ul class="pie__links">
        <li><a href="https://hub.nicolasdalessandro.dev/">Hub</a></li>
        <li><a href="https://nicolasdalessandro.dev/">Portfolio</a></li>
      </ul>
    </footer>
  </main>
</body>
</html>
`;
}

for (const escenario of ['incidente', 'normal', 'sin-datos'] as const) {
  for (const idioma of ['en', 'es'] as const) {
    writeFileSync(join(CARPETA, archivo(escenario, idioma)), pagina(escenario, idioma));
  }
}
buildSync({
  entryPoints: [join(CARPETA, 'lectura.ts')],
  bundle: true,
  format: 'iife',
  target: 'es2022',
  outfile: join(CARPETA, 'lectura.js'),
});
