import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Keyboard,
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

import {
  usePreventRemove,
} from '@react-navigation/native';

import type {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';

import type {
  AdminMoreStackParamList,
} from '../../navigation/AdminMoreNavigator';

import type {
  DailySchedule,
} from '../../types/centerSchedules';

import {
  createEmptySpecialSchedule,
  MAX_SPECIAL_SCHEDULE_REASON_LENGTH,
  type CreateCenterSpecialScheduleInput,
} from '../../types/centerSpecialSchedules';

import {
  createCenterSpecialSchedule,
  updateCenterSpecialSchedule,
} from '../../services/centerSpecialSchedules';

import {
  cloneDailySchedule,
  normalizeDailySchedule,
  validateDailySchedule,
} from '../../utils/centerScheduleValidation';

import {
  getCenterTodayISO,
  isValidDateISO,
} from '../../utils/centerScheduleDates';

import DatePicker from '../../components/admin/schedules/DatePicker';

import DailyScheduleEditor from '../../components/admin/schedules/DailyScheduleEditor';

import useAdminDraftGuard from '../../hooks/useAdminDraftGuard';

// ==================================================
// TIPOS
// ==================================================

type Props = NativeStackScreenProps<
  AdminMoreStackParamList,
  'CenterSpecialScheduleForm'
>;

// ==================================================
// MENSAJES DE ERROR
// ==================================================

function getSaveErrorMessage(
  error: unknown
): string {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error
      ? String(error.code)
      : '';

  switch (code) {
    case 'functions/already-exists':
      return 'Ya existe un horario especial para esta fecha. Puedes editarlo desde el listado.';

    case 'functions/not-found':
      return 'Este horario especial ya no existe. Vuelve al listado para actualizar los datos.';

    case 'functions/permission-denied':
      return 'No tienes permisos para gestionar los horarios especiales.';

    case 'functions/unauthenticated':
      return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';

    case 'functions/invalid-argument':
      return 'Revisa la fecha y los tramos horarios introducidos.';

    default:
      return 'No se ha podido confirmar el guardado. Comprueba tu conexión y revisa el listado antes de volver a intentarlo.';
  }
}

// ==================================================
// PANTALLA PRINCIPAL
// ==================================================

export default function CenterSpecialScheduleFormScreen({
  navigation,
  route,
}: Props) {
  const insets = useSafeAreaInsets();

  const existingSchedule =
    route.params?.schedule;

  const selectedDateISO =
    route.params?.dateISO;

  const isEditing =
    existingSchedule !== undefined;

  const initialDateISO =
    isValidDateISO(selectedDateISO)
      ? selectedDateISO
      : getCenterTodayISO();

  const [original] =
    useState<CreateCenterSpecialScheduleInput>(() =>
      existingSchedule
        ? {
            dateISO: existingSchedule.dateISO,
            reason: existingSchedule.reason,
            ...cloneDailySchedule(existingSchedule),
          }
        : createEmptySpecialSchedule(
            initialDateISO
          )
    );

  const [draft, setDraft] =
    useState<CreateCenterSpecialScheduleInput>(() => ({
      dateISO: original.dateISO,
      reason: original.reason,
      ...cloneDailySchedule(original),
    }));

  const [saving, setSaving] =
    useState(false);

  const [discarding, setDiscarding] =
    useState(false);

  const [saveError, setSaveError] =
    useState<string | null>(null);

  const savingRef = useRef(false);
  const savedRef = useRef(false);
  const mountedRef = useRef(false);
  const alertOpenRef = useRef(false);

  const pendingNavigationRef =
    useRef<(() => void) | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ==================================================
  // VALIDACIONES
  // ==================================================

  const validation = useMemo(
    () => validateDailySchedule(draft),
    [draft]
  );

  const dateIsValid =
    isValidDateISO(draft.dateISO);

  const reasonIsValid =
    draft.reason.length <=
      MAX_SPECIAL_SCHEDULE_REASON_LENGTH;

  const hasChanges =
    !savedRef.current &&
    (
      draft.dateISO !== original.dateISO ||
      draft.reason !== original.reason ||
      draft.closed !== original.closed ||
      JSON.stringify(draft.periods) !==
        JSON.stringify(original.periods)
    );

  const disabled =
    saving ||
    discarding ||
    savedRef.current;

  const canSave =
    !disabled &&
    dateIsValid &&
    reasonIsValid &&
    validation.isValid &&
    (!isEditing || hasChanges);

  // ==================================================
  // PROTECCIÓN DE NAVEGACIÓN
  // ==================================================

  const { confirmNavigation } =
    useAdminDraftGuard({
      sourceTab: 'Mas',

      hasChanges,

      isSaving: saving,

      enabled: !discarding,

      savingRef,

      savedRef,

      alertOpenRef,

      unsavedTitle: 'Cambios sin guardar',

      unsavedMessage:
        'Si sales de esta pantalla perderás los cambios realizados en el horario especial.',

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

        pendingNavigationRef.current = () => {
          navigation.goBack();
          action();
        };

        setDiscarding(true);
      },
    });

  usePreventRemove(
    !discarding &&
      !savedRef.current &&
      (hasChanges || saving),
    ({ data }) => {
      confirmNavigation(() => {
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

    const action =
      pendingNavigationRef.current;

    pendingNavigationRef.current = null;

    if (!action || !navigation.isFocused()) {
      setDiscarding(false);
      return;
    }

    action();
  }, [discarding, navigation]);

  // ==================================================
  // MODIFICAR FECHA
  // ==================================================

  function handleDateChange(
    dateISO: string
  ) {
    if (
      isEditing ||
      disabled ||
      savingRef.current ||
      alertOpenRef.current ||
      !navigation.isFocused() ||
      !isValidDateISO(dateISO)
    ) {
      return;
    }

    setSaveError(null);

    setDraft((previous) => ({
      ...previous,
      dateISO,
    }));
  }

  // ==================================================
  // MODIFICAR HORARIO
  // ==================================================

  function handleScheduleChange(
    schedule: DailySchedule
  ) {
    if (
      disabled ||
      savingRef.current ||
      alertOpenRef.current ||
      !navigation.isFocused()
    ) {
      return;
    }

    setSaveError(null);

    setDraft((previous) => ({
      ...previous,
      ...cloneDailySchedule(schedule),
    }));
  }

  // ==================================================
  // MODIFICAR MOTIVO
  // ==================================================

  function handleReasonChange(
    reason: string
  ) {
    if (
      disabled ||
      savingRef.current ||
      alertOpenRef.current ||
      !navigation.isFocused()
    ) {
      return;
    }

    setSaveError(null);

    setDraft((previous) => ({
      ...previous,
      reason,
    }));
  }

  // ==================================================
  // GUARDAR EN FIREBASE
  // ==================================================

  async function handleSave() {
    if (
      !canSave ||
      savingRef.current ||
      savedRef.current ||
      alertOpenRef.current ||
      !navigation.isFocused()
    ) {
      return;
    }

    if (
      !isValidDateISO(draft.dateISO) ||
      !validateDailySchedule(draft).isValid ||
      draft.reason.length >
        MAX_SPECIAL_SCHEDULE_REASON_LENGTH
    ) {
      return;
    }

    const payload: CreateCenterSpecialScheduleInput = {
      dateISO: draft.dateISO,
      reason: draft.reason.trim(),
      ...normalizeDailySchedule(draft),
    };

    savingRef.current = true;

    Keyboard.dismiss();

    setSaving(true);
    setSaveError(null);

    try {
      if (isEditing) {
        await updateCenterSpecialSchedule(
          payload
        );
      } else {
        await createCenterSpecialSchedule(
          payload
        );
      }

      savedRef.current = true;

      if (!mountedRef.current) {
        return;
      }

      if (navigation.isFocused()) {
        pendingNavigationRef.current = () => {
          navigation.goBack();
        };

        setDiscarding(true);
      }

    } catch (error) {
      console.error(
        '[CenterSpecialScheduleFormScreen] Error guardando horario:',
        error
      );

      if (mountedRef.current) {
        setSaveError(
          getSaveErrorMessage(error)
        );
      }

    } finally {
      savingRef.current = false;

      if (mountedRef.current) {
        setSaving(false);
      }
    }
  }

  // ==================================================
  // MENSAJE DEL FORMULARIO
  // ==================================================

  const footerMessage =
    saving
      ? 'Guardando horario especial...'
      : !dateIsValid
        ? 'Selecciona una fecha válida.'
        : !validation.isValid
          ? 'Revisa los tramos horarios.'
          : !reasonIsValid
            ? 'El motivo es demasiado largo.'
            : isEditing && !hasChanges
              ? 'No hay cambios pendientes.'
              : 'Este horario se aplica a una fecha concreta.';

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
          {isEditing
            ? 'Editar horario especial'
            : 'Nuevo horario especial'}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
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
                name="calendar-outline"
                size={26}
                color={colors.primary}
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>
                Horario excepcional
              </Text>

              <Text style={styles.infoDescription}>
                Configura las horas de apertura o el
                cierre del centro para una fecha concreta.
              </Text>
            </View>
          </View>

          {/* FECHA */}

          <Text style={styles.sectionTitle}>
            FECHA
          </Text>

          <View style={styles.fieldCard}>
            <DatePicker
              label="Fecha del horario especial"
              value={draft.dateISO}
              onChange={handleDateChange}
              disabled={disabled || isEditing}
            />

            {isEditing && (
              <Text style={styles.fieldHint}>
                La fecha de un horario existente
                no se puede modificar.
              </Text>
            )}
          </View>

          {/* DISPONIBILIDAD */}

          <Text style={styles.sectionTitle}>
            DISPONIBILIDAD
          </Text>

          <DailyScheduleEditor
            title="Horario de apertura"
            schedule={draft}
            onChange={handleScheduleChange}
            disabled={disabled}
            dayError={validation.dayError}
            periodErrors={validation.periodErrors}
          />

          {/* MOTIVO */}

          <Text style={styles.sectionTitle}>
            MOTIVO (OPCIONAL)
          </Text>

          <View style={styles.fieldCard}>
            <TextInput
              style={styles.reasonInput}
              value={draft.reason}
              onChangeText={handleReasonChange}
              editable={!disabled}
              placeholder="Ej. Horario reducido por Nochebuena"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={
                MAX_SPECIAL_SCHEDULE_REASON_LENGTH
              }
              textAlignVertical="top"
              accessibilityLabel="Motivo del horario especial"
            />

            <Text style={styles.characterCount}>
              {draft.reason.length}/
              {MAX_SPECIAL_SCHEDULE_REASON_LENGTH}
            </Text>
          </View>

        </ScrollView>

        {/* GUARDADO */}

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
            <View
              style={styles.errorCard}
              accessibilityLiveRegion="polite"
            >
              <Ionicons
                name="alert-circle-outline"
                size={21}
                color={colors.error}
              />

              <Text style={styles.errorText}>
                {saveError}
              </Text>
            </View>
          )}

          <Pressable
            style={[
              styles.saveButton,
              !canSave && styles.saveButtonDisabled,
            ]}
            onPress={() => void handleSave()}
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
                : isEditing
                  ? 'Guardar cambios'
                  : 'Guardar horario'}
            </Text>
          </Pressable>

          <Text
            style={[
              styles.footerHint,
              !validation.isValid &&
                styles.footerHintError,
            ]}
            accessibilityLiveRegion="polite"
          >
            {footerMessage}
          </Text>
        </View>

      </KeyboardAvoidingView>
    </View>
  );
}

// ==================================================
// ESTILOS
// ==================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    flex: 1,
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
    flex: 1,
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
    marginTop: 26,
    marginBottom: 14,
  },

  fieldCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: 16,
  },

  fieldHint: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: 10,
  },

  reasonInput: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    padding: 14,
    minHeight: 110,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: colors.text,
  },

  characterCount: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 8,
  },

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

  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.errorContainer,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },

  errorText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: colors.error,
  },
});
