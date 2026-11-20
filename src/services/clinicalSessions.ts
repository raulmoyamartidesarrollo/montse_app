import { httpsCallable } from 'firebase/functions';

import { functions } from '../lib/firebase';

/**
 * Representa una sesión de fisioterapia
 * asociada a un episodio clínico.
 */
export interface ClinicalSession {
  sessionId: string;
  episodeId: string;
  clientId: string;

  // Fecha en formato YYYY-MM-DD.
  sessionDate: string;

  // Escala visual analógica del dolor (0-10).
  painLevel: number | null;

  // Información clínica.
  symptoms: string;
  treatment: string;
  exercises: string;
  evolution: string;

  // Profesional responsable.
  professionalId: string;

  // Auditoría.
  createdBy: string;
  updatedBy: string;

  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * Datos necesarios para registrar
 * una nueva sesión de fisioterapia.
 */
export interface CreateClinicalSessionInput {
  clientId: string;
  episodeId: string;

  sessionDate: string;
  painLevel: number;

  symptoms: string;
  treatment: string;
  exercises: string;
  evolution: string;
}

/**
 * Respuesta al crear una sesión.
 */
export interface CreateClinicalSessionResponse {
  success: boolean;
  clientId: string;
  episodeId: string;
  sessionId: string;
}

/**
 * Respuesta al consultar sesiones.
 */
interface GetClinicalSessionsResponse {
  success: boolean;
  clientId: string;
  episodeId: string;
  sessions: ClinicalSession[];
}

/**
 * Registra una sesión de fisioterapia
 * dentro de un episodio clínico abierto.
 *
 * La validación de permisos y datos
 * se realiza en Cloud Functions.
 */
export async function createPatientClinicalSession(
  input: CreateClinicalSessionInput
): Promise<CreateClinicalSessionResponse> {
  const callable = httpsCallable<
    CreateClinicalSessionInput,
    CreateClinicalSessionResponse
  >(functions, 'createPatientClinicalSession');

  const response = await callable(input);

  if (!response.data.success) {
    throw new Error(
      'No se ha podido registrar la sesión clínica.'
    );
  }

  return response.data;
}

/**
 * Obtiene las sesiones de un episodio clínico.
 *
 * Las sesiones se devuelven ordenadas
 * por fecha, de más reciente a más antigua.
 *
 * Se pueden consultar episodios abiertos
 * y cerrados.
 */
export async function getPatientClinicalSessions(
  clientId: string,
  episodeId: string
): Promise<ClinicalSession[]> {
  const callable = httpsCallable<
    {
      clientId: string;
      episodeId: string;
    },
    GetClinicalSessionsResponse
  >(functions, 'getPatientClinicalSessions');

  const response = await callable({
    clientId,
    episodeId,
  });

  if (!response.data.success) {
    throw new Error(
      'No se han podido obtener las sesiones clínicas.'
    );
  }

  return response.data.sessions;
}