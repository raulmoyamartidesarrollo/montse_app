import type {
  DailySchedule,
} from './centerSchedules';

// ==================================================
// CONSTANTES
// ==================================================

export const MAX_SPECIAL_SCHEDULE_REASON_LENGTH = 200;

export const DEFAULT_SPECIAL_SCHEDULE_PAGE_SIZE = 50;

export const MAX_SPECIAL_SCHEDULE_PAGE_SIZE = 100;

// ==================================================
// HORARIO ESPECIAL
// ==================================================

export interface CenterSpecialSchedule
  extends DailySchedule {
  dateISO: string;
  reason: string;

  createdAt: string | null;
  createdBy: string;

  updatedAt: string | null;
  updatedBy: string;
}

// ==================================================
// CREAR HORARIO ESPECIAL
// ==================================================

export interface CreateCenterSpecialScheduleInput
  extends DailySchedule {
  dateISO: string;
  reason: string;
}

// ==================================================
// ACTUALIZAR HORARIO ESPECIAL
// ==================================================

export interface UpdateCenterSpecialScheduleInput
  extends DailySchedule {
  dateISO: string;
  reason: string;
}

// ==================================================
// ELIMINAR HORARIO ESPECIAL
// ==================================================

export interface DeleteCenterSpecialScheduleInput {
  dateISO: string;
}

// ==================================================
// CONSULTAR HORARIOS ESPECIALES
// ==================================================

export interface GetCenterSpecialSchedulesInput {
  fromDateISO?: string;
  toDateISO?: string;
  cursorDateISO?: string;
  limit?: number;
}

// ==================================================
// RESPUESTA: CONSULTAR HORARIOS ESPECIALES
// ==================================================

export interface GetCenterSpecialSchedulesResponse {
  success: boolean;
  specialSchedules: CenterSpecialSchedule[];
  hasMore: boolean;
  nextCursorDateISO: string | null;
}

// ==================================================
// RESPUESTA: CREAR HORARIO ESPECIAL
// ==================================================

export interface CreateCenterSpecialScheduleResponse {
  success: boolean;
  dateISO: string;
}

// ==================================================
// RESPUESTA: ACTUALIZAR HORARIO ESPECIAL
// ==================================================

export interface UpdateCenterSpecialScheduleResponse {
  success: boolean;
  dateISO: string;
}

// ==================================================
// RESPUESTA: ELIMINAR HORARIO ESPECIAL
// ==================================================

export interface DeleteCenterSpecialScheduleResponse {
  success: boolean;
  dateISO: string;
}

// ==================================================
// VALORES INICIALES DEL FORMULARIO
// ==================================================

export function createEmptySpecialSchedule(
  dateISO: string
): CreateCenterSpecialScheduleInput {
  return {
    dateISO,
    closed: false,
    periods: [
      {
        start: '09:00',
        end: '14:00',
      },
    ],
    reason: '',
  };
}
