import React, {
  useCallback,
  useEffect,
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
import { useClinicalDraftContext } from '../../contexts/ClinicalDraftContext';

import {
  getPatientClinicalEpisodes,
  type ClinicalEpisode,
} from '../../services/clinicalEpisodes';

import BodyPainMap from './BodyPainMap';
import ClinicalPainEvolution from './ClinicalPainEvolution';

interface Props {
  clientId: string;
  mode?: 'map' | 'evolution';
  onOpenTreatments?: (episode: ClinicalEpisode) => void;
  onCreateEpisode?: () => void;
}

export default function PatientClinicalPainMap({
  clientId,
  mode = 'map',
  onOpenTreatments,
  onCreateEpisode,
}: Props) {
  const isEvolutionMode = mode === 'evolution';

  const { confirmNavigation } = useClinicalDraftContext();

  const [episodes, setEpisodes] = useState<
    ClinicalEpisode[]
  >([]);

  const [selectedEpisodeId, setSelectedEpisodeId] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [selectorOpen, setSelectorOpen] =
    useState(false);

  const requestRef = useRef(0);

  const selectedEpisode = episodes.find(
    (episode) =>
      episode.episodeId === selectedEpisodeId &&
      episode.clientId === clientId
  );

  const loadEpisodes = useCallback(async () => {
    const requestId = ++requestRef.current;

    setLoading(true);
    setError(null);
    setSelectorOpen(false);

    try {
      const result = await getPatientClinicalEpisodes(
        clientId
      );

      if (requestId !== requestRef.current) {
        return;
      }

      const patientEpisodes = result.filter(
        (episode) => episode.clientId === clientId
      );

      setEpisodes(patientEpisodes);

      setSelectedEpisodeId((current) => {
        const exists = patientEpisodes.some(
          (episode) => episode.episodeId === current
        );

        if (exists) {
          return current;
        }

        const firstOpen = patientEpisodes.find(
          (episode) => episode.status === 'open'
        );

        return (
          firstOpen?.episodeId ??
          patientEpisodes[0]?.episodeId ??
          null
        );
      });
    } catch {
      if (requestId !== requestRef.current) {
        return;
      }

      setEpisodes([]);
      setSelectedEpisodeId(null);

      setError(
        'No se han podido cargar los episodios clínicos.'
      );
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }, [clientId]);

  useEffect(() => {
    setEpisodes([]);
    setSelectedEpisodeId(null);
    setSelectorOpen(false);

    void loadEpisodes();

    return () => {
      requestRef.current += 1;
    };
  }, [loadEpisodes]);

  const formatDate = (value: string | null) => {
    if (!value) {
      return 'Sin fecha';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Sin fecha';
    }

    return date.toLocaleDateString('es-ES');
  };

  const handleSelectEpisode = (
    episode: ClinicalEpisode
  ) => {
    if (episode.clientId !== clientId) return;

    if (episode.episodeId === selectedEpisodeId) {
      setSelectorOpen(false);
      return;
    }

    confirmNavigation(() => {
      setSelectedEpisodeId(episode.episodeId);
      setSelectorOpen(false);
    });
  };

  const handleCreateEpisode = () => {
    if (!onCreateEpisode) return;

    confirmNavigation(() => {
      onCreateEpisode();
    });
  };

  const handleOpenTreatments = () => {
    if (!selectedEpisode || !onOpenTreatments) return;

    if (selectedEpisode.clientId !== clientId) return;

    confirmNavigation(() => {
      onOpenTreatments(selectedEpisode);
    });
  };

  const openEpisodes = episodes.filter(
    (episode) => episode.status === 'open'
  );

  const closedEpisodes = episodes.filter(
    (episode) => episode.status === 'closed'
  );

  const renderEpisode = (
    episode: ClinicalEpisode
  ) => {
    const isOpen = episode.status === 'open';

    const isSelected =
      episode.episodeId === selectedEpisodeId;

    return (
      <Pressable
        key={episode.episodeId}
        onPress={() => handleSelectEpisode(episode)}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        style={[
          styles.episodeOption,
          isSelected && styles.episodeOptionSelected,
        ]}
      >
        <Ionicons
          name={
            isOpen
              ? 'ellipse'
              : 'checkmark-circle-outline'
          }
          size={16}
          color={
            isOpen ? '#15803D' : '#64748B'
          }
        />

        <View style={styles.episodeOptionContent}>
          <Text style={styles.episodeOptionTitle}>
            {episode.title}
          </Text>

          <Text style={styles.episodeOptionDate}>
            Apertura: {formatDate(episode.openedAt)}
          </Text>

          {!isOpen && (
            <Text style={styles.episodeOptionDate}>
              Cierre: {formatDate(episode.closedAt)}
            </Text>
          )}
        </View>

        {isSelected && (
          <Ionicons
            name="checkmark-circle"
            size={22}
            color="#2563EB"
          />
        )}
      </Pressable>
    );
  };

  return (
    <View>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons
            name={
              isEvolutionMode
                ? 'analytics-outline'
                : 'body-outline'
            }
            size={25}
            color={colors.primary}
          />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.title}>
            {isEvolutionMode
              ? 'Evolución EVA del paciente'
              : 'Mapa corporal del paciente'}
          </Text>

          <Text style={styles.subtitle}>
            {isEvolutionMode
              ? 'Seguimiento del dolor por episodio'
              : 'Registro y consulta de valoraciones clínicas'}
          </Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Ionicons
          name={
            isEvolutionMode
              ? 'analytics-outline'
              : 'information-circle-outline'
          }
          size={19}
          color="#475569"
        />

        <Text style={styles.infoText}>
          {isEvolutionMode
            ? 'Selecciona un episodio clínico para consultar las estadísticas y la evolución del dolor de cada región anatómica.'
            : 'Selecciona un episodio clínico para registrar nuevas valoraciones del dolor o consultar las anteriores. Los episodios cerrados son de solo lectura.'}
        </Text>
      </View>

      {!isEvolutionMode &&
        !loading &&
        !error &&
        onCreateEpisode && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Crear nuevo episodio clínico"
            style={styles.createEpisodeButton}
            onPress={handleCreateEpisode}
          >
            <Ionicons
              name="add-circle-outline"
              size={22}
              color="#FFFFFF"
            />

            <Text style={styles.createEpisodeButtonText}>
              Nuevo episodio clínico
            </Text>
          </Pressable>
        )}

      {loading ? (
        <View style={styles.messageContainer}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />

          <Text style={styles.message}>
            Cargando episodios clínicos...
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
            onPress={() => void loadEpisodes()}
          >
            <Ionicons
              name="refresh-outline"
              size={18}
              color="#2563EB"
            />

            <Text style={styles.retryText}>
              Reintentar
            </Text>
          </Pressable>
        </View>
      ) : episodes.length === 0 ? (
        <View style={styles.messageContainer}>
          <Ionicons
            name="albums-outline"
            size={38}
            color="#94A3B8"
          />

          <Text style={styles.emptyTitle}>
            Sin episodios clínicos
          </Text>

          <Text style={styles.message}>
            Este paciente todavía no tiene episodios
            clínicos registrados.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.selectorLabel}>
            Seleccionar episodio clínico
          </Text>

          <Pressable
            style={styles.selector}
            onPress={() =>
              setSelectorOpen((current) => !current)
            }
            accessibilityRole="button"
            accessibilityState={{
              expanded: selectorOpen,
            }}
          >
            <Ionicons
              name="albums-outline"
              size={21}
              color="#2563EB"
            />

            <Text style={styles.selectorText}>
              {selectedEpisode?.title ??
                'Seleccionar episodio'}
            </Text>

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
            <View style={styles.selectorOptions}>
              {openEpisodes.length > 0 && (
                <>
                  <Text style={styles.groupTitle}>
                    ABIERTOS ({openEpisodes.length})
                  </Text>

                  {openEpisodes.map(renderEpisode)}
                </>
              )}

              {closedEpisodes.length > 0 && (
                <>
                  <Text style={styles.groupTitle}>
                    CERRADOS ({closedEpisodes.length})
                  </Text>

                  {closedEpisodes.map(renderEpisode)}
                </>
              )}
            </View>
          )}

          {selectedEpisode && (
            <>
              <View style={styles.episodeSummary}>
                <View
                  style={[
                    styles.statusBadge,
                    selectedEpisode.status === 'open'
                      ? styles.openBadge
                      : styles.closedBadge,
                  ]}
                >
                  <Ionicons
                    name={
                      selectedEpisode.status === 'open'
                        ? 'ellipse'
                        : 'lock-closed-outline'
                    }
                    size={12}
                    color={
                      selectedEpisode.status === 'open'
                        ? '#15803D'
                        : '#475569'
                    }
                  />

                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          selectedEpisode.status === 'open'
                            ? '#15803D'
                            : '#475569',
                      },
                    ]}
                  >
                    {selectedEpisode.status === 'open'
                      ? 'Episodio abierto'
                      : 'Episodio cerrado'}
                  </Text>
                </View>

                <Text style={styles.summaryDate}>
                  Apertura:{' '}
                  {formatDate(selectedEpisode.openedAt)}
                </Text>

                {selectedEpisode.status === 'closed' && (
                  <Text style={styles.summaryDate}>
                    Cierre:{' '}
                    {formatDate(selectedEpisode.closedAt)}
                  </Text>
                )}

                {Boolean(selectedEpisode.affectedArea) && (
                  <Text style={styles.summaryDate}>
                    Zona afectada:{' '}
                    {selectedEpisode.affectedArea}
                  </Text>
                )}
              </View>

              {!isEvolutionMode && onOpenTreatments && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ver sesiones de tratamiento"
                  style={styles.treatmentsButton}
                  onPress={handleOpenTreatments}
                >
                  <Ionicons
                    name="clipboard-outline"
                    size={21}
                    color="#2563EB"
                  />

                  <Text style={styles.treatmentsButtonText}>
                    Ver sesiones de tratamiento
                  </Text>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#2563EB"
                  />
                </Pressable>
              )}

              <View style={styles.mapContainer}>
                {isEvolutionMode ? (
                  <ClinicalPainEvolution
                    key={`evolution-${clientId}-${selectedEpisode.episodeId}`}
                    clientId={clientId}
                    episodeId={selectedEpisode.episodeId}
                  />
                ) : (
                  <BodyPainMap
                    key={`map-${clientId}-${selectedEpisode.episodeId}`}
                    clientId={clientId}
                    episodeId={selectedEpisode.episodeId}
                    episodeStatus={selectedEpisode.status}
                    readOnly={selectedEpisode.status !== 'open'}
                  />
                )}
              </View>
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 5,
    fontSize: 12,
    color: '#64748B',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  selectorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  selectorOptions: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 10,
    marginBottom: 10,
  },
  episodeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  episodeOptionSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  episodeOptionContent: {
    flex: 1,
  },
  episodeOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  episodeOptionDate: {
    marginTop: 5,
    fontSize: 11,
    color: '#64748B',
  },
  episodeSummary: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  openBadge: {
    backgroundColor: '#DCFCE7',
  },
  closedBadge: {
    backgroundColor: '#E2E8F0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryDate: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  createEpisodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 15,
    paddingHorizontal: 12,
    marginBottom: 18,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },

  createEpisodeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  treatmentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },

  treatmentsButtonText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },

  mapContainer: {
    marginTop: 10,
  },
  messageContainer: {
    paddingVertical: 30,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 12,
  },
  message: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
});
