import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';

import { functions, db } from '../lib/firebase';

/**
 * Roles disponibles en MontseApp.
 *
 * admin y owner tienen las mismas
 * funcionalidades administrativas.
 */
export type UserRole =
  | 'client'
  | 'worker'
  | 'admin'
  | 'owner'
  | 'developer';

/**
 * Datos del perfil de usuario.
 */
export interface UserProfile {
  uid: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  photoURL: string;

  roles: UserRole[];

  centerId?: string;

  activationOnboardingCompleted?: boolean;

  notificationsEnabled: boolean;

  notificationPreferences: {
    bookingCreated: boolean;
    bookingModified: boolean;
    bookingCancelled: boolean;
    reminder24h: boolean;
    reminder2h: boolean;
    availableSlots: boolean;
  };
}

/**
 * Crea el perfil del usuario autenticado
 * mediante Firebase Cloud Functions.
 *
 * Si ya existe, conserva sus roles.
 */
export async function ensureUserProfile(): Promise<void> {
  const callable = httpsCallable<
    Record<string, never>,
    { success: boolean }
  >(functions, 'ensureUserProfile');

  await callable({});
}

/**
 * Recupera el perfil del usuario desde Firestore.
 */
export async function getUserProfile(
  uid: string
): Promise<UserProfile | null> {
  const userRef = doc(db, 'users', uid);

  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as UserProfile;
}

/**
 * Comprueba si el usuario puede acceder
 * al panel de administración.
 *
 * admin y owner tienen exactamente
 * las mismas funcionalidades.
 */
export function hasAdminAccess(
  roles: UserRole[] = []
): boolean {
  return roles.includes('admin') || roles.includes('owner');
}

/**
 * Comprueba si el usuario es profesional
 * de la clínica.
 */
export function isWorker(
  roles: UserRole[] = []
): boolean {
  return roles.includes('worker');
}

/**
 * Identifica una cuenta de desarrollador.
 *
 * El rol developer no concede por sí solo
 * permisos para consultar historiales clínicos.
 */
export function isDeveloper(
  roles: UserRole[] = []
): boolean {
  return roles.includes('developer');
}
/**
 * Activa una cuenta administrativa mediante
 * un código de activación.
 */
export async function activateAccountWithCode(
  code: string
): Promise<{
  success: boolean;
  role: 'owner' | 'developer';
  centerId: string;
}> {
  const callable = httpsCallable<
    { code: string },
    {
      success: boolean;
      role: 'owner' | 'developer';
      centerId: string;
    }
  >(functions, 'activateAccountWithCode');

  const result = await callable({ code: code.trim() });

  return result.data;
}

/**
 * Marca como completado el proceso inicial
 * de activación del usuario.
 *
 * No modifica roles ni permisos.
 */
export async function completeActivationOnboarding(): Promise<void> {
  const callable = httpsCallable<
    Record<string, never>,
    {
      success: boolean;
      activationOnboardingCompleted: boolean;
    }
  >(functions, 'completeActivationOnboarding');

  await callable({});
}
/**
 * Consulta si Montse ya ha activado su cuenta
 * como propietaria del centro.
 *
 * Devuelve:
 * - true: Montse ya está activada.
 * - false: Montse todavía no está activada.
 *
 * Si Firebase devuelve un error, lo propagamos
 * para no confundirlo con una cuenta sin activar.
 */
export async function getCenterActivationStatus(): Promise<boolean> {
  const callable = httpsCallable<
    Record<string, never>,
    { ownerActivated: boolean }
  >(functions, 'getCenterActivationStatus');

  const response = await callable({});

  return response.data.ownerActivated === true;
}
