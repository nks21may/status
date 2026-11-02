# Bitácora del loop de construcción — Status

Registro append-only, una entrada por iteración. El backlog está en
[backlog.md](backlog.md) y el protocolo en
[.claude/commands/tdd.md](../.claude/commands/tdd.md).

**Para qué sirve:** una entrada sin la salida del comando pegada textualmente
**es** el delirio. Se detecta de un vistazo, sin tener que releer el diff.

Nunca se edita ni se reordena una entrada anterior. Si algo salió mal, se agrega
una entrada nueva que lo corrige.

**Formato:** ítem · archivos tocados · comando del gate · salida del rojo →
salida del verde · sha.

---

## S0 — Harness y estructura · 2026-11-02

**Archivos:** `.gitattributes`, `.gitignore`, `CLAUDE.md`, `README.md`, `.claude/settings.json`,
`.claude/commands/tdd.md`, `docs/adr/README.md`, `docs/adr/0000-plantilla.md`, los ADR 0001 a
0007, `docs/backlog.md`, `docs/bitacora.md`, `package.json`, `package-lock.json`, `tsconfig.json`,
`eslint.config.js`, `vitest.config.ts`, `src/version.ts`, `tests/harness.test.ts`.

**Gate:** `npm run gate`

**El gate sabe ponerse rojo.** Con un hallazgo de lint puesto a propósito
(`export const VERSION: any = '0.0.0';` en `src/version.ts`, que `tsc` deja pasar y `eslint` corta):

```
> status@0.0.0 gate
> tsc --noEmit && npm run lint && vitest run


> status@0.0.0 lint
> eslint . --max-warnings=0


P:\status\src\version.ts
  2:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)

EXIT=1
```

**Verde**, con el hallazgo sacado:

```
> status@0.0.0 gate
> tsc --noEmit && npm run lint && vitest run


> status@0.0.0 lint
> eslint . --max-warnings=0


 RUN  v4.1.12 P:/status


 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  10:03:09
   Duration  126ms (transform 14ms, setup 0ms, import 22ms, tests 2ms, environment 0ms)

EXIT=0
```

**Nota:** S0 lo dejó armado la sesión de preparación, no una iteración del
loop. La primera iteración real del loop es **S1**.

**Sha:** `6f6a1bd`
