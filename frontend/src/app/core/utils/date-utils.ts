import { format, parseISO } from 'date-fns';

/**
 * Crea un objeto Date en hora local a partir de strings de fecha y hora.
 * Evita el problema de "un día menos" que ocurre al parsear strings ISO directos.
 * 
 * @param dateStr Formato "YYYY-MM-DD"
 * @param timeStr Formato "HH:mm"
 */
export function createLocalDate(dateStr: string, timeStr: string = '00:00'): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // month - 1 porque en JS los meses son 0-11
  return new Date(year, month - 1, day, hours, minutes);
}

/**
 * Formatea una fecha Date a string "YYYY-MM-DD" respetando la hora local.
 */
export function toLocalDateStr(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Formatea una fecha Date a string "HH:mm" respetando la hora local.
 */
export function toLocalTimeStr(date: Date): string {
  return format(date, 'HH:mm');
}

/**
 * Retorna el inicio del día local para una fecha dada.
 */
export function startOfLocalDate(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Retorna el fin del día local para una fecha dada.
 */
export function endOfLocalDate(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
