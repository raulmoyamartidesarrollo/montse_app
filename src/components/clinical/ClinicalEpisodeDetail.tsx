import BodyPainMap from './BodyPainMap';
import ClinicalPainEvolution from './ClinicalPainEvolution';
import React, { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../theme/colors';

import {
  getPatientClinicalEpisode,
  type ClinicalEpisode,
} from '../../services/clinicalEpisodes';

import type { ClinicalSession } from '../../services/clinicalSessions';

import ClinicalSessionsList from './ClinicalSessionsList';
import CreateClinicalSessionForm from './CreateClinicalSessionForm';

type EpisodeTab =
  | 'evolution'
  | 'painMap'
  | 'painEvolution'
  | 'history';

interface Props {
  clientId: string;
  episodeId: string;
  onBack: () => void;
  onEdit: (episode: ClinicalEpisode) => void;
  onClose: (episode: ClinicalEpisode) => void;
  onReopen: (episode: ClinicalEpisode) => void;
}

const tabs: {
  id: EpisodeTab;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  {
    id: 'evolution',
    label: 'Tratamientos',
    icon: 'clipboard-outline',
  },
  {
    id: 'painMap',
    label: 'Mapa del dolor',
    icon: 'body-outline',
  },
  {
    id: 'painEvolution',
    label: 'Evolución EVA',
    icon: 'analytics-outline',
  },
  {
    id: 'history',
    label: 'Datos del episodio',
    icon: 'document-text-outline',
  },
];

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Sin fecha';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha';
  }

  return date.toLocaleDateString('es-ES');
}

export default function ClinicalEpisodeDetail({
  clientId,
  episodeId,
  onBack,
  onEdit,
  onClose,
  onReopen,
}: Props) {
  const [episode, setEpisode] = useState<ClinicalEpisode | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] =
    useState<EpisodeTab>('evolution');

  // Controla si se muestra el formulario de nueva sesión.
  const [showCreateSession, setShowCreateSession] =
    useState(false);

  const [editingSession, setEditingSession] =
    useState<ClinicalSession | null>(null);

  // Permite volver a montar el listado tras guardar.
  const [sessionsRefreshKey, setSessionsRefreshKey] =
    useState(0);

  const loadEpisode = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getPatientClinicalEpisode(
        clientId,
        episodeId
      );

      setEpisode(result);
    } catch (err) {
      console.error('Error cargando episodio clínico:', err);

      setError('No se ha podido cargar el episodio clínico.');
    } finally {
      setLoading(false);
    }
  }, [clientId, episodeId]);

  useEffect(() => {
    void loadEpisode();
  }, [loadEpisode]);

  // Abrir el formulario.
  const handleCreateSession = () => {
    if (episode?.status !== 'open') {
      return;
    }

    setShowCreateSession(true);
  };

  // Volver al listado después de guardar.
  const handleSessionSaved = () => {
    setShowCreateSession(false);
    setEditingSession(null);
    setActiveTab('evolution');

    // Fuerza una nueva consulta de sesiones.
    setSessionsRefreshKey((previous) => previous + 1);
  };

  // Cancelar el formulario.
  const handleCancelSession = () => {
    setShowCreateSession(false);
    setEditingSession(null);
  };

  const handleEditSession = (session: ClinicalSession) => {
    if (episode?.status !== 'open') {
      return;
    }

    setEditingSession(session);
  };

  const renderField = (label: string, value: string) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <Text style={styles.fieldValue}>
        {value || 'Sin información registrada'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.messageContainer}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text style={styles.message}>
          Cargando episodio clínico...
        </Text>
      </View>
    );
  }

  if (error || !episode) {
    return (
      <View style={styles.messageContainer}>
        <Text style={styles.message}>
          {error || 'Episodio no disponible.'}
        </Text>

        <Pressable onPress={() => void loadEpisode()}>
          <Text style={styles.actionText}>
            Reintentar
          </Text>
        </Pressable>

        <Pressable onPress={onBack}>
          <Text style={styles.actionText}>
            Volver a episodios
          </Text>
        </Pressable>
      </View>
    );
  }

  const isOpen = episode.status === 'open';

  // Pantalla de registro de una nueva sesión.
  if ((showCreateSession || editingSession) && isOpen) {
    return (
      <CreateClinicalSessionForm
        key={editingSession?.sessionId ?? 'new-session'}
        clientId={clientId}
        episodeId={episodeId}
        session={editingSession ?? undefined}
        onSaved={handleSessionSaved}
        onCancel={handleCancelSession}
      />
    );
  }

  return (
    <View>
      <Pressable
        style={styles.backButton}
        onPress={onBack}
      >
        <Ionicons
          name="arrow-back"
          size={18}
          color={colors.primary}
        />

        <Text style={styles.actionText}>
          Volver a episodios
        </Text>
      </Pressable>

      <View style={styles.episodeCard}>
        <Text style={styles.title}>
          {episode.title}
        </Text>

        <View style={styles.statusRow}>
          <Ionicons
            name={isOpen ? 'ellipse' : 'checkmark-circle'}
            size={14}
            color={isOpen ? '#239B56' : colors.textMuted}
          />

          <Text style={styles.statusText}>
            {isOpen ? 'Episodio abierto' : 'Episodio cerrado'}
          </Text>
        </View>

        <Text style={styles.dateText}>
          Apertura: {formatDate(episode.openedAt)}
        </Text>

        {!isOpen && (
          <Text style={styles.dateText}>
            Cierre: {formatDate(episode.closedAt)}
          </Text>
        )}
      </View>

      <View style={styles.tabsContainer}>
        {tabs.map((tab) => {
          const selected = activeTab === tab.id;

          return (
            <Pressable
              key={tab.id}
              style={[
                styles.tab,
                selected && styles.activeTab,
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon}
                size={18}
                color={
                  selected
                    ? colors.primary
                    : colors.textMuted
                }
              />

              <Text
                style={[
                  styles.tabText,
                  selected && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* HISTORIAL DEL EPISODIO */}
      {activeTab === 'history' && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            Información del episodio
          </Text>

          {renderField(
            'Motivo de consulta',
            episode.reasonForConsultation
          )}

          {renderField(
            'Zona afectada',
            episode.affectedArea
          )}

          {renderField(
            'Observaciones internas',
            episode.observations
          )}

          {isOpen && (
            <Pressable
              style={styles.primaryButton}
              onPress={() => onEdit(episode)}
            >
              <Ionicons
                name="create-outline"
                size={18}
                color={colors.surface}
              />

              <Text style={styles.primaryButtonText}>
                Editar episodio
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* EVOLUCIÓN CLÍNICA */}
      {activeTab === 'evolution' && (
        <View style={styles.sectionCard}>
          <ClinicalSessionsList
            key={sessionsRefreshKey}
            clientId={clientId}
            episodeId={episodeId}
            episodeStatus={episode.status}
            onCreateSession={handleCreateSession}
            onEditSession={handleEditSession}
          />
        </View>
      )}

      {/* MAPA DEL DOLOR */}
      {activeTab === 'painMap' && (
        <View style={styles.sectionCard}>
          <BodyPainMap
            clientId={clientId}
            episodeId={episodeId}
            episodeStatus={episode.status}
          />
        </View>
      )}

      {/* EVOLUCIÓN DEL DOLOR EVA */}
      {activeTab === 'painEvolution' && (
        <View style={styles.sectionCard}>
          <ClinicalPainEvolution
            key={`${clientId}-${episodeId}`}
            clientId={clientId}
            episodeId={episodeId}
          />
        </View>
      )}

      {/* CERRAR O REABRIR EPISODIO */}
      <View style={styles.actions}>
        {isOpen ? (
          <Pressable
            style={styles.closeButton}
            onPress={() => onClose(episode)}
          >
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={colors.error}
            />

            <Text style={styles.closeButtonText}>
              Cerrar episodio
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.primaryButton}
            onPress={() => onReopen(episode)}
          >
            <Ionicons
              name="lock-open-outline"
              size={18}
              color={colors.surface}
            />

            <Text style={styles.primaryButtonText}>
              Reabrir episodio
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },

  actionText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },

  episodeCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 12,
  },

  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    color: colors.text,
    marginBottom: 12,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },

  statusText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.textSecondary,
  },

  dateText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 5,
  },

  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 5,
    marginBottom: 12,
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 3,
    borderRadius: 11,
    gap: 6,
  },

  activeTab: {
    backgroundColor: colors.background,
  },

  tabText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },

  activeTabText: {
    color: colors.primary,
  },

  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },

  sectionTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17,
    color: colors.text,
    marginBottom: 15,
  },

  field: {
    marginBottom: 18,
  },

  fieldLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: colors.text,
    marginBottom: 6,
  },

  fieldValue: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 21,
  },

  primaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: colors.primary,
    marginTop: 12,
  },

  primaryButtonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: colors.surface,
  },

  closeButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.surface,
  },

  closeButtonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: colors.error,
  },

  actions: {
    marginTop: 18,
  },

  messageContainer: {
    alignItems: 'center',
    padding: 25,
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 15,
  },

  message: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 21,
  },
});