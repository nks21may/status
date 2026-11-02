-- Los componentes y su historia por día (ADR-0009). Una migración aplicada no se edita: un cambio
-- es una migración nueva.

-- Un componente es una ficha visible del catálogo, identificada por su stack (ADR-0007).
CREATE TABLE componentes (
  stack TEXT PRIMARY KEY,
  url TEXT NOT NULL
) STRICT;

-- Una fila por componente y por día UTC. Cada sonda suma un minuto medido, y uno arriba si la URL
-- contestó 2xx; la última sonda del día deja su latencia.
CREATE TABLE historia (
  stack TEXT NOT NULL,
  dia TEXT NOT NULL,
  minutos_medidos INTEGER NOT NULL,
  minutos_arriba INTEGER NOT NULL,
  ultima_latencia_ms INTEGER NOT NULL,
  PRIMARY KEY (stack, dia)
) STRICT;
