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

// ==================================================
// TIPOS
// ==================================================

type TimePickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

// ==================================================
// FUNCIONES AUXILIARES
// ==================================================

function timeToDate(value: string): Date {
  const date = new Date(2026, 0, 15, 12, 0, 0, 0);

  if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
    date.setHours(9, 0, 0, 0);

    return date;
  }

  const [hours, minutes] = value
    .split(':')
    .map(Number);

  date.setHours(hours, minutes, 0, 0);

  return date;
}

function dateToTime(date: Date): string {
  const hours = String(
    date.getHours()
  ).padStart(2, '0');

  const minutes = String(
    date.getMinutes()
  ).padStart(2, '0');

  return `${hours}:${minutes}`;
}

// ==================================================
// COMPONENTE PRINCIPAL
// ==================================================

export default function TimePicker({
  label,
  value,
  onChange,
  disabled = false,
}: TimePickerProps) {
  const [visible, setVisible] = useState(false);

  const [draftDate, setDraftDate] =
    useState<Date>(() => timeToDate(value));

  // ==================================================
  // ABRIR SELECTOR
  // ==================================================

  const openPicker = () => {
    if (disabled) {
      return;
    }

    const initialDate = timeToDate(value);

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initialDate,
        mode: 'time',
        is24Hour: true,
        display: 'default',

        onValueChange: (_, selectedDate) => {
          onChange(
            dateToTime(selectedDate)
          );
        },

        onDismiss: () => {
          // Mantener la hora anterior.
        },
      });

      return;
    }

    setDraftDate(initialDate);
    setVisible(true);
  };

  // ==================================================
  // CANCELAR
  // ==================================================

  const closePicker = () => {
    setVisible(false);
  };

  // ==================================================
  // CONFIRMAR HORA
  // ==================================================

  const confirmPicker = () => {
    if (disabled) {
      closePicker();
      return;
    }

    onChange(
      dateToTime(draftDate)
    );

    closePicker();
  };

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
        accessibilityLabel={`${label}: ${value}`}
        accessibilityHint="Seleccionar hora"
        accessibilityState={{ disabled }}
      >
        <Ionicons
          name="time-outline"
          size={19}
          color={colors.primary}
        />

        <Text style={styles.inputText}>
          {value}
        </Text>

        <Ionicons
          name="chevron-down"
          size={15}
          color={colors.textMuted}
        />
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
                    name="time-outline"
                    size={24}
                    color={colors.primary}
                  />
                </View>

                <Text style={styles.modalTitle}>
                  Seleccionar hora
                </Text>

                <Text style={styles.modalDescription}>
                  {label}
                </Text>
              </View>

              <DateTimePicker
                value={draftDate}
                mode="time"
                display="spinner"
                locale="es-ES"
                is24Hour
                minuteInterval={1}
                themeVariant="light"
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
                  accessibilityRole="button"
                  disabled={disabled}
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
    flex: 1,
    minWidth: 0,
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
    minHeight: 48,
    paddingHorizontal: 12,
    gap: 8,
  },

  inputDisabled: {
    opacity: 0.5,
  },

  inputText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.40)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
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
    marginBottom: 14,
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
    height: 200,
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
