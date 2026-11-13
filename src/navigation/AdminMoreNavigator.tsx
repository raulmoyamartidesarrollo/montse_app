import React from 'react';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import AdminMoreScreen from '../screens/admin/AdminMoreScreen';
import CenterSettingsScreen from '../screens/admin/CenterSettingsScreen';
import CenterGeneralScreen from '../screens/admin/CenterGeneralScreen';
import type { CenterSettings } from '../services/centers';
import CenterContactScreen from '../screens/admin/CenterContactScreen';
import CenterAddressScreen from '../screens/admin/CenterAddressScreen';
import CenterSocialScreen from '../screens/admin/CenterSocialScreen';

export type AdminMoreStackParamList = {
  MoreHome: undefined;
  CenterSettings: undefined;
  CenterGeneral: {
    center: CenterSettings;
  };
  CenterContact: {
    center: CenterSettings;
  };
  CenterAddress: {
    center: CenterSettings;
};
CenterSocial: {
  center: CenterSettings;
};
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
      <Stack.Screen
        name="CenterGeneral"
        component={CenterGeneralScreen}
        />
        <Stack.Screen
            name="CenterContact"
            component={CenterContactScreen}
        />
        <Stack.Screen
            name="CenterAddress"
            component={CenterAddressScreen}
        />
        <Stack.Screen
        name="CenterSocial"
        component={CenterSocialScreen}
        />
    </Stack.Navigator>
  );
}