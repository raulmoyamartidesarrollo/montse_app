import React from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../../theme/colors';

import type {
  TimePeriod,
} from '../../../types/centerSchedules';

import TimePicker from './TimePicker';

// ==================================================
// TIPOS
// ==================================================

type TimePeriodRowProps = {
  index: number;
  period: TimePeriod;
  onChange: (period: TimePeriod) => void;
  onRemove: () => void;
  disabled?: boolean;
  canRemove?: boolean;
  error?: string | null;
};

// ==================================================
// COMPONENTE PRINCIPAL
// ==================================================

export default function TimePeriodRow({
  index,
  period,
  onChange,
  onRemove,
  disabled = false,
  canRemove = true,
  error = null,
}: TimePeriodRowProps) {

  // ==================================================
  // ACTUALIZAR HORA DE INICIO
  // ==================================================

  const handleStartChange = (start: string) => {
    if (disabled) {
      return;
    }

    onChange({
      ...period,
      start,
    });
  };

  // ==================================================
  // ACTUALIZAR HORA DE FIN
  // ==================================================

  const handleEndChange = (end: string) => {
    if (disabled) {
      return;
    }

    onChange({
      ...period,
      end,
    });
  };

  // ==================================================
  // ELIMINAR TRAMO
  // ==================================================

  const handleRemove = () => {
    if (disabled || !canRemove) {
      return;
    }

    onRemove();
  };

  // ==================================================
  // INTERFAZ
  // ==================================================

  return (
    <View
      style={[
        styles.container,
        !!error && styles.containerError,
      ]}
    >

      {/* CABECERA DEL TRAMO */}

      <View style={styles.header}>
        <Text style={styles.title}>
          TRAMO {index + 1}
        </Text>

        {canRemove && (
          <Pressable
            style={[
              styles.removeButton,
              disabled && styles.removeButtonDisabled,
            ]}
            onPress={handleRemove}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Eliminar tramo ${index + 1}`}
            accessibilityState={{ disabled }}
          >
            <Ionicons
              name="trash-outline"
              size={19}
              color={colors.error}
            />
          </Pressable>
        )}
      </View>

      {/* SELECTORES DE HORAS */}

      <View style={styles.timeRow}>
        <TimePicker
          label="Desde"
          value={period.start}
          onChange={handleStartChange}
          disabled={disabled}
        />

        <TimePicker
          label="Hasta"
          value={period.end}
          onChange={handleEndChange}
          disabled={disabled}
        />
      </View>

      {/* MENSAJE DE ERROR */}

      {!!error && (
        <View
          style={styles.errorRow}
          accessibilityLiveRegion="polite"
        >
          <Ionicons
            name="alert-circle-outline"
            size={18}
            color={colors.error}
          />

          <Text style={styles.errorText}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}

// ==================================================
// ESTILOS
// ==================================================

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 14,
    backgroundColor: colors.surface,
    padding: 12,
  },

  containerError: {
    borderColor: colors.error,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
    marginBottom: 10,
  },

  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.textMuted,
  },

  removeButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },

  removeButtonDisabled: {
    opacity: 0.4,
  },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
  },

  errorText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: colors.error,
  },
});
