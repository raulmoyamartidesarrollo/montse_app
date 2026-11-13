import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export interface CenterAddress {
  street: string;
  number: string;
  floor: string;
  door: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;
  formattedAddress: string;
}

export interface CenterContact {
  phone: string;
  mobile: string;
  whatsapp: string;
  email: string;
  website: string;
}

export interface CenterSocialMedia {
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  linkedin: string;
  x: string;
}

export interface CenterBookingSettings {
  allowClientCancellation: boolean;
  allowClientRescheduling: boolean;
  allowRecurringBookings: boolean;
  defaultDurationMinutes: number;
  recurringIntervalsWeeks: number[];
}

export interface CenterSettings {
  name: string;
  description: string;
  address: CenterAddress;
  contact: CenterContact;
  socialMedia: CenterSocialMedia;
  timezone: string;
  bookingSettings: CenterBookingSettings;
}

/**
 * Secciones de configuración que pueden actualizarse.
 */
export type CenterSettingsSection =
  | 'general'
  | 'contact'
  | 'address'
  | 'socialMedia'
  | 'advanced';

/**
 * Datos permitidos para cada sección.
 */
export type CenterSettingsUpdate =
  | {
      section: 'general';
      data: Pick<CenterSettings, 'name' | 'description'>;
    }
  | {
      section: 'contact';
      data: CenterContact;
    }
  | {
      section: 'address';
      data: Omit<CenterAddress, 'formattedAddress'>;
    }
  | {
      section: 'socialMedia';
      data: CenterSocialMedia;
    }
  | {
      section: 'advanced';
      data: {
        timezone: string;
      } & CenterBookingSettings;
    };

/**
 * Recupera la configuración del centro
 * mediante una Cloud Function segura.
 *
 * Permisos:
 * - owner: lectura.
 * - developer: lectura.
 */
export async function getCenterSettings(): Promise<CenterSettings> {
  const callable = httpsCallable<
    Record<string, never>,
    CenterSettings
  >(functions, 'getCenterSettings');

  const response = await callable({});

  return response.data;
}

/**
 * Actualiza una sección de la configuración del centro.
 *
 * La autorización se comprueba en Firebase:
 * - owner: escritura.
 * - developer: sin permisos de escritura.
 *
 * No se permite modificar campos internos del centro.
 */
export async function updateCenterSettings(
  payload: CenterSettingsUpdate
): Promise<void> {
  const callable = httpsCallable<
    CenterSettingsUpdate,
    { success: boolean }
  >(functions, 'updateCenterSettings');

  const response = await callable(payload);

  if (response.data.success !== true) {
    throw new Error(
      'No se han podido guardar los cambios del centro.'
    );
  }
}