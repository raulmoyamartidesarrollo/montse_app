import { httpsCallable } from 'firebase/functions';

import { functions } from '../lib/firebase';

/**
 * Información clínica de un paciente.
 *
 * Se almacena separada de sus datos administrativos.
 */
export interface PatientClinicalProfile {
  clientId: string;

  reasonForConsultation: string;
  affectedArea: string;
  medicalHistory: string;
  observations: string;

  createdAt: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  patientInstructions: string;
}

/**
 * Datos para actualizar la ficha clínica.
 */
export interface UpdatePatientClinicalProfileInput {
  clientId: string;

  reasonForConsultation: string;
  affectedArea: string;
  medicalHistory: string;
  observations: string;
  patientInstructions: string;
}

/**
 * Respuesta al consultar la ficha clínica.
 */
export interface GetPatientClinicalProfileResponse {
  success: boolean;
  profile: PatientClinicalProfile;
}

/**
 * Respuesta al guardar la ficha clínica.
 */
export interface UpdatePatientClinicalProfileResponse {
  success: boolean;
  clientId: string;
}

/**
 * Obtiene la ficha clínica de un paciente.
 *
 * Los permisos se comprobarán en Cloud Functions.
 */
export async function getPatientClinicalProfile(
  clientId: string
): Promise<PatientClinicalProfile> {
  const callable = httpsCallable<
    { clientId: string },
    GetPatientClinicalProfileResponse
  >(functions, 'getPatientClinicalProfile');

  const response = await callable({ clientId });

  if (!response.data.success) {
    throw new Error(
      'No se ha podido obtener la ficha clínica del paciente.'
    );
  }

  return response.data.profile;
}

/**
 * Actualiza la ficha clínica de un paciente.
 *
 * Los permisos se comprobarán en Cloud Functions.
 */
export async function updatePatientClinicalProfile(
  input: UpdatePatientClinicalProfileInput
): Promise<UpdatePatientClinicalProfileResponse> {
  const callable = httpsCallable<
    UpdatePatientClinicalProfileInput,
    UpdatePatientClinicalProfileResponse
  >(functions, 'updatePatientClinicalProfile');

  const response = await callable(input);

  if (!response.data.success) {
    throw new Error(
      'No se ha podido guardar la ficha clínica del paciente.'
    );
  }

  return response.data;
}