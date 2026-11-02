/**
 * El formato público de `GET /api/status` (ADR-0011): lo que leen la página y el MCP. Los campos van
 * en inglés y en `snake_case` porque son datos de la interfaz, no identificadores (ADR-0005).
 */

/** El estado de ahora de un componente: el de su última sonda, o sin datos si tiene más de 5 minutos. */
export type EstadoDeComponente = 'up' | 'down' | 'no_data';

/** Un día UTC de la historia; sin minutos medidos, es un día sin lectura. */
export interface DiaPublico {
  date: string;
  minutes_measured: number;
  minutes_up: number;
}

/** La última sonda de un componente. */
export interface SondaPublica {
  at: string;
  up: boolean;
  latency_ms: number;
}

export interface ComponentePublico {
  id: string;
  /** El nombre de la ficha (ADR-0015), o `null` si el emisor todavía no la mandó. */
  name: string | null;
  /** La descripción de la ficha en cada idioma, `null` en el que no trae. */
  description: {en: string | null; es: string | null};
  url: string;
  status: EstadoDeComponente;
  last_check: SondaPublica | null;
  uptime_90d: number | null;
  days: DiaPublico[];
}

export interface EstadoPublico {
  generated_at: string;
  components: ComponentePublico[];
}
