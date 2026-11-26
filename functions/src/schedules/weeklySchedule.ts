import { HttpsError } from "firebase-functions/v2/https";

// ==================================================
// CONSTANTES
// ==================================================

export const SCHEDULE_WEEK_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type ScheduleWeekDay =
  typeof SCHEDULE_WEEK_DAYS[number];

export const MAX_DAILY_PERIODS = 5;

export const SCHEDULE_TIMEZONE = "Europe/Madrid";

const WEEK_DAY_LABELS: Record<ScheduleWeekDay, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

// ==================================================
// TIPOS
// ==================================================

export interface ScheduleTimePeriod {
  start: string;
  end: string;
}

export interface ScheduleDay {
  closed: boolean;
  periods: ScheduleTimePeriod[];
}

export type WeeklySchedule = Record<
  ScheduleWeekDay,
  ScheduleDay
>;

// ==================================================
// VALIDAR OBJETOS
// ==================================================

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function validateExactKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  context: string
): void {
  const keys = Object.keys(value);

  if (
    keys.length !== allowedKeys.length ||
    !allowedKeys.every((key) =>
      Object.prototype.hasOwnProperty.call(value, key)
    )
  ) {
    throw new HttpsError(
      "invalid-argument",
      `${context}: los campos no son válidos.`
    );
  }
}

// ==================================================
// VALIDAR FORMATO DE HORA
// ==================================================

export function isValidScheduleTime(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
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
    throw new HttpsError(
      "invalid-argument",
      "El formato de hora no es válido."
    );
  }

  const [hours, minutes] = value.split(":").map(Number);

  return hours * 60 + minutes;
}

// ==================================================
// VALIDAR TRAMO HORARIO
// ==================================================

function validateTimePeriod(
  value: unknown,
  context: string
): ScheduleTimePeriod {
  if (!isRecord(value)) {
    throw new HttpsError(
      "invalid-argument",
      `${context}: el tramo horario no es válido.`
    );
  }

  validateExactKeys(
    value,
    ["start", "end"],
    context
  );

  const { start, end } = value;

  if (
    !isValidScheduleTime(start) ||
    !isValidScheduleTime(end)
  ) {
    throw new HttpsError(
      "invalid-argument",
      `${context}: las horas deben tener formato HH:mm.`
    );
  }

  if (
    scheduleTimeToMinutes(start) >=
    scheduleTimeToMinutes(end)
  ) {
    throw new HttpsError(
      "invalid-argument",
      `${context}: la hora de inicio debe ser anterior a la hora de fin.`
    );
  }

  return {
    start,
    end,
  };
}

// ==================================================
// VALIDAR HORARIO DIARIO
// ==================================================

export function validateScheduleDay(
  value: unknown,
  context: string
): ScheduleDay {
  if (!isRecord(value)) {
    throw new HttpsError(
      "invalid-argument",
      `${context}: el horario no es válido.`
    );
  }

  validateExactKeys(
    value,
    ["closed", "periods"],
    context
  );

  const { closed, periods } = value;

  if (typeof closed !== "boolean") {
    throw new HttpsError(
      "invalid-argument",
      `${context}: el estado del día no es válido.`
    );
  }

  if (!Array.isArray(periods)) {
    throw new HttpsError(
      "invalid-argument",
      `${context}: los tramos horarios no son válidos.`
    );
  }

  if (periods.length > MAX_DAILY_PERIODS) {
    throw new HttpsError(
      "invalid-argument",
      `${context}: se permiten como máximo ${MAX_DAILY_PERIODS} tramos horarios.`
    );
  }

  if (closed && periods.length > 0) {
    throw new HttpsError(
      "invalid-argument",
      `${context}: un día cerrado no puede tener tramos horarios.`
    );
  }

  if (!closed && periods.length === 0) {
    throw new HttpsError(
      "invalid-argument",
      `${context}: un día abierto debe tener al menos un tramo horario.`
    );
  }

  const normalizedPeriods = periods.map(
    (period, index) =>
      validateTimePeriod(
        period,
        `${context}, tramo ${index + 1}`
      )
  );

  // Ordenar cronológicamente.

  normalizedPeriods.sort(
    (a, b) =>
      scheduleTimeToMinutes(a.start) -
      scheduleTimeToMinutes(b.start)
  );

  // Comprobar solapamientos.

  for (
    let index = 1;
    index < normalizedPeriods.length;
    index++
  ) {
    const previous = normalizedPeriods[index - 1];
    const current = normalizedPeriods[index];

    if (
      scheduleTimeToMinutes(current.start) <
      scheduleTimeToMinutes(previous.end)
    ) {
      throw new HttpsError(
        "invalid-argument",
        `${context}: existen tramos horarios solapados.`
      );
    }
  }

  return {
    closed,
    periods: normalizedPeriods,
  };
}

// ==================================================
// VALIDAR HORARIO SEMANAL
// ==================================================

export function validateWeeklySchedule(
  value: unknown
): WeeklySchedule {
  if (!isRecord(value)) {
    throw new HttpsError(
      "invalid-argument",
      "El horario semanal no es válido."
    );
  }

  validateExactKeys(
    value,
    SCHEDULE_WEEK_DAYS,
    "Horario semanal"
  );

  const result = createEmptyWeeklySchedule();

  for (const day of SCHEDULE_WEEK_DAYS) {
    result[day] = validateScheduleDay(
      value[day],
      WEEK_DAY_LABELS[day]
    );
  }

  return result;
}

// ==================================================
// HORARIO SEMANAL VACÍO
// ==================================================

export function createEmptyWeeklySchedule(): WeeklySchedule {
  return {
    monday: { closed: true, periods: [] },
    tuesday: { closed: true, periods: [] },
    wednesday: { closed: true, periods: [] },
    thursday: { closed: true, periods: [] },
    friday: { closed: true, periods: [] },
    saturday: { closed: true, periods: [] },
    sunday: { closed: true, periods: [] },
  };
}
