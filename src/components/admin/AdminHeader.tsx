import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../theme/colors';

type Props = {
  title?: string;
  subtitle?: string;
};

export default function AdminHeader({
  title = 'MA FISIOTERAPIA',
  subtitle = 'Panel de administración',
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <View style={styles.brand}>
          <Text style={styles.brandName}>
            <Text style={styles.brandInitials}>MA</Text> FISIOTERAPIA
          </Text>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>Admin</Text>
          </View>
        </View>

        <View style={styles.icon}>
          <Ionicons
            name="notifications-outline"
            size={22}
            color={colors.text}
          />
        </View>
      </View>

      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: colors.background,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 8,
  },
  brandName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  brandInitials: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.secondaryContainer,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondary,
  },
  icon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 12,
    color: colors.textSecondary,
  },
});