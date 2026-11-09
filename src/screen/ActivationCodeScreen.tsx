import React, { useState } from 'react';

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { colors } from '../theme/colors';
import { FirebaseError } from 'firebase/app';

import {
  activateAccountWithCode,
  completeActivationOnboarding,
} from '../services/users';

type ActivationTab = 'has-code' | 'no-code';

type ActivationStatus =
  | 'idle'
  | 'loading'
  | 'invalid'
  | 'success';

type Props = {
  onContinueWithoutCode: () => void | Promise<void>;
  onActivationSuccess?: () => void | Promise<void>;
  onBack?: () => void;
};

export default function ActivationCodeScreen({
  onContinueWithoutCode,
  onActivationSuccess,
  onBack,
}: Props) {
  const [activeTab, setActiveTab] =
    useState<ActivationTab>('has-code');

  const [code, setCode] = useState('');

  const [status, setStatus] =
    useState<ActivationStatus>('idle');
const [errorMessage, setErrorMessage] = useState('');
  const handleActivate = async () => {
  if (status === 'loading') {
    return;
  }

  if (!code.trim()) {
    setErrorMessage('Introduce tu código de activación.');
    setStatus('invalid');
    return;
  }

  setStatus('loading');
  setErrorMessage('');

  try {
    await activateAccountWithCode(code.trim());

    setStatus('success');

    // La navegación se gestionará desde App.tsx.
    await onActivationSuccess?.();
  } catch (error) {
    let message =
      'No hemos podido activar tu cuenta. Inténtalo de nuevo.';

    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'functions/unauthenticated':
          message = 'Debes iniciar sesión para activar tu cuenta.';
          break;

        case 'functions/invalid-argument':
        case 'functions/permission-denied':
          message = 'El código no es válido o ya ha sido utilizado.';
          break;

        case 'functions/resource-exhausted':
          message =
            'Has alcanzado el límite de intentos. Inténtalo más tarde.';
          break;

        case 'functions/failed-precondition':
          message =
            error.message ||
            'Comprueba que tu cuenta está registrada y el correo verificado.';
          break;

        case 'functions/not-found':
          message =
            'El servicio de activación todavía no está disponible.';
          break;

        case 'functions/unavailable':
          message =
            'No podemos conectar con el servidor. Comprueba tu conexión.';
          break;
      }
    }

    setErrorMessage(message);
    setStatus('invalid');
  }
};
const handleContinueWithoutCode = async () => {
  if (status === 'loading') {
    return;
  }

  setStatus('loading');
  setErrorMessage('');

  try {
    await completeActivationOnboarding();

    setStatus('success');

    // App.tsx decidirá qué pantalla mostrar.
    await onContinueWithoutCode();
  } catch (error) {
    let message =
      'No hemos podido continuar. Inténtalo de nuevo.';

    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'functions/unauthenticated':
          message = 'Debes iniciar sesión para continuar.';
          break;

        case 'functions/failed-precondition':
          message =
            'No encontramos tu perfil. Intenta iniciar sesión nuevamente.';
          break;

        case 'functions/not-found':
          message =
            'El servicio todavía no está disponible.';
          break;

        case 'functions/unavailable':
          message =
            'No podemos conectar con el servidor. Comprueba tu conexión.';
          break;
      }
    }

    setErrorMessage(message);
    setStatus('invalid');
  }
};
  const changeTab = (tab: ActivationTab) => {
  if (status === 'loading') {
    return;
  }

  setActiveTab(tab);
  setStatus('idle');
  setErrorMessage('');
};

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* CABECERA */}

         <View style={styles.header}>
  {onBack && (
    <Pressable
      onPress={onBack}
      style={styles.backButton}
      accessibilityRole="button"
      accessibilityLabel="Volver a la pantalla anterior"
      hitSlop={12}
    >
      <Ionicons
        name="arrow-back"
        size={24}
        color={colors.text}
      />
    </Pressable>
  )}

  <Text style={styles.headerTitle}>
    Activación de cuenta
  </Text>
</View>

          {/* CONTEXTO */}

          <View style={styles.breadcrumb}>
            <Ionicons
              name="person-circle-outline"
              size={17}
              color={colors.textSecondary}
            />

            <Text style={styles.breadcrumbText}>
              Mi perfil
            </Text>

            <Ionicons
              name="chevron-forward"
              size={13}
              color={colors.textMuted}
            />

            <Text style={styles.breadcrumbCurrent}>
              Código de activación
            </Text>
          </View>

          {/* TARJETA PRINCIPAL */}

          <View style={styles.heroCard}>
            <View style={styles.iconCircle}>
              <Ionicons
                name="key"
                size={30}
                color={colors.primary}
              />
            </View>

            <Text style={styles.heroTitle}>
              ¿Tienes un código de activación?
            </Text>

            <Text style={styles.heroDescription}>
              Si nuestra clínica te ha facilitado un código,
              introdúcelo para vincular tu cuenta.
              {'\n\n'}
              Si eres un paciente nuevo, puedes continuar
              sin necesidad de introducir ninguno.
            </Text>

            <View style={styles.securityBadge}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={colors.secondary}
              />

              <Text style={styles.securityText}>
                Activación segura de cuenta
              </Text>
            </View>
          </View>

          {/* SELECTOR */}

          <View style={styles.tabContainer}>
            <Pressable
              style={[
                styles.tab,
                activeTab === 'has-code' && styles.activeTab,
              ]}
              onPress={() => changeTab('has-code')}
            >
              <Ionicons
                name="key-outline"
                size={18}
                color={
                  activeTab === 'has-code'
                    ? colors.primary
                    : colors.textSecondary
                }
              />

              <Text
                style={[
                  styles.tabText,
                  activeTab === 'has-code' &&
                    styles.activeTabText,
                ]}
              >
                Tengo código
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.tab,
                activeTab === 'no-code' && styles.activeTab,
              ]}
              onPress={() => changeTab('no-code')}
            >
              <Ionicons
                name="help-circle-outline"
                size={19}
                color={
                  activeTab === 'no-code'
                    ? colors.primary
                    : colors.textSecondary
                }
              />

              <Text
                style={[
                  styles.tabText,
                  activeTab === 'no-code' &&
                    styles.activeTabText,
                ]}
              >
                No tengo código
              </Text>
            </Pressable>
          </View>

          {/* TENGO CÓDIGO */}

          {activeTab === 'has-code' && (
            <View style={styles.formCard}>
              <Text style={styles.fieldLabel}>
                Código de activación
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="key-outline"
                  size={19}
                  color={colors.textMuted}
                />

                <TextInput
                  style={styles.input}
                  value={code}
                  onChangeText={(value) => {
                    setCode(value.toUpperCase());
                    setStatus('idle');
                  }}
                  placeholder="Introduce o pega tu código"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoComplete="off"
                />
              </View>

              <Text style={styles.helperText}>
                Introduce el código completo que te
                haya facilitado la clínica.
              </Text>

              {status === 'invalid' && (
                <View style={styles.errorBox}>
                    <Ionicons
                    name="alert-circle-outline"
                    size={21}
                    color="#BA1A1A"
                    />

                    <Text style={styles.errorText}>
                    {errorMessage}
                    </Text>
                </View>
                )}

              {status === 'success' && (
                <View style={styles.successBox}>
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={colors.secondary}
                  />

                  <Text style={styles.successText}>
                    ¡Cuenta activada correctamente!
                  </Text>
                </View>
              )}

              <Pressable
                onPress={handleActivate}
                disabled={status === 'loading'}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                {status === 'loading' ? (
                  <ActivityIndicator
                    color={colors.onPrimary}
                  />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>
                      Activar cuenta
                    </Text>

                    <Ionicons
                      name="checkmark-circle-outline"
                      size={21}
                      color={colors.onPrimary}
                    />
                  </>
                )}
              </Pressable>
            </View>
          )}

          {/* NO TENGO CÓDIGO */}

          {activeTab === 'no-code' && (
            <View style={styles.formCard}>
              <View style={styles.infoHeader}>
                <Ionicons
                  name="information-circle-outline"
                  size={27}
                  color={colors.secondary}
                />

                <Text style={styles.infoTitle}>
                  ¿No tienes código? No pasa nada.
                </Text>
              </View>

              <View style={styles.infoCard}>
                <Ionicons
                  name="medkit-outline"
                  size={22}
                  color={colors.primary}
                />

                <View style={styles.infoContent}>
                  <Text style={styles.infoCardTitle}>
                    ¿Eres paciente nuevo?
                  </Text>

                  <Text style={styles.infoDescription}>
                    Puedes reservar tu primera cita
                    sin ningún código de activación.
                  </Text>
                </View>
              </View>

              <View style={styles.infoCard}>
                <Ionicons
                  name="people-outline"
                  size={22}
                  color={colors.secondary}
                />

                <View style={styles.infoContent}>
                  <Text style={styles.infoCardTitle}>
                    ¿Ya eras paciente?
                  </Text>

                  <Text style={styles.infoDescription}>
                    Podrás vincular tus citas anteriores
                    más adelante desde tu perfil,
                    cuando recibas tu código.
                  </Text>
                </View>
              </View>

              <Pressable
  onPress={handleContinueWithoutCode}
  disabled={status === 'loading'}
  style={({ pressed }) => [
    styles.primaryButton,
    pressed && styles.buttonPressed,
  ]}
>
  {status === 'loading' ? (
    <ActivityIndicator color={colors.onPrimary} />
  ) : (
    <>
      <Text style={styles.primaryButtonText}>
        Continuar sin código
      </Text>

      <Ionicons
        name="arrow-forward"
        size={20}
        color={colors.onPrimary}
      />
    </>
  )}
</Pressable>

{status === 'invalid' && (
  <View style={[styles.errorBox, { marginTop: 14 }]}>
    <Ionicons
      name="alert-circle-outline"
      size={21}
      color="#BA1A1A"
    />

    <Text style={styles.errorText}>
      {errorMessage}
    </Text>
  </View>
)}

              <Pressable
                onPress={() => changeTab('has-code')}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>
                  Ya tengo mi código, introducir ahora
                </Text>
              </Pressable>
            </View>
          )}

          {/* AYUDA */}

          <View style={styles.helpCard}>
            <View style={styles.helpHeader}>
              <Ionicons
                name="help-circle-outline"
                size={26}
                color={colors.primary}
              />

              <Text style={styles.helpTitle}>
                ¿Necesitas ayuda con tu código?
              </Text>
            </View>

            <Text style={styles.helpDescription}>
              Si ya has acudido a nuestra clínica,
              podrás solicitar un código de vinculación
              para recuperar tus citas anteriores
              cuando este servicio esté disponible.
            </Text>
          </View>

          {/* PIE */}

          <View style={styles.footer}>
            <Ionicons
              name="lock-closed-outline"
              size={15}
              color={colors.textMuted}
            />

            <Text style={styles.footerText}>
              Protegemos tus datos personales
              y tu privacidad.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },

  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  backButton: {
    width: 32,
    height: 44,
    justifyContent: 'center',
  },

  headerTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17,
    color: colors.text,
  },

  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 16,
  },

  breadcrumbText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
  },

  breadcrumbCurrent: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: colors.primary,
  },

  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    marginBottom: 22,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },

  iconCircle: {
    width: 65,
    height: 65,
    borderRadius: 33,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  heroTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 21,
    lineHeight: 29,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },

  heroDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    marginTop: 20,
  },

  securityText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    color: colors.textSecondary,
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 17,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },

  tab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  activeTab: {
    backgroundColor: colors.surface,
  },

  tabText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: colors.textSecondary,
  },

  activeTabText: {
    color: colors.primary,
  },

  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 22,
  },

  fieldLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.text,
    marginBottom: 12,
  },

  inputContainer: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 13,
    paddingHorizontal: 14,
  },

  input: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: colors.text,
    paddingVertical: 12,
  },

  helperText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 10,
    marginBottom: 20,
  },

  primaryButton: {
    minHeight: 52,
    backgroundColor: colors.primary,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 6,
  },

  primaryButtonText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: colors.onPrimary,
  },

  buttonPressed: {
    opacity: 0.85,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFdad6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 15,
  },

  errorText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 19,
    color: '#93000A',
  },

  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.secondaryContainer,
    borderRadius: 12,
    padding: 14,
    marginBottom: 15,
  },

  successText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: colors.secondary,
  },

  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },

  infoTitle: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: colors.text,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },

  infoContent: {
    flex: 1,
  },

  infoCardTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.text,
    marginBottom: 5,
  },

  infoDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
  },

  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },

  secondaryButtonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: colors.primary,
    textAlign: 'center',
  },

  helpCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 20,
    padding: 22,
    marginBottom: 22,
  },

  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },

  helpTitle: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: colors.text,
  },

  helpDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 20,
    color: colors.textSecondary,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  footerText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});