import React from 'react';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import AdminMoreScreen from '../screens/admin/AdminMoreScreen';
import CenterSettingsScreen from '../screens/admin/CenterSettingsScreen';

export type AdminMoreStackParamList = {
  MoreHome: undefined;
  CenterSettings: undefined;
};

const Stack =
  createNativeStackNavigator<AdminMoreStackParamList>();

export default function AdminMoreNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MoreHome">
        {({ navigation }) => (
          <AdminMoreScreen
            onOpenCenterSettings={() =>
              navigation.navigate('CenterSettings')
            }
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="CenterSettings"
        component={CenterSettingsScreen}
      />
    </Stack.Navigator>
  );
}