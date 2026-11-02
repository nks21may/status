import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    // Por ahora todo corre en Node. Los tests del Worker pasan a workerd con el pool de Workers
    // de Vitest cuando llegue el Worker (S1, ADR-0001).
    environment: 'node',
    globals: false,
    include: ['tests/**/*.test.ts'],
  },
});
