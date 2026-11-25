import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Svg, {
  Circle,
  Path,
  G,
} from 'react-native-svg';

import { Ionicons } from '@expo/vector-icons';

import ClinicalPainZoneForm from './ClinicalPainZoneForm';

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
  onZonePress?: (zone: BodyZone) => void;
}



export default function BodyPainMap({
  clientId,
  episodeId,
  episodeStatus,
  onZonePress,
}: Props) {
  const [bodyView, setBodyView] = useState<BodyView>('front');
  const [assessments, setAssessments] = useState<
    Record<string, ClinicalPainZone>
  >({});

  const [editingZone, setEditingZone] = useState<BodyZone | null>(
    null
  );

  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

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
  const isReadOnly = canPersist && episodeStatus !== 'open';

  const isHistoryMode =
    canPersist && (mapMode === 'history' || isReadOnly);

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
      const value = displayedAssessments[zone.id];

      if (value) {
        Alert.alert(
          value.zoneName,
          [
            `Intensidad EVA: ${value.eva}/10`,
            `Tipo de dolor: ${value.painType}`,
            `Frecuencia: ${value.frequency}`,
            '',
            `Observaciones: ${value.observations || 'Sin observaciones'}`,
          ].join('\n')
        );
      }

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

  const historicalLegacyZones = BODY_ZONES.filter(
    (zone) =>
      zone.view === bodyView &&
      zone.legacy &&
      Boolean(displayedAssessments[zone.id])
  );

  const visibleZones = [
    ...BODY_ZONES.filter(
      (zone) =>
        zone.view === bodyView &&
        !zone.legacy
    ),
    ...(isHistoryMode ? historicalLegacyZones : []),
  ];

  if (editingZone) {
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        Mapa corporal del dolor
      </Text>

      <Text style={styles.subtitle}>
        Pulsa sobre las zonas del cuerpo para identificar
        las regiones afectadas.
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
              <Text style={styles.selectedTitle}>
                Historial de valoraciones ({history.length})
              </Text>

              {loadingHistory ? (
                <ActivityIndicator color="#2563EB" />
              ) : historyError ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ color: '#B91C1C' }}>
                    {historyError}
                  </Text>

                  <Pressable onPress={() => void loadHistory()}>
                    <Text style={{ color: '#2563EB' }}>
                      Reintentar
                    </Text>
                  </Pressable>
                </View>
              ) : history.length === 0 ? (
                <Text style={styles.emptyText}>
                  No hay valoraciones registradas.
                </Text>
              ) : (
                history.map((item) => (
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
                          ? '#2563EB'
                          : '#E2E8F0',
                      backgroundColor:
                        selectedAssessmentId === item.assessmentId
                          ? '#EFF6FF'
                          : '#FFFFFF',
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: '700',
                        color: '#0F172A',
                      }}
                    >
                      {formatAssessmentDate(item.createdAt)}
                    </Text>

                    <Text style={{ color: '#64748B', marginTop: 4 }}>
                      {item.zones.length} zonas valoradas
                    </Text>
                  </Pressable>
                ))
              )}
            </View>
          )}

          {!isHistoryMode && (
            <Text style={{ color: '#2563EB', fontWeight: '600' }}>
              Registrando una nueva valoración del dolor
            </Text>
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

        <Svg
          width="260"
          height="480"
          viewBox="0 0 200 380"
        >
          <G pointerEvents="none">
            {visibleZones.map((zone) => {
              const selected = Boolean(displayedAssessments[zone.id]);

              return (
                <Path
                  key={zone.id}
                  d={zone.path}
                  fill={
                    selected
                      ? '#EF4444'
                      : zone.category === 'joint'
                        ? '#94A3B8'
                        : zone.category === 'tendon'
                          ? '#B0C4DE'
                          : '#CBD5E1'
                  }
                  stroke={selected ? '#B91C1C' : '#64748B'}
                  strokeWidth={selected ? 2 : 1}
                />
              );
            })}
          </G>

          {/* DETALLES ANATÓMICOS */}
          <G pointerEvents="none">

            {bodyView === 'front' ? (
              <G
                stroke="#475569"
                strokeWidth={1.1}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={0.8}
              >
                {/* CARA */}
                <Circle
                  cx="93"
                  cy="29"
                  r="1.8"
                  fill="#475569"
                  stroke="none"
                />

                <Circle
                  cx="107"
                  cy="29"
                  r="1.8"
                  fill="#475569"
                  stroke="none"
                />

                {/* Cejas */}
                <Path d="M89 25 Q93 23 97 25" />
                <Path d="M103 25 Q107 23 111 25" />

                {/* Nariz */}
                <Path d="M100 31 L98 39 Q100 41 102 39" />

                {/* Boca */}
                <Path d="M94 46 Q100 49 106 46" />

                {/* Orejas */}
                <Path d="M81 30 Q75 28 78 38 Q79 42 83 41" />
                <Path d="M119 30 Q125 28 122 38 Q121 42 117 41" />

                {/* CUELLO */}
                <Path d="M95 61 L97 72" />
                <Path d="M105 61 L103 72" />

                {/* CLAVÍCULAS */}
                <Path d="M76 86 Q89 82 98 89" />
                <Path d="M102 89 Q111 82 124 86" />

                {/* PECTORALES */}
                <Path d="M100 90 L100 120" />
                <Path d="M76 109 Q85 125 98 119" />
                <Path d="M124 109 Q115 125 102 119" />

                {/* ABDOMINALES */}
                <Path d="M100 149 L100 185" />

                <Path d="M83 151 Q90 148 97 152" />
                <Path d="M103 152 Q110 148 117 151" />

                <Path d="M82 162 Q90 166 97 162" />
                <Path d="M103 162 Q110 166 118 162" />

                <Path d="M83 174 Q90 178 97 174" />
                <Path d="M103 174 Q110 178 117 174" />

                {/* Ombligo */}
                <Circle
                  cx="100"
                  cy="189"
                  r="1.5"
                  fill="#475569"
                  stroke="none"
                />

                {/* BÍCEPS */}
                <Path d="M48 116 Q39 137 43 154" />
                <Path d="M152 116 Q161 137 157 154" />

                {/* CODOS */}
                <Path d="M36 164 Q41 167 46 165" />
                <Path d="M154 165 Q159 167 164 164" />

                {/* CUÁDRICEPS */}
                <Path d="M85 207 Q77 234 83 253" />
                <Path d="M115 207 Q123 234 117 253" />

                {/* RODILLAS */}
                <Path d="M78 266 Q84 260 91 266 L89 276 Q84 280 79 276 Z" />
                <Path d="M109 266 Q116 260 122 266 L121 276 Q116 280 111 276 Z" />

                {/* TIBIAS */}
                <Path d="M84 284 L85 329" />
                <Path d="M116 284 L115 329" />

                {/* DEDOS DE LOS PIES */}
                <Path d="M71 360 L71 367" />
                <Path d="M77 359 L77 368" />
                <Path d="M83 358 L83 368" />
                <Path d="M90 357 L90 368" />

                <Path d="M110 357 L110 368" />
                <Path d="M117 358 L117 368" />
                <Path d="M123 359 L123 368" />
                <Path d="M129 360 L129 367" />
              </G>

            ) : (

              <G
                stroke="#475569"
                strokeWidth={1.1}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={0.8}
              >
                {/* PELO POSTERIOR */}
                <Path
                  d="M85 18 Q100 6 115 18
                     Q122 30 116 43
                     L110 48
                     Q100 43 90 48
                     L84 43
                     Q78 30 85 18 Z"
                  fill="#64748B"
                  stroke="#475569"
                />

                {/* Textura del pelo */}
                <G stroke="#94A3B8" strokeWidth={0.9}>
                  <Path d="M89 19 Q86 30 91 42" />
                  <Path d="M95 15 Q91 30 96 43" />
                  <Path d="M101 14 Q97 29 101 42" />
                  <Path d="M107 16 Q104 30 106 43" />
                  <Path d="M113 20 Q110 31 112 42" />
                </G>

                {/* Orejas posteriores */}
                <Path d="M81 30 Q75 28 78 38 Q79 42 83 41" />
                <Path d="M119 30 Q125 28 122 38 Q121 42 117 41" />

                {/* CERVICALES */}
                <Path d="M95 59 L96 72" />
                <Path d="M105 59 L104 72" />

                {/* TRAPECIOS */}
                <Path d="M100 78 Q88 91 73 96" />
                <Path d="M100 78 Q112 91 127 96" />

                {/* OMÓPLATOS */}
                <Path d="M81 96 Q74 109 82 125 L94 111 Z" />
                <Path d="M119 96 Q126 109 118 125 L106 111 Z" />

                {/* COLUMNA VERTEBRAL */}
                <Path
                  d="M100 76
                     Q98 105 100 130
                     Q102 155 100 190"
                  strokeWidth={1.7}
                />

                {/* Vértebras */}
                {[82, 90, 98, 106, 114, 122, 130,
                  138, 150, 158, 166, 174, 182].map((y) => (
                  <Path
                    key={y}
                    d={`M97 ${y} Q100 ${y + 2} 103 ${y}`}
                    strokeWidth={0.8}
                  />
                ))}

                {/* MUSCULATURA LUMBAR */}
                <Path d="M91 148 Q83 164 91 187" />
                <Path d="M109 148 Q117 164 109 187" />

                <Path d="M77 180 Q87 184 94 192" />
                <Path d="M123 180 Q113 184 106 192" />

                {/* GLÚTEOS */}
                <Path d="M77 200 Q71 213 84 218 Q95 219 97 207" />
                <Path d="M123 200 Q129 213 116 218 Q105 219 103 207" />

                {/* TRÍCEPS */}
                <Path d="M48 116 Q37 137 43 154" />
                <Path d="M152 116 Q163 137 157 154" />

                {/* CODOS POSTERIORES */}
                <Circle cx="41" cy="166" r="3" />
                <Circle cx="159" cy="166" r="3" />

                {/* ISQUIOTIBIALES */}
                <Path d="M84 222 Q77 240 84 257" />
                <Path d="M116 222 Q123 240 116 257" />

                {/* PARTE POSTERIOR DE RODILLAS */}
                <Path d="M77 267 Q84 272 92 267" />
                <Path d="M108 267 Q116 272 123 267" />

                {/* GEMELOS */}
                <Path d="M78 280 Q72 301 83 316 Q92 302 89 280" />
                <Path d="M111 280 Q108 302 117 316 Q128 301 122 280" />

                {/* TENDONES DE AQUILES */}
                <Path d="M83 316 L85 338" />
                <Path d="M117 316 L115 338" />

                {/* TALONES */}
                <Path d="M77 349 Q85 345 91 349 L90 362 Q84 366 77 362 Z" />
                <Path d="M109 349 Q115 345 123 349 L123 362 Q116 366 110 362 Z" />

              </G>
            )}

          </G>
          {/* CAPA INTERACTIVA SUPERIOR */}
          <G>
            {visibleZones.map((zone) => (
              <Path
                key={`touch-${zone.id}`}
                d={zone.path}
                fill="#000000"
                fillOpacity={0.01}
                stroke="none"
                onPress={() => handleZonePress(zone)}
              />
            ))}
          </G>
        </Svg>
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
              color: '#EF4444',
              label: 'Zona valorada',
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
        </Text>
      </View>

      <View style={styles.selectedContainer}>
        <Text style={styles.selectedTitle}>
          Zonas valoradas ({Object.keys(displayedAssessments).length})
        </Text>

        {Object.keys(displayedAssessments).length === 0 ? (
          <Text style={styles.emptyText}>
            Todavía no has valorado ninguna zona.
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

                <Text style={styles.zoneEva}>
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
                      color="#2563EB"
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
                      color="#DC2626"
                    />
                  </Pressable>
                </View>
              )}
            </View>
          ))
        )}
      </View>

      {canPersist && !isHistoryMode && (
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
                    : '#2563EB',
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
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
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#2563EB',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  mapContainer: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
  },
  orientationRow: {
    width: '100%',
    paddingHorizontal: 20,
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
    color: '#2563EB',
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
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  legendTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
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
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  selectedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
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
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  zoneInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  zoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
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
    backgroundColor: '#DBEAFE',
  },
  deleteZoneButton: {
    backgroundColor: '#FEE2E2',
  },
  disabledZoneButton: {
    opacity: 0.5,
  },
});
