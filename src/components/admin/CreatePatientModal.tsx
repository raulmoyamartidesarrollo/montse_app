import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createCenterClient } from '../../services/clients';
import { colors } from '../../theme/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (clientId: string) => void;
}

export default function CreatePatientModal({
  visible,
  onClose,
  onCreated,
}: Props) {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [saving, setSaving] = useState(false);
  const [linkingCode, setLinkingCode] = useState<string | null>(null);
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setSurname('');
    setPhone('');
    setEmail('');
    setLinkingCode(null);
    setCreatedClientId(null);
  };

  const handleClose = () => {
    if (saving) return;

    const clientId = createdClientId;

    resetForm();
    onClose();

    if (clientId) {
      onCreated(clientId);
    }
  };

  const handleSave = async () => {
    if (saving || linkingCode) return;

    if (!name.trim() || !surname.trim() || !phone.trim()) {
      Alert.alert(
        'Campos obligatorios',
        'Introduce el nombre, los apellidos y el teléfono del paciente.'
      );
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (
      normalizedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      Alert.alert(
        'Correo electrónico',
        'Introduce un correo electrónico válido.'
      );
      return;
    }

    try {
      setSaving(true);

      const result = await createCenterClient({
        name: name.trim(),
        surname: surname.trim(),
        phone: phone.trim(),
        email: normalizedEmail,
      });

      setCreatedClientId(result.clientId);
      setLinkingCode(result.linkingCode);
    } catch (error) {
      console.error('Error creando paciente:', error);

      Alert.alert(
        'No se ha podido completar el alta',
        'Comprueba el listado antes de volver a intentarlo. Es posible que la ficha se haya creado aunque no se haya recibido el código.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!linkingCode) return;

    try {
      await Share.share({
        message:
          `Hola ${name.trim()},\n\n` +
          `Tu centro de fisioterapia ya tiene preparada tu ficha.\n\n` +
          `Cuando esté disponible la vinculación de pacientes en la aplicación, podrás utilizar este código:\n\n` +
          `${linkingCode}\n\n` +
          `Guárdalo y no lo compartas con otras personas.`,
      });
    } catch (error) {
      console.error('Error compartiendo código:', error);
      Alert.alert('Error', 'No se ha podido compartir el código.');
    }
  };

  const renderField = (
    label: string,
    value: string,
    onChangeText: (value: string) => void,
    placeholder: string,
    required = false,
    keyboardType: 'default' | 'phone-pad' | 'email-address' = 'default'
  ) => (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>DIRECTORIO CLÍNICO</Text>

              <Text style={styles.title}>
                {linkingCode ? 'Paciente creado' : 'Nuevo paciente'}
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

          {linkingCode ? (
            <View style={styles.successCard}>
              <View style={styles.successIcon}>
                <Ionicons
                  name="checkmark-circle"
                  size={50}
                  color={colors.secondary}
                />
              </View>

              <Text style={styles.successTitle}>
                Ficha creada correctamente
              </Text>

              <Text style={styles.successDescription}>
                {name.trim()} {surname.trim()} ya figura en el directorio.
              </Text>

              <View style={styles.codeCard}>
                <Text style={styles.codeLabel}>
                  CÓDIGO DE VINCULACIÓN
                </Text>

                <Text selectable style={styles.code}>
                  {linkingCode}
                </Text>

                <Text style={styles.codeHelp}>
                  Este código permitirá asociar la cuenta del paciente
                  con su ficha cuando implementemos la vinculación.
                </Text>
              </View>

              <Pressable
                style={styles.primaryButton}
                onPress={() => void handleShare()}
              >
                <Ionicons
                  name="share-social-outline"
                  size={19}
                  color={colors.white}
                />

                <Text style={styles.primaryButtonText}>
                  Compartir código
                </Text>
              </Pressable>

              <Pressable
                style={styles.secondaryButton}
                onPress={handleClose}
              >
                <Text style={styles.secondaryButtonText}>
                  Volver a pacientes
                </Text>
              </Pressable>

              <Text style={styles.warning}>
                Conserva el código antes de cerrar esta pantalla.
                Por seguridad, no se almacena en texto legible.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.description}>
                Registra a un paciente para gestionar sus próximas
                citas y sesiones.
              </Text>

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

              <View style={styles.infoCard}>
                <Ionicons
                  name="information-circle-outline"
                  size={22}
                  color={colors.secondary}
                />

                <Text style={styles.infoText}>
                  Se creará una ficha administrativa, no una cuenta
                  de acceso. El paciente podrá vincular su cuenta
                  posteriormente mediante un código.
                </Text>
              </View>

              <Pressable
                style={[
                  styles.primaryButton,
                  saving && styles.disabledButton,
                ]}
                onPress={() => void handleSave()}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Ionicons
                      name="person-add-outline"
                      size={19}
                      color={colors.white}
                    />

                    <Text style={styles.primaryButtonText}>
                      Guardar paciente
                    </Text>
                  </>
                )}
              </Pressable>
            </>
          )}
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
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 12,
  },
  successTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 19,
    color: colors.text,
    textAlign: 'center',
  },
  successDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  codeCard: {
    width: '100%',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginVertical: 24,
  },
  codeLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: colors.secondary,
    letterSpacing: 1,
    marginBottom: 12,
  },
  code: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: colors.primary,
    textAlign: 'center',
  },
  codeHelp: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 14,
  },
  warning: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 18,
  },
});