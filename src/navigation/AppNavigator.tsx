import React from 'react';
import { NavigationContainer } from '@react-navigation/native';

import {
  hasAdminAccess,
  type UserProfile,
} from '../services/users';

import AdminNavigator from './AdminNavigator';
import PatientNavigator from './PatientNavigator';

interface AppNavigatorProps {
  profile: UserProfile;
  onActivateAdmin?: () => void;
}

export default function AppNavigator({
  profile,
  onActivateAdmin,
}: AppNavigatorProps) {
  const isAdmin = hasAdminAccess(profile.roles);

  return (
    <NavigationContainer>
      {isAdmin ? (
        <AdminNavigator />
      ) : (
        <PatientNavigator
          onActivateAdmin={onActivateAdmin}
        />
      )}
    </NavigationContainer>
  );
}