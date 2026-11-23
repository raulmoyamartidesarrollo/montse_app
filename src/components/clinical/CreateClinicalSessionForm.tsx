import React, { useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  createPatientClinicalSession,
  updatePatientClinicalSession,
  type ClinicalSession,
} from '../../services/clinicalSessions';

interface Props {
  clientId: string;
  episodeId: string;
  onSaved: () => void;
  onCancel: () => void;
  session?: ClinicalSession;
}

const MAX_TEXT_LENGTH = 5000;

const getTodayLocal = (): string => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const isValidDate = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

export default function CreateClinicalSessionForm({
  clientId,
  episodeId,
  onSaved,
  onCancel,
  session,
}: Props) {
  const isEditing = Boolean(session);

  const [sessionDate, setSessionDate] = useState(
    session?.sessionDate ?? getTodayLocal()
  );

  const [painLevel, setPainLevel] = useState(
    session?.painLevel ?? 0
  );
  const [symptoms, setSymptoms] = useState(session?.symptoms ?? '');
  const [treatment, setTreatment] = useState(session?.treatment ?? '');
  const [exercises, setExercises] = useState(session?.exercises ?? '');
  const [evolution, setEvolution] = useState(session?.evolution ?? '');

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) {
      return;
    }

    if (!isValidDate(sessionDate.trim())) {
      Alert.alert(
        'Fecha incorrecta',
        'Introduce una fecha válida con formato AAAA-MM-DD.'
      );
      return;
    }

    if (
      !symptoms.trim() &&
      !treatment.trim() &&
      !exercises.trim() &&
      !evolution.trim()
    ) {
      Alert.alert(
        'Información incompleta',
        'Introduce al menos un dato clínico de la sesión.'
      );
      return;
    }

    try {
      setSaving(true);

      const input = {
        clientId,
        episodeId,
        sessionDate: sessionDate.trim(),
        painLevel,
        symptoms: symptoms.trim(),
        treatment: treatment.trim(),
        exercises: exercises.trim(),
        evolution: evolution.trim(),
      };

      if (session) {
        await updatePatientClinicalSession({
          ...input,
          sessionId: session.sessionId,
        });
      } else {
        await createPatientClinicalSession(input);
      }

      Alert.alert(
        isEditing ? 'Sesión actualizada' : 'Sesión registrada',
        isEditing
          ? 'Los cambios se han guardado correctamente.'
          : 'La sesión clínica se ha guardado correctamente.',
        [
          {
            text: 'Aceptar',
            onPress: onSaved,
          },
        ]
      );
    } catch (error) {
      console.error(
        'Error al registrar la sesión clínica:',
        error
      );

      Alert.alert(
        'Error',
        'No se ha podido registrar la sesión. Comprueba tu conexión e inténtalo de nuevo.'
      );
    } finally {
      setSaving(false);
    }
  };

  const renderTextArea = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string
  ) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        style={styles.textArea}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        multiline
        textAlignVertical="top"
        maxLength={MAX_TEXT_LENGTH}
        editable={!saving}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable
            onPress={onCancel}
            disabled={saving}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color="#334155"
            />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>
              {isEditing ? 'Editar sesión clínica' : 'Nueva sesión clínica'}
            </Text>

            <Text style={styles.subtitle}>
              {isEditing
                ? 'Modifica el tratamiento y la evolución registrados.'
                : 'Registra el tratamiento y la evolución del paciente.'}
            </Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            Fecha de la sesión *
          </Text>

          <TextInput
            style={styles.input}
            value={sessionDate}
            onChangeText={setSessionDate}
            placeholder="AAAA-MM-DD"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            editable={!saving}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            Nivel de dolor EVA *
          </Text>

          <Text style={styles.helpText}>
            0 = sin dolor · 10 = máximo dolor
          </Text>

          <View style={styles.painGrid}>
            {Array.from({ length: 11 }, (_, index) => (
              <Pressable
                key={index}
                disabled={saving}
                onPress={() => setPainLevel(index)}
                style={[
                  styles.painButton,
                  painLevel === index && styles.painButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.painButtonText,
                    painLevel === index &&
                      styles.painButtonTextSelected,
                  ]}
                >
                  {index}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.selectedPain}>
            Dolor seleccionado: {painLevel}/10
          </Text>
        </View>

        {renderTextArea(
          'Síntomas',
          symptoms,
          setSymptoms,
          'Describe los síntomas actuales del paciente...'
        )}

        {renderTextArea(
          'Tratamiento realizado',
          treatment,
          setTreatment,
          'Describe las técnicas y tratamientos aplicados...'
        )}

        {renderTextArea(
          'Ejercicios recomendados',
          exercises,
          setExercises,
          'Indica los ejercicios pautados al paciente...'
        )}

        {renderTextArea(
          'Evolución del paciente',
          evolution,
          setEvolution,
          'Describe la respuesta al tratamiento y la evolución...'
        )}

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
              styles.saveButton,
              saving && styles.disabledButton,
            ]}
            onPress={() => void handleSave()}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="save-outline"
                  size={18}
                  color="#FFFFFF"
                />

                <Text style={styles.saveButtonText}>
                  {isEditing ? 'Guardar cambios' : 'Guardar sesión'}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },

  backButton: {
    padding: 8,
    marginRight: 8,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },

  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 20,
  },

  field: {
    marginBottom: 22,
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },

  helpText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
  },

  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 110,
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 21,
  },

  painGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  painButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  painButtonSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },

  painButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },

  painButtonTextSelected: {
    color: '#FFFFFF',
  },

  selectedPain: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },

  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },

  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },

  cancelButtonText: {
    color: '#334155',
    fontWeight: '700',
  },

  saveButton: {
    flex: 1.5,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  disabledButton: {
    opacity: 0.6,
  },
});