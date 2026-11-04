import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, type DocumentData } from 'firebase/firestore';

import { functions, db } from '../lib/firebase';

export interface UserProfile {
  uid: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  photoURL: string;

  roles: Array<'client' | 'worker' | 'admin'>;

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
 * Crea el perfil de usuario desde Cloud Functions
 * únicamente si todavía no existe.
 */
export async function ensureUserProfile(): Promise<void> {
  const callable = httpsCallable<
    Record<string, never>,
    { success: boolean }
  >(functions, 'ensureUserProfile');

  await callable({});
}

/**
 * Obtiene el perfil del usuario autenticado.
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