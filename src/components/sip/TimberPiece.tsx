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
  };
}

/**
 * Componente modular para listones y vigas de madera estructural con veta longitudinal orientada
 * y bisel/delineación nítida de juntas de ensamble carpintero.
 */
export function TimberPiece({
  args,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  orientation = 'vertical',
  materials,
}: TimberPieceProps) {
  const mat =
    orientation === 'vertical'
      ? materials.timberStructuralVertical || materials.timberStructural
      : materials.timberStructuralHorizontal || materials.timberStructural;

  const edgeGeom = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(args[0], args[1], args[2])),
    [args[0], args[1], args[2]]
  );

  const edgeLineMat = useMemo(
    () => new THREE.LineBasicMaterial({ color: '#2a1604', transparent: true, opacity: 0.85 }),
    []
  );

  return (
    <group position={position} rotation={rotation}>
      <mesh material={mat} castShadow receiveShadow>
        <boxGeometry args={args} />
      </mesh>
      <lineSegments geometry={edgeGeom} material={edgeLineMat} />
    </group>
  );
}
