import React from 'react';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import AdminPatientsScreen from '../screens/admin/AdminPatientsScreen';
import PatientClinicalHistoryScreen from '../screens/admin/PatientClinicalHistoryScreen';

export type AdminPatientsStackParamList = {
  PatientsList: undefined;

  PatientClinicalHistory: {
    clientId: string;
    patientName: string;
  };
};

const Stack =
  createNativeStackNavigator<AdminPatientsStackParamList>();

export default function AdminPatientsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="PatientsList"
        component={AdminPatientsScreen}
      />

      <Stack.Screen
        name="PatientClinicalHistory"
        component={PatientClinicalHistoryScreen}
      />
    </Stack.Navigator>
  );
}