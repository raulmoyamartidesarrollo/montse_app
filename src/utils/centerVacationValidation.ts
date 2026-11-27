import {
  MAX_VACATION_REASON_LENGTH,
} from '../types/centerVacations';

import type {
  CenterVacation,
  CreateCenterVacationInput,
  VacationDateRange,
  VacationStatus,
} from '../types/centerVacations';

import {
  isValidDateISO,
  getCenterTodayISO,
} from './centerScheduleDates';

import {
  isValidVacationRange,
  doVacationRangesOverlap,
  getVacationStatus,
} from './centerVacationDates';

// ==================================================
// TIPOS DE VALIDACIÓN
// ==================================================

export interface VacationValidationErrors {
  startDateISO?: string;
  endDateISO?: string;
  reason?: string;
  overlap?: string;
}

export interface VacationValidationResult {
  isValid: boolean;
  errors: VacationValidationErrors;
  conflictingVacationIds: string[];
}

// ==================================================
// CLONAR BORRADOR
// ==================================================

export function cloneVacationDraft(
  draft: CreateCenterVacationInput
): CreateCenterVacationInput {
  return {
    startDateISO: draft.startDateISO,
    endDateISO: draft.endDateISO,
    reason: draft.reason,
  };
}

// ==================================================
// NORMALIZAR BORRADOR
// ==================================================

export function normalizeVacationDraft(
  draft: CreateCenterVacationInput
): CreateCenterVacationInput {
  return {
    startDateISO: draft.startDateISO,
    endDateISO: draft.endDateISO,
    reason: draft.reason.trim(),
  };
}

// ==================================================
// DETECTAR CAMBIOS SIN GUARDAR
// ==================================================

export function hasVacationDraftChanges(
  original: CreateCenterVacationInput,
  draft: CreateCenterVacationInput
): boolean {
  return (
    original.startDateISO !== draft.startDateISO ||
    original.endDateISO !== draft.endDateISO ||
    original.reason !== draft.reason
  );
}

// ==================================================
// BUSCAR PERIODOS SOLAPADOS
// ==================================================

export function findOverlappingVacations(
  range: VacationDateRange,
  vacations: readonly CenterVacation[],
  excludedVacationId?: string
): CenterVacation[] {
  if (!isValidVacationRange(range)) {
    throw new Error(
      'El periodo de vacaciones no es válido.'
    );
  }

  return vacations.filter((vacation) => {
    if (
      excludedVacationId !== undefined &&
      vacation.id === excludedVacationId
    ) {
      return false;
    }

    return doVacationRangesOverlap(
      range,
      vacation
    );
  });
}

// ==================================================
// VALIDAR FORMULARIO DE VACACIONES
// ==================================================

export function validateVacationDraft(
  draft: CreateCenterVacationInput,
  existingVacations: readonly CenterVacation[] = [],
  excludedVacationId?: string
): VacationValidationResult {
  const errors: VacationValidationErrors = {};

  let conflictingVacationIds: string[] = [];

  // ------------------------------------------------
  // VALIDAR FECHA INICIAL
  // ------------------------------------------------

  if (!isValidDateISO(draft.startDateISO)) {
    errors.startDateISO =
      'Selecciona una fecha de inicio válida.';
  }

  // ------------------------------------------------
  // VALIDAR FECHA FINAL
  // ------------------------------------------------

  if (!isValidDateISO(draft.endDateISO)) {
    errors.endDateISO =
      'Selecciona una fecha de finalización válida.';
  }

  // ------------------------------------------------
  // VALIDAR ORDEN DE FECHAS
  // ------------------------------------------------

  if (
    !errors.startDateISO &&
    !errors.endDateISO &&
    draft.startDateISO > draft.endDateISO
  ) {
    errors.endDateISO =
      'La fecha final no puede ser anterior a la inicial.';
  }

  // ------------------------------------------------
  // VALIDAR MOTIVO
  // ------------------------------------------------

  if (typeof draft.reason !== 'string') {
    errors.reason =
      'El motivo de las vacaciones no es válido.';
  } else if (
    draft.reason.length >
    MAX_VACATION_REASON_LENGTH
  ) {
    errors.reason =
      'El motivo no puede superar los ' +
      MAX_VACATION_REASON_LENGTH +
      ' caracteres.';
  }

  // ------------------------------------------------
  // VALIDAR SOLAPAMIENTOS
  // ------------------------------------------------

  if (
    !errors.startDateISO &&
    !errors.endDateISO
  ) {
    const conflictingVacations =
      findOverlappingVacations(
        draft,
        existingVacations,
        excludedVacationId
      );

    conflictingVacationIds =
      conflictingVacations.map(
        (vacation) => vacation.id
      );

    if (conflictingVacationIds.length > 0) {
      errors.overlap =
        'El periodo seleccionado coincide con otras vacaciones del centro.';
    }
  }

  // ------------------------------------------------
  // RESULTADO
  // ------------------------------------------------

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    conflictingVacationIds,
  };
}

// ==================================================
// PERMISOS TEMPORALES DE EDICIÓN
// ==================================================

export interface VacationEditingPermissions {
  status: VacationStatus | 'new';
  canEditStartDate: boolean;
  canEditEndDate: boolean;
  canEditReason: boolean;
  canSave: boolean;
  canDelete: boolean;
}

export function getVacationEditingPermissions(
  original: VacationDateRange | undefined,
  todayISO: string = getCenterTodayISO()
): VacationEditingPermissions {
  if (!isValidDateISO(todayISO)) {
    throw new Error(
      'La fecha actual del centro no es válida.'
    );
  }

  if (original === undefined) {
    return {
      status: 'new',
      canEditStartDate: true,
      canEditEndDate: true,
      canEditReason: true,
      canSave: true,
      canDelete: false,
    };
  }

  const status = getVacationStatus(
    original,
    todayISO
  );

  const isUpcoming = status === 'upcoming';
  const isEditable = status !== 'past';

  return {
    status,
    canEditStartDate: isUpcoming,
    canEditEndDate: isEditable,
    canEditReason: isEditable,
    canSave: isEditable,
    canDelete: isUpcoming,
  };
}

// ==================================================
// VALIDACIÓN DE RESTRICCIONES TEMPORALES
// ==================================================

export interface VacationTemporalValidationResult {
  isValid: boolean;
  message: string | null;
}

export function validateVacationTemporalRules(
  draft: VacationDateRange,
  original: VacationDateRange | undefined,
  todayISO: string = getCenterTodayISO()
): VacationTemporalValidationResult {
  if (!isValidDateISO(todayISO)) {
    return {
      isValid: false,
      message: 'La fecha actual del centro no es válida.',
    };
  }

  if (!isValidVacationRange(draft)) {
    return {
      isValid: false,
      message: 'Selecciona un periodo de vacaciones válido.',
    };
  }

  if (
    original !== undefined &&
    !isValidVacationRange(original)
  ) {
    return {
      isValid: false,
      message: 'El periodo original de vacaciones no es válido.',
    };
  }

  const permissions =
    getVacationEditingPermissions(
      original,
      todayISO
    );

  // Las vacaciones finalizadas son de solo lectura.

  if (!permissions.canSave) {
    return {
      isValid: false,
      message: 'No se pueden modificar vacaciones finalizadas.',
    };
  }

  // Las vacaciones en curso conservan su fecha inicial.

  if (
    permissions.status === 'current' &&
    original !== undefined
  ) {
    if (
      draft.startDateISO !==
      original.startDateISO
    ) {
      return {
        isValid: false,
        message: 'No se puede modificar la fecha inicial de unas vacaciones en curso.',
      };
    }

    if (draft.endDateISO < todayISO) {
      return {
        isValid: false,
        message: 'La fecha de finalización no puede ser anterior a hoy.',
      };
    }

    return {
      isValid: true,
      message: null,
    };
  }

  // Las vacaciones nuevas y futuras no pueden
  // comenzar en una fecha anterior a hoy.

  if (draft.startDateISO < todayISO) {
    return {
      isValid: false,
      message: 'La fecha de inicio no puede ser anterior a hoy.',
    };
  }

  return {
    isValid: true,
    message: null,
  };
}
