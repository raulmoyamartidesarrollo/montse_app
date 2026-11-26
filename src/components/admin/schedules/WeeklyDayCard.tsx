import React from 'react';

import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../../theme/colors';

import {
  MAX_DAILY_PERIODS,
  WEEK_DAY_LABELS,
  type WeekDay,
  type DailySchedule,
  type TimePeriod,
} from '../../../types/centerSchedules';

import TimePeriodRow from './TimePeriodRow';

// ==================================================
// TIPOS
// ==================================================

type WeeklyDayCardProps = {
  day: WeekDay;
  schedule: DailySchedule;
  onChange: (schedule: DailySchedule) => void;
  onCopy?: () => void;
  disabled?: boolean;
  dayError?: string | null;
  periodErrors?: Record<number, string>;
};

// ==================================================
// HORARIO PREDETERMINADO
// ==================================================

const DEFAULT_PERIOD: TimePeriod = {
  start: '09:00',
  end: '14:00',
};

// ==================================================
// FUNCIONES AUXILIARES
// ==================================================

function timeToMinutes(value: string): number {
  const [hours, minutes] = value
    .split(':')
    .map(Number);

  return hours * 60 + minutes;
}

function minutesToTime(value: number): string {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return (
    String(hours).padStart(2, '0') +
    ':' +
    String(minutes).padStart(2, '0')
  );
}

// Buscar un hueco disponible de hasta una hora.
// Se priorizan los huecos posteriores al último tramo.

function getNextAvailablePeriod(
  periods: TimePeriod[]
): TimePeriod | null {
  const sorted = [...periods].sort(
    (a, b) =>
      timeToMinutes(a.start) -
      timeToMinutes(b.start)
  );

  const endOfDay = 23 * 60 + 59;

  const lastPeriod =
    sorted[sorted.length - 1];

  if (!lastPeriod) {
    return { ...DEFAULT_PERIOD };
  }

  const lastEnd = Math.max(
    ...sorted.map(
      (period) => timeToMinutes(period.end)
    )
  );

  // Preferir un nuevo tramo después del último.

  const preferredStart = lastEnd + 60;

  if (preferredStart + 60 <= endOfDay) {
    return {
      start: minutesToTime(preferredStart),
      end: minutesToTime(preferredStart + 60),
    };
  }

  if (lastEnd + 60 <= endOfDay) {
    return {
      start: minutesToTime(lastEnd),
      end: minutesToTime(lastEnd + 60),
    };
  }

  // Buscar huecos entre los tramos existentes.

  let cursor = 0;

  for (const period of sorted) {
    const start = timeToMinutes(period.start);
    const end = timeToMinutes(period.end);

    if (start - cursor >= 60) {
      return {
        start: minutesToTime(cursor),
        end: minutesToTime(cursor + 60),
      };
    }

    cursor = Math.max(cursor, end);
  }

  // Buscar un hueco inferior a una hora.

  cursor = 0;

  for (const period of sorted) {
    const start = timeToMinutes(period.start);
    const end = timeToMinutes(period.end);

    if (start > cursor) {
      return {
        start: minutesToTime(cursor),
        end: minutesToTime(
          Math.min(cursor + 60, start)
        ),
      };
    }

    cursor = Math.max(cursor, end);
  }

  if (cursor < endOfDay) {
    return {
      start: minutesToTime(cursor),
      end: minutesToTime(
        Math.min(cursor + 60, endOfDay)
      ),
    };
  }

  return null;
}

// ==================================================
// COMPONENTE PRINCIPAL
// ==================================================

export default function WeeklyDayCard({
  day,
  schedule,
  onChange,
  onCopy,
  disabled = false,
  dayError = null,
  periodErrors = {},
}: WeeklyDayCardProps) {
  const isOpen = !schedule.closed;

  const periods = schedule.periods;

  const hasErrors =
    !!dayError ||
    Object.keys(periodErrors).length > 0;

  const nextPeriod =
    isOpen && !hasErrors
      ? getNextAvailablePeriod(periods)
      : null;

  const canAddPeriod =
    !disabled &&
    isOpen &&
    periods.length < MAX_DAILY_PERIODS &&
    nextPeriod !== null;

  // ==================================================
  // ABRIR O CERRAR EL DÍA
  // ==================================================

  const handleToggle = (open: boolean) => {
    if (disabled) {
      return;
    }

    if (open) {
      onChange({
        closed: false,
        periods: [
          { ...DEFAULT_PERIOD },
        ],
      });

      return;
    }

    onChange({
      closed: true,
      periods: [],
    });
  };

  // ==================================================
  // ACTUALIZAR TRAMO
  // ==================================================

  const handlePeriodChange = (
    index: number,
    updatedPeriod: TimePeriod
  ) => {
    if (disabled || !isOpen) {
      return;
    }

    onChange({
      closed: false,
      periods: periods.map(
        (period, currentIndex) =>
          currentIndex === index
            ? updatedPeriod
            : period
      ),
    });
  };

  // ==================================================
  // AÑADIR TRAMO
  // ==================================================

  const handleAddPeriod = () => {
    if (!canAddPeriod || !nextPeriod) {
      return;
    }

    onChange({
      closed: false,
      periods: [
        ...periods,
        nextPeriod,
      ],
    });
  };

  // ==================================================
  // ELIMINAR TRAMO
  // ==================================================

  const handleRemovePeriod = (
    index: number
  ) => {
    if (
      disabled ||
      !isOpen ||
      periods.length <= 1
    ) {
      return;
    }

    onChange({
      closed: false,
      periods: periods.filter(
        (_, currentIndex) =>
          currentIndex !== index
      ),
    });
  };

  // ==================================================
  // INTERFAZ
  // ==================================================

  return (
    <View
      style={[
        styles.container,
        hasErrors && styles.containerError,
      ]}
    >

      {/* CABECERA DEL DÍA */}

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.dayTitle}>
            {WEEK_DAY_LABELS[day]}
          </Text>

          <Text style={styles.dayDescription}>
            {!isOpen
              ? 'Sin horario de apertura'
              : periods.length === 1
                ? '1 tramo de apertura'
                : `${periods.length} tramos de apertura`}
          </Text>
        </View>

        <View style={styles.switchContainer}>
          <Text
            style={[
              styles.statusText,
              isOpen && styles.statusTextOpen,
            ]}
          >
            {isOpen ? 'Abierto' : 'Cerrado'}
          </Text>

          <Switch
            value={isOpen}
            onValueChange={handleToggle}
            disabled={disabled}
            trackColor={{
              false: colors.surfaceBorder,
              true: colors.primary,
            }}
            thumbColor={colors.white}
            accessibilityLabel={
              `Apertura del ${WEEK_DAY_LABELS[day]}`
            }
          />
        </View>
      </View>

      {/* TRAMOS HORARIOS */}

      {isOpen && (
        <>
          <View style={styles.separator} />

          <View style={styles.periodsContainer}>
            {periods.map((period, index) => (
              <TimePeriodRow
                key={index}
                index={index}
                period={period}
                onChange={(updatedPeriod) =>
                  handlePeriodChange(
                    index,
                    updatedPeriod
                  )
                }
                onRemove={() =>
                  handleRemovePeriod(index)
                }
                canRemove={periods.length > 1}
                disabled={disabled}
                error={periodErrors[index] ?? null}
              />
            ))}
          </View>

          {/* AÑADIR TRAMO */}

          {periods.length < MAX_DAILY_PERIODS && (
            <Pressable
              style={[
                styles.addButton,
                !canAddPeriod &&
                  styles.buttonDisabled,
              ]}
              onPress={handleAddPeriod}
              disabled={!canAddPeriod}
              accessibilityRole="button"
              accessibilityLabel="Añadir tramo horario"
            >
              <Ionicons
                name="add-circle-outline"
                size={21}
                color={colors.primary}
              />

              <Text style={styles.addButtonText}>
                Añadir tramo horario
              </Text>
            </Pressable>
          )}

          {periods.length >= MAX_DAILY_PERIODS && (
            <Text style={styles.limitText}>
              Máximo de {MAX_DAILY_PERIODS}
              {' '}tramos diarios alcanzado.
            </Text>
          )}

          {/* COPIAR HORARIO */}

          {onCopy && (
            <>
              <View style={styles.separator} />

              <Pressable
                style={[
                  styles.copyButton,
                  (disabled || hasErrors) &&
                    styles.buttonDisabled,
                ]}
                onPress={onCopy}
                disabled={disabled || hasErrors}
                accessibilityRole="button"
              >
                <Ionicons
                  name="copy-outline"
                  size={19}
                  color={colors.primary}
                />

                <Text style={styles.copyButtonText}>
                  Copiar horario a otros días
                </Text>
              </Pressable>
            </>
          )}
        </>
      )}

      {/* ERROR GENERAL DEL DÍA */}

      {!!dayError && (
        <View
          style={styles.errorContainer}
          accessibilityLiveRegion="polite"
        >
          <Ionicons
            name="alert-circle-outline"
            size={19}
            color={colors.error}
          />

          <Text style={styles.errorText}>
            {dayError}
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
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: 16,
    marginBottom: 14,
  },

  containerError: {
    borderColor: colors.error,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  headerContent: {
    flex: 1,
  },

  dayTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: colors.text,
  },

  dayDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
  },

  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  statusText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: colors.textMuted,
  },

  statusTextOpen: {
    color: colors.secondary,
  },

  separator: {
    height: 1,
    backgroundColor: colors.surfaceBorder,
    marginVertical: 16,
  },

  periodsContainer: {
    gap: 12,
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderStyle: 'dashed',
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 14,
    marginTop: 14,
  },

  addButtonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },

  buttonDisabled: {
    opacity: 0.45,
  },

  limitText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
  },

  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    minHeight: 44,
  },

  copyButtonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: colors.errorContainer,
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
  },

  errorText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: colors.error,
  },
});
