import { HttpsError } from "firebase-functions/v2/https";

import {
  validateSpecialScheduleDate,
} from "./specialSchedule";

import {
  SCHEDULE_TIMEZONE,
} from "./weeklySchedule";

// ==================================================
// CONSTANTES
// ==================================================

export const MAX_VACATION_REASON_LENGTH = 200;

export const DEFAULT_VACATION_PAGE_SIZE = 50;

export const MAX_VACATION_PAGE_SIZE = 100;

// ==================================================
// TIPOS
// ==================================================

export interface VacationDateRange {
  startDateISO: string;
  endDateISO: string;
}

export interface VacationInput
  extends VacationDateRange {
  reason: string;
}

export interface VacationUpdateInput
  extends VacationInput {
  vacationId: string;
}

export interface VacationIdInput {
  vacationId: string;
}

export interface VacationQueryInput {
  fromDateISO?: string;
  toDateISO?: string;
  endBeforeDateISO?: string;

  cursorStartDateISO?: string;
  cursorVacationId?: string;

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

function hasOwn(
  value: Record<string, unknown>,
  key: string
): boolean {
  return Object.prototype.hasOwnProperty.call(
    value,
    key
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

  const hasRequiredKeys =
    requiredKeys.every(
      (key) => hasOwn(value, key)
    );

  const hasOnlyAllowedKeys =
    Object.keys(value).every(
      (key) => allowedKeys.includes(key)
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
// VALIDAR IDENTIFICADOR DE VACACIONES
// ==================================================

export function validateVacationId(
  value: unknown
): string {
  if (
    typeof value !== "string" ||
    value.length !== 20 ||
    /[^a-zA-Z0-9]/.test(value)
  ) {
    throw new HttpsError(
      "invalid-argument",
      "El identificador de vacaciones no es válido."
    );
  }

  return value;
}

// ==================================================
// VALIDAR MOTIVO
// ==================================================

export function validateVacationReason(
  value: unknown
): string {
  if (typeof value !== "string") {
    throw new HttpsError(
      "invalid-argument",
      "El motivo de las vacaciones no es válido."
    );
  }

  if (
    value.length >
    MAX_VACATION_REASON_LENGTH
  ) {
    throw new HttpsError(
      "invalid-argument",
      `El motivo no puede superar los ${MAX_VACATION_REASON_LENGTH} caracteres.`
    );
  }

  return value.trim();
}

// ==================================================
// VALIDAR RANGO DE FECHAS
// ==================================================

export function validateVacationRange(
  value: unknown
): VacationDateRange {
  if (!isRecord(value)) {
    throw new HttpsError(
      "invalid-argument",
      "El periodo de vacaciones no es válido."
    );
  }

  validateKeys(
    value,
    ["startDateISO", "endDateISO"],
    [],
    "Periodo de vacaciones"
  );

  const startDateISO =
    validateSpecialScheduleDate(
      value.startDateISO,
      "Fecha inicial"
    );

  const endDateISO =
    validateSpecialScheduleDate(
      value.endDateISO,
      "Fecha final"
    );

  if (startDateISO > endDateISO) {
    throw new HttpsError(
      "invalid-argument",
      "La fecha final no puede ser anterior a la inicial."
    );
  }

  return {
    startDateISO,
    endDateISO,
  };
}

// ==================================================
// VALIDAR CREACIÓN
// ==================================================

export function validateVacationInput(
  value: unknown
): VacationInput {
  if (!isRecord(value)) {
    throw new HttpsError(
      "invalid-argument",
      "Las vacaciones no son válidas."
    );
  }

  validateKeys(
    value,
    [
      "startDateISO",
      "endDateISO",
      "reason",
    ],
    [],
    "Vacaciones"
  );

  const range = validateVacationRange({
    startDateISO: value.startDateISO,
    endDateISO: value.endDateISO,
  });

  const reason =
    validateVacationReason(
      value.reason
    );

  return {
    ...range,
    reason,
  };
}

// ==================================================
// VALIDAR ACTUALIZACIÓN
// ==================================================

export function validateVacationUpdateInput(
  value: unknown
): VacationUpdateInput {
  if (!isRecord(value)) {
    throw new HttpsError(
      "invalid-argument",
      "La actualización de vacaciones no es válida."
    );
  }

  validateKeys(
    value,
    [
      "vacationId",
      "startDateISO",
      "endDateISO",
      "reason",
    ],
    [],
    "Actualizar vacaciones"
  );

  const vacationId =
    validateVacationId(
      value.vacationId
    );

  const vacation =
    validateVacationInput({
      startDateISO: value.startDateISO,
      endDateISO: value.endDateISO,
      reason: value.reason,
    });

  return {
    vacationId,
    ...vacation,
  };
}

// ==================================================
// VALIDAR ELIMINACIÓN
// ==================================================

export function validateVacationIdInput(
  value: unknown
): VacationIdInput {
  if (!isRecord(value)) {
    throw new HttpsError(
      "invalid-argument",
      "La petición no es válida."
    );
  }

  validateKeys(
    value,
    ["vacationId"],
    [],
    "Vacaciones"
  );

  return {
    vacationId:
      validateVacationId(
        value.vacationId
      ),
  };
}

// ==================================================
// VALIDAR CONSULTA Y PAGINACIÓN
// ==================================================

export function validateVacationQuery(
  value: unknown
): VacationQueryInput {
  if (!isRecord(value)) {
    throw new HttpsError(
      "invalid-argument",
      "La consulta de vacaciones no es válida."
    );
  }

  validateKeys(
    value,
    [],
    [
      "fromDateISO",
      "toDateISO",
      "endBeforeDateISO",
      "cursorStartDateISO",
      "cursorVacationId",
      "limit",
    ],
    "Consulta de vacaciones"
  );

  const result: VacationQueryInput = {
    limit: DEFAULT_VACATION_PAGE_SIZE,
  };

  // ------------------------------------------------
  // FECHA INICIAL
  // ------------------------------------------------

  if (hasOwn(value, "fromDateISO")) {
    result.fromDateISO =
      validateSpecialScheduleDate(
        value.fromDateISO,
        "Fecha inicial"
      );
  }

  // ------------------------------------------------
  // FECHA FINAL
  // ------------------------------------------------

  if (hasOwn(value, "toDateISO")) {
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
      "La fecha inicial no puede ser posterior a la final."
    );
  }

  // ------------------------------------------------
  // FILTRO DE VACACIONES FINALIZADAS
  // ------------------------------------------------

  if (hasOwn(value, "endBeforeDateISO")) {
    result.endBeforeDateISO =
      validateSpecialScheduleDate(
        value.endBeforeDateISO,
        "Fecha límite del histórico"
      );
  }

  // El histórico no se combina con los filtros
  // de periodos activos o de calendario.

  if (
    result.endBeforeDateISO !== undefined &&
    (
      result.fromDateISO !== undefined ||
      result.toDateISO !== undefined
    )
  ) {
    throw new HttpsError(
      "invalid-argument",
      "El filtro de histórico no puede combinarse con otros filtros de fechas."
    );
  }

  // ------------------------------------------------
  // CURSOR COMPUESTO
  // ------------------------------------------------

  const hasCursorDate =
    hasOwn(value, "cursorStartDateISO");

  const hasCursorId =
    hasOwn(value, "cursorVacationId");

  if (hasCursorDate !== hasCursorId) {
    throw new HttpsError(
      "invalid-argument",
      "El cursor de paginación está incompleto."
    );
  }

  if (hasCursorDate && hasCursorId) {
    result.cursorStartDateISO =
      validateSpecialScheduleDate(
        value.cursorStartDateISO,
        "Fecha del cursor"
      );

    result.cursorVacationId =
      validateVacationId(
        value.cursorVacationId
      );
  }

  // Un periodo puede comenzar antes de fromDateISO
  // y continuar dentro del intervalo consultado.
  //
  // Por tanto, no rechazamos cursores anteriores
  // a la fecha inicial de la consulta.

  if (
    result.cursorStartDateISO !== undefined &&
    result.toDateISO !== undefined &&
    result.cursorStartDateISO > result.toDateISO
  ) {
    throw new HttpsError(
      "invalid-argument",
      "El cursor es posterior a la fecha final."
    );
  }

  if (
    result.cursorStartDateISO !== undefined &&
    result.endBeforeDateISO !== undefined &&
    result.cursorStartDateISO >= result.endBeforeDateISO
  ) {
    throw new HttpsError(
      "invalid-argument",
      "El cursor no pertenece al histórico solicitado."
    );
  }

  // ------------------------------------------------
  // LÍMITE DE RESULTADOS
  // ------------------------------------------------

  if (hasOwn(value, "limit")) {
    const limit = value.limit;

    if (
      typeof limit !== "number" ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > MAX_VACATION_PAGE_SIZE
    ) {
      throw new HttpsError(
        "invalid-argument",
        `El límite debe estar entre 1 y ${MAX_VACATION_PAGE_SIZE}.`
      );
    }

    result.limit = limit;
  }

  return result;
}

// ==================================================
// DETECTAR SOLAPAMIENTOS INCLUSIVOS
// ==================================================

export function doVacationRangesOverlap(
  firstRange: VacationDateRange,
  secondRange: VacationDateRange
): boolean {
  const first = validateVacationRange({
    startDateISO: firstRange.startDateISO,
    endDateISO: firstRange.endDateISO,
  });

  const second = validateVacationRange({
    startDateISO: secondRange.startDateISO,
    endDateISO: secondRange.endDateISO,
  });

  return (
    first.startDateISO <= second.endDateISO &&
    first.endDateISO >= second.startDateISO
  );
}

// ==================================================
// OBTENER FECHA ACTUAL DEL CENTRO
// ==================================================

export function getVacationTodayISO(
  now: Date = new Date()
): string {
  const parts = new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: SCHEDULE_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(now);

  const year = parts.find(
    (part) => part.type === "year"
  )?.value.padStart(4, "0");

  const month = parts.find(
    (part) => part.type === "month"
  )?.value;

  const day = parts.find(
    (part) => part.type === "day"
  )?.value;

  return validateSpecialScheduleDate(
    `${year}-${month}-${day}`,
    "Fecha actual del centro"
  );
}

// ==================================================
// VALIDAR CREACIÓN SEGÚN FECHA ACTUAL
// ==================================================

export function assertVacationCreationAllowed(
  vacation: VacationDateRange,
  todayISO: string = getVacationTodayISO()
): void {
  if (vacation.startDateISO < todayISO) {
    throw new HttpsError(
      "failed-precondition",
      "No se pueden crear vacaciones con fechas anteriores a hoy."
    );
  }
}

// ==================================================
// VALIDAR EDICIÓN SEGÚN ESTADO TEMPORAL
// ==================================================

export function assertVacationUpdateAllowed(
  storedVacation: VacationDateRange,
  nextVacation: VacationDateRange,
  todayISO: string = getVacationTodayISO()
): void {
  // Las vacaciones finalizadas forman parte
  // del histórico y no se pueden modificar.

  if (storedVacation.endDateISO < todayISO) {
    throw new HttpsError(
      "failed-precondition",
      "No se pueden modificar vacaciones finalizadas."
    );
  }

  // Vacaciones que ya han comenzado.
  // Se conserva obligatoriamente la fecha inicial.

  if (storedVacation.startDateISO <= todayISO) {
    if (
      nextVacation.startDateISO !==
      storedVacation.startDateISO
    ) {
      throw new HttpsError(
        "failed-precondition",
        "No se puede modificar la fecha inicial de unas vacaciones en curso."
      );
    }

    if (nextVacation.endDateISO < todayISO) {
      throw new HttpsError(
        "failed-precondition",
        "La fecha de finalización no puede ser anterior a hoy."
      );
    }

    return;
  }

  // Vacaciones futuras: no permitir trasladarlas
  // a fechas anteriores a hoy.

  assertVacationCreationAllowed(
    nextVacation,
    todayISO
  );
}

// ==================================================
// VALIDAR ELIMINACIÓN SEGÚN ESTADO TEMPORAL
// ==================================================

export function assertVacationDeletionAllowed(
  vacation: VacationDateRange,
  todayISO: string = getVacationTodayISO()
): void {
  if (vacation.endDateISO < todayISO) {
    throw new HttpsError(
      "failed-precondition",
      "No se pueden eliminar vacaciones finalizadas."
    );
  }

  if (vacation.startDateISO <= todayISO) {
    throw new HttpsError(
      "failed-precondition",
      "No se pueden eliminar vacaciones en curso."
    );
  }
}
