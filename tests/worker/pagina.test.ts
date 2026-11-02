import {exports} from 'cloudflare:workers';
import {describe, expect, it} from 'vitest';

describe('la página', () => {
  it('se sirve como archivo estático, en inglés, y carga el código que pide la API', async () => {
    const respuesta = await exports.default.fetch('https://status.example/');

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('content-type')).toContain('text/html');
    const html = await respuesta.text();
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<script src="/pagina.js" defer></script>');
    expect(html).toContain('<link rel="stylesheet" href="/estilos.css">');
  });
});
