import { HttpsError } from "firebase-functions/v2/https";

import {
  validateScheduleDay,
  type ScheduleDay,
} from "./weeklySchedule";

// ==================================================
// CONSTANTES
// ==================================================

export const MAX_SPECIAL_SCHEDULE_REASON_LENGTH = 200;

export const DEFAULT_SPECIAL_SCHEDULE_PAGE_SIZE = 50;

export const MAX_SPECIAL_SCHEDULE_PAGE_SIZE = 100;

// ==================================================
// TIPOS
// ==================================================

export interface SpecialScheduleInput
  extends ScheduleDay {
  dateISO: string;
  reason: string;
}

export interface SpecialScheduleDateInput {
  dateISO: string;
}

export interface SpecialScheduleQueryInput {
  fromDateISO?: string;
  toDateISO?: string;
  cursorDateISO?: string;
  limit: number;
}

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

// ==================================================
// VALIDAR CAMPOS PERMITIDOS
// ==================================================

function validateKeys(
  value: Record<string, unknown>,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[],
  context: string
): void {
  const allowedKeys = [
    ...requiredKeys,
    ...optionalKeys,
  ];

  const keys = Object.keys(value);

  const hasRequiredKeys =
    requiredKeys.every((key) =>
      Object.prototype.hasOwnProperty.call(
        value,
        key
      )
    );

  const hasOnlyAllowedKeys =
    keys.every((key) =>
      allowedKeys.includes(key)
    );

  if (
    !hasRequiredKeys ||
    !hasOnlyAllowedKeys
  ) {
    throw new HttpsError(
      "invalid-argument",
      `${context}: los campos no son válidos.`
    );
  }
}

// ==================================================
// VALIDAR FECHA ISO REAL
// ==================================================

export function isValidSpecialScheduleDate(
  value: unknown
): value is string {
  if (
    typeof value !== "string" ||
    value.length !== 10 ||
    !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)
  ) {
    return false;
  }

  const [year, month, day] =
    value.split("-").map(Number);

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

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

// ==================================================
// VALIDAR Y DEVOLVER FECHA
// ==================================================

export function validateSpecialScheduleDate(
  value: unknown,
  context = "Fecha"
): string {
  if (!isValidSpecialScheduleDate(value)) {
    throw new HttpsError(
      "invalid-argument",
      `${context}: introduce una fecha válida en formato YYYY-MM-DD.`
    );
  }

  return value;
}

// ==================================================
// VALIDAR MOTIVO
// ==================================================

export function validateSpecialScheduleReason(
  value: unknown
): string {
  if (typeof value !== "string") {
    throw new HttpsError(
      "invalid-argument",
      "El motivo del horario especial no es válido."
    );
  }

  const reason = value.trim();

  if (
    reason.length >
    MAX_SPECIAL_SCHEDULE_REASON_LENGTH
  ) {
    throw new HttpsError(
      "invalid-argument",
      `El motivo no puede superar los ${MAX_SPECIAL_SCHEDULE_REASON_LENGTH} caracteres.`
    );
  }

  return reason;
}

// ==================================================
// VALIDAR CREACIÓN Y ACTUALIZACIÓN
// ==================================================

export function validateSpecialScheduleInput(
  value: unknown
): SpecialScheduleInput {
  if (!isRecord(value)) {
    throw new HttpsError(
      "invalid-argument",
      "El horario especial no es válido."
    );
  }

  validateKeys(
    value,
    [
      "dateISO",
      "closed",
      "periods",
      "reason",
    ],
    [],
    "Horario especial"
  );

  const dateISO =
    validateSpecialScheduleDate(
      value.dateISO
    );

  const reason =
    validateSpecialScheduleReason(
      value.reason
    );

  const schedule = validateScheduleDay(
    {
      closed: value.closed,
      periods: value.periods,
    },
    `Horario especial del ${dateISO}`
  );

  return {
    dateISO,
    closed: schedule.closed,
    periods: schedule.periods,
    reason,
  };
}

// ==================================================
// VALIDAR PETICIÓN DE ELIMINACIÓN
// ==================================================

export function validateSpecialScheduleDateInput(
  value: unknown
): SpecialScheduleDateInput {
  if (!isRecord(value)) {
    throw new HttpsError(
      "invalid-argument",
      "La petición no es válida."
    );
  }

  validateKeys(
    value,
    ["dateISO"],
    [],
    "Horario especial"
  );

  return {
    dateISO:
      validateSpecialScheduleDate(
        value.dateISO
      ),
  };
}

// ==================================================
// VALIDAR PETICIÓN DE CONSULTA
// ==================================================

export function validateSpecialScheduleQuery(
  value: unknown
): SpecialScheduleQueryInput {
  if (!isRecord(value)) {
    throw new HttpsError(
      "invalid-argument",
      "La consulta de horarios especiales no es válida."
    );
  }

  validateKeys(
    value,
    [],
    [
      "fromDateISO",
      "toDateISO",
      "cursorDateISO",
      "limit",
    ],
    "Consulta de horarios especiales"
  );

  const result: SpecialScheduleQueryInput = {
    limit: DEFAULT_SPECIAL_SCHEDULE_PAGE_SIZE,
  };

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      "fromDateISO"
    )
  ) {
    result.fromDateISO =
      validateSpecialScheduleDate(
        value.fromDateISO,
        "Fecha inicial"
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      "toDateISO"
    )
  ) {
    result.toDateISO =
      validateSpecialScheduleDate(
        value.toDateISO,
        "Fecha final"
      );
  }

  if (
    result.fromDateISO !== undefined &&
    result.toDateISO !== undefined &&
    result.fromDateISO > result.toDateISO
  ) {
    throw new HttpsError(
      "invalid-argument",
      "La fecha inicial no puede ser posterior a la fecha final."
    );
  }

  // Validar cursor de paginación.

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      "cursorDateISO"
    )
  ) {
    result.cursorDateISO =
      validateSpecialScheduleDate(
        value.cursorDateISO,
        "Cursor de paginación"
      );
  }

  // Validar número máximo de resultados.

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      "limit"
    )
  ) {
    const limit = value.limit;

    if (
      typeof limit !== "number" ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > MAX_SPECIAL_SCHEDULE_PAGE_SIZE
    ) {
      throw new HttpsError(
        "invalid-argument",
        `El límite debe estar entre 1 y ${MAX_SPECIAL_SCHEDULE_PAGE_SIZE}.`
      );
    }

    result.limit = limit;
  }

  // El cursor debe pertenecer al rango solicitado.

  if (result.cursorDateISO !== undefined) {
    if (
      result.fromDateISO !== undefined &&
      result.cursorDateISO < result.fromDateISO
    ) {
      throw new HttpsError(
        "invalid-argument",
        "El cursor es anterior a la fecha inicial."
      );
    }

    if (
      result.toDateISO !== undefined &&
      result.cursorDateISO > result.toDateISO
    ) {
      throw new HttpsError(
        "invalid-argument",
        "El cursor es posterior a la fecha final."
      );
    }
  }

  return result;
}
