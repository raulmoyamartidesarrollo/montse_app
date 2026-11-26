import React, {
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import type {
  CenterServiceInput,
} from '../../../services/centerServices';

import { colors } from '../../../theme/colors';

// ==================================================
// TIPOS
// ==================================================

export type CenterServiceFormValues = {
  name: string;
  description: string;
  price: string;
  duration: string;
  active: boolean;
};

type FormErrors = Partial<
  Record<keyof CenterServiceFormValues, string>
>;

type CenterServiceFormProps = {
  values: CenterServiceFormValues;
  onChange: (values: CenterServiceFormValues) => void;
  onSubmit: (payload: CenterServiceInput) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  saving?: boolean;
  disabled?: boolean;
};

const durationOptions = [
  15,
  30,
  45,
  60,
  90,
  120,
];

// ==================================================
// VALORES INICIALES
// ==================================================

export const defaultCenterServiceFormValues:
  CenterServiceFormValues = {
    name: '',
    description: '',
    price: '',
    duration: '60',
    active: true,
  };

// ==================================================
// VALIDACIONES
// ==================================================

function parsePriceCents(value: string): number | null {
  const normalized = value.trim().replace(',', '.');

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [euros, decimals = ''] =
    normalized.split('.');

  const cents =
    Number(euros) * 100 +
    Number(decimals.padEnd(2, '0'));

  if (
    !Number.isSafeInteger(cents) ||
    cents < 0 ||
    cents > 1000000
  ) {
    return null;
  }

  return cents;
}

function parseDuration(value: string): number | null {
  const normalized = value.trim();

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const duration = Number(normalized);

  if (
    !Number.isInteger(duration) ||
    duration < 5 ||
    duration > 480
  ) {
    return null;
  }

  return duration;
}

export function validateCenterServiceForm(
  values: CenterServiceFormValues
): FormErrors {
  const errors: FormErrors = {};

  if (!values.name.trim()) {
    errors.name = 'Introduce el nombre del servicio.';
  } else if (values.name.length > 120) {
    errors.name = 'Máximo 120 caracteres.';
  }

  if (values.description.length > 1000) {
    errors.description = 'Máximo 1.000 caracteres.';
  }

  if (parsePriceCents(values.price) === null) {
    errors.price =
      'Introduce un precio válido entre 0 y 10.000 €.';
  }

  if (parseDuration(values.duration) === null) {
    errors.duration =
      'Introduce una duración entre 5 y 480 minutos.';
  }

  return errors;
}

// ==================================================
// FORMULARIO
// ==================================================

export default function CenterServiceForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  submitLabel = 'Guardar servicio',
  saving = false,
  disabled = false,
}: CenterServiceFormProps) {
  const [errors, setErrors] =
    useState<FormErrors>({});

  const [submitting, setSubmitting] =
    useState(false);

  const [submitError, setSubmitError] =
    useState<string | null>(null);

  const submittingRef = useRef(false);

  const busy = saving || submitting;
  const locked = disabled || busy;

  function updateField<
    K extends keyof CenterServiceFormValues
  >(
    field: K,
    value: CenterServiceFormValues[K]
  ) {
    if (locked || submittingRef.current) {
      return;
    }

    onChange({
      ...values,
      [field]: value,
    });

    setErrors((previous) => ({
      ...previous,
      [field]: undefined,
    }));

    setSubmitError(null);
  }

  async function handleSubmit() {
    if (locked || submittingRef.current) {
      return;
    }

    const validationErrors =
      validateCenterServiceForm(values);

    setErrors(validationErrors);
    setSubmitError(null);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const priceCents =
      parsePriceCents(values.price);

    const durationMinutes =
      parseDuration(values.duration);

    if (
      priceCents === null ||
      durationMinutes === null
    ) {
      return;
    }

    const payload: CenterServiceInput = {
      name: values.name.trim(),
      description: values.description.trim(),
      priceCents,
      durationMinutes,
      active: values.active,
    };

    submittingRef.current = true;
    setSubmitting(true);

    try {
      await onSubmit(payload);
    } catch {
      setSubmitError(
        'No se ha podido confirmar el guardado. ' +
        'Comprueba el listado antes de volver a intentarlo.'
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>

      {/* INFORMACIÓN DEL SERVICIO */}

      <Text style={styles.sectionTitle}>
        INFORMACIÓN DEL SERVICIO
      </Text>

      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>
            Nombre del servicio *
          </Text>

          <TextInput
            accessibilityLabel="Nombre del servicio"
            style={[
              styles.input,
              errors.name && styles.inputError,
            ]}
            value={values.name}
            onChangeText={(value) =>
              updateField('name', value)
            }
            placeholder="Ej. Fisioterapia deportiva"
            placeholderTextColor={colors.textMuted}
            maxLength={120}
            editable={!locked}
          />

          {errors.name ? (
            <Text style={styles.errorText}>
              {errors.name}
            </Text>
          ) : null}
        </View>

        <View style={styles.fieldLast}>
          <Text style={styles.label}>
            Descripción
          </Text>

          <TextInput
            accessibilityLabel="Descripción del servicio"
            style={[
              styles.input,
              styles.textArea,
              errors.description && styles.inputError,
            ]}
            value={values.description}
            onChangeText={(value) =>
              updateField('description', value)
            }
            placeholder="Describe en qué consiste el tratamiento..."
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            maxLength={1000}
            editable={!locked}
          />

          <Text style={styles.counter}>
            {values.description.length}/1000
          </Text>

          {errors.description ? (
            <Text style={styles.errorText}>
              {errors.description}
            </Text>
          ) : null}
        </View>
      </View>

      {/* PRECIO Y DURACIÓN */}

      <Text style={styles.sectionTitle}>
        PRECIO Y DURACIÓN
      </Text>

      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>
            Precio por sesión *
          </Text>

          <View
            style={[
              styles.inputContainer,
              errors.price && styles.inputError,
            ]}
          >
            <Ionicons
              name="cash-outline"
              size={22}
              color={colors.primary}
            />

            <TextInput
              accessibilityLabel="Precio en euros"
              style={styles.numericInput}
              value={values.price}
              onChangeText={(value) =>
                updateField('price', value)
              }
              placeholder="0,00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              maxLength={8}
              editable={!locked}
            />

            <Text style={styles.unit}>€</Text>
          </View>

          <Text style={styles.helpText}>
            Importe correspondiente a una sesión.
          </Text>

          {errors.price ? (
            <Text style={styles.errorText}>
              {errors.price}
            </Text>
          ) : null}
        </View>

        <View style={styles.fieldLast}>
          <Text style={styles.label}>
            Duración de la sesión *
          </Text>

          <View style={styles.durationOptions}>
            {durationOptions.map((duration) => {
              const selected =
                values.duration === String(duration);

              return (
                <Pressable
                  key={duration}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected,
                    disabled: locked,
                  }}
                  disabled={locked}
                  style={[
                    styles.durationChip,
                    selected &&
                      styles.durationChipActive,
                  ]}
                  onPress={() =>
                    updateField(
                      'duration',
                      String(duration)
                    )
                  }
                >
                  <Text
                    style={[
                      styles.durationChipText,
                      selected &&
                        styles.durationChipTextActive,
                    ]}
                  >
                    {duration} min
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View
            style={[
              styles.inputContainer,
              errors.duration && styles.inputError,
            ]}
          >
            <Ionicons
              name="time-outline"
              size={22}
              color={colors.primary}
            />

            <TextInput
              accessibilityLabel="Duración en minutos"
              style={styles.numericInput}
              value={values.duration}
              onChangeText={(value) =>
                updateField('duration', value)
              }
              placeholder="60"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={3}
              editable={!locked}
            />

            <Text style={styles.unit}>min</Text>
          </View>

          <Text style={styles.helpText}>
            Selecciona una duración o introduce los
            minutos manualmente.
          </Text>

          {errors.duration ? (
            <Text style={styles.errorText}>
              {errors.duration}
            </Text>
          ) : null}
        </View>
      </View>

      {/* ESTADO DEL SERVICIO */}

      <Text style={styles.sectionTitle}>
        DISPONIBILIDAD
      </Text>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchIcon}>
            <Ionicons
              name={
                values.active
                  ? 'checkmark-circle-outline'
                  : 'pause-circle-outline'
              }
              size={25}
              color={colors.secondary}
            />
          </View>

          <View style={styles.switchContent}>
            <Text style={styles.switchTitle}>
              Servicio activo
            </Text>

            <Text style={styles.switchDescription}>
              {values.active
                ? 'El servicio está habilitado.'
                : 'El servicio está deshabilitado.'}
            </Text>
          </View>

          <Switch
            accessibilityLabel="Servicio activo"
            value={values.active}
            onValueChange={(value) =>
              updateField('active', value)
            }
            disabled={locked}
            trackColor={{
              false: colors.disabled,
              true: colors.secondary,
            }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      <Text style={styles.requiredText}>
        * Campos obligatorios
      </Text>

      {submitError ? (
        <View style={styles.errorBanner}>
          <Ionicons
            name="alert-circle-outline"
            size={21}
            color={colors.error}
          />

          <Text style={styles.errorBannerText}>
            {submitError}
          </Text>
        </View>
      ) : null}

      {/* ACCIONES */}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: locked }}
        disabled={locked}
        style={[
          styles.submitButton,
          locked && styles.disabledButton,
        ]}
        onPress={() => void handleSubmit()}
      >
        {busy ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Ionicons
            name="checkmark-circle-outline"
            size={21}
            color={colors.white}
          />
        )}

        <Text style={styles.submitText}>
          {busy ? 'Guardando...' : submitLabel}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        style={[
          styles.cancelButton,
          busy && styles.disabledButton,
        ]}
        onPress={() => {
          if (!submittingRef.current) {
            onCancel();
          }
        }}
      >
        <Text style={styles.cancelText}>
          Cancelar
        </Text>
      </Pressable>
    </View>
  );
}

// ==================================================
// ESTILOS
// ==================================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  sectionTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.textMuted,
    marginTop: 24,
    marginBottom: 13,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: 18,
  },

  field: {
    marginBottom: 22,
  },

  fieldLast: {
    marginBottom: 0,
  },

  label: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.text,
    marginBottom: 10,
  },

  input: {
    minHeight: 52,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: colors.text,
  },

  inputError: {
    borderColor: colors.error,
  },

  textArea: {
    minHeight: 120,
  },

  counter: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 7,
  },

  inputContainer: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 14,
    gap: 12,
  },

  numericInput: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 17,
    color: colors.text,
    paddingVertical: 12,
  },

  unit: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: colors.primary,
  },

  helpText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: 8,
  },

  errorText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    lineHeight: 18,
    color: colors.error,
    marginTop: 7,
  },

  durationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },

  durationChip: {
    minHeight: 39,
    paddingHorizontal: 13,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  durationChipActive: {
    backgroundColor: colors.primary,
  },

  durationChipText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: colors.textSecondary,
  },

  durationChipTextActive: {
    color: colors.white,
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  switchIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },

  switchContent: {
    flex: 1,
  },

  switchTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: colors.text,
  },

  switchDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 5,
  },

  requiredText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 16,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.errorContainer,
    borderRadius: 13,
    padding: 14,
    marginTop: 16,
  },

  errorBannerText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    lineHeight: 19,
    color: colors.error,
  },

  submitButton: {
    minHeight: 54,
    borderRadius: 17,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24,
  },

  submitText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: colors.white,
  },

  cancelButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  cancelText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.textSecondary,
  },

  disabledButton: {
    opacity: 0.6,
  },
});
