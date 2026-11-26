import {
  MAX_DAILY_PERIODS,
  WEEK_DAYS,
  WEEK_DAY_LABELS,
  type DailySchedule,
  type WeeklySchedule,
  type WeekDay,
  type TimePeriod,
} from '../types/centerSchedules';

// ==================================================
// TIPOS
// ==================================================

export interface DailyScheduleValidation {
  isValid: boolean;
  dayError: string | null;
  periodErrors: Record<number, string>;
}

export interface WeeklyScheduleValidation {
  isValid: boolean;
  days: Record<WeekDay, DailyScheduleValidation>;
  firstInvalidDay: WeekDay | null;
  firstError: string | null;
}

// ==================================================
// VALIDAR FORMATO DE HORA
// ==================================================

export function isValidScheduleTime(
  value: string
): boolean {
  return (
    typeof value === 'string' &&
    value.length === 5 &&
    /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value)
  );
}

// ==================================================
// CONVERTIR HORA A MINUTOS
// ==================================================

export function scheduleTimeToMinutes(
  value: string
): number {
  if (!isValidScheduleTime(value)) {
    return Number.NaN;
  }

  const [hours, minutes] = value
    .split(':')
    .map(Number);

  return hours * 60 + minutes;
}

// ==================================================
// VALIDAR UN DÍA
// ==================================================

export function validateDailySchedule(
  schedule: DailySchedule
): DailyScheduleValidation {
  const periodErrors: Record<number, string> = {};

  let dayError: string | null = null;

  const periods = schedule.periods;

  // Día cerrado.

  if (schedule.closed) {
    if (periods.length > 0) {
      dayError =
        'Un día cerrado no puede tener tramos de apertura.';
    }

    return {
      isValid: dayError === null,
      dayError,
      periodErrors,
    };
  }

  // Día abierto sin tramos.

  if (periods.length === 0) {
    dayError =
      'Añade al menos un tramo de apertura.';
  }

  // Máximo de tramos diarios.

  if (periods.length > MAX_DAILY_PERIODS) {
    dayError =
      `Solo se permiten ${MAX_DAILY_PERIODS} tramos por día.`;
  }

  // Validación individual de cada tramo.

  const validPeriods: {
    index: number;
    start: number;
    end: number;
  }[] = [];

  periods.forEach((period, index) => {
    if (
      !isValidScheduleTime(period.start) ||
      !isValidScheduleTime(period.end)
    ) {
      periodErrors[index] =
        'Introduce una hora válida en formato HH:mm.';

      return;
    }

    const start =
      scheduleTimeToMinutes(period.start);

    const end =
      scheduleTimeToMinutes(period.end);

    if (start === end) {
      periodErrors[index] =
        'Las horas de apertura y cierre no pueden ser iguales.';

      return;
    }

    if (start > end) {
      periodErrors[index] =
        'La hora de cierre debe ser posterior a la de apertura.';

      return;
    }

    validPeriods.push({
      index,
      start,
      end,
    });
  });

  // ==================================================
  // DETECTAR SOLAPAMIENTOS
  // ==================================================

  for (
    let firstIndex = 0;
    firstIndex < validPeriods.length;
    firstIndex++
  ) {
    const first = validPeriods[firstIndex];

    for (
      let secondIndex = firstIndex + 1;
      secondIndex < validPeriods.length;
      secondIndex++
    ) {
      const second = validPeriods[secondIndex];

      const overlaps =
        first.start < second.end &&
        second.start < first.end;

      if (!overlaps) {
        continue;
      }

      periodErrors[first.index] =
        'Este tramo se solapa con otro horario.';

      periodErrors[second.index] =
        'Este tramo se solapa con otro horario.';
    }
  }

  return {
    isValid:
      dayError === null &&
      Object.keys(periodErrors).length === 0,

    dayError,

    periodErrors,
  };
}

// ==================================================
// VALIDAR TODA LA SEMANA
// ==================================================

export function validateWeeklySchedule(
  weekly: WeeklySchedule
): WeeklyScheduleValidation {
  const days = {} as Record<
    WeekDay,
    DailyScheduleValidation
  >;

  let firstInvalidDay: WeekDay | null = null;

  let firstError: string | null = null;

  for (const day of WEEK_DAYS) {
    const validation =
      validateDailySchedule(weekly[day]);

    days[day] = validation;

    if (
      !validation.isValid &&
      firstInvalidDay === null
    ) {
      firstInvalidDay = day;

      const periodError =
        Object.values(
          validation.periodErrors
        )[0];

      const message =
        validation.dayError ??
        periodError ??
        'Revisa el horario de este día.';

      firstError =
        `${WEEK_DAY_LABELS[day]}: ${message}`;
    }
  }

  return {
    isValid: firstInvalidDay === null,
    days,
    firstInvalidDay,
    firstError,
  };
}

// ==================================================
// ORDENAR TRAMOS HORARIOS
// ==================================================

export function normalizeDailySchedule(
  schedule: DailySchedule
): DailySchedule {
  if (schedule.closed) {
    return {
      closed: true,
      periods: [],
    };
  }

  const periods: TimePeriod[] =
    schedule.periods.map((period) => ({
      start: period.start,
      end: period.end,
    }));

  periods.sort(
    (first, second) =>
      scheduleTimeToMinutes(first.start) -
      scheduleTimeToMinutes(second.start)
  );

  return {
    closed: false,
    periods,
  };
}

// ==================================================
// NORMALIZAR TODA LA SEMANA
// ==================================================

export function normalizeWeeklySchedule(
  weekly: WeeklySchedule
): WeeklySchedule {
  const normalized = {} as WeeklySchedule;

  for (const day of WEEK_DAYS) {
    normalized[day] =
      normalizeDailySchedule(weekly[day]);
  }

  return normalized;
}

// ==================================================
// COMPARAR HORARIOS
// ==================================================

export function weeklySchedulesAreEqual(
  first: WeeklySchedule,
  second: WeeklySchedule
): boolean {
  return WEEK_DAYS.every((day) => {
    const firstDay = first[day];
    const secondDay = second[day];

    if (
      firstDay.closed !== secondDay.closed ||
      firstDay.periods.length !==
        secondDay.periods.length
    ) {
      return false;
    }

    const firstNormalized =
      normalizeDailySchedule(firstDay);

    const secondNormalized =
      normalizeDailySchedule(secondDay);

    return firstNormalized.periods.every(
      (period, index) => {
        const other =
          secondNormalized.periods[index];

        return (
          period.start === other.start &&
          period.end === other.end
        );
      }
    );
  });
}

// ==================================================
// COPIAR HORARIO SIN COMPARTIR REFERENCIAS
// ==================================================

export function cloneDailySchedule(
  schedule: DailySchedule
): DailySchedule {
  return {
    closed: schedule.closed,
    periods: schedule.periods.map(
      (period) => ({
        start: period.start,
        end: period.end,
      })
    ),
  };
}

export function cloneWeeklySchedule(
  weekly: WeeklySchedule
): WeeklySchedule {
  const cloned = {} as WeeklySchedule;

  for (const day of WEEK_DAYS) {
    cloned[day] =
      cloneDailySchedule(weekly[day]);
  }

  return cloned;
}
