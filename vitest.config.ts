import {cloudflareTest, readD1Migrations} from '@cloudflare/vitest-pool-workers';
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
            miniflare: {bindings: {TEST_MIGRATIONS: migraciones}},
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
