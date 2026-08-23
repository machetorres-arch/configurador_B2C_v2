import React, { useMemo } from 'react';
import * as THREE from 'three';
import { TimberPiece } from './TimberPiece';

interface SipGableAssemblyProps {
  width: number;             // Ancho base del frontón en metros (widthM)
  height: number;            // Altura de cumbrera del frontón (gableRoofHeightM)
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
  const osbThick = 0.0111; // 11.1 mm tablero OSB estructural
  const epsThick = Math.max(0.04, totalThickness - 2 * osbThick);
  const timberWidth = epsThick; // 92 mm ancho para embutir en rebaje de panel

  const frontMat = useCladdingOnFront && claddingMaterial ? claddingMaterial : materials.osbSip;
  const rearMat = materials.osbSip;
  const epsMat = materials.epsCore;

  // Ángulo de caída del frontón y longitud de la solera inclinada
  const slopeAngle = Math.atan2(height, width / 2);
  const rakeLength = Math.hypot(width / 2, height);

  // Material de aristas técnicas CAD/BIM
  const edgeLineMat = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: '#2a1604',
      linewidth: 2,
      transparent: true,
      opacity: 0.85,
    });
  }, []);

  // 1. MODULACIÓN DE GAJOS / PANELES DEL FRONTÓN (Formato estándar 1.22 m de ancho x máx 2.44 m de alto)
  // Se dividen simétricamente desde el centro (x=0) hacia ambos costados respetando el ancho estándar de 1.22m
  const segments = useMemo(() => {
    const segs: GableSegment[] = [];
    const panelWidth = 1.22;
    const halfPanelsCount = Math.max(1, Math.ceil((width / 2) / panelWidth));

    const cutsLeft: number[] = [];
    for (let i = halfPanelsCount; i >= 1; i--) {
      const x = -i * panelWidth;
      cutsLeft.push(Math.max(-width / 2, x));
    }
    cutsLeft.push(0);

    const cutsRight: number[] = [0];
    for (let i = 1; i <= halfPanelsCount; i++) {
      const x = i * panelWidth;
      cutsRight.push(Math.min(width / 2, x));
    }

    // Filtramos duplicados en caso de extremos
    const allCuts = Array.from(new Set([...cutsLeft, ...cutsRight])).sort((a, b) => a - b);

    for (let i = 0; i < allCuts.length - 1; i++) {
      const x0 = allCuts[i];
      const x1 = allCuts[i + 1];
      const w = x1 - x0;
      if (w < 0.05) continue;

      const y0 = height * (1 - Math.abs(x0) / (width / 2));
      const y1 = height * (1 - Math.abs(x1) / (width / 2));

      const shape = new THREE.Shape();
      shape.moveTo(x0, 0);
      shape.lineTo(x1, 0);
      shape.lineTo(x1, Math.max(0.01, y1));
      if (x0 < 0 && x1 > 0) {
        // Cruza cumbrera
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
  }, [width, height]);

  // Juntas modulares de unión
  const verticalSeamXList = useMemo(() => {
    const list: { x: number; topY: number }[] = [];
    segments.forEach((seg, i) => {
      if (i > 0) {
        const x = seg.xStart;
        const topY = height * (1 - Math.abs(x) / (width / 2));
        list.push({ x, topY });
      }
    });
    return list;
  }, [segments, width, height]);

  return (
    <group>
      {/* ========================================================================= */}
      {/* 1. ESTRUCTURA DE MADERA DEL FRONTÓN (Soleras y Montantes de Unión)         */}
      {/* ========================================================================= */}
      {(layerTimberStructure || isExploded) && (
        <group>
          {/* A. Solera Inferior Basal del Frontón (apoyo sobre muro perimetral) */}
          <TimberPiece
            args={[width, timberThick, timberWidth]}
            position={[0, timberThick / 2, 0]}
            orientation="horizontal"
            materials={materials}
            isExploded={isExploded}
            explodedProgress={explodedProgress}
          />

          {/* B. Soleras Inclinadas Superiores (Rake Plates izquierda y derecha) */}
          {/* Rake Izquierda */}
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

          {/* Rake Derecha */}
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

          {/* C. Pie Derecho Central de Cumbrera (King Stud) */}
          <TimberPiece
            args={[timberThick, Math.max(0.1, height - timberThick), timberWidth]}
            position={[0, height / 2, 0]}
            orientation="vertical"
            materials={materials}
            isExploded={isExploded}
            explodedProgress={explodedProgress}
          />

          {/* D. Montantes / Splines Verticales en Juntas de Paneles cada 1.22m */}
          {verticalSeamXList.map((seam, sIdx) => {
            if (Math.abs(seam.x) < 0.05) return null; // ya cubierto por king stud
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
            // Geometrías para este gajo modular específico
            const osbFrontGeom = new THREE.ExtrudeGeometry(seg.shape, { depth: osbThick, bevelEnabled: false });
            const epsGeom = new THREE.ExtrudeGeometry(seg.shape, { depth: epsThick, bevelEnabled: false });
            const osbRearGeom = new THREE.ExtrudeGeometry(seg.shape, { depth: osbThick, bevelEnabled: false });
            const edgesGeom = new THREE.EdgesGeometry(osbFrontGeom);

            // Desplazamiento en despiece explotado (hacia afuera y lateralmente)
            const explodeDirX = seg.centerX >= 0 ? 1 : -1;
            const panelOffsetX = isExploded ? explodeDirX * (Math.abs(seg.centerX) * 0.15 + 0.08) * explodedProgress : 0;
            const frontZ = epsThick / 2 + (isExploded ? explodedProgress * 0.22 : 0);
            const rearZ = -epsThick / 2 - osbThick - (isExploded ? explodedProgress * 0.22 : 0);
            const epsZ = -epsThick / 2;

            return (
              <group key={`gable-panel-seg-${sIdx}`} position={[panelOffsetX, 0, 0]}>
                {/* Cara Exterior OSB */}
                <group position={[0, 0, frontZ]}>
                  <mesh geometry={osbFrontGeom} material={frontMat} castShadow receiveShadow />
                  <lineSegments geometry={edgesGeom} material={edgeLineMat} />
                </group>

                {/* Núcleo Central EPS */}
                <group position={[0, 0, epsZ]}>
                  <mesh geometry={epsGeom} material={epsMat} castShadow receiveShadow />
                </group>

                {/* Cara Interior OSB */}
                <group position={[0, 0, rearZ]}>
                  <mesh geometry={osbRearGeom} material={rearMat} castShadow receiveShadow />
                  <lineSegments geometry={edgesGeom} material={edgeLineMat} />
                </group>
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
}

