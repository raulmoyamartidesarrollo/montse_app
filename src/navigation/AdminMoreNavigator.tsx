import React from 'react';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import AdminMoreScreen from '../screens/admin/AdminMoreScreen';
import CenterSettingsScreen from '../screens/admin/CenterSettingsScreen';
import CenterGeneralScreen from '../screens/admin/CenterGeneralScreen';
import CenterContactScreen from '../screens/admin/CenterContactScreen';
import CenterAddressScreen from '../screens/admin/CenterAddressScreen';
import CenterSocialScreen from '../screens/admin/CenterSocialScreen';
import CenterAdvancedScreen from '../screens/admin/CenterAdvancedScreen';
import CenterSessionPackagesScreen from '../screens/admin/CenterSessionPackagesScreen';

import CenterWeeklyScheduleScreen from '../screens/admin/CenterWeeklyScheduleScreen';
import CenterSpecialSchedulesScreen from '../screens/admin/CenterSpecialSchedulesScreen';
import CenterSpecialScheduleFormScreen from '../screens/admin/CenterSpecialScheduleFormScreen';

import type {
  CenterSpecialSchedule,
} from '../types/centerSpecialSchedules';

import type { CenterSettings } from '../services/centers';

export type AdminMoreStackParamList = {
  MoreHome: undefined;

  CenterSettings: undefined;

  CenterWeeklySchedule: undefined;

  CenterSpecialSchedules: undefined;

  CenterSpecialScheduleForm: {
    schedule?: CenterSpecialSchedule;
  } | undefined;

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

  CenterAdvanced: {
    center: CenterSettings;
  };

  CenterSessionPackages: {
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
            onOpenWeeklySchedule={() =>
              navigation.navigate('CenterWeeklySchedule')
            }
            onOpenSpecialSchedules={() =>
              navigation.navigate('CenterSpecialSchedules')
            }
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="CenterSettings"
        component={CenterSettingsScreen}
      />

      <Stack.Screen
        name="CenterWeeklySchedule"
        component={CenterWeeklyScheduleScreen}
      />

      <Stack.Screen
        name="CenterSpecialSchedules"
        component={CenterSpecialSchedulesScreen}
      />

      <Stack.Screen
        name="CenterSpecialScheduleForm"
        component={CenterSpecialScheduleFormScreen}
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

      <Stack.Screen
        name="CenterAdvanced"
        component={CenterAdvancedScreen}
      />

      <Stack.Screen
        name="CenterSessionPackages"
        component={CenterSessionPackagesScreen}
      />
    </Stack.Navigator>
  );
}
