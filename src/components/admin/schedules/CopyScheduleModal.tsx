import React, {
  useState,
} from 'react';

import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../../theme/colors';

import {
  WEEK_DAYS,
  WEEK_DAY_LABELS,
  type WeekDay,
  type DailySchedule,
  type WeeklySchedule,
} from '../../../types/centerSchedules';

import {
  validateDailySchedule,
} from '../../../utils/centerScheduleValidation';

// ==================================================
// TIPOS
// ==================================================

type CopyScheduleModalProps = {
  sourceDay: WeekDay;
  sourceSchedule: DailySchedule;
  weeklySchedule: WeeklySchedule;
  onClose: () => void;
  onConfirm: (days: WeekDay[]) => void;
  disabled?: boolean;
};

// ==================================================
// COMPONENTE PRINCIPAL
// ==================================================

export default function CopyScheduleModal({
  sourceDay,
  sourceSchedule,
  weeklySchedule,
  onClose,
  onConfirm,
  disabled = false,
}: CopyScheduleModalProps) {
  const insets = useSafeAreaInsets();

  const [selectedDays, setSelectedDays] =
    useState<WeekDay[]>([]);

  // ==================================================
  // DÍAS DISPONIBLES
  // ==================================================

  const availableDays = WEEK_DAYS.filter(
    (day) => day !== sourceDay
  );

  const allSelected = availableDays.every(
    (day) => selectedDays.includes(day)
  );

  const sourceIsValid =
    !sourceSchedule.closed &&
    validateDailySchedule(
      sourceSchedule
    ).isValid;

  const canConfirm =
    !disabled &&
    sourceIsValid &&
    selectedDays.length > 0;

  // ==================================================
  // SELECCIONAR UN DÍA
  // ==================================================

  const toggleDay = (day: WeekDay) => {
    if (
      disabled ||
      day === sourceDay
    ) {
      return;
    }

    setSelectedDays((previous) =>
      previous.includes(day)
        ? previous.filter(
            (item) => item !== day
          )
        : [...previous, day]
    );
  };

  // ==================================================
  // SELECCIONAR TODOS
  // ==================================================

  const toggleAll = () => {
    if (disabled) {
      return;
    }

    setSelectedDays(
      allSelected
        ? []
        : [...availableDays]
    );
  };

  // ==================================================
  // CONFIRMAR COPIA
  // ==================================================

  const handleConfirm = () => {
    if (!canConfirm) {
      return;
    }

    const destinations =
      availableDays.filter(
        (day) => selectedDays.includes(day)
      );

    onConfirm(destinations);
  };

  // ==================================================
  // INTERFAZ
  // ==================================================

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <View
          style={styles.modalCard}
          accessibilityViewIsModal
        >

          {/* CABECERA */}

          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons
                name="copy-outline"
                size={26}
                color={colors.primary}
              />
            </View>

            <Text style={styles.title}>
              Copiar horario
            </Text>

            <Text style={styles.description}>
              Aplica el horario de este día
              a otros días de la semana.
            </Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={
              styles.scrollContent
            }
            showsVerticalScrollIndicator={false}
            bounces={false}
          >

            {/* HORARIO DE ORIGEN */}

            <View style={styles.sourceCard}>
              <Text style={styles.sourceLabel}>
                HORARIO DE ORIGEN
              </Text>

              <Text style={styles.sourceTitle}>
                {WEEK_DAY_LABELS[sourceDay]}
              </Text>

              {sourceSchedule.periods.map(
                (period, index) => (
                  <View
                    key={index}
                    style={styles.periodRow}
                  >
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={colors.primary}
                    />

                    <Text style={styles.periodText}>
                      {period.start}
                      {' — '}
                      {period.end}
                    </Text>
                  </View>
                )
              )}
            </View>

            {/* DÍAS DE DESTINO */}

            <Text style={styles.sectionTitle}>
              DÍAS DE DESTINO
            </Text>

            <Pressable
              style={[
                styles.selectAllButton,
                allSelected &&
                  styles.selectedRow,
              ]}
              onPress={toggleAll}
              disabled={disabled}
              accessibilityRole="checkbox"
              accessibilityState={{
                checked: allSelected
                  ? true
                  : selectedDays.length > 0
                    ? 'mixed'
                    : false,
                disabled,
              }}
            >
              <Ionicons
                name={
                  allSelected
                    ? 'checkbox'
                    : selectedDays.length > 0
                      ? 'remove-circle-outline'
                      : 'square-outline'
                }
                size={24}
                color={colors.primary}
              />

              <Text style={styles.selectAllText}>
                Seleccionar todos
              </Text>
            </Pressable>

            {availableDays.map((day) => {
              const selected =
                selectedDays.includes(day);

              const currentSchedule =
                weeklySchedule[day];

              return (
                <Pressable
                  key={day}
                  style={[
                    styles.dayRow,
                    selected &&
                      styles.selectedRow,
                  ]}
                  onPress={() => toggleDay(day)}
                  disabled={disabled}
                  accessibilityRole="checkbox"
                  accessibilityLabel={
                    WEEK_DAY_LABELS[day]
                  }
                  accessibilityState={{
                    checked: selected,
                    disabled,
                  }}
                >
                  <Ionicons
                    name={
                      selected
                        ? 'checkbox'
                        : 'square-outline'
                    }
                    size={23}
                    color={
                      selected
                        ? colors.primary
                        : colors.textMuted
                    }
                  />

                  <View style={styles.dayContent}>
                    <Text style={styles.dayTitle}>
                      {WEEK_DAY_LABELS[day]}
                    </Text>

                    <Text style={styles.dayDescription}>
                      {currentSchedule.closed
                        ? 'Actualmente cerrado'
                        : currentSchedule.periods
                            .map(
                              (period) =>
                                `${period.start} – ${period.end}`
                            )
                            .join(' / ')}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      !currentSchedule.closed &&
                        styles.statusBadgeOpen,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        !currentSchedule.closed &&
                          styles.statusTextOpen,
                      ]}
                    >
                      {currentSchedule.closed
                        ? 'Cerrado'
                        : 'Abierto'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            {/* AVISO */}

            <View style={styles.noticeCard}>
              <Ionicons
                name="information-circle-outline"
                size={22}
                color={colors.primary}
              />

              <Text style={styles.noticeText}>
                Se sustituirán los horarios de los
                días seleccionados. Los días cerrados
                pasarán a estar abiertos.
                Los cambios no se guardarán hasta
                pulsar Guardar horario.
              </Text>
            </View>

          </ScrollView>

          {/* ACCIONES */}

          <View style={styles.footer}>
            <Text
              style={styles.selectionText}
              accessibilityLiveRegion="polite"
            >
              {selectedDays.length === 1
                ? '1 día seleccionado'
                : `${selectedDays.length} días seleccionados`}
            </Text>

            <View style={styles.actions}>
              <Pressable
                style={styles.cancelButton}
                onPress={onClose}
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>
                  Cancelar
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.confirmButton,
                  !canConfirm &&
                    styles.buttonDisabled,
                ]}
                onPress={handleConfirm}
                disabled={!canConfirm}
                accessibilityRole="button"
                accessibilityState={{
                  disabled: !canConfirm,
                }}
              >
                <Ionicons
                  name="copy-outline"
                  size={19}
                  color={colors.white}
                />

                <Text style={styles.confirmText}>
                  Copiar horario
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ==================================================
// ESTILOS
// ==================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.40)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    width: '100%',
    maxWidth: 460,
    maxHeight: '95%',
    alignSelf: 'center',
    overflow: 'hidden',
    flexShrink: 1,
  },

  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },

  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 19,
    color: colors.text,
  },

  description: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 7,
  },

  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },

  sourceCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 15,
    padding: 15,
  },

  sourceLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.primary,
  },

  sourceTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: colors.text,
    marginTop: 7,
    marginBottom: 4,
  },

  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 8,
  },

  periodText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },

  sectionTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.textMuted,
    marginTop: 22,
    marginBottom: 10,
  },

  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    marginBottom: 12,
  },

  selectAllText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: colors.primary,
    flex: 1,
  },

  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    marginBottom: 8,
  },

  selectedRow: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },

  dayContent: {
    flex: 1,
    minWidth: 0,
  },

  dayTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.text,
  },

  dayDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 10,
    lineHeight: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },

  statusBadge: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  statusBadgeOpen: {
    backgroundColor: colors.secondaryContainer,
  },

  statusText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: colors.textMuted,
  },

  statusTextOpen: {
    color: colors.secondary,
  },

  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: colors.surfaceMuted,
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
  },

  noticeText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    lineHeight: 18,
    color: colors.textSecondary,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },

  selectionText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 12,
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
  },

  cancelButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 13,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.textSecondary,
  },

  confirmButton: {
    flex: 1.5,
    minHeight: 50,
    borderRadius: 13,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 8,
  },

  confirmText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: colors.white,
  },

  buttonDisabled: {
    opacity: 0.45,
  },
});
