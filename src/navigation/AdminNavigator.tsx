import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';

type AdminTabParamList = {
  Inicio: undefined;
  Agenda: undefined;
  Pacientes: undefined;
  Servicios: undefined;
  Mas: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

function PlaceholderScreen({
  title,
}: {
  title: string;
}) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>
        Esta sección estará disponible próximamente.
      </Text>
    </View>
  );
}

const HomeScreen = () => (
  <PlaceholderScreen title="Inicio" />
);

const AgendaScreen = () => (
  <PlaceholderScreen title="Agenda" />
);

const PatientsScreen = () => (
  <PlaceholderScreen title="Pacientes" />
);

const ServicesScreen = () => (
  <PlaceholderScreen title="Servicios" />
);

const MoreScreen = () => (
  <PlaceholderScreen title="Más opciones" />
);

const tabIcons: Record<
  keyof AdminTabParamList,
  {
    active: keyof typeof Ionicons.glyphMap;
    inactive: keyof typeof Ionicons.glyphMap;
  }
> = {
  Inicio: {
    active: 'home',
    inactive: 'home-outline',
  },
  Agenda: {
    active: 'calendar',
    inactive: 'calendar-outline',
  },
  Pacientes: {
    active: 'people',
    inactive: 'people-outline',
  },
  Servicios: {
    active: 'pricetag',
    inactive: 'pricetag-outline',
  },
  Mas: {
    active: 'options',
    inactive: 'options-outline',
  },
};

export default function AdminNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="Inicio"
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,

        tabBarShowLabel: true,

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
      <Tab.Screen
        name="Inicio"
        component={HomeScreen}
      />

      <Tab.Screen
        name="Agenda"
        component={AgendaScreen}
      />

      <Tab.Screen
        name="Pacientes"
        component={PatientsScreen}
      />

      <Tab.Screen
        name="Servicios"
        component={ServicesScreen}
      />

      <Tab.Screen
        name="Mas"
        component={MoreScreen}
        options={{
          tabBarLabel: 'Más',
        }}
      />
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
    fontSize: 26,
    color: colors.text,
    marginBottom: 12,
  },

  description: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});