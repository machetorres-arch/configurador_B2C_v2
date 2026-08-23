import React, { useMemo } from 'react';
import { Line, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { useSipHouseStore, getInteriorZones } from '../../store/sipHouseStore';

interface SimpleCotaProps {
  start: [number, number, number];
  end: [number, number, number];
  label: string;
  color?: string;
  fontSize?: number;
  tickSize?: number;
  offsetY?: number;
}

/**
 * Cota limpia y estilizada estándar (idéntica a los otros configuradores de la suite)
 * Utiliza Drei Line + Billboard Text para máxima legibilidad sin saturar la vista con tarjetas HTML
 */
function SimpleCota3D({
  start,
  end,
  label,
  color = '#38bdf8',
  fontSize = 0.22,
  tickSize = 0.12,
  offsetY = 0,
}: SimpleCotaProps) {
  const p1 = new THREE.Vector3(...start);
  const p2 = new THREE.Vector3(...end);
  const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  mid.y += offsetY;

  const dir = new THREE.Vector3().subVectors(p2, p1);
  const length = dir.length();

  const up = new THREE.Vector3(0, 1, 0);
  let normal = new THREE.Vector3().crossVectors(dir, up).normalize();
  if (normal.lengthSq() < 0.001) {
    normal = new THREE.Vector3(1, 0, 0);
  }

  const startTickA = new THREE.Vector3().addVectors(p1, normal.clone().multiplyScalar(-tickSize));
  const startTickB = new THREE.Vector3().addVectors(p1, normal.clone().multiplyScalar(tickSize));
  const endTickA = new THREE.Vector3().addVectors(p2, normal.clone().multiplyScalar(-tickSize));
  const endTickB = new THREE.Vector3().addVectors(p2, normal.clone().multiplyScalar(tickSize));

  if (length <= 0.05) return null;

  return (
    <group renderOrder={999}>
      {/* Línea principal */}
      <Line
        points={[start, end]}
        color={color}
        lineWidth={1.8}
        depthTest={false}
        renderOrder={999}
      />

      {/* Ticks extremos */}
      <Line
        points={[
          [startTickA.x, startTickA.y, startTickA.z],
          [startTickB.x, startTickB.y, startTickB.z],
        ]}
        color={color}
        lineWidth={1.8}
        depthTest={false}
        renderOrder={999}
      />
      <Line
        points={[
          [endTickA.x, endTickA.y, endTickA.z],
          [endTickB.x, endTickB.y, endTickB.z],
        ]}
        color={color}
        lineWidth={1.8}
        depthTest={false}
        renderOrder={999}
      />

      {/* Texto de medida simple con Billboard */}
      <Billboard position={[mid.x, mid.y + fontSize * 0.7, mid.z]} follow={true}>
        <Text
          fontSize={fontSize}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={fontSize * 0.12}
          outlineColor="#000000"
          fontWeight="bold"
          material-depthTest={false}
          material-toneMapped={false}
          renderOrder={1000}
        >
          {label}
        </Text>
      </Billboard>
    </group>
  );
}

export function SipDimensionAnnotations3D() {
  const {
    dimensions: dim,
    floorThicknessMm,
    openings,
    interiorWalls,
    layoutPreset,
    presetParams,
    showDimensions,
    dimensionDetailLevel,
    explodedProgress,
  } = useSipHouseStore();

  if (!showDimensions || dimensionDetailLevel < 1) {
    return null;
  }

  // Dimensiones en metros
  const lengthM = dim.length / 100;
  const widthM = dim.width / 100;
  const eaveHM = dim.eaveHeight / 100;
  const ridgeHM = dim.ridgeHeight / 100;
  const floorThickM = (floorThicknessMm || 162) / 1000;

  // Offset vertical si está explosionado
  const expY = explodedProgress * 0.4;

  // Zonas interiores para nivel 2+
  const zones = useMemo(() => {
    return getInteriorZones(layoutPreset, dim, presetParams);
  }, [layoutPreset, dim, presetParams]);

  // Cálculos de modulación de paneles en muros para nivel 4
  const frontPanelsCount = Math.max(1, Math.ceil(widthM / 1.22));
  const frontPanelStep = widthM / frontPanelsCount;

  const sidePanelsCount = Math.max(1, Math.ceil(lengthM / 1.22));
  const sidePanelStep = lengthM / sidePanelsCount;

  return (
    <group position={[0, expY, 0]}>
      {/* ========================================================================= */}
      {/* NIVEL 1: MEDIDAS GENERALES EXTERIORES (Ancho, Largo y Alturas)           */}
      {/* ========================================================================= */}
      {dimensionDetailLevel >= 1 && (
        <group>
          {/* Cota Ancho Frontal (Eje X) */}
          <SimpleCota3D
            start={[-widthM / 2, 0.05, lengthM / 2 + 0.35]}
            end={[widthM / 2, 0.05, lengthM / 2 + 0.35]}
            label={`${dim.width} cm`}
            color="#38bdf8"
            fontSize={0.28}
          />

          {/* Cota Largo Lateral (Eje Z) */}
          <SimpleCota3D
            start={[-widthM / 2 - 0.35, 0.05, -lengthM / 2]}
            end={[-widthM / 2 - 0.35, 0.05, lengthM / 2]}
            label={`${dim.length} cm`}
            color="#38bdf8"
            fontSize={0.28}
          />

          {/* Cota Altura Alero Muro (Eje Y) */}
          <SimpleCota3D
            start={[widthM / 2 + 0.35, floorThickM, lengthM / 2]}
            end={[widthM / 2 + 0.35, floorThickM + eaveHM, lengthM / 2]}
            label={`${dim.eaveHeight} cm`}
            color="#0ea5e9"
            fontSize={0.25}
          />

          {/* Cota Altura Cumbrera Total (Eje Y) */}
          <SimpleCota3D
            start={[0, 0, lengthM / 2 + 0.35]}
            end={[0, floorThickM + ridgeHM, lengthM / 2 + 0.35]}
            label={`${dim.ridgeHeight} cm`}
            color="#f59e0b"
            fontSize={0.26}
          />
        </group>
      )}

      {/* ========================================================================= */}
      {/* NIVEL 2: MEDIDAS DE RECINTOS INTERIORES Y TABIQUES                       */}
      {/* ========================================================================= */}
      {dimensionDetailLevel >= 2 && (
        <group>
          {/* Dimensiones y nombres limpios de cada recinto */}
          {zones.map((zone) => {
            const zx = (zone.bounds.minX + zone.bounds.maxX) / 200;
            const zz = (zone.bounds.minZ + zone.bounds.maxZ) / 200;
            const zwCm = Math.round(zone.bounds.maxX - zone.bounds.minX);
            const zhCm = Math.round(zone.bounds.maxZ - zone.bounds.minZ);

            if (zwCm < 40 || zhCm < 40) return null;

            return (
              <group key={`dim-zone-${zone.id}`} position={[zx, floorThickM + 0.08, zz]}>
                <Billboard follow={true}>
                  <Text
                    fontSize={0.22}
                    color="#ffffff"
                    anchorX="center"
                    anchorY="bottom"
                    outlineWidth={0.025}
                    outlineColor="#000000"
                    fontWeight="bold"
                    material-depthTest={false}
                    material-toneMapped={false}
                    renderOrder={1000}
                  >
                    {zone.name}
                  </Text>
                  <Text
                    position={[0, -0.06, 0]}
                    fontSize={0.18}
                    color={zone.color || '#38bdf8'}
                    anchorX="center"
                    anchorY="top"
                    outlineWidth={0.02}
                    outlineColor="#000000"
                    fontWeight="bold"
                    material-depthTest={false}
                    material-toneMapped={false}
                    renderOrder={1000}
                  >
                    {`${zwCm} × ${zhCm} cm`}
                  </Text>
                </Billboard>
              </group>
            );
          })}

          {/* Medidas de tabiques interiores */}
          {interiorWalls &&
            interiorWalls.map((wall) => {
              if (!wall.visible) return null;
              const wx1 = wall.startX / 100;
              const wz1 = wall.startZ / 100;
              const wx2 = wall.endX / 100;
              const wz2 = wall.endZ / 100;
              const wallLenCm = Math.round(Math.hypot(wx2 - wx1, wz2 - wz1) * 100);

              return (
                <SimpleCota3D
                  key={`dim-iwall-${wall.id}`}
                  start={[wx1, floorThickM + 0.15, wz1]}
                  end={[wx2, floorThickM + 0.15, wz2]}
                  label={`${wallLenCm} cm`}
                  color="#c084fc"
                  fontSize={0.18}
                  tickSize={0.08}
                />
              );
            })}
        </group>
      )}

      {/* ========================================================================= */}
      {/* NIVEL 3: MEDIDAS DE VANOS (Puertas y Ventanas)                           */}
      {/* ========================================================================= */}
      {dimensionDetailLevel >= 3 && (
        <group>
          {openings.map((op) => {
            const opWM = op.width / 100;
            const opHM = op.height / 100;
            const sillHM = op.sillHeight / 100;
            const offsetM = op.offsetAlongWall / 100;

            let pStart: [number, number, number] = [0, 0, 0];
            let pEnd: [number, number, number] = [0, 0, 0];
            const color = op.type === 'door' ? '#fbbf24' : '#38bdf8';

            if (op.assignedWall === 'front') {
              const startX = -widthM / 2 + offsetM;
              const endX = startX + opWM;
              pStart = [startX, floorThickM + sillHM + opHM + 0.08, lengthM / 2 + 0.06];
              pEnd = [endX, floorThickM + sillHM + opHM + 0.08, lengthM / 2 + 0.06];
            } else if (op.assignedWall === 'back') {
              const startX = -widthM / 2 + offsetM;
              const endX = startX + opWM;
              pStart = [startX, floorThickM + sillHM + opHM + 0.08, -lengthM / 2 - 0.06];
              pEnd = [endX, floorThickM + sillHM + opHM + 0.08, -lengthM / 2 - 0.06];
            } else if (op.assignedWall === 'left') {
              const startZ = -lengthM / 2 + offsetM;
              const endZ = startZ + opWM;
              pStart = [-widthM / 2 - 0.06, floorThickM + sillHM + opHM + 0.08, startZ];
              pEnd = [-widthM / 2 - 0.06, floorThickM + sillHM + opHM + 0.08, endZ];
            } else if (op.assignedWall === 'right') {
              const startZ = -lengthM / 2 + offsetM;
              const endZ = startZ + opWM;
              pStart = [widthM / 2 + 0.06, floorThickM + sillHM + opHM + 0.08, startZ];
              pEnd = [widthM / 2 + 0.06, floorThickM + sillHM + opHM + 0.08, endZ];
            }

            return (
              <SimpleCota3D
                key={`dim-op-${op.id}`}
                start={pStart}
                end={pEnd}
                label={`${op.width}×${op.height} cm`}
                color={color}
                fontSize={0.17}
                tickSize={0.06}
              />
            );
          })}
        </group>
      )}

      {/* ========================================================================= */}
      {/* NIVEL 4: MEDIDAS DE MODULACIÓN DE PANELES SIP                            */}
      {/* ========================================================================= */}
      {dimensionDetailLevel >= 4 && (
        <group>
          {/* Paneles Frontales */}
          {Array.from({ length: frontPanelsCount }).map((_, idx) => {
            const pX1 = -widthM / 2 + idx * frontPanelStep;
            const pX2 = -widthM / 2 + (idx + 1) * frontPanelStep;
            const pStepW = Math.round((pX2 - pX1) * 100);

            return (
              <SimpleCota3D
                key={`dim-front-panel-${idx}`}
                start={[pX1, 0.02, lengthM / 2 + 0.18]}
                end={[pX2, 0.02, lengthM / 2 + 0.18]}
                label={`${pStepW} cm`}
                color="#34d399"
                fontSize={0.15}
                tickSize={0.05}
              />
            );
          })}

          {/* Paneles Laterales */}
          {Array.from({ length: sidePanelsCount }).map((_, idx) => {
            const pZ1 = -lengthM / 2 + idx * sidePanelStep;
            const pZ2 = -lengthM / 2 + (idx + 1) * sidePanelStep;
            const pStepL = Math.round((pZ2 - pZ1) * 100);

            return (
              <SimpleCota3D
                key={`dim-side-panel-${idx}`}
                start={[-widthM / 2 - 0.18, 0.02, pZ1]}
                end={[-widthM / 2 - 0.18, 0.02, pZ2]}
                label={`${pStepL} cm`}
                color="#34d399"
                fontSize={0.15}
                tickSize={0.05}
              />
            );
          })}

          {/* Despiece en Altura si el muro supera el largo estándar máximo de 244 cm */}
          {eaveHM > 2.44 && (
            <group>
              <SimpleCota3D
                start={[widthM / 2 + 0.18, floorThickM, lengthM / 2 + 0.02]}
                end={[widthM / 2 + 0.18, floorThickM + 2.44, lengthM / 2 + 0.02]}
                label="244 cm (Panel Base)"
                color="#10b981"
                fontSize={0.15}
                tickSize={0.05}
              />
              <SimpleCota3D
                start={[widthM / 2 + 0.18, floorThickM + 2.44, lengthM / 2 + 0.02]}
                end={[widthM / 2 + 0.18, floorThickM + eaveHM, lengthM / 2 + 0.02]}
                label={`${Math.round((eaveHM - 2.44) * 100)} cm (Remate)`}
                color="#10b981"
                fontSize={0.15}
                tickSize={0.05}
              />
            </group>
          )}
        </group>
      )}
    </group>
  );
}
