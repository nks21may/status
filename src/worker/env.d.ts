import type * as principal from './index.ts';

// Los bindings del Worker, los de `wrangler.jsonc`.
declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
    }

    interface GlobalProps {
      /** Tipa `exports` de `cloudflare:workers` con lo que exporta el Worker. */
      mainModule: typeof principal;
    }
  }
}
