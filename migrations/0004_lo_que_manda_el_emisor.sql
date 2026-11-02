-- Lo que manda el emisor con cada envío (ADR-0015): el nombre y las descripciones de la ficha, y la
-- salud de adentro (1 sano, 0 no, NULL sin datos de adentro).
ALTER TABLE componentes ADD COLUMN nombre TEXT;
ALTER TABLE componentes ADD COLUMN descripcion_es TEXT;
ALTER TABLE componentes ADD COLUMN descripcion_en TEXT;
ALTER TABLE componentes ADD COLUMN sano_adentro INTEGER;

-- La hora en que el Worker recibió el último envío, con su propio reloj: una sola fila.
CREATE TABLE envios (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  recibido_en INTEGER NOT NULL
) STRICT;
