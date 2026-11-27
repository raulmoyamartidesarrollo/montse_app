import { httpsCallable } from 'firebase/functions';

import { functions } from '../lib/firebase';

import {
  MAX_SPECIAL_SCHEDULE_REASON_LENGTH,
  MAX_SPECIAL_SCHEDULE_PAGE_SIZE,
  DEFAULT_SPECIAL_SCHEDULE_PAGE_SIZE,
  type CenterSpecialSchedule,
  type GetCenterSpecialSchedulesInput,
  type GetCenterSpecialSchedulesResponse,
  type CreateCenterSpecialScheduleInput,
  type CreateCenterSpecialScheduleResponse,
  type UpdateCenterSpecialScheduleInput,
  type UpdateCenterSpecialScheduleResponse,
  type DeleteCenterSpecialScheduleInput,
  type DeleteCenterSpecialScheduleResponse,
} from '../types/centerSpecialSchedules';

import {
  validateDailySchedule,
} from '../utils/centerScheduleValidation';

import {
  isValidDateISO,
} from '../utils/centerScheduleDates';

// ==================================================
// CLOUD FUNCTIONS
// ==================================================

const getCenterSpecialSchedulesCallable = httpsCallable<
  GetCenterSpecialSchedulesInput,
  GetCenterSpecialSchedulesResponse
>(
  functions,
  'getCenterSpecialSchedules'
);

const createCenterSpecialScheduleCallable = httpsCallable<
  CreateCenterSpecialScheduleInput,
  CreateCenterSpecialScheduleResponse
>(
  functions,
  'createCenterSpecialSchedule'
);

const updateCenterSpecialScheduleCallable = httpsCallable<
  UpdateCenterSpecialScheduleInput,
  UpdateCenterSpecialScheduleResponse
>(
  functions,
  'updateCenterSpecialSchedule'
);

const deleteCenterSpecialScheduleCallable = httpsCallable<
  DeleteCenterSpecialScheduleInput,
  DeleteCenterSpecialScheduleResponse
>(
  functions,
  'deleteCenterSpecialSchedule'
);

// ==================================================
// VALIDAR OBJETOS
// ==================================================

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

// ==================================================
// VALIDAR TIMESTAMPS DE AUDITORÍA
// ==================================================

function isValidAuditTimestamp(
  value: unknown
): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const date = new Date(value);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString() === value
  );
}

// ==================================================
// VALIDAR HORARIO ESPECIAL RECIBIDO
// ==================================================

function isValidSpecialSchedule(
  value: unknown
): value is CenterSpecialSchedule {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !isValidDateISO(value.dateISO) ||
    typeof value.closed !== 'boolean' ||
    !Array.isArray(value.periods) ||
    typeof value.reason !== 'string' ||
    value.reason.length >
      MAX_SPECIAL_SCHEDULE_REASON_LENGTH ||
    typeof value.createdBy !== 'string' ||
    value.createdBy.trim().length === 0 ||
    typeof value.updatedBy !== 'string' ||
    value.updatedBy.trim().length === 0 ||
    !isValidAuditTimestamp(value.createdAt) ||
    !isValidAuditTimestamp(value.updatedAt)
  ) {
    return false;
  }

  const periods: {
    start: string;
    end: string;
  }[] = [];

  for (const period of value.periods) {
    if (
      !isRecord(period) ||
      typeof period.start !== 'string' ||
      typeof period.end !== 'string'
    ) {
      return false;
    }

    periods.push({
      start: period.start,
      end: period.end,
    });
  }

  const validation = validateDailySchedule({
    closed: value.closed,
    periods,
  });

  return validation.isValid;
}

// ==================================================
// RECUPERAR HORARIOS ESPECIALES
// ==================================================

export async function getCenterSpecialSchedules(
  input: GetCenterSpecialSchedulesInput = {}
): Promise<GetCenterSpecialSchedulesResponse> {
  // No enviar propiedades undefined a Firebase.

  const filters: GetCenterSpecialSchedulesInput = {};

  if (input.fromDateISO !== undefined) {
    filters.fromDateISO = input.fromDateISO;
  }

  if (input.toDateISO !== undefined) {
    filters.toDateISO = input.toDateISO;
  }

  if (input.cursorDateISO !== undefined) {
    filters.cursorDateISO = input.cursorDateISO;
  }

  if (input.limit !== undefined) {
    filters.limit = input.limit;
  }

  const response =
    await getCenterSpecialSchedulesCallable(
      filters
    );

  const data = response.data;

  const expectedLimit =
    filters.limit ??
    DEFAULT_SPECIAL_SCHEDULE_PAGE_SIZE;

  // --------------------------------------------------
  // VALIDAR ESTRUCTURA DE LA RESPUESTA
  // --------------------------------------------------

  if (
    !data ||
    data.success !== true ||
    !Array.isArray(data.specialSchedules) ||
    typeof data.hasMore !== 'boolean' ||
    data.specialSchedules.length >
      MAX_SPECIAL_SCHEDULE_PAGE_SIZE ||
    data.specialSchedules.length >
      expectedLimit ||
    (
      data.nextCursorDateISO !== null &&
      !isValidDateISO(data.nextCursorDateISO)
    )
  ) {
    throw new Error(
      'No se han podido recuperar los horarios especiales.'
    );
  }

  // --------------------------------------------------
  // VALIDAR HORARIOS RECIBIDOS
  // --------------------------------------------------

  let previousDateISO =
    filters.cursorDateISO ?? null;

  for (const schedule of data.specialSchedules) {
    if (!isValidSpecialSchedule(schedule)) {
      throw new Error(
        'Se ha recibido un horario especial no válido.'
      );
    }

    // Comprobar orden cronológico y duplicados.

    if (
      previousDateISO !== null &&
      schedule.dateISO <= previousDateISO
    ) {
      throw new Error(
        'El orden de los horarios especiales no es válido.'
      );
    }

    // Comprobar que pertenece al rango solicitado.

    if (
      (
        filters.fromDateISO !== undefined &&
        schedule.dateISO < filters.fromDateISO
      ) ||
      (
        filters.toDateISO !== undefined &&
        schedule.dateISO > filters.toDateISO
      )
    ) {
      throw new Error(
        'Se ha recibido un horario fuera del rango solicitado.'
      );
    }

    previousDateISO = schedule.dateISO;
  }

  // --------------------------------------------------
  // VALIDAR PAGINACIÓN
  // --------------------------------------------------

  if (data.hasMore) {
    const lastSchedule =
      data.specialSchedules[
        data.specialSchedules.length - 1
      ];

    if (
      !lastSchedule ||
      data.specialSchedules.length !== expectedLimit ||
      data.nextCursorDateISO !== lastSchedule.dateISO
    ) {
      throw new Error(
        'La paginación de horarios especiales no es válida.'
      );
    }
  } else if (data.nextCursorDateISO !== null) {
    throw new Error(
      'El cursor de horarios especiales no es válido.'
    );
  }

  return data;
}

// ==================================================
// CREAR HORARIO ESPECIAL
// ==================================================

export async function createCenterSpecialSchedule(
  input: CreateCenterSpecialScheduleInput
): Promise<string> {
  const response =
    await createCenterSpecialScheduleCallable(
      input
    );

  const data = response.data;

  if (
    !data ||
    data.success !== true ||
    !isValidDateISO(data.dateISO) ||
    data.dateISO !== input.dateISO
  ) {
    throw new Error(
      'No se ha podido crear el horario especial.'
    );
  }

  return data.dateISO;
}

// ==================================================
// ACTUALIZAR HORARIO ESPECIAL
// ==================================================

export async function updateCenterSpecialSchedule(
  input: UpdateCenterSpecialScheduleInput
): Promise<void> {
  const response =
    await updateCenterSpecialScheduleCallable(
      input
    );

  const data = response.data;

  if (
    !data ||
    data.success !== true ||
    !isValidDateISO(data.dateISO) ||
    data.dateISO !== input.dateISO
  ) {
    throw new Error(
      'No se ha podido actualizar el horario especial.'
    );
  }
}

// ==================================================
// ELIMINAR HORARIO ESPECIAL
// ==================================================

export async function deleteCenterSpecialSchedule(
  input: DeleteCenterSpecialScheduleInput
): Promise<void> {
  const response =
    await deleteCenterSpecialScheduleCallable(
      input
    );

  const data = response.data;

  if (
    !data ||
    data.success !== true ||
    !isValidDateISO(data.dateISO) ||
    data.dateISO !== input.dateISO
  ) {
    throw new Error(
      'No se ha podido eliminar el horario especial.'
    );
  }
}
