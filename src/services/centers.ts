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

export interface CenterSettings {
  name: string;
  description: string;
  address: CenterAddress;
  contact: CenterContact;
  socialMedia: CenterSocialMedia;
  timezone: string;
}

/**
 * Recupera la configuración del centro
 * mediante una Cloud Function segura.
 */
export async function getCenterSettings(): Promise<CenterSettings> {
  const callable = httpsCallable<
    Record<string, never>,
    CenterSettings
  >(functions, 'getCenterSettings');

  const response = await callable({});

  return response.data;
}