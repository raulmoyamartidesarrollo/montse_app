export type BodyView = 'front' | 'back';

export type PainType =
  | 'muscular'
  | 'articular'
  | 'punzante'
  | 'irradiado'
  | 'quemazon'
  | 'hormigueo'
  | 'otro';

export type PainFrequency =
  | 'constante'
  | 'intermitente'
  | 'ocasional'
  | 'movimiento';

export interface ClinicalPainZone {
  zoneId: string;
  zoneName: string;
  view: BodyView;

  // Escala de intensidad del dolor: 0-10
  eva: number;

  // Características clínicas
  painType: PainType;
  frequency: PainFrequency;
  observations: string;
}

export interface ClinicalPainAssessment {
  assessmentId: string;

  clientId: string;
  episodeId: string;

  // Profesional que registra la valoración
  createdBy: string;

  // Fecha de registro
  createdAt: string | null;

  // Zonas anatómicas valoradas
  zones: ClinicalPainZone[];
}

export const PAIN_TYPES: {
  value: PainType;
  label: string;
}[] = [
  { value: 'muscular', label: 'Muscular' },
  { value: 'articular', label: 'Articular' },
  { value: 'punzante', label: 'Punzante' },
  { value: 'irradiado', label: 'Irradiado' },
  { value: 'quemazon', label: 'Quemazón' },
  { value: 'hormigueo', label: 'Hormigueo' },
  { value: 'otro', label: 'Otro' },
];

export const PAIN_FREQUENCIES: {
  value: PainFrequency;
  label: string;
}[] = [
  { value: 'constante', label: 'Constante' },
  { value: 'intermitente', label: 'Intermitente' },
  { value: 'ocasional', label: 'Ocasional' },
  { value: 'movimiento', label: 'Con el movimiento' },
];
