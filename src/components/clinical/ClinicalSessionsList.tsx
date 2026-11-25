import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

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
import { useClinicalDraftGuard } from '../../hooks/useClinicalDraftGuard';

import {
  type ClinicalSession,
  getPatientClinicalSessions,
  deletePatientClinicalSession,
} from '../../services/clinicalSessions';

interface Props {
  clientId: string;
  episodeId: string;
  episodeStatus: 'open' | 'closed';
  onCreateSession: () => void;
  onEditSession: (session: ClinicalSession) => void;
}

export default function ClinicalSessionsList({
  clientId,
  episodeId,
  episodeStatus,
  onCreateSession,
  onEditSession,
}: Props) {
  const [sessions, setSessions] = useState<
    ClinicalSession[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  const deletingSessionRef = useRef(false);

  useClinicalDraftGuard({
    dirty: false,
    saving: deletingSessionId !== null,
  });

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getPatientClinicalSessions(
        clientId,
        episodeId
      );

      setSessions(result);
    } catch (err) {
      console.error(
        'Error al obtener sesiones clínicas:',
        err
      );

      setError(
        'No se han podido cargar las sesiones clínicas.'
      );
    } finally {
      setLoading(false);
    }
  }, [clientId, episodeId]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const handleDeleteSession = (session: ClinicalSession) => {
    if (episodeStatus !== 'open' || deletingSessionRef.current) {
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
            if (deletingSessionRef.current) return;

            deletingSessionRef.current = true;
            setDeletingSessionId(session.sessionId);

            try {

              await deletePatientClinicalSession({
                clientId,
                episodeId,
                sessionId: session.sessionId,
              });

              await loadSessions();
            } catch (error) {
              console.error('Error eliminando sesión:', error);
              Alert.alert(
                'Error',
                'No se ha podido eliminar la sesión clínica.'
              );
            } finally {
              deletingSessionRef.current = false;
              setDeletingSessionId(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: string): string => {
    const [year, month, day] = date.split('-');

    if (!year || !month || !day) {
      return date;
    }

    return `${day}/${month}/${year}`;
  };

  const renderField = (
    label: string,
    value: string
  ) => {
    if (!value.trim()) {
      return null;
    }

    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>
          {label}
        </Text>

        <Text style={styles.fieldValue}>
          {value}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            Sesiones de tratamiento
          </Text>

          <Text style={styles.subtitle}>
            {sessions.length} sesiones registradas
          </Text>
        </View>

        {episodeStatus === 'open' && (
          <Pressable
            style={styles.createButton}
            onPress={() => {
              if (deletingSessionRef.current) return;
              onCreateSession();
            }}
            disabled={Boolean(deletingSessionId)}
            accessibilityState={{
              disabled: Boolean(deletingSessionId),
            }}
          >
            <Ionicons
              name="add"
              size={18}
              color="#FFFFFF"
            />

            <Text style={styles.createButtonText}>
              Nueva sesión
            </Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator
            size="large"
            color={colors.primaryPressed}
          />

          <Text style={styles.infoText}>
            Cargando sesiones...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons
            name="alert-circle-outline"
            size={32}
            color={colors.error}
          />

          <Text style={styles.errorText}>
            {error}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => {
              if (deletingSessionRef.current) return;
              void loadSessions();
            }}
            disabled={Boolean(deletingSessionId)}
          >
            <Text style={styles.retryButtonText}>
              Reintentar
            </Text>
          </Pressable>
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="document-text-outline"
            size={44}
            color="#94A3B8"
          />

          <Text style={styles.emptyTitle}>
            Todavía no hay sesiones
          </Text>

          <Text style={styles.infoText}>
            Registra la primera sesión para comenzar
            a documentar la evolución del paciente.
          </Text>
        </View>
      ) : (
        sessions.map((session) => (
          <View
            key={session.sessionId}
            style={styles.sessionCard}
          >
            <View style={styles.sessionHeader}>
              <View style={styles.dateContainer}>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={colors.primaryPressed}
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

            {renderField(
              'Síntomas',
              session.symptoms
            )}

            {renderField(
              'Tratamiento',
              session.treatment
            )}

            {renderField(
              'Ejercicios',
              session.exercises
            )}

            {renderField(
              'Evolución',
              session.evolution
            )}

            {episodeStatus === 'open' && (
              <View style={styles.sessionActions}>
                <Pressable
                  style={styles.editButton}
                  onPress={() => {
                    if (deletingSessionRef.current) return;
                    onEditSession(session);
                  }}
                  disabled={Boolean(deletingSessionId)}
                >
                  <Ionicons
                    name="create-outline"
                    size={17}
                    color={colors.primaryPressed}
                  />
                  <Text style={styles.editButtonText}>
                    Editar
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.deleteButton}
                  onPress={() => handleDeleteSession(session)}
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
                  <Text style={styles.deleteButtonText}>
                    Eliminar
                  </Text>
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
  content: {
    padding: 8,
    paddingBottom: 16,
  },

  header: {
    marginBottom: 20,
  },

  headerText: {
    marginBottom: 12,
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },

  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },

  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryPressed,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },

  createButtonText: {
    color: colors.surface,
    fontWeight: '600',
    marginLeft: 6,
  },

  centered: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 21,
  },

  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginTop: 10,
  },

  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: colors.surfaceBorder,
  },

  retryButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },

  emptyContainer: {
    paddingVertical: 28,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 12,
  },

  sessionCard: {
    backgroundColor: colors.surface,
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
    marginBottom: 12,
  },

  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  sessionDate: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },

  painBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },

  painText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },

  field: {
    marginTop: 10,
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 4,
  },

  fieldValue: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
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
    borderColor: colors.primaryPressed,
  },

  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryPressed,
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