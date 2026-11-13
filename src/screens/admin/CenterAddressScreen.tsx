import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
  Alert,
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
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';
import {
  getCenterSettings,
  updateCenterSettings,
  type CenterAddress,
  type CenterSettings,
} from '../../services/centers';

type AddressRouteParams = {
  center: CenterSettings;
};

type AddressFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  editable?: boolean;
  keyboardType?: 'default' | 'number-pad';
};

function AddressField({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  keyboardType = 'default',
}: AddressFieldProps) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize="words"
        maxLength={150}
        editable={editable}
      />
    </View>
  );
}

export default function CenterAddressScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const { center } = route.params as AddressRouteParams;

  const address = center.address;

  const [street, setStreet] = useState(address.street ?? '');
  const [number, setNumber] = useState(address.number ?? '');
  const [floor, setFloor] = useState(address.floor ?? '');
  const [door, setDoor] = useState(address.door ?? '');
  const [postalCode, setPostalCode] = useState(address.postalCode ?? '');
  const [city, setCity] = useState(address.city ?? '');
  const [province, setProvince] = useState(address.province ?? '');
  const [country, setCountry] = useState(address.country ?? 'ES');
  const [savedAddress, setSavedAddress] = useState<CenterAddress>({
  ...address,
});

const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const applyAddress = useCallback((data: CenterAddress) => {
  setStreet(data.street ?? '');
  setNumber(data.number ?? '');
  setFloor(data.floor ?? '');
  setDoor(data.door ?? '');
  setPostalCode(data.postalCode ?? '');
  setCity(data.city ?? '');
  setProvince(data.province ?? '');
  setCountry(data.country ?? 'ES');

  setSavedAddress({ ...data });
}, []);

useFocusEffect(
  useCallback(() => {
    let active = true;

    const loadAddress = async () => {
      try {
        setLoading(true);

        const updatedCenter = await getCenterSettings();

        if (!active) return;

        applyAddress(updatedCenter.address);
      } catch (error) {
        console.error(
          '[CenterAddressScreen] Error cargando dirección:',
          error
        );

        if (active) {
          Alert.alert(
            'Error de conexión',
            'No se ha podido actualizar la dirección del centro.'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadAddress();

    return () => {
      active = false;
    };
  }, [applyAddress])
);

  const hasChanges =
  street !== savedAddress.street ||
  number !== savedAddress.number ||
  floor !== savedAddress.floor ||
  door !== savedAddress.door ||
  postalCode !== savedAddress.postalCode ||
  city !== savedAddress.city ||
  province !== savedAddress.province ||
  country !== savedAddress.country;

const canSave = hasChanges && !loading && !saving;

  const formattedAddress = useMemo(() => {
    const streetLine = [street, number]
      .filter(Boolean)
      .join(', ');

    const floorLine = [
      floor ? `Piso ${floor}` : '',
      door ? `Puerta ${door}` : '',
    ]
      .filter(Boolean)
      .join(', ');

    const cityLine = [postalCode, city]
      .filter(Boolean)
      .join(' ');

    return [
      streetLine,
      floorLine,
      cityLine,
      province,
      country,
    ]
      .filter(Boolean)
      .join('\n');
  }, [
    street,
    number,
    floor,
    door,
    postalCode,
    city,
    province,
    country,
  ]);
const handleSave = async () => {
  if (!canSave) return;

  const data = {
    street: street.trim(),
    number: number.trim(),
    floor: floor.trim(),
    door: door.trim(),
    postalCode: postalCode.trim(),
    city: city.trim(),
    province: province.trim(),
    country: country.trim().toUpperCase(),
  };

  // Código postal español: cinco dígitos.
  if (
    data.country === 'ES' &&
    data.postalCode &&
    !/^\d{5}$/.test(data.postalCode)
  ) {
    Alert.alert(
      'Código postal incorrecto',
      'El código postal español debe tener cinco dígitos.'
    );
    return;
  }

  // Código ISO 3166-1 alfa-2.
  if (
    data.country &&
    !/^[A-Z]{2}$/.test(data.country)
  ) {
    Alert.alert(
      'País incorrecto',
      'Introduce un código de país de dos letras, por ejemplo ES.'
    );
    return;
  }

  try {
    setSaving(true);

    await updateCenterSettings({
      section: 'address',
      data,
    });

    // Confirmamos los datos almacenados en Firebase.
    const updatedCenter = await getCenterSettings();

    applyAddress(updatedCenter.address);

    Alert.alert(
      'Cambios guardados',
      'La dirección del centro se ha actualizado correctamente.'
    );
  } catch (error) {
    console.error(
      '[CenterAddressScreen] Error guardando dirección:',
      error
    );

    Alert.alert(
      'Error al guardar',
      'No se ha podido guardar la dirección. Inténtalo de nuevo.'
    );
  } finally {
    setSaving(false);
  }
};
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 12 },
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
          Ubicación
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 30,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="location-outline"
              size={26}
              color={colors.primary}
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Dirección del centro
            </Text>

            <Text style={styles.infoDescription}>
              Indica dónde se encuentra tu clínica
              para facilitar la llegada de los pacientes.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          DIRECCIÓN
        </Text>

        <AddressField
            label="Calle"
            value={street}
            onChangeText={setStreet}
            placeholder="Ej. Calle Mayor"
            editable={!loading && !saving}
            />

        <View style={styles.row}>
          <View style={styles.halfField}>
            <AddressField
              label="Número"
              value={number}
              onChangeText={setNumber}
              placeholder="Ej. 25"
              editable={!loading && !saving}
            />
          </View>

          <View style={styles.halfField}>
            <AddressField
              label="Piso"
              value={floor}
              onChangeText={setFloor}
              placeholder="Ej. 1"
              editable={!loading && !saving}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <AddressField
              label="Puerta"
              value={door}
              onChangeText={setDoor}
              placeholder="Ej. A"
              editable={!loading && !saving}
            />
          </View>

          <View style={styles.halfField}>
            <AddressField
              label="Código postal"
              value={postalCode}
              onChangeText={setPostalCode}
              placeholder="Ej. 12001"
              keyboardType="number-pad"
              editable={!loading && !saving}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          LOCALIZACIÓN
        </Text>

        <AddressField
          label="Localidad"
          value={city}
          onChangeText={setCity}
          placeholder="Ej. Castellón de la Plana"
          editable={!loading && !saving}
        />

        <AddressField
          label="Provincia"
          value={province}
          onChangeText={setProvince}
          placeholder="Ej. Castellón"
          editable={!loading && !saving}
        />

        <AddressField
          label="País (código ISO)"
          value={country}
          onChangeText={setCountry}
          placeholder="ES"
          editable={!loading && !saving}
        />

        <Text style={styles.sectionTitle}>
          VISTA PREVIA
        </Text>

        <View style={styles.previewCard}>
          <Ionicons
            name="navigate-outline"
            size={22}
            color={colors.primary}
          />

          <Text style={styles.previewText}>
            {formattedAddress || 'Dirección sin configurar'}
          </Text>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, 16) + 70,
          },
        ]}
      >
        <Pressable
  style={[
    styles.saveButton,
    !canSave && styles.saveButtonDisabled,
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
    ? 'Cargando dirección del centro...'
    : saving
      ? 'Actualizando la dirección...'
      : hasChanges
        ? 'Tienes cambios pendientes de guardar.'
        : 'Todos los cambios están guardados.'}
</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

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
    fontSize: 20,
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
  fieldContainer: {
    flex: 1,
    marginBottom: 20,
  },
  label: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.text,
    marginBottom: 9,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 15,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  previewCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 18,
    gap: 14,
  },
  previewText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 21,
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