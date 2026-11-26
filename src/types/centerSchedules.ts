// ==================================================
// DÍAS DE LA SEMANA
// ==================================================

export const WEEK_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type WeekDay = typeof WEEK_DAYS[number];

export const WEEK_DAY_LABELS: Record<WeekDay, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

// ==================================================
// CONSTANTES DE CONFIGURACIÓN
// ==================================================

export const CENTER_SCHEDULE_TIMEZONE = 'Europe/Madrid';

export const MAX_DAILY_PERIODS = 5;

// ==================================================
// TRAMO HORARIO
// ==================================================

export interface TimePeriod {
  start: string;
  end: string;
}

// ==================================================
// HORARIO DIARIO
// ==================================================

export interface DailySchedule {
  closed: boolean;
  periods: TimePeriod[];
}

// ==================================================
// HORARIO SEMANAL
// ==================================================

export type WeeklySchedule = Record<
  WeekDay,
  DailySchedule
>;

// ==================================================
// CONFIGURACIÓN DE HORARIOS DEL CENTRO
// ==================================================

export interface CenterSchedule {
  timezone: string;
  weeklyConfigured: boolean;
  weekly: WeeklySchedule;
  updatedAt: string | null;
}

// ==================================================
// PETICIÓN DE ACTUALIZACIÓN
// ==================================================

export interface UpdateCenterWeeklyScheduleInput {
  weekly: WeeklySchedule;
}

// ==================================================
// RESPUESTAS DEL BACKEND
// ==================================================

export interface GetCenterScheduleResponse {
  success: boolean;
  schedule: CenterSchedule;
}

export interface UpdateCenterWeeklyScheduleResponse {
  success: boolean;
}

// ==================================================
// CREAR HORARIO SEMANAL VACÍO
// ==================================================

export function createEmptyWeeklySchedule(): WeeklySchedule {
  return {
    monday: {
      closed: true,
      periods: [],
    },
    tuesday: {
      closed: true,
      periods: [],
    },
    wednesday: {
      closed: true,
      periods: [],
    },
    thursday: {
      closed: true,
      periods: [],
    },
    friday: {
      closed: true,
      periods: [],
    },
    saturday: {
      closed: true,
      periods: [],
    },
    sunday: {
      closed: true,
      periods: [],
    },
  };
}
