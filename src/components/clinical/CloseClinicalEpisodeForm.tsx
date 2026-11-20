import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../theme/colors';

import {
  closePatientClinicalEpisode,
  type ClinicalEpisode,
} from '../../services/clinicalEpisodes';

interface Props {
  episode: ClinicalEpisode;
  onCancel: () => void;
  onClosed: () => void;
}

export default function CloseClinicalEpisodeForm({
  episode,
  onCancel,
  onClosed,
}: Props) {
  const [closingReason, setClosingReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleClose = async () => {
    if (saving) return;

    if (episode.status !== 'open') {
      Alert.alert(
        'Episodio cerrado',
        'Este episodio ya está cerrado.'
      );
      return;
    }

    if (!closingReason.trim()) {
      Alert.alert(
        'Motivo obligatorio',
        'Indica el motivo del cierre del episodio.'
      );
      return;
    }

    try {
      setSaving(true);

      await closePatientClinicalEpisode(
        episode.clientId,
        episode.episodeId,
        closingReason.trim()
      );

      onClosed();

      Alert.alert(
        'Episodio cerrado',
        'El episodio clínico se ha cerrado correctamente.'
      );
    } catch (error) {
      console.error(
        'Error cerrando episodio clínico:',
        error
      );

      Alert.alert(
        'Error',
        'No se ha podido cerrar el episodio. Comprueba la conexión e inténtalo de nuevo.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons
          name="lock-closed-outline"
          size={24}
          color={colors.primary}
        />

        <Text style={styles.title}>
          Cerrar episodio clínico
        </Text>
      </View>

      <Text style={styles.description}>
        Vas a cerrar el siguiente episodio:
      </Text>

      <Text style={styles.episodeTitle}>
        {episode.title}
      </Text>

      <Text style={styles.description}>
        Una vez cerrado, no se podrá modificar hasta que
        vuelva a abrirse.
      </Text>

      <Text style={styles.label}>
        Motivo del cierre *
      </Text>

      <TextInput
        style={styles.textarea}
        value={closingReason}
        onChangeText={setClosingReason}
        placeholder="Ej. Alta por mejoría clínica..."
        placeholderTextColor={colors.textMuted}
        multiline
        textAlignVertical="top"
        maxLength={2000}
        editable={!saving}
      />

      <View style={styles.actions}>
        <Pressable
          style={styles.cancelButton}
          onPress={onCancel}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>
            Cancelar
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.closeButton,
            saving && styles.disabledButton,
          ]}
          onPress={() => void handleClose()}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator
              size="small"
              color={colors.surface}
            />
          ) : (
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={colors.surface}
            />
          )}

          <Text style={styles.closeButtonText}>
            {saving ? 'Cerrando...' : 'Confirmar cierre'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },

  title: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: colors.text,
  },

  description: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: 14,
  },

  episodeTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: colors.text,
    marginBottom: 14,
  },

  label: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },

  textarea: {
    minHeight: 115,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 28,
  },

  cancelButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },

  cancelButtonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.text,
  },

  closeButton: {
    flex: 1.5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },

  closeButtonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.surface,
  },

  disabledButton: {
    opacity: 0.6,
  },
});