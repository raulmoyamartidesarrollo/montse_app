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
  CenterSpecialSchedule,
} from '../../../types/centerSpecialSchedules';

import {
  formatCenterDate,
} from '../../../utils/centerScheduleDates';

// ==================================================
// PROPIEDADES
// ==================================================

type Props = {
  schedule: CenterSpecialSchedule;
  onEdit?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
};

// ==================================================
// COMPONENTE
// ==================================================

export default function SpecialScheduleCard({
  schedule,
  onEdit,
  onDelete,
  disabled = false,
}: Props) {
  const day = schedule.dateISO.slice(8, 10);

  const year = schedule.dateISO.slice(0, 4);

  const month = formatCenterDate(
    schedule.dateISO,
    {
      month: 'short',
    }
  )
    .replace(/\./g, '')
    .toUpperCase();

  const weekday = formatCenterDate(
    schedule.dateISO,
    {
      weekday: 'long',
    }
  );

  const weekdayLabel =
    weekday.charAt(0).toUpperCase() +
    weekday.slice(1);

  const fullDate = formatCenterDate(
    schedule.dateISO
  );

  const hasActions =
    Boolean(onEdit) || Boolean(onDelete);

  return (
    <View style={styles.card}>

      {/* CABECERA */}

      <View style={styles.header}>

        {/* FECHA */}

        <View style={styles.dateBox}>
          <Text style={styles.dateDay}>
            {day}
          </Text>

          <Text style={styles.dateMonth}>
            {month}
          </Text>

          <Text style={styles.dateYear}>
            {year}
          </Text>
        </View>

        {/* INFORMACIÓN */}

        <View style={styles.headerContent}>
          <Text style={styles.weekday}>
            {weekdayLabel}
          </Text>

          <View
            style={[
              styles.statusBadge,
              schedule.closed
                ? styles.closedBadge
                : styles.openBadge,
            ]}
          >
            <Ionicons
              name={
                schedule.closed
                  ? 'lock-closed-outline'
                  : 'time-outline'
              }
              size={14}
              color={
                schedule.closed
                  ? colors.error
                  : colors.secondary
              }
            />

            <Text
              style={[
                styles.statusText,
                schedule.closed
                  ? styles.closedText
                  : styles.openText,
              ]}
            >
              {schedule.closed
                ? 'Centro cerrado'
                : 'Horario especial'}
            </Text>
          </View>
        </View>
      </View>

      {/* TRAMOS HORARIOS */}

      <View style={styles.scheduleContent}>
        {schedule.closed ? (
          <View style={styles.periodRow}>
            <Ionicons
              name="lock-closed-outline"
              size={19}
              color={colors.textMuted}
            />

            <Text style={styles.closedDescription}>
              Cerrado durante todo el día
            </Text>
          </View>
        ) : (
          schedule.periods.map((period) => (
            <View
              key={`${period.start}-${period.end}`}
              style={styles.periodRow}
            >
              <Ionicons
                name="time-outline"
                size={19}
                color={colors.primary}
              />

              <Text style={styles.periodText}>
                {period.start} - {period.end}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* MOTIVO */}

      {schedule.reason.trim().length > 0 && (
        <View style={styles.reasonContainer}>
          <Text style={styles.reasonLabel}>
            Motivo
          </Text>

          <Text style={styles.reasonText}>
            {schedule.reason}
          </Text>
        </View>
      )}

      {/* ACCIONES */}

      {hasActions && (
        <View style={styles.actions}>

          {onEdit && (
            <Pressable
              style={[
                styles.actionButton,
                disabled && styles.disabledAction,
              ]}
              onPress={onEdit}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={
                `Editar horario del ${fullDate}`
              }
              accessibilityState={{
                disabled,
              }}
            >
              <Ionicons
                name="create-outline"
                size={19}
                color={colors.primary}
              />

              <Text style={styles.editText}>
                Editar
              </Text>
            </Pressable>
          )}

          {onDelete && (
            <Pressable
              style={[
                styles.actionButton,
                disabled && styles.disabledAction,
              ]}
              onPress={onDelete}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={
                `Eliminar horario del ${fullDate}`
              }
              accessibilityState={{
                disabled,
              }}
            >
              <Ionicons
                name="trash-outline"
                size={19}
                color={colors.error}
              />

              <Text style={styles.deleteText}>
                Eliminar
              </Text>
            </Pressable>
          )}

        </View>
      )}
    </View>
  );
}

// ==================================================
// ESTILOS
// ==================================================

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: 16,
    marginBottom: 14,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  dateBox: {
    width: 76,
    minHeight: 90,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },

  dateDay: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 27,
    color: colors.text,
  },

  dateMonth: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 1,
  },

  dateYear: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
  },

  headerContent: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
  },

  weekday: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17,
    color: colors.text,
    marginBottom: 8,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: '100%',
  },

  openBadge: {
    backgroundColor: colors.secondaryContainer,
  },

  closedBadge: {
    backgroundColor: colors.errorContainer,
  },

  statusText: {
    flexShrink: 1,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
  },

  openText: {
    color: colors.secondary,
  },

  closedText: {
    color: colors.error,
  },

  scheduleContent: {
    marginTop: 18,
    gap: 10,
  },

  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  periodText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: colors.text,
  },

  closedDescription: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
  },

  reasonContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },

  reasonLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 5,
  },

  reasonText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },

  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    marginTop: 16,
    paddingTop: 8,
    gap: 10,
  },

  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    gap: 7,
    paddingHorizontal: 6,
  },

  disabledAction: {
    opacity: 0.45,
  },

  editText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },

  deleteText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.error,
  },
});
