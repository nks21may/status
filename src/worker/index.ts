import {sondear} from './sondas.ts';

/** El Worker del status. */
const worker: ExportedHandler<Cloudflare.Env> = {
  /** El cron de cada minuto: prueba las URLs públicas desde afuera (ADR-0002). */
  async scheduled(controlador, env) {
    await sondear(env.DB, controlador.scheduledTime);
  },
};

export default worker;
