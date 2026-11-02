import type {ComponentePublico, DiaPublico, EstadoPublico} from '../estado.ts';
import {MESES, TEXTOS} from './textos.ts';
import type {Idioma} from './textos.ts';

/**
 * Arma el HTML de la página (ADR-0012) con la respuesta de la API, o con `null` si la API no
 * contestó, en el idioma elegido. Es una función pura: no toca el DOM, y todo lo que viene de la
 * API sale escapado. El sistema visual es el de `DESIGN.md`.
 */

const MCP = 'https://status.nicolasdalessandro.dev/mcp';
const COMANDO = `claude mcp add --transport http status ${MCP}`;

/** Cuántos días muestra el gráfico, contando el de hoy (ADR-0011). */
const DIAS = 90;
const DIA_MS = 86_400_000;

/** Un mes con menos días que éstos al final del gráfico apoya su nombre en el borde derecho. */
const DIAS_PARA_ROTULAR = 6;

/** La clase de cada estado en `DESIGN.md`: lo caído en bermellón, lo sin datos en tinta. */
const CLASE_DE_ESTADO: Record<ComponentePublico['status'], string> = {
  up: 'anda',
  degraded: 'con-fallas',
  down: 'caido',
  no_data: 'sin-datos',
};

/** El separador entre los tramos de una lectura: fecha, minutos y porcentaje. */
export const SEPARADOR = ' · ';

export function escapar(texto: string): string {
  return texto
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** El nombre de la ficha; hasta que el emisor la manda, el id del componente. */
function nombreDe(componente: ComponentePublico): string {
  return componente.name ?? componente.id;
}

/** La descripción en el idioma elegido, o en el otro si la ficha trae uno solo. */
function descripcionDe(componente: ComponentePublico, idioma: Idioma): string | null {
  const otro = idioma === 'en' ? 'es' : 'en';
  return componente.description[idioma] ?? componente.description[otro];
}

/** El ancla del renglón de un componente, para llegar desde el estado general. */
function ancla(id: string): string {
  const limpio = id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `servicio-${limpio}`;
}

function fecha(iso: string, idioma: Idioma): string {
  const [anio, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  return `${dia} ${MESES[idioma][(mes ?? 1) - 1]} ${anio}`;
}

/** La hora UTC de un instante; con la fecha delante si no es la del día de hoy. */
function momento(iso: string, hoy: string, idioma: Idioma): string {
  const hora = `${iso.slice(11, 16)} UTC`;
  return iso.startsWith(hoy) ? hora : `${fecha(iso, idioma)}, ${hora}`;
}

function numero(valor: number, idioma: Idioma): string {
  return valor.toLocaleString(idioma === 'en' ? 'en-US' : 'es-AR');
}

function porcentaje(fraccion: number, idioma: Idioma): string {
  const cifra = (fraccion * 100).toFixed(2);
  return idioma === 'en' ? `${cifra}%` : `${cifra.replace('.', ',')} %`;
}

/** Los tramos de una lectura, que no se cortan, con el separador pegado al tramo que le sigue. */
export function tramos(lectura: string): string {
  return lectura
    .split(SEPARADOR)
    .map((tramo, indice) => `<span>${escapar(indice === 0 ? tramo : `· ${tramo}`)}</span>`)
    .join(' ');
}

function lecturaDelDia(dia: DiaPublico, idioma: Idioma): string {
  const textos = TEXTOS[idioma];
  const cuando = fecha(dia.date, idioma);
  if (dia.minutes_measured === 0) {
    return textos.diaSinLectura(cuando);
  }
  return textos.diaConLectura(
    cuando,
    numero(dia.minutes_up, idioma),
    numero(dia.minutes_measured, idioma),
    porcentaje(dia.minutes_up / dia.minutes_measured, idioma),
  );
}

/** La altura de la barra: el eje va de 95 % a 100 %, así un día con un corte corto se ve. */
function altura(dia: DiaPublico): number {
  return Math.min(Math.max((dia.minutes_up / dia.minutes_measured - 0.95) / 0.05, 0), 1);
}

function barra(dia: DiaPublico, idioma: Idioma): string {
  const lectura = escapar(lecturaDelDia(dia, idioma));
  if (dia.minutes_measured === 0) {
    return `<span class="dia dia--sin-lectura" data-lectura="${lectura}"></span>`;
  }
  if (dia.minutes_up < dia.minutes_measured) {
    return `<span class="dia dia--corte" style="--h: ${altura(dia).toFixed(3)}" data-lectura="${lectura}"></span>`;
  }
  return `<span class="dia" data-lectura="${lectura}"></span>`;
}

function meses(dias: readonly DiaPublico[], idioma: Idioma): string {
  return dias
    .map((dia, indice) => {
      if (indice !== 0 && !dia.date.endsWith('-01')) {
        return '';
      }
      const nombre = MESES[idioma][Number(dia.date.slice(5, 7)) - 1];
      return dias.length - indice < DIAS_PARA_ROTULAR
        ? `<span class="mes--corto" style="grid-column: ${indice + 1} / -1">${nombre}</span>`
        : `<span style="grid-column: ${indice + 1}">${nombre}</span>`;
    })
    .join('');
}

function encabezado(estado: EstadoPublico | null, idioma: Idioma): string {
  const textos = TEXTOS[idioma];
  const campos = estado
    ? (() => {
        const hasta = estado.generated_at;
        const desde = new Date(Date.parse(hasta) - (DIAS - 1) * DIA_MS).toISOString();
        const inicio = desde.slice(0, 4) === hasta.slice(0, 4) ? fecha(desde, idioma).slice(0, -5) : fecha(desde, idioma);
        return `
      <dl class="campos">
        <div class="campo"><dt class="rotulo">${textos.emitido}</dt><dd>${fecha(hasta, idioma)}, ${hasta.slice(11, 16)} UTC</dd></div>
        <div class="campo"><dt class="rotulo">${textos.periodo}</dt><dd>${inicio} – ${fecha(hasta, idioma)} · ${DIAS} ${textos.dias}</dd></div>
      </dl>`;
      })()
    : '';
  const opciones = (['en', 'es'] as const)
    .map(
      (otro) =>
        `<button type="button" class="idioma__opcion" data-idioma="${otro}" lang="${otro}" aria-pressed="${otro === idioma}">${otro.toUpperCase()}</button>`,
    )
    .join('');
  return `
    <header class="encabezado">
      <div class="emisor">
        <p class="emisor__nombre">status.<wbr>nicolasdalessandro.dev</p>
        <h1 class="emisor__documento">${textos.titulo}</h1>
      </div>${campos}
      <div class="idioma" role="group" aria-label="${textos.idioma}">${opciones}</div>
    </header>`;
}

function resumen(estado: EstadoPublico | null, idioma: Idioma): string {
  const textos = TEXTOS[idioma];
  if (!estado) {
    return `
    <section class="recuadro resumen resumen--sin-datos" role="status">
      <h2 class="resumen__frase">${textos.sinDatos}</h2>
      <p class="resumen__cuenta">${textos.sinDatosCuenta}</p>
    </section>`;
  }
  const componentes = estado.components;
  const nombres = (cual: ComponentePublico['status']) =>
    componentes
      .filter((componente) => componente.status === cual)
      .map((componente) => `<a href="#${ancla(componente.id)}">${escapar(nombreDe(componente))}</a>`);
  const caidos = nombres('down');
  const conFallas = nombres('degraded');
  const sinLectura = nombres('no_data');
  // Lo caído y lo que anda con fallas se nombran juntos, primero lo caído.
  const fallas = [
    caidos.length > 0 ? textos.caidos(caidos) : '',
    conFallas.length > 0 ? textos.conFallas(conFallas) : '',
  ]
    .filter(Boolean)
    .join(' ');
  const [frase, clase] =
    componentes.length === 0
      ? [textos.sinServicios, 'resumen resumen--sin-datos']
      : fallas
        ? [fallas, 'resumen resumen--corte']
        : sinLectura.length > 0
          ? [textos.sinLectura(sinLectura), 'resumen resumen--sin-datos']
          : [textos.todoAnda, 'resumen'];
  const ultima = componentes
    .map((componente) => componente.last_check?.at ?? '')
    .reduce((mayor, at) => (at > mayor ? at : mayor), '');
  const arriba = componentes.filter((componente) => componente.status === 'up').length;
  const cuando = ultima ? momento(ultima, estado.generated_at.slice(0, 10), idioma) : textos.sinLecturas;
  return `
    <section class="recuadro ${clase}" role="status">
      <h2 class="resumen__frase">${frase}</h2>
      <p class="resumen__cuenta">${textos.cuenta(arriba, componentes.length, cuando)}</p>
    </section>`;
}

function copiar(texto: string, idioma: Idioma): string {
  const textos = TEXTOS[idioma];
  return `<button class="boton" type="button" data-copiar="${escapar(texto)}" data-copiado="${textos.copiado}" data-error="${escapar(textos.error)}">${textos.copiar}</button>`;
}

function renglon(componente: ComponentePublico, hoy: string, idioma: Idioma): string {
  const textos = TEXTOS[idioma];
  const nombre = escapar(nombreDe(componente));
  const descripcion = descripcionDe(componente, idioma);
  const segura = /^https?:\/\//.test(componente.url);
  let host = componente.url;
  try {
    host = new URL(componente.url).host;
  } catch {
    // Una URL que no se puede leer se muestra tal como vino.
  }
  const sonda = componente.last_check;
  const ultimaLectura = sonda ? `${momento(sonda.at, hoy, idioma)} · ${numero(sonda.latency_ms, idioma)} ms` : '—';
  const disponibilidad = componente.uptime_90d === null ? '—' : porcentaje(componente.uptime_90d, idioma);
  const ultimoDia = componente.days.at(-1);
  return `
      <li class="servicio" id="${ancla(componente.id)}">
        <div class="servicio__fila">
          <div class="servicio__identidad">
            <h3 class="servicio__nombre">${segura ? `<a href="${escapar(componente.url)}">${nombre}</a>` : nombre}</h3>
            <p class="servicio__direccion">${escapar(host)}</p>${descripcion ? `
            <p class="servicio__descripcion">${escapar(descripcion)}</p>` : ''}
          </div>
          <dl class="servicio__datos">
            <div class="dato">
              <dt class="rotulo">${textos.columnas[1]}</dt>
              <dd><span class="estado estado--${CLASE_DE_ESTADO[componente.status]}"><span class="marca"></span>${textos.estados[componente.status]}</span></dd>
            </div>
            <div class="dato">
              <dt class="rotulo">${textos.columnas[2]}</dt>
              <dd>${ultimaLectura}</dd>
            </div>
            <div class="dato dato--disponibilidad">
              <dt class="rotulo">${textos.columnas[3]}</dt>
              <dd>${disponibilidad}</dd>
            </div>
          </dl>
        </div>
        <div class="consumo">
          <div class="consumo__eje" aria-hidden="true"><span>${idioma === 'en' ? '100%' : '100 %'}</span><span>${idioma === 'en' ? '95%' : '95 %'}</span></div>
          <div class="grafico" role="slider" tabindex="0" aria-label="${escapar(textos.grafico(nombreDe(componente)))}" aria-valuemin="1" aria-valuemax="${componente.days.length}" aria-valuenow="${componente.days.length}">
            ${componente.days.map((dia) => barra(dia, idioma)).join('')}
          </div>
          <div class="consumo__meses" aria-hidden="true">${meses(componente.days, idioma)}</div>
          <p class="consumo__lectura"><span class="rotulo">${textos.lectura}</span> <output class="consumo__valor">${ultimoDia ? tramos(lecturaDelDia(ultimoDia, idioma)) : ''}</output></p>
        </div>
      </li>`;
}

function servicios(estado: EstadoPublico | null, idioma: Idioma): string {
  if (!estado || estado.components.length === 0) {
    return '';
  }
  const textos = TEXTOS[idioma];
  const hoy = estado.generated_at.slice(0, 10);
  return `
    <section class="servicios" aria-labelledby="servicios">
      <h2 class="oculto" id="servicios">${textos.servicios}</h2>
      <div class="servicios__cabecera rotulo" aria-hidden="true">${textos.columnas.map((columna) => `<span>${columna}</span>`).join('')}</div>
      <ol class="servicios__lista">${estado.components.map((componente) => renglon(componente, hoy, idioma)).join('')}
      </ol>
    </section>`;
}

function talon(idioma: Idioma): string {
  const textos = TEXTOS[idioma];
  return `
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
    </section>`;
}

function pie(idioma: Idioma): string {
  return `
    <footer class="pie">
      <p class="rotulo">${TEXTOS[idioma].tambien}</p>
      <ul class="pie__links">
        <li><a href="https://hub.nicolasdalessandro.dev/">Hub</a></li>
        <li><a href="https://nicolasdalessandro.dev/">Portfolio</a></li>
      </ul>
    </footer>`;
}

export function renderizar(estado: EstadoPublico | null, idioma: Idioma): string {
  return [encabezado(estado, idioma), resumen(estado, idioma), servicios(estado, idioma), talon(idioma), pie(idioma)].join(
    '\n',
  );
}
