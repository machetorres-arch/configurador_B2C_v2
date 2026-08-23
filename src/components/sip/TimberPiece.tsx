import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface TimberPieceProps {
  args: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  orientation?: 'vertical' | 'horizontal';
  materials: {
    timberStructural: THREE.Material;
    timberStructuralVertical?: THREE.Material;
    timberStructuralHorizontal?: THREE.Material;
    timberPine?: THREE.Material;
    timberCCA?: THREE.Material;
  };
  maxCommercialLength?: number;
  staggerOffset?: number;
  isExploded?: boolean;
  explodedProgress?: number;
}

const MAX_COMMERCIAL_LEN_DEFAULT = 3.20; // 3200 mm estándar comercial máximo

/**
 * Componente modular para listones y vigas de madera estructural con restricción
 * estricta de largo comercial estándar (máx 3.20 m / 3200 mm).
 * Si la longitud supera los 3.20 m, subdivide automáticamente en tiras comerciales
 * estándar de hasta 3.20 m con juntas de ensamble y separación en despiece 3D.
 */
export function TimberPiece({
  args,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  orientation = 'vertical',
  materials,
  maxCommercialLength = MAX_COMMERCIAL_LEN_DEFAULT,
  staggerOffset = 0,
  isExploded = false,
  explodedProgress = 0,
}: TimberPieceProps) {
  const mat =
    orientation === 'vertical'
      ? materials.timberStructuralVertical || materials.timberStructural || materials.timberPine
      : materials.timberStructuralHorizontal || materials.timberStructural || materials.timberPine;

  const [sizeX, sizeY, sizeZ] = args;
  const maxL = maxCommercialLength;

  // Determinar si alguna dimensión excede el largo comercial estándar (3.20 m)
  const isLongX = sizeX > maxL + 0.005;
  const isLongZ = sizeZ > maxL + 0.005;
  const isLongY = sizeY > maxL + 0.005;

  // Cálculo de segmentos en X
  const segmentsX = useMemo(() => {
    if (!isLongX) return null;
    const segs: { len: number; offset: number }[] = [];
    let cur = -sizeX / 2;
    let rem = sizeX;

    if (staggerOffset > 0 && rem > staggerOffset + 0.1) {
      const first = Math.min(staggerOffset, maxL);
      segs.push({ len: first, offset: cur + first / 2 });
      cur += first;
      rem -= first;
    }

    while (rem > 0.005) {
      const segLen = Math.min(rem, maxL);
      segs.push({ len: segLen, offset: cur + segLen / 2 });
      cur += segLen;
      rem -= segLen;
    }
    return segs;
  }, [isLongX, sizeX, maxL, staggerOffset]);

  // Cálculo de segmentos en Z
  const segmentsZ = useMemo(() => {
    if (!isLongZ) return null;
    const segs: { len: number; offset: number }[] = [];
    let cur = -sizeZ / 2;
    let rem = sizeZ;

    if (staggerOffset > 0 && rem > staggerOffset + 0.1) {
      const first = Math.min(staggerOffset, maxL);
      segs.push({ len: first, offset: cur + first / 2 });
      cur += first;
      rem -= first;
    }

    while (rem > 0.005) {
      const segLen = Math.min(rem, maxL);
      segs.push({ len: segLen, offset: cur + segLen / 2 });
      cur += segLen;
      rem -= segLen;
    }
    return segs;
  }, [isLongZ, sizeZ, maxL, staggerOffset]);

  // Cálculo de segmentos en Y (caso especial)
  const segmentsY = useMemo(() => {
    if (!isLongY) return null;
    const segs: { len: number; offset: number }[] = [];
    let cur = -sizeY / 2;
    let rem = sizeY;

    while (rem > 0.005) {
      const segLen = Math.min(rem, maxL);
      segs.push({ len: segLen, offset: cur + segLen / 2 });
      cur += segLen;
      rem -= segLen;
    }
    return segs;
  }, [isLongY, sizeY, maxL]);

  const edgeLineMat = useMemo(
    () => new THREE.LineBasicMaterial({ color: '#2a1604', transparent: true, opacity: 0.85 }),
    []
  );

  // Sub-piezas en X
  if (segmentsX) {
    return (
      <group position={position} rotation={rotation}>
        {segmentsX.map((seg, sIdx) => {
          const expOffsetX = isExploded
            ? (sIdx - (segmentsX.length - 1) / 2) * (explodedProgress * 0.06)
            : 0;
          return (
            <group key={`tx-${sIdx}`} position={[seg.offset + expOffsetX, 0, 0]}>
              <mesh material={mat} castShadow receiveShadow>
                <boxGeometry args={[seg.len, sizeY, sizeZ]} />
              </mesh>
              <lineSegments
                geometry={new THREE.EdgesGeometry(new THREE.BoxGeometry(seg.len, sizeY, sizeZ))}
                material={edgeLineMat}
              />
            </group>
          );
        })}
      </group>
    );
  }

  // Sub-piezas en Z
  if (segmentsZ) {
    return (
      <group position={position} rotation={rotation}>
        {segmentsZ.map((seg, sIdx) => {
          const expOffsetZ = isExploded
            ? (sIdx - (segmentsZ.length - 1) / 2) * (explodedProgress * 0.06)
            : 0;
          return (
            <group key={`tz-${sIdx}`} position={[0, 0, seg.offset + expOffsetZ]}>
              <mesh material={mat} castShadow receiveShadow>
                <boxGeometry args={[sizeX, sizeY, seg.len]} />
              </mesh>
              <lineSegments
                geometry={new THREE.EdgesGeometry(new THREE.BoxGeometry(sizeX, sizeY, seg.len))}
                material={edgeLineMat}
              />
            </group>
          );
        })}
      </group>
    );
  }

  // Sub-piezas en Y
  if (segmentsY) {
    return (
      <group position={position} rotation={rotation}>
        {segmentsY.map((seg, sIdx) => {
          const expOffsetY = isExploded
            ? (sIdx - (segmentsY.length - 1) / 2) * (explodedProgress * 0.06)
            : 0;
          return (
            <group key={`ty-${sIdx}`} position={[0, seg.offset + expOffsetY, 0]}>
              <mesh material={mat} castShadow receiveShadow>
                <boxGeometry args={[sizeX, seg.len, sizeZ]} />
              </mesh>
              <lineSegments
                geometry={new THREE.EdgesGeometry(new THREE.BoxGeometry(sizeX, seg.len, sizeZ))}
                material={edgeLineMat}
              />
            </group>
          );
        })}
      </group>
    );
  }

  // Pieza estándar <= 3.20 m
  return (
    <group position={position} rotation={rotation}>
      <mesh material={mat} castShadow receiveShadow>
        <boxGeometry args={args} />
      </mesh>
      <lineSegments
        geometry={new THREE.EdgesGeometry(new THREE.BoxGeometry(args[0], args[1], args[2]))}
        material={edgeLineMat}
      />
    </group>
  );
}

