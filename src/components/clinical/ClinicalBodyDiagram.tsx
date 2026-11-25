import React from 'react';

import Svg, {
  Circle,
  Path,
  G,
} from 'react-native-svg';

import { BODY_ZONES } from '../../constants/bodyZones';

import type {
  BodyView,
  BodyZone,
} from '../../types/clinicalPain';

export interface ClinicalBodyZoneColors {
  fill: string;
  stroke: string;
}

interface Props {
  bodyView: BodyView;
  zoneColors?: Record<string, ClinicalBodyZoneColors>;
  legacyZoneIds?: readonly string[];
  selectedZoneId?: string | null;
  width?: number | string;
  height?: number | string;
  onZonePress?: (zone: BodyZone) => void;
}

export function getMapEvaColors(
  eva: number
): ClinicalBodyZoneColors {
  if (eva === 0) {
    return {
      fill: '#3B82F6',
      stroke: '#1D4ED8',
    };
  }

  if (eva < 4) {
    return {
      fill: '#22C55E',
      stroke: '#15803D',
    };
  }

  if (eva < 7) {
    return {
      fill: '#F59E0B',
      stroke: '#B45309',
    };
  }

  return {
    fill: '#EF4444',
    stroke: '#B91C1C',
  };
}

export default function ClinicalBodyDiagram({
  bodyView,
  zoneColors = {},
  legacyZoneIds = [],
  selectedZoneId = null,
  width = 260,
  height = 480,
  onZonePress,
}: Props) {
  const visibleZones = [
    ...BODY_ZONES.filter(
      (zone) =>
        zone.view === bodyView &&
        !zone.legacy
    ),
    ...BODY_ZONES.filter(
      (zone) =>
        zone.view === bodyView &&
        zone.legacy &&
        legacyZoneIds.includes(zone.id)
    ),
  ];

  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 200 380"
    >
      <G pointerEvents="none">
        {visibleZones.map((zone) => {
          const painColors = zoneColors[zone.id];
          const selected = Boolean(painColors);
          const highlighted = selectedZoneId === zone.id;

          return (
            <Path
              key={zone.id}
              d={zone.path}
              fill={
                selected && painColors
                  ? painColors.fill
                  : zone.category === 'joint'
                    ? '#94A3B8'
                    : zone.category === 'tendon'
                      ? '#B0C4DE'
                      : '#CBD5E1'
              }
              stroke={
                highlighted
                  ? '#0F172A'
                  : painColors?.stroke ?? '#64748B'
              }
              strokeWidth={highlighted ? 3 : selected ? 2 : 1}
            />
          );
        })}
      </G>

      {/* DETALLES ANATÓMICOS */}
      <G pointerEvents="none">

        {bodyView === 'front' ? (
          <G
            stroke="#475569"
            strokeWidth={1.1}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={0.8}
          >
            {/* CARA */}
            <Circle
              cx="93"
              cy="29"
              r="1.8"
              fill="#475569"
              stroke="none"
            />

            <Circle
              cx="107"
              cy="29"
              r="1.8"
              fill="#475569"
              stroke="none"
            />

            {/* Cejas */}
            <Path d="M89 25 Q93 23 97 25" />
            <Path d="M103 25 Q107 23 111 25" />

            {/* Nariz */}
            <Path d="M100 31 L98 39 Q100 41 102 39" />

            {/* Boca */}
            <Path d="M94 46 Q100 49 106 46" />

            {/* Orejas */}
            <Path d="M81 30 Q75 28 78 38 Q79 42 83 41" />
            <Path d="M119 30 Q125 28 122 38 Q121 42 117 41" />

            {/* CUELLO */}
            <Path d="M95 61 L97 72" />
            <Path d="M105 61 L103 72" />

            {/* CLAVÍCULAS */}
            <Path d="M76 86 Q89 82 98 89" />
            <Path d="M102 89 Q111 82 124 86" />

            {/* PECTORALES */}
            <Path d="M100 90 L100 120" />
            <Path d="M76 109 Q85 125 98 119" />
            <Path d="M124 109 Q115 125 102 119" />

            {/* ABDOMINALES */}
            <Path d="M100 149 L100 185" />

            <Path d="M83 151 Q90 148 97 152" />
            <Path d="M103 152 Q110 148 117 151" />

            <Path d="M82 162 Q90 166 97 162" />
            <Path d="M103 162 Q110 166 118 162" />

            <Path d="M83 174 Q90 178 97 174" />
            <Path d="M103 174 Q110 178 117 174" />

            {/* Ombligo */}
            <Circle
              cx="100"
              cy="189"
              r="1.5"
              fill="#475569"
              stroke="none"
            />

            {/* BÍCEPS */}
            <Path d="M48 116 Q39 137 43 154" />
            <Path d="M152 116 Q161 137 157 154" />

            {/* CODOS */}
            <Path d="M36 164 Q41 167 46 165" />
            <Path d="M154 165 Q159 167 164 164" />

            {/* CUÁDRICEPS */}
            <Path d="M85 207 Q77 234 83 253" />
            <Path d="M115 207 Q123 234 117 253" />

            {/* RODILLAS */}
            <Path d="M78 266 Q84 260 91 266 L89 276 Q84 280 79 276 Z" />
            <Path d="M109 266 Q116 260 122 266 L121 276 Q116 280 111 276 Z" />

            {/* TIBIAS */}
            <Path d="M84 284 L85 329" />
            <Path d="M116 284 L115 329" />

            {/* DEDOS DE LOS PIES */}
            <Path d="M71 360 L71 367" />
            <Path d="M77 359 L77 368" />
            <Path d="M83 358 L83 368" />
            <Path d="M90 357 L90 368" />

            <Path d="M110 357 L110 368" />
            <Path d="M117 358 L117 368" />
            <Path d="M123 359 L123 368" />
            <Path d="M129 360 L129 367" />
          </G>

        ) : (

          <G
            stroke="#475569"
            strokeWidth={1.1}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={0.8}
          >
            {/* PELO POSTERIOR */}
            <Path
              d="M85 18 Q100 6 115 18
                 Q122 30 116 43
                 L110 48
                 Q100 43 90 48
                 L84 43
                 Q78 30 85 18 Z"
              fill="#64748B"
              stroke="#475569"
            />

            {/* Textura del pelo */}
            <G stroke="#94A3B8" strokeWidth={0.9}>
              <Path d="M89 19 Q86 30 91 42" />
              <Path d="M95 15 Q91 30 96 43" />
              <Path d="M101 14 Q97 29 101 42" />
              <Path d="M107 16 Q104 30 106 43" />
              <Path d="M113 20 Q110 31 112 42" />
            </G>

            {/* Orejas posteriores */}
            <Path d="M81 30 Q75 28 78 38 Q79 42 83 41" />
            <Path d="M119 30 Q125 28 122 38 Q121 42 117 41" />

            {/* CERVICALES */}
            <Path d="M95 59 L96 72" />
            <Path d="M105 59 L104 72" />

            {/* TRAPECIOS */}
            <Path d="M100 78 Q88 91 73 96" />
            <Path d="M100 78 Q112 91 127 96" />

            {/* OMÓPLATOS */}
            <Path d="M81 96 Q74 109 82 125 L94 111 Z" />
            <Path d="M119 96 Q126 109 118 125 L106 111 Z" />

            {/* COLUMNA VERTEBRAL */}
            <Path
              d="M100 76
                 Q98 105 100 130
                 Q102 155 100 190"
              strokeWidth={1.7}
            />

            {/* Vértebras */}
            {[82, 90, 98, 106, 114, 122, 130,
              138, 150, 158, 166, 174, 182].map((y) => (
              <Path
                key={y}
                d={`M97 ${y} Q100 ${y + 2} 103 ${y}`}
                strokeWidth={0.8}
              />
            ))}

            {/* MUSCULATURA LUMBAR */}
            <Path d="M91 148 Q83 164 91 187" />
            <Path d="M109 148 Q117 164 109 187" />

            <Path d="M77 180 Q87 184 94 192" />
            <Path d="M123 180 Q113 184 106 192" />

            {/* GLÚTEOS */}
            <Path d="M77 200 Q71 213 84 218 Q95 219 97 207" />
            <Path d="M123 200 Q129 213 116 218 Q105 219 103 207" />

            {/* TRÍCEPS */}
            <Path d="M48 116 Q37 137 43 154" />
            <Path d="M152 116 Q163 137 157 154" />

            {/* CODOS POSTERIORES */}
            <Circle cx="41" cy="166" r="3" />
            <Circle cx="159" cy="166" r="3" />

            {/* ISQUIOTIBIALES */}
            <Path d="M84 222 Q77 240 84 257" />
            <Path d="M116 222 Q123 240 116 257" />

            {/* PARTE POSTERIOR DE RODILLAS */}
            <Path d="M77 267 Q84 272 92 267" />
            <Path d="M108 267 Q116 272 123 267" />

            {/* GEMELOS */}
            <Path d="M78 280 Q72 301 83 316 Q92 302 89 280" />
            <Path d="M111 280 Q108 302 117 316 Q128 301 122 280" />

            {/* TENDONES DE AQUILES */}
            <Path d="M83 316 L85 338" />
            <Path d="M117 316 L115 338" />

            {/* TALONES */}
            <Path d="M77 349 Q85 345 91 349 L90 362 Q84 366 77 362 Z" />
            <Path d="M109 349 Q115 345 123 349 L123 362 Q116 366 110 362 Z" />

          </G>
        )}

      </G>
      {/* CAPA INTERACTIVA SUPERIOR */}
      <G>
        {visibleZones.map((zone) => (
          <Path
            key={`touch-${zone.id}`}
            d={zone.path}
            fill="#000000"
            fillOpacity={0.01}
            stroke="none"
            onPress={onZonePress ? () => onZonePress(zone) : undefined}
          />
        ))}
      </G>
    </Svg>
  );
}
