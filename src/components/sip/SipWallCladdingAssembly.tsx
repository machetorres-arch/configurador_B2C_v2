import React, { useMemo } from 'react';
import * as THREE from 'three';
import { SipOpening, ExteriorCladding } from '../../store/sipHouseStore';

interface SipWallCladdingAssemblyProps {
  wallId: string;
  wallLength: number;     // m
  wallHeight: number;     // m
  wallThickness: number;  // m (e.g. 0.114)
  openings: SipOpening[];
  claddingType: ExteriorCladding;
  materials: {
    osbSip: THREE.Material;
    epsCore: THREE.Material;
    timberPine?: THREE.Material;
    timberStructural?: THREE.Material;
    arratiaCladding?: THREE.Material;
    zincalumBlack?: THREE.Material;
    timberCladding?: THREE.Material;
    fiberCement?: THREE.Material;
    tyvekMembrane?: THREE.Material;
    flashingBlack?: THREE.Material;
    cladding?: THREE.Material;
  };
  isExploded?: boolean;
  explodedProgress?: number;
}

interface ModularSheet {
  idx: number;
  x0: number;
  x1: number;
  width: number;
  centerX: number;
  isCutPiece: boolean;
  subParts: {
    y0: number;
    y1: number;
    height: number;
    shape: THREE.Shape;
  }[];
}

/**
 * Capa de Revestimiento Exterior de Fachada y Envolvente Ventilada Paramétrica
 * Representa físicamente en 3D:
 * 1. Membrana Hidrófuga Respirable (DuPont Tyvek / Barrera de Humedad)
 * 2. Cámara de Aire y Enlistonado / Costaneras de Soporte 1x2" (Ventilación Rain-Screen)
 * 3. Planchas de Revestimiento Exterior Despiezadas por Unidad (Arratia Microacanalado 27.5cm / Zincalum Negro)
 * 4. Piezas Complementarias de Hojalatería:
 *    - Esquineros exteriores e interiores en L (Corner Flashings)
 *    - Tornillos autoperforantes con golilla EPDM en fijaciones
 *    - Forro cortagota basal y coronación superior
 *    - Forros de vano (Dintel con goterón, Alféizar botaguas, Jambas)
 */
export function SipWallCladdingAssembly({
  wallId,
  wallLength,
  wallHeight,
  wallThickness,
  openings,
  claddingType,
  materials,
  isExploded = false,
  explodedProgress = 0,
}: SipWallCladdingAssemblyProps) {
  if (claddingType === 'panel_sip_visto') return null;

  // Selección del material de revestimiento
  const cladMat = useMemo(() => {
    switch (claddingType) {
      case 'arratia_microacanalado':
        return materials.arratiaCladding || materials.zincalumBlack || materials.cladding || materials.osbSip;
      case 'zincalum_negro':
        return materials.zincalumBlack || materials.cladding || materials.osbSip;
      case 'madera_tinglada':
        return materials.timberCladding || materials.cladding || materials.osbSip;
      case 'fibrocemento_gris':
        return materials.fiberCement || materials.cladding || materials.osbSip;
      default:
        return materials.cladding || materials.osbSip;
    }
  }, [claddingType, materials]);

  const tyvekMat = materials.tyvekMembrane || materials.osbSip;
  const furringMat = materials.timberPine || materials.timberStructural || materials.osbSip;
  const flashingMat = materials.flashingBlack || materials.zincalumBlack || materials.osbSip;

  // Material aristas técnicas de cada plancha unitaria de zinc
  const sheetEdgeMat = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: '#0f172a',
      linewidth: 2,
      transparent: true,
      opacity: 0.9,
    });
  }, []);

  // Material tornillo metálico
  const screwMetalMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#475569',
      metalness: 0.85,
      roughness: 0.25,
    });
  }, []);

  // Material golilla EPDM
  const washerMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.9,
    });
  }, []);

  // Filtrar y ordenar vanos de este muro
  const wallOpenings = useMemo(() => {
    return openings
      .filter((o) => o.assignedWall === wallId)
      .map((o) => ({
        id: o.id,
        type: o.type,
        xMin: (o.offsetAlongWall / 100) - wallLength / 2,
        xMax: (o.offsetAlongWall / 100) + (o.width / 100) - wallLength / 2,
        yMin: o.type === 'door' ? 0 : Math.max(0, (o.sillHeight || 0) / 100),
        yMax: (o.type === 'door' ? 0 : Math.max(0, (o.sillHeight || 0) / 100)) + (o.height / 100),
        width: o.width / 100,
        height: o.height / 100,
      }))
      .filter((o) => o.xMax <= wallLength / 2 + 0.05 && o.xMin >= -wallLength / 2 - 0.05);
  }, [openings, wallId, wallLength]);

  // Desplazamiento exterior en modo explotado (dirección +Z local)
  const expCladdingZ = isExploded ? explodedProgress * 0.35 : 0;
  const expFurringZ = isExploded ? explodedProgress * 0.18 : 0;
  const expTyvekZ = isExploded ? explodedProgress * 0.06 : 0;
  const expScrewsZ = isExploded ? explodedProgress * 0.48 : 0;
  const expCornersZ = isExploded ? explodedProgress * 0.42 : 0;

  // Posición Z base respecto al centro del muro SIP (donde la cara OSB exterior está en +wallThickness/2)
  const osbFrontZ = wallThickness / 2;
  const tyvekZ = osbFrontZ + 0.003 + expTyvekZ;
  const furringZ = osbFrontZ + 0.014 + expFurringZ;
  const claddingZ = osbFrontZ + 0.030 + expCladdingZ;

  // 1. Geometría continua de la membrana Tyvek
  const wallShapeWithHoles = useMemo(() => {
    const shape = new THREE.Shape();
    const halfW = wallLength / 2;

    shape.moveTo(-halfW, 0);
    shape.lineTo(halfW, 0);
    shape.lineTo(halfW, wallHeight);
    shape.lineTo(-halfW, wallHeight);
    shape.closePath();

    for (const op of wallOpenings) {
      const hole = new THREE.Path();
      hole.moveTo(op.xMin, op.yMin);
      hole.lineTo(op.xMin, op.yMax);
      hole.lineTo(op.xMax, op.yMax);
      hole.lineTo(op.xMax, op.yMin);
      hole.closePath();
      shape.holes.push(hole);
    }

    return shape;
  }, [wallLength, wallHeight, wallOpenings]);

  // 2. Modulación de Listones / Costaneras de Soporte 1x2" (Cámara Ventilada)
  const furringPieces = useMemo(() => {
    const pieces: { x: number; y: number; width: number; height: number; depth: number }[] = [];
    const battenThick = 0.020; // 20 mm espesor
    const battenWidth = 0.045; // 45 mm ancho

    // Costaneras horizontales cada 45 cm (soporte estándar para paneles verticales de zinc)
    const spacingY = 0.45;
    const countY = Math.floor(wallHeight / spacingY);
    for (let i = 0; i <= countY; i++) {
      const yPos = Math.min(wallHeight - battenWidth / 2, Math.max(battenWidth / 2, i * spacingY));

      let currentX = -wallLength / 2;
      const opsAtY = wallOpenings
        .filter((op) => yPos + battenWidth / 2 >= op.yMin && yPos - battenWidth / 2 <= op.yMax)
        .sort((a, b) => a.xMin - b.xMin);

      if (opsAtY.length === 0) {
        pieces.push({
          x: 0,
          y: yPos,
          width: wallLength,
          height: battenWidth,
          depth: battenThick,
        });
      } else {
        for (const op of opsAtY) {
          if (op.xMin > currentX + 0.05) {
            const segW = op.xMin - currentX;
            pieces.push({
              x: currentX + segW / 2,
              y: yPos,
              width: segW,
              height: battenWidth,
              depth: battenThick,
            });
          }
          currentX = Math.max(currentX, op.xMax);
        }
        if (wallLength / 2 > currentX + 0.05) {
          const segW = wallLength / 2 - currentX;
          pieces.push({
            x: currentX + segW / 2,
            y: yPos,
            width: segW,
            height: battenWidth,
            depth: battenThick,
          });
        }
      }
    }

    // Refuerzos perimetrales en bordes de vanos
    for (const op of wallOpenings) {
      pieces.push({
        x: (op.xMin + op.xMax) / 2,
        y: Math.min(wallHeight - battenWidth / 2, op.yMax + battenWidth / 2),
        width: op.width + battenWidth * 2,
        height: battenWidth,
        depth: battenThick,
      });
      if (op.type === 'window' && op.yMin > battenWidth) {
        pieces.push({
          x: (op.xMin + op.xMax) / 2,
          y: Math.max(battenWidth / 2, op.yMin - battenWidth / 2),
          width: op.width + battenWidth * 2,
          height: battenWidth,
          depth: battenThick,
        });
      }
      pieces.push({
        x: Math.max(-wallLength / 2 + battenWidth / 2, op.xMin - battenWidth / 2),
        y: (op.yMin + op.yMax) / 2,
        width: battenWidth,
        height: op.height,
        depth: battenThick,
      });
      pieces.push({
        x: Math.min(wallLength / 2 - battenWidth / 2, op.xMax + battenWidth / 2),
        y: (op.yMin + op.yMax) / 2,
        width: battenWidth,
        height: op.height,
        depth: battenThick,
      });
    }

    return pieces;
  }, [wallLength, wallHeight, wallOpenings]);

  // 3. DESPIECE MODULAR POR PLANCHA INDIVIDUAL DE ZINC (Respetando ancho estándar de catálogo y optimización de corte)
  const modularSheets: ModularSheet[] = useMemo(() => {
    // Ancho modular nominal exacto según catálogo del fabricante (Arratia Microacanalado: 27.5 cm, Zincalum estándar: 38.0 cm)
    const sheetModule = claddingType === 'arratia_microacanalado' ? 0.275 : 0.380;
    const sheets: ModularSheet[] = [];

    let currentX = -wallLength / 2;
    let sheetIdx = 0;

    while (currentX < wallLength / 2 - 0.002) {
      const remainingDist = wallLength / 2 - currentX;
      // Ancho exacto de formato, recortado en la última pieza si la modulación no es múltiplo exacto
      const w = remainingDist >= sheetModule ? sheetModule : remainingDist;
      const x0 = currentX;
      const x1 = currentX + w;
      const cX = currentX + w / 2;
      const isCutPiece = Math.abs(w - sheetModule) > 0.005;

      // Detectar si esta plancha se cruza con algún vano
      const overlappingOps = wallOpenings.filter((op) => op.xMin < x1 - 0.005 && op.xMax > x0 + 0.005);

      const subParts: { y0: number; y1: number; height: number; shape: THREE.Shape }[] = [];

      if (overlappingOps.length === 0) {
        // Plancha completa vertical continua
        const shape = new THREE.Shape();
        shape.moveTo(-w / 2, 0);
        shape.lineTo(w / 2, 0);
        shape.lineTo(w / 2, wallHeight);
        shape.lineTo(-w / 2, wallHeight);
        shape.closePath();

        subParts.push({
          y0: 0,
          y1: wallHeight,
          height: wallHeight,
          shape,
        });
      } else {
        // La plancha cruza vanos: segmentar en antepecho y/o dintel
        let currentY = 0;
        const sortedOps = [...overlappingOps].sort((a, b) => a.yMin - b.yMin);

        for (const op of sortedOps) {
          if (op.yMin > currentY + 0.04) {
            const h = op.yMin - currentY;
            const shape = new THREE.Shape();
            shape.moveTo(-w / 2, currentY);
            shape.lineTo(w / 2, currentY);
            shape.lineTo(w / 2, op.yMin);
            shape.lineTo(-w / 2, op.yMin);
            shape.closePath();

            subParts.push({
              y0: currentY,
              y1: op.yMin,
              height: h,
              shape,
            });
          }
          currentY = Math.max(currentY, op.yMax);
        }

        if (wallHeight > currentY + 0.04) {
          const h = wallHeight - currentY;
          const shape = new THREE.Shape();
          shape.moveTo(-w / 2, currentY);
          shape.lineTo(w / 2, currentY);
          shape.lineTo(w / 2, wallHeight);
          shape.lineTo(-w / 2, wallHeight);
          shape.closePath();

          subParts.push({
            y0: currentY,
            y1: wallHeight,
            height: h,
            shape,
          });
        }
      }

      sheets.push({
        idx: sheetIdx,
        x0,
        x1,
        width: w,
        centerX: cX,
        isCutPiece,
        subParts,
      });

      currentX += w;
      sheetIdx++;
    }

    return sheets;
  }, [wallLength, wallHeight, claddingType, wallOpenings]);

  // 4. Modulación de Tornillos Autoperforantes con Golilla EPDM
  const screws = useMemo(() => {
    const list: { x: number; y: number }[] = [];
    const spacingY = 0.45;
    const countY = Math.floor(wallHeight / spacingY);

    modularSheets.forEach((sheet) => {
      // 2 tornillos por plancha en cada costanera horizontal
      for (let j = 0; j <= countY; j++) {
        const yPos = Math.min(wallHeight - 0.04, Math.max(0.04, j * spacingY));
        // Verificar que no coincida con vanos
        const isInOpening = wallOpenings.some(
          (op) => sheet.centerX >= op.xMin && sheet.centerX <= op.xMax && yPos >= op.yMin && yPos <= op.yMax
        );
        if (!isInOpening) {
          list.push({ x: sheet.centerX - sheet.width * 0.25, y: yPos });
          list.push({ x: sheet.centerX + sheet.width * 0.25, y: yPos });
        }
      }
    });

    return list;
  }, [modularSheets, wallHeight, wallOpenings]);

  return (
    <group name={`cladding-assembly-${wallId}`}>
      {/* 1. MEMBRANA HIDRÓFUGA RESPIRABLE TYVEK (Sobre cara OSB exterior) */}
      <mesh position={[0, 0, tyvekZ]}>
        <shapeGeometry args={[wallShapeWithHoles]} />
        <primitive object={tyvekMat} attach="material" />
      </mesh>

      {/* 2. COSTANERAS / ENLISTONADO VENTILADO DE MADERA 1x2" */}
      <group position={[0, 0, furringZ]}>
        {furringPieces.map((piece, idx) => (
          <mesh key={`furring-batten-${idx}`} position={[piece.x, piece.y, 0]} castShadow receiveShadow>
            <boxGeometry args={[piece.width, piece.height, piece.depth]} />
            <primitive object={furringMat} attach="material" />
          </mesh>
        ))}
      </group>

      {/* 3. PLANCHAS DE REVESTIMIENTO DE ZINC DESPIEZADAS POR UNIDAD */}
      <group position={[0, 0, 0]}>
        {modularSheets.map((sheet) => {
          const totalCount = modularSheets.length;
          // Despiece cinemático individual por plancha
          const spreadX = isExploded ? (sheet.idx - (totalCount - 1) / 2) * (explodedProgress * 0.14) : 0;
          const staggerZ = isExploded ? (sheet.idx % 2 === 0 ? 0.04 : -0.025) * explodedProgress : 0;
          const currentSheetZ = claddingZ + staggerZ;

          return (
            <group
              key={`zinc-sheet-${sheet.idx}`}
              position={[sheet.centerX + spreadX, 0, currentSheetZ]}
            >
              {sheet.subParts.map((sub, sIdx) => {
                const extrudeGeom = new THREE.ExtrudeGeometry(sub.shape, {
                  depth: 0.012,
                  bevelEnabled: true,
                  bevelSegments: 1,
                  steps: 1,
                  bevelSize: 0.0015,
                  bevelThickness: 0.0015,
                });
                const edgesGeom = new THREE.EdgesGeometry(extrudeGeom);

                return (
                  <group key={`subpart-${sIdx}`}>
                    {/* Cuerpo de la plancha unitaria de zinc */}
                    <mesh geometry={extrudeGeom} material={cladMat} castShadow receiveShadow />

                    {/* Nervio / Pestaña machihembrada de unión vertical de plancha de zinc */}
                    <mesh position={[sheet.width / 2 - 0.003, (sub.y0 + sub.y1) / 2, 0.014]} castShadow>
                      <boxGeometry args={[0.006, sub.height, 0.008]} />
                      <primitive object={cladMat} attach="material" />
                    </mesh>

                    {/* Líneas de aristas para delimitar claramente cada plancha en el despiece */}
                    <lineSegments geometry={edgesGeom} material={sheetEdgeMat} />
                  </group>
                );
              })}
            </group>
          );
        })}
      </group>

      {/* 4. PIEZAS COMPLEMENTARIAS: ESQUINEROS EXTERIORES EN L (Corner Flashings) */}
      <group position={[0, 0, claddingZ]}>
        {/* Esquinero Izquierdo en L */}
        <group
          position={[
            -wallLength / 2 - (isExploded ? explodedProgress * 0.22 : 0),
            wallHeight / 2,
            0.015 + (isExploded ? expCornersZ : 0),
          ]}
        >
          {/* Ala Frontal del esquinero */}
          <mesh position={[0.025, 0, 0]} castShadow>
            <boxGeometry args={[0.05, wallHeight + 0.01, 0.004]} />
            <primitive object={flashingMat} attach="material" />
          </mesh>
          {/* Ala Lateral envolvente del esquinero */}
          <mesh position={[0, 0, -0.025]} castShadow>
            <boxGeometry args={[0.004, wallHeight + 0.01, 0.05]} />
            <primitive object={flashingMat} attach="material" />
          </mesh>
        </group>

        {/* Esquinero Derecho en L */}
        <group
          position={[
            wallLength / 2 + (isExploded ? explodedProgress * 0.22 : 0),
            wallHeight / 2,
            0.015 + (isExploded ? expCornersZ : 0),
          ]}
        >
          {/* Ala Frontal del esquinero */}
          <mesh position={[-0.025, 0, 0]} castShadow>
            <boxGeometry args={[0.05, wallHeight + 0.01, 0.004]} />
            <primitive object={flashingMat} attach="material" />
          </mesh>
          {/* Ala Lateral envolvente del esquinero */}
          <mesh position={[0, 0, -0.025]} castShadow>
            <boxGeometry args={[0.004, wallHeight + 0.01, 0.05]} />
            <primitive object={flashingMat} attach="material" />
          </mesh>
        </group>
      </group>

      {/* 5. PIEZAS COMPLEMENTARIAS: TORNILLOS AUTOPERFORANTES CON GOLILLA EPDM */}
      <group position={[0, 0, claddingZ + 0.015 + expScrewsZ]}>
        {screws.map((scr, idx) => (
          <group key={`screw-${idx}`} position={[scr.x, scr.y, 0]}>
            {/* Golilla negra de caucho EPDM */}
            <mesh position={[0, 0, 0]} material={washerMat}>
              <cylinderGeometry args={[0.008, 0.008, 0.003, 8]} />
            </mesh>
            {/* Cabeza de tornillo hexagonal zincada */}
            <mesh position={[0, 0, 0.003]} rotation={[Math.PI / 2, 0, 0]} material={screwMetalMat}>
              <cylinderGeometry args={[0.006, 0.006, 0.004, 6]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 6. HOJALATERÍA DE REMATE (Cortagota Basal, Coronación y Forros de Vanos) */}
      <group position={[0, 0, claddingZ + 0.012 + (isExploded ? explodedProgress * 0.2 : 0)]}>
        {/* Remate Cortagota Basal Inferior (Zincalum prepintado) */}
        <mesh position={[0, 0.015, 0]} castShadow>
          <boxGeometry args={[wallLength + 0.02, 0.03, 0.015]} />
          <primitive object={flashingMat} attach="material" />
        </mesh>

        {/* Remate de Coronación Superior bajo alero */}
        <mesh position={[0, wallHeight - 0.015, 0]} castShadow>
          <boxGeometry args={[wallLength + 0.02, 0.03, 0.015]} />
          <primitive object={flashingMat} attach="material" />
        </mesh>

        {/* Remates de Hojalatería en Vanos */}
        {wallOpenings.map((op) => (
          <group key={`trim-${op.id}`}>
            {/* Forro Dintel Superior */}
            <mesh position={[(op.xMin + op.xMax) / 2, op.yMax + 0.015, 0]}>
              <boxGeometry args={[op.width + 0.06, 0.03, 0.016]} />
              <primitive object={flashingMat} attach="material" />
            </mesh>
            {/* Alféizar Botaguas en Ventanas */}
            {op.type === 'window' && (
              <mesh
                position={[(op.xMin + op.xMax) / 2, op.yMin - 0.015, 0.005]}
                rotation={[0.08, 0, 0]}
              >
                <boxGeometry args={[op.width + 0.06, 0.03, 0.025]} />
                <primitive object={flashingMat} attach="material" />
              </mesh>
            )}
            {/* Jambas Laterales */}
            <mesh position={[op.xMin - 0.015, (op.yMin + op.yMax) / 2, 0]}>
              <boxGeometry args={[0.03, op.height, 0.014]} />
              <primitive object={flashingMat} attach="material" />
            </mesh>
            <mesh position={[op.xMax + 0.015, (op.yMin + op.yMax) / 2, 0]}>
              <boxGeometry args={[0.03, op.height, 0.014]} />
              <primitive object={flashingMat} attach="material" />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
