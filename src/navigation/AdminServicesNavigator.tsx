import React from 'react';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import AdminServicesScreen from '../screens/admin/AdminServicesScreen';
import CreateCenterServiceScreen from '../screens/admin/CreateCenterServiceScreen';
import EditCenterServiceScreen from '../screens/admin/EditCenterServiceScreen';

export type AdminServicesStackParamList = {
  ServicesList: undefined;

  CreateService: undefined;

  EditService: {
    serviceId: string;
  };
};

const Stack =
  createNativeStackNavigator<AdminServicesStackParamList>();

export default function AdminServicesNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="ServicesList"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="ServicesList"
        component={AdminServicesScreen}
      />

      <Stack.Screen
        name="CreateService"
        component={CreateCenterServiceScreen}
      />

      <Stack.Screen
        name="EditService"
        component={EditCenterServiceScreen}
      />
    </Stack.Navigator>
  );
}
