import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

// ==================================================
// TIPOS DE SERVICIOS DEL CENTRO
// ==================================================

/**
 * Servicio recuperado desde Firebase.
 */
export interface CenterService {
  serviceId: string;
  name: string;
  description: string;
  priceCents: number | null;
  currency: 'EUR';
  durationMinutes: number | null;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * Datos necesarios para crear un servicio.
 */
export interface CenterServiceInput {
  name: string;
  description?: string;
  priceCents: number;
  durationMinutes: number;
  active: boolean;
}

/**
 * Datos necesarios para editar un servicio.
 */
export interface CenterServiceUpdate
  extends CenterServiceInput {
  serviceId: string;
}

/**
 * Datos necesarios para cambiar el estado.
 */
export interface CenterServiceStatusInput {
  serviceId: string;
  active: boolean;
}

/**
 * Datos necesarios para eliminar un servicio.
 */
export interface CenterServiceDeleteInput {
  serviceId: string;
}

// ==================================================
// RESPUESTAS DE CLOUD FUNCTIONS
// ==================================================

interface GetCenterServicesResponse {
  success: boolean;
  services: CenterService[];
}

interface CenterServiceMutationResponse {
  success: boolean;
  serviceId: string;
}

export interface CenterServiceStatusResponse
  extends CenterServiceMutationResponse {
  active: boolean;
  changed: boolean;
}

export interface CenterServiceDeleteResponse
  extends CenterServiceMutationResponse {
  deleted: boolean;
  changed: boolean;
}

// ==================================================
// CONSULTAR SERVICIOS
// ==================================================

/**
 * Recupera los servicios activos e inactivos.
 *
 * Los servicios eliminados quedan excluidos
 * desde el propio backend.
 */
export async function getCenterServices(): Promise<
  CenterService[]
> {
  const callable = httpsCallable<
    Record<string, never>,
    GetCenterServicesResponse
  >(functions, 'getCenterServices');

  const response = await callable({});

  if (
    response.data.success !== true ||
    !Array.isArray(response.data.services)
  ) {
    throw new Error(
      'No se han podido recuperar los servicios del centro.'
    );
  }

  return response.data.services;
}

// ==================================================
// CREAR SERVICIO
// ==================================================

/**
 * Crea un nuevo servicio del centro.
 *
 * Devuelve el identificador generado por Firebase.
 */
export async function createCenterService(
  payload: CenterServiceInput
): Promise<string> {
  const callable = httpsCallable<
    CenterServiceInput,
    CenterServiceMutationResponse
  >(functions, 'createCenterService');

  const response = await callable({
    ...payload,
    description: payload.description ?? '',
  });

  if (
    response.data.success !== true ||
    typeof response.data.serviceId !== 'string' ||
    !response.data.serviceId
  ) {
    throw new Error(
      'No se ha podido confirmar la creación del servicio.'
    );
  }

  return response.data.serviceId;
}

// ==================================================
// EDITAR SERVICIO
// ==================================================

/**
 * Actualiza los datos de un servicio existente.
 */
export async function updateCenterService(
  payload: CenterServiceUpdate
): Promise<void> {
  const callable = httpsCallable<
    CenterServiceUpdate,
    CenterServiceMutationResponse
  >(functions, 'updateCenterService');

  const response = await callable({
    ...payload,
    description: payload.description ?? '',
  });

  if (
    response.data.success !== true ||
    response.data.serviceId !== payload.serviceId
  ) {
    throw new Error(
      'No se ha podido confirmar la actualización del servicio.'
    );
  }
}

// ==================================================
// ACTIVAR / DESACTIVAR SERVICIO
// ==================================================

/**
 * Modifica únicamente el estado del servicio.
 */
export async function setCenterServiceStatus(
  payload: CenterServiceStatusInput
): Promise<CenterServiceStatusResponse> {
  const callable = httpsCallable<
    CenterServiceStatusInput,
    CenterServiceStatusResponse
  >(functions, 'setCenterServiceStatus');

  const response = await callable(payload);

  if (
    response.data.success !== true ||
    response.data.serviceId !== payload.serviceId ||
    response.data.active !== payload.active ||
    typeof response.data.changed !== 'boolean'
  ) {
    throw new Error(
      'No se ha podido confirmar el cambio de estado del servicio.'
    );
  }

  return response.data;
}

// ==================================================
// ELIMINAR SERVICIO
// ==================================================

/**
 * Elimina lógicamente un servicio.
 *
 * El documento original permanece en Firestore.
 */
export async function deleteCenterService(
  serviceId: string
): Promise<CenterServiceDeleteResponse> {
  const callable = httpsCallable<
    CenterServiceDeleteInput,
    CenterServiceDeleteResponse
  >(functions, 'deleteCenterService');

  const response = await callable({
    serviceId,
  });

  if (
    response.data.success !== true ||
    response.data.serviceId !== serviceId ||
    response.data.deleted !== true ||
    typeof response.data.changed !== 'boolean'
  ) {
    throw new Error(
      'No se ha podido confirmar la eliminación del servicio.'
    );
  }

  return response.data;
}
