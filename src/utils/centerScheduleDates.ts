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


// ==================================================
// TIPOS DEL CALENDARIO MENSUAL
// ==================================================

export interface CalendarDay {
  dateISO: string;
  day: number;
  isCurrentMonth: boolean;
}

// ==================================================
// PRIMER DÍA DEL MES
// ==================================================

export function getMonthStartISO(
  dateISO: string
): string {
  if (!isValidDateISO(dateISO)) {
    throw new Error(
      'No se puede obtener el mes de una fecha no válida.'
    );
  }

  return `${dateISO.slice(0, 7)}-01`;
}

// ==================================================
// ÚLTIMO DÍA DEL MES
// ==================================================

export function getMonthEndISO(
  dateISO: string
): string {
  const monthStartISO =
    getMonthStartISO(dateISO);

  const date = new Date(
    `${monthStartISO}T12:00:00.000Z`
  );

  date.setUTCMonth(
    date.getUTCMonth() + 1,
    0
  );

  const result = date
    .toISOString()
    .split('T')[0];

  if (!isValidDateISO(result)) {
    throw new Error(
      'El último día del mes no es válido.'
    );
  }

  return result;
}

// ==================================================
// SUMAR O RESTAR MESES
// ==================================================

export function addMonthsToDateISO(
  dateISO: string,
  months: number
): string {
  if (
    !isValidDateISO(dateISO) ||
    !Number.isSafeInteger(months)
  ) {
    throw new Error(
      'La fecha o el número de meses no son válidos.'
    );
  }

  const monthStartISO =
    getMonthStartISO(dateISO);

  const date = new Date(
    `${monthStartISO}T12:00:00.000Z`
  );

  date.setUTCMonth(
    date.getUTCMonth() + months
  );

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      'El mes resultante no es válido.'
    );
  }

  const result = date
    .toISOString()
    .split('T')[0];

  if (!isValidDateISO(result)) {
    throw new Error(
      'El mes resultante está fuera del rango permitido.'
    );
  }

  return result;
}

// ==================================================
// GENERAR CELDAS DEL CALENDARIO MENSUAL
// ==================================================

export function getMonthCalendarDays(
  dateISO: string
): Array<CalendarDay | null> {
  const monthStartISO =
    getMonthStartISO(dateISO);

  const firstDay = new Date(
    `${monthStartISO}T12:00:00.000Z`
  );

  // JavaScript: domingo = 0.
  // Nuestro calendario: lunes = 0.

  const offset =
    (firstDay.getUTCDay() + 6) % 7;

  const currentMonth =
    monthStartISO.slice(0, 7);

  const calendarDays: Array<CalendarDay | null> = [];

  // Seis semanas de siete días.

  for (let index = 0; index < 42; index++) {
    const date = new Date(firstDay.getTime());

    date.setUTCDate(
      1 + index - offset
    );

    const cellDateISO = date
      .toISOString()
      .split('T')[0];

    // Evitar fechas fuera del rango ISO permitido.

    if (!isValidDateISO(cellDateISO)) {
      calendarDays.push(null);
      continue;
    }

    calendarDays.push({
      dateISO: cellDateISO,

      day: date.getUTCDate(),

      isCurrentMonth:
        cellDateISO.slice(0, 7) === currentMonth,
    });
  }

  return calendarDays;
}

// ==================================================
// FORMATEAR MES Y AÑO
// ==================================================

export function formatCalendarMonth(
  dateISO: string
): string {
  const monthStartISO =
    getMonthStartISO(dateISO);

  const formatted = formatCenterDate(
    monthStartISO,
    {
      month: 'long',
      year: 'numeric',
    }
  );

  return (
    formatted.charAt(0).toUpperCase() +
    formatted.slice(1)
  );
}
