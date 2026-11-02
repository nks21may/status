import {applyD1Migrations} from 'cloudflare:test';
import {env} from 'cloudflare:workers';

// Deja el D1 local con el esquema de las migraciones antes de cada archivo de tests.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
