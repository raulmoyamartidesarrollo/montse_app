import {
  CENTER_SCHEDULE_TIMEZONE,
} from '../types/centerSchedules';

// ==================================================
// VALIDAR FECHA ISO
// ==================================================

export function isValidDateISO(
  value: unknown
): value is string {
  if (
    typeof value !== 'string' ||
    value.length !== 10 ||
    !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)
  ) {
    return false;
  }

  const [year, month, day] =
    value.split('-').map(Number);

  if (
    year < 1 ||
    year > 9999 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return false;
  }

  const date = new Date(
    `${value}T12:00:00.000Z`
  );

  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

// ==================================================
// FECHA ACTUAL EN LA ZONA HORARIA DEL CENTRO
// ==================================================

export function getCenterTodayISO(
  now: Date = new Date()
): string {
  const parts = new Intl.DateTimeFormat(
    'en-GB',
    {
      timeZone: CENTER_SCHEDULE_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }
  ).formatToParts(now);

  const year = parts.find(
    (part) => part.type === 'year'
  )?.value;

  const month = parts.find(
    (part) => part.type === 'month'
  )?.value;

  const day = parts.find(
    (part) => part.type === 'day'
  )?.value;

  const dateISO =
    `${year?.padStart(4, '0')}-${month}-${day}`;

  if (!isValidDateISO(dateISO)) {
    throw new Error(
      'No se ha podido obtener la fecha actual del centro.'
    );
  }

  return dateISO;
}

// ==================================================
// SUMAR O RESTAR DÍAS
// ==================================================

export function addDaysToDateISO(
  dateISO: string,
  days: number
): string {
  if (
    !isValidDateISO(dateISO) ||
    !Number.isSafeInteger(days)
  ) {
    throw new Error(
      'La fecha o el número de días no son válidos.'
    );
  }

  const date = new Date(
    `${dateISO}T12:00:00.000Z`
  );

  date.setUTCDate(
    date.getUTCDate() + days
  );

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      'La fecha resultante no es válida.'
    );
  }

  const result = date
    .toISOString()
    .split('T')[0];

  if (!isValidDateISO(result)) {
    throw new Error(
      'La fecha resultante está fuera del rango permitido.'
    );
  }

  return result;
}

// ==================================================
// FORMATEAR FECHA PARA MOSTRAR EN PANTALLA
// ==================================================

export function formatCenterDate(
  dateISO: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }
): string {
  if (!isValidDateISO(dateISO)) {
    throw new Error(
      'No se puede formatear una fecha no válida.'
    );
  }

  const date = new Date(
    `${dateISO}T12:00:00.000Z`
  );

  return new Intl.DateTimeFormat(
    'es-ES',
    {
      ...options,
      timeZone: 'UTC',
    }
  ).format(date);
}
