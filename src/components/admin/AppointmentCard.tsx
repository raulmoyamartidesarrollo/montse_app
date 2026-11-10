import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../theme/colors';

export type AppointmentCardData = {
  id: string;
  time: string;
  duration: number;
  patientName: string;
  serviceName: string;
  professionalName: string;
  status: string;
  room?: string;
};

type Props = {
  appointment: AppointmentCardData;
};

export default function AppointmentCard({ appointment }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.timeBox}>
          <Text style={styles.time}>{appointment.time}</Text>

          <Text style={styles.duration}>
            {appointment.duration} min
          </Text>
        </View>

        <View style={styles.details}>
          <Text style={styles.patient}>
            {appointment.patientName}
          </Text>

          <Text style={styles.service}>
            {appointment.serviceName}
          </Text>
        </View>

        {appointment.room ? (
          <View style={styles.roomBadge}>
            <Text style={styles.roomText}>
              {appointment.room}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <View style={styles.professional}>
          <Ionicons
            name="person-outline"
            size={15}
            color={colors.secondary}
          />

          <Text style={styles.footerText}>
            {appointment.professionalName}
          </Text>
        </View>

        <Text style={styles.status}>
          {appointment.status}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timeBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  time: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  duration: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  details: {
    flex: 1,
    minWidth: 0,
  },
  patient: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  service: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
  },
  roomBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roomText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  footer: {
    marginTop: 18,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  professional: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  footerText: {
    fontSize: 11,
    color: colors.text,
    flexShrink: 1,
  },
  status: {
    fontSize: 11,
    color: colors.secondary,
    flexShrink: 1,
  },
});