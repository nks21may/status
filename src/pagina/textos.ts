/**
 * Todos los textos de la página, en inglés y en español (ADR-0005 y ADR-0012): ninguno se escribe
 * suelto en el HTML. La voz es la de `PRODUCT.md`: sobria y exacta.
 */

export type Idioma = 'en' | 'es';

export const MESES: Record<Idioma, readonly string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
};

/** Junta nombres como en una frase: "a", "a and b", "a, b and c". */
function enumerar(nombres: readonly string[], y: string): string {
  return nombres.length < 2 ? (nombres[0] ?? '') : `${nombres.slice(0, -1).join(', ')} ${y} ${nombres.at(-1)}`;
}

export const TEXTOS = {
  en: {
    titulo: 'Service status',
    emitido: 'Issued',
    periodo: 'Period, UTC days',
    dias: 'days',
    idioma: 'Language',
    todoAnda: 'All services are up.',
    caidos: (nombres: readonly string[]) => `${enumerar(nombres, 'and')} ${nombres.length > 1 ? 'are' : 'is'} down.`,
    conFallas: (nombres: readonly string[]) =>
      `${enumerar(nombres, 'and')} ${nombres.length > 1 ? 'are' : 'is'} degraded.`,
    sinLectura: (nombres: readonly string[]) => `No recent reading from ${enumerar(nombres, 'and')}.`,
    sinServicios: 'No services yet.',
    cuenta: (arriba: number, total: number, ultima: string) => `${arriba} of ${total} up · last reading ${ultima}`,
    sinLecturas: 'no readings yet',
    sinDatos: 'No data right now.',
    sinDatosCuenta: 'The status API did not answer. Try again in a minute.',
    servicios: 'Services',
    columnas: ['Service', 'Status', 'Last reading', '90-day availability'],
    estados: {up: 'Up', degraded: 'Degraded', down: 'Down', no_data: 'No data'},
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
    emitido: 'Emitido',
    periodo: 'Período, días UTC',
    dias: 'días',
    idioma: 'Idioma',
    todoAnda: 'Todos los servicios andan.',
    caidos: (nombres: readonly string[]) =>
      `${enumerar(nombres, 'y')} ${nombres.length > 1 ? 'están caídos' : 'está caído'}.`,
    conFallas: (nombres: readonly string[]) =>
      `${enumerar(nombres, 'y')} ${nombres.length > 1 ? 'andan' : 'anda'} con fallas.`,
    sinLectura: (nombres: readonly string[]) => `Sin lectura reciente de ${enumerar(nombres, 'y')}.`,
    sinServicios: 'Todavía no hay servicios.',
    cuenta: (arriba: number, total: number, ultima: string) =>
      `${arriba} de ${total} ${arriba === 1 ? 'anda' : 'andan'} · última lectura ${ultima}`,
    sinLecturas: 'todavía sin lecturas',
    sinDatos: 'Ahora no hay datos.',
    sinDatosCuenta: 'La API del status no contestó. Probá de nuevo en un minuto.',
    servicios: 'Servicios',
    columnas: ['Servicio', 'Estado', 'Última lectura', 'Disponibilidad 90 días'],
    estados: {up: 'Anda', degraded: 'Con fallas', down: 'Caído', no_data: 'Sin datos'},
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
