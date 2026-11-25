import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../theme/colors';

import { BODY_ZONES } from '../../constants/bodyZones';

import type {
  ClinicalPainAssessment,
} from '../../types/clinicalPain';

import {
  getPatientPainAssessments,
} from '../../services/clinicalPainAssessments';

import {
  getPainEvolutionRegions,
  getPainEvolutionPoints,
  getPainEvolutionSummary,
  getPainEvaColor,
  getPainTrendInfo,
  formatPainEvolutionDate,
  formatPainEvolutionNumber,
  type PainEvolutionPoint,
} from '../../utils/clinicalPainEvolution';

import ClinicalPainEvolutionChart from './ClinicalPainEvolutionChart';
import ClinicalPainComparison from './ClinicalPainComparison';
import ClinicalPainZoneDetailModal from './ClinicalPainZoneDetailModal';

type EvolutionMode = 'evolution' | 'comparison';

interface Props {
  clientId: string;
  episodeId: string;
}

export default function ClinicalPainEvolution({
  clientId,
  episodeId,
}: Props) {
  const [assessments, setAssessments] = useState<
    ClinicalPainAssessment[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [evolutionMode, setEvolutionMode] =
    useState<EvolutionMode>('evolution');

  const [error, setError] =
    useState<string | null>(null);

  const [selectedZoneId, setSelectedZoneId] =
    useState<string | null>(null);

  const [selectorOpen, setSelectorOpen] =
    useState(false);

  const [selectedPoint, setSelectedPoint] =
    useState<PainEvolutionPoint | null>(null);

  const requestRef = useRef(0);

  const loadAssessments = useCallback(async () => {
    const requestId = ++requestRef.current;

    setLoading(true);
    setError(null);
    setSelectedPoint(null);
    setSelectorOpen(false);

    try {
      const result = await getPatientPainAssessments(
        clientId,
        episodeId
      );

      if (requestId !== requestRef.current) {
        return;
      }

      const validAssessments = result.filter(
        (assessment) =>
          assessment.clientId === clientId &&
          assessment.episodeId === episodeId
      );

      setAssessments(validAssessments);

      const regions = getPainEvolutionRegions(
        validAssessments
      );

      setSelectedZoneId((current) => {
        if (
          regions.some(
            (region) => region.zoneId === current
          )
        ) {
          return current;
        }

        return regions[0]?.zoneId ?? null;
      });
    } catch {
      if (requestId !== requestRef.current) {
        return;
      }

      setAssessments([]);
      setSelectedZoneId(null);

      setError(
        'No se ha podido cargar la evolución del dolor.'
      );
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }, [clientId, episodeId]);

  useEffect(() => {
    setEvolutionMode('evolution');
    setAssessments([]);
    setSelectedZoneId(null);
    setSelectedPoint(null);

    void loadAssessments();

    return () => {
      requestRef.current += 1;
    };
  }, [loadAssessments]);

  const episodeAssessments = useMemo(
    () =>
      assessments.filter(
        (assessment) =>
          assessment.clientId === clientId &&
          assessment.episodeId === episodeId
      ),
    [assessments, clientId, episodeId]
  );

  const regions = useMemo(
    () => getPainEvolutionRegions(episodeAssessments),
    [episodeAssessments]
  );

  const selectedRegion = regions.find(
    (region) => region.zoneId === selectedZoneId
  );

  const points = useMemo(
    () =>
      selectedZoneId
        ? getPainEvolutionPoints(
            episodeAssessments,
            selectedZoneId
          )
        : [],
    [episodeAssessments, selectedZoneId]
  );

  const summary = useMemo(
    () => getPainEvolutionSummary(points),
    [points]
  );

  const trend = getPainTrendInfo(summary.trend);

  const historyPoints = useMemo(
    () => [...points].reverse(),
    [points]
  );

  const frontRegions = regions.filter(
    (region) => region.view === 'front'
  );

  const backRegions = regions.filter(
    (region) => region.view === 'back'
  );

  const modalPoint =
    selectedPoint &&
    points.some(
      (point) =>
        point.assessmentId === selectedPoint.assessmentId
    )
      ? selectedPoint
      : null;

  const modalZone = modalPoint
    ? BODY_ZONES.find(
        (zone) => zone.id === modalPoint.zone.zoneId
      ) ?? {
        id: modalPoint.zone.zoneId,
        name: modalPoint.zone.zoneName,
        view: modalPoint.zone.view,
        path: '',
      }
    : null;

  const handleChangeMode = (mode: EvolutionMode) => {
    setEvolutionMode(mode);
    setSelectorOpen(false);
    setSelectedPoint(null);
  };

  const handleSelectRegion = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    setSelectedPoint(null);
    setSelectorOpen(false);
  };

  const formatDateTime = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Sin fecha';
    }

    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStat = (
    label: string,
    value: number | null,
    date?: string | null
  ) => (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>
        {label}
      </Text>

      <Text
        style={[
          styles.statValue,
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
          : formatPainEvolutionNumber(value)}

        {value !== null && (
          <Text style={styles.statUnit}>
            /10
          </Text>
        )}
      </Text>

      {date && (
        <Text style={styles.statDate}>
          {formatPainEvolutionDate(date)}
        </Text>
      )}
    </View>
  );

  const renderRegion = (
    region: (typeof regions)[number]
  ) => {
    const isSelected =
      selectedZoneId === region.zoneId;

    return (
      <Pressable
        key={region.zoneId}
        onPress={() =>
          handleSelectRegion(region.zoneId)
        }
        accessibilityRole="button"
        accessibilityState={{
          selected: isSelected,
        }}
        style={[
          styles.regionOption,
          isSelected &&
            styles.regionOptionSelected,
        ]}
      >
        <View style={styles.regionOptionContent}>
          <Text style={styles.regionOptionTitle}>
            {region.zoneName}
          </Text>

          <Text style={styles.regionOptionSubtitle}>
            {region.assessmentCount}{' '}
            {region.assessmentCount === 1
              ? 'valoración'
              : 'valoraciones'}
          </Text>
        </View>

        {isSelected && (
          <Ionicons
            name="checkmark-circle"
            size={21}
            color="#2563EB"
          />
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons
            name="analytics-outline"
            size={24}
            color={colors.primary}
          />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.title}>
            Evolución del dolor
          </Text>

          <Text style={styles.subtitle}>
            Seguimiento de intensidad EVA
          </Text>
        </View>

        <Pressable
          onPress={() => void loadAssessments()}
          disabled={loading}
          accessibilityLabel="Actualizar evolución del dolor"
          style={styles.refreshButton}
        >
          <Ionicons
            name="refresh-outline"
            size={20}
            color={colors.primary}
          />
        </Pressable>
      </View>

      {/* MODOS DE CONSULTA EVA */}

      <View style={styles.modeTabs}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            selected: evolutionMode === 'evolution',
            disabled: loading,
          }}
          disabled={loading}
          onPress={() => handleChangeMode('evolution')}
          style={[
            styles.modeTab,
            evolutionMode === 'evolution' &&
              styles.activeModeTab,
          ]}
        >
          <Ionicons
            name="analytics-outline"
            size={20}
            color={
              evolutionMode === 'evolution'
                ? '#FFFFFF'
                : '#64748B'
            }
          />

          <Text
            style={[
              styles.modeTabText,
              evolutionMode === 'evolution' &&
                styles.activeModeTabText,
            ]}
          >
            Evolución por región
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            selected: evolutionMode === 'comparison',
            disabled: loading,
          }}
          disabled={loading}
          onPress={() => handleChangeMode('comparison')}
          style={[
            styles.modeTab,
            evolutionMode === 'comparison' &&
              styles.activeModeTab,
          ]}
        >
          <Ionicons
            name="git-compare-outline"
            size={20}
            color={
              evolutionMode === 'comparison'
                ? '#FFFFFF'
                : '#64748B'
            }
          />

          <Text
            style={[
              styles.modeTabText,
              evolutionMode === 'comparison' &&
                styles.activeModeTabText,
            ]}
          >
            Comparar valoraciones
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.messageContainer}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />

          <Text style={styles.message}>
            Cargando evolución del dolor...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.messageContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={32}
            color="#DC2626"
          />

          <Text style={styles.message}>
            {error}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => void loadAssessments()}
          >
            <Text style={styles.retryText}>
              Reintentar
            </Text>
          </Pressable>
        </View>
      ) : regions.length === 0 ? (
        <View style={styles.messageContainer}>
          <Ionicons
            name="analytics-outline"
            size={42}
            color="#94A3B8"
          />

          <Text style={styles.emptyTitle}>
            Sin valoraciones del dolor
          </Text>

          <Text style={styles.message}>
            La evolución aparecerá cuando existan
            valoraciones EVA registradas en el
            mapa corporal de este episodio.
          </Text>
        </View>
      ) : (
        <>
          {episodeAssessments.length >= 100 && (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                Se muestran hasta las últimas 100
                valoraciones del episodio. Los
                indicadores corresponden únicamente
                al historial cargado.
              </Text>
            </View>
          )}

          {evolutionMode === 'comparison' ? (
            <ClinicalPainComparison
              key={JSON.stringify([clientId, episodeId])}
              assessments={episodeAssessments}
            />
          ) : (
            <>
              <Text style={styles.sectionLabel}>
                Región anatómica
              </Text>

              <Pressable
                style={styles.selector}
                accessibilityRole="button"
                accessibilityState={{
                  expanded: selectorOpen,
                }}
                onPress={() =>
                  setSelectorOpen((current) => !current)
                }
              >
                <Ionicons
                  name="body-outline"
                  size={21}
                  color="#2563EB"
                />

                <View style={styles.selectorContent}>
                  <Text style={styles.selectorTitle}>
                    {selectedRegion?.zoneName ??
                      'Seleccionar región'}
                  </Text>

                  {selectedRegion && (
                    <Text style={styles.selectorSubtitle}>
                      {selectedRegion.view === 'front'
                        ? 'Vista anterior'
                        : 'Vista posterior'}
                    </Text>
                  )}
                </View>

                <Ionicons
                  name={
                    selectorOpen
                      ? 'chevron-up'
                      : 'chevron-down'
                  }
                  size={20}
                  color="#64748B"
                />
              </Pressable>

              {selectorOpen && (
                <View style={styles.regionOptions}>
                  {frontRegions.length > 0 && (
                    <>
                      <Text style={styles.groupTitle}>
                        VISTA ANTERIOR
                      </Text>

                      {frontRegions.map(renderRegion)}
                    </>
                  )}

                  {backRegions.length > 0 && (
                    <>
                      <Text style={styles.groupTitle}>
                        VISTA POSTERIOR
                      </Text>

                      {backRegions.map(renderRegion)}
                    </>
                  )}
                </View>
              )}

              {selectedRegion && (
                <>
                  <View style={styles.regionSummary}>
                    <Text style={styles.regionSummaryText}>
                      {points.length} valoraciones con fecha
                      válida · {selectedRegion.zoneName}
                    </Text>
                  </View>

                  <View style={styles.statsRow}>
                    {renderStat(
                      'EVA inicial',
                      summary.initial,
                      summary.firstDate
                    )}

                    {renderStat(
                      'Último EVA',
                      summary.current,
                      summary.lastDate
                    )}
                  </View>

                  <View style={styles.statsRow}>
                    {renderStat(
                      'EVA mínima',
                      summary.minimum
                    )}

                    {renderStat(
                      'EVA máxima',
                      summary.maximum
                    )}

                    {renderStat(
                      'EVA media',
                      summary.average
                    )}
                  </View>

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
                      size={28}
                      color={trend.color}
                    />

                    <View style={styles.trendContent}>
                      <Text
                        style={[
                          styles.trendTitle,
                          { color: trend.color },
                        ]}
                      >
                        {trend.label}
                      </Text>

                      {summary.difference !== null && (
                        <Text
                          style={[
                            styles.trendValue,
                            { color: trend.color },
                          ]}
                        >
                          {summary.difference > 0
                            ? '+'
                            : ''}

                          {formatPainEvolutionNumber(
                            summary.difference
                          )}{' '}
                          puntos EVA
                        </Text>
                      )}

                      {summary.reductionPercentage !==
                        null && (
                        <Text
                          style={[
                            styles.trendPercentage,
                            { color: trend.color },
                          ]}
                        >
                          {formatPainEvolutionNumber(
                            Math.abs(
                              summary.reductionPercentage
                            )
                          )}%{' '}
                          {summary.reductionPercentage < 0
                            ? 'de aumento'
                            : 'de reducción'}
                        </Text>
                      )}

                      {summary.initial === 0 &&
                        summary.difference !== null && (
                          <Text style={styles.smallText}>
                            No se calcula un porcentaje
                            porque el EVA inicial es cero.
                          </Text>
                        )}

                      {summary.trend ===
                        'insufficient' && (
                        <Text style={styles.smallText}>
                          Se necesitan valoraciones en
                          momentos distintos.
                        </Text>
                      )}
                    </View>
                  </View>

                  <ClinicalPainEvolutionChart
                    points={points}
                    selectedAssessmentId={
                      modalPoint?.assessmentId
                    }
                    onPointPress={setSelectedPoint}
                  />

                  <Text style={styles.sectionTitle}>
                    Historial de la región
                  </Text>

                  {historyPoints.length === 0 ? (
                    <Text style={styles.message}>
                      No hay valoraciones con fecha válida.
                    </Text>
                  ) : (
                    historyPoints.map((point) => (
                      <Pressable
                        key={point.assessmentId}
                        style={styles.historyCard}
                        onPress={() =>
                          setSelectedPoint(point)
                        }
                        accessibilityRole="button"
                        accessibilityLabel={
                          `Consultar valoración EVA ${point.eva}, ` +
                          formatDateTime(point.createdAt)
                        }
                      >
                        <View
                          style={[
                            styles.historyEvaBadge,
                            {
                              backgroundColor:
                                getPainEvaColor(point.eva),
                            },
                          ]}
                        >
                          <Text style={styles.historyEva}>
                            {point.eva}
                          </Text>

                          <Text style={styles.historyEvaUnit}>
                            EVA
                          </Text>
                        </View>

                        <View style={styles.historyContent}>
                          <Text style={styles.historyDate}>
                            {formatDateTime(point.createdAt)}
                          </Text>

                          <Text style={styles.historyRegion}>
                            {point.zone.zoneName}
                          </Text>
                        </View>

                        <Ionicons
                          name="chevron-forward"
                          size={19}
                          color="#94A3B8"
                        />
                      </Pressable>
                    ))
                  )}

                  <Text style={styles.disclaimer}>
                    Los indicadores describen el dolor
                    registrado en esta región. No
                    representan por sí solos el grado
                    de recuperación del paciente.
                  </Text>
                </>
              )}
            </>
          )}
        </>
      )}

      <ClinicalPainZoneDetailModal
        visible={
          evolutionMode === 'evolution' &&
          modalPoint !== null
        }
        zone={modalZone}
        assessment={modalPoint?.zone}
        assessmentDate={modalPoint?.createdAt}
        hasSelectedAssessment={modalPoint !== null}
        onClose={() => setSelectedPoint(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },

  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerContent: {
    flex: 1,
  },

  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },

  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },

  refreshButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.background,
  },

  modeTabs: {
    flexDirection: 'row',
    gap: 8,
    padding: 5,
    marginBottom: 20,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
  },

  modeTab: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    paddingHorizontal: 5,
    borderRadius: 10,
  },

  activeModeTab: {
    backgroundColor: '#2563EB',
  },

  modeTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },

  activeModeTabText: {
    color: '#FFFFFF',
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 9,
  },

  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },

  selectorContent: {
    flex: 1,
  },

  selectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },

  selectorSubtitle: {
    marginTop: 4,
    fontSize: 11,
    color: '#64748B',
  },

  regionOptions: {
    padding: 10,
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginVertical: 10,
  },

  regionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  regionOptionSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },

  regionOptionContent: {
    flex: 1,
  },

  regionOptionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },

  regionOptionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 5,
  },

  regionSummary: {
    marginVertical: 15,
  },

  regionSummaryText: {
    fontSize: 12,
    color: '#64748B',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },

  statCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },

  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },

  statValue: {
    fontSize: 26,
    fontWeight: '700',
    marginTop: 8,
  },

  statUnit: {
    fontSize: 11,
    color: '#94A3B8',
  },

  statDate: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 6,
  },

  trendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    marginTop: 6,
    marginBottom: 10,
  },

  trendContent: {
    flex: 1,
  },

  trendTitle: {
    fontSize: 13,
    fontWeight: '600',
  },

  trendValue: {
    fontSize: 23,
    fontWeight: '700',
    marginTop: 6,
  },

  trendPercentage: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },

  smallText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 17,
    marginTop: 6,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 20,
    marginBottom: 12,
  },

  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 9,
  },

  historyEvaBadge: {
    width: 44,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  historyEva: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  historyEvaUnit: {
    fontSize: 9,
    color: '#FFFFFF',
  },

  historyContent: {
    flex: 1,
  },

  historyDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },

  historyRegion: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 5,
  },

  messageContainer: {
    alignItems: 'center',
    paddingVertical: 35,
    paddingHorizontal: 12,
    gap: 12,
  },

  message: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'center',
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },

  retryButton: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
  },

  retryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },

  notice: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },

  noticeText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },

  disclaimer: {
    fontSize: 11,
    lineHeight: 18,
    color: '#64748B',
    marginTop: 14,
  },
});
