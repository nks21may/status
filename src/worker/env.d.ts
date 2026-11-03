import type * as principal from './index.ts';

// Los bindings del Worker, los de `wrangler.jsonc`.
declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      /** Los archivos estáticos de `public/`: la página (ADR-0012) y el loop del hub (ADR-0019). */
      ASSETS: Fetcher;
      /** El token del emisor, un secreto del Worker. Si falta, todo envío contesta 401 (ADR-0015). */
      EMISOR_TOKEN?: string;
    }

    interface GlobalProps {
      /** Tipa `exports` de `cloudflare:workers` con lo que exporta el Worker. */
      mainModule: typeof principal;
    }
  }
}
