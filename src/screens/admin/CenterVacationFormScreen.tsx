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
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';

import type {
  AdminMoreStackParamList,
} from '../../navigation/AdminMoreNavigator';

import {
  createEmptyVacation,
  MAX_VACATION_REASON_LENGTH,
  type CenterVacation,
  type CreateCenterVacationInput,
} from '../../types/centerVacations';

import {
  cloneVacationDraft,
  normalizeVacationDraft,
  hasVacationDraftChanges,
  validateVacationDraft,
  getVacationEditingPermissions,
  validateVacationTemporalRules,
} from '../../utils/centerVacationValidation';

import {
  normalizeVacationRange,
  getVacationDurationDays,
  formatVacationRange,
} from '../../utils/centerVacationDates';

import {
  getCenterTodayISO,
  getMonthStartISO,
  isValidDateISO,
} from '../../utils/centerScheduleDates';

import {
  createCenterVacation,
  updateCenterVacation,
} from '../../services/centerVacations';

import MonthlyCalendar from '../../components/admin/schedules/MonthlyCalendar';

import DatePicker from '../../components/admin/schedules/DatePicker';

import useAdminDraftGuard from '../../hooks/useAdminDraftGuard';

// ==================================================
// TIPOS
// ==================================================

export interface CenterVacationFormParams {
  vacation?: CenterVacation;
  dateISO?: string;
}

type Props = {
  navigation: NativeStackNavigationProp<AdminMoreStackParamList>;
  route: {
    params?: CenterVacationFormParams;
  };
};

// ==================================================
// MENSAJES DE ERROR
// ==================================================

function isExpectedSaveError(error: unknown): boolean {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error
      ? String(error.code)
      : '';

  return [
    'functions/already-exists',
    'functions/not-found',
    'functions/permission-denied',
    'functions/unauthenticated',
    'functions/invalid-argument',
    'functions/failed-precondition',
  ].includes(code);
}

function getSaveErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error
      ? String(error.code)
      : '';

  switch (code) {
    case 'functions/already-exists':
      return 'El periodo seleccionado coincide con otras vacaciones del centro.';

    case 'functions/not-found':
      return 'Este periodo de vacaciones ya no existe.';

    case 'functions/permission-denied':
      return 'No tienes permisos para gestionar las vacaciones.';

    case 'functions/unauthenticated':
      return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';

    case 'functions/invalid-argument':
      return 'Revisa las fechas y el motivo introducidos.';

    case 'functions/failed-precondition':
      return 'No se puede modificar este periodo en su estado actual. Vuelve al listado y comprueba las vacaciones.';

    default:
      return 'No se ha podido confirmar el guardado. Comprueba tu conexión y revisa el listado antes de volver a intentarlo.';
  }
}

// ==================================================
// FORMULARIO
// ==================================================

export default function CenterVacationFormScreen({
  navigation,
  route,
}: Props) {
  const insets = useSafeAreaInsets();

  const todayISO = getCenterTodayISO();

  const existingVacation = route.params?.vacation;

  const selectedDateISO = route.params?.dateISO;

  const isEditing = existingVacation !== undefined;

  const initialDateISO =
    isValidDateISO(selectedDateISO) &&
    selectedDateISO >= todayISO
      ? selectedDateISO
      : todayISO;

  const [original] =
    useState<CreateCenterVacationInput>(() =>
      existingVacation
        ? cloneVacationDraft(existingVacation)
        : createEmptyVacation(initialDateISO)
    );

  const [draft, setDraft] =
    useState<CreateCenterVacationInput>(() =>
      cloneVacationDraft(original)
    );

  const [monthISO, setMonthISO] =
    useState(() =>
      getMonthStartISO(original.startDateISO)
    );

  const [selectionAnchor, setSelectionAnchor] =
    useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const [discarding, setDiscarding] = useState(false);

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
  // VALIDACIÓN
  // ==================================================

  const validation = useMemo(
    () => validateVacationDraft(draft),
    [draft]
  );

  const hasChanges =
    !savedRef.current &&
    hasVacationDraftChanges(original, draft);

  const disabled =
    saving ||
    discarding ||
    savedRef.current;

  const permissions =
    getVacationEditingPermissions(
      isEditing ? original : undefined,
      todayISO
    );

  const temporalValidation =
    validateVacationTemporalRules(
      draft,
      isEditing ? original : undefined,
      todayISO
    );

  const datesAreAllowed =
    temporalValidation.isValid;

  const canSave =
    !disabled &&
    permissions.canSave &&
    validation.isValid &&
    datesAreAllowed &&
    (!isEditing || hasChanges);

  const duration =
    validation.isValid
      ? getVacationDurationDays(draft)
      : 0;

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
        'Si sales de esta pantalla perderás los cambios realizados en las vacaciones.',

      savingTitle: 'Guardando vacaciones',

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

    const action = pendingNavigationRef.current;

    pendingNavigationRef.current = null;

    if (!action || !navigation.isFocused()) {
      setDiscarding(false);
      return;
    }

    action();
  }, [discarding, navigation]);

  // ==================================================
  // CONTROL DE INTERACCIÓN
  // ==================================================

  function canInteract() {
    const currentPermissions =
      getVacationEditingPermissions(
        isEditing ? original : undefined,
        getCenterTodayISO()
      );

    return (
      !disabled &&
      currentPermissions.canSave &&
      !savingRef.current &&
      !savedRef.current &&
      !alertOpenRef.current &&
      navigation.isFocused()
    );
  }

  // ==================================================
  // SELECCIÓN DEL RANGO
  // ==================================================

  function handleCalendarDayPress(dateISO: string) {
    const currentTodayISO = getCenterTodayISO();

    const currentPermissions =
      getVacationEditingPermissions(
        isEditing ? original : undefined,
        currentTodayISO
      );

    if (
      !canInteract() ||
      !currentPermissions.canEditEndDate ||
      !isValidDateISO(dateISO) ||
      dateISO < currentTodayISO
    ) {
      return;
    }

    setSaveError(null);

    // Vacaciones en curso:
    // conservar el inicio original y modificar
    // exclusivamente la fecha de finalización.

    if (currentPermissions.status === 'current') {
      if (dateISO < original.startDateISO) {
        return;
      }

      setSelectionAnchor(null);

      setDraft((previous) => ({
        ...previous,
        startDateISO: original.startDateISO,
        endDateISO: dateISO,
      }));

      return;
    }

    // Vacaciones nuevas o programadas:
    // permitir seleccionar un periodo completo.

    if (!currentPermissions.canEditStartDate) {
      return;
    }

    // Si ha cambiado el día mientras seleccionábamos
    // un rango, descartar cualquier ancla ya pasada.

    if (
      selectionAnchor === null ||
      selectionAnchor < currentTodayISO
    ) {
      setSelectionAnchor(dateISO);

      setDraft((previous) => ({
        ...previous,
        startDateISO: dateISO,
        endDateISO: dateISO,
      }));

      return;
    }

    const range = normalizeVacationRange(
      selectionAnchor,
      dateISO
    );

    setDraft((previous) => ({
      ...previous,
      ...range,
    }));

    setSelectionAnchor(null);
  }

  function handleMonthChange(nextMonthISO: string) {
    if (
      disabled ||
      savingRef.current ||
      savedRef.current ||
      alertOpenRef.current ||
      !navigation.isFocused() ||
      !isValidDateISO(nextMonthISO)
    ) {
      return;
    }

    setMonthISO(getMonthStartISO(nextMonthISO));
  }

  // ==================================================
  // SELECTORES DE FECHA
  // ==================================================

  function handleStartDateChange(dateISO: string) {
    const currentPermissions =
      getVacationEditingPermissions(
        isEditing ? original : undefined,
        getCenterTodayISO()
      );

    if (
      !canInteract() ||
      !currentPermissions.canEditStartDate ||
      !isValidDateISO(dateISO) ||
      dateISO < getCenterTodayISO()
    ) {
      return;
    }

    setSaveError(null);
    setSelectionAnchor(null);

    setDraft((previous) => ({
      ...previous,
      startDateISO: dateISO,
      endDateISO:
        previous.endDateISO < dateISO
          ? dateISO
          : previous.endDateISO,
    }));

    setMonthISO(getMonthStartISO(dateISO));
  }

  function handleEndDateChange(dateISO: string) {
    const currentPermissions =
      getVacationEditingPermissions(
        isEditing ? original : undefined,
        getCenterTodayISO()
      );

    if (
      !canInteract() ||
      !currentPermissions.canEditEndDate ||
      !isValidDateISO(dateISO) ||
      dateISO < getCenterTodayISO() ||
      dateISO < draft.startDateISO
    ) {
      return;
    }

    setSaveError(null);
    setSelectionAnchor(null);

    setDraft((previous) => ({
      ...previous,
      endDateISO: dateISO,
    }));

    setMonthISO(getMonthStartISO(dateISO));
  }

  function handleReasonChange(reason: string) {
    const currentPermissions =
      getVacationEditingPermissions(
        isEditing ? original : undefined,
        getCenterTodayISO()
      );

    if (
      !canInteract() ||
      !currentPermissions.canEditReason
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
  // GUARDAR VACACIONES
  // ==================================================

  async function handleSave() {
    if (
      !canSave ||
      !canInteract()
    ) {
      return;
    }

    const currentTodayISO = getCenterTodayISO();

    const currentTemporalValidation =
      validateVacationTemporalRules(
        draft,
        isEditing ? original : undefined,
        currentTodayISO
      );

    if (!validateVacationDraft(draft).isValid) {
      setSaveError(
        'Revisa las fechas y el motivo introducidos.'
      );

      return;
    }

    if (!currentTemporalValidation.isValid) {
      setSaveError(
        currentTemporalValidation.message ??
        'El periodo seleccionado no es válido.'
      );

      return;
    }

    const payload = normalizeVacationDraft(draft);

    savingRef.current = true;

    Keyboard.dismiss();

    setSaving(true);
    setSaveError(null);

    try {
      if (existingVacation) {
        await updateCenterVacation({
          vacationId: existingVacation.id,
          ...payload,
        });
      } else {
        await createCenterVacation(payload);
      }

      savedRef.current = true;

      if (
        mountedRef.current &&
        navigation.isFocused()
      ) {
        pendingNavigationRef.current = () => {
          navigation.goBack();
        };

        setDiscarding(true);
      }

    } catch (error) {
      if (!isExpectedSaveError(error)) {
        console.error(
          '[CenterVacationFormScreen]',
          error
        );
      }

      if (mountedRef.current) {
        setSaveError(getSaveErrorMessage(error));
      }

    } finally {
      savingRef.current = false;

      if (mountedRef.current) {
        setSaving(false);
      }
    }
  }

  const footerMessage =
    saving
      ? 'Guardando vacaciones...'
      : permissions.status === 'past'
        ? 'Periodo finalizado. Solo lectura.'
        : !validation.isValid
          ? 'Revisa el periodo seleccionado.'
          : !datesAreAllowed
            ? temporalValidation.message ??
              'Revisa las fechas seleccionadas.'
            : isEditing && !hasChanges
              ? 'No hay cambios pendientes.'
              : 'Las citas existentes no se modificarán.';

  // ==================================================
  // INTERFAZ
  // ==================================================

  return (
    <View style={styles.container}>

      <View style={[
        styles.header,
        { paddingTop: insets.top + 12 },
      ]}>
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
          {permissions.status === 'past'
            ? 'Detalle de vacaciones'
            : isEditing
              ? 'Editar vacaciones'
              : 'Nuevas vacaciones'}
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
          style={styles.content}
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
                name="sunny-outline"
                size={26}
                color={colors.secondary}
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>
                {permissions.status === 'past'
                  ? 'Vacaciones finalizadas'
                  : permissions.status === 'current'
                    ? 'Vacaciones en curso'
                    : permissions.status === 'upcoming'
                      ? 'Vacaciones programadas'
                      : 'Vacaciones del centro'}
              </Text>

              <Text style={styles.infoDescription}>
                {permissions.status === 'past'
                  ? 'Este periodo pertenece al histórico del centro y no puede modificarse.'
                  : permissions.status === 'current'
                    ? 'Las vacaciones ya han comenzado. Puedes modificar la fecha de finalización y el motivo.'
                    : permissions.status === 'upcoming'
                      ? 'Puedes modificar las fechas y el motivo de este periodo de vacaciones.'
                      : 'Selecciona el periodo durante el cual permanecerá cerrado el centro.'}
              </Text>
            </View>
          </View>

          {/* CALENDARIO */}

          <Text style={styles.sectionTitle}>
            {permissions.status === 'past'
              ? 'PERIODO DE VACACIONES'
              : permissions.status === 'current'
                ? 'SELECCIONAR FECHA FINAL'
                : 'SELECCIONAR PERIODO'}
          </Text>

          <MonthlyCalendar
            monthISO={monthISO}
            todayISO={todayISO}
            minimumDateISO={todayISO}
            selectedRange={{
              startDateISO: draft.startDateISO,
              endDateISO: draft.endDateISO,
            }}
            onMonthChange={handleMonthChange}
            onDayPress={handleCalendarDayPress}
            disabled={disabled}
            daysDisabled={
              !permissions.canEditEndDate
            }
          />

          <View style={styles.hintCard}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color={colors.primary}
            />

            <Text style={styles.hintText}>
              {permissions.status === 'past'
                ? 'Este periodo ha finalizado. Puedes consultar las fechas, pero no modificarlas.'
                : permissions.status === 'current'
                  ? 'Selecciona la nueva fecha de finalización. La fecha inicial permanecerá bloqueada.'
                  : selectionAnchor !== null
                    ? 'Selecciona el último día de vacaciones. Puedes cambiar de mes.'
                    : 'Pulsa sobre un día para comenzar una nueva selección.'}
            </Text>
          </View>

          {/* FECHAS */}

          <Text style={styles.sectionTitle}>
            FECHAS DE VACACIONES
          </Text>

          <View style={styles.fieldCard}>
            <DatePicker
              label="Fecha de inicio"
              value={draft.startDateISO}
              minimumDateISO={
                permissions.canEditStartDate
                  ? todayISO
                  : undefined
              }
              onChange={handleStartDateChange}
              disabled={
                disabled ||
                !permissions.canEditStartDate
              }
            />

            <View style={styles.fieldSpacing}>
              <DatePicker
                label="Fecha de finalización"
                value={draft.endDateISO}
                minimumDateISO={
                  draft.startDateISO > todayISO
                    ? draft.startDateISO
                    : todayISO
                }
                onChange={handleEndDateChange}
                disabled={
                  disabled ||
                  !permissions.canEditEndDate
                }
              />
            </View>
          </View>

          {/* RESUMEN */}

          {duration > 0 && (
            <View style={styles.summaryCard}>
              <Ionicons
                name="calendar-outline"
                size={28}
                color={colors.secondary}
              />

              <View style={styles.infoContent}>
                <Text style={styles.durationTitle}>
                  {duration} {duration === 1 ? 'día' : 'días'}
                  {' '}de vacaciones
                </Text>

                <Text style={styles.summaryText}>
                  {formatVacationRange(draft)}
                </Text>
              </View>
            </View>
          )}

          {/* MOTIVO */}

          <Text style={styles.sectionTitle}>
            MOTIVO (OPCIONAL)
          </Text>

          <View style={styles.fieldCard}>
            <TextInput
              style={styles.reasonInput}
              value={draft.reason}
              onChangeText={handleReasonChange}
              editable={
                !disabled &&
                permissions.canEditReason
              }
              placeholder="Ej. Vacaciones de verano"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={MAX_VACATION_REASON_LENGTH}
              textAlignVertical="top"
              accessibilityLabel="Motivo de las vacaciones"
            />

            <Text style={styles.characterCount}>
              {draft.reason.length}/
              {MAX_VACATION_REASON_LENGTH}
            </Text>
          </View>

        </ScrollView>

        {/* GUARDADO */}

        <View style={[
          styles.footer,
          {
            paddingBottom:
              Math.max(insets.bottom, 16) + 70,
          },
        ]}>

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

          {permissions.canSave && (
            <Pressable
              style={[
                styles.saveButton,
                !canSave && styles.saveButtonDisabled,
              ]}
              disabled={!canSave}
              onPress={() => void handleSave()}
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
                    : 'Guardar vacaciones'}
              </Text>
            </Pressable>
          )}

          <Text style={styles.footerHint}>
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondaryContainer,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: colors.secondary,
  },
  infoDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: colors.secondary,
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
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  hintText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  fieldCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: 16,
  },
  fieldSpacing: {
    marginTop: 18,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.secondaryContainer,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  durationTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17,
    color: colors.secondary,
  },
  summaryText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 19,
    color: colors.secondary,
    marginTop: 6,
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
