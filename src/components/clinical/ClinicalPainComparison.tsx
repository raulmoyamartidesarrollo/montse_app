import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import ClinicalPainComparisonSelector
  from './ClinicalPainComparisonSelector';

import ClinicalPainComparisonSummary
  from './ClinicalPainComparisonSummary';

import ClinicalPainComparisonMap
  from './ClinicalPainComparisonMap';

import ClinicalPainComparisonDetailModal
  from './ClinicalPainComparisonDetailModal';

import {
  getMapEvaColors,
} from './ClinicalBodyDiagram';

import type {
  ClinicalPainAssessment,
} from '../../types/clinicalPain';

import {
  comparePainAssessments,
  getPainComparisonStatusInfo,
  type PainAssessmentComparison,
  type PainComparisonStatus,
} from '../../utils/clinicalPainComparison';

interface Props {
  assessments: ClinicalPainAssessment[];
}

type RegionFilter =
  | 'all'
  | PainComparisonStatus;

const FILTERS: {
  value: RegionFilter;
  label: string;
}[] = [
  {
    value: 'all',
    label: 'Todas',
  },
  {
    value: 'improved',
    label: 'Reducción',
  },
  {
    value: 'worsened',
    label: 'Aumento',
  },
  {
    value: 'stable',
    label: 'Sin cambios',
  },
  {
    value: 'new',
    label: 'Nuevas',
  },
  {
    value: 'notReassessed',
    label: 'No reevaluadas',
  },
];

export default function ClinicalPainComparison({
  assessments,
}: Props) {
  const [
    initialAssessmentId,
    setInitialAssessmentId,
  ] = useState<string | null>(null);

  const [
    finalAssessmentId,
    setFinalAssessmentId,
  ] = useState<string | null>(null);

  const [
    selectedRegionId,
    setSelectedRegionId,
  ] = useState<string | null>(null);

  const [
    regionFilter,
    setRegionFilter,
  ] = useState<RegionFilter>('all');

  const handleSelectionChange = useCallback(
    (
      initialId: string | null,
      finalId: string | null
    ) => {
      setInitialAssessmentId(initialId);
      setFinalAssessmentId(finalId);
      setSelectedRegionId(null);
      setRegionFilter('all');
    },
    []
  );

  const result = useMemo<{
    comparison: PainAssessmentComparison | null;
    error: string | null;
  }>(() => {
    if (
      !initialAssessmentId ||
      !finalAssessmentId
    ) {
      return {
        comparison: null,
        error: null,
      };
    }

    const initialAssessment =
      assessments.find(
        (item) =>
          item.assessmentId ===
          initialAssessmentId
      );

    const finalAssessment =
      assessments.find(
        (item) =>
          item.assessmentId ===
          finalAssessmentId
      );

    if (
      !initialAssessment ||
      !finalAssessment
    ) {
      return {
        comparison: null,
        error: null,
      };
    }

    try {
      return {
        comparison: comparePainAssessments(
          initialAssessment,
          finalAssessment
        ),
        error: null,
      };
    } catch {
      return {
        comparison: null,
        error:
          'No se pueden comparar las valoraciones seleccionadas.',
      };
    }
  }, [
    assessments,
    initialAssessmentId,
    finalAssessmentId,
  ]);

  const comparison = result.comparison;

  const selectedRegion =
    comparison?.zones.find(
      (zone) =>
        zone.zoneId === selectedRegionId
    ) ?? null;

  const filteredRegions = useMemo(() => {
    if (!comparison) {
      return [];
    }

    if (regionFilter === 'all') {
      return comparison.zones;
    }

    return comparison.zones.filter(
      (zone) => zone.status === regionFilter
    );
  }, [
    comparison,
    regionFilter,
  ]);

  const getFilterCount = (
    filter: RegionFilter
  ): number => {
    if (!comparison) return 0;

    if (filter === 'all') {
      return comparison.zones.length;
    }

    return comparison.zones.filter(
      (zone) => zone.status === filter
    ).length;
  };

  const renderEva = (
    value: number | null
  ) => (
    <Text
      style={[
        styles.regionEva,
        {
          color:
            value === null
              ? '#94A3B8'
              : getMapEvaColors(value).stroke,
        },
      ]}
    >
      {value === null
        ? '—'
        : `${value}/10`}
    </Text>
  );

  return (
    <View style={styles.container}>

      {/* SELECTOR DE VALORACIONES */}

      <ClinicalPainComparisonSelector
        assessments={assessments}
        initialAssessmentId={initialAssessmentId}
        finalAssessmentId={finalAssessmentId}
        onChange={handleSelectionChange}
      />

      {/* ERROR DE COMPARACIÓN */}

      {result.error && (
        <View style={styles.errorCard}>
          <Ionicons
            name="alert-circle-outline"
            size={24}
            color="#B91C1C"
          />

          <Text style={styles.errorText}>
            {result.error}
          </Text>
        </View>
      )}

      {comparison && (
        <>

          {/* RESUMEN ESTADÍSTICO */}

          <ClinicalPainComparisonSummary
            comparison={comparison}
          />

          {/* COMPARACIÓN ANATÓMICA */}

          <ClinicalPainComparisonMap
            key={JSON.stringify([
              comparison.initialAssessmentId,
              comparison.finalAssessmentId,
            ])}
            comparison={comparison}
            onRegionPress={(region) =>
              setSelectedRegionId(region.zoneId)
            }
          />

          {/* LISTADO COMPARATIVO */}

          <View style={styles.regionsContainer}>
            <View style={styles.header}>
              <Ionicons
                name="list-outline"
                size={24}
                color="#2563EB"
              />

              <View style={styles.headerContent}>
                <Text style={styles.title}>
                  Comparación por regiones
                </Text>

                <Text style={styles.subtitle}>
                  {comparison.zones.length}{' '}
                  regiones analizadas
                </Text>
              </View>
            </View>

            {/* FILTROS */}

            <View style={styles.filters}>
              {FILTERS.map((filter) => {
                const isSelected =
                  regionFilter === filter.value;

                return (
                  <Pressable
                    key={filter.value}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: isSelected,
                    }}
                    style={[
                      styles.filter,
                      isSelected &&
                        styles.activeFilter,
                    ]}
                    onPress={() =>
                      setRegionFilter(filter.value)
                    }
                  >
                    <Text
                      style={[
                        styles.filterText,
                        isSelected &&
                          styles.activeFilterText,
                      ]}
                    >
                      {filter.label}{' '}
                      ({getFilterCount(filter.value)})
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* RESULTADOS POR REGIÓN */}

            {filteredRegions.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons
                  name="information-circle-outline"
                  size={26}
                  color="#64748B"
                />

                <Text style={styles.emptyText}>
                  No hay regiones con este
                  resultado comparativo.
                </Text>
              </View>
            ) : (
              filteredRegions.map((region) => {
                const info =
                  getPainComparisonStatusInfo(
                    region.status
                  );

                return (
                  <Pressable
                    key={region.zoneId}
                    accessibilityRole="button"
                    accessibilityLabel={
                      `Consultar ${region.zoneName}`
                    }
                    style={styles.regionCard}
                    onPress={() =>
                      setSelectedRegionId(
                        region.zoneId
                      )
                    }
                  >
                    <View style={styles.regionHeader}>
                      <View
                        style={styles.headerContent}
                      >
                        <Text style={styles.regionName}>
                          {region.zoneName}
                        </Text>

                        <Text style={styles.regionView}>
                          {region.view === 'front'
                            ? 'Vista anterior'
                            : 'Vista posterior'}
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="#64748B"
                      />
                    </View>

                    <View style={styles.regionEvaRow}>
                      <View style={styles.regionEvaBlock}>
                        <Text style={styles.evaLabel}>
                          Referencia
                        </Text>

                        {renderEva(
                          region.initial?.eva ?? null
                        )}
                      </View>

                      <Ionicons
                        name="arrow-forward-outline"
                        size={18}
                        color="#64748B"
                      />

                      <View style={styles.regionEvaBlock}>
                        <Text style={styles.evaLabel}>
                          Posterior
                        </Text>

                        {renderEva(
                          region.final?.eva ?? null
                        )}
                      </View>

                      <View style={styles.regionEvaBlock}>
                        <Text style={styles.evaLabel}>
                          Diferencia
                        </Text>

                        <Text
                          style={[
                            styles.regionEva,
                            { color: info.color },
                          ]}
                        >
                          {region.difference === null
                            ? '—'
                            : `${
                                region.difference > 0
                                  ? '+'
                                  : ''
                              }${region.difference}`}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            info.background,
                        },
                      ]}
                    >
                      <Ionicons
                        name={info.icon}
                        size={17}
                        color={info.color}
                      />

                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: info.color,
                          },
                        ]}
                      >
                        {info.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}

            <Text style={styles.note}>
              El símbolo — indica que no existe
              una valoración comparable.
              No equivale a EVA 0.
            </Text>
          </View>

          {/* MODAL DE DETALLE */}

          <ClinicalPainComparisonDetailModal
            visible={selectedRegion !== null}
            region={selectedRegion}
            initialDate={comparison.initialDate}
            finalDate={comparison.finalDate}
            onClose={() =>
              setSelectedRegionId(null)
            }
          />

        </>
      )}

      <View style={styles.readOnly}>
        <Ionicons
          name="lock-closed-outline"
          size={15}
          color="#64748B"
        />

        <Text style={styles.readOnlyText}>
          Comparación clínica · Solo lectura
        </Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
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
    marginTop: 5,
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
  },

  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: '#B91C1C',
  },

  regionsContainer: {
    marginTop: 20,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },

  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 16,
  },

  filter: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  activeFilter: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },

  filterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },

  activeFilterText: {
    color: '#FFFFFF',
  },

  regionCard: {
    padding: 12,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },

  regionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  regionName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },

  regionView: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },

  regionEvaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    padding: 10,
    borderRadius: 9,
    backgroundColor: '#F8FAFC',
  },

  regionEvaBlock: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },

  evaLabel: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
  },

  regionEva: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 6,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 9,
    borderRadius: 8,
    marginTop: 10,
  },

  statusText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
  },

  emptyCard: {
    alignItems: 'center',
    gap: 10,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },

  emptyText: {
    fontSize: 12,
    lineHeight: 19,
    color: '#64748B',
    textAlign: 'center',
  },

  note: {
    fontSize: 11,
    lineHeight: 18,
    color: '#64748B',
    marginTop: 10,
  },

  readOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },

  readOnlyText: {
    fontSize: 11,
    color: '#64748B',
  },
});
