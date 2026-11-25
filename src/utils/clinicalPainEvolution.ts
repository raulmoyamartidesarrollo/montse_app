import type {
  BodyView,
  ClinicalPainAssessment,
  ClinicalPainZone,
} from '../types/clinicalPain';

export interface PainEvolutionPoint {
  assessmentId: string;
  createdAt: string;
  timestamp: number;
  eva: number;
  zone: ClinicalPainZone;
}

export interface PainEvolutionRegion {
  zoneId: string;
  zoneName: string;
  view: BodyView;
  assessmentCount: number;
}

export type PainEvolutionTrend =
  | 'improving'
  | 'worsening'
  | 'stable'
  | 'insufficient';

export interface PainEvolutionSummary {
  count: number;
  initial: number | null;
  current: number | null;
  minimum: number | null;
  maximum: number | null;
  average: number | null;
  difference: number | null;
  reductionPercentage: number | null;
  trend: PainEvolutionTrend;
  firstDate: string | null;
  lastDate: string | null;
}

function isValidEva(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 10
  );
}

/**
 * Recupera las regiones anatómicas que tienen
 * valoraciones registradas.
 */
export function getPainEvolutionRegions(
  assessments: ClinicalPainAssessment[]
): PainEvolutionRegion[] {
  const regions = new Map<string, PainEvolutionRegion>();

  assessments.forEach((assessment) => {
    const processed = new Set<string>();

    assessment.zones.forEach((zone) => {
      if (
        !isValidEva(zone.eva) ||
        processed.has(zone.zoneId)
      ) {
        return;
      }

      processed.add(zone.zoneId);

      const existing = regions.get(zone.zoneId);

      if (existing) {
        existing.assessmentCount += 1;
        return;
      }

      regions.set(zone.zoneId, {
        zoneId: zone.zoneId,
        zoneName: zone.zoneName,
        view: zone.view,
        assessmentCount: 1,
      });
    });
  });

  return Array.from(regions.values()).sort((a, b) =>
    a.zoneName.localeCompare(b.zoneName, 'es')
  );
}

/**
 * Obtiene las valoraciones de una región concreta,
 * ordenadas cronológicamente.
 *
 * Una región no valorada nunca equivale a EVA 0.
 */
export function getPainEvolutionPoints(
  assessments: ClinicalPainAssessment[],
  zoneId: string
): PainEvolutionPoint[] {
  const points: PainEvolutionPoint[] = [];

  assessments.forEach((assessment) => {
    if (!assessment.createdAt) {
      return;
    }

    const timestamp = Date.parse(
      assessment.createdAt
    );

    if (!Number.isFinite(timestamp)) {
      return;
    }

    const zone = assessment.zones.find(
      (item) =>
        item.zoneId === zoneId &&
        isValidEva(item.eva)
    );

    if (!zone) {
      return;
    }

    points.push({
      assessmentId: assessment.assessmentId,
      createdAt: assessment.createdAt,
      timestamp,
      eva: zone.eva,
      zone,
    });
  });

  return points.sort(
    (a, b) =>
      a.timestamp - b.timestamp ||
      a.assessmentId.localeCompare(b.assessmentId)
  );
}

/**
 * Calcula las estadísticas de una región anatómica.
 */
export function getPainEvolutionSummary(
  points: PainEvolutionPoint[]
): PainEvolutionSummary {
  if (points.length === 0) {
    return {
      count: 0,
      initial: null,
      current: null,
      minimum: null,
      maximum: null,
      average: null,
      difference: null,
      reductionPercentage: null,
      trend: 'insufficient',
      firstDate: null,
      lastDate: null,
    };
  }

  const orderedPoints = [...points].sort(
    (a, b) =>
      a.timestamp - b.timestamp ||
      a.assessmentId.localeCompare(b.assessmentId)
  );

  const first = orderedPoints[0];

  const last =
    orderedPoints[orderedPoints.length - 1];

  const values = orderedPoints.map(
    (point) => point.eva
  );

  const hasComparison =
    orderedPoints.length >= 2 &&
    last.timestamp > first.timestamp;

  const difference = hasComparison
    ? last.eva - first.eva
    : null;

  const reductionPercentage =
    hasComparison && first.eva > 0
      ? ((first.eva - last.eva) / first.eva) * 100
      : null;

  let trend: PainEvolutionTrend = 'insufficient';

  if (difference !== null) {
    if (difference < 0) {
      trend = 'improving';
    } else if (difference > 0) {
      trend = 'worsening';
    } else {
      trend = 'stable';
    }
  }

  return {
    count: orderedPoints.length,
    initial: first.eva,
    current: last.eva,
    minimum: Math.min(...values),
    maximum: Math.max(...values),
    average:
      values.reduce((total, eva) => total + eva, 0) /
      values.length,
    difference,
    reductionPercentage,
    trend,
    firstDate: first.createdAt,
    lastDate: last.createdAt,
  };
}

/**
 * Colores coherentes con el mapa corporal.
 */
export function getPainEvaColor(
  eva: number
): string {
  if (eva === 0) {
    return '#1D4ED8';
  }

  if (eva < 4) {
    return '#15803D';
  }

  if (eva < 7) {
    return '#B45309';
  }

  return '#B91C1C';
}

/**
 * Información visual sobre el cambio de EVA
 * entre la primera y la última valoración.
 */
export function getPainTrendInfo(
  trend: PainEvolutionTrend
) {
  switch (trend) {
    case 'improving':
      return {
        label: 'Reducción del dolor registrado',
        color: '#15803D',
        background: '#F0FDF4',
        icon: 'trending-down-outline',
      } as const;

    case 'worsening':
      return {
        label: 'Aumento del dolor registrado',
        color: '#B91C1C',
        background: '#FEF2F2',
        icon: 'trending-up-outline',
      } as const;

    case 'stable':
      return {
        label: 'Sin variación entre ambas valoraciones',
        color: '#B45309',
        background: '#FFFBEB',
        icon: 'remove-outline',
      } as const;

    default:
      return {
        label: 'Datos insuficientes para comparar',
        color: '#64748B',
        background: '#F1F5F9',
        icon: 'information-circle-outline',
      } as const;
  }
}

export function formatPainEvolutionDate(
  value: string | null
): string {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha';
  }

  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatPainEvolutionNumber(
  value: number
): string {
  return value.toLocaleString('es-ES', {
    maximumFractionDigits: 1,
  });
}
