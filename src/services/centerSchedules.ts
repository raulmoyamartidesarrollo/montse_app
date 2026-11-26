import { httpsCallable } from 'firebase/functions';

import { functions } from '../lib/firebase';

import type {
  CenterSchedule,
  GetCenterScheduleResponse,
  UpdateCenterWeeklyScheduleInput,
  UpdateCenterWeeklyScheduleResponse,
} from '../types/centerSchedules';

// ==================================================
// CLOUD FUNCTIONS
// ==================================================

const getCenterScheduleCallable = httpsCallable<
  Record<string, never>,
  GetCenterScheduleResponse
>(
  functions,
  'getCenterSchedule'
);

const updateCenterWeeklyScheduleCallable = httpsCallable<
  UpdateCenterWeeklyScheduleInput,
  UpdateCenterWeeklyScheduleResponse
>(
  functions,
  'updateCenterWeeklySchedule'
);

// ==================================================
// RECUPERAR HORARIOS DEL CENTRO
// ==================================================

export async function getCenterSchedule(): Promise<CenterSchedule> {
  const response = await getCenterScheduleCallable({});

  const data = response.data;

  if (
    !data ||
    data.success !== true ||
    !data.schedule ||
    typeof data.schedule.weeklyConfigured !== 'boolean' ||
    typeof data.schedule.timezone !== 'string' ||
    !data.schedule.weekly ||
    typeof data.schedule.weekly !== 'object' ||
    Array.isArray(data.schedule.weekly)
  ) {
    throw new Error(
      'No se ha podido recuperar el horario del centro.'
    );
  }

  return data.schedule;
}

// ==================================================
// ACTUALIZAR HORARIO SEMANAL
// ==================================================

export async function updateCenterWeeklySchedule(
  input: UpdateCenterWeeklyScheduleInput
): Promise<void> {
  const response =
    await updateCenterWeeklyScheduleCallable(input);

  if (response.data?.success !== true) {
    throw new Error(
      'No se ha podido guardar el horario semanal.'
    );
  }
}
