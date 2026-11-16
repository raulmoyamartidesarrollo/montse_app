import React, { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
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
  type CenterSettings,
  type CenterSessionPackageSettings,
} from '../../services/centers';

// --------------------------------------------------
// TIPOS
// --------------------------------------------------

type SessionPackagesRouteParams = {
  center: CenterSettings;
};

type PackageSettings = CenterSessionPackageSettings;

// --------------------------------------------------
// VALORES PREDETERMINADOS
// --------------------------------------------------

const DEFAULT_SETTINGS: PackageSettings = {
  enabled: false,
  sessionsPerPackage: 10,
  priceCents: 0,
  currency: 'EUR',
};

// --------------------------------------------------
// FUNCIONES AUXILIARES
// --------------------------------------------------

function getPackageSettings(
  center: CenterSettings
): PackageSettings {
  return (
    center.sessionPackageSettings ??
    DEFAULT_SETTINGS
  );
}

function formatPrice(priceCents: number): string {
  return (priceCents / 100).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });
}

function centsToInput(priceCents: number): string {
  if (priceCents <= 0) {
    return '';
  }

  return (priceCents / 100)
    .toFixed(2)
    .replace('.', ',');
}

function parsePriceInput(value: string): number | null {
  const normalized = value
    .trim()
    .replace(',', '.');

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [euros, decimals = ''] = normalized.split('.');

  const euroAmount = Number(euros);

  if (!Number.isSafeInteger(euroAmount)) {
    return null;
  }

  const cents =
    euroAmount * 100 +
    Number(decimals.padEnd(2, '0'));

  if (
    !Number.isSafeInteger(cents) ||
    cents < 0 ||
    cents > 10000000
  ) {
    return null;
  }

  return cents;
}

// --------------------------------------------------
// PANTALLA PRINCIPAL
// --------------------------------------------------

export default function CenterSessionPackagesScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const { center } =
    route.params as SessionPackagesRouteParams;

  const initialSettings = getPackageSettings(center);

  // --------------------------------------------------
  // ESTADOS
  // --------------------------------------------------

  const [enabled, setEnabled] = useState(
    initialSettings.enabled
  );
  const [sessionsInput, setSessionsInput] = useState(
  String(initialSettings.sessionsPerPackage)
);

  const [priceInput, setPriceInput] = useState(
    centsToInput(initialSettings.priceCents)
  );

  const [savedSettings, setSavedSettings] =
    useState<PackageSettings>(initialSettings);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // --------------------------------------------------
  // APLICAR CONFIGURACIÓN
  // --------------------------------------------------

  const applySettings = useCallback(
    (updatedCenter: CenterSettings) => {
      const settings = getPackageSettings(updatedCenter);

      setEnabled(settings.enabled);

      setPriceInput(
        centsToInput(settings.priceCents)
      );
      setSessionsInput(
        String(settings.sessionsPerPackage)
      );

      setSavedSettings({ ...settings });
    },
    []
  );

  // --------------------------------------------------
  // RECARGAR AL ENTRAR
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
            '[CenterSessionPackagesScreen] Error cargando bonos:',
            error
          );

          if (active) {
            Alert.alert(
              'Error de conexión',
              'No se ha podido cargar la configuración de bonos.'
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
  // DETECTAR CAMBIOS
  // --------------------------------------------------

  const parsedPrice = parsePriceInput(priceInput);

  const hasChanges =
  enabled !== savedSettings.enabled ||
  sessionsInput !== String(savedSettings.sessionsPerPackage) ||
    (
      parsedPrice !== null
        ? parsedPrice !== savedSettings.priceCents
        : priceInput.trim() !==
          centsToInput(savedSettings.priceCents)
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
    const sessionsPerPackage =
  Number(sessionsInput);

if (
  !/^\d+$/.test(sessionsInput.trim()) ||
  !Number.isInteger(sessionsPerPackage) ||
  sessionsPerPackage < 1 ||
  sessionsPerPackage > 100
) {
  Alert.alert(
    'Número de sesiones incorrecto',
    'Introduce un número de sesiones entre 1 y 100.'
  );

  return;
}

    if (parsedPrice === null) {
      Alert.alert(
        'Precio incorrecto',
        'Introduce un precio válido. Por ejemplo: 350 o 350,00.'
      );

      return;
    }

    if (enabled && parsedPrice === 0) {
      Alert.alert(
        'Precio obligatorio',
        'Debes establecer un precio mayor que cero para activar los bonos.'
      );

      return;
    }

    try {
      setSaving(true);

      await updateCenterSettings({
  section: 'sessionPackages',
  data: {
    enabled,
    sessionsPerPackage,
    priceCents: parsedPrice,
  },
});

      const updatedCenter =
        await getCenterSettings();

      applySettings(updatedCenter);

      Alert.alert(
        'Cambios guardados',
        'La configuración de bonos se ha actualizado correctamente.'
      );
    } catch (error) {
      console.error(
        '[CenterSessionPackagesScreen] Error guardando bonos:',
        error
      );

      Alert.alert(
        'Error al guardar',
        'No se ha podido guardar la configuración de bonos. Inténtalo de nuevo.'
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
          Bonos de sesiones
        </Text>
      </View>

      {/* CONTENIDO */}

      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
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
              name="ticket-outline"
              size={26}
              color={colors.primary}
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Bonos de fisioterapia
            </Text>

            <Text style={styles.infoDescription}>
              Configura el precio y la disponibilidad
              de los bonos de sesiones para tus pacientes.
            </Text>
          </View>
        </View>

        {/* ACTIVACIÓN */}

        <Text style={styles.sectionTitle}>
          DISPONIBILIDAD
        </Text>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>
                Activar venta de bonos
              </Text>

              <Text style={styles.settingDescription}>
                Permite asignar nuevos bonos de sesiones
                a los pacientes que hayan realizado el pago.
              </Text>
            </View>

            <Switch
              value={enabled}
              onValueChange={setEnabled}
              disabled={controlsDisabled}
              trackColor={{
                false: colors.surfaceBorder,
                true: colors.primary,
              }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* CARACTERÍSTICAS */}

        <Text style={styles.sectionTitle}>
          CARACTERÍSTICAS DEL BONO
        </Text>

        <View style={styles.card}>
          <View style={styles.detailRow}>
            <Ionicons
              name="layers-outline"
              size={22}
              color={colors.primary}
            />

            <View style={styles.detailContent}>
              <Text style={styles.settingTitle}>
                Número de sesiones
              </Text>

              <Text style={styles.settingDescription}>
                Indica cuántas sesiones incluirá cada bono nuevo.
              </Text>

              <TextInput
                style={styles.sessionsInput}
                value={sessionsInput}
                onChangeText={setSessionsInput}
                keyboardType="number-pad"
                maxLength={3}
                editable={!controlsDisabled}
                placeholder="10"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.detailRow}>
            <Ionicons
              name="infinite-outline"
              size={22}
              color={colors.primary}
            />

            <View style={styles.detailContent}>
              <Text style={styles.settingTitle}>
                Sin fecha de caducidad
              </Text>

              <Text style={styles.settingDescription}>
                Los pacientes podrán utilizar sus sesiones
                cuando lo necesiten, sin límite de tiempo.
              </Text>
            </View>
          </View>
        </View>

        {/* PRECIO */}

        <Text style={styles.sectionTitle}>
          PRECIO DEL BONO
        </Text>

        <View style={styles.card}>
          <Text style={styles.settingTitle}>
            Precio único
          </Text>

          <Text style={styles.settingDescription}>
            Este importe será el mismo para todos los
            pacientes que compren un bono nuevo.
          </Text>

          <View style={styles.priceInputContainer}>
            <TextInput
              style={styles.priceInput}
              value={priceInput}
              onChangeText={setPriceInput}
              placeholder="Ej. 350,00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              editable={!controlsDisabled}
              maxLength={12}
            />

            <Text style={styles.currencyLabel}>
              €
            </Text>
          </View>

          <Text style={styles.priceHint}>
            {parsedPrice !== null && parsedPrice > 0
              ? `Precio configurado: ${formatPrice(parsedPrice)}`
              : 'Introduce el precio del bono en euros.'}
          </Text>
        </View>

        {/* INFORMACIÓN ECONÓMICA */}

        <View style={styles.helpCard}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color={colors.primary}
          />

          <Text style={styles.helpText}>
            Cuando Montse active un bono pagado para un
            paciente, su importe se registrará como ingreso.
            El uso posterior de las sesiones no generará
            ingresos adicionales.
          </Text>
        </View>

        {/* INFORMACIÓN SOBRE BONOS EXISTENTES */}

        <View style={styles.helpCard}>
          <Ionicons
            name="shield-checkmark-outline"
            size={21}
            color={colors.primary}
          />

          <Text style={styles.helpText}>
            Cambiar el precio o desactivar la venta
            no modificará los bonos que los pacientes
            ya hayan adquirido.
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
          onPress={() => void handleSave()}
          disabled={!canSave}
        >
          {saving ? (
            <>
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

              <Text style={styles.saveButtonText}>
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

              <Text style={styles.saveButtonText}>
                Guardar cambios
              </Text>
            </>
          )}
        </Pressable>

        <Text style={styles.footerHint}>
          {loading
            ? 'Cargando configuración...'
            : saving
              ? 'Actualizando configuración...'
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

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  detailContent: {
    flex: 1,
  },

  separator: {
    height: 1,
    backgroundColor: colors.surfaceBorder,
    marginVertical: 16,
  },

  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    marginTop: 18,
    paddingHorizontal: 14,
  },

  priceInput: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: colors.text,
    paddingVertical: 15,
  },

  currencyLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: colors.primary,
  },

  priceHint: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 10,
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
  sessionsInput: {
  borderWidth: 1,
  borderColor: colors.surfaceBorder,
  borderRadius: 12,
  backgroundColor: colors.surfaceMuted,
  paddingHorizontal: 14,
  paddingVertical: 12,
  marginTop: 12,
  fontFamily: 'PlusJakartaSans_600SemiBold',
  fontSize: 18,
  color: colors.text,
  minWidth: 90,
  alignSelf: 'flex-start',
},
});