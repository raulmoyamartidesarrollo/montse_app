import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';
import {
  CenterSettings,
  getCenterSettings,
} from '../../services/centers';

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'url';
};

function FormField({
  label,
  value,
  onChangeText,
  multiline = false,
  keyboardType = 'default',
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        style={[
          styles.input,
          multiline && styles.multilineInput,
        ]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={
          keyboardType === 'email-address' || keyboardType === 'url'
            ? 'none'
            : 'sentences'
        }
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

export default function CenterSettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [center, setCenter] = useState<CenterSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCenter = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getCenterSettings();

      setCenter(data);
    } catch (err) {
      console.error('Error al cargar el centro:', err);

      setError(
        'No se ha podido recuperar la información del centro.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCenter();
  }, [loadCenter]);

  const updateField = (
    section: 'address' | 'contact' | 'socialMedia',
    field: string,
    value: string
  ) => {
    setCenter((previous) => {
      if (!previous) return previous;

      return {
        ...previous,
        [section]: {
          ...previous[section],
          [field]: value,
        },
      };
    });
  };

  const updateMainField = (
    field: 'name' | 'description',
    value: string
  ) => {
    setCenter((previous) =>
      previous
        ? {
            ...previous,
            [field]: value,
          }
        : previous
    );
  };

  const renderField = (
    label: string,
    section: 'address' | 'contact' | 'socialMedia',
    field: string,
    value: string,
    keyboardType: FieldProps['keyboardType'] = 'default'
  ) => (
    <FormField
      label={label}
      value={value}
      keyboardType={keyboardType}
      onChangeText={(text) => updateField(section, field, text)}
    />
  );

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 12 },
        ]}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.text}
          />
        </Pressable>

        <Text style={styles.headerTitle}>
          Datos del centro
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />
          <Text style={styles.loadingText}>
            Cargando información del centro...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons
            name="alert-circle-outline"
            size={42}
            color={colors.primary}
          />

          <Text style={styles.errorText}>{error}</Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => void loadCenter()}
          >
            <Text style={styles.retryText}>
              Reintentar
            </Text>
          </Pressable>
        </View>
      ) : center ? (
        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: insets.bottom + 120,
          }}
        >
          <Text style={styles.sectionTitle}>
            INFORMACIÓN GENERAL
          </Text>

          <FormField
            label="Nombre del centro"
            value={center.name}
            onChangeText={(text) =>
              updateMainField('name', text)
            }
          />

          <FormField
            label="Descripción"
            value={center.description}
            multiline
            onChangeText={(text) =>
              updateMainField('description', text)
            }
          />

          <Text style={styles.sectionTitle}>
            CONTACTO
          </Text>

          {renderField(
            'Teléfono',
            'contact',
            'phone',
            center.contact.phone,
            'phone-pad'
          )}

          {renderField(
            'Móvil',
            'contact',
            'mobile',
            center.contact.mobile,
            'phone-pad'
          )}

          {renderField(
            'WhatsApp',
            'contact',
            'whatsapp',
            center.contact.whatsapp,
            'phone-pad'
          )}

          {renderField(
            'Correo electrónico',
            'contact',
            'email',
            center.contact.email,
            'email-address'
          )}

          {renderField(
            'Página web',
            'contact',
            'website',
            center.contact.website,
            'url'
          )}

          <Text style={styles.sectionTitle}>
            DIRECCIÓN
          </Text>

          {renderField(
            'Calle',
            'address',
            'street',
            center.address.street
          )}

          {renderField(
            'Número',
            'address',
            'number',
            center.address.number
          )}

          {renderField(
            'Piso',
            'address',
            'floor',
            center.address.floor
          )}

          {renderField(
            'Puerta',
            'address',
            'door',
            center.address.door
          )}

          {renderField(
            'Código postal',
            'address',
            'postalCode',
            center.address.postalCode
          )}

          {renderField(
            'Localidad',
            'address',
            'city',
            center.address.city
          )}

          {renderField(
            'Provincia',
            'address',
            'province',
            center.address.province
          )}

          <Text style={styles.sectionTitle}>
            REDES SOCIALES
          </Text>

          {renderField(
            'Instagram',
            'socialMedia',
            'instagram',
            center.socialMedia.instagram
          )}

          {renderField(
            'Facebook',
            'socialMedia',
            'facebook',
            center.socialMedia.facebook
          )}

          {renderField(
            'TikTok',
            'socialMedia',
            'tiktok',
            center.socialMedia.tiktok
          )}

          {renderField(
            'YouTube',
            'socialMedia',
            'youtube',
            center.socialMedia.youtube
          )}

          {renderField(
            'LinkedIn',
            'socialMedia',
            'linkedin',
            center.socialMedia.linkedin
          )}

          {renderField(
            'X / Twitter',
            'socialMedia',
            'x',
            center.socialMedia.x
          )}

          <Pressable
            style={styles.saveButton}
            onPress={() =>
              Alert.alert(
                'Próximamente',
                'En el siguiente paso activaremos el guardado seguro en Firebase.'
              )
            }
          >
            <Ionicons
              name="save-outline"
              size={20}
              color="#FFFFFF"
            />

            <Text style={styles.saveButtonText}>
              Guardar cambios
            </Text>
          </Pressable>
        </ScrollView>
      ) : null}
    </View>
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

  sectionTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    letterSpacing: 1,
    color: colors.primary,
    marginTop: 26,
    marginBottom: 18,
  },

  field: {
    marginBottom: 18,
  },

  label: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.text,
    marginBottom: 8,
  },

  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: colors.text,
  },

  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  loadingText: {
    marginTop: 16,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: colors.textSecondary,
  },

  errorText: {
    marginTop: 16,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans_400Regular',
    color: colors.textSecondary,
    lineHeight: 22,
  },

  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },

  retryText: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },

  saveButton: {
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingVertical: 17,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
  },
});