import { httpsCallable } from 'firebase/functions';

import { functions } from '../lib/firebase';

export type ClinicalEpisodeStatus = 'open' | 'closed';

export interface ClinicalEpisode {
  episodeId: string;
  clientId: string;

  title: string;
  reasonForConsultation: string;
  affectedArea: string;
  observations: string;

  status: ClinicalEpisodeStatus;

  openedAt: string | null;
  closedAt: string | null;
  closingReason: string;

  createdAt: string | null;
  updatedAt: string | null;

  createdBy?: string;
  updatedBy?: string;
  closedBy?: string;
  reopenedBy?: string;
  reopenedAt?: string | null;
}

export interface CreateClinicalEpisodeInput {
  clientId: string;
  title: string;
  reasonForConsultation: string;
  affectedArea: string;
  observations: string;
}

export interface UpdateClinicalEpisodeInput
  extends CreateClinicalEpisodeInput {
  episodeId: string;
}

interface ClinicalEpisodeActionResponse {
  success: boolean;
  clientId: string;
  episodeId: string;
  status?: ClinicalEpisodeStatus;
}

interface GetClinicalEpisodesResponse {
  success: boolean;
  clientId: string;
  episodes: ClinicalEpisode[];
}

interface GetClinicalEpisodeResponse {
  success: boolean;
  episode: ClinicalEpisode;
}

/**
 * Obtiene todos los episodios clínicos de un paciente.
 */
export async function getPatientClinicalEpisodes(
  clientId: string
): Promise<ClinicalEpisode[]> {
  const callable = httpsCallable<
    { clientId: string },
    GetClinicalEpisodesResponse
  >(functions, 'getPatientClinicalEpisodes');

  const response = await callable({ clientId });

  if (!response.data.success) {
    throw new Error(
      'No se han podido obtener los episodios clínicos.'
    );
  }

  return response.data.episodes;
}

/**
 * Obtiene un episodio clínico concreto.
 */
export async function getPatientClinicalEpisode(
  clientId: string,
  episodeId: string
): Promise<ClinicalEpisode> {
  const callable = httpsCallable<
    { clientId: string; episodeId: string },
    GetClinicalEpisodeResponse
  >(functions, 'getPatientClinicalEpisode');

  const response = await callable({
    clientId,
    episodeId,
  });

  if (!response.data.success) {
    throw new Error(
      'No se ha podido obtener el episodio clínico.'
    );
  }

  return response.data.episode;
}

/**
 * Crea un episodio clínico.
 */
export async function createPatientClinicalEpisode(
  input: CreateClinicalEpisodeInput
): Promise<ClinicalEpisodeActionResponse> {
  const callable = httpsCallable<
    CreateClinicalEpisodeInput,
    ClinicalEpisodeActionResponse
  >(functions, 'createPatientClinicalEpisode');

  const response = await callable(input);

  if (!response.data.success) {
    throw new Error(
      'No se ha podido crear el episodio clínico.'
    );
  }

  return response.data;
}

/**
 * Actualiza un episodio clínico abierto.
 */
export async function updatePatientClinicalEpisode(
  input: UpdateClinicalEpisodeInput
): Promise<ClinicalEpisodeActionResponse> {
  const callable = httpsCallable<
    UpdateClinicalEpisodeInput,
    ClinicalEpisodeActionResponse
  >(functions, 'updatePatientClinicalEpisode');

  const response = await callable(input);

  if (!response.data.success) {
    throw new Error(
      'No se ha podido actualizar el episodio clínico.'
    );
  }

  return response.data;
}

/**
 * Cierra un episodio clínico.
 */
export async function closePatientClinicalEpisode(
  clientId: string,
  episodeId: string,
  closingReason: string
): Promise<ClinicalEpisodeActionResponse> {
  const callable = httpsCallable<
    {
      clientId: string;
      episodeId: string;
      closingReason: string;
    },
    ClinicalEpisodeActionResponse
  >(functions, 'closePatientClinicalEpisode');

  const response = await callable({
    clientId,
    episodeId,
    closingReason,
  });

  if (!response.data.success) {
    throw new Error(
      'No se ha podido cerrar el episodio clínico.'
    );
  }

  return response.data;
}

/**
 * Reabre un episodio clínico cerrado.
 */
export async function reopenPatientClinicalEpisode(
  clientId: string,
  episodeId: string
): Promise<ClinicalEpisodeActionResponse> {
  const callable = httpsCallable<
    { clientId: string; episodeId: string },
    ClinicalEpisodeActionResponse
  >(functions, 'reopenPatientClinicalEpisode');

  const response = await callable({
    clientId,
    episodeId,
  });

  if (!response.data.success) {
    throw new Error(
      'No se ha podido reabrir el episodio clínico.'
    );
  }

  return response.data;
}