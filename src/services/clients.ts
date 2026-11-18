import { httpsCallable } from 'firebase/functions';

import { functions } from '../lib/firebase';

/**
 * Información administrativa básica de un paciente.
 *
 * No contiene información clínica.
 */
export interface CenterClient {
  id: string;
  name: string;
  surname: string;
  phone: string;
  email: string;

  status: 'active' | 'inactive';
  isTest: boolean;

  // Papelera.
  deleted: boolean;

  // Vinculación con Firebase Authentication.
  linkingStatus: 'none' | 'pending' | 'linked';
  linkedAt: string | null;
}

/**
 * Datos necesarios para registrar manualmente
 * un paciente desde la administración.
 */
export interface CreateCenterClientInput {
  name: string;
  surname: string;
  phone: string;
  email: string;
}

/**
 * Resultado de crear un paciente.
 *
 * linkingCode es el código que Montse
 * entregará al paciente para vincular
 * posteriormente su cuenta.
 */
export interface CreateCenterClientResponse {
  success: boolean;
  clientId: string;
  linkingCode: string;
}

interface GetCenterClientsResponse {
  success: boolean;
  clients: CenterClient[];
}

/**
 * Obtiene los pacientes del centro.
 *
 * Los permisos se comprueban en Cloud Functions.
 *
 * - Owner: pacientes del centro.
 * - Developer: únicamente pacientes de prueba.
 */
export async function getCenterClients(): Promise<CenterClient[]> {
  const callable = httpsCallable<
    Record<string, never>,
    GetCenterClientsResponse
  >(functions, 'getCenterClients');

  const response = await callable({});

  if (!response.data.success) {
    throw new Error(
      'No se ha podido obtener el listado de pacientes.'
    );
  }

  return response.data.clients;
}

/**
 * Registra un paciente manualmente.
 *
 * No crea una cuenta en Firebase Authentication.
 *
 * El servidor:
 * - Comprueba los permisos.
 * - Crea la ficha del paciente.
 * - Genera un código de vinculación.
 * - Devuelve el código una única vez.
 */
export async function createCenterClient(
  input: CreateCenterClientInput
): Promise<CreateCenterClientResponse> {
  const callable = httpsCallable<
    CreateCenterClientInput,
    CreateCenterClientResponse
  >(functions, 'createCenterClient');

  const response = await callable(input);

  if (
    !response.data.success ||
    !response.data.clientId ||
    !response.data.linkingCode
  ) {
    throw new Error(
      'No se ha podido registrar el paciente correctamente.'
    );
  }

  return response.data;
}
export interface RestoreCenterClientResponse {
  success: boolean;
  clientId: string;
}

export async function restoreCenterClient(
  clientId: string
): Promise<RestoreCenterClientResponse> {
  const callable = httpsCallable<
    { clientId: string },
    RestoreCenterClientResponse
  >(functions, 'restoreCenterClient');

  const response = await callable({ clientId });

  if (!response.data.success) {
    throw new Error('No se ha podido restaurar el paciente.');
  }

  return response.data;
}
export interface DeleteCenterClientResponse {
  success: boolean;
  clientId: string;
}

export async function deleteCenterClient(
  clientId: string
): Promise<DeleteCenterClientResponse> {
  const callable = httpsCallable<
    { clientId: string },
    DeleteCenterClientResponse
  >(functions, 'deleteCenterClient');

  const response = await callable({ clientId });

  if (!response.data.success) {
    throw new Error('No se ha podido eliminar el paciente.');
  }

  return response.data;
}

export interface UpdateCenterClientInput {
  clientId: string;
  name: string;
  surname: string;
  phone: string;
  email: string;
}

export interface UpdateCenterClientResponse {
  success: boolean;
  clientId: string;
}

export async function updateCenterClient(
  input: UpdateCenterClientInput
): Promise<UpdateCenterClientResponse> {

  console.log('=== DEBUG UPDATE CLIENT ===');

  const { auth } = await import('../lib/firebase');

  const currentUser = auth.currentUser;

  console.log('Usuario autenticado:', currentUser?.uid ?? 'NINGUNO');
  console.log('Email:', currentUser?.email ?? 'NINGUNO');

  if (!currentUser) {
    throw new Error(
      'No existe una sesión activa de Firebase Authentication.'
    );
  }

  try {
    const token = await currentUser.getIdToken();

    console.log('Token disponible:', Boolean(token));
  } catch (error) {
    console.error('Error obteniendo token:', error);
    throw error;
  }

  const callable = httpsCallable<
    UpdateCenterClientInput,
    UpdateCenterClientResponse
  >(functions, 'updateCenterClient');

  const response = await callable(input);

  if (!response.data.success) {
    throw new Error(
      'No se han podido actualizar los datos del paciente.'
    );
  }

  return response.data;
}

export interface SetCenterClientStatusInput {
  clientId: string;
  status: 'active' | 'inactive';
}

export interface SetCenterClientStatusResponse {
  success: boolean;
}

export async function setCenterClientStatus(
  input: SetCenterClientStatusInput
): Promise<SetCenterClientStatusResponse> {
  const callable = httpsCallable<
    SetCenterClientStatusInput,
    SetCenterClientStatusResponse
  >(functions, 'setCenterClientStatus');

  const response = await callable(input);

  if (!response.data.success) {
    throw new Error(
      'No se ha podido actualizar el estado del paciente.'
    );
  }

  return response.data;
}

/**
 * Datos necesarios para regenerar
 * el código de vinculación de un paciente.
 */
export interface RegenerateClientLinkingCodeInput {
  clientId: string;
}

/**
 * Respuesta de Firebase.
 */
export interface RegenerateClientLinkingCodeResponse {
  success: boolean;
  clientId: string;
  linkingCode: string;
  expiresAt: string;
}

/**
 * Regenera el código de vinculación.
 *
 * El código anterior queda invalidado.
 * El nuevo código solo se devuelve una vez.
 */
export async function regenerateClientLinkingCode(
  input: RegenerateClientLinkingCodeInput
): Promise<RegenerateClientLinkingCodeResponse> {
  const callable = httpsCallable<
    RegenerateClientLinkingCodeInput,
    RegenerateClientLinkingCodeResponse
  >(
    functions,
    'regenerateClientLinkingCode'
  );

  const response = await callable(input);

  if (!response.data.success) {
    throw new Error(
      'No se ha podido regenerar el código de vinculación.'
    );
  }

  return response.data;
}