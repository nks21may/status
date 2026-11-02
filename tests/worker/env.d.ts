import type {D1Migration} from 'cloudflare:test';

// Lo que los tests le suman al `env` del Worker.
declare global {
  namespace Cloudflare {
    interface Env {
      /** Las migraciones de D1, que la config de Vitest lee del disco. */
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}
