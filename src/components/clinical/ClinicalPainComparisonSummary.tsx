import React from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import type {
  PainAssessmentComparison,
  PainComparisonStatus,
} from '../../utils/clinicalPainComparison';

import {
  getPainComparisonStatusInfo,
} from '../../utils/clinicalPainComparison';

import {
  getPainEvaColor,
  formatPainEvolutionNumber,
} from '../../utils/clinicalPainEvolution';

interface Props {
  comparison: PainAssessmentComparison;
}

export default function ClinicalPainComparisonSummary({
  comparison,
}: Props) {
  const { summary } = comparison;

  const hasComparableRegions =
    summary.comparableRegions > 0;

  const difference = summary.averageDifference;

  const percentage = summary.reductionPercentage;

  const trendStatus: PainComparisonStatus =
    difference !== null && difference < 0
      ? 'improved'
      : difference !== null && difference > 0
        ? 'worsened'
        : 'stable';

  const trend =
    getPainComparisonStatusInfo(trendStatus);

  const formatNumber = (value: number) =>
    formatPainEvolutionNumber(value);

  const formatSignedNumber = (value: number) =>
    `${value > 0 ? '+' : ''}${formatNumber(value)}`;

  const renderStatusCard = (
    status: PainComparisonStatus,
    count: number,
    label: string
  ) => {
    const info =
      getPainComparisonStatusInfo(status);

    return (
      <View
        style={[
          styles.statusCard,
          {
            backgroundColor: info.background,
          },
        ]}
        accessible
        accessibilityLabel={`${label}: ${count}`}
      >
        <Ionicons
          name={info.icon}
          size={25}
          color={info.color}
        />

        <Text
          style={[
            styles.statusValue,
            { color: info.color },
          ]}
        >
          {count}
        </Text>

        <Text
          style={[
            styles.statusLabel,
            { color: info.color },
          ]}
        >
          {label}
        </Text>
      </View>
    );
  };

  const renderEvaValue = (
    label: string,
    value: number | null
  ) => (
    <View style={styles.evaCard}>
      <Text style={styles.evaLabel}>
        {label}
      </Text>

      <Text
        style={[
          styles.evaValue,
          {
            color:
              value === null
                ? '#94A3B8'
                : getPainEvaColor(value),
          },
        ]}
      >
        {value === null
          ? '—'
          : formatNumber(value)}

        {value !== null && (
          <Text style={styles.evaUnit}>
            /10
          </Text>
        )}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons
          name="stats-chart-outline"
          size={23}
          color="#2563EB"
        />

        <View style={styles.headerContent}>
          <Text style={styles.title}>
            Resumen comparativo
          </Text>

          <Text style={styles.subtitle}>
            Resultados entre ambas valoraciones
          </Text>
        </View>
      </View>

      {/* REGIONES ANALIZADAS */}

      <View style={styles.coverageCard}>
        <View style={styles.coverageItem}>
          <Text style={styles.coverageValue}>
            {summary.totalRegions}
          </Text>

          <Text style={styles.coverageLabel}>
            Regiones totales
          </Text>
        </View>

        <View style={styles.coverageDivider} />

        <View style={styles.coverageItem}>
          <Text style={styles.coverageValue}>
            {summary.comparableRegions}
          </Text>

          <Text style={styles.coverageLabel}>
            Regiones comunes
          </Text>
        </View>
      </View>

      {/* RESULTADOS DE LAS REGIONES COMUNES */}

      <Text style={styles.sectionTitle}>
        Cambios en las regiones comunes
      </Text>

      <View style={styles.row}>
        {renderStatusCard(
          'improved',
          summary.improved,
          'Reducción'
        )}

        {renderStatusCard(
          'worsened',
          summary.worsened,
          'Aumento'
        )}

        {renderStatusCard(
          'stable',
          summary.stable,
          'Sin cambios'
        )}
      </View>

      {/* CAMBIOS EN LAS REGIONES VALORADAS */}

      <Text style={styles.sectionTitle}>
        Otras regiones
      </Text>

      <View style={styles.row}>
        {renderStatusCard(
          'new',
          summary.newRegions,
          'Nuevas valoradas'
        )}

        {renderStatusCard(
          'notReassessed',
          summary.notReassessed,
          'No reevaluadas'
        )}
      </View>

      {/* COMPARACIÓN EVA */}

      <Text style={styles.sectionTitle}>
        Comparación de intensidad EVA
      </Text>

      {hasComparableRegions ? (
        <>
          <Text style={styles.description}>
            Calculada exclusivamente sobre las{' '}
            {summary.comparableRegions}{' '}
            {summary.comparableRegions === 1
              ? 'región presente'
              : 'regiones presentes'}{' '}
            en ambas valoraciones.
          </Text>

          <View style={styles.evaRow}>
            {renderEvaValue(
              'EVA medio inicial',
              summary.initialAverage
            )}

            <Ionicons
              name="arrow-forward-outline"
              size={23}
              color="#64748B"
            />

            {renderEvaValue(
              'EVA medio posterior',
              summary.finalAverage
            )}
          </View>

          {difference !== null && (
            <View
              style={[
                styles.trendCard,
                {
                  backgroundColor:
                    trend.background,
                },
              ]}
            >
              <Ionicons
                name={trend.icon}
                size={32}
                color={trend.color}
              />

              <View style={styles.trendContent}>
                <Text
                  style={[
                    styles.trendLabel,
                    { color: trend.color },
                  ]}
                >
                  {difference < 0
                    ? 'Reducción del EVA medio'
                    : difference > 0
                      ? 'Aumento del EVA medio'
                      : 'Sin variación del EVA medio'}
                </Text>

                <Text
                  style={[
                    styles.trendValue,
                    { color: trend.color },
                  ]}
                >
                  {formatSignedNumber(difference)}{' '}
                  puntos EVA
                </Text>

                {percentage !== null && (
                  <Text
                    style={[
                      styles.percentage,
                      { color: trend.color },
                    ]}
                  >
                    {percentage === 0
                      ? '0 % de variación'
                      : `${formatNumber(
                          Math.abs(percentage)
                        )} % de ${
                          percentage > 0
                            ? 'reducción'
                            : 'aumento'
                        }`}
                  </Text>
                )}

                {percentage === null &&
                  summary.initialAverage === 0 && (
                    <Text style={styles.smallText}>
                      No se calcula el porcentaje
                      porque el EVA medio inicial
                      es cero.
                    </Text>
                  )}
              </View>
            </View>
          )}
        </>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons
            name="information-circle-outline"
            size={30}
            color="#64748B"
          />

          <Text style={styles.emptyTitle}>
            No existen regiones comunes
          </Text>

          <Text style={styles.emptyText}>
            Las dos valoraciones contienen regiones
            diferentes. No es posible calcular una
            variación comparable del EVA medio.
          </Text>
        </View>
      )}

      {/* AVISOS CLÍNICOS */}

      {summary.notReassessed > 0 && (
        <View style={styles.warningCard}>
          <Ionicons
            name="alert-circle-outline"
            size={22}
            color="#B45309"
          />

          <Text style={styles.warningText}>
            Hay {summary.notReassessed}{' '}
            {summary.notReassessed === 1
              ? 'región no reevaluada'
              : 'regiones no reevaluadas'}.
            {' '}La ausencia de una nueva valoración
            no significa que el dolor haya desaparecido.
          </Text>
        </View>
      )}

      {summary.newRegions > 0 && (
        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color="#2563EB"
          />

          <Text style={styles.infoText}>
            Las nuevas regiones valoradas no implican
            necesariamente la aparición de un dolor nuevo.
            No disponemos de un EVA anterior comparable.
          </Text>
        </View>
      )}

      <Text style={styles.disclaimer}>
        Los resultados representan cambios en la
        intensidad del dolor registrada y no constituyen
        por sí solos una medida de recuperación clínica.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },

  headerContent: {
    flex: 1,
  },

  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },

  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },

  coverageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 18,
    marginBottom: 8,
  },

  coverageItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 5,
  },

  coverageValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
  },

  coverageLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 5,
    textAlign: 'center',
  },

  coverageDivider: {
    width: 1,
    height: 45,
    backgroundColor: '#CBD5E1',
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 18,
    marginBottom: 12,
  },

  row: {
    flexDirection: 'row',
    gap: 8,
  },

  statusCard: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 4,
    borderRadius: 12,
  },

  statusValue: {
    fontSize: 27,
    fontWeight: '700',
    marginTop: 8,
  },

  statusLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 5,
  },

  description: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12,
  },

  evaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  evaCard: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingVertical: 17,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  evaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },

  evaValue: {
    fontSize: 29,
    fontWeight: '700',
    marginTop: 9,
  },

  evaUnit: {
    fontSize: 12,
    color: '#94A3B8',
  },

  trendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginTop: 14,
  },

  trendContent: {
    flex: 1,
  },

  trendLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  trendValue: {
    fontSize: 23,
    fontWeight: '700',
    marginTop: 6,
  },

  percentage: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 5,
  },

  smallText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 17,
    marginTop: 6,
  },

  emptyCard: {
    alignItems: 'center',
    gap: 10,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },

  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 12,
    lineHeight: 19,
    color: '#64748B',
    textAlign: 'center',
  },

  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFFBEB',
    marginTop: 14,
  },

  warningText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    lineHeight: 18,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    marginTop: 10,
  },

  infoText: {
    flex: 1,
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 18,
  },

  disclaimer: {
    fontSize: 11,
    lineHeight: 18,
    color: '#64748B',
    marginTop: 16,
  },
});
