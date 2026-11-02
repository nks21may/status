import type {ComponentePublico, EstadoPublico} from '../estado.ts';

/**
 * El MCP de `/mcp` (ADR-0006 y ADR-0013): JSON-RPC 2.0 por Streamable HTTP, sin estado y sin SSE,
 * escrito a mano. Cada `POST` trae un mensaje y se contesta con un JSON. Las tools son de sólo
 * lectura y leen con la misma función que la API, así dicen lo mismo.
 */

/** Las versiones de la especificación que conoce el servidor, de la más nueva a la más vieja. */
const VERSIONES = ['2025-11-25', '2025-06-18', '2025-03-26'];

const SERVIDOR = {name: 'status.nicolasdalessandro.dev', title: 'nicolasdalessandro.dev status', version: '1.0.0'};

const INSTRUCCIONES =
  'Read-only status of the projects published on nicolasdalessandro.dev, probed from outside every minute. ' +
  'A component is up when its public URL answers 2xx. Days are UTC.';

/** El máximo de días de historia, los mismos que da la API (ADR-0011). */
const DIAS_MAXIMOS = 90;

const SOLO_LECTURA = {readOnlyHint: true, openWorldHint: false};

const COMPONENTE = {
  type: 'string',
  description: 'The component id, as listed by get_status (for example "museo").',
};

const TOOLS = [
  {
    name: 'get_status',
    title: 'Overall status',
    description:
      'Current status and the last 90 UTC days of every project on nicolasdalessandro.dev. Same data as GET /api/status.',
    inputSchema: {type: 'object', properties: {}, additionalProperties: false},
    annotations: SOLO_LECTURA,
  },
  {
    name: 'get_component',
    title: 'Component status',
    description:
      'Current status of one project (up, down or no_data), its name and description, its last check and its 90-day uptime.',
    inputSchema: {type: 'object', properties: {component: COMPONENTE}, required: ['component'], additionalProperties: false},
    annotations: SOLO_LECTURA,
  },
  {
    name: 'get_component_history',
    title: 'Component history',
    description:
      'Daily history of one project for the last N UTC days, counting today: minutes measured and minutes up per day, and the uptime for that span.',
    inputSchema: {
      type: 'object',
      properties: {
        component: COMPONENTE,
        days: {
          type: 'integer',
          minimum: 1,
          maximum: DIAS_MAXIMOS,
          description: `How many days, from 1 to ${DIAS_MAXIMOS}. Defaults to ${DIAS_MAXIMOS}.`,
        },
      },
      required: ['component'],
      additionalProperties: false,
    },
    annotations: SOLO_LECTURA,
  },
];

type Objeto = Record<string, unknown>;

interface ResultadoTool {
  content: {type: 'text'; text: string}[];
  structuredContent?: Objeto;
  isError?: true;
}

/** Un error de JSON-RPC: del protocolo, no de una tool. */
class ErrorJsonRpc extends Error {
  readonly codigo: number;

  constructor(codigo: number, mensaje: string) {
    super(mensaje);
    this.codigo = codigo;
  }
}

function esObjeto(valor: unknown): valor is Objeto {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function resultado(datos: Objeto): ResultadoTool {
  return {content: [{type: 'text', text: JSON.stringify(datos)}], structuredContent: datos};
}

function errorDeTool(mensaje: string): ResultadoTool {
  return {content: [{type: 'text', text: mensaje}], isError: true};
}

function disponibilidad(dias: ComponentePublico['days']): number | null {
  const medidos = dias.reduce((suma, dia) => suma + dia.minutes_measured, 0);
  const arriba = dias.reduce((suma, dia) => suma + dia.minutes_up, 0);
  return medidos === 0 ? null : arriba / medidos;
}

/** El componente que nombra `argumentos.component`, o el mensaje de error de la tool. */
function buscar(estado: EstadoPublico, argumentos: Objeto): ComponentePublico | string {
  const conocidos = estado.components.map((componente) => componente.id).join(', ');
  const pedido = argumentos.component;
  if (typeof pedido !== 'string') {
    return `Missing "component": use one of ${conocidos}.`;
  }
  return (
    estado.components.find((componente) => componente.id === pedido) ??
    `Unknown component "${pedido}". Known components: ${conocidos}.`
  );
}

async function llamarTool(params: Objeto, leer: () => Promise<EstadoPublico>): Promise<ResultadoTool> {
  const nombre = params.name;
  if (!TOOLS.some((tool) => tool.name === nombre)) {
    throw new ErrorJsonRpc(-32602, `Unknown tool: ${String(nombre)}`);
  }
  const argumentos = params.arguments ?? {};
  if (!esObjeto(argumentos)) {
    return errorDeTool('The arguments must be an object.');
  }
  const estado = await leer();
  if (nombre === 'get_status') {
    return resultado({...estado});
  }

  const componente = buscar(estado, argumentos);
  if (typeof componente === 'string') {
    return errorDeTool(componente);
  }
  if (nombre === 'get_component') {
    const {id, name, description, url, status, last_check, uptime_90d} = componente;
    return resultado({id, name, description, url, status, last_check, uptime_90d});
  }

  // Si falta, van los 90; un `null` no es que falte, es un valor que no sirve.
  const dias = 'days' in argumentos ? argumentos.days : DIAS_MAXIMOS;
  if (typeof dias !== 'number' || !Number.isInteger(dias) || dias < 1 || dias > DIAS_MAXIMOS) {
    return errorDeTool(`"days" must be an integer from 1 to ${DIAS_MAXIMOS}.`);
  }
  const tramo = componente.days.slice(-dias);
  return resultado({id: componente.id, uptime: disponibilidad(tramo), days: tramo});
}

async function responderMetodo(metodo: string, params: Objeto, leer: () => Promise<EstadoPublico>): Promise<unknown> {
  switch (metodo) {
    case 'initialize': {
      const pedida = params.protocolVersion;
      const version = typeof pedida === 'string' && VERSIONES.includes(pedida) ? pedida : VERSIONES[0];
      return {
        protocolVersion: version,
        capabilities: {tools: {listChanged: false}},
        serverInfo: SERVIDOR,
        instructions: INSTRUCCIONES,
      };
    }
    case 'ping':
      return {};
    case 'tools/list':
      return {tools: TOOLS};
    case 'tools/call':
      return llamarTool(params, leer);
    default:
      throw new ErrorJsonRpc(-32601, `Method not found: ${metodo}`);
  }
}

function errorJsonRpc(id: unknown, codigo: number, mensaje: string): Response {
  return Response.json({jsonrpc: '2.0', id: id ?? null, error: {code: codigo, message: mensaje}});
}

/** Contesta un pedido a `/mcp`. `leer` trae el estado de D1 sólo cuando una tool lo necesita. */
export async function responderMcp(pedido: Request, leer: () => Promise<EstadoPublico>): Promise<Response> {
  if (pedido.method !== 'POST') {
    return new Response(null, {status: 405, headers: {allow: 'POST'}});
  }
  let mensaje: unknown;
  try {
    mensaje = await pedido.json();
  } catch {
    return errorJsonRpc(null, -32700, 'Parse error');
  }
  if (!esObjeto(mensaje) || mensaje.jsonrpc !== '2.0') {
    return errorJsonRpc(esObjeto(mensaje) ? mensaje.id : null, -32600, 'Invalid Request');
  }
  // Una notificación o una respuesta del cliente no llevan respuesta.
  if (!('id' in mensaje) || typeof mensaje.method !== 'string') {
    return new Response(null, {status: 202});
  }
  const {id} = mensaje;
  try {
    const params = esObjeto(mensaje.params) ? mensaje.params : {};
    return Response.json({jsonrpc: '2.0', id, result: await responderMetodo(mensaje.method, params, leer)});
  } catch (error) {
    if (error instanceof ErrorJsonRpc) {
      return errorJsonRpc(id, error.codigo, error.message);
    }
    throw error;
  }
}
