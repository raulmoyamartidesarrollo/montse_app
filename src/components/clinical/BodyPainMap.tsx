import { useClinicalDraftGuard } from '../../hooks/useClinicalDraftGuard';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import ClinicalBodyDiagram, {
  getMapEvaColors,
  type ClinicalBodyZoneColors,
} from './ClinicalBodyDiagram';

import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

import ClinicalPainZoneForm from './ClinicalPainZoneForm';
import ClinicalPainZoneDetailModal from './ClinicalPainZoneDetailModal';

import { BODY_ZONES } from '../../constants/bodyZones';

import {
  createPatientPainAssessment,
  getPatientPainAssessments,
} from '../../services/clinicalPainAssessments';

import type {
  BodyZone,
  BodyView,
  ClinicalPainZone,
  ClinicalPainAssessment,
} from '../../types/clinicalPain';

interface Props {
  clientId?: string;
  episodeId?: string;
  episodeStatus?: 'open' | 'closed';
  readOnly?: boolean;
  onZonePress?: (zone: BodyZone) => void;
}



export default function BodyPainMap({
  clientId,
  episodeId,
  episodeStatus,
  readOnly = false,
  onZonePress,
}: Props) {
  const [bodyView, setBodyView] = useState<BodyView>('front');
  const [assessments, setAssessments] = useState<
    Record<string, ClinicalPainZone>
  >({});

  const [editingZone, setEditingZone] = useState<BodyZone | null>(
    null
  );

  const [consultingZone, setConsultingZone] =
    useState<BodyZone | null>(null);

  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useClinicalDraftGuard({
    dirty: Object.keys(assessments).length > 0,
    saving,
  });

  const [history, setHistory] = useState<
    ClinicalPainAssessment[]
  >([]);

  const [loadingHistory, setLoadingHistory] = useState(false);

  const [historyError, setHistoryError] = useState<string | null>(
    null
  );

  const [selectedAssessmentId, setSelectedAssessmentId] =
    useState<string | null>(null);

  const historyRequestRef = useRef(0);

  const [mapMode, setMapMode] = useState<'history' | 'new'>(
    clientId && episodeId ? 'history' : 'new'
  );

  const canPersist = Boolean(clientId && episodeId);

  const isEpisodeClosed =
    canPersist && episodeStatus === 'closed';

  const isReadOnly =
    readOnly || (canPersist && episodeStatus !== 'open');

  const isHistoryMode =
    readOnly || (canPersist && (mapMode === 'history' || isReadOnly));

  const selectedAssessment = history.find(
    (item) => item.assessmentId === selectedAssessmentId
  );

  const displayedAssessments = isHistoryMode
    ? Object.fromEntries(
        (selectedAssessment?.zones ?? []).map(
          (zone) => [zone.zoneId, zone]
        )
      )
    : assessments;

  const getPainSummary = (zones: ClinicalPainZone[]) => {
    const count = zones.length;

    if (count === 0) {
      return {
        count: 0,
        average: 0,
        maximum: 0,
      };
    }

    return {
      count,
      average:
        zones.reduce((total, zone) => total + zone.eva, 0) / count,
      maximum: Math.max(...zones.map((zone) => zone.eva)),
    };
  };

  const getEvaColor = (eva: number) => {
    if (eva === 0) return '#64748B';
    if (eva < 4) return '#15803D';
    if (eva < 7) return '#C2410C';
    return '#B91C1C';
  };

  const formatEva = (eva: number) =>
    eva.toFixed(1).replace('.', ',');

  const draftSummary = getPainSummary(
    Object.values(assessments)
  );

  const formatAssessmentDate = (value: string | null) => {
    if (!value) {
      return 'Fecha no disponible';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Fecha no disponible';
    }

    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const loadHistory = useCallback(async () => {
    if (!clientId || !episodeId) {
      return;
    }

    const requestId = ++historyRequestRef.current;

    setLoadingHistory(true);
    setHistoryError(null);

    try {
      const result = await getPatientPainAssessments(
        clientId,
        episodeId
      );

      if (requestId !== historyRequestRef.current) {
        return;
      }

      setHistory(result);

      setSelectedAssessmentId((current) =>
        result.some((item) => item.assessmentId === current)
          ? current
          : result[0]?.assessmentId ?? null
      );
    } catch {
      if (requestId !== historyRequestRef.current) {
        return;
      }

      setHistoryError(
        'No se ha podido cargar el historial de valoraciones.'
      );
    } finally {
      if (requestId === historyRequestRef.current) {
        setLoadingHistory(false);
      }
    }
  }, [clientId, episodeId]);

  useEffect(() => {
    setHistory([]);
    setMapMode(clientId && episodeId ? 'history' : 'new');
    setSelectedAssessmentId(null);
    setAssessments({});
    setEditingZone(null);
    setConsultingZone(null);
    setHistoryError(null);
    setLoadingHistory(false);

    void loadHistory();

    return () => {
      historyRequestRef.current += 1;
    };
  }, [loadHistory, clientId, episodeId]);

  const handleZonePress = (zone: BodyZone) => {


    if (savingRef.current) {
      return;
    }

    if (isHistoryMode) {
      setConsultingZone(zone);
      return;
    }

    if (isReadOnly) {
      return;
    }

    // Si la zona ya está valorada, permitir desmarcarla.
    if (assessments[zone.id]) {
      handleRemoveZone(zone);
      return;
    }

    // Si no está valorada, abrir el formulario.
    setEditingZone(zone);
    onZonePress?.(zone);
  };

  const handleSaveAssessment = (value: ClinicalPainZone) => {
    if (isReadOnly || isHistoryMode || savingRef.current) {
      return;
    }

    setAssessments((current) => ({
      ...current,
      [value.zoneId]: value,
    }));

    setEditingZone(null);
  };

  const handleRemoveZone = (zone: BodyZone) => {
    if (isHistoryMode || isReadOnly || savingRef.current) {
      return;
    }

    Alert.alert(
      'Eliminar zona valorada',
      `¿Estás seguro de que deseas eliminar la valoración de ${zone.name.toLowerCase()}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            if (savingRef.current) {
              return;
            }

            setAssessments((current) => {
              const updated = { ...current };

              delete updated[zone.id];

              return updated;
            });
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handlePersistAssessment = async () => {
    if (isHistoryMode || savingRef.current) {
      return;
    }

    if (!clientId || !episodeId) {
      Alert.alert(
        'No disponible',
        'Esta valoración no está asociada a un episodio clínico.'
      );
      return;
    }

    if (episodeStatus !== 'open') {
      Alert.alert(
        'Episodio cerrado',
        'No puedes registrar valoraciones en un episodio cerrado.'
      );
      return;
    }

    const zones = Object.values(assessments);

    if (zones.length === 0) {
      Alert.alert(
        'Sin zonas valoradas',
        'Debes valorar al menos una zona corporal.'
      );
      return;
    }

    savingRef.current = true;
    setSaving(true);

    try {
      await createPatientPainAssessment({
        clientId,
        episodeId,
        zones,
      });

      setAssessments({});
      setSelectedAssessmentId(null);
      setMapMode('history');

      await loadHistory();

      Alert.alert(
        'Valoración guardada',
        'La valoración del dolor se ha registrado correctamente.'
      );
    } catch (error) {
      console.error('Error al guardar valoración del dolor:', error);

      Alert.alert(
        'Error al guardar',
        'No se ha podido registrar la valoración. Comprueba la conexión e inténtalo de nuevo.'
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const zoneColors: Record<string, ClinicalBodyZoneColors> =
    Object.fromEntries(
      Object.entries(displayedAssessments).map(
        ([zoneId, assessment]) => [
          zoneId,
          getMapEvaColors(assessment.eva),
        ]
      )
    );

  const legacyZoneIds = isHistoryMode
    ? BODY_ZONES.filter(
        (zone) =>
          zone.legacy &&
          Boolean(displayedAssessments[zone.id])
      ).map((zone) => zone.id)
    : [];

  if (editingZone && !isReadOnly && !isHistoryMode) {
    return (
      <ClinicalPainZoneForm
        key={editingZone.id}
        zoneId={editingZone.id}
        zoneName={editingZone.name}
        view={editingZone.view}
        initialValue={assessments[editingZone.id]}
        onSave={handleSaveAssessment}
        onCancel={() => setEditingZone(null)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Mapa corporal del dolor
      </Text>

      <Text style={styles.subtitle}>
        {isHistoryMode
          ? 'Consulta las valoraciones del dolor registradas en este episodio.'
          : 'Identifica y valora las regiones corporales afectadas.'}
      </Text>

      {canPersist && (
        <View style={{ marginTop: 20, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              disabled={saving}
              onPress={() => setMapMode('history')}
              style={[
                styles.tab,
                isHistoryMode && styles.activeTab,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  isHistoryMode && styles.activeTabText,
                ]}
              >
                Historial
              </Text>
            </Pressable>

            {!isReadOnly && (
              <Pressable
                disabled={saving}
                onPress={() => setMapMode('new')}
                style={[
                  styles.tab,
                  !isHistoryMode && styles.activeTab,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    !isHistoryMode && styles.activeTabText,
                  ]}
                >
                  Nueva valoración
                </Text>
              </Pressable>
            )}
          </View>

          {isHistoryMode && (
            <View style={{ gap: 10 }}>

              <View
                style={{
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.surfaceBorder,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <Ionicons
                  name={
                    isReadOnly
                      ? 'lock-closed-outline'
                      : 'information-circle-outline'
                  }
                  size={22}
                  color="#475569"
                />

                <View style={{ flex: 1, gap: 5 }}>
                  <Text
                    style={{
                      fontWeight: '700',
                      color: colors.textSecondary,
                    }}
                  >
                    {isEpisodeClosed
                      ? 'Episodio clínico cerrado'
                      : isReadOnly
                        ? 'Modo consulta · Solo lectura'
                        : 'Historial de valoraciones'}
                  </Text>

                  <Text
                    style={{
                      color: '#64748B',
                      lineHeight: 20,
                    }}
                  >
                    {isEpisodeClosed
                      ? 'Puedes consultar las valoraciones registradas, pero no añadir nuevas ni modificar las existentes.'
                      : isReadOnly
                        ? 'Consulta las valoraciones registradas en este episodio. Para registrar una nueva valoración, accede al episodio clínico correspondiente.'
                        : 'Selecciona una valoración del historial y pulsa sobre sus zonas para consultar los detalles. Para registrar cambios, pulsa Nueva valoración.'}
                  </Text>
                </View>
              </View>

              <Text style={styles.selectedTitle}>
                Historial de valoraciones ({history.length})
              </Text>

              {loadingHistory ? (
                <ActivityIndicator color={colors.primaryPressed} />
              ) : historyError ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ color: '#B91C1C' }}>
                    {historyError}
                  </Text>

                  <Pressable onPress={() => void loadHistory()}>
                    <Text style={{ color: colors.primaryPressed }}>
                      Reintentar
                    </Text>
                  </Pressable>
                </View>
              ) : history.length === 0 ? (
                <Text style={styles.emptyText}>
                  No hay valoraciones registradas.
                </Text>
              ) : (
                history.map((item) => {
                  const summary = getPainSummary(item.zones);
                  const isSelected =
                    selectedAssessmentId === item.assessmentId;

                  return (
                  <Pressable
                    key={item.assessmentId}
                    onPress={() =>
                      setSelectedAssessmentId(item.assessmentId)
                    }
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor:
                        selectedAssessmentId === item.assessmentId
                          ? colors.primaryPressed
                          : colors.surfaceBorder,
                      backgroundColor:
                        selectedAssessmentId === item.assessmentId
                          ? colors.primaryContainer
                          : '#FFFFFF',
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: '700',
                        color: colors.text,
                      }}
                    >
                      {formatAssessmentDate(item.createdAt)}
                    </Text>

                    <Text style={{ color: '#64748B', marginTop: 4 }}>
                      {summary.count} zonas valoradas
                    </Text>

                    {summary.count > 0 && (
                      <View
                        style={{
                          flexDirection: 'row',
                          gap: 10,
                          marginTop: 12,
                        }}
                      >
                        <View
                          style={{
                            flex: 1,
                            padding: 10,
                            borderRadius: 8,
                            backgroundColor: colors.background,
                          }}
                        >
                          <Text style={{ color: '#64748B', fontSize: 12 }}>
                            EVA media
                          </Text>

                          <Text
                            style={{
                              color: getEvaColor(summary.average),
                              fontWeight: '700',
                              fontSize: 20,
                              marginTop: 4,
                            }}
                          >
                            {formatEva(summary.average)}/10
                          </Text>
                        </View>

                        <View
                          style={{
                            flex: 1,
                            padding: 10,
                            borderRadius: 8,
                            backgroundColor: colors.background,
                          }}
                        >
                          <Text style={{ color: '#64748B', fontSize: 12 }}>
                            EVA máxima
                          </Text>

                          <Text
                            style={{
                              color: getEvaColor(summary.maximum),
                              fontWeight: '700',
                              fontSize: 20,
                              marginTop: 4,
                            }}
                          >
                            {summary.maximum}/10
                          </Text>
                        </View>
                      </View>
                    )}

                    {isSelected && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          marginTop: 12,
                        }}
                      >
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={colors.primaryPressed}
                        />

                        <Text
                          style={{
                            color: colors.primaryPressed,
                            fontWeight: '600',
                            fontSize: 12,
                          }}
                        >
                          Valoración seleccionada
                        </Text>
                      </View>
                    )}
                  </Pressable>
                  );
                })
              )}
            </View>
          )}

          {!isHistoryMode && (
            <View
              style={{
                backgroundColor: colors.primaryContainer,
                borderColor: colors.tertiary,
                borderWidth: 1,
                borderRadius: 12,
                padding: 14,
                gap: 10,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Ionicons
                  name="create-outline"
                  size={22}
                  color={colors.primaryPressed}
                />

                <Text
                  style={{
                    flex: 1,
                    color: colors.primaryPressed,
                    fontWeight: '700',
                  }}
                >
                  Nueva valoración del dolor
                </Text>
              </View>

              <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>
                Pulsa una zona sin valorar para registrarla.
                Pulsa una zona coloreada para eliminar su valoración
                o utiliza el lápiz del listado para editarla.
              </Text>

              <Text
                style={{
                  color: colors.primaryPressed,
                  fontWeight: '700',
                }}
              >
                Zonas valoradas: {draftSummary.count}
              </Text>

              {draftSummary.count > 0 && (
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 16,
                  }}
                >
                  <Text
                    style={{
                      color: getEvaColor(draftSummary.average),
                      fontWeight: '700',
                    }}
                  >
                    EVA media: {formatEva(draftSummary.average)}/10
                  </Text>

                  <Text
                    style={{
                      color: getEvaColor(draftSummary.maximum),
                      fontWeight: '700',
                    }}
                  >
                    EVA máxima: {draftSummary.maximum}/10
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      <View style={styles.tabs}>
        <Pressable
          style={[
            styles.tab,
            bodyView === 'front' && styles.activeTab,
          ]}
          onPress={() => setBodyView('front')}
        >
          <Text
            style={[
              styles.tabText,
              bodyView === 'front' && styles.activeTabText,
            ]}
          >
            Vista frontal
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.tab,
            bodyView === 'back' && styles.activeTab,
          ]}
          onPress={() => setBodyView('back')}
        >
          <Text
            style={[
              styles.tabText,
              bodyView === 'back' && styles.activeTabText,
            ]}
          >
            Vista posterior
          </Text>
        </Pressable>
      </View>

      <View style={styles.mapContainer}>

        <View style={styles.orientationRow}>
          <View style={styles.orientationBadge}>
            <Text style={styles.orientationLetter}>
              {bodyView === 'front' ? 'D' : 'I'}
            </Text>
            <Text style={styles.orientationLabel}>
              {bodyView === 'front' ? 'Derecha' : 'Izquierda'}
            </Text>
          </View>

          <Text style={styles.orientationTitle}>
            {bodyView === 'front' ? 'Anterior' : 'Posterior'}
          </Text>

          <View style={styles.orientationBadge}>
            <Text style={styles.orientationLetter}>
              {bodyView === 'front' ? 'I' : 'D'}
            </Text>
            <Text style={styles.orientationLabel}>
              {bodyView === 'front' ? 'Izquierda' : 'Derecha'}
            </Text>
          </View>
        </View>

        <ClinicalBodyDiagram
          bodyView={bodyView}
          zoneColors={zoneColors}
          legacyZoneIds={legacyZoneIds}
          width="100%"
          height={480}
          onZonePress={handleZonePress}
        />
      </View>

      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>
          Referencias del mapa corporal
        </Text>

        <View style={styles.legend}>
          {[
            {
              color: '#CBD5E1',
              label: 'Región anatómica',
            },
            {
              color: '#94A3B8',
              label: 'Articulación',
            },
            {
              color: '#B0C4DE',
              label: 'Tendón',
            },
            {
              color: '#3B82F6',
              label: 'EVA 0 · Sin dolor',
            },
            {
              color: '#22C55E',
              label: 'EVA 1-3 · Leve',
            },
            {
              color: '#F59E0B',
              label: 'EVA 4-6 · Moderado',
            },
            {
              color: '#EF4444',
              label: 'EVA 7-10 · Intenso',
            },
          ].map((item) => (
            <View
              key={item.label}
              style={styles.legendItem}
            >
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: item.color },
                ]}
              />

              <Text style={styles.legendText}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.legendNote}>
          La izquierda y la derecha corresponden
          a la perspectiva anatómica del paciente.
          Los colores EVA representan la intensidad registrada
          y son orientativos, no diagnósticos.
        </Text>
      </View>

      <View style={styles.selectedContainer}>
        <Text style={styles.selectedTitle}>
          Zonas valoradas ({Object.keys(displayedAssessments).length})
        </Text>

        {Object.keys(displayedAssessments).length === 0 ? (
          <Text style={styles.emptyText}>
            {isHistoryMode
              ? 'No hay zonas valoradas para mostrar.'
              : 'Todavía no has valorado ninguna zona.'}
          </Text>
        ) : (
          BODY_ZONES.filter((zone) =>
            Boolean(displayedAssessments[zone.id])
          ).map((zone) => (
            <View
              key={zone.id}
              style={styles.zoneRow}
            >
              <Pressable
                style={styles.zoneInfo}
                disabled={saving}
                onPress={() => {
                  if (isHistoryMode) {
                    handleZonePress(zone);
                  } else if (!isReadOnly && !savingRef.current) {
                    setEditingZone(zone);
                  }
                }}
              >
                <Text style={styles.zoneText}>
                  {zone.name}
                </Text>

                <Text
                  style={[
                    styles.zoneEva,
                    {
                      color: getMapEvaColors(
                        displayedAssessments[zone.id].eva
                      ).stroke,
                    },
                  ]}
                >
                  EVA {displayedAssessments[zone.id].eva}/10
                </Text>
              </Pressable>

              {!isHistoryMode && !isReadOnly && (
                <View style={styles.zoneActions}>
                  <Pressable
                    disabled={saving}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar ${zone.name}`}
                    onPress={() => {
                  if (isHistoryMode) {
                    handleZonePress(zone);
                  } else if (!isReadOnly && !savingRef.current) {
                    setEditingZone(zone);
                  }
                }}
                    style={[
                      styles.zoneActionButton,
                      styles.editZoneButton,
                      saving && styles.disabledZoneButton,
                    ]}
                  >
                    <Ionicons
                      name="pencil-outline"
                      size={19}
                      color={colors.primaryPressed}
                    />
                  </Pressable>

                  <Pressable
                    disabled={saving}
                    accessibilityRole="button"
                    accessibilityLabel={`Eliminar ${zone.name}`}
                    onPress={() => handleRemoveZone(zone)}
                    style={[
                      styles.zoneActionButton,
                      styles.deleteZoneButton,
                      saving && styles.disabledZoneButton,
                    ]}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={19}
                      color={colors.error}
                    />
                  </Pressable>
                </View>
              )}
            </View>
          ))
        )}
      </View>

      {canPersist && !isHistoryMode && !isReadOnly && (
        <View style={{ marginTop: 24 }}>
          {isReadOnly ? (
            <Text
              style={{
                color: '#64748B',
                textAlign: 'center',
                fontSize: 14,
              }}
            >
              Este episodio está cerrado. No se pueden registrar
              nuevas valoraciones.
            </Text>
          ) : (
            <Pressable
              disabled={
                saving || Object.keys(assessments).length === 0
              }
              onPress={handlePersistAssessment}
              style={{
                backgroundColor:
                  saving || Object.keys(assessments).length === 0
                    ? '#94A3B8'
                    : colors.primaryPressed,
                paddingVertical: 15,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: 15,
                  }}
                >
                  Guardar valoración
                </Text>
              )}
            </Pressable>
          )}
        </View>
      )}
      <ClinicalPainZoneDetailModal
        visible={isHistoryMode && consultingZone !== null}
        zone={consultingZone}
        assessment={
          consultingZone
            ? displayedAssessments[consultingZone.id]
            : undefined
        }
        assessmentDate={selectedAssessment?.createdAt}
        hasSelectedAssessment={Boolean(selectedAssessment)}
        onClose={() => setConsultingZone(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 6,
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    lineHeight: 21,
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: colors.primaryPressed,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  mapContainer: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 20,
    backgroundColor: colors.background,
    borderRadius: 16,
  },
  orientationRow: {
    width: '100%',
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orientationBadge: {
    alignItems: 'center',
    minWidth: 65,
  },
  orientationLetter: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryPressed,
  },
  orientationLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 3,
  },
  orientationTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  legendContainer: {
    marginTop: 16,
    padding: 14,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  legendTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  legendNote: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 17,
    marginTop: 14,
  },
  legendItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 12,
    color: '#64748B',
  },
  selectedContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  selectedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    gap: 8,
  },
  zoneInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  zoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  zoneEva: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  zoneActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zoneActionButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editZoneButton: {
    backgroundColor: colors.primaryContainer,
  },
  deleteZoneButton: {
    backgroundColor: '#FEE2E2',
  },
  disabledZoneButton: {
    opacity: 0.5,
  },
});
