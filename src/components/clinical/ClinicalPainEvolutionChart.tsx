import React, { useState } from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Svg, {
  Circle,
  Line,
  Polyline,
  Text as SvgText,
} from 'react-native-svg';

import {
  getPainEvaColor,
  type PainEvolutionPoint,
} from '../../utils/clinicalPainEvolution';

interface Props {
  points: PainEvolutionPoint[];
  selectedAssessmentId?: string | null;
  onPointPress?: (point: PainEvolutionPoint) => void;
}

const CHART_HEIGHT = 260;

const PADDING = {
  top: 25,
  bottom: 42,
  left: 34,
  right: 20,
};

const EVA_LEVELS = [0, 2, 4, 6, 8, 10];

function formatShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(
    'es-ES',
    {
      day: '2-digit',
      month: '2-digit',
    }
  );
}

export default function ClinicalPainEvolutionChart({
  points,
  selectedAssessmentId,
  onPointPress,
}: Props) {
  const [width, setWidth] = useState(0);

  const orderedPoints = [...points].sort(
    (a, b) =>
      a.timestamp - b.timestamp ||
      a.assessmentId.localeCompare(b.assessmentId)
  );

  if (orderedPoints.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>
          Sin datos de evolución
        </Text>

        <Text style={styles.emptyText}>
          No existen valoraciones con fecha válida
          para esta región anatómica.
        </Text>
      </View>
    );
  }

  const chartWidth = Math.max(
    0,
    width - PADDING.left - PADDING.right
  );

  const chartHeight =
    CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const firstTimestamp =
    orderedPoints[0].timestamp;

  const lastTimestamp =
    orderedPoints[orderedPoints.length - 1].timestamp;

  const timeRange =
    lastTimestamp - firstTimestamp;

  const getX = (timestamp: number) => {
    if (timeRange === 0) {
      return PADDING.left + chartWidth / 2;
    }

    return (
      PADDING.left +
      ((timestamp - firstTimestamp) / timeRange) *
        chartWidth
    );
  };

  const getY = (eva: number) =>
    PADDING.top +
    chartHeight -
    (eva / 10) * chartHeight;

  const coordinates = orderedPoints.map((point) => ({
    point,
    x: getX(point.timestamp),
    y: getY(point.eva),
  }));

  const linePoints = coordinates
    .map(({ x, y }) => `${x},${y}`)
    .join(' ');

  const labelCount =
    timeRange === 0
      ? 1
      : width < 300
        ? 2
        : 3;

  const dateLabels = Array.from(
    { length: labelCount },
    (_, index) => {
      if (labelCount === 1) {
        return firstTimestamp;
      }

      return (
        firstTimestamp +
        (timeRange * index) / (labelCount - 1)
      );
    }
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Evolución de intensidad EVA
        </Text>

        <Text style={styles.subtitle}>
          {orderedPoints.length}{' '}
          {orderedPoints.length === 1
            ? 'valoración registrada'
            : 'valoraciones registradas'}
        </Text>
      </View>

      <View
        style={styles.chartContainer}
        onLayout={(event) => {
          setWidth(event.nativeEvent.layout.width);
        }}
      >
        {width > PADDING.left + PADDING.right && (
          <Svg
            width={width}
            height={CHART_HEIGHT}
          >
            {/* Líneas horizontales de referencia */}
            {EVA_LEVELS.map((level) => (
              <React.Fragment key={level}>
                <Line
                  x1={PADDING.left}
                  y1={getY(level)}
                  x2={width - PADDING.right}
                  y2={getY(level)}
                  stroke="#E2E8F0"
                  strokeWidth={1}
                  strokeDasharray={
                    level === 0 ? undefined : '4 4'
                  }
                />

                <SvgText
                  x={PADDING.left - 10}
                  y={getY(level) + 4}
                  fontSize={11}
                  fill="#64748B"
                  textAnchor="end"
                >
                  {level}
                </SvgText>
              </React.Fragment>
            ))}

            {/* Eje vertical */}
            <Line
              x1={PADDING.left}
              y1={PADDING.top}
              x2={PADDING.left}
              y2={getY(0)}
              stroke="#94A3B8"
              strokeWidth={1}
            />

            {/* Eje horizontal */}
            <Line
              x1={PADDING.left}
              y1={getY(0)}
              x2={width - PADDING.right}
              y2={getY(0)}
              stroke="#94A3B8"
              strokeWidth={1}
            />

            {/* Línea de evolución */}
            {coordinates.length > 1 &&
              timeRange > 0 && (
                <Polyline
                  points={linePoints}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}

            {/* Fechas de referencia */}
            {dateLabels.map((timestamp, index) => (
              <SvgText
                key={`${timestamp}-${index}`}
                x={getX(timestamp)}
                y={CHART_HEIGHT - 15}
                fontSize={10}
                fill="#64748B"
                textAnchor={
                  labelCount === 1
                    ? 'middle'
                    : index === 0
                      ? 'start'
                      : index === labelCount - 1
                        ? 'end'
                        : 'middle'
                }
              >
                {formatShortDate(timestamp)}
              </SvgText>
            ))}

            {/* Puntos visibles */}
            {coordinates.map(({ point, x, y }) => {
              const selected =
                point.assessmentId ===
                selectedAssessmentId;

              return (
                <React.Fragment
                  key={point.assessmentId}
                >
                  {selected && (
                    <Circle
                      cx={x}
                      cy={y}
                      r={11}
                      fill="#DBEAFE"
                      stroke="#2563EB"
                      strokeWidth={1}
                    />
                  )}

                  <Circle
                    cx={x}
                    cy={y}
                    r={selected ? 6.5 : 5}
                    fill={getPainEvaColor(point.eva)}
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                  />

                  {(selected ||
                    coordinates.length <= 6) && (
                    <SvgText
                      x={x}
                      y={y - 12}
                      fontSize={11}
                      fontWeight="bold"
                      fill={getPainEvaColor(point.eva)}
                      textAnchor="middle"
                    >
                      {point.eva}
                    </SvgText>
                  )}
                </React.Fragment>
              );
            })}

            {/* Capa interactiva superior */}
            {coordinates.map(({ point, x, y }) => (
              <Circle
                key={`touch-${point.assessmentId}`}
                cx={x}
                cy={y}
                r={16}
                fill="#000000"
                fillOpacity={0.01}
                onPress={() => onPointPress?.(point)}
              />
            ))}
          </Svg>
        )}
      </View>

      <View style={styles.legend}>
        {[
          { eva: 0, label: 'Sin dolor' },
          { eva: 2, label: 'Leve' },
          { eva: 5, label: 'Moderado' },
          { eva: 8, label: 'Intenso' },
        ].map((item) => (
          <View
            key={item.eva}
            style={styles.legendItem}
          >
            <View
              style={[
                styles.legendDot,
                {
                  backgroundColor:
                    getPainEvaColor(item.eva),
                },
              ]}
            />

            <Text style={styles.legendText}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.helpText}>
        Pulsa sobre un punto para consultar
        los detalles de la valoración.
      </Text>

      {orderedPoints.length === 1 && (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Se necesitan al menos dos valoraciones
            realizadas en momentos distintos para
            comparar la evolución del dolor.
          </Text>
        </View>
      )}

      {orderedPoints.length > 1 && timeRange === 0 && (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Las valoraciones tienen la misma fecha
            y hora. Consulta el historial detallado
            para acceder a cada registro.
          </Text>
        </View>
      )}

      <Text style={styles.disclaimer}>
        La gráfica representa las intensidades
        registradas. Las líneas no indican mediciones
        realizadas entre valoraciones ni determinan
        por sí solas la recuperación clínica.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    marginVertical: 12,
  },

  header: {
    marginBottom: 15,
  },

  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },

  subtitle: {
    marginTop: 5,
    fontSize: 12,
    color: '#64748B',
  },

  chartContainer: {
    width: '100%',
    minHeight: CHART_HEIGHT,
  },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 6,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  legendText: {
    fontSize: 10,
    color: '#475569',
  },

  helpText: {
    marginTop: 15,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: '#2563EB',
  },

  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
    marginTop: 15,
  },

  infoText: {
    fontSize: 12,
    lineHeight: 19,
    color: '#1E40AF',
  },

  disclaimer: {
    marginTop: 14,
    fontSize: 11,
    lineHeight: 17,
    color: '#64748B',
  },

  emptyContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },

  emptyText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'center',
  },
});
