import { Platform } from 'react-native';
import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { ensureUserProfile } from './users';
import {
  GoogleAuthProvider,
  signInWithCredential,
  type User,
} from 'firebase/auth';

import { auth } from '../lib/firebase';

const WEB_CLIENT_ID =
  '641763515548-0kjpojkk03prfbp8dnjol4qong5tm31v.apps.googleusercontent.com';

const IOS_CLIENT_ID =
  '641763515548-f6v9oh7r6okomuvreqdr89ug3j2r2fdg.apps.googleusercontent.com';

GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
  iosClientId: IOS_CLIENT_ID,
  offlineAccess: false,
});

export async function loginWithGoogle(): Promise<User | null> {
  try {
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
    }

    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      return null;
    }

    const idToken = response.data.idToken;

    if (!idToken) {
      throw new Error(
        'Google no ha devuelto un token de autenticación.'
      );
    }

    const credential = GoogleAuthProvider.credential(idToken);

    const firebaseCredential = await signInWithCredential(
  auth,
  credential
);

// Crear el perfil si todavía no existe.
await ensureUserProfile();

return firebaseCredential.user;
  } catch (error: unknown) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return null;
      }

      if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error(
          'Ya hay un inicio de sesión con Google en curso.'
        );
      }

      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error(
          'Los servicios de Google Play no están disponibles.'
        );
      }
    }

    throw error;
  }
}