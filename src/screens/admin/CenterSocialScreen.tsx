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
  type CenterSettings,
  type CenterSocialMedia,
} from '../../services/centers';

// --------------------------------------------------
// TIPOS
// --------------------------------------------------

type SocialRouteParams = {
  center: CenterSettings;
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type SocialFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  icon: IconName;
  editable?: boolean;
};

// --------------------------------------------------
// COMPONENTE CAMPO
// --------------------------------------------------

function SocialField({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  editable = true,
}: SocialFieldProps) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.inputContainer}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={icon}
            size={21}
            color={colors.primary}
          />
        </View>

        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={300}
          editable={editable}
        />
      </View>
    </View>
  );
}

// --------------------------------------------------
// VALIDACIÓN DE URL
// --------------------------------------------------

const SOCIAL_DOMAINS: Record<
  keyof CenterSocialMedia,
  string[]
> = {
  instagram: ['instagram.com'],
  facebook: ['facebook.com', 'fb.com'],
  tiktok: ['tiktok.com'],
  youtube: ['youtube.com', 'youtu.be'],
  linkedin: ['linkedin.com'],
  x: ['x.com', 'twitter.com'],
};

const SOCIAL_LABELS: Record<
  keyof CenterSocialMedia,
  string
> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  x: 'X (Twitter)',
};

/**
 * Valida que la URL:
 *
 * - Sea una URL HTTP/HTTPS.
 * - Tenga un dominio válido.
 * - Pertenezca a la red social correspondiente.
 *
 * Los campos vacíos son válidos.
 */
function isValidSocialUrl(
  value: string,
  social: keyof CenterSocialMedia
): boolean {
  if (!value.trim()) {
    return true;
  }

  try {
    const url = new URL(value.trim());

    if (
      url.protocol !== 'https:' &&
      url.protocol !== 'http:'
    ) {
      return false;
    }

    const hostname = url.hostname.toLowerCase();

    return SOCIAL_DOMAINS[social].some(
      domain =>
        hostname === domain ||
        hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

// --------------------------------------------------
// PANTALLA PRINCIPAL
// --------------------------------------------------

export default function CenterSocialScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const { center } = route.params as SocialRouteParams;

  const social = center.socialMedia;

  // --------------------------------------------------
  // ESTADOS
  // --------------------------------------------------

  const [instagram, setInstagram] = useState(
    social.instagram ?? ''
  );

  const [facebook, setFacebook] = useState(
    social.facebook ?? ''
  );

  const [tiktok, setTiktok] = useState(
    social.tiktok ?? ''
  );

  const [youtube, setYoutube] = useState(
    social.youtube ?? ''
  );

  const [linkedin, setLinkedin] = useState(
    social.linkedin ?? ''
  );

  const [x, setX] = useState(
    social.x ?? ''
  );

  const [savedSocial, setSavedSocial] =
    useState<CenterSocialMedia>({
      ...social,
    });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // --------------------------------------------------
  // APLICAR DATOS RECUPERADOS
  // --------------------------------------------------

  const applySocial = useCallback(
    (data: CenterSocialMedia) => {
      setInstagram(data.instagram ?? '');
      setFacebook(data.facebook ?? '');
      setTiktok(data.tiktok ?? '');
      setYoutube(data.youtube ?? '');
      setLinkedin(data.linkedin ?? '');
      setX(data.x ?? '');

      setSavedSocial({
        instagram: data.instagram ?? '',
        facebook: data.facebook ?? '',
        tiktok: data.tiktok ?? '',
        youtube: data.youtube ?? '',
        linkedin: data.linkedin ?? '',
        x: data.x ?? '',
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

      const loadSocial = async () => {
        try {
          setLoading(true);

          const updatedCenter =
            await getCenterSettings();

          if (!active) {
            return;
          }

          applySocial(updatedCenter.socialMedia);
        } catch (error) {
          console.error(
            '[CenterSocialScreen] Error cargando redes sociales:',
            error
          );

          if (active) {
            Alert.alert(
              'Error de conexión',
              'No se han podido cargar las redes sociales del centro.'
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      void loadSocial();

      return () => {
        active = false;
      };
    }, [applySocial])
  );

  // --------------------------------------------------
  // DETECTAR CAMBIOS
  // --------------------------------------------------

  const hasChanges =
    instagram !== savedSocial.instagram ||
    facebook !== savedSocial.facebook ||
    tiktok !== savedSocial.tiktok ||
    youtube !== savedSocial.youtube ||
    linkedin !== savedSocial.linkedin ||
    x !== savedSocial.x;

  const canSave =
    hasChanges &&
    !loading &&
    !saving;

  // --------------------------------------------------
  // GUARDAR EN FIREBASE
  // --------------------------------------------------

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    const data: CenterSocialMedia = {
      instagram: instagram.trim(),
      facebook: facebook.trim(),
      tiktok: tiktok.trim(),
      youtube: youtube.trim(),
      linkedin: linkedin.trim(),
      x: x.trim(),
    };

    // Validar todas las redes sociales.
    const socialKeys = Object.keys(
      data
    ) as Array<keyof CenterSocialMedia>;

    for (const socialKey of socialKeys) {
      if (
        !isValidSocialUrl(
          data[socialKey],
          socialKey
        )
      ) {
        Alert.alert(
          'Enlace incorrecto',
          `Introduce una URL válida de ${SOCIAL_LABELS[socialKey]} que comience por https://.`
        );

        return;
      }
    }

    try {
      setSaving(true);

      // Guardar mediante Cloud Function.
      await updateCenterSettings({
        section: 'socialMedia',
        data,
      });

      // Confirmar los valores almacenados.
      const updatedCenter =
        await getCenterSettings();

      applySocial(updatedCenter.socialMedia);

      Alert.alert(
        'Cambios guardados',
        'Las redes sociales del centro se han actualizado correctamente.'
      );
    } catch (error) {
      console.error(
        '[CenterSocialScreen] Error guardando redes sociales:',
        error
      );

      Alert.alert(
        'Error al guardar',
        'No se han podido guardar las redes sociales. Comprueba tu conexión e inténtalo de nuevo.'
      );
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // INTERFAZ
  // --------------------------------------------------

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
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
          Redes sociales
        </Text>
      </View>

      {/* FORMULARIO */}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 30,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* INFORMACIÓN */}

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="share-social-outline"
              size={26}
              color={colors.primary}
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Presencia en redes sociales
            </Text>

            <Text style={styles.infoDescription}>
              Añade los enlaces de las redes sociales
              de tu clínica para que los pacientes
              puedan encontrarte fácilmente.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          REDES SOCIALES
        </Text>

        {/* INSTAGRAM */}

        <SocialField
          label="Instagram"
          value={instagram}
          onChangeText={setInstagram}
          placeholder="https://instagram.com/tuclinica"
          icon="logo-instagram"
          editable={!loading && !saving}
        />

        {/* FACEBOOK */}

        <SocialField
          label="Facebook"
          value={facebook}
          onChangeText={setFacebook}
          placeholder="https://facebook.com/tuclinica"
          icon="logo-facebook"
          editable={!loading && !saving}
        />

        {/* TIKTOK */}

        <SocialField
          label="TikTok"
          value={tiktok}
          onChangeText={setTiktok}
          placeholder="https://tiktok.com/@tuclinica"
          icon="logo-tiktok"
          editable={!loading && !saving}
        />

        {/* YOUTUBE */}

        <SocialField
          label="YouTube"
          value={youtube}
          onChangeText={setYoutube}
          placeholder="https://youtube.com/@tuclinica"
          icon="logo-youtube"
          editable={!loading && !saving}
        />

        {/* LINKEDIN */}

        <SocialField
          label="LinkedIn"
          value={linkedin}
          onChangeText={setLinkedin}
          placeholder="https://linkedin.com/company/tuclinica"
          icon="logo-linkedin"
          editable={!loading && !saving}
        />

        {/* X / TWITTER */}

        <SocialField
          label="X (Twitter)"
          value={x}
          onChangeText={setX}
          placeholder="https://x.com/tuclinica"
          icon="logo-twitter"
          editable={!loading && !saving}
        />

        {/* AYUDA */}

        <View style={styles.helpCard}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color={colors.primary}
          />

          <Text style={styles.helpText}>
            Introduce la dirección completa de cada perfil,
            incluyendo https://. Puedes dejar vacías las
            redes sociales que no utilices.
          </Text>
        </View>
      </ScrollView>

      {/* GUARDAR */}

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
            ? 'Cargando redes sociales...'
            : saving
              ? 'Actualizando las redes sociales...'
              : hasChanges
                ? 'Tienes cambios pendientes de guardar.'
                : 'Todos los cambios están guardados.'}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

// --------------------------------------------------
// ESTILOS ORIGINALES
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
    marginBottom: 22,
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
    paddingHorizontal: 12,
  },

  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  input: {
    flex: 1,
    paddingVertical: 15,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
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