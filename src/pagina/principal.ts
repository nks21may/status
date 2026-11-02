import type {EstadoPublico} from '../estado.ts';
import {iniciar} from './interaccion.ts';
import {renderizar} from './renderizar.ts';
import {TEXTOS} from './textos.ts';
import type {Idioma} from './textos.ts';

/**
 * La entrada de la página en el navegador (ADR-0012): pide el estado a la API, lo arma con
 * `renderizar` y cambia de idioma cuando el visitante lo elige. Inglés por defecto (ADR-0005), y la
 * elección se recuerda en `localStorage`.
 */

const CLAVE_IDIOMA = 'status.idioma';

function idiomaGuardado(): Idioma {
  try {
    return localStorage.getItem(CLAVE_IDIOMA) === 'es' ? 'es' : 'en';
  } catch {
    // Sin almacenamiento (una ventana privada, sitios bloqueados), arranca en inglés.
    return 'en';
  }
}

function guardarIdioma(idioma: Idioma): void {
  try {
    localStorage.setItem(CLAVE_IDIOMA, idioma);
  } catch {
    // Si no se puede guardar, la elección vale para esta visita.
  }
}

async function pedirEstado(): Promise<EstadoPublico | null> {
  try {
    const respuesta = await fetch('/api/status');
    return respuesta.ok ? ((await respuesta.json()) as EstadoPublico) : null;
  } catch {
    return null;
  }
}

let idioma = idiomaGuardado();
let estado: EstadoPublico | null = null;

function pintar(): void {
  const hoja = document.querySelector<HTMLElement>('.hoja');
  if (!hoja) {
    return;
  }
  document.documentElement.lang = idioma;
  document.title = `${TEXTOS[idioma].titulo} · nicolasdalessandro.dev`;
  hoja.innerHTML = renderizar(estado, idioma);
  iniciar(hoja);
}

document.addEventListener('click', (evento) => {
  const opcion = evento.target instanceof Element ? evento.target.closest<HTMLElement>('[data-idioma]') : null;
  const elegido = opcion?.dataset.idioma;
  if ((elegido === 'en' || elegido === 'es') && elegido !== idioma) {
    idioma = elegido;
    guardarIdioma(idioma);
    pintar();
    document.querySelector<HTMLElement>(`[data-idioma="${idioma}"]`)?.focus();
  }
});

void pedirEstado().then((respuesta) => {
  estado = respuesta;
  pintar();
});
