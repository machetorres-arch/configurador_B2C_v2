import React, { useMemo } from 'react';
import * as THREE from 'three';
import { RoofCladding } from '../../store/sipHouseStore';

interface SipRoofCladdingAssemblyProps {
  rafterLength: number; // Largo de la caída / faldón en metros (ej. 2.40 m)
  roofLength: number;   // Largo a lo largo de la cumbrera/alero en metros (ej. 6.50 m)
  roofThickness?: number; // Espesor del panel SIP (ej. 0.210 m)
  claddingType: RoofCladding;
  materials: {
    osbRoofSip?: THREE.Material;
    osbSip: THREE.Material;
    epsCore: THREE.Material;
    timberPine?: THREE.Material;
    timberStructural?: THREE.Material;
    arratiaCladding?: THREE.Material;
    zincalumBlack?: THREE.Material;
    zincCa8?: THREE.Material;
    asphaltShingle?: THREE.Material;
    tyvekMembrane?: THREE.Material;
    flashingBlack?: THREE.Material;
  };
  axisAlongSlope?: 'x' | 'z'; // 'x' para techos principales, 'z' para alas en L transversales
  eaveSide?: 'min' | 'max';   // 'min' si el alero está en -coords, 'max' si está en +coords
  isExploded?: boolean;
  explodedProgress?: number;
}

interface RoofSheet {
  idx: number;
  start: number;
  end: number;
  width: number;
  center: number;
  isCutPiece: boolean;
}

/**
 * Capa de Revestimiento y Terminación de Cubierta Exterior Paramétrica
 * Renderiza fielmente según las EETT de techumbre seleccionadas:
 * 1. Membrana Asfáltica / Tyvek Supro de Cubierta (Barrera Hidrófuga Continua)
 * 2. Costaneras / Enlistonado de Madera 2x2" (Ventilación y Fijación estructural)
 * 3. Planchas de Cubierta Modularizadas por Unidad (Zinc CA-8, Arratia Microacanalado, Teja Asfáltica)
 * 4. Remates y Hojalatería Perimetral (Cortagoteras de alero, Forros de tapacán y fijaciones EPDM)
 */
export function SipRoofCladdingAssembly({
  rafterLength,
  roofLength,
  roofThickness = 0.210,
  claddingType,
  materials,
  axisAlongSlope = 'x',
  eaveSide = 'min',
  isExploded = false,
  explodedProgress = 0,
}: SipRoofCladdingAssemblyProps) {
  if (claddingType === 'panel_sip_visto') return null;

  // Selección del material de cubierta
  const roofMat = useMemo(() => {
    switch (claddingType) {
      case 'arratia_microacanalado':
        return materials.arratiaCladding || materials.zincalumBlack || materials.osbSip;
      case 'zinc_ca8_negro':
        return materials.zincCa8 || materials.zincalumBlack || materials.osbSip;
      case 'teja_asfaltica_negra':
        return materials.asphaltShingle || materials.zincalumBlack || materials.osbSip;
      default:
        return materials.zincalumBlack || materials.osbSip;
    }
  }, [claddingType, materials]);

  const tyvekMat = materials.tyvekMembrane || materials.osbSip;
  const furringMat = materials.timberPine || materials.timberStructural || materials.osbSip;
  const flashingMat = materials.flashingBlack || materials.zincalumBlack || materials.osbSip;

  // Material de aristas técnicas de despiece
  const sheetEdgeMat = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: '#0f172a',
      linewidth: 2,
      transparent: true,
      opacity: 0.9,
    });
  }, []);

  // Material tornillos con golilla EPDM
  const screwMetalMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#475569',
      metalness: 0.85,
      roughness: 0.25,
    });
  }, []);

  const washerMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.9,
    });
  }, []);

  // Ancho modular por plancha de catálogo
  const sheetModule = claddingType === 'arratia_microacanalado' ? 0.275 : 0.380;

  // Despiece modular de planchas a lo largo de la longitud del techo (roofLength)
  const modularSheets: RoofSheet[] = useMemo(() => {
    const sheets: RoofSheet[] = [];
    let cur = -roofLength / 2;
    let idx = 0;

    while (cur < roofLength / 2 - 0.002) {
      const remaining = roofLength / 2 - cur;
      const w = remaining >= sheetModule ? sheetModule : remaining;
      const start = cur;
      const end = cur + w;
      const center = cur + w / 2;
      const isCutPiece = Math.abs(w - sheetModule) > 0.005;

      sheets.push({
        idx,
        start,
        end,
        width: w,
        center,
        isCutPiece,
      });

      cur += w;
      idx++;
    }

    return sheets;
  }, [roofLength, sheetModule]);

  // Modulación de Costaneras / Enlistonado (cada ~0.55m a lo largo de la caída)
  const numPurlins = Math.max(2, Math.ceil(rafterLength / 0.55) + 1);
  const purlinPositions = useMemo(() => {
    const pos: number[] = [];
    for (let i = 0; i < numPurlins; i++) {
      pos.push(-rafterLength / 2 + (i * rafterLength) / (numPurlins - 1));
    }
    return pos;
  }, [numPurlins, rafterLength]);

  // Desplazamiento en eje Y normal a la pendiente en modo explosionado
  const expTyvekY = isExploded ? explodedProgress * 0.06 : 0;
  const expFurringY = isExploded ? explodedProgress * 0.16 : 0;
  const expCladdingY = isExploded ? explodedProgress * 0.36 : 0;
  const expScrewsY = isExploded ? explodedProgress * 0.46 : 0;
  const expFlashingsY = isExploded ? explodedProgress * 0.40 : 0;

  const baseSurfaceY = roofThickness / 2;

  // Orientación del faldón: 'x' (normal) o 'z' (ala transversal)
  const isAlongX = axisAlongSlope === 'x';

  return (
    <group position={[0, 0, 0]}>
      {/* ========================================================================= */}
      {/* 1. MEMBRANA HIDRÓFUGA RESPIRABLE / FIELTRO ASFÁLTICO DE TECHUMBRE         */}
      {/* ========================================================================= */}
      <group position={[0, baseSurfaceY + 0.002 + expTyvekY, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry
            args={
              isAlongX
                ? [rafterLength + 0.02, 0.0015, roofLength + 0.02]
                : [roofLength + 0.02, 0.0015, rafterLength + 0.02]
            }
          />
          <primitive object={tyvekMat} attach="material" />
        </mesh>

        {/* Líneas de traslape técnico horizontal de membrana */}
        {purlinPositions.map((pPos, pIdx) => {
          if (pIdx === 0 || pIdx === purlinPositions.length - 1) return null;
          return (
            <mesh
              key={`roof-tyvek-overlap-${pIdx}`}
              position={isAlongX ? [pPos, 0.001, 0] : [0, 0.001, pPos]}
            >
              <boxGeometry
                args={
                  isAlongX
                    ? [0.004, 0.001, roofLength]
                    : [roofLength, 0.001, 0.004]
                }
              />
              <meshBasicMaterial color="#1e3a8a" opacity={0.6} transparent />
            </mesh>
          );
        })}
      </group>

      {/* ========================================================================= */}
      {/* 2. COSTANERAS / ENLISTONADO DE MADERA 2x2" (41x41 mm) PARA VENTILACIÓN     */}
      {/* ========================================================================= */}
      <group position={[0, baseSurfaceY + 0.021 + expFurringY, 0]}>
        {purlinPositions.map((pPos, pIdx) => {
          return (
            <group
              key={`roof-purlin-${pIdx}`}
              position={isAlongX ? [pPos, 0, 0] : [0, 0, pPos]}
            >
              <mesh castShadow receiveShadow>
                <boxGeometry
                  args={
                    isAlongX
                      ? [0.041, 0.038, roofLength]
                      : [roofLength, 0.038, 0.041]
                  }
                />
                <primitive object={furringMat} attach="material" />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* ========================================================================= */}
      {/* 3. PLANCHAS MODULARES DE CUBIERTA (DESPIECE UNITARIO POR PLANCHA)         */}
      {/* ========================================================================= */}
      <group position={[0, baseSurfaceY + 0.046 + expCladdingY, 0]}>
        {modularSheets.map((sheet, sIdx) => {
          const totalSheets = modularSheets.length;
          // Ligero espaciado lateral en modo explosionado
          const sheetSpread = isExploded
            ? (sheet.idx - (totalSheets - 1) / 2) * (explodedProgress * 0.08)
            : 0;
          const staggerY = isExploded ? (sIdx % 2 === 0 ? 0.02 : -0.015) * explodedProgress : 0;

          const sheetCenterPos = sheet.center + sheetSpread;

          return (
            <group
              key={`roof-clad-sheet-${sIdx}`}
              position={
                isAlongX
                  ? [0, staggerY, sheetCenterPos]
                  : [sheetCenterPos, staggerY, 0]
              }
            >
              {/* Cuerpo principal de la plancha de cubierta */}
              <mesh castShadow receiveShadow>
                <boxGeometry
                  args={
                    isAlongX
                      ? [rafterLength, 0.012, sheet.width - 0.001]
                      : [sheet.width - 0.001, 0.012, rafterLength]
                  }
                />
                <primitive object={roofMat} attach="material" />
              </mesh>

              {/* Aristas técnicas de junta y corte */}
              <lineSegments>
                <edgesGeometry
                  args={[
                    new THREE.BoxGeometry(
                      isAlongX ? rafterLength : sheet.width - 0.001,
                      0.012,
                      isAlongX ? sheet.width - 0.001 : rafterLength
                    ),
                  ]}
                />
                <primitive object={sheetEdgeMat} attach="material" />
              </lineSegments>

              {/* Nervio longitudinal de machihembrado / cresta trapezoidal de zinc */}
              {claddingType !== 'teja_asfaltica_negra' && (
                <group
                  position={
                    isAlongX
                      ? [0, 0.012, sheet.width / 2 - 0.004]
                      : [sheet.width / 2 - 0.004, 0.012, 0]
                  }
                >
                  <mesh castShadow>
                    <boxGeometry
                      args={
                        isAlongX
                          ? [rafterLength, 0.014, 0.008]
                          : [0.008, 0.014, rafterLength]
                      }
                    />
                    <primitive object={roofMat} attach="material" />
                  </mesh>
                </group>
              )}

              {/* Fijaciones: Tornillos autoperforantes con golilla EPDM en cada cruce con costanera */}
              <group position={[0, expScrewsY - expCladdingY, 0]}>
                {purlinPositions.map((pPos, pIdx) => {
                  return (
                    <group
                      key={`screw-${sIdx}-${pIdx}`}
                      position={
                        isAlongX
                          ? [pPos, 0.012, 0]
                          : [0, 0.012, pPos]
                      }
                    >
                      {/* Golilla de Neopreno / EPDM Negro */}
                      <mesh position={[0, 0.001, 0]}>
                        <cylinderGeometry args={[0.006, 0.006, 0.002, 8]} />
                        <primitive object={washerMat} attach="material" />
                      </mesh>
                      {/* Cabeza Hexagonal del Tornillo Autoperforante */}
                      <mesh position={[0, 0.005, 0]}>
                        <cylinderGeometry args={[0.0045, 0.0045, 0.006, 6]} />
                        <primitive object={screwMetalMat} attach="material" />
                      </mesh>
                    </group>
                  );
                })}
              </group>
            </group>
          );
        })}
      </group>

      {/* ========================================================================= */}
      {/* 4. HOJALATERÍA Y REMATES PERIMETRALES (CORTAGOTAS DE ALERO Y TAPACANES)    */}
      {/* ========================================================================= */}
      <group position={[0, baseSurfaceY + 0.05 + expFlashingsY, 0]}>
        {/* A. Forro Cortagoteras de Alero Inferior (Eave Drip Edge) */}
        {(() => {
          const eavePos = eaveSide === 'min' ? -rafterLength / 2 : rafterLength / 2;
          return (
            <group position={isAlongX ? [eavePos, -0.015, 0] : [0, -0.015, eavePos]}>
              <mesh castShadow>
                <boxGeometry
                  args={
                    isAlongX
                      ? [0.06, 0.04, roofLength + 0.04]
                      : [roofLength + 0.04, 0.04, 0.06]
                  }
                />
                <primitive object={flashingMat} attach="material" />
              </mesh>
            </group>
          );
        })()}

        {/* B. Forros de Tapacán / Remate Lateral de Viento en ambos extremos (Gable Rake) */}
        {[-roofLength / 2, roofLength / 2].map((edgePos, eIdx) => {
          return (
            <group
              key={`roof-edge-flashing-${eIdx}`}
              position={isAlongX ? [0, 0.002, edgePos] : [edgePos, 0.002, 0]}
            >
              <mesh castShadow>
                <boxGeometry
                  args={
                    isAlongX
                      ? [rafterLength + 0.04, 0.03, 0.045]
                      : [0.045, 0.03, rafterLength + 0.04]
                  }
                />
                <primitive object={flashingMat} attach="material" />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}
