import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AdminMoreStackParamList } from '../../navigation/AdminMoreNavigator';

import { colors } from '../../theme/colors';
import {
  CenterSettings,
  getCenterSettings,
} from '../../services/centers';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type SettingsCardProps = {
  title: string;
  description: string;
  icon: IconName;
  onPress: () => void;
};

function SettingsCard({
  title,
  description,
  icon,
  onPress,
}: SettingsCardProps) {
  return (
    <Pressable
      style={styles.settingsCard}
      onPress={onPress}
    >
      <View style={styles.cardIcon}>
        <Ionicons
          name={icon}
          size={23}
          color={colors.primary}
        />
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>
          {description}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={colors.textMuted}
      />
    </Pressable>
  );
}

export default function CenterSettingsScreen() {
  const navigation =
  useNavigation<NativeStackNavigationProp<AdminMoreStackParamList>>();
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
      setError('No se ha podido cargar la información del centro.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCenter();
  }, [loadCenter]);

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
          <Text style={styles.message}>
            Cargando información...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons
            name="alert-circle-outline"
            size={42}
            color={colors.primary}
          />

          <Text style={styles.message}>{error}</Text>

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
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: insets.bottom + 110,
          }}
        >
          <View style={styles.centerCard}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>MA</Text>
            </View>

            <Text style={styles.centerName}>
              {center.name}
            </Text>

            <Text style={styles.centerSubtitle}>
              Configuración del centro
            </Text>
          </View>

          <Text style={styles.sectionTitle}>
            INFORMACIÓN DEL CENTRO
          </Text>

          <SettingsCard
            title="Información general"
            description="Nombre, descripción y logotipo"
            icon="business-outline"
            onPress={() => navigation.navigate('CenterGeneral', { center })}
          />

          <SettingsCard
            title="Contacto"
            description={
              center.contact.phone ||
              center.contact.mobile ||
              'Teléfono, WhatsApp y correo'
            }
            icon="call-outline"
            onPress={() => navigation.navigate('CenterContact', { center })}
          />

          <SettingsCard
            title="Ubicación"
            description={
              center.address.city ||
              'Dirección y localidad'
            }
            icon="location-outline"
            onPress={() => navigation.navigate('CenterAddress', { center })}
          />

          <SettingsCard
            title="Redes sociales"
            description="Instagram, Facebook y otras redes"
            icon="globe-outline"
            onPress={() => navigation.navigate('CenterSocial', { center })}
          />

          <SettingsCard
            title="Configuración avanzada"
            description="Zona horaria y preferencias"
            icon="settings-outline"
            onPress={() => {}}
          />
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

  centerCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },

  logo: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  logoText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 27,
    color: colors.primary,
  },

  centerName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 19,
    color: colors.text,
    textAlign: 'center',
  },

  centerSubtitle: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
  },

  sectionTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.textMuted,
    marginTop: 28,
    marginBottom: 14,
  },

  settingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 17,
    padding: 17,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },

  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  cardContent: {
    flex: 1,
  },

  cardTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: colors.text,
  },

  cardDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 5,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  message: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },

  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 20,
  },

  retryText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: '#FFFFFF',
  },
});