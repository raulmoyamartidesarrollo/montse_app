import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../theme/colors';

type Props = {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

export default function DashboardStatCard({
  title,
  value,
  subtitle,
  icon,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>

        <Ionicons
          name={icon}
          size={17}
          color={colors.secondary}
        />
      </View>

      <Text style={styles.value}>{value}</Text>

      {subtitle ? (
        <Text style={styles.subtitle}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 11,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 14,
  },
  subtitle: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
});