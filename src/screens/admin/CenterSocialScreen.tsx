import React, { useState } from 'react';
import {
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';
import type { CenterSettings } from '../../services/centers';

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
};

function SocialField({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
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
        />
      </View>
    </View>
  );
}

export default function CenterSocialScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const { center } = route.params as SocialRouteParams;

  const social = center.socialMedia;

  const [instagram, setInstagram] = useState(social.instagram ?? '');
  const [facebook, setFacebook] = useState(social.facebook ?? '');
  const [tiktok, setTiktok] = useState(social.tiktok ?? '');
  const [youtube, setYoutube] = useState(social.youtube ?? '');
  const [linkedin, setLinkedin] = useState(social.linkedin ?? '');
  const [x, setX] = useState(social.x ?? '');

  const hasChanges =
    instagram !== (social.instagram ?? '') ||
    facebook !== (social.facebook ?? '') ||
    tiktok !== (social.tiktok ?? '') ||
    youtube !== (social.youtube ?? '') ||
    linkedin !== (social.linkedin ?? '') ||
    x !== (social.x ?? '');

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

        <SocialField
          label="Instagram"
          value={instagram}
          onChangeText={setInstagram}
          placeholder="https://instagram.com/tuclinica"
          icon="logo-instagram"
        />

        <SocialField
          label="Facebook"
          value={facebook}
          onChangeText={setFacebook}
          placeholder="https://facebook.com/tuclinica"
          icon="logo-facebook"
        />

        <SocialField
          label="TikTok"
          value={tiktok}
          onChangeText={setTiktok}
          placeholder="https://tiktok.com/@tuclinica"
          icon="logo-tiktok"
        />

        <SocialField
          label="YouTube"
          value={youtube}
          onChangeText={setYoutube}
          placeholder="https://youtube.com/@tuclinica"
          icon="logo-youtube"
        />

        <SocialField
          label="LinkedIn"
          value={linkedin}
          onChangeText={setLinkedin}
          placeholder="https://linkedin.com/company/tuclinica"
          icon="logo-linkedin"
        />

        <SocialField
          label="X (Twitter)"
          value={x}
          onChangeText={setX}
          placeholder="https://x.com/tuclinica"
          icon="logo-twitter"
        />

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
            !hasChanges && styles.saveButtonDisabled,
          ]}
          disabled
        >
          <Ionicons
            name="save-outline"
            size={19}
            color="#FFFFFF"
          />

          <Text style={styles.saveButtonText}>
            Guardar cambios
          </Text>
        </Pressable>

        <Text style={styles.footerHint}>
          Activaremos el guardado seguro próximamente.
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