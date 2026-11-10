import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';

type PatientTabParamList = {
  Inicio: undefined;
  Reservar: undefined;
  MisCitas: undefined;
  Perfil: undefined;
};

type PatientNavigatorProps = {
  onActivateAdmin?: () => void;
};

const Tab = createBottomTabNavigator<PatientTabParamList>();

function PlaceholderScreen({
  title,
  description,
  onActivateAdmin,
}: {
  title: string;
  description: string;
  onActivateAdmin?: () => void;
}) {
  return (
    <View style={styles.screen}>
      <Ionicons
        name="heart-circle-outline"
        size={64}
        color={colors.primary}
      />

      <Text style={styles.title}>{title}</Text>

      <Text style={styles.description}>{description}</Text>

      {onActivateAdmin && (
        <Pressable
          onPress={onActivateAdmin}
          style={styles.activationButton}
        >
          <Ionicons
            name="key-outline"
            size={19}
            color={colors.onPrimary}
          />

          <Text style={styles.activationButtonText}>
            Activar cuenta administrativa
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const tabIcons: Record<
  keyof PatientTabParamList,
  {
    active: keyof typeof Ionicons.glyphMap;
    inactive: keyof typeof Ionicons.glyphMap;
  }
> = {
  Inicio: {
    active: 'home',
    inactive: 'home-outline',
  },
  Reservar: {
    active: 'calendar',
    inactive: 'calendar-outline',
  },
  MisCitas: {
    active: 'time',
    inactive: 'time-outline',
  },
  Perfil: {
    active: 'person',
    inactive: 'person-outline',
  },
};

export default function PatientNavigator({
  onActivateAdmin,
}: PatientNavigatorProps) {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="Inicio"
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,

        tabBarLabelStyle: {
          fontFamily: 'PlusJakartaSans_500Medium',
          fontSize: 10,
          marginTop: 2,
        },

        tabBarIcon: ({ focused, color }) => {
          const icons = tabIcons[route.name];

          return (
            <Ionicons
              name={focused ? icons.active : icons.inactive}
              size={22}
              color={color}
            />
          );
        },

        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,

          height: 64 + insets.bottom,
          paddingTop: 9,
          paddingBottom: Math.max(insets.bottom, 8),

          backgroundColor: colors.surface,

          borderTopWidth: 1,
          borderTopColor: colors.surfaceBorder,

          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,

          shadowColor: colors.text,
          shadowOffset: {
            width: 0,
            height: -3,
          },
          shadowOpacity: 0.05,
          shadowRadius: 12,

          elevation: 8,
        },

        tabBarItemStyle: {
          paddingVertical: 2,
        },
      })}
    >
      <Tab.Screen name="Inicio">
        {() => (
          <PlaceholderScreen
            title="Bienvenido a MontseApp"
            description="Tu espacio de fisioterapia, osteopatía y bienestar."
            onActivateAdmin={onActivateAdmin}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Reservar">
        {() => (
          <PlaceholderScreen
            title="Reservar cita"
            description="Aquí podrás elegir tratamiento, profesional, día y hora."
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="MisCitas"
        options={{ tabBarLabel: 'Mis citas' }}
      >
        {() => (
          <PlaceholderScreen
            title="Mis citas"
            description="Consulta y gestiona tus próximas citas."
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Perfil">
        {() => (
          <PlaceholderScreen
            title="Mi perfil"
            description="Gestiona tus datos personales y preferencias."
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 90,
  },

  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 24,
    color: colors.text,
    textAlign: 'center',
    marginTop: 18,
  },

  description: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },

  activationButton: {
    marginTop: 30,
    backgroundColor: colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  activationButtonText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: colors.onPrimary,
  },
});