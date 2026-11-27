import React, {
  useMemo,
} from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../../theme/colors';

import {
  addMonthsToDateISO,
  formatCalendarMonth,
  formatCenterDate,
  getMonthCalendarDays,
  getMonthStartISO,
} from '../../../utils/centerScheduleDates';

// ==================================================
// TIPOS
// ==================================================

export type CalendarDayStatus =
  | 'special'
  | 'closed'
  | 'vacation'
  | 'holiday';

export interface CalendarDayMark {
  status: CalendarDayStatus;
  label?: string;
}

export interface CalendarSelectionRange {
  startDateISO: string;
  endDateISO: string;
}

interface MonthlyCalendarProps {
  monthISO: string;

  todayISO: string;

  onMonthChange: (monthISO: string) => void;

  onDayPress: (dateISO: string) => void;

  markedDates?: Record<string, CalendarDayMark>;

  selectedDateISO?: string;

  selectedRange?: CalendarSelectionRange;

  disabled?: boolean;

  daysDisabled?: boolean;
}

// ==================================================
// DÍAS DE LA SEMANA
// ==================================================

const WEEK_DAYS = [
  { short: 'L', full: 'Lunes' },
  { short: 'M', full: 'Martes' },
  { short: 'X', full: 'Miércoles' },
  { short: 'J', full: 'Jueves' },
  { short: 'V', full: 'Viernes' },
  { short: 'S', full: 'Sábado' },
  { short: 'D', full: 'Domingo' },
];

// ==================================================
// COLORES DE LOS ESTADOS
// ==================================================

const STATUS_COLORS: Record<
  CalendarDayStatus,
  {
    background: string;
    foreground: string;
    label: string;
  }
> = {
  special: {
    background: colors.primaryContainer,
    foreground: colors.text,
    label: 'Horario especial',
  },

  closed: {
    background: colors.errorContainer,
    foreground: colors.error,
    label: 'Cierre excepcional',
  },

  vacation: {
    background: colors.secondaryContainer,
    foreground: colors.secondary,
    label: 'Vacaciones',
  },

  holiday: {
    background: colors.surfaceMuted,
    foreground: colors.secondary,
    label: 'Festivo',
  },
};

// ==================================================
// COMPONENTE PRINCIPAL
// ==================================================

export default function MonthlyCalendar({
  monthISO,
  todayISO,
  onMonthChange,
  onDayPress,
  markedDates = {},
  selectedDateISO,
  selectedRange,
  disabled = false,
  daysDisabled = false,
}: MonthlyCalendarProps) {
  const monthStartISO =
    getMonthStartISO(monthISO);

  const calendarDays = useMemo(
    () => getMonthCalendarDays(monthStartISO),
    [monthStartISO]
  );

  const weeks = useMemo(
    () =>
      Array.from(
        { length: 6 },
        (_, index) =>
          calendarDays.slice(
            index * 7,
            index * 7 + 7
          )
      ),
    [calendarDays]
  );

  const isCurrentMonth =
    monthStartISO === getMonthStartISO(todayISO);

  const canGoPrevious =
    monthStartISO > '0001-01-01';

  const canGoNext =
    monthStartISO < '9999-12-01';

  // ==================================================
  // NAVEGACIÓN
  // ==================================================

  function handleMonthChange(
    direction: -1 | 1
  ) {
    if (
      disabled ||
      (direction === -1 && !canGoPrevious) ||
      (direction === 1 && !canGoNext)
    ) {
      return;
    }

    onMonthChange(
      addMonthsToDateISO(
        monthStartISO,
        direction
      )
    );
  }

  function handleToday() {
    if (disabled || isCurrentMonth) {
      return;
    }

    onMonthChange(
      getMonthStartISO(todayISO)
    );
  }

  // ==================================================
  // INTERFAZ
  // ==================================================

  return (
    <View style={styles.container}>

      {/* CABECERA DEL CALENDARIO */}

      <View style={styles.header}>
        <Pressable
          style={[
            styles.navigationButton,
            (disabled || !canGoPrevious) &&
              styles.disabledButton,
          ]}
          disabled={disabled || !canGoPrevious}
          onPress={() => handleMonthChange(-1)}
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={colors.primary}
          />
        </Pressable>

        <Text
          style={styles.monthTitle}
          accessibilityLiveRegion="polite"
        >
          {formatCalendarMonth(monthStartISO)}
        </Text>

        <Pressable
          style={[
            styles.navigationButton,
            (disabled || !canGoNext) &&
              styles.disabledButton,
          ]}
          disabled={disabled || !canGoNext}
          onPress={() => handleMonthChange(1)}
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
        >
          <Ionicons
            name="chevron-forward"
            size={22}
            color={colors.primary}
          />
        </Pressable>
      </View>

      {/* VOLVER AL MES ACTUAL */}

      <View style={styles.todayContainer}>
        <Pressable
          style={[
            styles.todayButton,
            (disabled || isCurrentMonth) &&
              styles.disabledButton,
          ]}
          disabled={disabled || isCurrentMonth}
          onPress={handleToday}
          accessibilityRole="button"
          accessibilityLabel="Volver al mes actual"
        >
          <Ionicons
            name="calendar-outline"
            size={15}
            color={colors.primary}
          />

          <Text style={styles.todayButtonText}>
            Hoy
          </Text>
        </Pressable>
      </View>

      {/* CABECERA DE LA SEMANA */}

      <View style={styles.weekRow}>
        {WEEK_DAYS.map((day) => (
          <View
            key={day.full}
            style={styles.weekDayCell}
          >
            <Text
              style={styles.weekDayText}
              accessibilityLabel={day.full}
            >
              {day.short}
            </Text>
          </View>
        ))}
      </View>

      {/* SEMANAS DEL MES */}

      <View style={styles.weeksContainer}>
        {weeks.map((week, weekIndex) => (
          <View
            key={weekIndex}
            style={styles.weekRow}
          >
            {week.map((day, dayIndex) => {
              if (!day) {
                return (
                  <View
                    key={dayIndex}
                    style={styles.dayColumn}
                  />
                );
              }

              const mark =
                day.isCurrentMonth
                  ? markedDates[day.dateISO]
                  : undefined;

              const statusColors =
                mark
                  ? STATUS_COLORS[mark.status]
                  : undefined;

              const isToday =
                day.dateISO === todayISO;

              const isSelected =
                day.dateISO === selectedDateISO;

              const isInRange =
                !!selectedRange &&
                day.dateISO >=
                  selectedRange.startDateISO &&
                day.dateISO <=
                  selectedRange.endDateISO;

              const isRangeBoundary =
                !!selectedRange &&
                (
                  day.dateISO ===
                    selectedRange.startDateISO ||
                  day.dateISO ===
                    selectedRange.endDateISO
                );

              const isHighlighted =
                isSelected || isRangeBoundary;

              const isDisabled =
                disabled ||
                (
                  daysDisabled &&
                  day.isCurrentMonth
                );

              const accessibilityLabel = [
                formatCenterDate(day.dateISO),

                !day.isCurrentMonth
                  ? 'Otro mes'
                  : undefined,

                isToday
                  ? 'Hoy'
                  : undefined,

                mark
                  ? STATUS_COLORS[mark.status].label
                  : undefined,

                mark?.label,

                isInRange
                  ? 'Dentro del rango seleccionado'
                  : undefined,
              ]
                .filter(Boolean)
                .join(', ');

              return (
                <View
                  key={day.dateISO}
                  style={styles.dayColumn}
                >
                  <Pressable
                    style={[
                      styles.dayButton,

                      statusColors && {
                        backgroundColor:
                          statusColors.background,
                      },

                      isInRange &&
                        styles.rangeDay,

                      isHighlighted &&
                        styles.selectedDay,

                      isToday &&
                        styles.todayDay,
                    ]}
                    disabled={isDisabled}
                    onPress={() => {
                      if (isDisabled) {
                        return;
                      }

                      if (!day.isCurrentMonth) {
                        onMonthChange(
                          getMonthStartISO(
                            day.dateISO
                          )
                        );

                        return;
                      }

                      onDayPress(day.dateISO);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      accessibilityLabel
                    }
                    accessibilityState={{
                      disabled: isDisabled,
                      selected:
                        isHighlighted || isInRange,
                    }}
                  >
                    <Text
                      style={[
                        styles.dayText,

                        !day.isCurrentMonth &&
                          styles.otherMonthText,

                        statusColors && {
                          color:
                            statusColors.foreground,
                        },

                        isHighlighted &&
                          styles.selectedDayText,
                      ]}
                    >
                      {day.day}
                    </Text>

                    <View
                      style={[
                        styles.dayIndicator,

                        statusColors && {
                          backgroundColor:
                            isHighlighted
                              ? colors.white
                              : statusColors.foreground,
                        },
                      ]}
                    />
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </View>

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
    padding: 12,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  navigationButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  monthTitle: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },

  disabledButton: {
    opacity: 0.4,
  },

  todayContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },

  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 14,
    minHeight: 36,
  },

  todayButtonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: colors.primary,
  },

  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  weekDayCell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingVertical: 8,
  },

  weekDayText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: colors.textMuted,
  },

  weeksContainer: {
    gap: 3,
    marginTop: 4,
  },

  dayColumn: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 2,
  },

  dayButton: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.transparent,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },

  dayText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.text,
  },

  otherMonthText: {
    color: colors.textMuted,
    opacity: 0.45,
  },

  todayDay: {
    borderColor: colors.primary,
    borderWidth: 2,
  },

  rangeDay: {
    backgroundColor: colors.primaryContainer,
  },

  selectedDay: {
    backgroundColor: colors.primary,
  },

  selectedDayText: {
    color: colors.white,
  },

  dayIndicator: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.transparent,
  },
});
