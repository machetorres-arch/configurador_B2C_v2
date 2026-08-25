import React from 'react';
import { useConcreteHouseStore } from '../../store/concreteHouseStore';
import { DimensionCota } from '../DimensionCota';

export function ConcreteDimensionAnnotations3D() {
  const { dimensions, showDimensions, wallThicknessMm } = useConcreteHouseStore();
  if (!showDimensions) return null;

  const { width: w, length: l, wallHeight: h, levels } = dimensions;
  const totalH = h * levels + (levels === 2 ? 12 : 0);
  const offset = 40; // cm fuera de los muros

  return (
    <group>
      {/* 1. Cota Ancho Frontal (Eje X) */}
      <DimensionCota
        start={[-w / 2, 0, l / 2 + offset]}
        end={[w / 2, 0, l / 2 + offset]}
        label={`ANCHO: ${(w / 100).toFixed(2)} m`}
        color="#f97316"
        fontSize={14}
        textOffset={[0, 10, 0]}
        tickSize={10}
        extensionStart={[-w / 2, 0, l / 2]}
        extensionEnd={[w / 2, 0, l / 2]}
      />

      {/* 2. Cota Largo Lateral (Eje Z) */}
      <DimensionCota
        start={[w / 2 + offset, 0, -l / 2]}
        end={[w / 2 + offset, 0, l / 2]}
        label={`LARGO: ${(l / 100).toFixed(2)} m`}
        color="#f97316"
        fontSize={14}
        textOffset={[0, 10, 0]}
        tickSize={10}
        extensionStart={[w / 2, 0, -l / 2]}
        extensionEnd={[w / 2, 0, l / 2]}
      />

      {/* 3. Cota Altura (Eje Y) */}
      <DimensionCota
        start={[-w / 2 - offset, 0, l / 2]}
        end={[-w / 2 - offset, totalH, l / 2]}
        label={`ALTURA: ${(totalH / 100).toFixed(2)} m (${levels} ${levels === 1 ? 'Piso' : 'Pisos'})`}
        color="#38bdf8"
        fontSize={14}
        textOffset={[-15, 0, 0]}
        tickSize={10}
        extensionStart={[-w / 2, 0, l / 2]}
        extensionEnd={[-w / 2, totalH, l / 2]}
      />
    </group>
  );
}
