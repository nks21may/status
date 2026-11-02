-- Si la última sonda que sumó a la fila del día dio arriba (1) o no (0). Con los contadores solos no
-- se sabe si el último minuto anduvo, y el estado de ahora sale de acá (ADR-0011).
ALTER TABLE historia ADD COLUMN ultima_arriba INTEGER NOT NULL DEFAULT 0;
