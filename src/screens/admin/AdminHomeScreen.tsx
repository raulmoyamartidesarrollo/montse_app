import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';
import AdminHeader from '../../components/admin/AdminHeader';
import DashboardStatCard from '../../components/admin/DashboardStatCard';

export default function AdminHomeScreen() {
  const insets = useSafeAreaInsets();

  const today = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top, paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AdminHeader subtitle="Gestión de la clínica" />

        <View style={styles.section}>
          <Text style={styles.eyebrow}>
            RESUMEN GENERAL
          </Text>

          <Text style={styles.heading}>
            Bienvenido a MA
          </Text>

          <Text style={styles.date}>
            {today}
          </Text>
        </View>

        <View style={styles.stats}>
          <DashboardStatCard
            title="Citas hoy"
            value="—"
            subtitle="Sin datos cargados"
            icon="calendar-outline"
          />

          <DashboardStatCard
            title="Pendientes"
            value="—"
            subtitle="Sin datos cargados"
            icon="time-outline"
          />

          <DashboardStatCard
            title="Ocupación"
            value="—"
            subtitle="Sin datos cargados"
            icon="stats-chart-outline"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Accesos rápidos
          </Text>

          <View style={styles.quickActions}>
            <View style={styles.action}>
              <Ionicons
                name="add-circle-outline"
                size={25}
                color={colors.primary}
              />
              <Text style={styles.actionText}>
                Nueva cita
              </Text>
            </View>

            <View style={styles.action}>
              <Ionicons
                name="calendar-outline"
                size={25}
                color={colors.primary}
              />
              <Text style={styles.actionText}>
                Agenda
              </Text>
            </View>

            <View style={styles.action}>
              <Ionicons
                name="people-outline"
                size={25}
                color={colors.primary}
              />
              <Text style={styles.actionText}>
                Pacientes
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>
              Próximas citas
            </Text>

            <Ionicons
              name="calendar-clear-outline"
              size={20}
              color={colors.secondary}
            />
          </View>

          <View style={styles.emptyCard}>
            <Ionicons
              name="calendar-outline"
              size={34}
              color={colors.primary}
            />

            <Text style={styles.emptyTitle}>
              Próximas sesiones
            </Text>

            <Text style={styles.emptyDescription}>
              Las próximas citas aparecerán aquí cuando
              conectemos la agenda con Firebase.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 120,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.secondary,
  },
  heading: {
    fontSize: 29,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
  },
  date: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
    textTransform: 'capitalize',
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  action: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 30,
    marginTop: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 14,
  },
  emptyDescription: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});