import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CenterClient,
  updateCenterClient,
} from '../../services/clients';

import { colors } from '../../theme/colors';

interface Props {
  visible: boolean;
  client: CenterClient | null;
  onClose: () => void;
  onUpdated: (clientId: string) => void;
}

export default function EditPatientModal({
  visible,
  client,
  onClose,
  onUpdated,
}: Props) {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [saving, setSaving] = useState(false);

  // Cargar los datos del paciente al abrir el formulario.
  useEffect(() => {
    if (visible && client) {
      setName(client.name);
      setSurname(client.surname);
      setPhone(client.phone);
      setEmail(client.email);
    }
  }, [visible, client?.id]);

  const handleClose = () => {
    if (saving) return;

    onClose();
  };

  const handleSave = async () => {
    if (!client || saving) return;

    const normalizedName = name.trim();
    const normalizedSurname = surname.trim();
    const normalizedPhone = phone.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (
      !normalizedName ||
      !normalizedSurname ||
      !normalizedPhone
    ) {
      Alert.alert(
        'Campos obligatorios',
        'Introduce el nombre, los apellidos y el teléfono del paciente.'
      );
      return;
    }

    if (
      !/^\+?[0-9\s()-]{7,30}$/.test(normalizedPhone)
    ) {
      Alert.alert(
        'Teléfono incorrecto',
        'Introduce un número de teléfono válido.'
      );
      return;
    }

    if (
      normalizedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      Alert.alert(
        'Correo electrónico incorrecto',
        'Introduce un correo electrónico válido.'
      );
      return;
    }

    try {
      setSaving(true);

      await updateCenterClient({
        clientId: client.id,
        name: normalizedName,
        surname: normalizedSurname,
        phone: normalizedPhone,
        email: normalizedEmail,
      });

      Alert.alert(
        'Paciente actualizado',
        'Los datos del paciente se han guardado correctamente.',
        [
          {
            text: 'Aceptar',
            onPress: () => {
              onClose();
              onUpdated(client.id);
            },
          },
        ]
      );
    } catch (error) {
      console.error(
        'Error actualizando paciente:',
        error
      );

      Alert.alert(
        'Error',
        'No se han podido guardar los cambios. Inténtalo de nuevo.'
      );
    } finally {
      setSaving(false);
    }
  };

  const renderField = (
    label: string,
    value: string,
    onChangeText: (value: string) => void,
    placeholder: string,
    required = false,
    keyboardType:
      | 'default'
      | 'phone-pad'
      | 'email-address' = 'default'
  ) => (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required && (
          <Text style={styles.required}> *</Text>
        )}
      </Text>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={
          keyboardType === 'email-address'
            ? 'none'
            : 'words'
        }
        autoCorrect={false}
        editable={!saving}
      />
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: Math.max(insets.top, 20),
              paddingBottom: Math.max(insets.bottom, 24),
            },
          ]}
        >
          {/* CABECERA */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>
                DIRECTORIO CLÍNICO
              </Text>

              <Text style={styles.title}>
                Editar paciente
              </Text>
            </View>

            <Pressable
              onPress={handleClose}
              disabled={saving}
              accessibilityLabel="Cerrar"
              style={styles.closeButton}
            >
              <Ionicons
                name="close"
                size={23}
                color={colors.primary}
              />
            </Pressable>
          </View>

          <Text style={styles.description}>
            Modifica los datos personales del paciente.
            Sus citas, bonos e historial se conservarán.
          </Text>

          {/* FORMULARIO */}
          <View style={styles.formCard}>
            {renderField(
              'Nombre',
              name,
              setName,
              'Nombre del paciente',
              true
            )}

            {renderField(
              'Apellidos',
              surname,
              setSurname,
              'Apellidos del paciente',
              true
            )}

            {renderField(
              'Teléfono',
              phone,
              setPhone,
              'Número de teléfono',
              true,
              'phone-pad'
            )}

            {renderField(
              'Correo electrónico',
              email,
              setEmail,
              'Correo electrónico (opcional)',
              false,
              'email-address'
            )}
          </View>

          {/* INFORMACIÓN */}
          <View style={styles.infoCard}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color={colors.secondary}
            />

            <Text style={styles.infoText}>
              Estos cambios solo afectan a la ficha
              administrativa del paciente. Si tiene
              una cuenta vinculada, su correo de
              acceso no se modificará.
            </Text>
          </View>

          {/* GUARDAR */}
          <Pressable
            style={[
              styles.primaryButton,
              saving && styles.disabledButton,
            ]}
            onPress={() => void handleSave()}
            disabled={saving || !client}
          >
            {saving ? (
              <ActivityIndicator
                color={colors.white}
              />
            ) : (
              <>
                <Ionicons
                  name="save-outline"
                  size={19}
                  color={colors.white}
                />

                <Text style={styles.primaryButtonText}>
                  Guardar cambios
                </Text>
              </>
            )}
          </Pressable>

          {/* CANCELAR */}
          <Pressable
            style={styles.secondaryButton}
            onPress={handleClose}
            disabled={saving}
          >
            <Text style={styles.secondaryButtonText}>
              Cancelar
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    paddingHorizontal: 22,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  headerText: {
    flex: 1,
  },

  eyebrow: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.secondary,
    marginBottom: 8,
  },

  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 25,
    color: colors.text,
  },

  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  description: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    lineHeight: 21,
    color: colors.textSecondary,
    marginBottom: 20,
  },

  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
  },

  field: {
    marginBottom: 18,
  },

  label: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.text,
    marginBottom: 9,
  },

  required: {
    color: colors.error,
  },

  input: {
    height: 52,
    borderRadius: 13,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: colors.text,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 15,
    borderRadius: 16,
    backgroundColor: colors.secondaryContainer,
    marginTop: 20,
    marginBottom: 24,
  },

  infoText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 19,
    color: colors.text,
  },

  primaryButton: {
    minHeight: 54,
    backgroundColor: colors.primary,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 20,
  },

  primaryButtonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: colors.white,
  },

  disabledButton: {
    opacity: 0.6,
  },

  secondaryButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  secondaryButtonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },
});