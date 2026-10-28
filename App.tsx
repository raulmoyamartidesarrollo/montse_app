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
  useWindowDimensions,
  View,
} from 'react-native';

import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';

import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { colors } from './src/theme/colors';

type ScreenMode = 'login' | 'register' | 'forgot';

export default function App() {
  return (
    <SafeAreaProvider>
      <LoginScreen />
    </SafeAreaProvider>
  );
}

function LoginScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Altura útil disponible dentro de las zonas seguras del dispositivo.
  const availableHeight = Math.max(
    0,
    height - insets.top - insets.bottom
  );

  const isVeryShortScreen = availableHeight < 650;
  const isShortScreen = availableHeight < 750;
  const isCompact = width < 380;
  const isTablet = width >= 600;

  const horizontalPadding = isCompact ? 16 : 20;
  const contentMaxWidth = isTablet ? 440 : 480;

  const [mode, setMode] = useState<ScreenMode>('login');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading] = useState(false);
  const [message, setMessage] = useState('');

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  const styles = createStyles({
    horizontalPadding,
    contentMaxWidth,
    isCompact,
    isTablet,
    isShortScreen,
    isVeryShortScreen,
  });

  const resetFields = () => {
    setMessage('');
    setPassword('');
    setConfirmPassword('');
  };

  const changeMode = (newMode: ScreenMode) => {
    setMode(newMode);
    resetFields();
  };

  const handleSubmit = () => {
    setMessage('');

    if (!email.trim()) {
      setMessage('Introduce tu correo electrónico.');
      return;
    }

    if (mode === 'register' && !name.trim()) {
      setMessage('Introduce tu nombre completo.');
      return;
    }

    if (mode !== 'forgot' && !password) {
      setMessage('Introduce tu contraseña.');
      return;
    }

    if (mode === 'register' && password.length < 8) {
      setMessage('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setMessage('Las contraseñas no coinciden.');
      return;
    }

    if (mode === 'forgot') {
      setMessage(
        'La recuperación de contraseña estará disponible cuando conectemos Firebase.'
      );
      return;
    }

    setMessage(
      'La autenticación todavía no está conectada. El siguiente paso será configurar Firebase.'
    );
  };

  const handleSocialLogin = (provider: 'Google' | 'Apple') => {
    setMessage(
      `El acceso con ${provider} estará disponible cuando configuremos la autenticación.`
    );
  };

  const isForgot = mode === 'forgot';
  const isRegister = mode === 'register';

  const title = isForgot
    ? 'Recupera tu acceso'
    : isRegister
      ? 'Crea tu cuenta'
      : 'Tu bienestar empieza aquí';

  const subtitle = isForgot
    ? 'Te ayudaremos a recuperar el acceso a tu cuenta.'
    : isRegister
      ? 'Crea tu cuenta y empieza a cuidar de ti.'
      : 'Reserva tus sesiones de fisioterapia de forma sencilla.';

  const submitLabel = isForgot
    ? 'Recuperar contraseña'
    : isRegister
      ? 'Crear cuenta'
      : 'Iniciar sesión';

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'right', 'bottom', 'left']}
    >
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === 'ios' ? 'interactive' : 'on-drag'
          }
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentInsetAdjustmentBehavior="never"
        >
          <View style={styles.page}>
            <View style={styles.brand}>
              <View style={styles.logo}>
                <Ionicons
                  name="body-outline"
                  size={isVeryShortScreen ? 24 : 30}
                  color={colors.onPrimary}
                />
              </View>

              <Text style={styles.brandName}>MONTSE ÁLVAREZ</Text>

              <Text style={styles.brandCaption}>
                MOVIMIENTO · EQUILIBRIO · BIENESTAR
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.intro}>
                <View style={styles.welcomeBadge}>
                  <Ionicons
                    name="leaf-outline"
                    size={15}
                    color={colors.secondary}
                  />

                  <Text style={styles.welcomeBadgeText}>
                    TU BIENESTAR, A TU RITMO
                  </Text>
                </View>

                <Text style={styles.title}>{title}</Text>

                <Text style={styles.subtitle}>{subtitle}</Text>
              </View>

              {isRegister && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Nombre completo</Text>

                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="person-outline"
                      size={19}
                      color={colors.textMuted}
                    />

                    <TextInput
                      style={styles.input}
                      placeholder="Tu nombre y apellidos"
                      placeholderTextColor={colors.textMuted}
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                      autoComplete="name"
                      returnKeyType="next"
                    />
                  </View>
                </View>
              )}

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Correo electrónico</Text>

                <View style={styles.inputContainer}>
                  <Ionicons
                    name="mail-outline"
                    size={19}
                    color={colors.textMuted}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="nombre@ejemplo.com"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    returnKeyType="next"
                  />
                </View>
              </View>

              {!isForgot && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Contraseña</Text>

                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={19}
                      color={colors.textMuted}
                    />

                    <TextInput
                      style={styles.input}
                      placeholder="Mínimo 8 caracteres"
                      placeholderTextColor={colors.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoComplete={
                        isRegister ? 'new-password' : 'current-password'
                      }
                      returnKeyType={isRegister ? 'next' : 'done'}
                      onSubmitEditing={
                        isRegister ? undefined : handleSubmit
                      }
                    />

                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.iconButton}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showPassword
                          ? 'Ocultar contraseña'
                          : 'Mostrar contraseña'
                      }
                    >
                      <Ionicons
                        name={
                          showPassword ? 'eye-off-outline' : 'eye-outline'
                        }
                        size={20}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  </View>
                </View>
              )}

              {isRegister && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Repetir contraseña</Text>

                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={19}
                      color={colors.textMuted}
                    />

                    <TextInput
                      style={styles.input}
                      placeholder="Repite tu contraseña"
                      placeholderTextColor={colors.textMuted}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoComplete="new-password"
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
                    />

                    <Pressable
                      onPress={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      style={styles.iconButton}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showConfirmPassword
                          ? 'Ocultar contraseña'
                          : 'Mostrar contraseña'
                      }
                    >
                      <Ionicons
                        name={
                          showConfirmPassword
                            ? 'eye-off-outline'
                            : 'eye-outline'
                        }
                        size={20}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  </View>
                </View>
              )}

              {mode === 'login' && (
                <Pressable
                  onPress={() => changeMode('forgot')}
                  style={styles.forgotButton}
                >
                  <Text style={styles.forgotText}>
                    ¿Has olvidado tu contraseña?
                  </Text>
                </Pressable>
              )}

              {message !== '' && (
                <View style={styles.messageBox}>
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color={colors.secondary}
                  />

                  <Text style={styles.messageText}>{message}</Text>
                </View>
              )}

              <Pressable
                onPress={handleSubmit}
                disabled={loading}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                  loading && styles.buttonDisabled,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>
                      {submitLabel}
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={19}
                      color={colors.onPrimary}
                    />
                  </>
                )}
              </Pressable>

              {!isForgot && (
                <>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />

                    <Text style={styles.dividerText}>
                      O CONTINÚA CON
                    </Text>

                    <View style={styles.dividerLine} />
                  </View>

                  <View style={styles.socialButtons}>
                    <Pressable
                      onPress={() => handleSocialLogin('Google')}
                      style={({ pressed }) => [
                        styles.socialButton,
                        pressed && styles.socialButtonPressed,
                      ]}
                      accessibilityRole="button"
                    >
                      <Ionicons
                        name="logo-google"
                        size={19}
                        color={colors.text}
                      />

                      <Text style={styles.socialButtonText}>Google</Text>
                    </Pressable>

                   
                  </View>
                </>
              )}

              <View style={styles.footerAction}>
                <Text style={styles.footerActionText}>
                  {isForgot
                    ? '¿Recuerdas tu contraseña?'
                    : isRegister
                      ? '¿Ya tienes una cuenta?'
                      : '¿Todavía no tienes cuenta?'}
                </Text>

                <Pressable
                  onPress={() =>
                    changeMode(
                      isForgot || isRegister ? 'login' : 'register'
                    )
                  }
                  accessibilityRole="button"
                >
                  <Text style={styles.footerLink}>
                    {isForgot || isRegister
                      ? 'Iniciar sesión'
                      : 'Crear cuenta'}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.trustFooter}>
              <Ionicons
                name="heart-outline"
                size={16}
                color={colors.secondary}
              />

              <Text style={styles.trustText}>
                Un espacio pensado para cuidar de ti.
              </Text>
            </View>

            <Text style={styles.legalText}>
              Al continuar, aceptas nuestros términos de uso y política de
              privacidad.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type LayoutOptions = {
  horizontalPadding: number;
  contentMaxWidth: number;
  isCompact: boolean;
  isTablet: boolean;
  isShortScreen: boolean;
  isVeryShortScreen: boolean;
};

function createStyles({
  horizontalPadding,
  contentMaxWidth,
  isCompact,
  isTablet,
  isShortScreen,
  isVeryShortScreen,
}: LayoutOptions) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },

    keyboardContainer: {
      flex: 1,
      minHeight: 0,
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      flexGrow: 1,
      justifyContent: 'flex-start',
    },

    page: {
      width: '100%',
      maxWidth: isTablet ? 760 : undefined,
      alignSelf: 'center',
      paddingHorizontal: horizontalPadding,
      paddingTop: isVeryShortScreen ? 6 : isShortScreen ? 10 : 20,
      paddingBottom: isVeryShortScreen ? 8 : 16,
    },

    loadingScreen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },

    brand: {
      alignItems: 'center',
      marginBottom: isVeryShortScreen ? 8 : isShortScreen ? 12 : 20,
    },

    logo: {
      width: isVeryShortScreen ? 40 : isShortScreen ? 48 : 60,
      height: isVeryShortScreen ? 40 : isShortScreen ? 48 : 60,
      borderRadius: isVeryShortScreen ? 14 : 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: isVeryShortScreen ? 5 : 8,
    },

    brandName: {
      fontFamily: 'PlusJakartaSans_700Bold',
      fontSize: isCompact ? 20 : 24,
      letterSpacing: isCompact ? 1.5 : 2.4,
      color: colors.text,
      textAlign: 'center',
    },

    brandCaption: {
      fontFamily: 'PlusJakartaSans_600SemiBold',
      fontSize: 10,
      letterSpacing: isCompact ? 0.8 : 1.5,
      color: colors.textSecondary,
      marginTop: 6,
      textAlign: 'center',
    },

    card: {
      width: '100%',
      maxWidth: contentMaxWidth,
      alignSelf: 'center',
      backgroundColor: colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      padding: isVeryShortScreen ? 14 : isCompact ? 18 : 24,
      shadowColor: '#2B2824',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 20,
      elevation: 2,
    },

    intro: {
      marginBottom: isVeryShortScreen ? 12 : 20,
    },

    welcomeBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.secondaryContainer,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
      marginBottom: isVeryShortScreen ? 10 : 17,
      gap: 6,
    },

    welcomeBadgeText: {
      fontFamily: 'PlusJakartaSans_600SemiBold',
      fontSize: 10,
      letterSpacing: 0.8,
      color: colors.secondary,
    },

    title: {
      fontFamily: 'PlusJakartaSans_700Bold',
      fontSize: isCompact ? 24 : 28,
      lineHeight: isCompact ? 31 : 37,
      letterSpacing: -0.7,
      color: colors.text,
      marginBottom: 9,
    },

    subtitle: {
      fontFamily: 'PlusJakartaSans_400Regular',
      fontSize: 14,
      lineHeight: 22,
      color: colors.textSecondary,
    },

    fieldGroup: {
      marginBottom: isVeryShortScreen ? 10 : 14,
    },

    label: {
      fontFamily: 'PlusJakartaSans_600SemiBold',
      fontSize: 13,
      lineHeight: 19,
      color: colors.text,
      marginBottom: 8,
    },

    inputContainer: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 14,
      paddingHorizontal: 14,
      gap: 10,
    },

    input: {
      flex: 1,
      minWidth: 0,
      minHeight: 50,
      paddingVertical: 12,
      fontFamily: 'PlusJakartaSans_400Regular',
      fontSize: 14,
      color: colors.text,
    },

    iconButton: {
      minWidth: 40,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },

    forgotButton: {
      alignSelf: 'flex-end',
      paddingVertical: 6,
      marginTop: -4,
      marginBottom: isVeryShortScreen ? 10 : 20,
    },

    forgotText: {
      fontFamily: 'PlusJakartaSans_600SemiBold',
      fontSize: 12,
      color: colors.primary,
    },

    messageBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 9,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceMuted,
      marginBottom: 16,
    },

    messageText: {
      flex: 1,
      fontFamily: 'PlusJakartaSans_400Regular',
      fontSize: 12,
      lineHeight: 19,
      color: colors.text,
    },

    primaryButton: {
      minHeight: 52,
      width: '100%',
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingHorizontal: 22,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      marginTop: 4,
    },

    primaryButtonPressed: {
      backgroundColor: colors.primaryPressed,
      transform: [{ scale: 0.99 }],
    },

    buttonDisabled: {
      opacity: 0.65,
    },

    primaryButtonText: {
      fontFamily: 'PlusJakartaSans_600SemiBold',
      fontSize: 15,
      color: colors.onPrimary,
    },

    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginVertical: isVeryShortScreen ? 10 : 18,
    },

    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.surfaceBorder,
    },

    dividerText: {
      fontFamily: 'PlusJakartaSans_600SemiBold',
      fontSize: 9,
      letterSpacing: 1.2,
      color: colors.textMuted,
    },

    socialButtons: {
      flexDirection: 'row',
      gap: 12,
    },

    socialButton: {
      flex: 1,
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 999,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
    },

    socialButtonPressed: {
      backgroundColor: colors.surfaceMuted,
    },

    socialButtonText: {
      fontFamily: 'PlusJakartaSans_600SemiBold',
      fontSize: 13,
      color: colors.text,
    },

    footerAction: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 5,
      marginTop: isVeryShortScreen ? 14 : 25,
    },

    footerActionText: {
      fontFamily: 'PlusJakartaSans_400Regular',
      fontSize: 12,
      color: colors.textSecondary,
    },

    footerLink: {
      fontFamily: 'PlusJakartaSans_700Bold',
      fontSize: 12,
      color: colors.primary,
      paddingVertical: 5,
    },

    trustFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      marginTop: isVeryShortScreen ? 10 : 18,
    },

    trustText: {
      fontFamily: 'PlusJakartaSans_500Medium',
      fontSize: 12,
      color: colors.secondary,
      textAlign: 'center',
    },

    legalText: {
      maxWidth: 330,
      alignSelf: 'center',
      fontFamily: 'PlusJakartaSans_400Regular',
      fontSize: 10,
      lineHeight: 16,
      textAlign: 'center',
      color: colors.textMuted,
      marginTop: 12,
    },
  });
}