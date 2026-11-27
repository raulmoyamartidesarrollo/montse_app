import { httpsCallable } from 'firebase/functions';

import { functions } from '../lib/firebase';

import {
  MAX_VACATION_REASON_LENGTH,
  MAX_VACATION_PAGE_SIZE,
  DEFAULT_VACATION_PAGE_SIZE,
  type CenterVacation,
  type CenterVacationCursor,
  type GetCenterVacationsInput,
  type GetCenterVacationsResponse,
  type CreateCenterVacationInput,
  type CreateCenterVacationResponse,
  type UpdateCenterVacationInput,
  type UpdateCenterVacationResponse,
  type DeleteCenterVacationInput,
  type DeleteCenterVacationResponse,
} from '../types/centerVacations';

import {
  isValidDateISO,
} from '../utils/centerScheduleDates';

import {
  isValidVacationRange,
} from '../utils/centerVacationDates';

// ==================================================
// CLOUD FUNCTIONS
// ==================================================

const getCenterVacationsCallable = httpsCallable<
  GetCenterVacationsInput,
  GetCenterVacationsResponse
>(
  functions,
  'getCenterVacations'
);

const createCenterVacationCallable = httpsCallable<
  CreateCenterVacationInput,
  CreateCenterVacationResponse
>(
  functions,
  'createCenterVacation'
);

const updateCenterVacationCallable = httpsCallable<
  UpdateCenterVacationInput,
  UpdateCenterVacationResponse
>(
  functions,
  'updateCenterVacation'
);

const deleteCenterVacationCallable = httpsCallable<
  DeleteCenterVacationInput,
  DeleteCenterVacationResponse
>(
  functions,
  'deleteCenterVacation'
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
// VALIDAR IDENTIFICADORES
// ==================================================

function isValidVacationId(
  value: unknown
): value is string {
  return (
    typeof value === 'string' &&
    value.length === 20 &&
    !/[^a-zA-Z0-9]/.test(value)
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
// VALIDAR CURSOR
// ==================================================

function isValidVacationCursor(
  value: unknown
): value is CenterVacationCursor {
  return (
    isRecord(value) &&
    isValidDateISO(value.startDateISO) &&
    isValidVacationId(value.vacationId)
  );
}

// ==================================================
// VALIDAR VACACIONES RECIBIDAS
// ==================================================

function isValidCenterVacation(
  value: unknown
): value is CenterVacation {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isValidVacationId(value.id) &&
    isValidVacationRange(value) &&
    typeof value.reason === 'string' &&
    value.reason.length <=
      MAX_VACATION_REASON_LENGTH &&
    typeof value.createdBy === 'string' &&
    value.createdBy.trim().length > 0 &&
    typeof value.updatedBy === 'string' &&
    value.updatedBy.trim().length > 0 &&
    isValidAuditTimestamp(value.createdAt) &&
    isValidAuditTimestamp(value.updatedAt)
  );
}

// ==================================================
// RECUPERAR VACACIONES
// ==================================================

export async function getCenterVacations(
  input: GetCenterVacationsInput = {}
): Promise<GetCenterVacationsResponse> {

  // No enviar propiedades undefined a Firebase.

  const filters: GetCenterVacationsInput = {};

  if (input.fromDateISO !== undefined) {
    filters.fromDateISO = input.fromDateISO;
  }

  if (input.toDateISO !== undefined) {
    filters.toDateISO = input.toDateISO;
  }

  if (input.endBeforeDateISO !== undefined) {
    filters.endBeforeDateISO =
      input.endBeforeDateISO;
  }

  if (input.cursorStartDateISO !== undefined) {
    filters.cursorStartDateISO =
      input.cursorStartDateISO;
  }

  if (input.cursorVacationId !== undefined) {
    filters.cursorVacationId =
      input.cursorVacationId;
  }

  if (input.limit !== undefined) {
    filters.limit = input.limit;
  }

  const response =
    await getCenterVacationsCallable(filters);

  const data = response.data;

  const expectedLimit =
    filters.limit ??
    DEFAULT_VACATION_PAGE_SIZE;

  // ------------------------------------------------
  // VALIDAR ESTRUCTURA DE LA RESPUESTA
  // ------------------------------------------------

  if (
    !data ||
    data.success !== true ||
    !Array.isArray(data.vacations) ||
    typeof data.hasMore !== 'boolean' ||
    data.vacations.length >
      MAX_VACATION_PAGE_SIZE ||
    data.vacations.length > expectedLimit ||
    (
      data.nextCursor !== null &&
      !isValidVacationCursor(data.nextCursor)
    )
  ) {
    throw new Error(
      'No se han podido recuperar las vacaciones del centro.'
    );
  }

  // ------------------------------------------------
  // VALIDAR PERIODOS RECIBIDOS
  // ------------------------------------------------

  let previousStartDateISO =
    filters.cursorStartDateISO ?? null;

  let previousEndDateISO: string | null = null;

  const receivedIds = new Set<string>();

  if (filters.cursorVacationId !== undefined) {
    receivedIds.add(filters.cursorVacationId);
  }

  for (const vacation of data.vacations) {
    if (!isValidCenterVacation(vacation)) {
      throw new Error(
        'Se ha recibido un periodo de vacaciones no válido.'
      );
    }

    // No permitir identificadores duplicados.

    if (receivedIds.has(vacation.id)) {
      throw new Error(
        'Se han recibido vacaciones duplicadas.'
      );
    }

    receivedIds.add(vacation.id);

    // Los periodos deben estar ordenados.
    // No pueden existir dos periodos con el mismo inicio,
    // porque se produciría un solapamiento.

    if (
      previousStartDateISO !== null &&
      vacation.startDateISO <= previousStartDateISO
    ) {
      throw new Error(
        'El orden de las vacaciones no es válido.'
      );
    }

    // Comprobar solapamientos dentro de la página.

    if (
      previousEndDateISO !== null &&
      vacation.startDateISO <= previousEndDateISO
    ) {
      throw new Error(
        'Se han recibido periodos de vacaciones solapados.'
      );
    }

    // ------------------------------------------------
    // VALIDAR FILTROS DE FECHAS
    // ------------------------------------------------

    if (
      filters.fromDateISO !== undefined &&
      vacation.endDateISO < filters.fromDateISO
    ) {
      throw new Error(
        'Se han recibido vacaciones fuera del rango solicitado.'
      );
    }

    if (
      filters.toDateISO !== undefined &&
      vacation.startDateISO > filters.toDateISO
    ) {
      throw new Error(
        'Se han recibido vacaciones fuera del rango solicitado.'
      );
    }

    if (
      filters.endBeforeDateISO !== undefined &&
      vacation.endDateISO >= filters.endBeforeDateISO
    ) {
      throw new Error(
        'Se han recibido vacaciones fuera del histórico solicitado.'
      );
    }

    previousStartDateISO =
      vacation.startDateISO;

    previousEndDateISO =
      vacation.endDateISO;
  }

  // ------------------------------------------------
  // VALIDAR PAGINACIÓN
  // ------------------------------------------------

  if (data.hasMore) {
    const lastVacation =
      data.vacations[
        data.vacations.length - 1
      ];

    if (
      !lastVacation ||
      data.vacations.length !== expectedLimit ||
      !data.nextCursor ||
      data.nextCursor.startDateISO !==
        lastVacation.startDateISO ||
      data.nextCursor.vacationId !==
        lastVacation.id
    ) {
      throw new Error(
        'La paginación de vacaciones no es válida.'
      );
    }
  } else if (data.nextCursor !== null) {
    throw new Error(
      'El cursor de vacaciones no es válido.'
    );
  }

  return data;
}

// ==================================================
// CREAR VACACIONES
// ==================================================

export async function createCenterVacation(
  input: CreateCenterVacationInput
): Promise<string> {

  const response =
    await createCenterVacationCallable(input);

  const data = response.data;

  if (
    !data ||
    data.success !== true ||
    !isValidVacationId(data.vacationId)
  ) {
    throw new Error(
      'No se han podido crear las vacaciones.'
    );
  }

  return data.vacationId;
}

// ==================================================
// ACTUALIZAR VACACIONES
// ==================================================

export async function updateCenterVacation(
  input: UpdateCenterVacationInput
): Promise<void> {

  const response =
    await updateCenterVacationCallable(input);

  const data = response.data;

  if (
    !data ||
    data.success !== true ||
    !isValidVacationId(data.vacationId) ||
    data.vacationId !== input.vacationId
  ) {
    throw new Error(
      'No se han podido actualizar las vacaciones.'
    );
  }
}

// ==================================================
// ELIMINAR VACACIONES
// ==================================================

export async function deleteCenterVacation(
  input: DeleteCenterVacationInput
): Promise<void> {

  const response =
    await deleteCenterVacationCallable(input);

  const data = response.data;

  if (
    !data ||
    data.success !== true ||
    !isValidVacationId(data.vacationId) ||
    data.vacationId !== input.vacationId
  ) {
    throw new Error(
      'No se han podido eliminar las vacaciones.'
    );
  }
}
