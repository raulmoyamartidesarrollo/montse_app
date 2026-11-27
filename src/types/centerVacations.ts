// ==================================================
// VACACIONES DEL CENTRO
// ==================================================

export const MAX_VACATION_REASON_LENGTH = 200;

export const DEFAULT_VACATION_PAGE_SIZE = 50;

export const MAX_VACATION_PAGE_SIZE = 100;

// ==================================================
// MODELO DE VACACIONES
// ==================================================

export interface CenterVacation {
  id: string;

  startDateISO: string;
  endDateISO: string;

  reason: string;

  createdAt: string | null;
  createdBy: string;

  updatedAt: string | null;
  updatedBy: string;
}

// ==================================================
// RANGO DE FECHAS
// ==================================================

export interface VacationDateRange {
  startDateISO: string;
  endDateISO: string;
}

// ==================================================
// ESTADO TEMPORAL
// ==================================================

export type VacationStatus =
  | 'upcoming'
  | 'current'
  | 'past';

// ==================================================
// CREAR VACACIONES
// ==================================================

export interface CreateCenterVacationInput
  extends VacationDateRange {
  reason: string;
}

export interface CreateCenterVacationResponse {
  success: boolean;
  vacationId: string;
}

// ==================================================
// ACTUALIZAR VACACIONES
// ==================================================

export interface UpdateCenterVacationInput
  extends CreateCenterVacationInput {
  vacationId: string;
}

export interface UpdateCenterVacationResponse {
  success: boolean;
  vacationId: string;
}

// ==================================================
// ELIMINAR VACACIONES
// ==================================================

export interface DeleteCenterVacationInput {
  vacationId: string;
}

export interface DeleteCenterVacationResponse {
  success: boolean;
  vacationId: string;
}

// ==================================================
// CONSULTAR VACACIONES
// ==================================================

export interface GetCenterVacationsInput {
  fromDateISO?: string;
  toDateISO?: string;
  endBeforeDateISO?: string;

  cursorStartDateISO?: string;
  cursorVacationId?: string;

  limit?: number;
}

export interface CenterVacationCursor {
  startDateISO: string;
  vacationId: string;
}

export interface GetCenterVacationsResponse {
  success: boolean;

  vacations: CenterVacation[];

  hasMore: boolean;

  nextCursor: CenterVacationCursor | null;
}

// ==================================================
// CREAR BORRADOR DE VACACIONES
// ==================================================

export function createEmptyVacation(
  dateISO: string
): CreateCenterVacationInput {
  return {
    startDateISO: dateISO,
    endDateISO: dateISO,
    reason: '',
  };
}
