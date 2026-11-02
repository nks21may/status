/**
 * La interacción de la maqueta. El gráfico de consumo de cada servicio se recorre con el puntero,
 * con el dedo o con las flechas, y el renglón de abajo imprime la lectura del día elegido, sin
 * transición: la impresora no anima. Los botones del talón copian la URL del MCP y el comando.
 *
 * `generar.ts` le saca los tipos y lo escribe como `lectura.js`, un script clásico, así la maqueta
 * se abre también como archivo local.
 */

/** Cuántos días salta Re Pág o Av Pág en el gráfico. */
const DIAS_POR_PAGINA = 7;

/** Cuánto queda el botón diciendo "Copiado" antes de volver a su texto. */
const AVISO_COPIA_MS = 2000;

/** El separador entre los tramos de una lectura: fecha, minutos y porcentaje. */
const SEPARADOR = ' · ';

/** Imprime la lectura en tramos que no se cortan, con el separador pegado al tramo que le sigue. */
function imprimir(valor: HTMLOutputElement, lectura: string): void {
  const tramos = lectura.split(SEPARADOR).map((tramo, indice) => {
    const span = document.createElement('span');
    span.textContent = indice === 0 ? tramo : `· ${tramo}`;
    return span;
  });
  valor.replaceChildren(...tramos.flatMap((span, indice) => (indice === 0 ? [span] : [' ', span])));
}

const SALTOS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowDown: -1,
  ArrowRight: 1,
  ArrowUp: 1,
  PageDown: -DIAS_POR_PAGINA,
  PageUp: DIAS_POR_PAGINA,
};

function iniciarGrafico(grafico: HTMLElement): void {
  const dias = Array.from(grafico.querySelectorAll<HTMLElement>('.dia'));
  const valor = grafico.parentElement?.querySelector<HTMLOutputElement>('.consumo__valor');
  if (dias.length === 0 || !valor) {
    return;
  }
  let elegido = dias.length - 1;

  const elegir = (indice: number): void => {
    dias[elegido]?.classList.remove('dia--elegido');
    elegido = Math.min(Math.max(indice, 0), dias.length - 1);
    const dia = dias[elegido];
    if (!dia) {
      return;
    }
    dia.classList.add('dia--elegido');
    const lectura = dia.dataset.lectura ?? '';
    imprimir(valor, lectura);
    grafico.setAttribute('aria-valuenow', String(elegido + 1));
    grafico.setAttribute('aria-valuetext', lectura);
  };

  const diaBajo = (x: number): number => {
    const caja = grafico.getBoundingClientRect();
    return Math.floor(((x - caja.left) / caja.width) * dias.length);
  };

  grafico.addEventListener('pointerdown', (evento) => {
    grafico.setPointerCapture(evento.pointerId);
    elegir(diaBajo(evento.clientX));
  });
  grafico.addEventListener('pointermove', (evento) => {
    if (evento.pointerType === 'mouse' || grafico.hasPointerCapture(evento.pointerId)) {
      elegir(diaBajo(evento.clientX));
    }
  });
  grafico.addEventListener('keydown', (evento) => {
    if (evento.key === 'Home') {
      elegir(0);
    } else if (evento.key === 'End') {
      elegir(dias.length - 1);
    } else if (evento.key in SALTOS) {
      elegir(elegido + (SALTOS[evento.key] ?? 0));
    } else {
      return;
    }
    evento.preventDefault();
  });

  elegir(elegido);
}

function iniciarCopia(boton: HTMLButtonElement): void {
  const texto = boton.dataset.copiar ?? '';
  const original = boton.textContent ?? '';
  let espera: ReturnType<typeof setTimeout> | undefined;

  const avisar = (estado: 'copiado' | 'error', mensaje: string): void => {
    clearTimeout(espera);
    boton.dataset.estado = estado;
    boton.textContent = mensaje;
    espera = setTimeout(() => {
      delete boton.dataset.estado;
      boton.textContent = original;
    }, AVISO_COPIA_MS);
  };

  boton.addEventListener('click', () => {
    navigator.clipboard.writeText(texto).then(
      () => avisar('copiado', boton.dataset.copiado ?? original),
      () => avisar('error', boton.dataset.error ?? original),
    );
  });
}

document.querySelectorAll<HTMLElement>('.grafico').forEach(iniciarGrafico);
document.querySelectorAll<HTMLButtonElement>('.boton[data-copiar]').forEach(iniciarCopia);
