import React, { useMemo } from 'react';
import * as THREE from 'three';
import {
  ConcreteOpening,
  WallThicknessMm,
  WallMeshType,
  ConcreteFoundationType,
} from '../../store/concreteHouseStore';

interface ConcreteRebar3DProps {
  wallTarget: 'front' | 'back' | 'left' | 'right';
  wallLengthCm: number;
  wallHeightCm: number;
  wallThicknessMm: WallThicknessMm;
  meshType: WallMeshType;
  meshDiameterMm?: number;
  meshSpacingCm?: number;
  openings: ConcreteOpening[];
  showRebarMesh?: boolean;
  showEdgeReinforcement?: boolean;
  showOpeningReinforcement?: boolean;
  showSpacers?: boolean;
}

export function ConcreteRebar3D({
  wallTarget,
  wallLengthCm,
  wallHeightCm,
  wallThicknessMm,
  meshType,
  meshDiameterMm = 5.0,
  meshSpacingCm = 15,
  openings,
  showRebarMesh = true,
  showEdgeReinforcement = true,
  showOpeningReinforcement = true,
  showSpacers = true,
}: ConcreteRebar3DProps) {
  const wallThicknessCm = wallThicknessMm / 10;
  const coverCm = wallThicknessMm <= 100 ? 2.0 : 2.5; // Recubrimiento normativo ICH

  // Materiales de acero y separadores
  const steelMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#b06b2e', // Tono acero oxidado / corrugado de obra o #4a5568 metálico
        metalness: 0.85,
        roughness: 0.35,
      }),
    []
  );

  const mainBarMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#3b82f6', // Azul acero dulce / A630 para barras longitudinales
        metalness: 0.9,
        roughness: 0.3,
      }),
    []
  );

  const tieBarMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#10b981', // Verde para estribos y trabas
        metalness: 0.8,
        roughness: 0.4,
      }),
    []
  );

  const diagonalBarMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f59e0b', // Ámbar para diagonales sísmicas a 45°
        metalness: 0.85,
        roughness: 0.35,
      }),
    []
  );

  const spacerPlasticMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#e2e8f0', // Plástico blanco / gris de separador
        roughness: 0.6,
      }),
    []
  );

  // Determinar planos de malla Z
  // Coordenadas locales del muro: X de -wallLength/2 a +wallLength/2, Y de 0 a wallHeight, Z de -wallThickness/2 a +wallThickness/2
  const meshZPositions = useMemo(() => {
    if (meshType === 'malla_central') {
      return [0]; // Plano central
    } else {
      // Doble malla: separada por el espesor menos recubrimientos en ambas caras
      const zOffset = (wallThicknessCm / 2) - coverCm;
      return [-zOffset, zOffset];
    }
  }, [meshType, wallThicknessCm, coverCm]);

  // Verificar si un punto (x, y) cae dentro de algún vano
  const isInsideOpening = (x: number, y: number): boolean => {
    return openings.some((op) => {
      const opMinX = op.offsetAlongWall - wallLengthCm / 2;
      const opMaxX = opMinX + op.width;
      const opMinY = op.sillHeight;
      const opMaxY = opMinY + op.height;
      return x >= opMinX && x <= opMaxX && y >= opMinY && y <= opMaxY;
    });
  };

  // 1. Barras de la malla electrosoldada (Verticales y Horizontales)
  const meshBars = useMemo(() => {
    if (!showRebarMesh) return [];
    const bars: { pos: [number, number, number]; size: [number, number, number]; rot?: [number, number, number] }[] = [];
    const barRadius = (meshDiameterMm / 10) / 2; // cm
    const step = meshSpacingCm; // ej. 15cm

    meshZPositions.forEach((zPos) => {
      // Barras Verticales
      for (let x = -wallLengthCm / 2 + step; x < wallLengthCm / 2 - 5; x += step) {
        // Segmentar si cruza vanos
        let currentY = 5; // inicio sobre fundación
        const topY = wallHeightCm - 5;

        // Comprobación simple por segmentos de 10cm
        let segStart = currentY;
        let inVoid = false;

        for (let y = currentY; y <= topY; y += 5) {
          const inOp = isInsideOpening(x, y);
          if (inOp && !inVoid) {
            // Terminar segmento previo
            if (y - segStart > 10) {
              const h = y - segStart;
              bars.push({
                pos: [x, segStart + h / 2, zPos],
                size: [barRadius * 2, h, barRadius * 2],
              });
            }
            inVoid = true;
          } else if (!inOp && inVoid) {
            segStart = y;
            inVoid = false;
          }
        }

        if (!inVoid && topY - segStart > 10) {
          const h = topY - segStart;
          bars.push({
            pos: [x, segStart + h / 2, zPos],
            size: [barRadius * 2, h, barRadius * 2],
          });
        }
      }

      // Barras Horizontales
      for (let y = step; y < wallHeightCm - 5; y += step) {
        let segStartX = -wallLengthCm / 2 + 5;
        const endX = wallLengthCm / 2 - 5;
        let inVoid = false;

        for (let x = segStartX; x <= endX; x += 5) {
          const inOp = isInsideOpening(x, y);
          if (inOp && !inVoid) {
            if (x - segStartX > 10) {
              const w = x - segStartX;
              bars.push({
                pos: [segStartX + w / 2, y, zPos],
                size: [w, barRadius * 2, barRadius * 2],
              });
            }
            inVoid = true;
          } else if (!inOp && inVoid) {
            segStartX = x;
            inVoid = false;
          }
        }

        if (!inVoid && endX - segStartX > 10) {
          const w = endX - segStartX;
          bars.push({
            pos: [segStartX + w / 2, y, zPos],
            size: [w, barRadius * 2, barRadius * 2],
          });
        }
      }
    });

    return bars;
  }, [showRebarMesh, wallLengthCm, wallHeightCm, meshSpacingCm, meshDiameterMm, meshZPositions, openings]);

  // 2. Refuerzos de Borde y Esquinas (Longitudinales Ø12 y Trabas/Estribos Ø8 cada 15cm)
  const edgeReinforcements = useMemo(() => {
    if (!showEdgeReinforcement) return { bars: [], ties: [] };
    const bars: {
      pos: [number, number, number];
      radius: number;
      length: number;
      rotation: [number, number, number];
    }[] = [];
    const ties: { pos: [number, number, number]; size: [number, number, number] }[] = [];

    const mainRadius = 0.6; // Ø12 -> radio 0.6 cm
    const tieRadius = 0.4;  // Ø8 -> radio 0.4 cm

    // Esquinas Izquierda y Derecha del muro confinadas dentro del recubrimiento
    const xOffsets = [
      -wallLengthCm / 2 + coverCm + 2,
      wallLengthCm / 2 - coverCm - 2,
    ];

    xOffsets.forEach((xPos) => {
      // 2 barras por cara si es doble malla o 2 barras confinadas
      const zOffsets = meshType === 'malla_doble' 
        ? [-(wallThicknessCm / 2 - coverCm - 0.5), (wallThicknessCm / 2 - coverCm - 0.5)]
        : [-1.5, 1.5];

      zOffsets.forEach((zPos) => {
        // Barras VERTICALES de confinamiento de borde (estrictamente verticales y contenidas)
        bars.push({
          pos: [xPos, wallHeightCm / 2, zPos],
          radius: mainRadius,
          length: Math.max(10, wallHeightCm - coverCm * 2 - 2),
          rotation: [0, 0, 0],
        });
      });

      // Estribos / Trabas cada 15cm (completamente dentro del núcleo confinado)
      const tieWidthZ = Math.max(1.5, wallThicknessCm - coverCm * 2);
      for (let y = 15; y < wallHeightCm - 10; y += 15) {
        ties.push({
          pos: [xPos, y, 0],
          size: [4, tieRadius * 2, tieWidthZ],
        });
      }
    });

    // Barra de coronación superior corrida (2 Ø12 a lo largo de todo el muro)
    const zTopOffsets = meshType === 'malla_doble'
      ? [-(wallThicknessCm / 2 - coverCm - 0.5), (wallThicknessCm / 2 - coverCm - 0.5)]
      : [0];

    zTopOffsets.forEach((zPos) => {
      bars.push({
        pos: [0, wallHeightCm - coverCm - 2, zPos],
        radius: mainRadius,
        length: Math.max(10, wallLengthCm - coverCm * 2 - 4),
        rotation: [0, 0, Math.PI / 2],
      });
    });

    return { bars, ties };
  }, [showEdgeReinforcement, wallLengthCm, wallHeightCm, wallThicknessCm, coverCm, meshType]);

  // 3. Refuerzos Sísmicos en Vanos (Dinteles y Diagonales 45° según Manual ICH)
  const openingReinforcements = useMemo(() => {
    if (!showOpeningReinforcement) return { lintels: [], diagonals: [] };
    const lintels: { pos: [number, number, number]; len: number }[] = [];
    const diagonals: { pos: [number, number, number]; rotZ: number }[] = [];

    const leftLimit = -wallLengthCm / 2 + coverCm + 2;
    const rightLimit = wallLengthCm / 2 - coverCm - 2;

    openings.forEach((op) => {
      const opLeft = op.offsetAlongWall - wallLengthCm / 2;
      const opRight = opLeft + op.width;
      const opCenterX = (opLeft + opRight) / 2;

      // Anclaje a los costados limitado para nunca sobrepasar el muro
      const startX = Math.max(leftLimit, opLeft - 35);
      const endX = Math.min(rightLimit, opRight + 35);
      const lintelLen = Math.max(10, endX - startX);
      const lintelX = (startX + endX) / 2;

      const lintelY = Math.min(wallHeightCm - coverCm - 4, op.sillHeight + op.height + 4);

      // Dintel: 2 barras Ø12
      lintels.push({
        pos: [lintelX, lintelY, 0],
        len: lintelLen,
      });

      // Antepecho (en ventanas)
      if (op.type === 'window' && op.sillHeight > 0) {
        const sillY = Math.max(coverCm + 4, op.sillHeight - 4);
        lintels.push({
          pos: [lintelX, sillY, 0],
          len: lintelLen,
        });
      }

      // Diagonales a 45° en las 4 esquinas del vano (Lámina ICH pág 42)
      if (op.hasDiagonalRebar !== false) {
        const halfW = op.width / 2;
        const halfH = op.height / 2;
        const opCenterY = op.sillHeight + halfH;

        // Esquina Superior Izquierda
        diagonals.push({
          pos: [opCenterX - halfW - 2, opCenterY + halfH + 2, 0],
          rotZ: Math.PI / 4,
        });
        // Esquina Superior Derecha
        diagonals.push({
          pos: [opCenterX + halfW + 2, opCenterY + halfH + 2, 0],
          rotZ: -Math.PI / 4,
        });
        // Esquina Inferior Izquierda
        if (op.type === 'window') {
          diagonals.push({
            pos: [opCenterX - halfW - 2, opCenterY - halfH - 2, 0],
            rotZ: -Math.PI / 4,
          });
          // Esquina Inferior Derecha
          diagonals.push({
            pos: [opCenterX + halfW + 2, opCenterY - halfH - 2, 0],
            rotZ: Math.PI / 4,
          });
        }
      }
    });

    return { lintels, diagonals };
  }, [showOpeningReinforcement, openings, wallLengthCm, wallHeightCm, coverCm]);

  // 4. Separadores plásticos (Ruedas separadoras según Fig. 7 y Fig. 8 Manual ICH)
  const spacers = useMemo(() => {
    if (!showSpacers) return [];
    const items: [number, number, number][] = [];
    const stepX = 120; // Cada 1.2 m
    const stepY = 80;  // Cada 80 cm

    for (let x = -wallLengthCm / 2 + 40; x < wallLengthCm / 2 - 40; x += stepX) {
      for (let y = 40; y < wallHeightCm - 30; y += stepY) {
        if (!isInsideOpening(x, y)) {
          items.push([x, y, 0]);
        }
      }
    }
    return items;
  }, [showSpacers, wallLengthCm, wallHeightCm, openings]);

  return (
    <group>
      {/* 1. Mallas Electrosoldadas */}
      {meshBars.map((bar, idx) => (
        <mesh key={`mesh-bar-${idx}`} position={bar.pos} material={steelMaterial}>
          <boxGeometry args={bar.size} />
        </mesh>
      ))}

      {/* 2. Refuerzos de Borde y Esquinas */}
      {edgeReinforcements.bars.map((bar, idx) => (
        <mesh
          key={`edge-bar-${idx}`}
          position={bar.pos}
          rotation={bar.rotation}
          material={mainBarMaterial}
        >
          <cylinderGeometry args={[bar.radius, bar.radius, bar.length, 8]} />
        </mesh>
      ))}

      {/* Trabas / Estribos de confinamiento */}
      {edgeReinforcements.ties.map((tie, idx) => (
        <mesh key={`tie-${idx}`} position={tie.pos} material={tieBarMaterial}>
          <boxGeometry args={tie.size} />
        </mesh>
      ))}

      {/* 3. Dinteles y Refuerzos de Vanos */}
      {openingReinforcements.lintels.map((lintel, idx) => (
        <mesh
          key={`lintel-${idx}`}
          position={lintel.pos}
          rotation={[0, 0, Math.PI / 2]}
          material={mainBarMaterial}
        >
          <cylinderGeometry args={[0.6, 0.6, lintel.len, 8]} />
        </mesh>
      ))}

      {/* Diagonales Sísmicas a 45° */}
      {openingReinforcements.diagonals.map((diag, idx) => (
        <mesh
          key={`diag-${idx}`}
          position={diag.pos}
          rotation={[0, 0, diag.rotZ]}
          material={diagonalBarMaterial}
        >
          <cylinderGeometry args={[0.5, 0.5, 45, 8]} />
        </mesh>
      ))}

      {/* 4. Ruedas Separadoras Plásticas (ICH) */}
      {spacers.map((pos, idx) => (
        <group key={`spacer-${idx}`} position={pos}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={spacerPlasticMaterial}>
            <torusGeometry args={[wallThicknessCm / 2 - 0.2, 0.3, 8, 16]} />
          </mesh>
          <mesh rotation={[0, 0, 0]} material={spacerPlasticMaterial}>
            <cylinderGeometry args={[0.2, 0.2, wallThicknessCm - 0.4, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
