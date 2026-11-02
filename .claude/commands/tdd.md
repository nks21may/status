---
description: Ejecuta UNA iteración del loop de construcción TDD de Status
---

Sos **una** iteración del loop de construcción de Status. Una iteración =
**un solo ítem** del backlog. No dos, no "y además aproveché para".

Arrancás sin memoria de las iteraciones anteriores. Todo tu estado está en tres
archivos y en git:

- [docs/backlog.md](docs/backlog.md) — la lista ordenada de ítems, con su gate.
- [docs/bitacora.md](docs/bitacora.md) — qué hizo cada iteración, con la evidencia pegada.
- [docs/adr/](docs/adr/) — las decisiones que ya están tomadas y **no** se rediscuten en una iteración.

## 0. Precondiciones — si alguna falla, PARÁ y reportá

1. `git branch --show-current` tiene que devolver `loop/construccion`. Si no, pará.
2. Leé el backlog completo y las últimas 3 entradas de la bitácora.
3. `git status --short`. Si hay cambios sin commitear que **no** son de esta
   iteración, anotalos en la sección "Archivos intocables" del backlog y **no
   entran** en tu commit. Si el ítem que ibas a tomar necesita tocar uno de esos
   archivos, pará y preguntá: con el árbol del usuario moviéndose, un rojo del
   gate no se puede atribuir.
4. Este loop no toca `P:\infra` ni `P:\hub`: lo que necesite de allá (el stack del emisor, su secreto, el dominio, el webhook de Alertmanager) se escribe como ítem en el backlog de ese repo. Tampoco toca la cuenta de Cloudflare ni la VPS: nada de `wrangler deploy`, `wrangler secret` ni `wrangler d1` contra la base remota, y nada por `ssh vps`. Todo lo que corre una iteración es local.

## 1. Elegí el ítem

El primero sin tildar cuyas dependencias estén tildadas. La sección
"Parkeados" no tiene checkboxes y no se toma.

Si no queda ninguno tomable, andá al punto 8.

## 2. Si aparece una decisión estructural, el ADR va PRIMERO

Antes del test. Una decisión cara de revertir —una pieza de infraestructura, un
límite entre componentes, un formato que se persiste, una postura de seguridad—
se escribe como ADR **antes** de escribir el test que la asume.

El motivo es concreto: un test es la primera cosa que congela una decisión. Si el
test se escribe antes que el ADR, el ADR termina siendo la transcripción de lo
que ya se hizo, y para eso no sirve.

**Las decisiones que ya están en [docs/adr/](docs/adr/) no se rediscuten en una
iteración.** Si una te parece mal, pará y decilo — no la contradigas en silencio
desde el código.

No hace falta ADR para elegir una librería de utilidad, nombrar un módulo o
acomodar carpetas.

## 3. Orientate en el código antes de tocarlo

El backlog cita símbolos por nombre, no por línea: cada commit invalida los
números de línea. Buscá la función por nombre y leé el código actual.

Si el repo está indexado en `codebase-memory-mcp`, usá el grafo (`search_graph`,
`get_code_snippet`, `trace_path` antes de cambiar una firma). Es más rápido que
grepear. El índice es una foto y tus commits la desactualizan: `detect_changes`
al empezar.

El código gana siempre. Si un doc lo contradice, anotá la contradicción en el
backlog.

## 4. El ciclo: ROJO → VERDE → REFACTOR

Es un solo commit. La evidencia del rojo vive en la bitácora, no en el árbol.

1. **Escribí el test.** Sólo el test. Que describa el comportamiento buscado, no
   la implementación que tenés en la cabeza.
2. **Corré el gate y verificá que falla, con el error que esperabas.** Guardá la
   salida textual.
   > Un test que nunca falló es indistinguible de no tener test. Si sale verde de
   > una: o no ejerce lo que creés, o eso ya estaba hecho. Investigá antes de
   > seguir; que el ítem ya estuviera resuelto también es un resultado válido y
   > va al backlog.
3. **Escribí el código mínimo que lo pone en verde.** Mínimo de verdad. Lo que
   sobra lo pide el ítem siguiente.
4. **Corré el gate y verificá que toda la suite quedó verde**, no sólo tu test.
5. **Refactorizá con la suite en verde**, si hace falta. Volvé a correr el gate.

**La suite en el branch queda siempre verde.** Un commit que deja un rojo bloquea
a todas las iteraciones siguientes, que ya no pueden distinguir "roto por mí" de
"roto de antes".

## 5. El gate y los comandos

Corre en el host con Node 24, como el del hub: no hay servicios aparte, y nada de lo que corre toca la cuenta de Cloudflare.

```bash
npm run gate
```

Un solo archivo, para iterar más rápido:

```bash
npx vitest run tests/<archivo>.test.ts
```

**Ojo con los pipes.** `comando | tail -20` devuelve el exit code de `tail`, que
es siempre 0: te oculta el rojo. Corré el gate sin pipe, o cerrá con
`; echo "EXIT=$?"`.

**Nada está hecho si no lo dice un comando con exit 0.** No reportes un ítem como
resuelto en base a tu lectura del diff.

## 6. Cerrá la iteración

**Gate en verde:**

1. `git add` con **rutas explícitas**, sólo los archivos de este ítem. Nunca
   `git add -A` ni `git add .`.
2. Un commit:
   ```
   <ID>: <qué hizo>

   Gate: <comando>
   Rojo: <la falla esperada, en una línea>
   Verde: <resultado, ej. "17 passed">
   ```
3. Tildá el ítem en el backlog.
4. Entrada en la bitácora: ítem, archivos tocados, comando del gate, **la salida
   textual pegada** (el rojo y el verde), y el sha.
   > Una entrada sin la salida pegada **es** el delirio. Se detecta de un vistazo
   > sin releer el diff.

**Gate en rojo que no podés resolver:**

1. `git stash push -m "loop-<ID>-rojo" -- <rutas que tocaste>`.
2. Anotá en la bitácora qué falló, con la salida pegada.
3. **Pará.** No lo intentes de nuevo en esta iteración.

## 7. Prohibiciones

- **Nunca toques el gate para ponerlo en verde.** Debilitar un assert, marcar
  `xfail`, meter un `skip` o cambiar el comando del gate está prohibido. Si el
  test falla, se arregla el código o se para.
- **Nunca escribas el código antes del test.** El orden es el método, no una
  formalidad.
- **Nunca amplíes el alcance.** Lo que descubras va como ítem nuevo al final del
  backlog.
- **Nunca toques otro repo.** Este loop es sólo `status`. Un cambio que
  necesita otro repo se escribe como ítem en el backlog de allá.
- **Nunca inventes salidas de comandos.** Si no corriste algo, decí que no lo
  corriste.

## 8. Cuándo termina el loop

Pará y reportá, sin reprogramar otra iteración, si:

- No quedan ítems tomables.
- El gate quedó rojo **dos iteraciones seguidas**.
- Una precondición del punto 0 falla.
- Apareció una decisión que necesita al usuario (un ADR discutible, un cambio
  que rompe compatibilidad).

## 9. El cierre: qué cerraste y qué queda

**Toda iteración termina mostrando los pendientes**, incluida la última y también
la que para por gate en rojo. Ya leíste el backlog entero en el punto 1, así que
es gratis, y es lo que deja al usuario decidir sin abrir el archivo.

Primero una línea con el ítem cerrado y el resultado del gate. Después **todos
los ítems sin tildar, en el orden del backlog**, uno por línea, con:

1. El ID y de qué es, en pocas palabras.
2. **Si es tomable o no, y cuando no lo es, por qué**: qué dependencia le falta o
   qué decisión del usuario está pendiente. Ésta es la columna que importa.
3. Una marca en los que son de **pérdida de datos o seguridad**: no se leen igual
   que un refactor.

Cerrá con cuál sería el próximo ítem y qué haría falta para desbloquear a los
frenados.

Dos reglas para que la lista sirva:

- **No la inventes de memoria ni la copies de la iteración anterior.** Sale de
  leer el backlog en esta corrida.
- **Los parkeados van aparte o no van**, nunca mezclados con los tomables: se
  leen como trabajo disponible y no lo son.
