import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {describe, expect, it} from 'vitest';
import {parse} from 'yaml';

/**
 * Lo que decide ADR-0017 sobre la publicación, leído de los archivos que la hacen: el workflow, el
 * Dockerfile y `wrangler.jsonc`. El CI corre en GitHub y no se puede correr acá; lo que se fija es
 * que diga lo que el ADR decidió.
 */

function leer(ruta: string): string {
  return readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
}

interface Paso {
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
  env?: Record<string, string>;
}

interface Trabajo {
  if?: string;
  needs?: string | string[];
  'runs-on': string;
  permissions?: Record<string, string>;
  env?: Record<string, string>;
  steps: Paso[];
}

interface Workflow {
  on: {push?: {branches?: string[]}};
  jobs: Record<string, Trabajo>;
}

const workflow = parse(leer('.github/workflows/publicar.yml')) as Workflow;

function trabajo(nombre: string): Trabajo {
  const encontrado = workflow.jobs[nombre];
  if (!encontrado) {
    throw new Error(`el workflow no tiene el trabajo ${nombre}`);
  }
  return encontrado;
}

/** El índice del primer paso cuyo comando contiene `texto`, o -1. */
function paso(nombre: string, texto: string): number {
  return trabajo(nombre).steps.findIndex((cada) => cada.run?.includes(texto));
}

const SOLO_MAIN = "github.ref == 'refs/heads/main'";

describe('la publicación', () => {
  it('el workflow publica sólo desde main, y el Worker y la imagen esperan al gate', () => {
    expect(workflow.on.push?.branches).toEqual(['main']);
    expect(paso('gate', 'npm ci')).toBeGreaterThanOrEqual(0);
    expect(paso('gate', 'npm run gate')).toBeGreaterThan(paso('gate', 'npm ci'));
    for (const nombre of ['worker', 'imagen']) {
      expect([trabajo(nombre).needs].flat(), nombre).toContain('gate');
      expect(trabajo(nombre).if, nombre).toBe(SOLO_MAIN);
    }
  });

  it('el Worker aplica las migraciones remotas antes del deploy, con los secretos de Cloudflare', () => {
    const migraciones = paso('worker', 'wrangler d1 migrations apply status --remote');
    const deploy = paso('worker', 'wrangler deploy');

    expect(migraciones).toBeGreaterThanOrEqual(0);
    expect(deploy).toBeGreaterThan(migraciones);
    expect(trabajo('worker').env).toEqual({
      CLOUDFLARE_API_TOKEN: '${{ secrets.CLOUDFLARE_API_TOKEN }}',
      CLOUDFLARE_ACCOUNT_ID: '${{ secrets.CLOUDFLARE_ACCOUNT_ID }}',
    });
    // Los secretos de Cloudflare no los ve ningún otro trabajo.
    for (const nombre of ['gate', 'imagen']) {
      expect(JSON.stringify(trabajo(nombre)), nombre).not.toContain('CLOUDFLARE');
    }
  });

  it('la imagen del emisor sale de un runner arm, con :latest y :<sha>', () => {
    const imagen = trabajo('imagen');
    const construir = imagen.steps.find((cada) => cada.uses?.startsWith('docker/build-push-action@'));

    expect(imagen['runs-on']).toBe('ubuntu-24.04-arm');
    expect(imagen.permissions).toEqual({contents: 'read', packages: 'write'});
    expect(construir?.with?.push).toBe(true);
    expect(String(construir?.with?.tags).trim().split('\n').map((tag) => tag.trim())).toEqual([
      'ghcr.io/nks21may/status-emisor:latest',
      'ghcr.io/nks21may/status-emisor:${{ github.sha }}',
    ]);
  });

  it('la imagen corre el gate al construirse, y la final corre el emisor con Node 24, sin node_modules y sin root', () => {
    const dockerfile = leer('Dockerfile');
    const etapas = dockerfile.split(/^FROM /m).slice(1);
    const [construccion, final] = [etapas.at(-2) ?? '', etapas.at(-1) ?? ''];

    expect(construccion).toMatch(/^RUN npm run gate$/m);
    // Sin certificados de CA, workerd no arranca y los tests del Worker no corren.
    expect(construccion).toMatch(/apt-get install[^\n]*\bca-certificates\b/);
    expect(final).toMatch(/^node:24-alpine\b/);
    expect(final).not.toContain('node_modules');
    expect(final).toMatch(/^USER node$/m);
    expect(final).toMatch(/^CMD \["node", "src\/emisor\/principal\.ts"\]$/m);
    // Sin esto, el `COPY . .` pisaría el node_modules de Linux con el de la máquina que construye.
    expect(leer('.dockerignore').split('\n')).toContain('node_modules');
  });

  it('el Worker no se publica en workers.dev: tiene una sola puerta pública', () => {
    const {config, error} = ts.parseConfigFileTextToJson('wrangler.jsonc', leer('wrangler.jsonc'));

    expect(error).toBeUndefined();
    expect(config.workers_dev).toBe(false);
  });
});
