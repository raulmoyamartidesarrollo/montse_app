import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';

type Props = {
  onOpenCenterSettings: () => void;
};

export default function AdminMoreScreen({
  onOpenCenterSettings,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 110,
        paddingHorizontal: 20,
      }}
    >
      <Text style={styles.title}>Más opciones</Text>

      <Text style={styles.subtitle}>
        Configura y administra MA Fisioterapia.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          CONFIGURACIÓN DEL CENTRO
        </Text>

        <Pressable
          style={styles.menuItem}
          onPress={onOpenCenterSettings}
        >
          <View style={styles.iconContainer}>
            <Ionicons
              name="business-outline"
              size={22}
              color={colors.primary}
            />
          </View>

          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>
              Datos del centro
            </Text>

            <Text style={styles.menuDescription}>
              Información, contacto y ubicación
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textMuted}
          />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 28,
    color: colors.text,
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.textMuted,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: colors.text,
  },
  menuDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
});