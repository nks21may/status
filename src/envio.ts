/**
 * El contrato del envío entre el emisor y el Worker (ADR-0015). Lo usan los dos lados: el emisor
 * para descartar una ficha que no cumple, y el Worker para rechazar un cuerpo entero. Va en español
 * porque no lo lee nadie de afuera, y se mapea uno a uno con las fichas del catálogo.
 */

/** Los límites de la ficha (ADR-0010 del hub) y de la lista. */
export const LIMITES = {componentes: 50, nombre: 20, descripcion: 90};

/** Minúsculas, cifras, `_` o `-`, de hasta 64 caracteres: el nombre de una carpeta de `stacks/`. */
const STACK = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export interface ComponenteEnviado {
  stack: string;
  nombre: string;
  url: string;
  descripcion: {es?: string; en?: string};
  /** `true` si todos sus contenedores están sanos, `false` si alguno no, `null` sin datos de adentro. */
  sano: boolean | null;
}

export interface Envio {
  componentes: ComponenteEnviado[];
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function textoValido(valor: unknown, maximo: number): valor is string {
  return typeof valor === 'string' && valor.length >= 1 && valor.length <= maximo;
}

/** El componente limpio, sólo con los campos del contrato, o el motivo por el que no sirve. */
export function validarComponente(valor: unknown): ComponenteEnviado | string {
  if (!esObjeto(valor)) {
    return 'no es un objeto';
  }
  const {stack, nombre, url, descripcion, sano} = valor;
  if (typeof stack !== 'string' || !STACK.test(stack)) {
    return 'el stack tiene que ser minúsculas, cifras, _ o -, de hasta 64 caracteres';
  }
  if (!textoValido(nombre, LIMITES.nombre)) {
    return `el nombre tiene que tener de 1 a ${LIMITES.nombre} caracteres`;
  }
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    return 'la url tiene que empezar con https://';
  }
  if (!esObjeto(descripcion)) {
    return 'falta la descripción';
  }
  const limpia: ComponenteEnviado['descripcion'] = {};
  for (const idioma of ['es', 'en'] as const) {
    if (idioma in descripcion) {
      const texto = descripcion[idioma];
      if (!textoValido(texto, LIMITES.descripcion)) {
        return `la descripción en ${idioma} tiene que tener de 1 a ${LIMITES.descripcion} caracteres`;
      }
      limpia[idioma] = texto;
    }
  }
  if (!limpia.es && !limpia.en) {
    return 'la descripción tiene que traer al menos un idioma';
  }
  if (sano !== true && sano !== false && sano !== null) {
    return 'sano tiene que ser true, false o null';
  }
  return {stack, nombre, url, descripcion: limpia, sano};
}

/** El envío limpio, o el motivo por el que no cumple el contrato. */
export function validarEnvio(valor: unknown): Envio | string {
  if (!esObjeto(valor) || !Array.isArray(valor.componentes)) {
    return 'el cuerpo tiene que traer la lista de componentes';
  }
  if (valor.componentes.length > LIMITES.componentes) {
    return `la lista tiene más de ${LIMITES.componentes} componentes`;
  }
  const componentes: ComponenteEnviado[] = [];
  for (const [indice, candidato] of valor.componentes.entries()) {
    const componente = validarComponente(candidato);
    if (typeof componente === 'string') {
      return `el componente ${indice}: ${componente}`;
    }
    if (componentes.some((otro) => otro.stack === componente.stack)) {
      return `el stack ${componente.stack} está repetido`;
    }
    componentes.push(componente);
  }
  return {componentes};
}
