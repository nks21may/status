import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {VERSION} from '../src/version.ts';

describe('harness', () => {
  it('resuelve los imports de src y la version coincide con package.json', () => {
    const paquete = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    expect(VERSION).toBe(paquete.version);
  });
});
