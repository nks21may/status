import {leerEstado} from './estado.ts';
import {sondear} from './sondas.ts';

/**
 * El Worker del status. La página la sirven los archivos estáticos de `public/` sin pasar por acá
 * (ADR-0012); al Worker llega sólo lo que no es un archivo.
 */
const worker: ExportedHandler<Cloudflare.Env> = {
  /** La API pública de estado (ADR-0011). */
  async fetch(pedido, env) {
    if (new URL(pedido.url).pathname === '/api/status') {
      return Response.json(await leerEstado(env.DB, Date.now()));
    }
    // Lo que no es la API lo contestan los archivos estáticos, con su propio 404.
    return env.ASSETS.fetch(pedido);
  },

  /** El cron de cada minuto: prueba las URLs públicas desde afuera (ADR-0002). */
  async scheduled(controlador, env) {
    await sondear(env.DB, controlador.scheduledTime);
  },
};

export default worker;
