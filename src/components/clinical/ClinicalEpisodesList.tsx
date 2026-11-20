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
  getPatientClinicalEpisodes,
  type ClinicalEpisode,
} from '../../services/clinicalEpisodes';

interface Props {
  clientId: string;
  onCreateEpisode: () => void;
  onSelectEpisode: (episode: ClinicalEpisode) => void;
}

export default function ClinicalEpisodesList({
  clientId,
  onCreateEpisode,
  onSelectEpisode,
}: Props) {
  const [episodes, setEpisodes] = useState<ClinicalEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEpisodes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getPatientClinicalEpisodes(clientId);

      setEpisodes(result);
    } catch (err) {
      console.error('Error cargando episodios clínicos:', err);
      setError('No se han podido cargar los episodios clínicos.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void loadEpisodes();
  }, [loadEpisodes]);

  const openEpisodes = episodes.filter(
    (episode) => episode.status === 'open'
  );

  const closedEpisodes = episodes.filter(
    (episode) => episode.status === 'closed'
  );

  const formatDate = (value: string | null) => {
    if (!value) return 'Sin fecha';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Sin fecha';
    }

    return date.toLocaleDateString('es-ES');
  };

  const renderEpisode = (episode: ClinicalEpisode) => {
    const isOpen = episode.status === 'open';

    return (
      <Pressable
        key={episode.episodeId}
        style={styles.episodeCard}
        onPress={() => onSelectEpisode(episode)}
      >
        <View style={styles.episodeHeader}>
          <Ionicons
            name={isOpen ? 'ellipse' : 'checkmark-circle'}
            size={14}
            color={isOpen ? '#239B56' : colors.textMuted}
          />

          <Text style={styles.episodeTitle}>
            {episode.title}
          </Text>
        </View>

        <Text style={styles.episodeDate}>
          Apertura: {formatDate(episode.openedAt)}
        </Text>

        {!isOpen && (
          <Text style={styles.episodeDate}>
            Cierre: {formatDate(episode.closedAt)}
          </Text>
        )}

        <View style={styles.episodeFooter}>
          <Text style={styles.episodeAction}>
            Ver episodio
          </Text>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.primary}
          />
        </View>
      </Pressable>
    );
  };

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>Episodios clínicos</Text>

        <Pressable
          style={styles.createButton}
          onPress={onCreateEpisode}
        >
          <Ionicons
            name="add"
            size={18}
            color={colors.surface}
          />

          <Text style={styles.createButtonText}>
            Nuevo
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.loading}
        />
      ) : error ? (
        <View style={styles.messageContainer}>
          <Text style={styles.message}>{error}</Text>

          <Pressable onPress={() => void loadEpisodes()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : episodes.length === 0 ? (
        <View style={styles.messageContainer}>
          <Ionicons
            name="document-text-outline"
            size={34}
            color={colors.textMuted}
          />

          <Text style={styles.message}>
            Este paciente todavía no tiene episodios clínicos.
          </Text>
        </View>
      ) : (
        <>
          {openEpisodes.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>
                ABIERTOS ({openEpisodes.length})
              </Text>

              {openEpisodes.map(renderEpisode)}
            </View>
          )}

          {closedEpisodes.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>
                CERRADOS ({closedEpisodes.length})
              </Text>

              {closedEpisodes.map(renderEpisode)}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: colors.text,
  },

  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
  },

  createButtonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.surface,
  },

  loading: {
    marginVertical: 35,
  },

  sectionTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 18,
    marginBottom: 12,
  },

  episodeCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 15,
    padding: 17,
    marginBottom: 12,
  },

  episodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 10,
  },

  episodeTitle: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: colors.text,
  },

  episodeDate: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },

  episodeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },

  episodeAction: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },

  messageContainer: {
    alignItems: 'center',
    padding: 25,
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 15,
  },

  message: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },

  retryText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },
});