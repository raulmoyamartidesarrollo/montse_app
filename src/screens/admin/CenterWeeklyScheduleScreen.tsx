import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  useNavigation,
  usePreventRemove,
} from '@react-navigation/native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';

import {
  getCenterSchedule,
  updateCenterWeeklySchedule,
} from '../../services/centerSchedules';

import {
  WEEK_DAYS,
  type CenterSchedule,
  type DailySchedule,
  type WeeklySchedule,
  type WeekDay,
} from '../../types/centerSchedules';

import type {
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';

import type {
  AdminMoreStackParamList,
} from '../../navigation/AdminMoreNavigator';

import WeeklyDayCard from '../../components/admin/schedules/WeeklyDayCard';

import CopyScheduleModal from '../../components/admin/schedules/CopyScheduleModal';

import useAdminDraftGuard from '../../hooks/useAdminDraftGuard';

import {
  cloneWeeklySchedule,
  cloneDailySchedule,
  validateDailySchedule,
  normalizeDailySchedule,
  validateWeeklySchedule,
  normalizeWeeklySchedule,
  weeklySchedulesAreEqual,
} from '../../utils/centerScheduleValidation';

// ==================================================
// PANTALLA PRINCIPAL
// ==================================================

export default function CenterWeeklyScheduleScreen() {
  const navigation = useNavigation<
    NativeStackNavigationProp<AdminMoreStackParamList>
  >();
  const insets = useSafeAreaInsets();

  const [schedule, setSchedule] =
    useState<CenterSchedule | null>(null);

  const [draft, setDraft] =
    useState<WeeklySchedule | null>(null);

  const [original, setOriginal] =
    useState<WeeklySchedule | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [saveError, setSaveError] =
    useState<string | null>(null);

  const [discarding, setDiscarding] =
    useState(false);

  const [copySourceDay, setCopySourceDay] =
    useState<WeekDay | null>(null);

  const requestIdRef = useRef(0);
  const savingRef = useRef(false);
  const alertOpenRef = useRef(false);
  const mountedRef = useRef(false);

  const pendingNavigationRef =
    useRef<(() => void) | null>(null);

  // ==================================================
  // RECUPERAR HORARIO DEL CENTRO
  // ==================================================

  const loadSchedule = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);
    setSaveError(null);

    try {
      const result = await getCenterSchedule();

      if (requestId !== requestIdRef.current) {
        return;
      }

      setSchedule(result);

      setDraft(
        cloneWeeklySchedule(result.weekly)
      );

      setOriginal(
        cloneWeeklySchedule(result.weekly)
      );

    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      console.error(
        '[CenterWeeklyScheduleScreen] Error cargando horario:',
        err
      );

      setError(
        'No se ha podido recuperar el horario del centro.'
      );

    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    void loadSchedule();

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, [loadSchedule]);

  useEffect(() => {
    return navigation.addListener('blur', () => {
      setCopySourceDay(null);
    });
  }, [navigation]);

  // ==================================================
  // VALIDACIONES Y CAMBIOS PENDIENTES
  // ==================================================

  const validation = useMemo(
    () => draft
      ? validateWeeklySchedule(draft)
      : null,
    [draft]
  );

  const hasChanges =
    draft !== null &&
    original !== null &&
    !weeklySchedulesAreEqual(
      draft,
      original
    );

  const needsConfiguration =
    schedule !== null &&
    !schedule.weeklyConfigured;

  const canSave =
    !loading &&
    !saving &&
    !discarding &&
    copySourceDay === null &&
    !error &&
    draft !== null &&
    validation?.isValid === true &&
    (hasChanges || needsConfiguration);

  // ==================================================
  // PROTEGER NAVEGACIÓN
  // ==================================================

  const { confirmNavigation } = useAdminDraftGuard({
    sourceTab: 'Mas',

    hasChanges,

    isSaving: saving,

    enabled: !discarding,

    savingRef,

    alertOpenRef,

    unsavedTitle: 'Cambios sin guardar',

    unsavedMessage:
      'Si sales de esta pantalla perderás los cambios realizados en el horario.',

    savingTitle: 'Guardando horario',

    savingMessage:
      'Espera a que finalice el guardado antes de continuar.',

    onDiscardAndNavigate: (action) => {
      if (
        savingRef.current ||
        !navigation.isFocused()
      ) {
        return;
      }

      if (original) {
        setDraft(
          cloneWeeklySchedule(original)
        );
      }

      setSaveError(null);

      pendingNavigationRef.current = () => {
        navigation.popToTop();
        action();
      };

      setDiscarding(true);
    },
  });

  usePreventRemove(
    !discarding && (hasChanges || saving),
    ({ data }) => {
      confirmNavigation(() => {
        if (original) {
          setDraft(
            cloneWeeklySchedule(original)
          );
        }

        pendingNavigationRef.current = () => {
          navigation.dispatch(data.action);
        };

        setDiscarding(true);
      });
    }
  );

  useEffect(() => {
    if (!discarding) {
      return;
    }

    const action = pendingNavigationRef.current;

    pendingNavigationRef.current = null;

    if (!action || !navigation.isFocused()) {
      setDiscarding(false);
      return;
    }

    action();

    if (mountedRef.current) {
      setDiscarding(false);
    }
  }, [discarding, navigation]);

  // ==================================================
  // MODIFICAR HORARIO DE UN DÍA
  // ==================================================

  const handleDayChange = (
    day: WeekDay,
    dailySchedule: DailySchedule
  ) => {
    if (
      savingRef.current ||
      discarding ||
      alertOpenRef.current ||
      copySourceDay !== null
    ) {
      return;
    }

    setSaveError(null);

    setDraft((previous) => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        [day]: cloneDailySchedule(
          dailySchedule
        ),
      };
    });
  };

  // ==================================================
  // ABRIR MODAL DE COPIA
  // ==================================================

  const handleOpenCopy = (day: WeekDay) => {
    if (
      !draft ||
      loading ||
      savingRef.current ||
      discarding ||
      alertOpenRef.current ||
      copySourceDay !== null ||
      !navigation.isFocused()
    ) {
      return;
    }

    const sourceSchedule = draft[day];

    if (
      sourceSchedule.closed ||
      !validateDailySchedule(
        sourceSchedule
      ).isValid
    ) {
      return;
    }

    setCopySourceDay(day);
  };

  // ==================================================
  // CERRAR MODAL DE COPIA
  // ==================================================

  const handleCloseCopy = () => {
    setCopySourceDay(null);
  };

  // ==================================================
  // APLICAR HORARIO A LOS DÍAS SELECCIONADOS
  // ==================================================

  const handleConfirmCopy = (
    destinationDays: WeekDay[]
  ) => {
    if (
      copySourceDay === null ||
      !draft ||
      savingRef.current ||
      discarding ||
      alertOpenRef.current ||
      !navigation.isFocused()
    ) {
      return;
    }

    const sourceDay = copySourceDay;

    const sourceSchedule = draft[sourceDay];

    if (
      sourceSchedule.closed ||
      !validateDailySchedule(
        sourceSchedule
      ).isValid
    ) {
      return;
    }

    const destinations = WEEK_DAYS.filter(
      (day) =>
        day !== sourceDay &&
        destinationDays.includes(day)
    );

    if (destinations.length === 0) {
      return;
    }

    const normalizedSource =
      normalizeDailySchedule(
        sourceSchedule
      );

    setDraft((previous) => {
      if (!previous) {
        return previous;
      }

      const updated = {
        ...previous,
      };

      for (const day of destinations) {
        updated[day] =
          cloneDailySchedule(
            normalizedSource
          );
      }

      return updated;
    });

    setSaveError(null);

    setCopySourceDay(null);
  };

  // ==================================================
  // GUARDAR HORARIO
  // ==================================================

  const persistSchedule = async (
    weekly: WeeklySchedule
  ) => {
    if (
      savingRef.current ||
      !navigation.isFocused()
    ) {
      return;
    }

    savingRef.current = true;

    setSaving(true);
    setSaveError(null);

    try {
      await updateCenterWeeklySchedule({
        weekly,
      });

      if (!mountedRef.current) {
        return;
      }

      setOriginal(
        cloneWeeklySchedule(weekly)
      );

      setDraft(
        cloneWeeklySchedule(weekly)
      );

      setSchedule((previous) =>
        previous
          ? {
              ...previous,
              weeklyConfigured: true,
              weekly: cloneWeeklySchedule(weekly),
              updatedAt: null,
            }
          : previous
      );

      if (navigation.isFocused()) {
        Alert.alert(
          'Horario guardado',
          'El horario habitual del centro se ha guardado correctamente.'
        );
      }

    } catch (err) {
      console.error(
        '[CenterWeeklyScheduleScreen] Error guardando horario:',
        err
      );

      if (mountedRef.current) {
        setSaveError(
          'No se ha podido confirmar el guardado. Puedes volver a intentarlo.'
        );
      }

    } finally {
      savingRef.current = false;

      if (mountedRef.current) {
        setSaving(false);
      }
    }
  };

  const handleSave = () => {
    if (
      !canSave ||
      !draft ||
      savingRef.current ||
      alertOpenRef.current
    ) {
      return;
    }

    const currentValidation =
      validateWeeklySchedule(draft);

    if (!currentValidation.isValid) {
      return;
    }

    const weekly =
      normalizeWeeklySchedule(draft);

    const allDaysClosed =
      WEEK_DAYS.every(
        (day) => weekly[day].closed
      );

    if (allDaysClosed) {
      alertOpenRef.current = true;

      Alert.alert(
        'Centro cerrado toda la semana',

        'Has configurado todos los días como cerrados. ¿Quieres guardar este horario?',

        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => {
              alertOpenRef.current = false;
            },
          },
          {
            text: 'Guardar',
            onPress: () => {
              alertOpenRef.current = false;

              void persistSchedule(weekly);
            },
          },
        ],

        {
          cancelable: false,
        }
      );

      return;
    }

    void persistSchedule(weekly);
  };

  // ==================================================
  // MENSAJE DEL BOTÓN DE GUARDADO
  // ==================================================

  const footerMessage =
    saving
      ? 'Guardando horario del centro...'
      : validation && !validation.isValid
        ? validation.firstError
        : hasChanges
          ? 'Tienes cambios pendientes de guardar.'
          : needsConfiguration
            ? 'Configura y guarda el horario habitual.'
            : 'El horario está actualizado.';

  // ==================================================
  // INTERFAZ
  // ==================================================

  return (
    <View style={styles.container}>

      {/* CABECERA */}

      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
          },
        ]}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => {
            if (!savingRef.current) {
              navigation.goBack();
            }
          }}
          disabled={saving || discarding}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.text}
          />
        </Pressable>

        <Text style={styles.headerTitle}>
          Horario habitual
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 24,
        }}
      >

        {/* INFORMACIÓN */}

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="time-outline"
              size={26}
              color={colors.primary}
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Horario semanal del centro
            </Text>

            <Text style={styles.infoDescription}>
              Define los días y las horas habituales
              de apertura de tu centro.
            </Text>
          </View>
        </View>

        {/* CARGANDO */}

        {loading && (
          <View style={styles.stateCard}>
            <ActivityIndicator
              size="large"
              color={colors.primary}
            />

            <Text style={styles.stateText}>
              Cargando horario...
            </Text>
          </View>
        )}

        {/* ERROR */}

        {!loading && error && (
          <View style={styles.stateCard}>
            <Ionicons
              name="alert-circle-outline"
              size={32}
              color={colors.error}
            />

            <Text style={styles.stateText}>
              {error}
            </Text>

            <Pressable
              style={styles.retryButton}
              onPress={() => void loadSchedule()}
            >
              <Text style={styles.retryText}>
                Reintentar
              </Text>
            </Pressable>
          </View>
        )}

        {/* HORARIO RECUPERADO */}

        {!loading && !error && schedule && draft && validation && (
          <>
            {!schedule.weeklyConfigured && (
              <View style={styles.noticeCard}>
                <Ionicons
                  name="information-circle-outline"
                  size={23}
                  color={colors.primary}
                />

                <Text style={styles.noticeText}>
                  Todavía no has configurado el horario
                  habitual de tu centro.
                </Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>
              HORARIO SEMANAL
            </Text>

            {WEEK_DAYS.map((day) => (
              <WeeklyDayCard
                key={day}
                day={day}
                schedule={draft[day]}
                onChange={(dailySchedule) =>
                  handleDayChange(
                    day,
                    dailySchedule
                  )
                }
                onCopy={() =>
                  handleOpenCopy(day)
                }
                disabled={
                  saving ||
                  discarding ||
                  copySourceDay !== null
                }
                dayError={
                  validation.days[day].dayError
                }
                periodErrors={
                  validation.days[day].periodErrors
                }
              />
            ))}
          </>
        )}
      </ScrollView>

      {!loading && !error && schedule && draft && (
        <View
          style={[
            styles.footer,
            {
              paddingBottom:
                Math.max(insets.bottom, 16) + 70,
            },
          ]}
        >
          {!!saveError && (
            <View style={styles.saveErrorCard}>
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color={colors.error}
              />

              <Text style={styles.saveErrorText}>
                {saveError}
              </Text>
            </View>
          )}

          <Pressable
            style={[
              styles.saveButton,
              !canSave && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityState={{
              disabled: !canSave,
              busy: saving,
            }}
          >
            {saving ? (
              <ActivityIndicator
                size="small"
                color={colors.white}
              />
            ) : (
              <Ionicons
                name="save-outline"
                size={21}
                color={colors.white}
              />
            )}

            <Text style={styles.saveButtonText}>
              {saving
                ? 'Guardando...'
                : 'Guardar horario'}
            </Text>
          </Pressable>

          <Text
            style={[
              styles.footerHint,
              validation &&
                !validation.isValid &&
                styles.footerHintError,
            ]}
            accessibilityLiveRegion="polite"
          >
            {footerMessage}
          </Text>
        </View>
      )}

      {/* MODAL PARA COPIAR HORARIOS */}

      {copySourceDay !== null && draft && (
        <CopyScheduleModal
          key={copySourceDay}
          sourceDay={copySourceDay}
          sourceSchedule={
            draft[copySourceDay]
          }
          weeklySchedule={draft}
          onClose={handleCloseCopy}
          onConfirm={handleConfirmCopy}
          disabled={saving || discarding}
        />
      )}
    </View>
  );
}

// ==================================================
// ESTILOS
// ==================================================

const styles = StyleSheet.create({
  footer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    paddingHorizontal: 20,
    paddingTop: 14,
  },

  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  saveButtonDisabled: {
    opacity: 0.45,
  },

  saveButtonText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: colors.white,
  },

  footerHint: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 8,
  },

  footerHintError: {
    color: colors.error,
  },

  saveErrorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.errorContainer,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },

  saveErrorText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: colors.error,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },

  headerTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 19,
    color: colors.text,
    marginLeft: 8,
  },

  scroll: {
    flex: 1,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },

  infoIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: colors.text,
  },

  infoDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 19,
    marginTop: 5,
  },

  sectionTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.primary,
    marginTop: 30,
    marginBottom: 16,
  },

  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    marginTop: 20,
  },

  noticeText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
  },

  stateCard: {
    alignItems: 'center',
    padding: 28,
    marginTop: 24,
    gap: 14,
  },

  stateText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },

  retryText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.white,
  },
});
