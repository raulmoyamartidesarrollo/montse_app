import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
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
  defaultCenterServiceFormValues,
  type CenterServiceFormValues,
} from '../../components/admin/services/CenterServiceForm';

import {
  createCenterService,
  type CenterServiceInput,
} from '../../services/centerServices';

import { colors } from '../../theme/colors';

import useAdminDraftGuard from '../../hooks/useAdminDraftGuard';

// ==================================================
// TIPOS
// ==================================================

type Props = NativeStackScreenProps<
  AdminServicesStackParamList,
  'CreateService'
>;

// ==================================================
// PANTALLA PRINCIPAL
// ==================================================

export default function CreateCenterServiceScreen({
  navigation,
}: Props) {
  const insets = useSafeAreaInsets();

  const [values, setValues] =
    useState<CenterServiceFormValues>({
      ...defaultCenterServiceFormValues,
    });

  const [saving, setSaving] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const savingRef = useRef(false);
  const savedRef = useRef(false);
  const alertOpenRef = useRef(false);

  const [discarding, setDiscarding] =
    useState(false);

  const pendingNavigationRef =
    useRef<(() => void) | null>(null);

  // ==================================================
  // DETECTAR CAMBIOS
  // ==================================================

  const hasChanges =
    values.name !==
      defaultCenterServiceFormValues.name ||
    values.description !==
      defaultCenterServiceFormValues.description ||
    values.price !==
      defaultCenterServiceFormValues.price ||
    values.duration !==
      defaultCenterServiceFormValues.duration ||
    values.active !==
      defaultCenterServiceFormValues.active;

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
      'Si sales de esta pantalla perderás los datos introducidos.',

    savingTitle: 'Guardando servicio',

    savingMessage:
      'Espera a que finalice el guardado del servicio.',

    onDiscardAndNavigate: (action) => {
      if (
        savingRef.current ||
        !navigation.isFocused()
      ) {
        return;
      }

      Keyboard.dismiss();

      setValues({
        ...defaultCenterServiceFormValues,
      });

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
  // CREAR SERVICIO
  // ==================================================

  const handleSubmit = useCallback(
    async (payload: CenterServiceInput) => {
      if (
        savingRef.current ||
        savedRef.current
      ) {
        return;
      }

      savingRef.current = true;
      setSaving(true);

      Keyboard.dismiss();

      try {
        await createCenterService(payload);

        savedRef.current = true;
        setSaved(true);

        Alert.alert(
          'Servicio creado',
          'El servicio se ha creado correctamente.',
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
          '[CreateCenterServiceScreen] Error creando servicio:',
          error
        );

        throw error;
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [navigation]
  );

  // ==================================================
  // CANCELAR
  // ==================================================

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
          Nuevo servicio
        </Text>
      </View>

      {/* CONTENIDO */}

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
              Añadir nuevo servicio
            </Text>

            <Text style={styles.introDescription}>
              Configura un nuevo tratamiento para
              incorporarlo al catálogo de servicios
              de tu centro.
            </Text>
          </View>

          {/* FORMULARIO REUTILIZABLE */}

          <CenterServiceForm
            values={values}
            onChange={setValues}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitLabel="Crear servicio"
            saving={saving}
            disabled={saved || discarding}
          />

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ==================================================
// ESTILOS
// ==================================================

const styles = StyleSheet.create({
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
    marginTop: 9,
  },
});
