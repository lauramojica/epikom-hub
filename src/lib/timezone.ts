/**
 * Epikom Ops Hub — Zonas horarias
 *
 * Reemplaza el offset fijo de Puerto Rico. Usa Intl, que ya viene
 * en Node con ICU completo, así que no hace falta date-fns-tz.
 *
 * Maneja DST correctamente, que es lo que importa cuando el crew
 * o los clientes no están todos en PR (IG Sports está en Omaha,
 * que sí cambia de hora dos veces al año).
 */

export const DEFAULT_TZ = 'America/Puerto_Rico';

/**
 * Zonas para el dropdown de settings. Ordenadas por uso real.
 */
export const ZONAS_COMUNES = [
  { value: 'America/Puerto_Rico', label: 'Puerto Rico (AST)' },
  { value: 'America/New_York', label: 'Este de EE.UU. (ET)' },
  { value: 'America/Chicago', label: 'Centro de EE.UU. (CT) — Omaha' },
  { value: 'America/Denver', label: 'Montaña (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacífico (PT)' },
  { value: 'America/Santo_Domingo', label: 'República Dominicana' },
  { value: 'America/Bogota', label: 'Colombia' },
  { value: 'America/Mexico_City', label: 'México' },
  { value: 'Europe/Madrid', label: 'España' },
] as const;

/** Todas las zonas IANA, por si alguien necesita una que no está arriba. */
export function todasLasZonas(): string[] {
  return Intl.supportedValuesOf?.('timeZone') ?? [DEFAULT_TZ];
}

export function esZonaValida(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Offset real (con DST)
// ---------------------------------------------------------------------------

/**
 * Milisegundos que hay que sumarle a un instante UTC para obtener
 * la hora de pared en `tz`. Cambia según la fecha, por el DST.
 */
export function offsetEnZona(fecha: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const partes: Record<string, number> = {};
  for (const p of dtf.formatToParts(fecha)) {
    if (p.type !== 'literal') partes[p.type] = Number(p.value);
  }

  const comoUTC = Date.UTC(
    partes.year,
    partes.month - 1,
    partes.day,
    partes.hour % 24, // algunas implementaciones devuelven 24 en vez de 0
    partes.minute,
    partes.second
  );

  return comoUTC - fecha.getTime();
}

/** El instante UTC como "hora de pared" en la zona, para leer sus partes. */
function aHoraDePared(fecha: Date, tz: string): Date {
  return new Date(fecha.getTime() + offsetEnZona(fecha, tz));
}

/**
 * Convierte una hora de pared de vuelta a UTC real.
 * Re-resuelve el offset porque el día objetivo puede caer
 * al otro lado de un cambio de horario.
 */
function deHoraDePared(paredMs: number, tz: string): Date {
  const off1 = offsetEnZona(new Date(paredMs), tz);
  const off2 = offsetEnZona(new Date(paredMs - off1), tz);
  return new Date(paredMs - off2);
}

// ---------------------------------------------------------------------------
// Semana
// ---------------------------------------------------------------------------

/**
 * Inicio y fin de la semana que contiene `base`, en la zona dada.
 * Devuelve instantes UTC reales, listos para consultar la BD.
 *
 * @param inicioSemana 0 = domingo, 1 = lunes (default)
 */
export function rangoSemana(
  base = new Date(),
  tz: string = DEFAULT_TZ,
  inicioSemana: 0 | 1 = 1
): { inicio: Date; fin: Date } {
  const pared = aHoraDePared(base, tz);

  const diaSemana = pared.getUTCDay();
  const diasAtras = (diaSemana - inicioSemana + 7) % 7;

  const paredInicio = Date.UTC(
    pared.getUTCFullYear(),
    pared.getUTCMonth(),
    pared.getUTCDate() - diasAtras
  );

  const inicio = deHoraDePared(paredInicio, tz);

  // +7 días en hora de pared, no en milisegundos: una semana con
  // cambio de horario dura 167 o 169 horas, no 168.
  const paredFin = Date.UTC(
    pared.getUTCFullYear(),
    pared.getUTCMonth(),
    pared.getUTCDate() - diasAtras + 7
  );

  const fin = new Date(deHoraDePared(paredFin, tz).getTime() - 1);

  return { inicio, fin };
}

/** Rango de un mes completo en la zona dada. */
export function rangoMes(year: number, month: number, tz: string = DEFAULT_TZ): { inicio: Date; fin: Date } {
  const inicio = deHoraDePared(Date.UTC(year, month - 1, 1), tz);
  const fin = new Date(deHoraDePared(Date.UTC(year, month, 1), tz).getTime() - 1);
  return { inicio, fin };
}

/** Clave YYYY-MM-DD del día calendario en la zona. Para agrupar. */
export function claveDia(fecha: Date, tz: string = DEFAULT_TZ): string {
  return aHoraDePared(fecha, tz).toISOString().slice(0, 10);
}

/** Los 7 días de la semana como instantes, para armar la grilla. */
export function diasDeLaSemana(
  base = new Date(),
  tz: string = DEFAULT_TZ,
  inicioSemana: 0 | 1 = 1
): Date[] {
  const { inicio } = rangoSemana(base, tz, inicioSemana);
  const pared = aHoraDePared(inicio, tz);

  return Array.from({ length: 7 }, (_, i) =>
    deHoraDePared(
      Date.UTC(pared.getUTCFullYear(), pared.getUTCMonth(), pared.getUTCDate() + i),
      tz
    )
  );
}

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------

export function formatearEnZona(
  fecha: Date,
  tz: string = DEFAULT_TZ,
  opciones: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: 'short',
  },
  locale = 'es-PR'
): string {
  return new Intl.DateTimeFormat(locale, { ...opciones, timeZone: tz }).format(fecha);
}

/** Nombre del día en español: lunes, martes... */
export function nombreDia(fecha: Date, tz: string = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat('es-PR', { weekday: 'long', timeZone: tz }).format(fecha);
}

/** Abreviatura viva de la zona: AST, CST, CDT, CET... */
export function siglaZona(fecha: Date, tz: string): string {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'short',
  }).formatToParts(fecha);

  return partes.find((p) => p.type === 'timeZoneName')?.value ?? '';
}

/**
 * Para mostrar cuando el cliente está en otra zona que tú.
 * Ej: "8:00 AM CDT (9:00 AM tu hora)"
 */
export function horaDoble(
  fecha: Date,
  tzCliente: string,
  tzUsuario: string
): string {
  const hora = (tz: string) =>
    formatearEnZona(fecha, tz, { hour: 'numeric', minute: '2-digit' });

  if (tzCliente === tzUsuario) return hora(tzUsuario);

  return `${hora(tzCliente)} ${siglaZona(fecha, tzCliente)} (${hora(tzUsuario)} tu hora)`;
}

// ---------------------------------------------------------------------------
// Helpers adicionales
// ---------------------------------------------------------------------------

/** ¿El día ya pasó en la zona del usuario? */
export function esPasado(fecha: Date, tz: string = DEFAULT_TZ): boolean {
  const hoy = claveDia(new Date(), tz);
  const objetivo = claveDia(fecha, tz);
  return objetivo < hoy;
}

/** ¿Es hoy en la zona del usuario? */
export function esHoy(fecha: Date, tz: string = DEFAULT_TZ): boolean {
  return claveDia(fecha, tz) === claveDia(new Date(), tz);
}

/** Días de diferencia entre dos fechas en la zona */
export function diasEntre(desde: Date, hasta: Date, tz: string = DEFAULT_TZ): number {
  const d1 = claveDia(desde, tz);
  const d2 = claveDia(hasta, tz);
  const ms1 = new Date(d1).getTime();
  const ms2 = new Date(d2).getTime();
  return Math.round((ms2 - ms1) / (24 * 60 * 60 * 1000));
}
