import React from 'react';

import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  PAIN_TYPES,
  PAIN_FREQUENCIES,
  type BodyZone,
  type ClinicalPainZone,
} from '../../types/clinicalPain';

interface Props {
  visible: boolean;
  zone: BodyZone | null;
  assessment?: ClinicalPainZone;
  assessmentDate?: string | null;
  hasSelectedAssessment: boolean;
  onClose: () => void;
}

const getEvaInfo = (eva: number) => {
  if (eva === 0) {
    return {
      label: 'Sin dolor',
      color: '#1D4ED8',
      background: '#EFF6FF',
    };
  }

  if (eva < 4) {
    return {
      label: 'Dolor leve',
      color: '#15803D',
      background: '#F0FDF4',
    };
  }

  if (eva < 7) {
    return {
      label: 'Dolor moderado',
      color: '#B45309',
      background: '#FFFBEB',
    };
  }

  return {
    label: 'Dolor intenso',
    color: '#B91C1C',
    background: '#FEF2F2',
  };
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return 'Fecha no disponible';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Fecha no disponible';
  }

  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function ClinicalPainZoneDetailModal({
  visible,
  zone,
  assessment,
  assessmentDate,
  hasSelectedAssessment,
  onClose,
}: Props) {
  if (!zone) {
    return null;
  }

  const evaInfo = assessment
    ? getEvaInfo(assessment.eva)
    : null;

  const painTypeLabel = PAIN_TYPES.find(
    (item) => item.value === assessment?.painType
  )?.label ?? 'No especificado';

  const frequencyLabel = PAIN_FREQUENCIES.find(
    (item) => item.value === assessment?.frequency
  )?.label ?? 'No especificada';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={styles.modal}
          accessibilityViewIsModal
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>
                Valoración del dolor
              </Text>

              <View style={styles.readOnlyBadge}>
                <Ionicons
                  name="lock-closed-outline"
                  size={13}
                  color="#64748B"
                />

                <Text style={styles.readOnlyText}>
                  Solo lectura
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.closeIcon}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar consulta"
            >
              <Ionicons
                name="close"
                size={24}
                color="#475569"
              />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.zoneName}>
              {zone.name}
            </Text>

            <Text style={styles.bodyView}>
              {zone.view === 'front'
                ? 'Vista anterior'
                : 'Vista posterior'}
            </Text>

            {hasSelectedAssessment && (
              <View style={styles.dateRow}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color="#64748B"
                />

                <Text style={styles.date}>
                  {formatDate(assessmentDate)}
                </Text>
              </View>
            )}

            {assessment && evaInfo ? (
              <>
                <View
                  style={[
                    styles.evaCard,
                    {
                      backgroundColor: evaInfo.background,
                    },
                  ]}
                >
                  <Text style={styles.evaTitle}>
                    INTENSIDAD DEL DOLOR
                  </Text>

                  <Text
                    style={[
                      styles.evaNumber,
                      { color: evaInfo.color },
                    ]}
                  >
                    {assessment.eva}
                    <Text style={styles.evaTotal}>
                      /10
                    </Text>
                  </Text>

                  <Text
                    style={[
                      styles.evaLabel,
                      { color: evaInfo.color },
                    ]}
                  >
                    {evaInfo.label}
                  </Text>

                  <View
                    style={styles.progressTrack}
                    accessibilityLabel={
                      `Intensidad EVA ${assessment.eva} de 10`
                    }
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${assessment.eva * 10}%`,
                          backgroundColor: evaInfo.color,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.scaleLabels}>
                    <Text style={styles.scaleText}>
                      Sin dolor
                    </Text>

                    <Text style={styles.scaleText}>
                      Máximo
                    </Text>
                  </View>
                </View>

                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Ionicons
                      name="pulse-outline"
                      size={21}
                      color="#2563EB"
                    />

                    <View style={styles.detailText}>
                      <Text style={styles.detailLabel}>
                        Tipo de dolor
                      </Text>

                      <Text style={styles.detailValue}>
                        {painTypeLabel}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.detailRow}>
                    <Ionicons
                      name="time-outline"
                      size={21}
                      color="#2563EB"
                    />

                    <View style={styles.detailText}>
                      <Text style={styles.detailLabel}>
                        Frecuencia
                      </Text>

                      <Text style={styles.detailValue}>
                        {frequencyLabel}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.observationsCard}>
                  <View style={styles.detailRow}>
                    <Ionicons
                      name="document-text-outline"
                      size={20}
                      color="#2563EB"
                    />

                    <Text style={styles.observationsTitle}>
                      Observaciones clínicas
                    </Text>
                  </View>

                  <Text style={styles.observations}>
                    {assessment.observations?.trim()
                      || 'Sin observaciones registradas.'}
                  </Text>
                </View>

                <Text style={styles.disclaimer}>
                  La intensidad corresponde al valor EVA
                  registrado en esta valoración.
                </Text>
              </>
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons
                  name="information-circle-outline"
                  size={38}
                  color="#64748B"
                />

                <Text style={styles.emptyTitle}>
                  {hasSelectedAssessment
                    ? 'Región no valorada'
                    : 'Sin valoración seleccionada'}
                </Text>

                <Text style={styles.emptyText}>
                  {hasSelectedAssessment
                    ? 'Esta región anatómica no fue evaluada en la valoración seleccionada.'
                    : 'Selecciona una valoración del historial para consultar sus regiones anatómicas.'}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
            >
              <Text style={styles.closeButtonText}>
                Cerrar consulta
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    gap: 7,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  readOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  readOnlyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  closeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 0,
  },
  content: {
    padding: 20,
  },
  zoneName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  bodyView: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 5,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
  },
  date: {
    fontSize: 13,
    color: '#64748B',
  },
  evaCard: {
    marginTop: 20,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  evaTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#475569',
  },
  evaNumber: {
    fontSize: 48,
    fontWeight: '800',
    marginTop: 8,
  },
  evaTotal: {
    fontSize: 23,
    color: '#64748B',
    fontWeight: '500',
  },
  evaLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  progressTrack: {
    height: 10,
    width: '100%',
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    marginTop: 18,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
  },
  scaleLabels: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },
  scaleText: {
    fontSize: 10,
    color: '#64748B',
  },
  detailCard: {
    marginTop: 16,
    padding: 15,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailText: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
  },
  observationsCard: {
    marginTop: 16,
    padding: 15,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  observationsTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  observations: {
    marginTop: 12,
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  disclaimer: {
    marginTop: 15,
    fontSize: 11,
    color: '#64748B',
    lineHeight: 17,
  },
  emptyCard: {
    marginTop: 24,
    padding: 22,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 21,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  closeButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
