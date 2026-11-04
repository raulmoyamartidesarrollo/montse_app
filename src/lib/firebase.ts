import { initializeApp, getApp, getApps } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFunctions } from 'firebase/functions';
import { getFirestore } from 'firebase/firestore';
// Configuración del proyecto Firebase
const firebaseConfig = {
  apiKey: 'AIzaSyA0ngq-Y9yzZ7Q_y_PDAJbImFrjCtm7Z0E',
  authDomain: 'montseapp-302eb.firebaseapp.com',
  projectId: 'montseapp-302eb',
  storageBucket: 'montseapp-302eb.firebasestorage.app',
  messagingSenderId: '641763515548',
  appId: '1:641763515548:web:8bff12ac7776c5d9b22159',
  measurementId: 'G-G7RR7PSJYP',
};

// Inicializar Firebase una sola vez
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);


// Firebase 13.1.0 incluye getReactNativePersistence en su entrada
// para React Native, pero sus tipos públicos no la exponen.
// Este tipo local permite utilizar la función sin importar rutas internas.
const reactNativeAuth = FirebaseAuth as typeof FirebaseAuth & {
  getReactNativePersistence: (storage: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
  }) => FirebaseAuth.Persistence;
};

// Inicializar Auth con persistencia en AsyncStorage
function initializeFirebaseAuth() {
  try {
    return FirebaseAuth.initializeAuth(app, {
      persistence: reactNativeAuth.getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    // En desarrollo, Expo puede volver a evaluar el módulo.
    // Si Auth ya está inicializado, reutilizamos esa instancia.
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'auth/already-initialized'
    ) {
      return FirebaseAuth.getAuth(app);
    }

    throw error;
  }
}

export const auth = initializeFirebaseAuth();

export const db = getFirestore(app, 'default');

export const functions = getFunctions(app, 'europe-west1');

export { app };