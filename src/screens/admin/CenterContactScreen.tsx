import React, { useCallback, useState } from 'react';
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
  type CenterContact,
  type CenterSettings,
} from '../../services/centers';

type ContactRouteParams = {
  center: CenterSettings;
};

type ContactFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  autoCapitalize?: React.ComponentProps<typeof TextInput>['autoCapitalize'];
  editable?: boolean;
};

function ContactField({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  keyboardType = 'default',
  autoCapitalize = 'none',
  editable = true,
}: ContactFieldProps) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.inputContainer}>
        <Ionicons
          name={icon}
          size={20}
          color={colors.textMuted}
          style={styles.inputIcon}
        />

        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          maxLength={200}
          editable={editable}
        />
      </View>
    </View>
  );
}

export default function CenterContactScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const { center } = route.params as ContactRouteParams;

  const [phone, setPhone] = useState(center.contact.phone ?? '');
  const [mobile, setMobile] = useState(center.contact.mobile ?? '');
  const [whatsapp, setWhatsapp] = useState(
    center.contact.whatsapp ?? ''
  );
  const [email, setEmail] = useState(center.contact.email ?? '');
  const [website, setWebsite] = useState(
    center.contact.website ?? ''
  );

  const [savedContact, setSavedContact] = useState<CenterContact>({
    ...center.contact,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /**
   * Actualiza los campos del formulario y la referencia
   * de los últimos valores confirmados por Firebase.
   */
  const applyContact = useCallback((contact: CenterContact) => {
    setPhone(contact.phone ?? '');
    setMobile(contact.mobile ?? '');
    setWhatsapp(contact.whatsapp ?? '');
    setEmail(contact.email ?? '');
    setWebsite(contact.website ?? '');

    setSavedContact({ ...contact });
  }, []);

  /**
   * Recupera la información actualizada cada vez
   * que la pantalla recibe el foco.
   */
  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadContact = async () => {
        try {
          setLoading(true);

          const updatedCenter = await getCenterSettings();

          if (!active) return;

          applyContact(updatedCenter.contact);
        } catch (error) {
          console.error(
            '[CenterContactScreen] Error cargando contacto:',
            error
          );

          if (active) {
            Alert.alert(
              'Error de conexión',
              'No se ha podido actualizar la información de contacto.'
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      void loadContact();

      return () => {
        active = false;
      };
    }, [applyContact])
  );

  const hasChanges =
    phone !== savedContact.phone ||
    mobile !== savedContact.mobile ||
    whatsapp !== savedContact.whatsapp ||
    email !== savedContact.email ||
    website !== savedContact.website;

  const canSave = hasChanges && !loading && !saving;

  /**
   * Comprueba los números de teléfono.
   * Permite espacios, prefijo internacional,
   * paréntesis y guiones.
   */
  const isValidPhone = (value: string): boolean => {
    if (!value.trim()) return true;

    const normalized = value.trim();

    if (!/^\+?[0-9\s()-]+$/.test(normalized)) {
      return false;
    }

    const digits = normalized.replace(/\D/g, '');

    return digits.length >= 9 && digits.length <= 15;
  };

  /**
   * Comprueba el formato básico del correo electrónico.
   */
  const isValidEmail = (value: string): boolean => {
    if (!value.trim()) return true;

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  /**
   * Comprueba que la URL utiliza HTTP o HTTPS.
   */
  const isValidWebsite = (value: string): boolean => {
    if (!value.trim()) return true;

    try {
      const url = new URL(value.trim());

      return (
        ['https:', 'http:'].includes(url.protocol) &&
        Boolean(url.hostname)
      );
    } catch {
      return false;
    }
  };

  /**
   * Guarda la información de contacto mediante
   * la Cloud Function updateCenterSettings.
   */
  const handleSave = async () => {
    if (!canSave) return;

    const data: CenterContact = {
      phone: phone.trim(),
      mobile: mobile.trim(),
      whatsapp: whatsapp.trim(),
      email: email.trim(),
      website: website.trim(),
    };

    if (!isValidPhone(data.phone)) {
      Alert.alert(
        'Teléfono incorrecto',
        'Introduce un número de teléfono fijo válido.'
      );
      return;
    }

    if (!isValidPhone(data.mobile)) {
      Alert.alert(
        'Móvil incorrecto',
        'Introduce un número de teléfono móvil válido.'
      );
      return;
    }

    if (!isValidPhone(data.whatsapp)) {
      Alert.alert(
        'WhatsApp incorrecto',
        'Introduce un número de WhatsApp válido.'
      );
      return;
    }

    if (!isValidEmail(data.email)) {
      Alert.alert(
        'Correo incorrecto',
        'Introduce una dirección de correo electrónico válida.'
      );
      return;
    }

    if (!isValidWebsite(data.website)) {
      Alert.alert(
        'Página web incorrecta',
        'Introduce una dirección válida que comience por https:// o http://.'
      );
      return;
    }

    try {
      setSaving(true);

      await updateCenterSettings({
        section: 'contact',
        data,
      });

      // Confirmamos los valores almacenados en Firebase.
      const updatedCenter = await getCenterSettings();

      applyContact(updatedCenter.contact);

      Alert.alert(
        'Cambios guardados',
        'La información de contacto se ha actualizado correctamente.'
      );
    } catch (error) {
      console.error(
        '[CenterContactScreen] Error guardando contacto:',
        error
      );

      Alert.alert(
        'Error al guardar',
        'No se han podido guardar los cambios. Inténtalo de nuevo.'
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
          Contacto
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
              name="call-outline"
              size={26}
              color={colors.primary}
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Información de contacto
            </Text>

            <Text style={styles.infoDescription}>
              Configura los medios por los que los pacientes
              pueden contactar con tu centro.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          TELÉFONOS
        </Text>

        <ContactField
          label="Teléfono fijo"
          value={phone}
          onChangeText={setPhone}
          placeholder="Ej. 964 123 456"
          icon="call-outline"
          keyboardType="phone-pad"
          editable={!loading && !saving}
        />

        <ContactField
          label="Teléfono móvil"
          value={mobile}
          onChangeText={setMobile}
          placeholder="Ej. 600 123 456"
          icon="phone-portrait-outline"
          keyboardType="phone-pad"
          editable={!loading && !saving}
        />

        <ContactField
          label="WhatsApp"
          value={whatsapp}
          onChangeText={setWhatsapp}
          placeholder="Ej. +34 600 123 456"
          icon="logo-whatsapp"
          keyboardType="phone-pad"
          editable={!loading && !saving}
        />

        <Text style={styles.sectionTitle}>
          CONTACTO DIGITAL
        </Text>

        <ContactField
          label="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          placeholder="contacto@centro.com"
          icon="mail-outline"
          keyboardType="email-address"
          editable={!loading && !saving}
        />

        <ContactField
          label="Página web"
          value={website}
          onChangeText={setWebsite}
          placeholder="https://www.tucentro.com"
          icon="globe-outline"
          keyboardType="url"
          editable={!loading && !saving}
        />

        <View style={styles.helpCard}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={colors.primary}
          />

          <Text style={styles.helpText}>
            Esta información podrá mostrarse a los pacientes
            en la ficha pública del centro.
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
            ? 'Cargando información de contacto...'
            : saving
              ? 'Actualizando los datos de contacto...'
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
    marginBottom: 20,
  },

  label: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.text,
    marginBottom: 9,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 13,
    paddingHorizontal: 14,
  },

  inputIcon: {
    marginRight: 12,
  },

  input: {
    flex: 1,
    paddingVertical: 15,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: colors.text,
  },

  helpCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
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