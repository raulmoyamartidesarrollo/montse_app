import type {
  VacationDateRange,
  VacationStatus,
} from '../types/centerVacations';

import {
  isValidDateISO,
  getCenterTodayISO,
  getMonthStartISO,
  getMonthEndISO,
  addDaysToDateISO,
  formatCenterDate,
} from './centerScheduleDates';

const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000;

// ==================================================
// VALIDAR RANGO DE VACACIONES
// ==================================================

export function isValidVacationRange(
  value: unknown
): value is VacationDateRange {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const range = value as Partial<VacationDateRange>;

  return (
    isValidDateISO(range.startDateISO) &&
    isValidDateISO(range.endDateISO) &&
    range.startDateISO <= range.endDateISO
  );
}

// ==================================================
// NORMALIZAR RANGO DE FECHAS
// ==================================================

export function normalizeVacationRange(
  firstDateISO: string,
  secondDateISO: string
): VacationDateRange {
  if (
    !isValidDateISO(firstDateISO) ||
    !isValidDateISO(secondDateISO)
  ) {
    throw new Error(
      'Las fechas seleccionadas no son válidas.'
    );
  }

  if (firstDateISO <= secondDateISO) {
    return {
      startDateISO: firstDateISO,
      endDateISO: secondDateISO,
    };
  }

  return {
    startDateISO: secondDateISO,
    endDateISO: firstDateISO,
  };
}

// ==================================================
// CALCULAR DURACIÓN INCLUSIVA
// ==================================================

export function getVacationDurationDays(
  range: VacationDateRange
): number {
  if (!isValidVacationRange(range)) {
    throw new Error(
      'El periodo de vacaciones no es válido.'
    );
  }

  const start = new Date(
    range.startDateISO + 'T12:00:00.000Z'
  ).getTime();

  const end = new Date(
    range.endDateISO + 'T12:00:00.000Z'
  ).getTime();

  return (
    (end - start) / MILLISECONDS_PER_DAY
  ) + 1;
}

// ==================================================
// OBTENER ESTADO TEMPORAL
// ==================================================

export function getVacationStatus(
  range: VacationDateRange,
  todayISO: string = getCenterTodayISO()
): VacationStatus {
  if (
    !isValidVacationRange(range) ||
    !isValidDateISO(todayISO)
  ) {
    throw new Error(
      'No se puede determinar el estado de las vacaciones.'
    );
  }

  if (range.endDateISO < todayISO) {
    return 'past';
  }

  if (range.startDateISO > todayISO) {
    return 'upcoming';
  }

  return 'current';
}

// ==================================================
// COMPROBAR SI UNA FECHA PERTENECE AL PERIODO
// ==================================================

export function isDateInVacationRange(
  dateISO: string,
  range: VacationDateRange
): boolean {
  if (
    !isValidDateISO(dateISO) ||
    !isValidVacationRange(range)
  ) {
    return false;
  }

  return (
    dateISO >= range.startDateISO &&
    dateISO <= range.endDateISO
  );
}

// ==================================================
// DETECTAR SOLAPAMIENTO ENTRE PERIODOS
// ==================================================

export function doVacationRangesOverlap(
  firstRange: VacationDateRange,
  secondRange: VacationDateRange
): boolean {
  if (
    !isValidVacationRange(firstRange) ||
    !isValidVacationRange(secondRange)
  ) {
    throw new Error(
      'No se pueden comparar periodos no válidos.'
    );
  }

  return (
    firstRange.startDateISO <= secondRange.endDateISO &&
    firstRange.endDateISO >= secondRange.startDateISO
  );
}

// ==================================================
// OBTENER DÍAS DE VACACIONES DEL MES VISIBLE
// ==================================================

export function getVacationDatesInMonth(
  range: VacationDateRange,
  monthISO: string
): string[] {
  if (
    !isValidVacationRange(range) ||
    !isValidDateISO(monthISO)
  ) {
    throw new Error(
      'El periodo o el mes seleccionado no son válidos.'
    );
  }

  const monthStartISO =
    getMonthStartISO(monthISO);

  const monthEndISO =
    getMonthEndISO(monthISO);

  const monthRange: VacationDateRange = {
    startDateISO: monthStartISO,
    endDateISO: monthEndISO,
  };

  if (
    !doVacationRangesOverlap(
      range,
      monthRange
    )
  ) {
    return [];
  }

  const visibleStartISO =
    range.startDateISO > monthStartISO
      ? range.startDateISO
      : monthStartISO;

  const visibleEndISO =
    range.endDateISO < monthEndISO
      ? range.endDateISO
      : monthEndISO;

  const dates: string[] = [];

  let currentDateISO = visibleStartISO;

  while (currentDateISO <= visibleEndISO) {
    dates.push(currentDateISO);

    if (currentDateISO === visibleEndISO) {
      break;
    }

    currentDateISO = addDaysToDateISO(
      currentDateISO,
      1
    );
  }

  return dates;
}

// ==================================================
// FORMATEAR PERIODO DE VACACIONES
// ==================================================

export function formatVacationRange(
  range: VacationDateRange
): string {
  if (!isValidVacationRange(range)) {
    throw new Error(
      'No se puede formatear un periodo no válido.'
    );
  }

  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };

  const startLabel = formatCenterDate(
    range.startDateISO,
    options
  );

  if (range.startDateISO === range.endDateISO) {
    return startLabel;
  }

  const endLabel = formatCenterDate(
    range.endDateISO,
    options
  );

  return 'Del ' + startLabel + ' al ' + endLabel;
}
