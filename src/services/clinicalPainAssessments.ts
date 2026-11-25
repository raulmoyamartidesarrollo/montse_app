import { httpsCallable } from 'firebase/functions';

import { functions } from '../lib/firebase';

import type {
  ClinicalPainAssessment,
  ClinicalPainZone,
} from '../types/clinicalPain';

/**
 * Datos necesarios para registrar una valoración del dolor.
 */
export interface CreatePainAssessmentInput {
  clientId: string;
  episodeId: string;
  zones: ClinicalPainZone[];
}

/**
 * Respuesta al crear una valoración.
 */
export interface CreatePainAssessmentResponse {
  success: boolean;
  clientId: string;
  episodeId: string;
  assessmentId: string;
}

/**
 * Respuesta al consultar el historial de valoraciones.
 */
interface GetPainAssessmentsResponse {
  success: boolean;
  clientId: string;
  episodeId: string;
  assessments: ClinicalPainAssessment[];
}

/**
 * Guarda una nueva valoración del dolor.
 *
 * La autenticación, los permisos clínicos,
 * las validaciones y la auditoría se gestionan
 * desde Firebase Cloud Functions.
 */
export async function createPatientPainAssessment(
  input: CreatePainAssessmentInput
): Promise<CreatePainAssessmentResponse> {
  const callable = httpsCallable<
    CreatePainAssessmentInput,
    CreatePainAssessmentResponse
  >(functions, 'createPatientPainAssessment');

  const response = await callable(input);

  if (!response.data.success) {
    throw new Error(
      'No se ha podido guardar la valoración del dolor.'
    );
  }

  return response.data;
}

/**
 * Obtiene las valoraciones del dolor de un episodio.
 *
 * Las valoraciones se devuelven ordenadas
 * de más reciente a más antigua.
 */
export async function getPatientPainAssessments(
  clientId: string,
  episodeId: string
): Promise<ClinicalPainAssessment[]> {
  const callable = httpsCallable<
    {
      clientId: string;
      episodeId: string;
    },
    GetPainAssessmentsResponse
  >(functions, 'getPatientPainAssessments');

  const response = await callable({
    clientId,
    episodeId,
  });

  if (!response.data.success) {
    throw new Error(
      'No se han podido obtener las valoraciones del dolor.'
    );
  }

  return response.data.assessments;
}
