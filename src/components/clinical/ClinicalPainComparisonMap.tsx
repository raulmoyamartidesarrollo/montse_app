import React, {
  useEffect,
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

import ClinicalBodyDiagram, {
  getMapEvaColors,
  type ClinicalBodyZoneColors,
} from './ClinicalBodyDiagram';

import { BODY_ZONES } from '../../constants/bodyZones';

import type {
  BodyView,
  BodyZone,
} from '../../types/clinicalPain';

import {
  getPainComparisonStatusInfo,
  type PainAssessmentComparison,
  type PainComparisonStatus,
  type PainZoneComparison,
} from '../../utils/clinicalPainComparison';

import {
  formatPainEvolutionDate,
  formatPainEvolutionNumber,
} from '../../utils/clinicalPainEvolution';

interface Props {
  comparison: PainAssessmentComparison;
  onRegionPress?: (region: PainZoneComparison) => void;
}

type DisplayMode = 'intensity' | 'variation';

const VARIATION_COLORS: Record<
  PainComparisonStatus,
  ClinicalBodyZoneColors
> = {
  improved: {
    fill: '#22C55E',
    stroke: '#15803D',
  },

  worsened: {
    fill: '#EF4444',
    stroke: '#B91C1C',
  },

  stable: {
    fill: '#F59E0B',
    stroke: '#B45309',
  },

  new: {
    fill: '#3B82F6',
    stroke: '#1D4ED8',
  },

  notReassessed: {
    fill: '#94A3B8',
    stroke: '#475569',
  },
};

const INTENSITY_LEGEND = [
  {
    color: '#CBD5E1',
    label: 'Sin valoración',
  },
  {
    color: '#3B82F6',
    label: 'EVA 0',
  },
  {
    color: '#22C55E',
    label: 'EVA 1-3',
  },
  {
    color: '#F59E0B',
    label: 'EVA 4-6',
  },
  {
    color: '#EF4444',
    label: 'EVA 7-10',
  },
];

const VARIATION_LEGEND = [
  {
    color: '#22C55E',
    label: 'Reducción',
  },
  {
    color: '#EF4444',
    label: 'Aumento',
  },
  {
    color: '#F59E0B',
    label: 'Sin cambios',
  },
  {
    color: '#3B82F6',
    label: 'Nueva valorada',
  },
  {
    color: '#94A3B8',
    label: 'No reevaluada',
  },
];

export default function ClinicalPainComparisonMap({
  comparison,
  onRegionPress,
}: Props) {
  const [bodyView, setBodyView] =
    useState<BodyView>('front');

  const [displayMode, setDisplayMode] =
    useState<DisplayMode>('intensity');

  const [selectedZoneId, setSelectedZoneId] =
    useState<string | null>(null);

  useEffect(() => {
    setSelectedZoneId(null);
  }, [
    comparison.initialAssessmentId,
    comparison.finalAssessmentId,
  ]);

  const selectedRegion = comparison.zones.find(
    (zone) => zone.zoneId === selectedZoneId
  );

  const selectedBodyZone = BODY_ZONES.find(
    (zone) => zone.id === selectedZoneId
  );

  const legacyZoneIds = useMemo(
    () =>
      BODY_ZONES.filter(
        (zone) =>
          zone.legacy &&
          comparison.zones.some(
            (item) => item.zoneId === zone.id
          )
      ).map((zone) => zone.id),
    [comparison.zones]
  );

  const { initialColors, finalColors } = useMemo(() => {
    const initialColors: Record<
      string,
      ClinicalBodyZoneColors
    > = {};

    const finalColors: Record<
      string,
      ClinicalBodyZoneColors
    > = {};

    comparison.zones.forEach((zone) => {
      if (displayMode === 'intensity') {
        if (zone.initial) {
          initialColors[zone.zoneId] =
            getMapEvaColors(zone.initial.eva);
        }

        if (zone.final) {
          finalColors[zone.zoneId] =
            getMapEvaColors(zone.final.eva);
        }

        return;
      }

      const variationColor =
        VARIATION_COLORS[zone.status];

      if (zone.initial) {
        initialColors[zone.zoneId] =
          variationColor;
      }

      if (zone.final) {
        finalColors[zone.zoneId] =
          variationColor;
      }
    });

    return {
      initialColors,
      finalColors,
    };
  }, [
    comparison.zones,
    displayMode,
  ]);

  const handleSelectZone = (zone: BodyZone) => {
    setSelectedZoneId(zone.id);
  };

  const handleChangeView = (view: BodyView) => {
    setBodyView(view);
    setSelectedZoneId(null);
  };

  const renderEva = (
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
                ? '#64748B'
                : getMapEvaColors(value).stroke,
          },
        ]}
      >
        {value === null
          ? '—'
          : `${value}/10`}
      </Text>

      {value === null && (
        <Text style={styles.notAssessed}>
          Sin valoración
        </Text>
      )}
    </View>
  );

  const renderOrientation = () => (
    <View style={styles.orientationRow}>
      <Text style={styles.orientationLetter}>
        {bodyView === 'front' ? 'D' : 'I'}
      </Text>

      <Text style={styles.orientationLetter}>
        {bodyView === 'front' ? 'I' : 'D'}
      </Text>
    </View>
  );

  const renderMap = (
    title: string,
    date: string,
    colors: Record<string, ClinicalBodyZoneColors>
  ) => (
    <View style={styles.mapCard}>
      <Text style={styles.mapTitle}>
        {title}
      </Text>

      <Text style={styles.mapDate}>
        {formatPainEvolutionDate(date)}
      </Text>

      {renderOrientation()}

      <ClinicalBodyDiagram
        bodyView={bodyView}
        zoneColors={colors}
        legacyZoneIds={legacyZoneIds}
        selectedZoneId={selectedZoneId}
        width="100%"
        height={280}
        onZonePress={handleSelectZone}
      />
    </View>
  );

  const legend =
    displayMode === 'intensity'
      ? INTENSITY_LEGEND
      : VARIATION_LEGEND;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons
          name="body-outline"
          size={24}
          color="#2563EB"
        />

        <View style={styles.headerContent}>
          <Text style={styles.title}>
            Comparación anatómica
          </Text>

          <Text style={styles.subtitle}>
            Consulta simultánea de ambas valoraciones
          </Text>
        </View>
      </View>

      {/* SELECTOR DE VISTA CORPORAL */}

      <View style={styles.tabs}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            selected: bodyView === 'front',
          }}
          style={[
            styles.tab,
            bodyView === 'front' &&
              styles.activeTab,
          ]}
          onPress={() =>
            handleChangeView('front')
          }
        >
          <Text
            style={[
              styles.tabText,
              bodyView === 'front' &&
                styles.activeTabText,
            ]}
          >
            Vista anterior
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            selected: bodyView === 'back',
          }}
          style={[
            styles.tab,
            bodyView === 'back' &&
              styles.activeTab,
          ]}
          onPress={() =>
            handleChangeView('back')
          }
        >
          <Text
            style={[
              styles.tabText,
              bodyView === 'back' &&
                styles.activeTabText,
            ]}
          >
            Vista posterior
          </Text>
        </Pressable>
      </View>

      {/* SELECTOR DEL MODO DE VISUALIZACIÓN */}

      <View style={styles.modeTabs}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            selected: displayMode === 'intensity',
          }}
          style={[
            styles.modeTab,
            displayMode === 'intensity' &&
              styles.activeModeTab,
          ]}
          onPress={() =>
            setDisplayMode('intensity')
          }
        >
          <Ionicons
            name="color-palette-outline"
            size={17}
            color={
              displayMode === 'intensity'
                ? '#2563EB'
                : '#64748B'
            }
          />

          <Text
            style={[
              styles.modeText,
              displayMode === 'intensity' &&
                styles.activeModeText,
            ]}
          >
            Intensidad EVA
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            selected: displayMode === 'variation',
          }}
          style={[
            styles.modeTab,
            displayMode === 'variation' &&
              styles.activeModeTab,
          ]}
          onPress={() =>
            setDisplayMode('variation')
          }
        >
          <Ionicons
            name="git-compare-outline"
            size={17}
            color={
              displayMode === 'variation'
                ? '#2563EB'
                : '#64748B'
            }
          />

          <Text
            style={[
              styles.modeText,
              displayMode === 'variation' &&
                styles.activeModeText,
            ]}
          >
            Variación
          </Text>
        </Pressable>
      </View>

      {/* MAPAS CORPORALES */}

      <View style={styles.mapsRow}>
        {renderMap(
          'Referencia',
          comparison.initialDate,
          initialColors
        )}

        {renderMap(
          'Posterior',
          comparison.finalDate,
          finalColors
        )}
      </View>

      <Text style={styles.mapHelp}>
        Pulsa una región de cualquiera de los mapas
        para seleccionarla simultáneamente en ambos.
      </Text>

      {/* LEYENDA */}

      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>
          {displayMode === 'intensity'
            ? 'Intensidad del dolor registrada'
            : 'Variación entre valoraciones'}
        </Text>

        <View style={styles.legend}>
          {legend.map((item) => (
            <View
              key={item.label}
              style={styles.legendItem}
            >
              <View
                style={[
                  styles.legendColor,
                  {
                    backgroundColor: item.color,
                  },
                ]}
              />

              <Text style={styles.legendText}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        {displayMode === 'variation' && (
          <Text style={styles.legendNote}>
            Los colores representan el resultado
            comparativo de cada región valorada,
            no su intensidad EVA.
            Las regiones sin valoración conservan
            su color anatómico neutro.
          </Text>
        )}
      </View>

      {/* REGIÓN SELECCIONADA */}

      {selectedBodyZone ? (
        <View style={styles.selectedCard}>
          <View style={styles.selectedHeader}>
            <View style={styles.headerContent}>
              <Text style={styles.selectedTitle}>
                {selectedBodyZone.name}
              </Text>

              <Text style={styles.subtitle}>
                Región seleccionada
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar selección"
              onPress={() =>
                setSelectedZoneId(null)
              }
              style={styles.closeButton}
            >
              <Ionicons
                name="close"
                size={22}
                color="#64748B"
              />
            </Pressable>
          </View>

          <View style={styles.evaRow}>
            {renderEva(
              'Referencia',
              selectedRegion?.initial?.eva ?? null
            )}

            <Ionicons
              name="arrow-forward-outline"
              size={22}
              color="#64748B"
            />

            {renderEva(
              'Posterior',
              selectedRegion?.final?.eva ?? null
            )}
          </View>

          {selectedRegion ? (
            <>
              <View
                style={[
                  styles.resultCard,
                  {
                    backgroundColor:
                      getPainComparisonStatusInfo(
                        selectedRegion.status
                      ).background,
                  },
                ]}
              >
                <Ionicons
                  name={
                    getPainComparisonStatusInfo(
                      selectedRegion.status
                    ).icon
                  }
                  size={27}
                  color={
                    getPainComparisonStatusInfo(
                      selectedRegion.status
                    ).color
                  }
                />

                <View style={styles.headerContent}>
                  <Text
                    style={[
                      styles.resultTitle,
                      {
                        color:
                          getPainComparisonStatusInfo(
                            selectedRegion.status
                          ).color,
                      },
                    ]}
                  >
                    {
                      getPainComparisonStatusInfo(
                        selectedRegion.status
                      ).label
                    }
                  </Text>

                  {selectedRegion.difference !== null && (
                    <Text style={styles.resultText}>
                      {selectedRegion.difference > 0
                        ? '+'
                        : ''}
                      {selectedRegion.difference}{' '}
                      puntos EVA
                    </Text>
                  )}

                  {selectedRegion.reductionPercentage !== null && (
                    <Text style={styles.resultText}>
                      {selectedRegion.reductionPercentage === 0
                        ? '0 % de variación'
                        : `${formatPainEvolutionNumber(
                            Math.abs(
                              selectedRegion.reductionPercentage
                            )
                          )} % de ${
                            selectedRegion.reductionPercentage > 0
                              ? 'reducción'
                              : 'aumento'
                          }`}
                    </Text>
                  )}
                </View>
              </View>

              {onRegionPress && (
                <Pressable
                  accessibilityRole="button"
                  style={styles.detailButton}
                  onPress={() =>
                    onRegionPress(selectedRegion)
                  }
                >
                  <Ionicons
                    name="document-text-outline"
                    size={19}
                    color="#FFFFFF"
                  />

                  <Text style={styles.detailButtonText}>
                    Ver detalle comparativo
                  </Text>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#FFFFFF"
                  />
                </Pressable>
              )}
            </>
          ) : (
            <Text style={styles.emptyText}>
              Esta región no dispone de una
              valoración EVA válida en ninguno
              de los dos registros seleccionados.
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.infoCard}>
          <Ionicons
            name="hand-left-outline"
            size={22}
            color="#2563EB"
          />

          <Text style={styles.infoText}>
            Selecciona una región corporal para
            consultar sus valores y cambios.
          </Text>
        </View>
      )}

      <Text style={styles.disclaimer}>
        La orientación izquierda y derecha corresponde
        a la perspectiva anatómica del paciente.
        La ausencia de valoración no equivale a EVA 0.
        El mapa es una representación esquemática.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
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

  tabs: {
    flexDirection: 'row',
    gap: 8,
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },

  activeTab: {
    backgroundColor: '#2563EB',
  },

  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },

  activeTabText: {
    color: '#FFFFFF',
  },

  modeTabs: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },

  modeTab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  activeModeTab: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },

  modeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },

  activeModeText: {
    color: '#2563EB',
  },

  mapsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },

  mapCard: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  mapTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },

  mapDate: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 5,
    textAlign: 'center',
  },

  orientationRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 12,
  },

  orientationLetter: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
  },

  mapHelp: {
    fontSize: 11,
    lineHeight: 17,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 10,
  },

  legendContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },

  legendTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
  },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },

  legendText: {
    fontSize: 10,
    color: '#475569',
  },

  legendNote: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 17,
    marginTop: 12,
  },

  selectedCard: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#FFFFFF',
  },

  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },

  selectedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },

  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#F1F5F9',
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
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },

  evaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },

  evaValue: {
    fontSize: 25,
    fontWeight: '700',
    marginTop: 7,
  },

  notAssessed: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 5,
  },

  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginTop: 12,
    borderRadius: 10,
  },

  resultTitle: {
    fontSize: 13,
    fontWeight: '700',
  },

  resultText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
    marginTop: 5,
  },

  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 8,
    marginTop: 14,
    borderRadius: 10,
    backgroundColor: '#2563EB',
  },

  detailButtonText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
    marginTop: 12,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginTop: 14,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
  },

  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#1E40AF',
  },

  disclaimer: {
    fontSize: 10,
    lineHeight: 17,
    color: '#64748B',
    marginTop: 14,
  },
});
