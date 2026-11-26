import React from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import type {
  CenterService,
} from '../../../services/centerServices';

import { colors } from '../../../theme/colors';

type CenterServiceCardProps = {
  service: CenterService;
  onPress: () => void;
};

function formatPrice(
  priceCents: number | null
): string {
  if (priceCents === null) {
    return 'Precio pendiente';
  }

  return (priceCents / 100).toLocaleString(
    'es-ES',
    {
      style: 'currency',
      currency: 'EUR',
    }
  );
}

function formatDuration(
  durationMinutes: number | null
): string {
  if (durationMinutes === null) {
    return 'Duración pendiente';
  }

  return `${durationMinutes} min`;
}

export default function CenterServiceCard({
  service: item,
  onPress,
}: CenterServiceCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Editar ${item.name}`}
      style={styles.serviceCard}
      onPress={onPress}
    >
      <View style={styles.serviceTop}>
        <View style={styles.serviceIcon}>
          <Ionicons
            name="medkit-outline"
            size={24}
            color={colors.primary}
          />
        </View>

        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>
            {item.name || 'Servicio sin nombre'}
          </Text>

          <View
            style={[
              styles.statusBadge,
              !item.active &&
                styles.statusBadgeInactive,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                !item.active &&
                  styles.statusDotInactive,
              ]}
            />

            <Text
              style={[
                styles.statusText,
                !item.active &&
                  styles.statusTextInactive,
              ]}
            >
              {item.active ? 'Activo' : 'Inactivo'}
            </Text>
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.textMuted}
        />
      </View>

      {item.description ? (
        <Text
          style={styles.serviceDescription}
          numberOfLines={3}
        >
          {item.description}
        </Text>
      ) : null}

      <View style={styles.serviceDivider} />

      <View style={styles.serviceDetails}>
        <View style={styles.detailItem}>
          <Ionicons
            name="cash-outline"
            size={20}
            color={colors.primary}
          />

          <View style={styles.detailText}>
            <Text style={styles.detailLabel}>
              Precio
            </Text>

            <Text style={styles.priceValue}>
              {formatPrice(item.priceCents)}
            </Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <Ionicons
            name="time-outline"
            size={20}
            color={colors.primary}
          />

          <View style={styles.detailText}>
            <Text style={styles.detailLabel}>
              Duración
            </Text>

            <Text style={styles.durationValue}>
              {formatDuration(item.durationMinutes)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  serviceCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },

  serviceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  serviceInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },

  serviceName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: colors.text,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.secondaryContainer,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginTop: 6,
  },

  statusBadgeInactive: {
    backgroundColor: colors.surfaceMuted,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary,
  },

  statusDotInactive: {
    backgroundColor: colors.textMuted,
  },

  statusText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: colors.secondary,
  },

  statusTextInactive: {
    color: colors.textMuted,
  },

  serviceDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
    marginTop: 14,
  },

  serviceDivider: {
    height: 1,
    backgroundColor: colors.surfaceBorder,
    marginVertical: 15,
  },

  serviceDetails: {
    flexDirection: 'row',
    gap: 15,
  },

  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  detailText: {
    flex: 1,
  },

  detailLabel: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: colors.textMuted,
  },

  priceValue: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: colors.primary,
    marginTop: 3,
  },

  durationValue: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: colors.text,
    marginTop: 3,
  },
});
