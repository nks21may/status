# ADR-0008 — La página se diseña con la skill `impeccable`, antes de S2

- **Estado:** aceptado (decidido por el usuario el 2026-11-02)
- **Fecha:** 2026-11-02
- **Decide:** cómo se decide el diseño visual y de interacción de la página, y cuándo.

## Contexto

La página es lo que se ve del proyecto, y es parte del CV. En los repos con interfaz de `P:\`
(`hub`, `nonograma`, `museo`, `osint`, `turnero`, `Coordinador`, `portfolio4`) el diseño se fijó con
la skill `impeccable`, que deja escrito un `PRODUCT.md` (para quién es, qué tiene que transmitir) y
un `DESIGN.md` (tokens, tipografía, color, componentes) contra los que se revisa cada pantalla (en
el hub, su ADR-0007).

La primera pantalla llega con S2. Si S2 la arma antes del diseño, el diseño termina siendo la
transcripción de lo que ya se hizo.

## Decisión

- **El diseño se define con `impeccable`**, que escribe `PRODUCT.md` y `DESIGN.md` en la raíz.
- **Antes de S2:** el loop no toma S2 hasta que existan los dos. Se escriben en una sesión con el
  usuario, no en una iteración del loop.
- **La página se construye contra esos dos documentos:** un color, una tipografía o un espaciado
  que no sale de `DESIGN.md` es un hallazgo de review.
- **Los cambios de diseño pasan por `impeccable`** y actualizan `DESIGN.md` en el mismo commit.

## Consecuencias

**A favor:** el criterio visual queda escrito y no depende de quién toque la pantalla.

**En contra:** S2 queda frenado hasta esa sesión, y un ajuste visual chico también tiene que
reflejarse en `DESIGN.md`.

**Se revisa si:** `DESIGN.md` deja de coincidir con lo que se ve y nadie lo actualiza.

## Alternativas consideradas

- **Que S2 arme una página mínima y diseñarla después.** El usuario eligió diseñar antes: lo que se
  arma sin diseño se rehace.
- **Diseñar sobre la marcha, pantalla por pantalla.** Así terminan las interfaces inconsistentes,
  sin nada contra qué revisar.
