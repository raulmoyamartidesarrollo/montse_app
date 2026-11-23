import React, { useRef, useState } from 'react';
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

import ClinicalPainZoneForm from './ClinicalPainZoneForm';

import {
  createPatientPainAssessment,
} from '../../services/clinicalPainAssessments';

import type {
  BodyView,
  ClinicalPainZone,
} from '../../types/clinicalPain';

interface BodyZone {
  id: string;
  name: string;
  view: BodyView;
  path: string;
}

interface Props {
  clientId?: string;
  episodeId?: string;
  episodeStatus?: 'open' | 'closed';
  onZonePress?: (zone: BodyZone) => void;
}

const BODY_ZONES: BodyZone[] = [
  // VISTA FRONTAL
  {
    id: 'front-head',
    name: 'Cabeza',
    view: 'front',
    path: 'M85 17 Q100 5 115 17 Q123 30 116 47 Q109 59 100 60 Q91 59 84 47 Q77 30 85 17 Z',
  },
  {
    id: 'front-neck',
    name: 'Cuello',
    view: 'front',
    path: 'M92 58 L108 58 L112 76 L88 76 Z',
  },
  {
    id: 'front-left-shoulder',
    name: 'Hombro izquierdo',
    view: 'front',
    path: 'M112 77 Q132 73 143 91 L135 112 L113 105 Z',
  },
  {
    id: 'front-right-shoulder',
    name: 'Hombro derecho',
    view: 'front',
    path: 'M88 77 Q68 73 57 91 L65 112 L87 105 Z',
  },
  {
    id: 'front-chest',
    name: 'Pecho',
    view: 'front',
    path: 'M88 78 L112 78 L134 108 L127 143 L73 143 L66 108 Z',
  },
  {
    id: 'front-abdomen',
    name: 'Abdomen',
    view: 'front',
    path: 'M73 146 L127 146 L125 192 Q100 204 75 192 Z',
  },
  {
    id: 'front-left-arm',
    name: 'Brazo izquierdo',
    view: 'front',
    path: 'M144 94 Q153 100 157 120 L171 190 Q174 207 164 212 Q155 212 151 196 L137 126 Z',
  },
  {
    id: 'front-right-arm',
    name: 'Brazo derecho',
    view: 'front',
    path: 'M56 94 Q47 100 43 120 L29 190 Q26 207 36 212 Q45 212 49 196 L63 126 Z',
  },
  {
    id: 'front-left-leg',
    name: 'Pierna izquierda',
    view: 'front',
    path: 'M103 197 L125 197 L132 263 L127 339 L105 339 L101 269 Z',
  },
  {
    id: 'front-right-leg',
    name: 'Pierna derecha',
    view: 'front',
    path: 'M97 197 L75 197 L68 263 L73 339 L95 339 L99 269 Z',
  },
  {
    id: 'front-left-foot',
    name: 'Pie izquierdo',
    view: 'front',
    path: 'M105 341 L127 341 Q137 357 138 369 L103 369 Z',
  },
  {
    id: 'front-right-foot',
    name: 'Pie derecho',
    view: 'front',
    path: 'M73 341 L95 341 L97 369 L62 369 Q63 357 73 341 Z',
  },

  // VISTA POSTERIOR
  {
    id: 'back-head',
    name: 'Cabeza posterior',
    view: 'back',
    path: 'M85 17 Q100 5 115 17 Q123 30 116 47 Q109 59 100 60 Q91 59 84 47 Q77 30 85 17 Z',
  },
  {
    id: 'back-neck',
    name: 'Cervicales',
    view: 'back',
    path: 'M92 58 L108 58 L112 76 L88 76 Z',
  },
  {
    id: 'back-left-shoulder',
    name: 'Hombro izquierdo posterior',
    view: 'back',
    path: 'M88 77 Q68 73 57 91 L65 112 L87 105 Z',
  },
  {
    id: 'back-right-shoulder',
    name: 'Hombro derecho posterior',
    view: 'back',
    path: 'M112 77 Q132 73 143 91 L135 112 L113 105 Z',
  },
  {
    id: 'back-upper',
    name: 'Espalda dorsal',
    view: 'back',
    path: 'M88 78 L112 78 L134 108 L127 143 L73 143 L66 108 Z',
  },
  {
    id: 'back-lumbar',
    name: 'Zona lumbar',
    view: 'back',
    path: 'M73 146 L127 146 L125 192 Q100 204 75 192 Z',
  },
  {
    id: 'back-left-arm',
    name: 'Brazo izquierdo posterior',
    view: 'back',
    path: 'M56 94 Q47 100 43 120 L29 190 Q26 207 36 212 Q45 212 49 196 L63 126 Z',
  },
  {
    id: 'back-right-arm',
    name: 'Brazo derecho posterior',
    view: 'back',
    path: 'M144 94 Q153 100 157 120 L171 190 Q174 207 164 212 Q155 212 151 196 L137 126 Z',
  },
  {
    id: 'back-left-leg',
    name: 'Pierna izquierda posterior',
    view: 'back',
    path: 'M97 197 L75 197 L68 263 L73 339 L95 339 L99 269 Z',
  },
  {
    id: 'back-right-leg',
    name: 'Pierna derecha posterior',
    view: 'back',
    path: 'M103 197 L125 197 L132 263 L127 339 L105 339 L101 269 Z',
  },
  {
    id: 'back-left-foot',
    name: 'Talón izquierdo',
    view: 'back',
    path: 'M73 341 L95 341 L97 369 L62 369 Q63 357 73 341 Z',
  },
  {
    id: 'back-right-foot',
    name: 'Talón derecho',
    view: 'back',
    path: 'M105 341 L127 341 Q137 357 138 369 L103 369 Z',
  },
];

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

  const canPersist = Boolean(clientId && episodeId);
  const isReadOnly = canPersist && episodeStatus !== 'open';

  const handleZonePress = (zone: BodyZone) => {
    if (isReadOnly || savingRef.current) {
      return;
    }

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

  const handlePersistAssessment = async () => {
    if (savingRef.current) {
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

  const visibleZones = BODY_ZONES.filter(
    (zone) => zone.view === bodyView
  );

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
        <Svg
          width="260"
          height="480"
          viewBox="0 0 200 380"
        >
          <G>
            {visibleZones.map((zone) => {
              const selected = Boolean(assessments[zone.id]);

              return (
                <Path
                  key={zone.id}
                  d={zone.path}
                  fill={selected ? '#EF4444' : '#CBD5E1'}
                  stroke={selected ? '#B91C1C' : '#64748B'}
                  strokeWidth={selected ? 2 : 1}
                  onPress={() => handleZonePress(zone)}
                />
              );
            })}
          </G>

          <Circle
            cx="100"
            cy="28"
            r="2"
            fill="#64748B"
            pointerEvents="none"
          />
        </Svg>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendColor,
              { backgroundColor: '#CBD5E1' },
            ]}
          />
          <Text style={styles.legendText}>
            Zona disponible
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendColor,
              { backgroundColor: '#EF4444' },
            ]}
          />
          <Text style={styles.legendText}>
            Zona seleccionada
          </Text>
        </View>
      </View>

      <View style={styles.selectedContainer}>
        <Text style={styles.selectedTitle}>
          Zonas valoradas ({Object.keys(assessments).length})
        </Text>

        {Object.keys(assessments).length === 0 ? (
          <Text style={styles.emptyText}>
            Todavía no has valorado ninguna zona.
          </Text>
        ) : (
          BODY_ZONES.filter((zone) =>
            Boolean(assessments[zone.id])
          ).map((zone) => (
            <Pressable
              key={zone.id}
              onPress={() => handleZonePress(zone)}
            >
              <Text style={styles.zoneText}>
                • {zone.name} — EVA {assessments[zone.id].eva}/10
              </Text>
            </Pressable>
          ))
        )}
      </View>

      {canPersist && (
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
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  zoneText: {
    marginTop: 8,
    fontSize: 14,
    color: '#334155',
  },
});
