import React, { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../theme/colors';

import {
  getPatientClinicalEpisodes,
  type ClinicalEpisode,
} from '../../services/clinicalEpisodes';

import {
  getPatientClinicalSessions,
  deletePatientClinicalSession,
  type ClinicalSession,
} from '../../services/clinicalSessions';

import CreateClinicalSessionForm from './CreateClinicalSessionForm';

interface Props {
  clientId: string;
}

interface EvolutionEntry {
  episode: ClinicalEpisode;
  session: ClinicalSession;
}

function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) return value;

  return `${match[3]}/${match[2]}/${match[1]}`;
}

export default function PatientClinicalEvolution({
  clientId,
}: Props) {
  const [entries, setEntries] = useState<EvolutionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [episodesCount, setEpisodesCount] = useState(0);
  const [editingEntry, setEditingEntry] = useState<EvolutionEntry | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  const loadEvolution = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const episodes = await getPatientClinicalEpisodes(clientId);

      const sessionsByEpisode = await Promise.all(
        episodes.map(async (episode) => {
          const sessions = await getPatientClinicalSessions(
            clientId,
            episode.episodeId
          );

          return sessions.map((session): EvolutionEntry => ({
            episode,
            session,
          }));
        })
      );

      const result = sessionsByEpisode
        .flat()
        .sort((a, b) => {
          const dateComparison = b.session.sessionDate.localeCompare(
            a.session.sessionDate
          );

          if (dateComparison !== 0) {
            return dateComparison;
          }

          return (b.session.createdAt ?? '').localeCompare(
            a.session.createdAt ?? ''
          );
        });

      setEpisodesCount(episodes.length);
      setEntries(result);
    } catch (err) {
      console.error(
        'Error cargando evolución clínica:',
        err
      );

      setError(
        'No se ha podido cargar la evolución clínica del paciente.'
      );
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void loadEvolution();
  }, [loadEvolution]);

  const handleDelete = (entry: EvolutionEntry) => {
    if (entry.episode.status !== 'open' || deletingSessionId) {
      return;
    }

    Alert.alert(
      'Eliminar sesión clínica',
      '¿Seguro que deseas eliminar esta sesión? Se conservará un registro de auditoría.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingSessionId(entry.session.sessionId);

              await deletePatientClinicalSession({
                clientId,
                episodeId: entry.episode.episodeId,
                sessionId: entry.session.sessionId,
              });

              await loadEvolution();
            } catch (err) {
              console.error('Error eliminando sesión clínica:', err);
              Alert.alert(
                'Error',
                'No se ha podido eliminar la sesión clínica.'
              );
            } finally {
              setDeletingSessionId(null);
            }
          },
        },
      ]
    );
  };

  const renderField = (label: string, value: string) => {
    if (!value?.trim()) return null;

    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{value}</Text>
      </View>
    );
  };

  if (editingEntry) {
    return (
      <CreateClinicalSessionForm
        key={editingEntry.session.sessionId}
        clientId={clientId}
        episodeId={editingEntry.episode.episodeId}
        session={editingEntry.session}
        onSaved={() => {
          setEditingEntry(null);
          void loadEvolution();
        }}
        onCancel={() => setEditingEntry(null)}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
        <Text style={styles.infoText}>
          Cargando evolución clínica...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons
          name="alert-circle-outline"
          size={32}
          color={colors.error}
        />

        <Text style={styles.errorText}>{error}</Text>

        <Pressable
          style={styles.refreshButton}
          onPress={() => void loadEvolution()}
        >
          <Ionicons
            name="refresh-outline"
            size={18}
            color={colors.primary}
          />
          <Text style={styles.refreshText}>
            Reintentar
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            Evolución clínica
          </Text>

          <Text style={styles.subtitle}>
            {episodesCount} episodios · {entries.length} sesiones cargadas
          </Text>
        </View>

        <Pressable
          onPress={() => void loadEvolution()}
          style={styles.refreshButton}
          accessibilityLabel="Actualizar evolución clínica"
        >
          <Ionicons
            name="refresh-outline"
            size={19}
            color={colors.primary}
          />
        </Pressable>
      </View>

      {entries.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons
            name="pulse-outline"
            size={42}
            color={colors.textMuted}
          />

          <Text style={styles.emptyTitle}>
            No hay sesiones registradas
          </Text>

          <Text style={styles.infoText}>
            Las sesiones aparecerán aquí cuando se
            registren dentro de un episodio clínico.
          </Text>
        </View>
      ) : (
        entries.map(({ episode, session }) => (
          <View
            key={`${episode.episodeId}-${session.sessionId}`}
            style={styles.sessionCard}
          >
            <View style={styles.sessionHeader}>
              <View style={styles.dateRow}>
                <Ionicons
                  name="calendar-outline"
                  size={17}
                  color={colors.primary}
                />

                <Text style={styles.sessionDate}>
                  {formatDate(session.sessionDate)}
                </Text>
              </View>

              <View style={styles.painBadge}>
                <Text style={styles.painText}>
                  EVA: {session.painLevel ?? '-'}/10
                </Text>
              </View>
            </View>

            <Text style={styles.episodeTitle}>
              {episode.title}
            </Text>

            {renderField('Síntomas', session.symptoms)}
            {renderField('Tratamiento', session.treatment)}
            {renderField('Ejercicios', session.exercises)}
            {renderField('Evolución', session.evolution)}

            {episode.status === 'open' && (
              <View style={styles.sessionActions}>
                <Pressable
                  style={styles.editButton}
                  onPress={() => setEditingEntry({ episode, session })}
                  disabled={Boolean(deletingSessionId)}
                >
                  <Ionicons
                    name="create-outline"
                    size={17}
                    color={colors.primary}
                  />
                  <Text style={styles.editButtonText}>Editar</Text>
                </Pressable>

                <Pressable
                  style={styles.deleteButton}
                  onPress={() => handleDelete({ episode, session })}
                  disabled={Boolean(deletingSessionId)}
                >
                  {deletingSessionId === session.sessionId ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <Ionicons
                      name="trash-outline"
                      size={17}
                      color={colors.error}
                    />
                  )}
                  <Text style={styles.deleteButtonText}>Eliminar</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))
      )}
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
    marginBottom: 20,
    gap: 10,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: colors.text,
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 5,
  },
  refreshButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refreshText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },
  centered: {
    paddingVertical: 35,
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  errorText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: colors.error,
    textAlign: 'center',
    lineHeight: 21,
  },
  emptyTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: colors.text,
  },
  sessionCard: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sessionDate: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: colors.text,
  },
  painBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  painText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: colors.primary,
  },
  episodeTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: colors.primary,
    marginTop: 12,
  },
  field: {
    marginTop: 12,
  },
  fieldLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  fieldValue: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  sessionActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.error,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
});
