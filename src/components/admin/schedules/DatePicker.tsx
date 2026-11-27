import React, { useState } from 'react';

import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';

import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../../theme/colors';

import {
  isValidDateISO,
} from '../../../utils/centerScheduleDates';

// ==================================================
// TIPOS
// ==================================================

type DatePickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  minimumDateISO?: string;
  maximumDateISO?: string;
};

// ==================================================
// CONVERSIÓN DE FECHAS
// ==================================================

function dateISOToLocalDate(
  value: string
): Date {
  if (!isValidDateISO(value)) {
    throw new Error(
      'La fecha seleccionada no es válida.'
    );
  }

  const [year, month, day] = value
    .split('-')
    .map(Number);

  const date = new Date();

  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, month - 1, day);

  return date;
}

function localDateToISO(
  date: Date
): string {
  const year = String(
    date.getFullYear()
  ).padStart(4, '0');

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDate(
  value: string
): string {
  if (!isValidDateISO(value)) {
    return 'Seleccionar fecha';
  }

  return new Intl.DateTimeFormat(
    'es-ES',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }
  ).format(
    new Date(`${value}T12:00:00.000Z`)
  );
}

// ==================================================
// COMPONENTE PRINCIPAL
// ==================================================

export default function DatePicker({
  label,
  value,
  onChange,
  disabled = false,
  minimumDateISO,
  maximumDateISO,
}: DatePickerProps) {
  const [visible, setVisible] =
    useState(false);

  const [draftDate, setDraftDate] =
    useState<Date>(() =>
      dateISOToLocalDate(value)
    );

  const minimumDate =
    minimumDateISO
      ? dateISOToLocalDate(minimumDateISO)
      : undefined;

  const maximumDate =
    maximumDateISO
      ? dateISOToLocalDate(maximumDateISO)
      : undefined;

  // ==================================================
  // VALIDAR SELECCIÓN
  // ==================================================

  function commitDate(date: Date) {
    if (disabled) {
      return;
    }

    const dateISO = localDateToISO(date);

    if (!isValidDateISO(dateISO)) {
      return;
    }

    if (
      minimumDateISO &&
      dateISO < minimumDateISO
    ) {
      return;
    }

    if (
      maximumDateISO &&
      dateISO > maximumDateISO
    ) {
      return;
    }

    onChange(dateISO);
  }

  // ==================================================
  // ABRIR SELECTOR
  // ==================================================

  function openPicker() {
    if (disabled) {
      return;
    }

    const initialDate =
      dateISOToLocalDate(value);

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initialDate,
        mode: 'date',
        display: 'calendar',
        minimumDate,
        maximumDate,

        onValueChange: (_, selectedDate) => {
          commitDate(selectedDate);
        },

        onDismiss: () => {
          // Mantener la fecha anterior.
        },
      });

      return;
    }

    setDraftDate(initialDate);
    setVisible(true);
  }

  // ==================================================
  // CANCELAR Y CONFIRMAR
  // ==================================================

  function closePicker() {
    setVisible(false);
  }

  function confirmPicker() {
    commitDate(draftDate);
    closePicker();
  }

  // ==================================================
  // INTERFAZ
  // ==================================================

  return (
    <View style={styles.container}>

      <Text style={styles.label}>
        {label}
      </Text>

      <Pressable
        style={[
          styles.input,
          disabled && styles.inputDisabled,
        ]}
        onPress={openPicker}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={
          `${label}: ${formatDate(value)}`
        }
        accessibilityHint="Seleccionar fecha"
        accessibilityState={{ disabled }}
      >
        <Ionicons
          name="calendar-outline"
          size={21}
          color={colors.primary}
        />

        <Text style={styles.inputText}>
          {formatDate(value)}
        </Text>

        {!disabled && (
          <Ionicons
            name="chevron-down"
            size={17}
            color={colors.textMuted}
          />
        )}
      </Pressable>

      {/* SELECTOR IOS */}

      {Platform.OS === 'ios' && (
        <Modal
          visible={visible}
          transparent
          animationType="fade"
          onRequestClose={closePicker}
        >
          <View style={styles.overlay}>
            <View
              style={styles.modalCard}
              accessibilityViewIsModal
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <Ionicons
                    name="calendar-outline"
                    size={25}
                    color={colors.primary}
                  />
                </View>

                <Text style={styles.modalTitle}>
                  Seleccionar fecha
                </Text>

                <Text style={styles.modalDescription}>
                  {label}
                </Text>
              </View>

              <DateTimePicker
                value={draftDate}
                mode="date"
                display="inline"
                locale="es-ES"
                themeVariant="light"
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onValueChange={(_, selectedDate) => {
                  setDraftDate(selectedDate);
                }}
                style={styles.nativePicker}
              />

              <View style={styles.modalActions}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={closePicker}
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelText}>
                    Cancelar
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.confirmButton}
                  onPress={confirmPicker}
                  disabled={disabled}
                  accessibilityRole="button"
                >
                  <Text style={styles.confirmText}>
                    Aceptar
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
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

  label: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },

  input: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    minHeight: 54,
    paddingHorizontal: 14,
    gap: 12,
  },

  inputDisabled: {
    opacity: 0.6,
  },

  inputText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: colors.text,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.40)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 16,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },

  modalHeader: {
    alignItems: 'center',
  },

  modalIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  modalTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: colors.text,
  },

  modalDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
  },

  nativePicker: {
    alignSelf: 'stretch',
    marginVertical: 12,
  },

  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },

  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: colors.textSecondary,
  },

  confirmButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  confirmText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: colors.white,
  },
});
