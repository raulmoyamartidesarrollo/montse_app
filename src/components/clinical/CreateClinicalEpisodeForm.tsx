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
  createPatientClinicalEpisode,
  type CreateClinicalEpisodeInput,
} from '../../services/clinicalEpisodes';

interface Props {
  clientId: string;
  onCancel: () => void;
  onCreated: () => void;
}

export default function CreateClinicalEpisodeForm({
  clientId,
  onCancel,
  onCreated,
}: Props) {
  const [title, setTitle] = useState('');
  const [reasonForConsultation, setReasonForConsultation] =
    useState('');
  const [affectedArea, setAffectedArea] = useState('');
  const [observations, setObservations] = useState('');

  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (saving) return;

    if (!title.trim()) {
      Alert.alert(
        'Campo obligatorio',
        'Introduce un nombre para el episodio clínico.'
      );
      return;
    }

    const input: CreateClinicalEpisodeInput = {
      clientId,
      title: title.trim(),
      reasonForConsultation: reasonForConsultation.trim(),
      affectedArea: affectedArea.trim(),
      observations: observations.trim(),
    };

    try {
      setSaving(true);

      await createPatientClinicalEpisode(input);

      Alert.alert(
        'Episodio creado',
        'El episodio clínico se ha creado correctamente.'
      );

      onCreated();
    } catch (error) {
      console.error('Error creando episodio clínico:', error);

      Alert.alert(
        'Error',
        'No se ha podido crear el episodio clínico. Comprueba la conexión e inténtalo de nuevo.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons
          name="add-circle-outline"
          size={24}
          color={colors.primary}
        />

        <Text style={styles.title}>
          Nuevo episodio clínico
        </Text>
      </View>

      <Text style={styles.description}>
        Registra una nueva dolencia o tratamiento para este paciente.
      </Text>

      <Text style={styles.label}>
        Nombre del episodio *
      </Text>

      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Ej. Lumbalgia"
        placeholderTextColor={colors.textMuted}
        maxLength={150}
        editable={!saving}
      />

      <Text style={styles.label}>
        Motivo de consulta
      </Text>

      <TextInput
        style={styles.textarea}
        value={reasonForConsultation}
        onChangeText={setReasonForConsultation}
        placeholder="Describe el motivo de consulta..."
        placeholderTextColor={colors.textMuted}
        multiline
        textAlignVertical="top"
        maxLength={2000}
        editable={!saving}
      />

      <Text style={styles.label}>
        Zona afectada
      </Text>

      <TextInput
        style={styles.input}
        value={affectedArea}
        onChangeText={setAffectedArea}
        placeholder="Ej. Zona lumbar derecha"
        placeholderTextColor={colors.textMuted}
        maxLength={1000}
        editable={!saving}
      />

      <Text style={styles.label}>
        Observaciones internas
      </Text>

      <TextInput
        style={styles.textarea}
        value={observations}
        onChangeText={setObservations}
        placeholder="Observaciones reservadas al profesional..."
        placeholderTextColor={colors.textMuted}
        multiline
        textAlignVertical="top"
        maxLength={10000}
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
            styles.createButton,
            saving && styles.disabledButton,
          ]}
          onPress={() => void handleCreate()}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator
              size="small"
              color={colors.surface}
            />
          ) : (
            <Ionicons
              name="save-outline"
              size={18}
              color={colors.surface}
            />
          )}

          <Text style={styles.createButtonText}>
            {saving ? 'Guardando...' : 'Crear episodio'}
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
    marginBottom: 12,
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
    marginBottom: 20,
  },

  label: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.text,
    marginTop: 15,
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: colors.text,
  },

  textarea: {
    minHeight: 105,
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

  createButton: {
    flex: 1.5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },

  createButtonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.surface,
  },

  disabledButton: {
    opacity: 0.6,
  },
});