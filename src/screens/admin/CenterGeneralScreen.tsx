import React, { useState } from 'react';
import {
  ActivityIndicator,
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

type GeneralRouteParams = {
  center: CenterSettings;
};

export default function CenterGeneralScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const { center } = route.params as GeneralRouteParams;

  const [name, setName] = useState(center.name);
  const [description, setDescription] = useState(center.description);

  const hasChanges =
    name !== center.name ||
    description !== center.description;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        <Text style={styles.headerTitle}>Información general</Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: insets.bottom + 120,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>MA</Text>
          </View>
          <Text style={styles.logoHint}>
            Próximamente podrás cambiar el logotipo del centro.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>DATOS GENERALES</Text>

        <Text style={styles.label}>Nombre del centro</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Nombre del centro"
          placeholderTextColor={colors.textMuted}
          maxLength={120}
        />

        <Text style={styles.label}>Descripción</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe tu centro"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={1000}
          textAlignVertical="top"
        />

        <Text style={styles.counter}>
          {description.length}/1000 caracteres
        </Text>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 16) + 70 },
        ]}
      >
        <Pressable
          style={[
            styles.saveButton,
            !hasChanges && styles.saveButtonDisabled,
          ]}
          disabled
        >
          <Ionicons name="save-outline" size={19} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>
            Guardar cambios
          </Text>
        </Pressable>

        <Text style={styles.footerHint}>
          Activaremos el guardado seguro en el siguiente paso.
        </Text>
      </View>
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
    fontSize: 19,
    color: colors.text,
    marginLeft: 8,
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 25,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 32,
    color: colors.primary,
  },
  logoHint: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.primary,
    marginTop: 18,
    marginBottom: 22,
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
    paddingVertical: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: colors.text,
    marginBottom: 22,
  },
  textArea: {
    minHeight: 125,
  },
  counter: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: -14,
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