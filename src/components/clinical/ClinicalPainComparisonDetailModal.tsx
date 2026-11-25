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
  type ClinicalPainZone,
} from '../../types/clinicalPain';

import {
  getPainComparisonStatusInfo,
  type PainZoneComparison,
} from '../../utils/clinicalPainComparison';

import {
  formatPainEvolutionNumber,
} from '../../utils/clinicalPainEvolution';

import {
  getMapEvaColors,
} from './ClinicalBodyDiagram';

interface Props {
  visible: boolean;
  region: PainZoneComparison | null;
  initialDate: string;
  finalDate: string;
  onClose: () => void;
}

function formatDateTime(value: string): string {
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
    second: '2-digit',
  });
}

function getPainTypeLabel(
  zone: ClinicalPainZone | null
): string {
  if (!zone) return 'Sin valoración';

  return (
    PAIN_TYPES.find(
      (item) => item.value === zone.painType
    )?.label ?? 'No especificado'
  );
}

function getFrequencyLabel(
  zone: ClinicalPainZone | null
): string {
  if (!zone) return 'Sin valoración';

  return (
    PAIN_FREQUENCIES.find(
      (item) => item.value === zone.frequency
    )?.label ?? 'No especificada'
  );
}

function getObservations(
  zone: ClinicalPainZone | null
): string {
  if (!zone) return 'Sin valoración';

  return (
    zone.observations?.trim() ||
    'Sin observaciones registradas'
  );
}

export default function ClinicalPainComparisonDetailModal({
  visible,
  region,
  initialDate,
  finalDate,
  onClose,
}: Props) {
  if (!region) {
    return null;
  }

  const statusInfo =
    getPainComparisonStatusInfo(region.status);

  const renderEvaCard = (
    label: string,
    date: string,
    zone: ClinicalPainZone | null
  ) => {
    const eva = zone?.eva ?? null;

    const color =
      eva === null
        ? '#64748B'
        : getMapEvaColors(eva).stroke;

    return (
      <View style={styles.evaCard}>
        <Text style={styles.evaLabel}>
          {label}
        </Text>

        <Text style={styles.date}>
          {formatDateTime(date)}
        </Text>

        <Text
          style={[
            styles.evaValue,
            { color },
          ]}
        >
          {eva === null ? '—' : eva}

          {eva !== null && (
            <Text style={styles.evaUnit}>
              /10
            </Text>
          )}
        </Text>

        {eva !== null ? (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${eva * 10}%`,
                  backgroundColor: color,
                },
              ]}
            />
          </View>
        ) : (
          <Text style={styles.missingText}>
            Sin valoración
          </Text>
        )}
      </View>
    );
  };

  const renderComparisonField = (
    title: string,
    initialValue: string,
    finalValue: string,
    changed: boolean | null
  ) => (
    <View style={styles.fieldCard}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldTitle}>
          {title}
        </Text>

        <View
          style={[
            styles.changeBadge,
            changed === true &&
              styles.changedBadge,
            changed === false &&
              styles.unchangedBadge,
          ]}
        >
          <Text
            style={[
              styles.changeText,
              changed === true &&
                styles.changedText,
              changed === false &&
                styles.unchangedText,
            ]}
          >
            {changed === null
              ? 'No comparable'
              : changed
                ? 'Modificado'
                : 'Sin cambios'}
          </Text>
        </View>
      </View>

      <View style={styles.fieldValue}>
        <Text style={styles.fieldLabel}>
          Valoración de referencia
        </Text>

        <Text style={styles.fieldText}>
          {initialValue}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.fieldValue}>
        <Text style={styles.fieldLabel}>
          Valoración posterior
        </Text>

        <Text style={styles.fieldText}>
          {finalValue}
        </Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons
                name="git-compare-outline"
                size={25}
                color="#2563EB"
              />
            </View>

            <View style={styles.headerContent}>
              <Text style={styles.title}>
                Detalle comparativo
              </Text>

              <Text style={styles.subtitle}>
                Valoraciones clínicas del dolor
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar detalle comparativo"
              style={styles.closeButton}
              onPress={onClose}
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
            showsVerticalScrollIndicator
          >
            {/* REGIÓN ANATÓMICA */}

            <View style={styles.regionCard}>
              <Ionicons
                name="body-outline"
                size={28}
                color="#2563EB"
              />

              <View style={styles.headerContent}>
                <Text style={styles.regionName}>
                  {region.zoneName}
                </Text>

                <Text style={styles.subtitle}>
                  {region.view === 'front'
                    ? 'Vista anterior'
                    : 'Vista posterior'}
                </Text>
              </View>
            </View>

            {/* INTENSIDAD EVA */}

            <Text style={styles.sectionTitle}>
              Intensidad del dolor
            </Text>

            <View style={styles.evaRow}>
              {renderEvaCard(
                'Referencia',
                initialDate,
                region.initial
              )}

              <Ionicons
                name="arrow-forward-outline"
                size={20}
                color="#64748B"
              />

              {renderEvaCard(
                'Posterior',
                finalDate,
                region.final
              )}
            </View>

            {/* RESULTADO COMPARATIVO */}

            <View
              style={[
                styles.resultCard,
                {
                  backgroundColor:
                    statusInfo.background,
                },
              ]}
            >
              <Ionicons
                name={statusInfo.icon}
                size={32}
                color={statusInfo.color}
              />

              <View style={styles.headerContent}>
                <Text
                  style={[
                    styles.resultTitle,
                    {
                      color: statusInfo.color,
                    },
                  ]}
                >
                  {statusInfo.label}
                </Text>

                {region.difference !== null && (
                  <Text
                    style={[
                      styles.resultValue,
                      {
                        color: statusInfo.color,
                      },
                    ]}
                  >
                    {region.difference > 0
                      ? '+'
                      : ''}
                    {region.difference} puntos EVA
                  </Text>
                )}

                {region.reductionPercentage !== null && (
                  <Text
                    style={[
                      styles.resultPercentage,
                      {
                        color: statusInfo.color,
                      },
                    ]}
                  >
                    {region.reductionPercentage === 0
                      ? '0 % de variación'
                      : `${formatPainEvolutionNumber(
                          Math.abs(
                            region.reductionPercentage
                          )
                        )} % de ${
                          region.reductionPercentage > 0
                            ? 'reducción'
                            : 'aumento'
                        }`}
                  </Text>
                )}

                {region.initial?.eva === 0 &&
                  region.final !== null &&
                  region.reductionPercentage === null && (
                    <Text style={styles.helpText}>
                      No se calcula el porcentaje
                      porque el EVA inicial es cero.
                    </Text>
                  )}

                {region.status === 'new' && (
                  <Text style={styles.helpText}>
                    No existe una valoración anterior
                    comparable de esta región.
                  </Text>
                )}

                {region.status === 'notReassessed' && (
                  <Text style={styles.helpText}>
                    Esta región no fue reevaluada.
                    No podemos determinar si su
                    intensidad ha cambiado.
                  </Text>
                )}
              </View>
            </View>

            {/* CARACTERÍSTICAS DEL DOLOR */}

            <Text style={styles.sectionTitle}>
              Características del dolor
            </Text>

            {renderComparisonField(
              'Tipo de dolor',
              getPainTypeLabel(region.initial),
              getPainTypeLabel(region.final),
              region.painTypeChanged
            )}

            {renderComparisonField(
              'Frecuencia del dolor',
              getFrequencyLabel(region.initial),
              getFrequencyLabel(region.final),
              region.frequencyChanged
            )}

            {renderComparisonField(
              'Observaciones clínicas',
              getObservations(region.initial),
              getObservations(region.final),
              region.observationsChanged
            )}

            {/* AVISO CLÍNICO */}

            <View style={styles.infoCard}>
              <Ionicons
                name="information-circle-outline"
                size={23}
                color="#475569"
              />

              <Text style={styles.infoText}>
                La comparación refleja los datos
                registrados en ambas valoraciones.
                Una reducción del EVA no implica
                necesariamente una recuperación
                clínica completa.
              </Text>
            </View>

            <View style={styles.readOnly}>
              <Ionicons
                name="lock-closed-outline"
                size={15}
                color="#64748B"
              />

              <Text style={styles.readOnlyText}>
                Consulta clínica · Solo lectura
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              style={styles.footerButton}
              onPress={onClose}
            >
              <Text style={styles.footerButtonText}>
                Cerrar detalle
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(15,23,42,0.55)',
  },

  modal: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  headerIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
  },

  headerContent: {
    flex: 1,
  },

  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },

  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 5,
  },

  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },

  scroll: {
    flexShrink: 1,
  },

  content: {
    padding: 16,
    paddingBottom: 24,
  },

  regionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
  },

  regionName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E3A8A',
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 22,
    marginBottom: 12,
  },

  evaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  evaCard: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  evaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },

  date: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
  },

  evaValue: {
    fontSize: 35,
    fontWeight: '700',
    marginVertical: 12,
  },

  evaUnit: {
    fontSize: 14,
    color: '#94A3B8',
  },

  progressTrack: {
    width: '100%',
    height: 7,
    borderRadius: 5,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 5,
  },

  missingText: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
  },

  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginTop: 14,
  },

  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
  },

  resultValue: {
    fontSize: 23,
    fontWeight: '700',
    marginTop: 6,
  },

  resultPercentage: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 5,
  },

  helpText: {
    fontSize: 11,
    lineHeight: 18,
    color: '#475569',
    marginTop: 6,
  },

  fieldCard: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },

  fieldHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },

  fieldTitle: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },

  changeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },

  changedBadge: {
    backgroundColor: '#EFF6FF',
  },

  unchangedBadge: {
    backgroundColor: '#F1F5F9',
  },

  changeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },

  changedText: {
    color: '#1D4ED8',
  },

  unchangedText: {
    color: '#475569',
  },

  fieldValue: {
    paddingVertical: 3,
  },

  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },

  fieldText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
  },

  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    marginTop: 6,
  },

  infoText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 18,
    color: '#475569',
  },

  readOnly: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
  },

  readOnlyText: {
    fontSize: 11,
    color: '#64748B',
  },

  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },

  footerButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },

  footerButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
