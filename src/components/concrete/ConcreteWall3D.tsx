import React, { useMemo } from 'react';
import * as THREE from 'three';
import {
  ConcreteOpening,
  WallThicknessMm,
  WallMeshType,
  ConcreteRenderMode,
  ConcreteWallTarget,
} from '../../store/concreteHouseStore';
import { ConcreteRebar3D } from './ConcreteRebar3D';
import { getConcreteTextures } from '../../utils/concreteTextures';

interface ConcreteWall3DProps {
  wallTarget: ConcreteWallTarget;
  wallLengthCm: number;
  wallHeightCm: number;
  wallThicknessMm: WallThicknessMm;
  meshType: WallMeshType;
  renderMode: ConcreteRenderMode;
  openings: ConcreteOpening[];
  showRebarMesh?: boolean;
  showEdgeReinforcement?: boolean;
  showOpeningReinforcement?: boolean;
  showSpacers?: boolean;
  showFormworkTieHoles?: boolean;
  isSelected?: boolean;
  onSelectWall?: () => void;
  onSelectOpening?: (id: string) => void;
}

export function ConcreteWall3D({
  wallTarget,
  wallLengthCm,
  wallHeightCm,
  wallThicknessMm,
  meshType,
  renderMode,
  openings,
  showRebarMesh = true,
  showEdgeReinforcement = true,
  showOpeningReinforcement = true,
  showSpacers = true,
  showFormworkTieHoles = true,
  isSelected = false,
  onSelectWall,
  onSelectOpening,
}: ConcreteWall3DProps) {
  const wallThicknessCm = wallThicknessMm / 10;

  // Material de Hormigón según el modo de visualización
  const concreteMaterial = useMemo(() => {
    if (renderMode === 'xray') {
      return new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        roughness: 0.3,
        metalness: 0.1,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      });
    }

    if (renderMode === 'formwork') {
      return new THREE.MeshStandardMaterial({
        color: '#ca8a04', // Tablero fenólico amarillo / encofrado industrial
        roughness: 0.5,
        metalness: 0.1,
      });
    }

    const { wallTexture, wallBumpMap, wallRoughnessMap } = getConcreteTextures();

    // Clonar y ajustar el repeat según las dimensiones del paño para preservar escala métrica real
    const map = wallTexture.clone();
    const bump = wallBumpMap.clone();
    const rough = wallRoughnessMap.clone();

    // 1 panel completo de encofrado cada ~2.4m x 2.4m
    const repX = Math.max(1, wallLengthCm / 240);
    const repY = Math.max(1, wallHeightCm / 240);

    map.repeat.set(repX, repY);
    bump.repeat.set(repX, repY);
    rough.repeat.set(repX, repY);
    map.needsUpdate = true;
    bump.needsUpdate = true;
    rough.needsUpdate = true;

    // Modo sólido normal: Hormigón visto arquitectónico idéntico a referencia
    return new THREE.MeshStandardMaterial({
      map,
      bumpMap: bump,
      bumpScale: 0.08,
      roughnessMap: rough,
      roughness: 0.82,
      metalness: 0.04,
      color: isSelected ? '#ffffff' : '#f0f2f5',
    });
  }, [renderMode, isSelected, wallLengthCm, wallHeightCm]);

  // Material de Carpinterías (Marcos de puertas y ventanas)
  const frameMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#18181b', // PVC Antracita / Negro
        roughness: 0.4,
        metalness: 0.2,
      }),
    []
  );

  const glassMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#bae6fd',
        transmission: 0.85,
        opacity: 0.4,
        transparent: true,
        roughness: 0.1,
        ior: 1.5,
      }),
    []
  );

  const tieHoleMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#3f3f46',
        roughness: 0.9,
      }),
    []
  );

  // Generación sustractiva de bloques de hormigón para dejar vanos limpios
  // Dividimos el muro en secciones verticales según los vanos
  const wallSlices = useMemo(() => {
    // Ordenar vanos por offset
    const sortedOps = [...openings].sort((a, b) => a.offsetAlongWall - b.offsetAlongWall);
    const slices: { pos: [number, number, number]; size: [number, number, number] }[] = [];

    let currentLeft = 0;

    sortedOps.forEach((op) => {
      const opLeft = Math.max(0, op.offsetAlongWall);
      const opRight = Math.min(wallLengthCm, op.offsetAlongWall + op.width);
      const opW = opRight - opLeft;

      // 1. Bloque a la izquierda del vano (altura completa)
      if (opLeft > currentLeft) {
        const segW = opLeft - currentLeft;
        const centerX = currentLeft + segW / 2 - wallLengthCm / 2;
        slices.push({
          pos: [centerX, wallHeightCm / 2, 0],
          size: [segW, wallHeightCm, wallThicknessCm],
        });
      }

      // 2. Bloque antepecho (debajo del vano si sillHeight > 0)
      if (op.sillHeight > 0) {
        const sillH = op.sillHeight;
        const centerX = opLeft + opW / 2 - wallLengthCm / 2;
        slices.push({
          pos: [centerX, sillH / 2, 0],
          size: [opW, sillH, wallThicknessCm],
        });
      }

      // 3. Bloque dintel (sobre el vano)
      const topY = op.sillHeight + op.height;
      if (topY < wallHeightCm) {
        const lintelH = wallHeightCm - topY;
        const centerX = opLeft + opW / 2 - wallLengthCm / 2;
        slices.push({
          pos: [centerX, topY + lintelH / 2, 0],
          size: [opW, lintelH, wallThicknessCm],
        });
      }

      currentLeft = Math.max(currentLeft, opRight);
    });

    // Segmento final después del último vano
    if (currentLeft < wallLengthCm) {
      const segW = wallLengthCm - currentLeft;
      const centerX = currentLeft + segW / 2 - wallLengthCm / 2;
      slices.push({
        pos: [centerX, wallHeightCm / 2, 0],
        size: [segW, wallHeightCm, wallThicknessCm],
      });
    }

    return slices;
  }, [openings, wallLengthCm, wallHeightCm, wallThicknessCm]);

  // Agujeros de pasamuros/agujas de encofrado (Tie Rod Holes)
  const tieHoles = useMemo(() => {
    if (!showFormworkTieHoles || renderMode === 'rebar_only') return [];
    const holes: [number, number, number][] = [];
    const stepX = 120; // 1.20 m entre agujas
    const stepY = 100; // 1.00 m en vertical

    for (let x = 40; x < wallLengthCm - 30; x += stepX) {
      for (let y = 50; y < wallHeightCm - 30; y += stepY) {
        // Comprobar que no esté en vano
        const inOp = openings.some(
          (op) =>
            x >= op.offsetAlongWall &&
            x <= op.offsetAlongWall + op.width &&
            y >= op.sillHeight &&
            y <= op.sillHeight + op.height
        );
        if (!inOp) {
          const posX = x - wallLengthCm / 2;
          holes.push([posX, y, wallThicknessCm / 2 + 0.1]);
          holes.push([posX, y, -wallThicknessCm / 2 - 0.1]);
        }
      }
    }
    return holes;
  }, [showFormworkTieHoles, renderMode, wallLengthCm, wallHeightCm, wallThicknessCm, openings]);

  return (
    <group onClick={(e) => { e.stopPropagation(); onSelectWall?.(); }}>
      {/* 1. Malla y Enfierradura Estructural 3D (Siempre visible o en Rayos X) */}
      {(renderMode === 'xray' || renderMode === 'rebar_only') && (
        <ConcreteRebar3D
          wallTarget={wallTarget}
          wallLengthCm={wallLengthCm}
          wallHeightCm={wallHeightCm}
          wallThicknessMm={wallThicknessMm}
          meshType={meshType}
          openings={openings}
          showRebarMesh={showRebarMesh}
          showEdgeReinforcement={showEdgeReinforcement}
          showOpeningReinforcement={showOpeningReinforcement}
          showSpacers={showSpacers}
        />
      )}

      {/* 2. Geometría Sólida / Translúcida del Muro */}
      {renderMode !== 'rebar_only' && (
        <group>
          {wallSlices.map((slice, idx) => (
            <mesh key={`slice-${idx}`} position={slice.pos} material={concreteMaterial} castShadow receiveShadow>
              <boxGeometry args={slice.size} />
            </mesh>
          ))}

          {/* Tapones cónicos de agujas de encofrado */}
          {tieHoles.map((pos, idx) => (
            <mesh key={`tie-hole-${idx}`} position={pos} material={tieHoleMaterial} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[1.0, 1.2, 0.4, 12]} />
            </mesh>
          ))}
        </group>
      )}

      {/* 3. Marcos y Cristales de Vanos */}
      {renderMode !== 'rebar_only' &&
        openings.map((op) => {
          const opCenterX = op.offsetAlongWall - wallLengthCm / 2 + op.width / 2;
          const opCenterY = op.sillHeight + op.height / 2;
          const frameProfile = 6; // 6cm perfil

          return (
            <group
              key={op.id}
              position={[opCenterX, opCenterY, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onSelectOpening?.(op.id);
              }}
            >
              {/* Marco Exterior */}
              <mesh material={frameMaterial}>
                <boxGeometry args={[op.width, op.height, wallThicknessCm + 0.8]} />
              </mesh>

              {/* Vidrio o Hoja de Puerta */}
              {op.type === 'window' ? (
                <mesh material={glassMaterial}>
                  <boxGeometry args={[op.width - frameProfile * 2, op.height - frameProfile * 2, 1.2]} />
                </mesh>
              ) : (
                <mesh material={frameMaterial}>
                  <boxGeometry args={[op.width - frameProfile * 2, op.height - frameProfile * 2, 4]} />
                </mesh>
              )}
            </group>
          );
        })}
    </group>
  );
}
