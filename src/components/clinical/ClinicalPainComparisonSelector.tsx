import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import type {
  ClinicalPainAssessment,
} from '../../types/clinicalPain';

import {
  getPainEvaColor,
  formatPainEvolutionNumber,
} from '../../utils/clinicalPainEvolution';

interface Props {
  assessments: ClinicalPainAssessment[];
  initialAssessmentId: string | null;
  finalAssessmentId: string | null;
  onChange: (
    initialAssessmentId: string | null,
    finalAssessmentId: string | null
  ) => void;
}

type SelectorType = 'initial' | 'final';

function getTimestamp(
  assessment: ClinicalPainAssessment
): number {
  return assessment.createdAt
    ? Date.parse(assessment.createdAt)
    : NaN;
}

function formatDateTime(
  value: string | null
): string {
  if (!value) return 'Sin fecha';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha';
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

function getAssessmentSummary(
  assessment: ClinicalPainAssessment
) {
  const validZones = assessment.zones.filter(
    (zone) =>
      Number.isInteger(zone.eva) &&
      zone.eva >= 0 &&
      zone.eva <= 10
  );

  const average =
    validZones.length > 0
      ? validZones.reduce(
          (total, zone) => total + zone.eva,
          0
        ) / validZones.length
      : null;

  return {
    count: validZones.length,
    average,
  };
}

export default function ClinicalPainComparisonSelector({
  assessments,
  initialAssessmentId,
  finalAssessmentId,
  onChange,
}: Props) {
  const [openSelector, setOpenSelector] =
    useState<SelectorType | null>(null);

  const orderedAssessments = useMemo(
    () =>
      assessments
        .filter((assessment) =>
          Number.isFinite(getTimestamp(assessment))
        )
        .sort(
          (a, b) =>
            getTimestamp(a) - getTimestamp(b) ||
            a.assessmentId.localeCompare(
              b.assessmentId
            )
        ),
    [assessments]
  );

  const initialAssessment =
    orderedAssessments.find(
      (assessment) =>
        assessment.assessmentId ===
        initialAssessmentId
    ) ?? null;

  const finalAssessment =
    orderedAssessments.find(
      (assessment) =>
        assessment.assessmentId ===
        finalAssessmentId
    ) ?? null;

  const firstAssessment =
    orderedAssessments[0] ?? null;

  const lastAssessment =
    orderedAssessments[
      orderedAssessments.length - 1
    ] ?? null;

  const canCompare = Boolean(
    firstAssessment &&
    lastAssessment &&
    getTimestamp(lastAssessment) >
      getTimestamp(firstAssessment)
  );

  useEffect(() => {
    if (
      !canCompare ||
      !firstAssessment ||
      !lastAssessment
    ) {
      if (
        initialAssessmentId !== null ||
        finalAssessmentId !== null
      ) {
        onChange(null, null);
      }

      return;
    }

    const validSelection = Boolean(
      initialAssessment &&
      finalAssessment &&
      initialAssessment.assessmentId !==
        finalAssessment.assessmentId &&
      getTimestamp(finalAssessment) >
        getTimestamp(initialAssessment)
    );

    if (!validSelection) {
      onChange(
        firstAssessment.assessmentId,
        lastAssessment.assessmentId
      );
    }
  }, [
    canCompare,
    firstAssessment,
    lastAssessment,
    initialAssessment,
    finalAssessment,
    initialAssessmentId,
    finalAssessmentId,
    onChange,
  ]);

  const initialOptions = orderedAssessments.filter(
    (assessment) =>
      lastAssessment !== null &&
      getTimestamp(assessment) <
        getTimestamp(lastAssessment)
  );

  const finalOptions = orderedAssessments.filter(
    (assessment) =>
      initialAssessment !== null &&
      getTimestamp(assessment) >
        getTimestamp(initialAssessment)
  );

  const handleSelectInitial = (
    assessment: ClinicalPainAssessment
  ) => {
    const currentFinalIsValid =
      finalAssessment !== null &&
      getTimestamp(finalAssessment) >
        getTimestamp(assessment);

    const nextFinal = currentFinalIsValid
      ? finalAssessment
      : lastAssessment;

    if (
      !nextFinal ||
      getTimestamp(nextFinal) <=
        getTimestamp(assessment)
    ) {
      return;
    }

    onChange(
      assessment.assessmentId,
      nextFinal.assessmentId
    );

    setOpenSelector(null);
  };

  const handleSelectFinal = (
    assessment: ClinicalPainAssessment
  ) => {
    if (
      !initialAssessment ||
      getTimestamp(assessment) <=
        getTimestamp(initialAssessment)
    ) {
      return;
    }

    onChange(
      initialAssessment.assessmentId,
      assessment.assessmentId
    );

    setOpenSelector(null);
  };

  const renderAssessmentContent = (
    assessment: ClinicalPainAssessment
  ) => {
    const summary =
      getAssessmentSummary(assessment);

    return (
      <>
        <View style={styles.assessmentContent}>
          <Text style={styles.assessmentDate}>
            {formatDateTime(assessment.createdAt)}
          </Text>

          <Text style={styles.assessmentSubtitle}>
            {summary.count}{' '}
            {summary.count === 1
              ? 'región valorada'
              : 'regiones valoradas'}
          </Text>
        </View>

        <View style={styles.evaContainer}>
          <Text
            style={[
              styles.evaValue,
              {
                color:
                  summary.average === null
                    ? '#64748B'
                    : getPainEvaColor(
                        summary.average
                      ),
              },
            ]}
          >
            {summary.average === null
              ? '—'
              : formatPainEvolutionNumber(
                  summary.average
                )}
          </Text>

          <Text style={styles.evaLabel}>
            EVA medio
          </Text>
        </View>
      </>
    );
  };

  const renderSelector = (
    type: SelectorType,
    label: string,
    assessment: ClinicalPainAssessment | null,
    options: ClinicalPainAssessment[]
  ) => {
    const isOpen = openSelector === type;

    const selectedId =
      type === 'initial'
        ? initialAssessmentId
        : finalAssessmentId;

    return (
      <View style={styles.selectorSection}>
        <Text style={styles.label}>
          {label}
        </Text>

        <Pressable
          style={styles.selector}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{
            expanded: isOpen,
          }}
          onPress={() =>
            setOpenSelector(
              isOpen ? null : type
            )
          }
        >
          <Ionicons
            name="calendar-outline"
            size={21}
            color="#2563EB"
          />

          {assessment ? (
            renderAssessmentContent(assessment)
          ) : (
            <Text style={styles.placeholder}>
              Seleccionar valoración
            </Text>
          )}

          <Ionicons
            name={
              isOpen
                ? 'chevron-up'
                : 'chevron-down'
            }
            size={18}
            color="#64748B"
          />
        </Pressable>

        {isOpen && (
          <View style={styles.options}>
            {options.map((option) => {
              const isSelected =
                option.assessmentId ===
                selectedId;

              return (
                <Pressable
                  key={option.assessmentId}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: isSelected,
                  }}
                  style={[
                    styles.option,
                    isSelected &&
                      styles.optionSelected,
                  ]}
                  onPress={() =>
                    type === 'initial'
                      ? handleSelectInitial(option)
                      : handleSelectFinal(option)
                  }
                >
                  {renderAssessmentContent(option)}

                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#2563EB"
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons
            name="git-compare-outline"
            size={24}
            color="#2563EB"
          />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.title}>
            Comparar valoraciones
          </Text>

          <Text style={styles.subtitle}>
            Selecciona dos momentos del episodio
          </Text>
        </View>
      </View>

      {!canCompare ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name="information-circle-outline"
            size={30}
            color="#64748B"
          />

          <Text style={styles.emptyTitle}>
            Valoraciones insuficientes
          </Text>

          <Text style={styles.emptyText}>
            Se necesitan al menos dos valoraciones
            registradas en momentos distintos para
            realizar una comparación.
          </Text>
        </View>
      ) : (
        <>
          {renderSelector(
            'initial',
            'Valoración de referencia',
            initialAssessment,
            initialOptions
          )}

          <View style={styles.direction}>
            <Ionicons
              name="arrow-down-circle-outline"
              size={27}
              color="#64748B"
            />
          </View>

          {renderSelector(
            'final',
            'Valoración posterior',
            finalAssessment,
            finalOptions
          )}

          <Pressable
            accessibilityRole="button"
            style={styles.resetButton}
            onPress={() => {
              if (
                !firstAssessment ||
                !lastAssessment
              ) {
                return;
              }

              onChange(
                firstAssessment.assessmentId,
                lastAssessment.assessmentId
              );

              setOpenSelector(null);
            }}
          >
            <Ionicons
              name="refresh-outline"
              size={17}
              color="#2563EB"
            />

            <Text style={styles.resetText}>
              Comparar primera y última disponibles
            </Text>
          </Pressable>

          <View style={styles.infoCard}>
            <Ionicons
              name="information-circle-outline"
              size={19}
              color="#475569"
            />

            <Text style={styles.infoText}>
              Las regiones no valoradas no se
              consideran regiones sin dolor.
              Las medias de cada valoración pueden
              incluir regiones diferentes.
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },

  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 12,
    color: '#64748B',
    marginTop: 5,
  },

  selectorSection: {
    marginBottom: 8,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 9,
  },

  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },

  assessmentContent: {
    flex: 1,
  },

  assessmentDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },

  assessmentSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 5,
  },

  evaContainer: {
    alignItems: 'center',
    minWidth: 45,
  },

  evaValue: {
    fontSize: 20,
    fontWeight: '700',
  },

  evaLabel: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 3,
  },

  placeholder: {
    flex: 1,
    fontSize: 13,
    color: '#64748B',
  },

  options: {
    marginTop: 8,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginBottom: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },

  optionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },

  direction: {
    alignItems: 'center',
    paddingVertical: 8,
  },

  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    padding: 12,
    marginTop: 5,
  },

  resetText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },

  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#475569',
  },

  emptyCard: {
    alignItems: 'center',
    gap: 10,
    padding: 24,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 12,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
  },
});
