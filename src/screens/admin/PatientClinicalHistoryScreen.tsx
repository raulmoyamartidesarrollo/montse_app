import React, { useState } from 'react';

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import type {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type {
  AdminPatientsStackParamList,
} from '../../navigation/AdminPatientsNavigator';

import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<
  AdminPatientsStackParamList,
  'PatientClinicalHistory'
>;

type ClinicalTab =
  | 'evolution'
  | 'painMap'
  | 'history';

const tabs: {
  id: ClinicalTab;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  {
    id: 'evolution',
    label: 'Evolución',
    icon: 'pulse-outline',
  },
  {
    id: 'painMap',
    label: 'Mapa del dolor',
    icon: 'body-outline',
  },
  {
    id: 'history',
    label: 'Antecedentes',
    icon: 'document-text-outline',
  },
];

export default function PatientClinicalHistoryScreen({
  route,
  navigation,
}: Props) {
  const insets = useSafeAreaInsets();

  const { patientName } = route.params;

  const [activeTab, setActiveTab] =
    useState<ClinicalTab>('evolution');

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, 16) },
        ]}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.text}
          />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
            Historial clínico
          </Text>

          <Text style={styles.headerSubtitle}>
            MA Fisioterapia y Bienestar
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: Math.max(insets.bottom, 24) + 90,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.patientCard}>
          <View style={styles.avatar}>
            <Ionicons
              name="person-outline"
              size={30}
              color={colors.primary}
            />
          </View>

          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>
              {patientName}
            </Text>

            <Text style={styles.patientDescription}>
              Expediente clínico del paciente
            </Text>
          </View>
        </View>

        <View style={styles.tabsContainer}>
          {tabs.map((tab) => {
            const selected = activeTab === tab.id;

            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tab,
                  selected && styles.activeTab,
                ]}
              >
                <Ionicons
                  name={tab.icon}
                  size={19}
                  color={
                    selected
                      ? colors.primary
                      : colors.textMuted
                  }
                />

                <Text
                  style={[
                    styles.tabText,
                    selected && styles.activeTabText,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {activeTab === 'evolution' && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="pulse-outline"
                size={22}
                color={colors.primary}
              />

              <Text style={styles.sectionTitle}>
                Evolución y sesiones
              </Text>
            </View>

            <Text style={styles.sectionDescription}>
              Aquí mostraremos la evolución del paciente,
              la escala de dolor EVA y el historial
              cronológico de tratamientos realizados.
            </Text>
          </View>
        )}

        {activeTab === 'painMap' && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="body-outline"
                size={22}
                color={colors.primary}
              />

              <Text style={styles.sectionTitle}>
                Mapa del dolor
              </Text>
            </View>

            <Text style={styles.sectionDescription}>
              Aquí incorporaremos una representación
              corporal para registrar las zonas afectadas
              y su evolución.
            </Text>
          </View>
        )}

        {activeTab === 'history' && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="document-text-outline"
                size={22}
                color={colors.primary}
              />

              <Text style={styles.sectionTitle}>
                Antecedentes clínicos
              </Text>
            </View>

            <Text style={styles.sectionDescription}>
              Aquí mostraremos el motivo de consulta,
              la zona afectada, los antecedentes médicos,
              las observaciones internas y las
              indicaciones para el paciente.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 18,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },

  backButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  headerText: {
    flex: 1,
  },

  headerTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    color: colors.text,
  },

  headerSubtitle: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },

  content: {
    padding: 18,
  },

  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  patientInfo: {
    flex: 1,
  },

  patientName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: colors.text,
  },

  patientDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 5,
  },

  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 5,
    marginBottom: 20,
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 3,
    borderRadius: 11,
    gap: 6,
  },

  activeTab: {
    backgroundColor: colors.background,
  },

  tabText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },

  activeTabText: {
    color: colors.primary,
  },

  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },

  sectionTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17,
    color: colors.text,
    flex: 1,
  },

  sectionDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 23,
  },
});