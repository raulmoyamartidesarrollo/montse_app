import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { ensureUserProfile } from './users';

import { auth } from '../lib/firebase';

/**
 * Registra un usuario mediante nombre, correo y contraseña.
 */
export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<User> {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  // 1. Crear usuario en Firebase Authentication.
  const credential = await createUserWithEmailAndPassword(
    auth,
    cleanEmail,
    password,
  );

  // 2. Guardar su nombre.
  await updateProfile(credential.user, {
    displayName: cleanName,
  });

  // 3. Crear su perfil en Firestore.
  await ensureUserProfile();

  return credential.user;
}

/**
 * Inicia sesión mediante correo y contraseña.
 */
export async function loginWithEmail(
  email: string,
  password: string,
): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();

  const credential = await signInWithEmailAndPassword(
    auth,
    cleanEmail,
    password,
  );

  // Crear el perfil si el usuario ya existía
  // en Authentication pero no en Firestore.
  await ensureUserProfile();

  return credential.user;
}

/**
 * Envía un correo para restablecer la contraseña.
 */
export async function resetPassword(
  email: string,
): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();

  await sendPasswordResetEmail(auth, cleanEmail);
}

/**
 * Cierra la sesión actual.
 */
export async function logout(): Promise<void> {
  await signOut(auth);
}

/**
 * Escucha los cambios en el estado de autenticación.
 */
export function observeAuthState(
  callback: (user: User | null) => void,
): () => void {
  return onAuthStateChanged(auth, callback);
}