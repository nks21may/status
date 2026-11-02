import {describe, expect, it} from 'vitest';
import type {EstadoPublico} from '../../src/estado.ts';
import {renderizar} from '../../src/pagina/renderizar.ts';

const AHORA = '2026-11-02T13:05:42.000Z';

/** Los 90 días que terminan el 2026-11-02, con los minutos dados por fecha y el resto en cero. */
function dias(minutos: Record<string, [number, number]>): EstadoPublico['components'][number]['days'] {
  return Array.from({length: 90}, (_, indice) => {
    const fecha = new Date(Date.UTC(2026, 7, 5 + indice)).toISOString().slice(0, 10);
    const [medidos, arriba] = minutos[fecha] ?? [0, 0];
    return {date: fecha, minutes_measured: medidos, minutes_up: arriba};
  });
}

/** Una respuesta de la API con museo andando y neonduel caído. */
function estadoConUnoCaido(): EstadoPublico {
  return {
    generated_at: AHORA,
    components: [
      {
        id: 'museo',
        name: null,
        description: {en: null, es: null},
        url: 'https://museo.nicolasdalessandro.dev/',
        status: 'up',
        last_check: {at: '2026-11-02T13:05:00.000Z', up: true, latency_ms: 182},
        uptime_90d: 0.9971,
        days: dias({'2026-10-07': [1440, 1393], '2026-11-02': [785, 785]}),
      },
      {
        id: 'neonduel',
        name: null,
        description: {en: null, es: null},
        url: 'https://neonduel.nicolasdalessandro.dev/',
        status: 'down',
        last_check: {at: '2026-11-02T13:05:00.000Z', up: false, latency_ms: 41},
        uptime_90d: 0.9694,
        days: dias({'2026-11-02': [785, 761]}),
      },
    ],
  };
}

/**
 * El texto que se lee en la página, sin etiquetas y con los espacios juntados. Las etiquetas en línea
 * no separan palabras; las de bloque, sí.
 */
function texto(html: string): string {
  return html
    .replace(/<\/?(?:a|span|wbr)(?:\s[^>]*)?>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function renglones(html: string): number {
  return html.match(/<li class="servicio"/g)?.length ?? 0;
}

describe('la página', () => {
  it('muestra un renglón por componente, en inglés', () => {
    const html = renderizar(estadoConUnoCaido(), 'en');

    expect(renglones(html)).toBe(2);
    // Lo caído va en bermellón y lo que anda en negro: la clase es la de DESIGN.md.
    expect(html).toContain('<span class="estado estado--anda">');
    expect(html).toContain('<span class="estado estado--caido">');
    const leido = texto(html);
    expect(leido).toContain('neonduel is down.');
    expect(leido).toContain('1 of 2 up · last reading 13:05 UTC');
    expect(leido).toContain('museo');
    expect(leido).toContain('Up');
    expect(leido).toContain('Down');
    expect(leido).toContain('13:05 UTC · 182 ms');
    expect(leido).toContain('99.71%');
    expect(leido).toContain('5 Aug – 2 Nov 2026 · 90 days');
  });

  it('muestra lo mismo en español si el visitante lo elige', () => {
    const html = renderizar(estadoConUnoCaido(), 'es');

    expect(renglones(html)).toBe(2);
    const leido = texto(html);
    expect(leido).toContain('neonduel está caído.');
    expect(leido).toContain('1 de 2 anda · última lectura 13:05 UTC');
    expect(leido).toContain('Anda');
    expect(leido).toContain('Caído');
    expect(leido).toContain('99,71 %');
    expect(leido).toContain('5 ago – 2 nov 2026 · 90 días');
  });

  it('con la ficha, muestra el nombre y la descripción en el idioma elegido, o en el otro si trae uno solo', () => {
    const estado = estadoConUnoCaido();
    const [museo, neonduel] = estado.components;
    estado.components = [
      {...museo!, name: 'Museo', description: {en: 'Shaders browsed like TV channels.', es: 'Shaders como canales de tele.'}},
      {...neonduel!, name: 'Neonduel', description: {en: 'A 1v1 browser 3D shooter.', es: null}},
    ];

    const enEspanol = texto(renderizar(estado, 'es'));
    expect(enEspanol).toContain('Neonduel está caído.');
    expect(enEspanol).toContain('Museo museo.nicolasdalessandro.dev Shaders como canales de tele.');
    expect(enEspanol).toContain('Neonduel neonduel.nicolasdalessandro.dev A 1v1 browser 3D shooter.');
    expect(enEspanol).not.toContain('Shaders browsed like TV channels.');

    const enIngles = texto(renderizar(estado, 'en'));
    expect(enIngles).toContain('Museo museo.nicolasdalessandro.dev Shaders browsed like TV channels.');
  });

  it('cuando todo anda, lo dice en una línea', () => {
    const estado = estadoConUnoCaido();
    estado.components = estado.components.slice(0, 1);

    expect(texto(renderizar(estado, 'en'))).toContain('All services are up.');
    expect(texto(renderizar(estado, 'es'))).toContain('Todos los servicios andan.');
  });

  it('un componente sin datos ahora sale sin datos, no como arriba', () => {
    const estado = estadoConUnoCaido();
    estado.components = [{...estado.components[0]!, status: 'no_data'}];

    const html = renderizar(estado, 'en');
    expect(html).toContain('<span class="estado estado--sin-datos">');
    const leido = texto(html);
    expect(leido).toContain('No recent reading from museo.');
    expect(leido).toContain('No data');
    expect(leido).not.toContain('All services are up.');
  });

  it('sin respuesta de la API, dice que no hay datos y no muestra servicios', () => {
    const html = renderizar(null, 'en');

    expect(renglones(html)).toBe(0);
    expect(texto(html)).toContain('No data right now.');
    expect(texto(renderizar(null, 'es'))).toContain('Ahora no hay datos.');
  });

  it('escapa lo que viene de la API', () => {
    const estado = estadoConUnoCaido();
    estado.components = [{...estado.components[1]!, id: '<img src=x onerror=alert(1)>'}];

    const html = renderizar(estado, 'en');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});
