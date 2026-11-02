import {cloudflareTest, readD1Migrations} from '@cloudflare/vitest-plugin';
import {defineConfig} from 'vitest/config';

// Las migraciones se leen del disco acá, en Node, y el setup del proyecto del Worker las aplica al
// D1 local.
const migraciones = await readD1Migrations('migrations');

export default defineConfig({
  test: {
    globals: false,
    projects: [
      {
        // Lo que no es del Worker corre en Node.
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/**/*.test.ts'],
          exclude: ['tests/worker/**'],
        },
      },
      {
        // Los tests del Worker corren en workerd, con un D1 local y sin cuenta de Cloudflare
        // (ADR-0001).
        plugins: [
          cloudflareTest({
            wrangler: {configPath: './wrangler.jsonc'},
            // El token del emisor de los tests; el de verdad es un secreto del Worker (ADR-0015).
            miniflare: {bindings: {TEST_MIGRATIONS: migraciones, EMISOR_TOKEN: 'token-de-prueba'}},
          }),
        ],
        test: {
          name: 'worker',
          include: ['tests/worker/**/*.test.ts'],
          setupFiles: ['tests/worker/aplicar-migraciones.ts'],
        },
      },
    ],
  },
});
