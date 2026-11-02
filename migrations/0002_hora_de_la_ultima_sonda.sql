-- La hora programada de la última corrida que sumó a la fila del día, en milisegundos desde la
-- época (ADR-0009). Una corrida que no es posterior a ésa no suma: así un cron que se dispara dos
-- veces para el mismo minuto no cuenta doble.
ALTER TABLE historia ADD COLUMN ultima_sonda_en INTEGER NOT NULL DEFAULT 0;
