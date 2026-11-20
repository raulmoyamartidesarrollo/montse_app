import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  ClinicalSession,
  getPatientClinicalSessions,
} from '../../services/clinicalSessions';

interface Props {
  clientId: string;
  episodeId: string;
  episodeStatus: 'open' | 'closed';
  onCreateSession: () => void;
}

export default function ClinicalSessionsList({
  clientId,
  episodeId,
  episodeStatus,
  onCreateSession,
}: Props) {
  const [sessions, setSessions] = useState<
    ClinicalSession[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      nestedScrollEnabled
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            Evolución clínica
          </Text>

          <Text style={styles.subtitle}>
            {sessions.length} sesiones registradas
          </Text>
        </View>

        {episodeStatus === 'open' && (
          <Pressable
            style={styles.createButton}
            onPress={onCreateSession}
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
            color="#2563EB"
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
            color="#DC2626"
          />

          <Text style={styles.errorText}>
            {error}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => void loadSessions()}
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
                  color="#2563EB"
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
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    padding: 16,
    paddingBottom: 32,
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
    color: '#0F172A',
  },

  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },

  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },

  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 6,
  },

  centered: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 21,
  },

  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 10,
  },

  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },

  retryButtonText: {
    color: '#334155',
    fontWeight: '600',
  },

  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#334155',
    marginTop: 12,
  },

  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#0F172A',
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
    color: '#64748B',
    marginBottom: 4,
  },

  fieldValue: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 21,
  },
});