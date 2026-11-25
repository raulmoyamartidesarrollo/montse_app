import type {
  BodyView,
  ClinicalPainAssessment,
  ClinicalPainZone,
} from '../types/clinicalPain';

export type PainComparisonStatus =
  | 'improved'
  | 'worsened'
  | 'stable'
  | 'new'
  | 'notReassessed';

export interface PainZoneComparison {
  zoneId: string;
  zoneName: string;
  view: BodyView;
  initial: ClinicalPainZone | null;
  final: ClinicalPainZone | null;
  difference: number | null;
  reductionPercentage: number | null;
  status: PainComparisonStatus;
  painTypeChanged: boolean | null;
  frequencyChanged: boolean | null;
  observationsChanged: boolean | null;
}

export interface PainComparisonSummary {
  totalRegions: number;
  comparableRegions: number;
  improved: number;
  worsened: number;
  stable: number;
  newRegions: number;
  notReassessed: number;
  initialAverage: number | null;
  finalAverage: number | null;
  averageDifference: number | null;
  reductionPercentage: number | null;
}

export interface PainAssessmentComparison {
  initialAssessmentId: string;
  finalAssessmentId: string;
  initialDate: string;
  finalDate: string;
  zones: PainZoneComparison[];
  summary: PainComparisonSummary;
}

function isValidEva(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 10
  );
}

function createZoneMap(
  zones: ClinicalPainZone[]
): Map<string, ClinicalPainZone> {
  const result = new Map<string, ClinicalPainZone>();

  zones.forEach((zone) => {
    if (
      isValidEva(zone.eva) &&
      !result.has(zone.zoneId)
    ) {
      result.set(zone.zoneId, zone);
    }
  });

  return result;
}

/**
 * Compara dos valoraciones del mismo paciente
 * y del mismo episodio clínico.
 */
export function comparePainAssessments(
  initialAssessment: ClinicalPainAssessment,
  finalAssessment: ClinicalPainAssessment
): PainAssessmentComparison {
  if (
    initialAssessment.clientId !==
      finalAssessment.clientId ||
    initialAssessment.episodeId !==
      finalAssessment.episodeId
  ) {
    throw new Error(
      'Las valoraciones deben pertenecer al mismo paciente y episodio.'
    );
  }

  if (
    initialAssessment.assessmentId ===
    finalAssessment.assessmentId
  ) {
    throw new Error(
      'Selecciona dos valoraciones diferentes.'
    );
  }

  const initialDate = initialAssessment.createdAt;
  const finalDate = finalAssessment.createdAt;

  if (!initialDate || !finalDate) {
    throw new Error(
      'Las valoraciones deben tener una fecha válida.'
    );
  }

  const initialTimestamp = Date.parse(initialDate);
  const finalTimestamp = Date.parse(finalDate);

  if (
    !Number.isFinite(initialTimestamp) ||
    !Number.isFinite(finalTimestamp)
  ) {
    throw new Error(
      'Las fechas de las valoraciones no son válidas.'
    );
  }

  if (finalTimestamp <= initialTimestamp) {
    throw new Error(
      'La segunda valoración debe ser posterior a la primera.'
    );
  }

  const initialZones = createZoneMap(
    initialAssessment.zones
  );

  const finalZones = createZoneMap(
    finalAssessment.zones
  );

  const zoneIds = new Set([
    ...initialZones.keys(),
    ...finalZones.keys(),
  ]);

  const comparisons: PainZoneComparison[] = [];

  zoneIds.forEach((zoneId) => {
    const initial = initialZones.get(zoneId) ?? null;
    const final = finalZones.get(zoneId) ?? null;

    const zone = final ?? initial;

    if (!zone) return;

    let status: PainComparisonStatus;
    let difference: number | null = null;
    let reductionPercentage: number | null = null;

    if (initial && final) {
      difference = final.eva - initial.eva;

      if (difference < 0) {
        status = 'improved';
      } else if (difference > 0) {
        status = 'worsened';
      } else {
        status = 'stable';
      }

      if (initial.eva > 0) {
        reductionPercentage =
          ((initial.eva - final.eva) /
            initial.eva) *
          100;
      }
    } else if (final) {
      status = 'new';
    } else {
      status = 'notReassessed';
    }

    comparisons.push({
      zoneId,
      zoneName: zone.zoneName,
      view: zone.view,
      initial,
      final,
      difference,
      reductionPercentage,
      status,

      painTypeChanged:
        initial && final
          ? initial.painType !== final.painType
          : null,

      frequencyChanged:
        initial && final
          ? initial.frequency !== final.frequency
          : null,

      observationsChanged:
        initial && final
          ? initial.observations.trim() !==
            final.observations.trim()
          : null,
    });
  });

  const comparableZones = comparisons.filter(
    (zone) => zone.initial && zone.final
  );

  const comparableCount = comparableZones.length;

  const initialAverage =
    comparableCount > 0
      ? comparableZones.reduce(
          (total, zone) =>
            total + (zone.initial?.eva ?? 0),
          0
        ) / comparableCount
      : null;

  const finalAverage =
    comparableCount > 0
      ? comparableZones.reduce(
          (total, zone) =>
            total + (zone.final?.eva ?? 0),
          0
        ) / comparableCount
      : null;

  const averageDifference =
    initialAverage !== null &&
    finalAverage !== null
      ? finalAverage - initialAverage
      : null;

  const reductionPercentage =
    initialAverage !== null &&
    finalAverage !== null &&
    initialAverage > 0
      ? ((initialAverage - finalAverage) /
          initialAverage) *
        100
      : null;

  const summary: PainComparisonSummary = {
    totalRegions: comparisons.length,

    comparableRegions: comparableCount,

    improved: comparisons.filter(
      (zone) => zone.status === 'improved'
    ).length,

    worsened: comparisons.filter(
      (zone) => zone.status === 'worsened'
    ).length,

    stable: comparisons.filter(
      (zone) => zone.status === 'stable'
    ).length,

    newRegions: comparisons.filter(
      (zone) => zone.status === 'new'
    ).length,

    notReassessed: comparisons.filter(
      (zone) => zone.status === 'notReassessed'
    ).length,

    initialAverage,
    finalAverage,
    averageDifference,
    reductionPercentage,
  };

  return {
    initialAssessmentId:
      initialAssessment.assessmentId,

    finalAssessmentId:
      finalAssessment.assessmentId,

    initialDate,
    finalDate,

    zones: comparisons.sort((a, b) =>
      a.zoneName.localeCompare(b.zoneName, 'es')
    ),

    summary,
  };
}

/**
 * Configuración visual de cada resultado.
 */
export function getPainComparisonStatusInfo(
  status: PainComparisonStatus
) {
  switch (status) {
    case 'improved':
      return {
        label: 'Reducción del dolor',
        color: '#15803D',
        background: '#F0FDF4',
        icon: 'trending-down-outline',
      } as const;

    case 'worsened':
      return {
        label: 'Aumento del dolor',
        color: '#B91C1C',
        background: '#FEF2F2',
        icon: 'trending-up-outline',
      } as const;

    case 'stable':
      return {
        label: 'Sin cambios en EVA',
        color: '#B45309',
        background: '#FFFBEB',
        icon: 'remove-outline',
      } as const;

    case 'new':
      return {
        label: 'Nueva región valorada',
        color: '#1D4ED8',
        background: '#EFF6FF',
        icon: 'add-circle-outline',
      } as const;

    case 'notReassessed':
      return {
        label: 'Región no reevaluada',
        color: '#64748B',
        background: '#F1F5F9',
        icon: 'help-circle-outline',
      } as const;
  }
}
