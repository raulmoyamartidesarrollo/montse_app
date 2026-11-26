import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  usePreventRemove,
} from '@react-navigation/native';

import type {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type {
  AdminServicesStackParamList,
} from '../../navigation/AdminServicesNavigator';

import CenterServiceForm, {
  type CenterServiceFormValues,
} from '../../components/admin/services/CenterServiceForm';

import {
  getCenterServices,
  updateCenterService,
  setCenterServiceStatus,
  deleteCenterService,
  type CenterServiceInput,
  type CenterService,
} from '../../services/centerServices';

import { colors } from '../../theme/colors';

import useAdminDraftGuard from '../../hooks/useAdminDraftGuard';

// ==================================================
// TIPOS
// ==================================================

type Props = NativeStackScreenProps<
  AdminServicesStackParamList,
  'EditService'
>;

// ==================================================
// FUNCIONES AUXILIARES
// ==================================================

function serviceToFormValues(
  service: CenterService
): CenterServiceFormValues {
  return {
    name: service.name,
    description: service.description,

    price:
      service.priceCents === null
        ? ''
        : (service.priceCents / 100)
            .toFixed(2)
            .replace('.', ','),

    duration:
      service.durationMinutes === null
        ? ''
        : String(service.durationMinutes),

    active: service.active,
  };
}

function hasFormChanges(
  current: CenterServiceFormValues,
  original: CenterServiceFormValues
): boolean {
  return (
    current.name !== original.name ||
    current.description !== original.description ||
    current.price !== original.price ||
    current.duration !== original.duration ||
    current.active !== original.active
  );
}

// ==================================================
// PANTALLA PRINCIPAL
// ==================================================

export default function EditCenterServiceScreen({
  navigation,
  route,
}: Props) {
  const insets = useSafeAreaInsets();

  const { serviceId } = route.params;

  const [service, setService] =
    useState<CenterService | null>(null);

  const [values, setValues] =
    useState<CenterServiceFormValues | null>(null);

  const [originalValues, setOriginalValues] =
    useState<CenterServiceFormValues | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const requestIdRef = useRef(0);
  const savingRef = useRef(false);
  const savedRef = useRef(false);
  const alertOpenRef = useRef(false);

  const [discarding, setDiscarding] =
    useState(false);

  const pendingNavigationRef =
    useRef<(() => void) | null>(null);

  // ==================================================
  // CARGAR SERVICIO
  // ==================================================

  const loadService = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);

    try {
      const services = await getCenterServices();

      if (requestId !== requestIdRef.current) {
        return;
      }

      const result = services.find(
        (item) => item.serviceId === serviceId
      );

      if (!result) {
        setService(null);
        setValues(null);
        setOriginalValues(null);

        setError(
          'El servicio no existe o ya no está disponible.'
        );

        return;
      }

      const formValues =
        serviceToFormValues(result);

      setService(result);
      setValues({ ...formValues });
      setOriginalValues({ ...formValues });

    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      console.error(
        '[EditCenterServiceScreen] Error cargando servicio:',
        err
      );

      setError(
        'No se ha podido cargar el servicio.'
      );

    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [serviceId]);

  useEffect(() => {
    void loadService();

    return () => {
      requestIdRef.current += 1;
    };
  }, [loadService]);

  // ==================================================
  // DETECTAR CAMBIOS
  // ==================================================

  const hasChanges =
    values !== null &&
    originalValues !== null &&
    hasFormChanges(values, originalValues);

  // ==================================================
  // PROTEGER NAVEGACIÓN
  // ==================================================

  const { confirmNavigation } = useAdminDraftGuard({
    sourceTab: 'Servicios',

    hasChanges,

    isSaving: saving,

    enabled: !saved && !discarding,

    savingRef,

    savedRef,

    alertOpenRef,

    unsavedTitle: 'Cambios sin guardar',

    unsavedMessage:
      'Si sales de esta pantalla perderás los cambios realizados.',

    savingTitle: 'Procesando servicio',

    savingMessage:
      'Espera a que finalice la operación antes de continuar.',

    onDiscardAndNavigate: (action) => {
      if (
        savingRef.current ||
        !navigation.isFocused()
      ) {
        return;
      }

      Keyboard.dismiss();

      if (originalValues !== null) {
        setValues({
          ...originalValues,
        });
      }

      pendingNavigationRef.current = action;
      setDiscarding(true);
    },
  });

  usePreventRemove(
    !saved && !discarding && (hasChanges || saving),
    ({ data }) => {
      confirmNavigation(() => {
        navigation.dispatch(data.action);
      });
    }
  );

  // ==================================================
  // COMPLETAR DESCARTE Y NAVEGACIÓN
  // ==================================================

  useEffect(() => {
    if (!discarding) {
      return;
    }

    const action = pendingNavigationRef.current;

    if (!action) {
      return;
    }

    pendingNavigationRef.current = null;

    if (!navigation.isFocused()) {
      setDiscarding(false);
      return;
    }

    navigation.popToTop();

    action();
  }, [discarding, navigation]);

  // ==================================================
  // GUARDAR CAMBIOS
  // ==================================================

  const handleSubmit = useCallback(
    async (payload: CenterServiceInput) => {
      if (
        savingRef.current ||
        savedRef.current ||
        !service
      ) {
        return;
      }

      savingRef.current = true;
      setSaving(true);

      Keyboard.dismiss();

      try {
        await updateCenterService({
          serviceId,
          ...payload,
        });

        savedRef.current = true;
        setSaved(true);

        Alert.alert(
          'Servicio actualizado',
          'Los cambios se han guardado correctamente.',
          [
            {
              text: 'Aceptar',
              onPress: () => {
                if (navigation.isFocused()) {
                  navigation.goBack();
                }
              },
            },
          ],
          {
            cancelable: false,
          }
        );

      } catch (err) {
        console.error(
          '[EditCenterServiceScreen] Error actualizando servicio:',
          err
        );

        throw err;

      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [navigation, service, serviceId]
  );

  // ==================================================
  // CANCELAR
  // ==================================================

  // ==================================================
  // ACTIVAR / DESACTIVAR SERVICIO
  // ==================================================

  const handleChangeStatus = () => {
    if (
      !service ||
      savingRef.current ||
      savedRef.current ||
      alertOpenRef.current
    ) {
      return;
    }

    if (hasChanges) {
      Alert.alert(
        'Cambios pendientes',
        'Guarda o descarta los cambios del formulario antes de modificar el estado del servicio.'
      );
      return;
    }

    const newActive = !service.active;

    alertOpenRef.current = true;

    Alert.alert(
      newActive
        ? 'Activar servicio'
        : 'Desactivar servicio',

      newActive
        ? `¿Quieres volver a activar ${service.name}?`
        : `¿Quieres desactivar ${service.name}? Sus datos se conservarán.`,

      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => {
            alertOpenRef.current = false;
          },
        },
        {
          text: newActive
            ? 'Activar'
            : 'Desactivar',

          style: newActive
            ? 'default'
            : 'destructive',

          onPress: () => {
            alertOpenRef.current = false;

            if (
              savingRef.current ||
              savedRef.current ||
              !navigation.isFocused()
            ) {
              return;
            }

            savingRef.current = true;
            setSaving(true);

            Keyboard.dismiss();

            void (async () => {
              try {
                const response =
                  await setCenterServiceStatus({
                    serviceId,
                    active: newActive,
                  });

                setService((previous) =>
                  previous
                    ? {
                        ...previous,
                        active: response.active,
                      }
                    : previous
                );

                setValues((previous) =>
                  previous
                    ? {
                        ...previous,
                        active: response.active,
                      }
                    : previous
                );

                setOriginalValues((previous) =>
                  previous
                    ? {
                        ...previous,
                        active: response.active,
                      }
                    : previous
                );

                Alert.alert(
                  newActive
                    ? 'Servicio activado'
                    : 'Servicio desactivado',

                  newActive
                    ? 'El servicio está activo.'
                    : 'El servicio está inactivo. Sus datos se han conservado.'
                );

              } catch (error) {
                console.error(
                  '[EditCenterServiceScreen] Error cambiando estado:',
                  error
                );

                Alert.alert(
                  'Error',
                  'No se ha podido confirmar el cambio de estado. Vuelve al listado y comprueba su estado antes de reintentarlo.'
                );

              } finally {
                savingRef.current = false;
                setSaving(false);
              }
            })();
          },
        },
      ],
      {
        cancelable: false,
      }
    );
  };

  // ==================================================
  // ELIMINAR SERVICIO
  // ==================================================

  const handleDeleteService = () => {
    if (
      !service ||
      savingRef.current ||
      savedRef.current ||
      alertOpenRef.current ||
      hasChanges
    ) {
      return;
    }

    alertOpenRef.current = true;

    Alert.alert(
      'Eliminar servicio',
      `¿Quieres eliminar ${service.name}?\n\n` +
        'Dejará de aparecer en el catálogo de servicios. ' +
        'Sus datos se conservarán internamente.',

      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => {
            alertOpenRef.current = false;
          },
        },
        {
          text: 'Eliminar',
          style: 'destructive',

          onPress: () => {
            alertOpenRef.current = false;

            if (
              savingRef.current ||
              savedRef.current ||
              !navigation.isFocused()
            ) {
              return;
            }

            savingRef.current = true;
            setSaving(true);

            Keyboard.dismiss();

            void (async () => {
              try {
                await deleteCenterService(serviceId);

                savedRef.current = true;
                setSaved(true);

                Alert.alert(
                  'Servicio eliminado',
                  'El servicio se ha eliminado correctamente.',
                  [
                    {
                      text: 'Aceptar',
                      onPress: () => {
                        if (navigation.isFocused()) {
                          navigation.goBack();
                        }
                      },
                    },
                  ],
                  {
                    cancelable: false,
                  }
                );

              } catch (error) {
                console.error(
                  '[EditCenterServiceScreen] Error eliminando servicio:',
                  error
                );

                Alert.alert(
                  'Error',
                  'No se ha podido confirmar la eliminación. ' +
                    'Comprueba el listado antes de volver a intentarlo.'
                );

              } finally {
                savingRef.current = false;
                setSaving(false);
              }
            })();
          },
        },
      ],
      {
        cancelable: false,
      }
    );
  };

  const handleCancel = () => {
    if (savingRef.current) {
      return;
    }

    Keyboard.dismiss();
    navigation.goBack();
  };

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
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.backButton}
          disabled={saving}
          onPress={handleCancel}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.text}
          />
        </Pressable>

        <Text style={styles.headerTitle}>
          Editar servicio
        </Text>
      </View>

      {/* CARGANDO */}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />

          <Text style={styles.message}>
            Cargando servicio...
          </Text>
        </View>

      ) : error || !service || !values ? (

        <View style={styles.centered}>
          <Ionicons
            name="alert-circle-outline"
            size={42}
            color={colors.error}
          />

          <Text style={styles.message}>
            {error || 'Servicio no disponible.'}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => void loadService()}
          >
            <Text style={styles.retryText}>
              Reintentar
            </Text>
          </Pressable>
        </View>

      ) : (

        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 24,
              paddingBottom: insets.bottom + 110,
            }}
          >

            {/* PRESENTACIÓN */}

            <View style={styles.introCard}>
              <View style={styles.introIcon}>
                <Ionicons
                  name="medkit-outline"
                  size={32}
                  color={colors.primary}
                />
              </View>

              <Text style={styles.introTitle}>
                {service.name || 'Servicio sin nombre'}
              </Text>

              <View
                style={[
                  styles.statusBadge,
                  !service.active &&
                    styles.statusBadgeInactive,
                ]}
              >
                <Ionicons
                  name={
                    service.active
                      ? 'checkmark-circle-outline'
                      : 'pause-circle-outline'
                  }
                  size={16}
                  color={
                    service.active
                      ? colors.secondary
                      : colors.textMuted
                  }
                />

                <Text
                  style={[
                    styles.statusText,
                    !service.active &&
                      styles.statusTextInactive,
                  ]}
                >
                  {service.active
                    ? 'Servicio activo'
                    : 'Servicio inactivo'}
                </Text>
              </View>

              <Text style={styles.introDescription}>
                Modifica la información, el precio,
                la duración y la disponibilidad
                de este tratamiento.
              </Text>
            </View>

            {/* DATOS PENDIENTES */}

            {(
              service.priceCents === null ||
              service.durationMinutes === null
            ) && (
              <View style={styles.noticeCard}>
                <Ionicons
                  name="information-circle-outline"
                  size={24}
                  color={colors.primary}
                />

                <View style={styles.noticeContent}>
                  <Text style={styles.noticeTitle}>
                    Configuración pendiente
                  </Text>

                  <Text style={styles.noticeText}>
                    Completa el precio y la duración
                    del servicio antes de guardar.
                  </Text>
                </View>
              </View>
            )}

            {/* FORMULARIO */}

            <CenterServiceForm
              values={values}
              onChange={setValues}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              submitLabel="Guardar cambios"
              saving={saving}
              disabled={saved || discarding}
            />

            {/* GESTIÓN DEL SERVICIO */}

            <Text style={styles.managementTitle}>
              GESTIÓN DEL SERVICIO
            </Text>

            <View style={styles.managementCard}>
              <View style={styles.managementHeader}>
                <View style={styles.managementIcon}>
                  <Ionicons
                    name="settings-outline"
                    size={23}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.managementContent}>
                  <Text style={styles.managementName}>
                    Disponibilidad del servicio
                  </Text>

                  <Text style={styles.managementDescription}>
                    {service.active
                      ? 'Actualmente el servicio está activo.'
                      : 'Actualmente el servicio está inactivo.'}
                  </Text>
                </View>
              </View>

              <Text style={styles.managementDescription}>
                Puedes cambiar su disponibilidad sin modificar
                el precio, la duración ni el resto de sus datos.
              </Text>

              {hasChanges && (
                <Text style={styles.managementWarning}>
                  Guarda o descarta los cambios pendientes
                  antes de cambiar el estado.
                </Text>
              )}

              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  disabled: saving || saved || hasChanges,
                }}
                disabled={saving || saved || hasChanges}
                style={[
                  styles.statusActionButton,
                  !service.active &&
                    styles.statusActionButtonActivate,
                  (saving || saved || hasChanges) &&
                    styles.managementDisabled,
                ]}
                onPress={handleChangeStatus}
              >
                {saving ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.white}
                  />
                ) : (
                  <Ionicons
                    name={
                      service.active
                        ? 'pause-circle-outline'
                        : 'checkmark-circle-outline'
                    }
                    size={21}
                    color={colors.white}
                  />
                )}

                <Text style={styles.statusActionText}>
                  {saving
                    ? 'Procesando...'
                    : service.active
                      ? 'Desactivar servicio'
                      : 'Activar servicio'}
                </Text>
              </Pressable>

              <View style={styles.managementDivider} />

              <Text style={styles.deleteTitle}>
                Eliminar servicio
              </Text>

              <Text style={styles.managementDescription}>
                Retira este tratamiento del catálogo.
                Sus datos se conservarán internamente.
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Eliminar servicio"
                accessibilityState={{
                  disabled: saving || saved || hasChanges,
                }}
                disabled={saving || saved || hasChanges}
                style={[
                  styles.deleteButton,
                  (saving || saved || hasChanges) &&
                    styles.managementDisabled,
                ]}
                onPress={handleDeleteService}
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={colors.error}
                />

                <Text style={styles.deleteButtonText}>
                  Eliminar servicio
                </Text>
              </Pressable>

              <Text style={styles.deleteHelp}>
                Actualmente no es posible recuperar un
                servicio eliminado desde la aplicación.
              </Text>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

// ==================================================
// ESTILOS
// ==================================================

const styles = StyleSheet.create({
  managementDivider: {
    height: 1,
    backgroundColor: colors.surfaceBorder,
    marginVertical: 22,
  },

  deleteTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: colors.error,
  },

  deleteButton: {
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: colors.errorContainer,
    borderWidth: 1,
    borderColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 16,
    paddingHorizontal: 14,
  },

  deleteButtonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.error,
  },

  deleteHelp: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: 10,
  },

  managementTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.textMuted,
    marginTop: 30,
    marginBottom: 13,
  },

  managementCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: 18,
  },

  managementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },

  managementIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  managementContent: {
    flex: 1,
  },

  managementName: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: colors.text,
  },

  managementDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
    marginTop: 5,
  },

  managementWarning: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    lineHeight: 19,
    color: colors.primary,
    marginTop: 12,
  },

  statusActionButton: {
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: colors.primaryPressed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 18,
    paddingHorizontal: 14,
  },

  statusActionButtonActivate: {
    backgroundColor: colors.secondary,
  },

  statusActionText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.white,
  },

  managementDisabled: {
    opacity: 0.5,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  keyboardContainer: {
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
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    color: colors.text,
    marginLeft: 8,
  },

  introCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 24,
    paddingVertical: 25,
  },

  introIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  introTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 19,
    color: colors.text,
    textAlign: 'center',
  },

  introDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    marginTop: 12,
  },

  statusBadgeInactive: {
    backgroundColor: colors.surfaceMuted,
  },

  statusText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: colors.secondary,
  },

  statusTextInactive: {
    color: colors.textMuted,
  },

  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.primaryContainer,
    borderRadius: 16,
    marginTop: 18,
  },

  noticeContent: {
    flex: 1,
  },

  noticeTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.text,
  },

  noticeText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
    marginTop: 5,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingBottom: 90,
  },

  message: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },

  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 15,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 20,
  },

  retryText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.white,
  },
});
