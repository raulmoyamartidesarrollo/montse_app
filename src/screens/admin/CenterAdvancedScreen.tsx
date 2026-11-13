import React, { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';

import {
  getCenterSettings,
  updateCenterSettings,
  type CenterBookingSettings,
  type CenterSettings,
} from '../../services/centers';

// --------------------------------------------------
// TIPOS
// --------------------------------------------------

type AdvancedRouteParams = {
  center: CenterSettings;
};

type BookingSettings = CenterBookingSettings;

type AdvancedSettings = BookingSettings & {
  timezone: string;
};

type SettingSwitchProps = {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

// --------------------------------------------------
// VALORES PREDETERMINADOS
// --------------------------------------------------

const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  allowClientCancellation: true,
  allowClientRescheduling: true,
  allowRecurringBookings: true,
  defaultDurationMinutes: 60,
  recurringIntervalsWeeks: [1, 2, 3, 4],
};

const DEFAULT_TIMEZONE = 'Europe/Madrid';

const DURATION_OPTIONS = [30, 45, 60, 90, 120];

const RECURRING_OPTIONS = [1, 2, 3, 4];

// --------------------------------------------------
// COMPONENTE SWITCH
// --------------------------------------------------

function SettingSwitch({
  title,
  description,
  value,
  onValueChange,
  disabled = false,
}: SettingSwitchProps) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>
          {title}
        </Text>

        <Text style={styles.settingDescription}>
          {description}
        </Text>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: colors.surfaceBorder,
          true: colors.primary,
        }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

// --------------------------------------------------
// FUNCIONES AUXILIARES
// --------------------------------------------------

function normalizeIntervals(
  intervals: number[]
): number[] {
  return [...intervals].sort((a, b) => a - b);
}

function intervalsAreEqual(
  first: number[],
  second: number[]
): boolean {
  const a = normalizeIntervals(first);
  const b = normalizeIntervals(second);

  return (
    a.length === b.length &&
    a.every((value, index) => value === b[index])
  );
}

function getAdvancedSettings(
  center: CenterSettings
): AdvancedSettings {
  const settings =
    center.bookingSettings ?? DEFAULT_BOOKING_SETTINGS;

  return {
    timezone: center.timezone || DEFAULT_TIMEZONE,

    allowClientCancellation:
      settings.allowClientCancellation,

    allowClientRescheduling:
      settings.allowClientRescheduling,

    allowRecurringBookings:
      settings.allowRecurringBookings,

    defaultDurationMinutes:
      settings.defaultDurationMinutes,

    recurringIntervalsWeeks: normalizeIntervals(
      settings.recurringIntervalsWeeks ?? [1, 2, 3, 4]
    ),
  };
}

// --------------------------------------------------
// PANTALLA PRINCIPAL
// --------------------------------------------------

export default function CenterAdvancedScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const { center } = route.params as AdvancedRouteParams;

  const initialSettings = getAdvancedSettings(center);

  // --------------------------------------------------
  // ESTADOS
  // --------------------------------------------------

  const [timezone, setTimezone] = useState(
    initialSettings.timezone
  );

  const [duration, setDuration] = useState(
    initialSettings.defaultDurationMinutes
  );

  const [allowCancellation, setAllowCancellation] =
    useState(
      initialSettings.allowClientCancellation
    );

  const [allowRescheduling, setAllowRescheduling] =
    useState(
      initialSettings.allowClientRescheduling
    );

  const [allowRecurring, setAllowRecurring] =
    useState(
      initialSettings.allowRecurringBookings
    );

  const [recurringIntervals, setRecurringIntervals] =
    useState<number[]>(
      initialSettings.recurringIntervalsWeeks
    );

  const [savedSettings, setSavedSettings] =
    useState<AdvancedSettings>(
      initialSettings
    );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // --------------------------------------------------
  // APLICAR CONFIGURACIÓN RECUPERADA
  // --------------------------------------------------

  const applySettings = useCallback(
    (updatedCenter: CenterSettings) => {
      const settings =
        getAdvancedSettings(updatedCenter);

      setTimezone(settings.timezone);

      setDuration(
        settings.defaultDurationMinutes
      );

      setAllowCancellation(
        settings.allowClientCancellation
      );

      setAllowRescheduling(
        settings.allowClientRescheduling
      );

      setAllowRecurring(
        settings.allowRecurringBookings
      );

      setRecurringIntervals(
        [...settings.recurringIntervalsWeeks]
      );

      setSavedSettings({
        ...settings,
        recurringIntervalsWeeks: [
          ...settings.recurringIntervalsWeeks,
        ],
      });
    },
    []
  );

  // --------------------------------------------------
  // RECARGAR AL ENTRAR EN LA PANTALLA
  // --------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadSettings = async () => {
        try {
          setLoading(true);

          const updatedCenter =
            await getCenterSettings();

          if (!active) {
            return;
          }

          applySettings(updatedCenter);
        } catch (error) {
          console.error(
            '[CenterAdvancedScreen] Error cargando configuración:',
            error
          );

          if (active) {
            Alert.alert(
              'Error de conexión',
              'No se ha podido cargar la configuración avanzada del centro.'
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      void loadSettings();

      return () => {
        active = false;
      };
    }, [applySettings])
  );

  // --------------------------------------------------
  // INTERVALOS DE RECURRENCIA
  // --------------------------------------------------

  const toggleRecurringInterval = (
    weeks: number
  ) => {
    if (loading || saving) {
      return;
    }

    setRecurringIntervals((current) => {
      if (current.includes(weeks)) {
        return current.filter(
          (item) => item !== weeks
        );
      }

      return normalizeIntervals([
        ...current,
        weeks,
      ]);
    });
  };

  // --------------------------------------------------
  // DETECCIÓN DE CAMBIOS
  // --------------------------------------------------

  const hasChanges =
    timezone !== savedSettings.timezone ||
    duration !==
      savedSettings.defaultDurationMinutes ||
    allowCancellation !==
      savedSettings.allowClientCancellation ||
    allowRescheduling !==
      savedSettings.allowClientRescheduling ||
    allowRecurring !==
      savedSettings.allowRecurringBookings ||
    !intervalsAreEqual(
      recurringIntervals,
      savedSettings.recurringIntervalsWeeks
    );

  const canSave =
    hasChanges &&
    !loading &&
    !saving;

  const controlsDisabled =
    loading || saving;

  // --------------------------------------------------
  // GUARDAR EN FIREBASE
  // --------------------------------------------------

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    // Si las reservas recurrentes están activadas,
    // debe existir al menos un intervalo.
    if (
      allowRecurring &&
      recurringIntervals.length === 0
    ) {
      Alert.alert(
        'Intervalos de recurrencia',
        'Selecciona al menos un intervalo para permitir reservas recurrentes.'
      );

      return;
    }

    const data: AdvancedSettings = {
      timezone,

      allowClientCancellation:
        allowCancellation,

      allowClientRescheduling:
        allowRescheduling,

      allowRecurringBookings:
        allowRecurring,

      defaultDurationMinutes:
        duration,

      recurringIntervalsWeeks:
        normalizeIntervals(recurringIntervals),
    };

    try {
      setSaving(true);

      // Guardar configuración en Firebase.
      await updateCenterSettings({
        section: 'advanced',
        data,
      });

      // Recuperar los valores confirmados.
      const updatedCenter =
        await getCenterSettings();

      applySettings(updatedCenter);

      Alert.alert(
        'Cambios guardados',
        'La configuración avanzada del centro se ha actualizado correctamente.'
      );
    } catch (error) {
      console.error(
        '[CenterAdvancedScreen] Error guardando configuración:',
        error
      );

      Alert.alert(
        'Error al guardar',
        'No se ha podido guardar la configuración avanzada. Comprueba tu conexión e inténtalo de nuevo.'
      );
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // INTERFAZ
  // --------------------------------------------------

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
          onPress={() => navigation.goBack()}
          disabled={saving}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.text}
          />
        </Pressable>

        <Text style={styles.headerTitle}>
          Configuración avanzada
        </Text>
      </View>

      {/* CONTENIDO */}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: insets.bottom + 120,
        }}
      >
        {/* INFORMACIÓN */}

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="settings-outline"
              size={26}
              color={colors.primary}
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Preferencias del centro
            </Text>

            <Text style={styles.infoDescription}>
              Personaliza el funcionamiento de las reservas
              y las opciones disponibles para tus pacientes.
            </Text>
          </View>
        </View>

        {/* CONFIGURACIÓN REGIONAL */}

        <Text style={styles.sectionTitle}>
          CONFIGURACIÓN REGIONAL
        </Text>

        <View style={styles.card}>
          <View style={styles.timezoneRow}>
            <Ionicons
              name="time-outline"
              size={23}
              color={colors.primary}
            />

            <View style={styles.timezoneContent}>
              <Text style={styles.settingTitle}>
                Zona horaria
              </Text>

              <Text style={styles.settingDescription}>
                {timezone}
              </Text>
            </View>
          </View>
        </View>

        {/* DURACIÓN DE SESIONES */}

        <Text style={styles.sectionTitle}>
          DURACIÓN DE LAS SESIONES
        </Text>

        <View style={styles.card}>
          <Text style={styles.settingTitle}>
            Duración predeterminada
          </Text>

          <Text style={styles.settingDescription}>
            Tiempo que se utilizará por defecto
            al crear una nueva reserva.
          </Text>

          <View style={styles.optionsContainer}>
            {DURATION_OPTIONS.map(
              (minutes) => (
                <Pressable
                  key={minutes}
                  style={[
                    styles.optionButton,
                    duration === minutes &&
                      styles.optionSelected,
                  ]}
                  onPress={() =>
                    setDuration(minutes)
                  }
                  disabled={controlsDisabled}
                >
                  <Text
                    style={[
                      styles.optionText,
                      duration === minutes &&
                        styles.optionTextSelected,
                    ]}
                  >
                    {minutes} min
                  </Text>
                </Pressable>
              )
            )}
          </View>
        </View>

        {/* PREFERENCIAS DE RESERVAS */}

        <Text style={styles.sectionTitle}>
          PREFERENCIAS DE RESERVAS
        </Text>

        <View style={styles.card}>
          <SettingSwitch
            title="Permitir cancelaciones"
            description="Los pacientes podrán cancelar sus propias reservas."
            value={allowCancellation}
            onValueChange={
              setAllowCancellation
            }
            disabled={controlsDisabled}
          />

          <View style={styles.separator} />

          <SettingSwitch
            title="Permitir cambios de cita"
            description="Los pacientes podrán modificar la fecha y hora de sus reservas."
            value={allowRescheduling}
            onValueChange={
              setAllowRescheduling
            }
            disabled={controlsDisabled}
          />

          <View style={styles.separator} />

          <SettingSwitch
            title="Permitir reservas recurrentes"
            description="Los pacientes podrán solicitar citas que se repitan periódicamente."
            value={allowRecurring}
            onValueChange={
              setAllowRecurring
            }
            disabled={controlsDisabled}
          />
        </View>

        {/* INTERVALOS DE RECURRENCIA */}

        {allowRecurring && (
          <>
            <Text style={styles.sectionTitle}>
              INTERVALOS DE RECURRENCIA
            </Text>

            <View style={styles.card}>
              <Text style={styles.settingTitle}>
                Repetir cada
              </Text>

              <Text style={styles.settingDescription}>
                Selecciona los intervalos que podrán
                utilizarse para las reservas recurrentes.
              </Text>

              <View style={styles.optionsContainer}>
                {RECURRING_OPTIONS.map(
                  (weeks) => {
                    const selected =
                      recurringIntervals.includes(
                        weeks
                      );

                    return (
                      <Pressable
                        key={weeks}
                        style={[
                          styles.optionButton,
                          selected &&
                            styles.optionSelected,
                        ]}
                        onPress={() =>
                          toggleRecurringInterval(
                            weeks
                          )
                        }
                        disabled={
                          controlsDisabled
                        }
                      >
                        <Text
                          style={[
                            styles.optionText,
                            selected &&
                              styles.optionTextSelected,
                          ]}
                        >
                          {weeks}{' '}
                          {weeks === 1
                            ? 'semana'
                            : 'semanas'}
                        </Text>
                      </Pressable>
                    );
                  }
                )}
              </View>
            </View>
          </>
        )}

        {/* AYUDA */}

        <View style={styles.helpCard}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color={colors.primary}
          />

          <Text style={styles.helpText}>
            Estas preferencias determinarán qué opciones
            estarán disponibles para los pacientes cuando
            el sistema de reservas esté completamente conectado.
          </Text>
        </View>
      </ScrollView>

      {/* BOTÓN GUARDAR */}

      <View
        style={[
          styles.footer,
          {
            paddingBottom:
              Math.max(insets.bottom, 16) + 70,
          },
        ]}
      >
        <Pressable
          style={[
            styles.saveButton,
            !canSave &&
              styles.saveButtonDisabled,
          ]}
          onPress={() =>
            void handleSave()
          }
          disabled={!canSave}
        >
          {saving ? (
            <>
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

              <Text
                style={styles.saveButtonText}
              >
                Guardando cambios...
              </Text>
            </>
          ) : (
            <>
              <Ionicons
                name="save-outline"
                size={19}
                color="#FFFFFF"
              />

              <Text
                style={styles.saveButtonText}
              >
                Guardar cambios
              </Text>
            </>
          )}
        </Pressable>

        <Text style={styles.footerHint}>
          {loading
            ? 'Cargando configuración...'
            : saving
              ? 'Actualizando preferencias...'
              : hasChanges
                ? 'Tienes cambios pendientes de guardar.'
                : 'Todos los cambios están guardados.'}
        </Text>
      </View>
    </View>
  );
}

// --------------------------------------------------
// ESTILOS
// --------------------------------------------------

const styles = StyleSheet.create({
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
    marginBottom: 18,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 17,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },

  timezoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  timezoneContent: {
    flex: 1,
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
  },

  settingContent: {
    flex: 1,
  },

  settingTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: colors.text,
  },

  settingDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
    marginTop: 6,
  },

  separator: {
    height: 1,
    backgroundColor: colors.surfaceBorder,
    marginVertical: 16,
  },

  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },

  optionButton: {
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  optionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  optionText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: colors.textSecondary,
  },

  optionTextSelected: {
    color: '#FFFFFF',
  },

  helpCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 16,
    marginTop: 24,
    gap: 12,
  },

  helpText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },

  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
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
    color: '#FFFFFF',
  },

  footerHint: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
});