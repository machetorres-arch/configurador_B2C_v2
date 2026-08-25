import React, { useMemo } from 'react';
import * as THREE from 'three';
import { TimberPiece } from './TimberPiece';

interface SipGableAssemblyProps {
  width: number;             // Ancho base del frontón en metros (widthM)
  height: number;            // Altura de cumbrera del frontón (gableRoofHeightM)
  startHeight?: number;      // Altura inicial en x = -width/2 (para trapezoides en L a 1 agua)
  endHeight?: number;        // Altura final en x = +width/2 (para trapezoides en L a 1 agua)
  roofStyle?: 'gable_valley' | 'single_shed' | 'flat' | 'split_shed';
  slopeDirection?: 'left_to_right' | 'right_to_left'; // Para 1 agua
  totalThickness?: number;   // Espesor total SIP (ej. 0.114 m = 114 mm)
  timberThick?: number;      // Espesor de madera escuadría (0.041 m = 41 mm)
  materials: {
    osbSip: THREE.Material;
    epsCore: THREE.Material;
    osbEdge?: THREE.Material;
    cladding?: THREE.Material;
    timberStructural: THREE.Material;
    timberStructuralVertical?: THREE.Material;
    timberStructuralHorizontal?: THREE.Material;
    timberPine?: THREE.Material;
    timberCCA?: THREE.Material;
  };
  useCladdingOnFront?: boolean;
  claddingMaterial?: THREE.Material;
  layerWallsSip?: boolean;
  layerTimberStructure?: boolean;
  isExploded?: boolean;
  explodedProgress?: number;
}

interface GableSegment {
  idx: number;
  xStart: number;
  xEnd: number;
  width: number;
  yStart: number;
  yEnd: number;
  centerX: number;
  shape: THREE.Shape;
}

interface GableCladdingSheet {
  idx: number;
  xStart: number;
  xEnd: number;
  width: number;
  centerX: number;
  shape: THREE.Shape;
}

/**
 * Frontón Triangular / Gablete SIP paramétrico con modulación de planchas estándar 1.22 x 2.44 m
 * Incluye:
 * - Paneles SIP individuales cortados diagonalmente (OSB 11.1mm + Núcleo EPS 92mm + OSB 11.1mm)
 * - Enmaderado perimetral e interior completo (Solera basal, Soleras inclinadas Rake Plates, Pie derecho central y montantes de unión cada 1.22m)
 * - Despiece independiente en modo explotado
 */
export function SipGableAssembly({
  width,
  height,
  startHeight,
  endHeight,
  roofStyle = 'gable_valley',
  slopeDirection = 'left_to_right',
  totalThickness = 0.114,
  timberThick = 0.041,
  materials,
  useCladdingOnFront = false,
  claddingMaterial,
  layerWallsSip = true,
  layerTimberStructure = true,
  isExploded = false,
  explodedProgress = 0,
}: SipGableAssemblyProps) {
  const maxEffHeight = Math.max(height, startHeight || 0, endHeight || 0);
  if (roofStyle === 'flat' || maxEffHeight <= 0.03) return null;

  const isSingleShed = roofStyle === 'single_shed';
  const osbThick = 0.0111; // 11.1 mm tablero OSB estructural
  const epsThick = Math.max(0.04, totalThickness - 2 * osbThick);
  const timberWidth = epsThick; // 92 mm ancho para embutir en rebaje de panel

  const frontMat = materials.osbSip;
  const rearMat = materials.osbSip;
  const epsMat = materials.epsCore;
  const hasCladdingLayer = useCladdingOnFront && claddingMaterial && claddingMaterial !== materials.osbSip;

  // Alturas efectivas inicial y final para 1 agua
  const hStart = startHeight !== undefined
    ? startHeight
    : slopeDirection === 'right_to_left' ? height : 0;
  const hEnd = endHeight !== undefined
    ? endHeight
    : slopeDirection === 'right_to_left' ? 0 : height;

  const deltaH = hEnd - hStart;
  const slopeAngle = isSingleShed
    ? Math.atan2(Math.abs(deltaH), width)
    : Math.atan2(height, width / 2);
  const rakeLength = isSingleShed
    ? Math.hypot(width, deltaH)
    : Math.hypot(width / 2, height);

  // Material de aristas técnicas CAD/BIM
  const edgeLineMat = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: '#2a1604',
      linewidth: 2,
      transparent: true,
      opacity: 0.85,
    });
  }, []);

  // Función de cálculo de altura Y en posición X del frontón
  const getYAtX = (x: number) => {
    if (isSingleShed) {
      const t = Math.max(0, Math.min(1, (x + width / 2) / width));
      return Math.max(0, hStart + deltaH * t);
    } else {
      // 2 Aguas simétrico
      return Math.max(0, height * (1 - Math.abs(x) / (width / 2)));
    }
  };

  // 1. MODULACIÓN DE GAJOS / PANELES DEL FRONTÓN (Formato estándar 1.22 m de ancho)
  const segments = useMemo(() => {
    const segs: GableSegment[] = [];
    const panelWidth = 1.22;

    const cuts: number[] = [];
    if (isSingleShed) {
      const numPanels = Math.max(1, Math.ceil(width / panelWidth));
      const step = width / numPanels;
      for (let i = 0; i <= numPanels; i++) {
        cuts.push(-width / 2 + i * step);
      }
    } else {
      const halfPanelsCount = Math.max(1, Math.ceil((width / 2) / panelWidth));
      for (let i = halfPanelsCount; i >= 1; i--) {
        cuts.push(Math.max(-width / 2, -i * panelWidth));
      }
      cuts.push(0);
      for (let i = 1; i <= halfPanelsCount; i++) {
        cuts.push(Math.min(width / 2, i * panelWidth));
      }
    }

    const allCuts = Array.from(new Set(cuts)).sort((a, b) => a - b);

    for (let i = 0; i < allCuts.length - 1; i++) {
      const x0 = allCuts[i];
      const x1 = allCuts[i + 1];
      const w = x1 - x0;
      if (w < 0.04) continue;

      const y0 = getYAtX(x0);
      const y1 = getYAtX(x1);

      const shape = new THREE.Shape();
      shape.moveTo(x0, 0);
      shape.lineTo(x1, 0);
      shape.lineTo(x1, Math.max(0.01, y1));
      if (!isSingleShed && x0 < 0 && x1 > 0) {
        shape.lineTo(0, height);
      }
      shape.lineTo(x0, Math.max(0.01, y0));
      shape.closePath();

      segs.push({
        idx: i,
        xStart: x0,
        xEnd: x1,
        width: w,
        yStart: y0,
        yEnd: y1,
        centerX: (x0 + x1) / 2,
        shape,
      });
    }

    return segs;
  }, [width, height, isSingleShed, hStart, hEnd, deltaH]);

  // 2. MODULACIÓN DE PLANCHAS INDIVIDUALES DE REVESTIMIENTO EXTERIOR (Formato estándar 0.275m / 0.38m de ancho)
  const claddingSheets = useMemo(() => {
    if (!hasCladdingLayer) return [];
    const sheetModule = 0.275; // Ancho modular nominal plancha zinc (Arratia Microacanalado 27.5 cm)
    const sheets: GableCladdingSheet[] = [];

    let currentX = -width / 2;
    let sheetIdx = 0;

    while (currentX < width / 2 - 0.002) {
      const remaining = width / 2 - currentX;
      const w = remaining >= sheetModule ? sheetModule : remaining;
      const x0 = currentX;
      const x1 = currentX + w;
      const y0 = getYAtX(x0);
      const y1 = getYAtX(x1);

      const shape = new THREE.Shape();
      shape.moveTo(x0, 0);
      shape.lineTo(x1, 0);
      shape.lineTo(x1, Math.max(0.005, y1));
      if (!isSingleShed && x0 < 0 && x1 > 0) {
        shape.lineTo(0, height);
      }
      shape.lineTo(x0, Math.max(0.005, y0));
      shape.closePath();

      sheets.push({
        idx: sheetIdx,
        xStart: x0,
        xEnd: x1,
        width: w,
        centerX: (x0 + x1) / 2,
        shape,
      });

      currentX += w;
      sheetIdx++;
    }

    return sheets;
  }, [hasCladdingLayer, width, height, isSingleShed, hStart, hEnd, deltaH]);

  // Juntas modulares de unión
  const verticalSeamXList = useMemo(() => {
    const list: { x: number; topY: number }[] = [];
    segments.forEach((seg, i) => {
      if (i > 0) {
        const x = seg.xStart;
        const topY = getYAtX(x);
        list.push({ x, topY });
      }
    });
    return list;
  }, [segments, width, height, isSingleShed, hStart, hEnd, deltaH]);

  const rakeMidY = isSingleShed ? (hStart + hEnd) / 2 : height / 2;
  const singleRakeRotationZ = deltaH >= 0 ? slopeAngle : -slopeAngle;

  return (
    <group>
      {/* ========================================================================= */}
      {/* 1. ESTRUCTURA DE MADERA DEL FRONTÓN (Soleras y Montantes de Unión)         */}
      {/* ========================================================================= */}
      {(layerTimberStructure || isExploded) && (
        <group>
          {/* A. Solera Inferior Basal del Frontón */}
          <TimberPiece
            args={[width, timberThick, timberWidth]}
            position={[0, timberThick / 2, 0]}
            orientation="horizontal"
            materials={materials}
            isExploded={isExploded}
            explodedProgress={explodedProgress}
          />

          {/* B. Soleras Inclinadas Superiores (Rake Plates) */}
          {isSingleShed ? (
            /* Rake Plate único continuo a 1 agua */
            <group
              position={[
                0,
                rakeMidY + (isExploded ? explodedProgress * 0.15 : 0),
                0,
              ]}
              rotation={[0, 0, singleRakeRotationZ]}
            >
              <TimberPiece
                args={[rakeLength, timberThick, timberWidth]}
                position={[0, 0, 0]}
                orientation="horizontal"
                materials={materials}
                isExploded={isExploded}
                explodedProgress={explodedProgress}
              />
            </group>
          ) : (
            /* 2 Aguas simétrico */
            <group>
              <group
                position={[-width / 4, height / 2 + (isExploded ? explodedProgress * 0.15 : 0), 0]}
                rotation={[0, 0, slopeAngle]}
              >
                <TimberPiece
                  args={[rakeLength, timberThick, timberWidth]}
                  position={[0, 0, 0]}
                  orientation="horizontal"
                  materials={materials}
                  isExploded={isExploded}
                  explodedProgress={explodedProgress}
                />
              </group>
              <group
                position={[width / 4, height / 2 + (isExploded ? explodedProgress * 0.15 : 0), 0]}
                rotation={[0, 0, -slopeAngle]}
              >
                <TimberPiece
                  args={[rakeLength, timberThick, timberWidth]}
                  position={[0, 0, 0]}
                  orientation="horizontal"
                  materials={materials}
                  isExploded={isExploded}
                  explodedProgress={explodedProgress}
                />
              </group>
            </group>
          )}

          {/* C. Pie Derecho Principal en punto más alto */}
          {isSingleShed ? (
            <TimberPiece
              args={[timberThick, Math.max(0.1, Math.max(hStart, hEnd) - timberThick), timberWidth]}
              position={[
                hEnd >= hStart ? width / 2 - timberThick / 2 : -width / 2 + timberThick / 2,
                Math.max(hStart, hEnd) / 2,
                0,
              ]}
              orientation="vertical"
              materials={materials}
              isExploded={isExploded}
              explodedProgress={explodedProgress}
            />
          ) : (
            <TimberPiece
              args={[timberThick, Math.max(0.1, height - timberThick), timberWidth]}
              position={[0, height / 2, 0]}
              orientation="vertical"
              materials={materials}
              isExploded={isExploded}
              explodedProgress={explodedProgress}
            />
          )}

          {/* D. Montantes / Splines Verticales en Juntas de Paneles */}
          {verticalSeamXList.map((seam, sIdx) => {
            const studH = Math.max(0.1, seam.topY - timberThick);
            return (
              <TimberPiece
                key={`gable-stud-${sIdx}`}
                args={[timberThick, studH, timberWidth]}
                position={[seam.x, seam.topY / 2, 0]}
                orientation="vertical"
                materials={materials}
                isExploded={isExploded}
                explodedProgress={explodedProgress}
              />
            );
          })}
        </group>
      )}

      {/* ========================================================================= */}
      {/* 2. PANELES SIP MODULARES DEL FRONTÓN (Corte diagonal en formato 1.22x2.44m) */}
      {/* ========================================================================= */}
      {(layerWallsSip || isExploded) && (
        <group>
          {segments.map((seg, sIdx) => {
            const osbFrontGeom = new THREE.ExtrudeGeometry(seg.shape, { depth: osbThick, bevelEnabled: false });
            const epsGeom = new THREE.ExtrudeGeometry(seg.shape, { depth: epsThick, bevelEnabled: false });
            const osbRearGeom = new THREE.ExtrudeGeometry(seg.shape, { depth: osbThick, bevelEnabled: false });
            const edgesGeom = new THREE.EdgesGeometry(osbFrontGeom);

            const explodeDirX = seg.centerX >= 0 ? 1 : -1;
            const panelOffsetX = isExploded ? explodeDirX * (Math.abs(seg.centerX) * 0.15 + 0.08) * explodedProgress : 0;
            const frontZ = epsThick / 2 + (isExploded ? explodedProgress * 0.22 : 0);
            const rearZ = -epsThick / 2 - osbThick - (isExploded ? explodedProgress * 0.22 : 0);
            const epsZ = -epsThick / 2;

            return (
              <group key={`gable-panel-seg-${sIdx}`} position={[panelOffsetX, 0, 0]}>
                <group position={[0, 0, frontZ]}>
                  <mesh geometry={osbFrontGeom} material={frontMat} castShadow receiveShadow />
                  <lineSegments geometry={edgesGeom} material={edgeLineMat} />
                </group>
                <group position={[0, 0, epsZ]}>
                  <mesh geometry={epsGeom} material={epsMat} castShadow receiveShadow />
                </group>
                <group position={[0, 0, rearZ]}>
                  <mesh geometry={osbRearGeom} material={rearMat} castShadow receiveShadow />
                  <lineSegments geometry={edgesGeom} material={edgeLineMat} />
                </group>
              </group>
            );
          })}
        </group>
      )}

      {/* ========================================================================= */}
      {/* 3. CAPA DE REVESTIMIENTO EXTERIOR DE FRONTÓN (Despiece modular por plancha individual de zinc) */}
      {/* ========================================================================= */}
      {hasCladdingLayer && (
        <group position={[0, 0, epsThick / 2 + osbThick + 0.02 + (isExploded ? explodedProgress * 0.38 : 0)]}>
          {claddingSheets.map((sheet, sIdx) => {
            const cladGeom = new THREE.ExtrudeGeometry(sheet.shape, {
              depth: 0.012,
              bevelEnabled: true,
              bevelSegments: 1,
              steps: 1,
              bevelSize: 0.0015,
              bevelThickness: 0.0015,
            });
            const edgesGeom = new THREE.EdgesGeometry(cladGeom);
            const totalCount = claddingSheets.length;
            const spreadX = isExploded ? (sheet.idx - (totalCount - 1) / 2) * (explodedProgress * 0.14) : 0;
            const staggerZ = isExploded ? (sIdx % 2 === 0 ? 0.035 : -0.025) * explodedProgress : 0;

            const sheetMidY = (getYAtX(sheet.xStart) + getYAtX(sheet.xEnd)) / 2;

            return (
              <group key={`gable-clad-sheet-${sIdx}`} position={[spreadX, 0, staggerZ]}>
                {/* Plancha unitaria cortada a la pendiente */}
                <mesh geometry={cladGeom} material={claddingMaterial!} castShadow receiveShadow />

                {/* Nervio vertical de machihembrado de zinc */}
                <mesh position={[sheet.xEnd - 0.003, sheetMidY / 2, 0.014]} castShadow>
                  <boxGeometry args={[0.006, Math.max(0.05, sheetMidY), 0.008]} />
                  <primitive object={claddingMaterial!} attach="material" />
                </mesh>

                {/* Aristas técnicas para despiece unitario */}
                <lineSegments geometry={edgesGeom} material={edgeLineMat} />
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
}

