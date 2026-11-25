import { useClinicalDraftGuard } from '../../hooks/useClinicalDraftGuard';

import React, { useRef, useState } from 'react';

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

import DateTimePicker from '@react-native-community/datetimepicker';

import { colors } from '../../theme/colors';
import { getMapEvaColors } from './ClinicalBodyDiagram';

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

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const parseLocalDate = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);

  const date = new Date();
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);

  return date;
};

const formatDisplayDate = (value: string): string => {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

const getPainLabel = (eva: number): string => {
  if (eva === 0) return 'Sin dolor';
  if (eva <= 3) return 'Dolor leve';
  if (eva <= 6) return 'Dolor moderado';
  return 'Dolor intenso';
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

  const [showDatePicker, setShowDatePicker] =
    useState(false);

  const [painLevel, setPainLevel] = useState<number | null>(
    session?.painLevel ?? null
  );
  const [symptoms, setSymptoms] = useState(session?.symptoms ?? '');
  const [treatment, setTreatment] = useState(session?.treatment ?? '');
  const [exercises, setExercises] = useState(session?.exercises ?? '');
  const [evolution, setEvolution] = useState(session?.evolution ?? '');

  const [saving, setSaving] = useState(false);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);

  const savingRef = useRef(false);
  const savedRef = useRef(false);

  const formLocked = saving || savedSuccessfully;

  const [initialDate] = useState(sessionDate);

  const hasChanges =
    !savedSuccessfully && (
    sessionDate !== initialDate ||
    painLevel !== (session?.painLevel ?? null) ||
    symptoms !== (session?.symptoms ?? '') ||
    treatment !== (session?.treatment ?? '') ||
    exercises !== (session?.exercises ?? '') ||
    evolution !== (session?.evolution ?? '')
    );

  useClinicalDraftGuard({
    dirty: hasChanges,
    saving,
  });

  const handleCancel = () => {
    if (savingRef.current || savedRef.current) return;

    if (!hasChanges) {
      onCancel();
      return;
    }

    Alert.alert(
      'Cambios sin guardar',
      'Si sales del formulario, perderás los cambios realizados.',
      [
        {
          text: 'Seguir editando',
          style: 'cancel',
        },
        {
          text: 'Descartar cambios',
          style: 'destructive',
          onPress: onCancel,
        },
      ]
    );
  };

  const handleSave = async () => {
    if (savingRef.current || savedRef.current) {
      return;
    }

    if (!isValidDate(sessionDate.trim())) {
      Alert.alert(
        'Fecha incorrecta',
        'Selecciona una fecha válida para la sesión.'
      );
      return;
    }

    if (
      painLevel === null ||
      !Number.isInteger(painLevel) ||
      painLevel < 0 ||
      painLevel > 10
    ) {
      Alert.alert(
        'Valoración del dolor',
        'Selecciona expresamente un nivel de dolor EVA entre 0 y 10.'
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
      savingRef.current = true;
      setSaving(true);
      setShowDatePicker(false);

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

      savedRef.current = true;
      setSavedSuccessfully(true);

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
        ],
        { cancelable: false }
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
      savingRef.current = false;
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
        placeholderTextColor={colors.textMuted}
        multiline
        textAlignVertical="top"
        maxLength={MAX_TEXT_LENGTH}
        editable={!formLocked}
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
            onPress={handleCancel}
            disabled={formLocked}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={colors.textSecondary}
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

          <Pressable
            style={styles.dateButton}
            disabled={formLocked}
            accessibilityRole="button"
            accessibilityLabel="Seleccionar fecha de la sesión"
            accessibilityState={{ expanded: showDatePicker }}
            onPress={() => setShowDatePicker((current) => !current)}
          >
            <Ionicons
              name="calendar-outline"
              size={22}
              color={colors.primaryPressed}
            />

            <Text style={styles.dateButtonText}>
              {formatDisplayDate(sessionDate)}
            </Text>

            <Ionicons
              name={showDatePicker ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>

          {showDatePicker && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={parseLocalDate(sessionDate)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                locale={Platform.OS === 'ios' ? 'es-ES' : undefined}
                onChange={(event, selectedDate) => {
                  if (Platform.OS !== 'ios') {
                    setShowDatePicker(false);
                  }

                  if (event.type === 'set' && selectedDate) {
                    setSessionDate(formatLocalDate(selectedDate));
                  }
                }}
              />

              {Platform.OS === 'ios' && (
                <Pressable
                  style={styles.dateConfirmButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.dateConfirmText}>
                    Confirmar fecha
                  </Text>
                </Pressable>
              )}
            </View>
          )}
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
                disabled={formLocked}
                onPress={() => setPainLevel(index)}
                accessibilityRole="button"
                accessibilityLabel={`EVA ${index}: ${getPainLabel(index)}`}
                accessibilityState={{ selected: painLevel === index }}
                style={[
                  styles.painButton,
                  painLevel === index && {
                    backgroundColor: getMapEvaColors(index).stroke,
                    borderColor: getMapEvaColors(index).stroke,
                  },
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

          <Text
            style={[
              styles.selectedPain,
              painLevel !== null && {
                color: getMapEvaColors(painLevel).stroke,
              },
            ]}
          >
            {painLevel === null
              ? 'Selecciona la intensidad del dolor'
              : `EVA ${painLevel}/10 · ${getPainLabel(painLevel)}`}
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
            onPress={handleCancel}
            disabled={formLocked}
          >
            <Text style={styles.cancelButtonText}>
              Cancelar
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.saveButton,
              formLocked && styles.disabledButton,
            ]}
            onPress={() => void handleSave()}
            disabled={formLocked}
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
    backgroundColor: colors.background,
  },

  content: {
    padding: 12,
    paddingBottom: 24,
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
    fontFamily: 'PlusJakartaSans_700Bold',
    color: colors.text,
  },

  subtitle: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 6,
    lineHeight: 20,
  },

  field: {
    marginBottom: 22,
  },

  label: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: colors.textSecondary,
    marginBottom: 8,
  },

  helpText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
  },

  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 15,
  },

  dateButtonText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: colors.text,
  },

  datePickerContainer: {
    marginTop: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 8,
  },

  dateConfirmButton: {
    backgroundColor: colors.primaryPressed,
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
  },

  dateConfirmText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.onPrimary,
    fontSize: 14,
  },

  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },

  textArea: {
    fontFamily: 'PlusJakartaSans_400Regular',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 110,
    fontSize: 14,
    color: colors.text,
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
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  painButtonText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.textSecondary,
  },

  painButtonTextSelected: {
    color: colors.surface,
  },

  selectedPain: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.primaryPressed,
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
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
  },

  cancelButtonText: {
    color: colors.textSecondary,
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  saveButton: {
    flex: 1.5,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: colors.primaryPressed,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveButtonText: {
    color: colors.surface,
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  disabledButton: {
    opacity: 0.6,
  },
});