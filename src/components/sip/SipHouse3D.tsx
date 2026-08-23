import React, { useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { useSipHouseStore } from '../../store/sipHouseStore';
import { getSipTextures } from '../../utils/sipTextures';
import { SipIndividualPanel } from './SipIndividualPanel';
import { SipWallAssembly } from './SipWallAssembly';
import { SipInteriorWallAssembly } from './SipInteriorWallAssembly';
import { TimberPiece } from './TimberPiece';
import { SipDimensionAnnotations3D } from './SipDimensionAnnotations3D';
import { SipGableAssembly } from './SipGableAssembly';

/**
 * Función utilitaria para dividir un tramo estructural en paneles SIP estándar (1.22m ancho x máx 2.44m largo)
 */
function getModularPanels(totalSpan: number, maxStep = 1.22) {
  const count = Math.max(1, Math.ceil(totalSpan / maxStep));
  const step = totalSpan / count;
  const panels = [];
  for (let i = 0; i < count; i++) {
    panels.push({
      index: i,
      center: -totalSpan / 2 + step * (i + 0.5),
      width: step,
      count,
    });
  }
  return panels;
}

interface Grid2DPanel {
  xi: number;
  zi: number;
  cx: number;
  cz: number;
  w: number;
  l: number;
  countX: number;
  countZ: number;
}

/**
 * Modula la vertiente de techumbre a 2 aguas en paneles SIP de formato estándar (1.22 x 2.44 m):
 * - A lo largo de la caída de agua (rafterLen): Planchas de largo comercial estándar 2.44 m. Si rafterLen <= 2.44 m,
 *   es un único panel continuo sin cortes longitudinales; si es mayor, se ubica una plancha de 2.44 m y el remate restante.
 * - A lo largo de la cumbrera/longitud del techo (totalRoofLen): Paneles de ancho comercial estándar 1.22 m.
 */
function getRoofModularPanels(rafterLen: number, totalRoofLen: number): Grid2DPanel[] {
  // Franjas a lo largo de la caída de agua (rafterLen)
  const xSegments: { xStart: number; width: number }[] = [];
  if (rafterLen <= 2.44) {
    xSegments.push({ xStart: -rafterLen / 2, width: rafterLen });
  } else {
    let curX = -rafterLen / 2;
    let remaining = rafterLen;
    while (remaining > 0.05) {
      const segW = Math.min(remaining, 2.44);
      xSegments.push({ xStart: curX, width: segW });
      curX += segW;
      remaining -= segW;
    }
  }

  // Franjas a lo largo de la cumbrera / longitud del techo (totalRoofLen)
  const countZ = Math.max(1, Math.ceil(totalRoofLen / 1.22));
  const stepZ = totalRoofLen / countZ;

  const panels: Grid2DPanel[] = [];
  xSegments.forEach((xSeg, xi) => {
    for (let zi = 0; zi < countZ; zi++) {
      const cz = -totalRoofLen / 2 + stepZ * (zi + 0.5);
      const cx = xSeg.xStart + xSeg.width / 2;
      panels.push({
        xi,
        zi,
        cx,
        cz,
        w: xSeg.width,
        l: stepZ,
        countX: xSegments.length,
        countZ,
      });
    }
  });

  return panels;
}

/**
 * Divide una superficie rectangular (Losa o Faldón plano) en una grilla de paneles SIP estándar
 * con ancho estándar <= 1.22m y longitud estándar <= 2.44m
 */
function getModular2DPanels(spanX: number, spanZ: number, maxW = 2.44, maxL = 1.22): Grid2DPanel[] {
  const countX = Math.max(1, Math.ceil(spanX / maxW));
  const countZ = Math.max(1, Math.ceil(spanZ / maxL));
  const stepX = spanX / countX;
  const stepZ = spanZ / countZ;

  const panels: Grid2DPanel[] = [];
  for (let xi = 0; xi < countX; xi++) {
    for (let zi = 0; zi < countZ; zi++) {
      panels.push({
        xi,
        zi,
        cx: -spanX / 2 + stepX * (xi + 0.5),
        cz: -spanZ / 2 + stepZ * (zi + 0.5),
        w: stepX,
        l: stepZ,
        countX,
        countZ,
      });
    }
  }
  return panels;
}

export function SipHouse3D() {
  const {
    dimensions: dim,
    wallThicknessMm,
    floorThicknessMm,
    roofThicknessMm,
    foundationType,
    exteriorCladding,
    roofCladding,
    interiorCeiling,
    flooringType,
    openings,
    interiorWalls,
    layerFoundations,
    layerFloorSip,
    layerWallsSip,
    layerInteriorWalls,
    layerTimberStructure,
    layerRoofSip,
    layerCladding,
    layerWindowsDoors,
    layerElectricalMep,
    layerSanitaryMep,
    layerGasMep,
    isTransparent,
    explodedProgress,
  } = useSipHouseStore();

  // Dimensiones en metros
  const lengthM = dim.length / 100;     // Eje Z (Largo, ej. 6.0 m)
  const widthM = dim.width / 100;       // Eje X (Ancho, ej. 4.0 m)
  const eaveHM = dim.eaveHeight / 100;  // Altura muros (ej. 2.6 m)
  const ridgeHM = dim.ridgeHeight / 100;// Altura cumbrera (ej. 3.6 m)
  const overhangM = (dim.overhang || 25) / 100;

  const wallThickM = (wallThicknessMm || 114) / 1000;   // Espesor Muros SIP dinámico (75/90/114/162 mm)
  const floorThickM = (floorThicknessMm || 162) / 1000; // Espesor Losa SIP dinámico (90/114/162/210 mm)
  const roofThickM = (roofThicknessMm || 210) / 1000;   // Espesor Techo SIP dinámico (114/162/210 mm)

  const timberWidthM = Math.max(0.045, wallThickM - 0.022);  // Ancho escuadría madera en alvéolo según espesor
  const timberThickM = 0.041;  // Espesor nominal solera (2" nominal / 41 mm cepillado)

  // Factores cinemáticos de explosión global
  const expY = explodedProgress * 2.6;
  const expOutX = explodedProgress * 1.6;
  const expOutZ = explodedProgress * 1.6;
  const expFoundY = -explodedProgress * 1.1;
  const isExploded = explodedProgress > 0.02;

  // Texturas procedurales de alta definición
  const textures = useMemo(() => getSipTextures(), []);

  // Materiales realistas SIP y EETT
  const materials = useMemo(() => {
    return {
      osbSip: new THREE.MeshStandardMaterial({
        map: textures.osbTexture,
        bumpMap: textures.osbBumpMap,
        bumpScale: 0.015,
        roughness: 0.82,
        metalness: 0.02,
        transparent: isTransparent,
        opacity: isTransparent ? 0.32 : 1.0,
        depthWrite: !isTransparent,
      }),
      osbRoofSip: new THREE.MeshStandardMaterial({
        map: textures.osbTexture,
        bumpMap: textures.osbBumpMap,
        bumpScale: 0.015,
        roughness: 0.82,
        metalness: 0.02,
        transparent: isTransparent,
        opacity: isTransparent ? 0.32 : 1.0,
        depthWrite: !isTransparent,
      }),
      osbEdge: new THREE.MeshStandardMaterial({
        map: textures.osbEdgeTexture,
        roughness: 0.85,
        metalness: 0.02,
        transparent: isTransparent,
        opacity: isTransparent ? 0.32 : 1.0,
        depthWrite: !isTransparent,
      }),
      epsCore: new THREE.MeshStandardMaterial({
        map: textures.epsTexture,
        color: '#fcfcfd',
        roughness: 0.96,
        metalness: 0.0,
        transparent: isTransparent,
        opacity: isTransparent ? 0.18 : 1.0,
        depthWrite: !isTransparent,
      }),
      timberStructural: new THREE.MeshStandardMaterial({
        map: textures.timberTexture,
        bumpMap: textures.timberBumpMap,
        bumpScale: 0.012,
        color: '#f0d7b4', // Tono pino radiata cepillado natural según foto
        roughness: 0.56,
        metalness: 0.01,
        transparent: isTransparent,
        opacity: isTransparent ? 0.85 : 1.0,
      }),
      timberStructuralVertical: new THREE.MeshStandardMaterial({
        map: textures.timberTexture,
        bumpMap: textures.timberBumpMap,
        bumpScale: 0.014,
        color: '#f0d7b4', // Veta longitudinal vertical para pies derechos
        roughness: 0.56,
        metalness: 0.01,
        transparent: isTransparent,
        opacity: isTransparent ? 0.85 : 1.0,
      }),
      timberStructuralHorizontal: new THREE.MeshStandardMaterial({
        map: textures.timberHorizontalTexture,
        bumpMap: textures.timberBumpMap,
        bumpScale: 0.014,
        color: '#f0d7b4', // Veta longitudinal horizontal para soleras y dinteles
        roughness: 0.56,
        metalness: 0.01,
        transparent: isTransparent,
        opacity: isTransparent ? 0.85 : 1.0,
      }),
      timberEndGrain: new THREE.MeshStandardMaterial({
        map: textures.timberEndGrainTexture,
        color: '#ebd0ac',
        roughness: 0.62,
        metalness: 0.01,
        transparent: isTransparent,
        opacity: isTransparent ? 0.85 : 1.0,
      }),
      timberPine: new THREE.MeshStandardMaterial({
        map: textures.timberHorizontalTexture,
        bumpMap: textures.timberBumpMap,
        bumpScale: 0.012,
        color: '#e5c28e', // Pino natural para envigados y soleras
        roughness: 0.55,
        metalness: 0.01,
        transparent: isTransparent,
        opacity: isTransparent ? 0.85 : 1.0,
      }),
      timberCCA: new THREE.MeshStandardMaterial({
        map: textures.timberTexture,
        bumpMap: textures.timberBumpMap,
        bumpScale: 0.012,
        color: '#b08b58', // Pino tratado basal tono madera tostada cálida
        roughness: 0.68,
        metalness: 0.02,
        transparent: isTransparent,
        opacity: isTransparent ? 0.70 : 1.0,
      }),
      concreteG20: new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        roughness: 0.92,
        metalness: 0.05,
        transparent: isTransparent,
        opacity: isTransparent ? 0.28 : 1.0,
        depthWrite: !isTransparent,
      }),
      rebarSteel: new THREE.MeshStandardMaterial({
        color: isTransparent ? '#38bdf8' : '#475569',
        roughness: 0.25,
        metalness: 0.9,
      }),
      wireMeshSteel: new THREE.MeshStandardMaterial({
        color: isTransparent ? '#0ea5e9' : '#64748b',
        roughness: 0.25,
        metalness: 0.9,
      }),
      rebarStirrup: new THREE.MeshStandardMaterial({
        color: isTransparent ? '#7dd3fc' : '#94a3b8',
        roughness: 0.3,
        metalness: 0.85,
      }),
      zincalumBlack: new THREE.MeshStandardMaterial({
        color: '#1a202c',
        roughness: 0.32,
        metalness: 0.82,
        transparent: isTransparent,
        opacity: isTransparent ? 0.22 : 1.0,
        depthWrite: !isTransparent,
      }),
      timberCladding: new THREE.MeshStandardMaterial({
        color: '#9a6b43',
        roughness: 0.65,
        metalness: 0.05,
        transparent: isTransparent,
        opacity: isTransparent ? 0.25 : 1.0,
        depthWrite: !isTransparent,
      }),
      fiberCement: new THREE.MeshStandardMaterial({
        color: '#64748b',
        roughness: 0.82,
        metalness: 0.1,
        transparent: isTransparent,
        opacity: isTransparent ? 0.25 : 1.0,
        depthWrite: !isTransparent,
      }),
      glassWindow: new THREE.MeshPhysicalMaterial({
        color: '#dbeafe',
        transparent: true,
        opacity: 0.35,
        roughness: 0.05,
        transmission: 0.92,
        thickness: 0.15,
        ior: 1.5,
      }),
      pvcFrameBlack: new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.3, metalness: 0.2 }),
      pvcFrameWood: new THREE.MeshStandardMaterial({ color: '#854d0e', roughness: 0.5, metalness: 0.05 }),
      aluminumRpt: new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.25, metalness: 0.85 }),
      doorLenga: new THREE.MeshStandardMaterial({ color: '#a16207', roughness: 0.55, metalness: 0.05 }),
      doorHardware: new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.2, metalness: 0.9 }),
      floorInterior: new THREE.MeshStandardMaterial({
        color: flooringType === 'porcelanato' ? '#e2e8f0' : flooringType === 'radier_pulido' ? '#64748b' : '#b4814d',
        roughness: 0.45,
        metalness: 0.05,
        transparent: isTransparent,
        opacity: isTransparent ? 0.25 : 1.0,
        depthWrite: !isTransparent,
      }),
      ceilingWood: new THREE.MeshStandardMaterial({
        color: interiorCeiling === 'entablado_pino' ? '#eddcd2' : '#f8fafc',
        roughness: 0.6,
        metalness: 0.02,
        transparent: isTransparent,
        opacity: isTransparent ? 0.22 : 1.0,
        depthWrite: !isTransparent,
      }),
      electricalConduit: new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.4, metalness: 0.2 }),
      sanitaryPprWater: new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.3, metalness: 0.3 }),
      sanitaryPexHot: new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.3, metalness: 0.3 }),
      gasCopperMat: new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.3, metalness: 0.8 }),
      jointLineMat: new THREE.MeshBasicMaterial({ color: '#8c6536' }),
    };
  }, [textures, flooringType, interiorCeiling, isTransparent]);

  // Selección de revestimiento exterior según EETT
  const wallExteriorMat =
    exteriorCladding === 'zincalum_negro'
      ? materials.zincalumBlack
      : exteriorCladding === 'madera_tinglada'
      ? materials.timberCladding
      : exteriorCladding === 'fibrocemento_gris'
      ? materials.fiberCement
      : materials.osbSip;

  const roofExteriorMat =
    roofCladding === 'zinc_ca8_negro' || roofCladding === 'teja_asfaltica_negra'
      ? materials.zincalumBlack
      : materials.osbRoofSip;

  // Ángulo de inclinación y dimensiones del techo
  const isGableRoof = ridgeHM > eaveHM + 0.15;
  const gableRoofHeightM = Math.max(0.05, ridgeHM - eaveHM);
  const roofSlopeAngle = isGableRoof ? Math.atan2(gableRoofHeightM, widthM / 2) : 0;
  const halfSpanM = widthM / 2 + overhangM;
  const roofRafterLength = isGableRoof ? halfSpanM / Math.cos(roofSlopeAngle) : halfSpanM;

  // Posición del centro de los faldones
  const roofMidX = halfSpanM / 2 + (roofThickM / 2) * Math.sin(roofSlopeAngle);
  const roofMidY = isGableRoof
    ? (gableRoofHeightM - overhangM * Math.tan(roofSlopeAngle)) / 2 + (roofThickM / 2) * Math.cos(roofSlopeAngle)
    : roofThickM / 2;

  // Modulaciones estándar de paneles SIP para losas y cubiertas (estándar LP / PROSIP: 1.22m x 2.44m)
  const wallSideLengthM = Math.max(0.6, lengthM - 2 * wallThickM);
  const totalRoofLengthM = lengthM + 2 * overhangM;
  const floorPanels2D = useMemo(() => getModular2DPanels(widthM, lengthM, 2.44, 1.22), [widthM, lengthM]);
  const roofPanels2D = useMemo(
    () => getRoofModularPanels(roofRafterLength, totalRoofLengthM),
    [roofRafterLength, totalRoofLengthM]
  );
  const roofPanelsCountZ = Math.max(1, Math.ceil(totalRoofLengthM / 1.22));

  // Frontón triangular a dos aguas (si aplica)
  const gableFrontShape = useMemo(() => {
    if (!isGableRoof) return null;
    const shape = new THREE.Shape();
    shape.moveTo(-widthM / 2, 0);
    shape.lineTo(widthM / 2, 0);
    shape.lineTo(0, gableRoofHeightM);
    shape.closePath();
    return shape;
  }, [widthM, gableRoofHeightM, isGableRoof]);

  // Ejes estructurales y pilotes según dimensiones paramétricas (NCh 1198 / Manual SIP: max 1.50m entre apoyos)
  const numAxesX = Math.max(2, Math.ceil(widthM / 1.5) + 1);
  const numPilesZ = Math.max(2, Math.ceil(lengthM / 1.5) + 1);

  return (
    <group position={[0, 0, 0]}>
      {/* 1. FUNDACIONES (PILOTES, RADIER SOBRECIMIENTO O PLATEA ARMADA) */}
      {layerFoundations && (
        <group position={[0, expFoundY, 0]}>
          {foundationType === 'pilotes_madera' ? (
            <group>
              {/* Pilotes de Madera Pino CCA y Dados de Hormigón Paramétricos */}
              {Array.from({ length: numAxesX }).map((_, xi) =>
                Array.from({ length: numPilesZ }).map((_, zi) => {
                  const px = -widthM / 2 + (xi * widthM) / (numAxesX - 1);
                  const pz = -lengthM / 2 + (zi * lengthM) / (numPilesZ - 1);
                  return (
                    <group key={`pil-${xi}-${zi}`} position={[px, -0.45, pz]}>
                      <mesh position={[0, -0.25, 0]} material={materials.concreteG20} castShadow>
                        <boxGeometry args={[0.45, 0.5, 0.45]} />
                      </mesh>
                      {/* Estructura Metálica del Dado de Hormigón (Canastillo 4 barras + 3 estribos) */}
                      <group position={[0, -0.25, 0]}>
                        {[-0.14, 0.14].map((bx, bxi) =>
                          [-0.14, 0.14].map((bz, bzi) => (
                            <mesh key={`reb-p-${bxi}-${bzi}`} position={[bx, 0, bz]} material={materials.rebarSteel}>
                              <cylinderGeometry args={[0.005, 0.005, 0.42, 6]} />
                            </mesh>
                          ))
                        )}
                        {[-0.15, 0, 0.15].map((sy, si) => (
                          <group key={`est-p-${si}`} position={[0, sy, 0]}>
                            <mesh position={[0, 0, 0.14]} material={materials.rebarStirrup}>
                              <boxGeometry args={[0.29, 0.004, 0.004]} />
                            </mesh>
                            <mesh position={[0, 0, -0.14]} material={materials.rebarStirrup}>
                              <boxGeometry args={[0.29, 0.004, 0.004]} />
                            </mesh>
                            <mesh position={[0.14, 0, 0]} material={materials.rebarStirrup}>
                              <boxGeometry args={[0.004, 0.004, 0.29]} />
                            </mesh>
                            <mesh position={[-0.14, 0, 0]} material={materials.rebarStirrup}>
                              <boxGeometry args={[0.004, 0.004, 0.29]} />
                            </mesh>
                          </group>
                        ))}
                      </group>
                      <mesh position={[0, 0.25, 0]} material={materials.timberCCA} castShadow>
                        <boxGeometry args={[0.13, 0.5, 0.13]} />
                      </mesh>
                    </group>
                  );
                })
              )}
              {/* Vigas Maestras de Fundación en cada Eje X */}
              {Array.from({ length: numAxesX }).map((_, idx) => {
                const px = -widthM / 2 + (idx * widthM) / (numAxesX - 1);
                return (
                  <TimberPiece
                    key={`viga-m-${idx}`}
                    args={[0.1, 0.18, lengthM]}
                    position={[px, -0.09, 0]}
                    orientation="horizontal"
                    materials={materials}
                    isExploded={isExploded}
                    explodedProgress={explodedProgress}
                  />
                );
              })}
            </group>
          ) : foundationType === 'radier_sobrecimiento' ? (
            <group>
              {/* Cimiento Corrido Inferior */}
              <mesh position={[0, -0.45, 0]} material={materials.concreteG20} receiveShadow>
                <boxGeometry args={[widthM + 0.5, 0.4, lengthM + 0.5]} />
              </mesh>
              {/* Estructura Metálica del Cimiento Corrido (4 barras longitudinales + estribos) */}
              <group position={[0, -0.45, 0]}>
                {[-0.12, 0.12].map((ry, ryi) => (
                  <group key={`reb-cim-y-${ryi}`} position={[0, ry, 0]}>
                    <mesh position={[0, 0, (lengthM + 0.4) / 2]} material={materials.rebarSteel}>
                      <boxGeometry args={[widthM + 0.4, 0.008, 0.008]} />
                    </mesh>
                    <mesh position={[0, 0, -(lengthM + 0.4) / 2]} material={materials.rebarSteel}>
                      <boxGeometry args={[widthM + 0.4, 0.008, 0.008]} />
                    </mesh>
                    <mesh position={[(widthM + 0.4) / 2, 0, 0]} material={materials.rebarSteel}>
                      <boxGeometry args={[0.008, 0.008, lengthM + 0.4]} />
                    </mesh>
                    <mesh position={[-(widthM + 0.4) / 2, 0, 0]} material={materials.rebarSteel}>
                      <boxGeometry args={[0.008, 0.008, lengthM + 0.4]} />
                    </mesh>
                  </group>
                ))}
                {Array.from({ length: Math.ceil(lengthM / 0.4) + 1 }).map((_, zi) => {
                  const zPos = -lengthM / 2 + (zi * lengthM) / Math.ceil(lengthM / 0.4);
                  return (
                    <group key={`est-cim-z-${zi}`}>
                      {[-widthM / 2, widthM / 2].map((xPos, xi) => (
                        <group key={`est-cim-${xi}-${zi}`} position={[xPos, 0, zPos]}>
                          <mesh position={[0, 0.12, 0]} material={materials.rebarStirrup}>
                            <boxGeometry args={[0.26, 0.005, 0.005]} />
                          </mesh>
                          <mesh position={[0, -0.12, 0]} material={materials.rebarStirrup}>
                            <boxGeometry args={[0.26, 0.005, 0.005]} />
                          </mesh>
                          <mesh position={[0.13, 0, 0]} material={materials.rebarStirrup}>
                            <boxGeometry args={[0.005, 0.25, 0.005]} />
                          </mesh>
                          <mesh position={[-0.13, 0, 0]} material={materials.rebarStirrup}>
                            <boxGeometry args={[0.005, 0.25, 0.005]} />
                          </mesh>
                        </group>
                      ))}
                    </group>
                  );
                })}
              </group>

              {/* Cama de Estabilizado Compactado */}
              <mesh position={[0, -0.2, 0]} receiveShadow>
                <boxGeometry args={[widthM + 0.2, 0.15, lengthM + 0.2]} />
                <meshStandardMaterial color="#64748b" roughness={0.95} transparent={isTransparent} opacity={isTransparent ? 0.25 : 1.0} depthWrite={!isTransparent} />
              </mesh>

              {/* Sobrecimiento Continuo Elevado (20-40 cm) Perimetral */}
              <mesh position={[0, -0.08, lengthM / 2]} material={materials.concreteG20} castShadow receiveShadow>
                <boxGeometry args={[widthM + 0.3, 0.28, 0.2]} />
              </mesh>
              <mesh position={[0, -0.08, -lengthM / 2]} material={materials.concreteG20} castShadow receiveShadow>
                <boxGeometry args={[widthM + 0.3, 0.28, 0.2]} />
              </mesh>
              <mesh position={[-widthM / 2, -0.08, 0]} material={materials.concreteG20} castShadow receiveShadow>
                <boxGeometry args={[0.2, 0.28, lengthM - 0.2]} />
              </mesh>
              <mesh position={[widthM / 2, -0.08, 0]} material={materials.concreteG20} castShadow receiveShadow>
                <boxGeometry args={[0.2, 0.28, lengthM - 0.2]} />
              </mesh>

              {/* Estructura Metálica del Sobrecimiento Continuo (Canastillo 4 barras + estribos) */}
              <group position={[0, -0.08, 0]}>
                {[-0.08, 0.08].map((sy, syi) => (
                  <group key={`sc-reb-y-${syi}`} position={[0, sy, 0]}>
                    <mesh position={[0, 0, lengthM / 2]} material={materials.rebarSteel}>
                      <boxGeometry args={[widthM + 0.2, 0.007, 0.007]} />
                    </mesh>
                    <mesh position={[0, 0, -lengthM / 2]} material={materials.rebarSteel}>
                      <boxGeometry args={[widthM + 0.2, 0.007, 0.007]} />
                    </mesh>
                    <mesh position={[widthM / 2, 0, 0]} material={materials.rebarSteel}>
                      <boxGeometry args={[0.007, 0.007, lengthM - 0.1]} />
                    </mesh>
                    <mesh position={[-widthM / 2, 0, 0]} material={materials.rebarSteel}>
                      <boxGeometry args={[0.007, 0.007, lengthM - 0.1]} />
                    </mesh>
                  </group>
                ))}
                {Array.from({ length: Math.ceil(lengthM / 0.25) + 1 }).map((_, zi) => {
                  const zPos = -lengthM / 2 + (zi * lengthM) / Math.ceil(lengthM / 0.25);
                  return (
                    <group key={`sc-est-z-${zi}`}>
                      {[-widthM / 2, widthM / 2].map((xPos, xi) => (
                        <group key={`sc-est-${xi}-${zi}`} position={[xPos, 0, zPos]}>
                          <mesh position={[0, 0.08, 0]} material={materials.rebarStirrup}>
                            <boxGeometry args={[0.13, 0.004, 0.004]} />
                          </mesh>
                          <mesh position={[0, -0.08, 0]} material={materials.rebarStirrup}>
                            <boxGeometry args={[0.13, 0.004, 0.004]} />
                          </mesh>
                          <mesh position={[0.065, 0, 0]} material={materials.rebarStirrup}>
                            <boxGeometry args={[0.004, 0.16, 0.004]} />
                          </mesh>
                          <mesh position={[-0.065, 0, 0]} material={materials.rebarStirrup}>
                            <boxGeometry args={[0.004, 0.16, 0.004]} />
                          </mesh>
                        </group>
                      ))}
                    </group>
                  );
                })}
              </group>

              {/* Radier Interior Hormigón e >= 10 cm */}
              <mesh position={[0, -0.06, 0]} material={materials.concreteG20} receiveShadow>
                <boxGeometry args={[widthM - 0.2, 0.12, lengthM - 0.2]} />
              </mesh>

              {/* Malla Electrosoldada C-139 en Radier Interior (Armadura de Metal) */}
              <group position={[0, -0.05, 0]}>
                {Array.from({ length: Math.ceil((lengthM - 0.3) / 0.15) + 1 }).map((_, zi) => {
                  const zPos = -(lengthM - 0.3) / 2 + (zi * (lengthM - 0.3)) / Math.ceil((lengthM - 0.3) / 0.15);
                  return (
                    <mesh key={`mesh-x-${zi}`} position={[0, 0, zPos]} material={materials.wireMeshSteel}>
                      <boxGeometry args={[widthM - 0.26, 0.004, 0.004]} />
                    </mesh>
                  );
                })}
                {Array.from({ length: Math.ceil((widthM - 0.3) / 0.15) + 1 }).map((_, xi) => {
                  const xPos = -(widthM - 0.3) / 2 + (xi * (widthM - 0.3)) / Math.ceil((widthM - 0.3) / 0.15);
                  return (
                    <mesh key={`mesh-z-${xi}`} position={[xPos, 0.003, 0]} material={materials.wireMeshSteel}>
                      <boxGeometry args={[0.004, 0.004, lengthM - 0.26]} />
                    </mesh>
                  );
                })}
                {Array.from({ length: numAxesX }).map((_, cxi) =>
                  Array.from({ length: numPilesZ }).map((_, czi) => (
                    <mesh
                      key={`caluga-${cxi}-${czi}`}
                      position={[
                        -(widthM - 0.6) / 2 + (cxi * (widthM - 0.6)) / (numAxesX - 1 || 1),
                        -0.02,
                        -(lengthM - 0.6) / 2 + (czi * (lengthM - 0.6)) / (numPilesZ - 1 || 1),
                      ]}
                    >
                      <boxGeometry args={[0.03, 0.03, 0.03]} />
                      <meshStandardMaterial color="#0284c7" roughness={0.5} />
                    </mesh>
                  ))
                )}
              </group>

              {/* Anclajes de Solera Basal (Pernos 1/2" con golillas cuadradas 50x50mm) */}
              {[-widthM / 2, widthM / 2].map((xPos, xi) =>
                Array.from({ length: Math.ceil(lengthM / 0.6) + 1 }).map((_, zi) => {
                  const zPos = -lengthM / 2 + (zi * lengthM) / Math.ceil(lengthM / 0.6);
                  return (
                    <group key={`anc-rad-${xi}-${zi}`} position={[xPos, 0.05, zPos]}>
                      <mesh material={materials.doorHardware}>
                        <cylinderGeometry args={[0.007, 0.007, 0.14, 8]} />
                      </mesh>
                      <mesh position={[0, 0.02, 0]} material={materials.doorHardware}>
                        <boxGeometry args={[0.05, 0.004, 0.05]} />
                      </mesh>
                    </group>
                  );
                })
              )}
            </group>
          ) : (
            /* Platea de Cimentación / Losa Flotante Armada */
            <group>
              {/* Cama de Estabilizado Compactado (0 a 1 1/2") */}
              <mesh position={[0, -0.32, 0]} receiveShadow>
                <boxGeometry args={[widthM + 0.6, 0.15, lengthM + 0.6]} />
                <meshStandardMaterial color="#64748b" roughness={0.95} transparent={isTransparent} opacity={isTransparent ? 0.25 : 1.0} depthWrite={!isTransparent} />
              </mesh>
              {/* Vigas Perimetrales Peraltadas Invertidas (Borde Reforzado) */}
              <mesh position={[0, -0.2, 0]} material={materials.concreteG20} receiveShadow castShadow>
                <boxGeometry args={[widthM + 0.4, 0.35, lengthM + 0.4]} />
              </mesh>
              {/* Losa Maciza Continua Superior e=18cm */}
              <mesh position={[0, -0.06, 0]} material={materials.concreteG20} receiveShadow castShadow>
                <boxGeometry args={[widthM + 0.25, 0.18, lengthM + 0.25]} />
              </mesh>

              {/* Estructura Metálica Platea Armada: Refuerzo Viga Perimetral Peraltada */}
              <group position={[0, -0.2, 0]}>
                {[-0.12, 0.12].map((vy, vyi) => (
                  <group key={`pl-viga-y-${vyi}`} position={[0, vy, 0]}>
                    <mesh position={[0, 0, (lengthM + 0.3) / 2]} material={materials.rebarSteel}>
                      <boxGeometry args={[widthM + 0.3, 0.009, 0.009]} />
                    </mesh>
                    <mesh position={[0, 0, -(lengthM + 0.3) / 2]} material={materials.rebarSteel}>
                      <boxGeometry args={[widthM + 0.3, 0.009, 0.009]} />
                    </mesh>
                    <mesh position={[(widthM + 0.3) / 2, 0, 0]} material={materials.rebarSteel}>
                      <boxGeometry args={[0.009, 0.009, lengthM + 0.3]} />
                    </mesh>
                    <mesh position={[-(widthM + 0.3) / 2, 0, 0]} material={materials.rebarSteel}>
                      <boxGeometry args={[0.009, 0.009, lengthM + 0.3]} />
                    </mesh>
                  </group>
                ))}
                {Array.from({ length: Math.ceil(lengthM / 0.3) + 1 }).map((_, zi) => {
                  const zPos = -lengthM / 2 + (zi * lengthM) / Math.ceil(lengthM / 0.3);
                  return (
                    <group key={`pl-est-z-${zi}`}>
                      {[-widthM / 2, widthM / 2].map((xPos, xi) => (
                        <group key={`pl-est-${xi}-${zi}`} position={[xPos, 0, zPos]}>
                          <mesh position={[0, 0.12, 0]} material={materials.rebarStirrup}>
                            <boxGeometry args={[0.24, 0.005, 0.005]} />
                          </mesh>
                          <mesh position={[0, -0.12, 0]} material={materials.rebarStirrup}>
                            <boxGeometry args={[0.24, 0.005, 0.005]} />
                          </mesh>
                          <mesh position={[0.12, 0, 0]} material={materials.rebarStirrup}>
                            <boxGeometry args={[0.005, 0.24, 0.005]} />
                          </mesh>
                          <mesh position={[-0.12, 0, 0]} material={materials.rebarStirrup}>
                            <boxGeometry args={[0.005, 0.24, 0.005]} />
                          </mesh>
                        </group>
                      ))}
                    </group>
                  );
                })}
              </group>

              {/* Estructura Metálica Platea Armada: Doble Parrilla Electrosoldada (Inferior y Superior) */}
              {[-0.12, -0.01].map((gridY, gi) => (
                <group key={`platea-grid-${gi}`} position={[0, gridY, 0]}>
                  {Array.from({ length: Math.ceil(lengthM / 0.18) + 1 }).map((_, zi) => {
                    const zPos = -lengthM / 2 + (zi * lengthM) / Math.ceil(lengthM / 0.18);
                    return (
                      <mesh key={`p-m-x-${gi}-${zi}`} position={[0, 0, zPos]} material={materials.wireMeshSteel}>
                        <boxGeometry args={[widthM + 0.18, 0.005, 0.005]} />
                      </mesh>
                    );
                  })}
                  {Array.from({ length: Math.ceil(widthM / 0.18) + 1 }).map((_, xi) => {
                    const xPos = -widthM / 2 + (xi * widthM) / Math.ceil(widthM / 0.18);
                    return (
                      <mesh key={`p-m-z-${gi}-${xi}`} position={[xPos, 0.004, 0]} material={materials.wireMeshSteel}>
                        <boxGeometry args={[0.005, 0.005, lengthM + 0.18]} />
                      </mesh>
                    );
                  })}
                </group>
              ))}

              {/* Anclajes Roscados Perimetrales 1/2" cada 50cm */}
              {[-widthM / 2, widthM / 2].map((xPos, xi) =>
                Array.from({ length: Math.ceil(lengthM / 0.5) + 1 }).map((_, zi) => {
                  const zPos = -lengthM / 2 + (zi * lengthM) / Math.ceil(lengthM / 0.5);
                  return (
                    <group key={`anc-pla-${xi}-${zi}`} position={[xPos, 0.04, zPos]}>
                      <mesh material={materials.doorHardware}>
                        <cylinderGeometry args={[0.007, 0.007, 0.14, 8]} />
                      </mesh>
                      <mesh position={[0, 0.02, 0]} material={materials.doorHardware}>
                        <boxGeometry args={[0.05, 0.004, 0.05]} />
                      </mesh>
                    </group>
                  );
                })
              )}
            </group>
          )}
        </group>
      )}

      {/* 2. LOSA DE PISO SIP 162 mm MODULADA EN PANELES ESTÁNDAR 1.22x2.44m CON MADERAS DE BORDE Y SPLINES */}
      {layerFloorSip && (
        <group position={[0, floorThickM / 2 - (isExploded ? explodedProgress * 0.15 : 0), 0]}>
          {floorPanels2D.map((fp, fIdx) => {
            const spreadZ = (fp.zi - (fp.countZ - 1) / 2) * (explodedProgress * 0.35);
            const spreadX = (fp.xi - (fp.countX - 1) / 2) * (explodedProgress * 0.35);
            const staggerY = (fIdx % 2 === 0 ? 0.04 : -0.04) * explodedProgress;

            return (
              <group
                key={`floor-sip-p-${fp.xi}-${fp.zi}`}
                position={[fp.cx + spreadX, staggerY, fp.cz + spreadZ]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <SipIndividualPanel
                  width={fp.w}
                  height={fp.l}
                  totalThickness={floorThickM}
                  recess={0.035}
                  osbMaterial={materials.osbSip}
                  epsMaterial={materials.epsCore}
                  osbEdgeMaterial={materials.osbEdge}
                  tag={`Losa-SIP-${fIdx + 1}`}
                  isExploded={isExploded}
                />
              </group>
            );
          })}

          {/* Vigas de Remate Perimetral de Losa (Rim Joists en madera estructural <= 3.20m) */}
          {(layerTimberStructure || isExploded) && (
            <group>
              <TimberPiece
                args={[widthM, floorThickM - 0.022, timberThickM]}
                position={[0, 0, lengthM / 2 - timberThickM / 2]}
                orientation="horizontal"
                materials={materials}
                isExploded={isExploded}
                explodedProgress={explodedProgress}
              />
              <TimberPiece
                args={[widthM, floorThickM - 0.022, timberThickM]}
                position={[0, 0, -lengthM / 2 + timberThickM / 2]}
                orientation="horizontal"
                materials={materials}
                isExploded={isExploded}
                explodedProgress={explodedProgress}
              />
              <TimberPiece
                args={[timberThickM, floorThickM - 0.022, lengthM - 2 * timberThickM]}
                position={[-widthM / 2 + timberThickM / 2, 0, 0]}
                orientation="horizontal"
                materials={materials}
                isExploded={isExploded}
                explodedProgress={explodedProgress}
              />
              <TimberPiece
                args={[timberThickM, floorThickM - 0.022, lengthM - 2 * timberThickM]}
                position={[widthM / 2 - timberThickM / 2, 0, 0]}
                orientation="horizontal"
                materials={materials}
                isExploded={isExploded}
                explodedProgress={explodedProgress}
              />
            </group>
          )}

          {/* Pavimento Interior (si la capa de revestimiento está activa) */}
          {layerCladding && (
            <mesh position={[0, floorThickM / 2 + 0.005, 0]} material={materials.floorInterior} receiveShadow>
              <boxGeometry args={[widthM - 2 * wallThickM, 0.008, lengthM - 2 * wallThickM]} />
            </mesh>
          )}
        </group>
      )}

      {/* 3. MUROS PERIMETRALES INTEGRALES CON VANO RECORTADO Y ESTRUCTURA DE MADERA */}
      {(layerWallsSip || layerTimberStructure || layerWindowsDoors) && (
        <group position={[0, floorThickM, 0]}>
          {/* 3.1 Muro Frontal (+Z) */}
          <group
            position={[0, 0, lengthM / 2 - wallThickM / 2 + expOutZ]}
            rotation={[0, 0, 0]}
          >
            <SipWallAssembly
              wallId="front"
              wallLength={widthM}
              wallHeight={eaveHM}
              wallThickness={wallThickM}
              openings={openings}
              layerWallsSip={layerWallsSip}
              layerTimberStructure={layerTimberStructure}
              layerCladding={layerCladding}
              layerWindowsDoors={layerWindowsDoors}
              isExploded={isExploded}
              explodedProgress={explodedProgress}
              materials={{
                ...materials,
                cladding: wallExteriorMat,
              }}
            />

            {/* Frontón Triangular Frontal a Dos Aguas SIP (Espesor idéntico a muro: OSB 11.1 + EPS 92 + OSB 11.1) */}
            {isGableRoof && (layerWallsSip || layerTimberStructure || isExploded) && (
              <group
                position={[0, eaveHM + (isExploded ? expY * 0.2 : 0), isExploded ? expOutZ * 0.15 : 0]}
              >
                <SipGableAssembly
                  width={widthM}
                  height={gableRoofHeightM}
                  totalThickness={wallThickM}
                  timberThick={timberThickM}
                  materials={materials}
                  useCladdingOnFront={layerCladding}
                  claddingMaterial={wallExteriorMat}
                  layerTimberStructure={layerTimberStructure}
                  isExploded={isExploded}
                  explodedProgress={explodedProgress}
                />
              </group>
            )}
          </group>

          {/* 3.2 Muro Trasero (-Z) */}
          <group
            position={[0, 0, -lengthM / 2 + wallThickM / 2 - expOutZ]}
            rotation={[0, Math.PI, 0]}
          >
            <SipWallAssembly
              wallId="back"
              wallLength={widthM}
              wallHeight={eaveHM}
              wallThickness={wallThickM}
              openings={openings}
              layerWallsSip={layerWallsSip}
              layerTimberStructure={layerTimberStructure}
              layerCladding={layerCladding}
              layerWindowsDoors={layerWindowsDoors}
              isExploded={isExploded}
              explodedProgress={explodedProgress}
              materials={{
                ...materials,
                cladding: wallExteriorMat,
              }}
            />

            {/* Frontón Triangular Trasero a Dos Aguas SIP (Espesor idéntico a muro: OSB 11.1 + EPS 92 + OSB 11.1) */}
            {isGableRoof && (layerWallsSip || layerTimberStructure || isExploded) && (
              <group
                position={[0, eaveHM + (isExploded ? expY * 0.2 : 0), isExploded ? expOutZ * 0.15 : 0]}
              >
                <SipGableAssembly
                  width={widthM}
                  height={gableRoofHeightM}
                  totalThickness={wallThickM}
                  timberThick={timberThickM}
                  materials={materials}
                  useCladdingOnFront={layerCladding}
                  claddingMaterial={wallExteriorMat}
                  layerTimberStructure={layerTimberStructure}
                  isExploded={isExploded}
                  explodedProgress={explodedProgress}
                />
              </group>
            )}
          </group>

          {/* 3.3 Muro Lateral Izquierdo (-X) */}
          <group
            position={[-widthM / 2 + wallThickM / 2 - expOutX, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <SipWallAssembly
              wallId="left"
              wallLength={wallSideLengthM}
              wallHeight={eaveHM}
              wallThickness={wallThickM}
              openings={openings}
              layerWallsSip={layerWallsSip}
              layerTimberStructure={layerTimberStructure}
              layerCladding={layerCladding}
              layerWindowsDoors={layerWindowsDoors}
              isExploded={isExploded}
              explodedProgress={explodedProgress}
              materials={{
                ...materials,
                cladding: wallExteriorMat,
              }}
            />
          </group>

          {/* 3.4 Muro Lateral Derecho (+X) */}
          <group
            position={[widthM / 2 - wallThickM / 2 + expOutX, 0, 0]}
            rotation={[0, -Math.PI / 2, 0]}
          >
            <SipWallAssembly
              wallId="right"
              wallLength={wallSideLengthM}
              wallHeight={eaveHM}
              wallThickness={wallThickM}
              openings={openings}
              layerWallsSip={layerWallsSip}
              layerTimberStructure={layerTimberStructure}
              layerCladding={layerCladding}
              layerWindowsDoors={layerWindowsDoors}
              isExploded={isExploded}
              explodedProgress={explodedProgress}
              materials={{
                ...materials,
                cladding: wallExteriorMat,
              }}
            />
          </group>

          {/* 3.5 Muros Interiores / Tabiquería SIP */}
          {layerInteriorWalls &&
            interiorWalls &&
            interiorWalls.map((iWall) => (
              <SipInteriorWallAssembly
                key={iWall.id}
                wall={iWall}
                defaultHeightM={eaveHM}
                layerWallsSip={layerWallsSip}
                layerTimberStructure={layerTimberStructure}
                layerWindowsDoors={layerWindowsDoors}
                layerCladding={layerCladding}
                isExploded={isExploded}
                explodedProgress={explodedProgress}
                materials={materials}
              />
            ))}
        </group>
      )}

      {/* 4. TECHUMBRE EN PANEL SIP Y ESTRUCTURA DE MADERA INTEGRAL */}
      <group position={[0, floorThickM + eaveHM + timberThickM + expY, 0]}>
        {/* 4.0 ESTRUCTURA DE MADERA DE TECHUMBRE (Viga Cumbrera y Puntales) */}
        {(layerTimberStructure || isExploded) && isGableRoof && (
          <group>
            {/* A. Viga Maestra de Cumbrera (Ridge Beam 2x8" = 41x185mm) */}
            <TimberPiece
              args={[timberThickM, 0.185, lengthM + 2 * overhangM]}
              position={[0, gableRoofHeightM - 0.0925 + (isExploded ? explodedProgress * 0.15 : 0), 0]}
              orientation="horizontal"
              materials={materials}
              isExploded={isExploded}
              explodedProgress={explodedProgress}
            />

            {/* B. Puntales de Apoyo Cumbrera en Frontones y Centro */}
            {[-lengthM / 2, 0, lengthM / 2].map((zPos, zIdx) => (
              <TimberPiece
                key={`ridge-post-${zIdx}`}
                args={[timberThickM, gableRoofHeightM, timberThickM]}
                position={[0, gableRoofHeightM / 2, zPos]}
                orientation="vertical"
                materials={materials}
                isExploded={isExploded}
                explodedProgress={explodedProgress}
              />
            ))}
          </group>
        )}

        {/* 4.1 PANELES SIP DE TECHUMBRE CON DESPIECE Y ESTRUCTURA DE FALDÓN */}
        <group>
          {isGableRoof ? (
            /* 4.1.1 Techo a Dos Aguas */
            <group>
              {/* Faldón Izquierdo (-X) */}
              <group
                position={[-roofMidX - (isExploded ? expOutX * 0.45 : 0), roofMidY, 0]}
                rotation={[0, 0, roofSlopeAngle]}
              >
                {/* Paneles SIP Faldón Izquierdo */}
                {layerRoofSip &&
                  roofPanels2D.map((rp, rIdx) => {
                    const panelOffsetZ = (rp.zi - (rp.countZ - 1) / 2) * (explodedProgress * 0.35);
                    const panelOffsetX = (rp.xi - (rp.countX - 1) / 2) * (explodedProgress * 0.25);
                    const staggerNorm = (rIdx % 2 === 0 ? 0.06 : -0.03) * explodedProgress;

                    return (
                      <group
                        key={`roof-l-p-${rp.xi}-${rp.zi}`}
                        position={[rp.cx + panelOffsetX, staggerNorm, rp.cz + panelOffsetZ]}
                        rotation={[-Math.PI / 2, 0, 0]}
                      >
                        <SipIndividualPanel
                          width={rp.w}
                          height={rp.l}
                          totalThickness={roofThickM}
                          recess={0.035}
                          osbMaterial={materials.osbRoofSip}
                          epsMaterial={materials.epsCore}
                          osbEdgeMaterial={materials.osbEdge}
                          claddingMaterial={roofExteriorMat}
                          useCladdingOnFront={layerCladding}
                          tag={`Techo-L-${rIdx + 1}`}
                          isExploded={isExploded}
                        />
                      </group>
                    );
                  })}

                {/* Estructura de Madera del Faldón Izquierdo (Pares / Splines bajo paneles y Tapacán) */}
                {(layerTimberStructure || isExploded) && (
                  <group>
                    {/* Pares / Splines de apoyo alineados con las uniones de panel */}
                    {Array.from({ length: roofPanelsCountZ + 1 }).map((_, zi) => {
                      const cz = -totalRoofLengthM / 2 + (zi * totalRoofLengthM) / roofPanelsCountZ;
                      return (
                        <TimberPiece
                          key={`roof-timber-l-${zi}`}
                          args={[roofRafterLength - 0.06, timberThickM, timberWidthM]}
                          position={[0, -roofThickM / 2 - timberThickM / 2, cz]}
                          orientation="horizontal"
                          materials={materials}
                          isExploded={isExploded}
                          explodedProgress={explodedProgress}
                        />
                      );
                    })}

                    {/* Viga / Solera intermedia de apoyo bajo el empalme de panel (si caída > 2.44m) */}
                    {roofRafterLength > 2.44 && (
                      <TimberPiece
                        args={[timberThickM, timberWidthM, lengthM + 2 * overhangM]}
                        position={[-roofRafterLength / 2 + 2.44, -roofThickM / 2 - timberThickM / 2, 0]}
                        orientation="horizontal"
                        materials={materials}
                        isExploded={isExploded}
                        explodedProgress={explodedProgress}
                      />
                    )}

                    {/* Tapacán de Alero (Fascia Board) en el remate del faldón */}
                    <TimberPiece
                      args={[timberThickM, roofThickM, lengthM + 2 * overhangM]}
                      position={[-roofRafterLength / 2 + timberThickM / 2, 0, 0]}
                      orientation="horizontal"
                      materials={materials}
                      isExploded={isExploded}
                      explodedProgress={explodedProgress}
                    />
                  </group>
                )}
              </group>

              {/* Faldón Derecho (+X) */}
              <group
                position={[roofMidX + (isExploded ? expOutX * 0.45 : 0), roofMidY, 0]}
                rotation={[0, 0, -roofSlopeAngle]}
              >
                {/* Paneles SIP Faldón Derecho */}
                {layerRoofSip &&
                  roofPanels2D.map((rp, rIdx) => {
                    const panelOffsetZ = (rp.zi - (rp.countZ - 1) / 2) * (explodedProgress * 0.35);
                    const panelOffsetX = (rp.xi - (rp.countX - 1) / 2) * (explodedProgress * 0.25);
                    const staggerNorm = (rIdx % 2 === 0 ? 0.06 : -0.03) * explodedProgress;

                    return (
                      <group
                        key={`roof-r-p-${rp.xi}-${rp.zi}`}
                        position={[rp.cx + panelOffsetX, staggerNorm, rp.cz + panelOffsetZ]}
                        rotation={[-Math.PI / 2, 0, 0]}
                      >
                        <SipIndividualPanel
                          width={rp.w}
                          height={rp.l}
                          totalThickness={roofThickM}
                          recess={0.035}
                          osbMaterial={materials.osbRoofSip}
                          epsMaterial={materials.epsCore}
                          osbEdgeMaterial={materials.osbEdge}
                          claddingMaterial={roofExteriorMat}
                          useCladdingOnFront={layerCladding}
                          tag={`Techo-R-${rIdx + 1}`}
                          isExploded={isExploded}
                        />
                      </group>
                    );
                  })}

                {/* Estructura de Madera del Faldón Derecho (Pares / Splines bajo paneles y Tapacán) */}
                {(layerTimberStructure || isExploded) && (
                  <group>
                    {/* Pares / Splines de apoyo alineados con las uniones de panel */}
                    {Array.from({ length: roofPanelsCountZ + 1 }).map((_, zi) => {
                      const cz = -totalRoofLengthM / 2 + (zi * totalRoofLengthM) / roofPanelsCountZ;
                      return (
                        <TimberPiece
                          key={`roof-timber-r-${zi}`}
                          args={[roofRafterLength - 0.06, timberThickM, timberWidthM]}
                          position={[0, -roofThickM / 2 - timberThickM / 2, cz]}
                          orientation="horizontal"
                          materials={materials}
                          isExploded={isExploded}
                          explodedProgress={explodedProgress}
                        />
                      );
                    })}

                    {/* Viga / Solera intermedia de apoyo bajo el empalme de panel (si caída > 2.44m) */}
                    {roofRafterLength > 2.44 && (
                      <TimberPiece
                        args={[timberThickM, timberWidthM, lengthM + 2 * overhangM]}
                        position={[roofRafterLength / 2 - 2.44, -roofThickM / 2 - timberThickM / 2, 0]}
                        orientation="horizontal"
                        materials={materials}
                        isExploded={isExploded}
                        explodedProgress={explodedProgress}
                      />
                    )}

                    {/* Tapacán de Alero (Fascia Board) en el remate del faldón */}
                    <TimberPiece
                      args={[timberThickM, roofThickM, lengthM + 2 * overhangM]}
                      position={[roofRafterLength / 2 - timberThickM / 2, 0, 0]}
                      orientation="horizontal"
                      materials={materials}
                      isExploded={isExploded}
                      explodedProgress={explodedProgress}
                    />
                  </group>
                )}
              </group>

              {/* Hojalatería de Cumbrera Zincalum */}
              {layerRoofSip && (
                <mesh
                  position={[0, gableRoofHeightM + roofThickM / Math.cos(roofSlopeAngle) + 0.02 + (isExploded ? expY * 0.25 : 0), 0]}
                  material={materials.zincalumBlack}
                  castShadow
                >
                  <boxGeometry args={[0.32, 0.04, lengthM + 2 * overhangM + 0.06]} />
                </mesh>
              )}
            </group>
          ) : (
              /* 4.1.2 Cubierta Plana / Techo Modular Horizontal */
              <group position={[0, roofThickM / 2, 0]}>
                {roofPanels2D.map((rp, rIdx) => {
                  const spreadZ = (rp.zi - (rp.countZ - 1) / 2) * (explodedProgress * 0.35);
                  const spreadX = (rp.xi - (rp.countX - 1) / 2) * (explodedProgress * 0.25);
                  const staggerY = (rIdx % 2 === 0 ? 0.06 : -0.03) * explodedProgress;

                  return (
                    <group
                      key={`roof-flat-p-${rp.xi}-${rp.zi}`}
                      position={[rp.cx + spreadX, staggerY, rp.cz + spreadZ]}
                      rotation={[Math.PI / 2, 0, 0]}
                    >
                      <SipIndividualPanel
                        width={rp.w}
                        height={rp.l}
                        totalThickness={roofThickM}
                        recess={0.035}
                        osbMaterial={materials.osbRoofSip}
                        epsMaterial={materials.epsCore}
                        osbEdgeMaterial={materials.osbEdge}
                        claddingMaterial={roofExteriorMat}
                        useCladdingOnFront={layerCladding}
                        tag={`Techo-Flat-${rIdx + 1}`}
                        isExploded={isExploded}
                      />
                    </group>
                  );
                })}

                {/* Vigas de Remate Perimetral de Techo (Rim Beams en madera tratada) */}
                {(layerTimberStructure || isExploded) && (
                  <group>
                    <TimberPiece
                      args={[widthM + 2 * overhangM, roofThickM - 0.022, timberThickM]}
                      position={[0, 0, (lengthM + 2 * overhangM) / 2 - timberThickM / 2]}
                      orientation="horizontal"
                      materials={materials}
                      isExploded={isExploded}
                      explodedProgress={explodedProgress}
                    />
                    <TimberPiece
                      args={[widthM + 2 * overhangM, roofThickM - 0.022, timberThickM]}
                      position={[0, 0, -(lengthM + 2 * overhangM) / 2 + timberThickM / 2]}
                      orientation="horizontal"
                      materials={materials}
                      isExploded={isExploded}
                      explodedProgress={explodedProgress}
                    />
                    <TimberPiece
                      args={[timberThickM, roofThickM - 0.022, lengthM + 2 * overhangM - 2 * timberThickM]}
                      position={[-(widthM + 2 * overhangM) / 2 + timberThickM / 2, 0, 0]}
                      orientation="horizontal"
                      materials={materials}
                      isExploded={isExploded}
                      explodedProgress={explodedProgress}
                    />
                    <TimberPiece
                      args={[timberThickM, roofThickM - 0.022, lengthM + 2 * overhangM - 2 * timberThickM]}
                      position={[(widthM + 2 * overhangM) / 2 - timberThickM / 2, 0, 0]}
                      orientation="horizontal"
                      materials={materials}
                      isExploded={isExploded}
                      explodedProgress={explodedProgress}
                    />
                  </group>
                )}
              </group>
            )}
          </group>
      </group>

      {/* 5. TRAZADOS MEP */}
      {/* 5.1 Electricidad */}
      {layerElectricalMep && (
        <group position={[0, floorThickM, 0]}>
          <mesh position={[widthM / 2 - 0.05, 1.4, -lengthM / 2 + 0.8]} material={materials.electricalConduit}>
            <boxGeometry args={[0.08, 0.35, 0.25]} />
          </mesh>
          <mesh position={[-widthM / 2 + 0.05, 0.4, 0]} material={materials.electricalConduit}>
            <boxGeometry args={[0.03, 0.03, lengthM - 0.4]} />
          </mesh>
          <mesh position={[widthM / 2 - 0.05, 0.4, 0]} material={materials.electricalConduit}>
            <boxGeometry args={[0.03, 0.03, lengthM - 0.4]} />
          </mesh>
        </group>
      )}

      {/* 5.2 Red Sanitaria */}
      {layerSanitaryMep && (
        <group position={[0, floorThickM, 0]}>
          <mesh position={[0, 0.2, -lengthM / 2 + 0.5]} material={materials.sanitaryPprWater}>
            <boxGeometry args={[widthM - 0.4, 0.03, 0.03]} />
          </mesh>
          <mesh position={[0, 0.26, -lengthM / 2 + 0.5]} material={materials.sanitaryPexHot}>
            <boxGeometry args={[widthM - 0.4, 0.025, 0.025]} />
          </mesh>
        </group>
      )}

      {/* 5.3 Gas */}
      {layerGasMep && (
        <group position={[0, floorThickM, 0]}>
          <mesh position={[-widthM / 2 + 0.1, 0.5, 0]} material={materials.gasCopperMat}>
            <boxGeometry args={[0.025, 0.025, lengthM - 1]} />
          </mesh>
        </group>
      )}

      {/* 6. COTAS PARAMÉTRICAS Y ANOTACIONES TÉCNICAS BIM */}
      <Suspense fallback={null}>
        <SipDimensionAnnotations3D />
      </Suspense>
    </group>
  );
}
