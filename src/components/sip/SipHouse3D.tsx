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
import { SipRoofCladdingAssembly } from './SipRoofCladdingAssembly';

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

  // Parámetros Tipología en L
  const isLShape = dim.shape === 'l_shape';
  const isWingExtended = isLShape;
  const wingLengthM = (dim.wingLength || 420) / 100; // L2
  const wingWidthM = (dim.wingWidth || 360) / 100;   // W2
  const roofStyle = dim.roofStyle || 'gable_valley';

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
        map: textures.zincCa8Texture,
        bumpMap: textures.zincCa8BumpMap,
        bumpScale: 0.015,
        color: '#1a202c',
        roughness: 0.32,
        metalness: 0.82,
        transparent: isTransparent,
        opacity: isTransparent ? 0.22 : 1.0,
        depthWrite: !isTransparent,
      }),
      arratiaCladding: new THREE.MeshStandardMaterial({
        map: textures.arratiaTexture,
        bumpMap: textures.arratiaBumpMap,
        bumpScale: 0.02,
        color: '#1a1f26',
        roughness: 0.35,
        metalness: 0.75,
        transparent: isTransparent,
        opacity: isTransparent ? 0.22 : 1.0,
        depthWrite: !isTransparent,
      }),
      zincCa8: new THREE.MeshStandardMaterial({
        map: textures.zincCa8Texture,
        bumpMap: textures.zincCa8BumpMap,
        bumpScale: 0.022,
        color: '#181e26',
        roughness: 0.35,
        metalness: 0.80,
        transparent: isTransparent,
        opacity: isTransparent ? 0.22 : 1.0,
        depthWrite: !isTransparent,
      }),
      asphaltShingle: new THREE.MeshStandardMaterial({
        map: textures.asphaltShingleTexture,
        bumpMap: textures.asphaltShingleBumpMap,
        bumpScale: 0.022,
        color: '#1e242d',
        roughness: 0.85,
        metalness: 0.08,
        transparent: isTransparent,
        opacity: isTransparent ? 0.25 : 1.0,
        depthWrite: !isTransparent,
      }),
      timberCladding: new THREE.MeshStandardMaterial({
        map: textures.timberCladdingTexture,
        bumpMap: textures.timberCladdingBumpMap,
        bumpScale: 0.018,
        color: '#9a6b43',
        roughness: 0.65,
        metalness: 0.05,
        transparent: isTransparent,
        opacity: isTransparent ? 0.25 : 1.0,
        depthWrite: !isTransparent,
      }),
      fiberCement: new THREE.MeshStandardMaterial({
        map: textures.fiberCementTexture,
        bumpMap: textures.fiberCementBumpMap,
        bumpScale: 0.014,
        color: '#64748b',
        roughness: 0.82,
        metalness: 0.1,
        transparent: isTransparent,
        opacity: isTransparent ? 0.25 : 1.0,
        depthWrite: !isTransparent,
      }),
      tyvekMembrane: new THREE.MeshStandardMaterial({
        map: textures.tyvekTexture,
        roughness: 0.92,
        metalness: 0.0,
        transparent: isTransparent,
        opacity: isTransparent ? 0.35 : 1.0,
        depthWrite: !isTransparent,
      }),
      flashingBlack: new THREE.MeshStandardMaterial({
        color: '#0f172a',
        roughness: 0.3,
        metalness: 0.85,
      }),
      glassWindow: new THREE.MeshStandardMaterial({
        color: '#bae6fd',
        transparent: true,
        opacity: 0.35,
        roughness: 0.05,
        metalness: 0.15,
        depthWrite: false,
        side: THREE.DoubleSide,
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
    exteriorCladding === 'arratia_microacanalado'
      ? materials.arratiaCladding
      : exteriorCladding === 'zincalum_negro'
      ? materials.zincalumBlack
      : exteriorCladding === 'madera_tinglada'
      ? materials.timberCladding
      : exteriorCladding === 'fibrocemento_gris'
      ? materials.fiberCement
      : materials.osbSip;

  const roofExteriorMat =
    roofCladding === 'arratia_microacanalado'
      ? materials.arratiaCladding
      : roofCladding === 'zinc_ca8_negro'
      ? materials.zincCa8
      : roofCladding === 'teja_asfaltica_negra'
      ? materials.asphaltShingle
      : materials.osbRoofSip;

  // Ángulo de inclinación y dimensiones del techo según estilo arquitectónico
  const isFlatRoof = roofStyle === 'flat' || ridgeHM <= eaveHM + 0.05;
  const isSingleShed = !isFlatRoof && roofStyle === 'single_shed';
  const isGableRoof = !isFlatRoof && !isSingleShed && ridgeHM > eaveHM + 0.15;
  const gableRoofHeightM = Math.max(0.05, ridgeHM - eaveHM);

  // 1. Techo a 2 Aguas
  const roofSlopeAngle = isGableRoof ? Math.atan2(gableRoofHeightM, widthM / 2) : 0;
  const halfSpanM = widthM / 2 + overhangM;
  const roofRafterLength = isGableRoof ? halfSpanM / Math.cos(roofSlopeAngle) : halfSpanM;

  // 2. Techo a 1 Agua (Mono-pitch continuo paramétrico)
  const singleTotalSpanX = isWingExtended ? widthM + wingWidthM : widthM;
  const singleSlopeAngle = isSingleShed ? Math.atan2(gableRoofHeightM, singleTotalSpanX) : 0;
  
  // Rafters para techo a 1 agua
  const singleMainSpanX = isWingExtended ? widthM + overhangM : widthM + 2 * overhangM;
  const singleRafterLength = isSingleShed ? singleMainSpanX / Math.cos(singleSlopeAngle) : singleMainSpanX;
  const singleRoofMidX = isWingExtended ? -overhangM / 2 : 0;
  const hTransitionSingle = isWingExtended ? (gableRoofHeightM * widthM) / singleTotalSpanX : gableRoofHeightM;
  const singleRoofMidY = isSingleShed
    ? (isWingExtended
        ? (hTransitionSingle - overhangM * Math.tan(singleSlopeAngle)) / 2
        : gableRoofHeightM / 2) + (roofThickM / 2) / Math.cos(singleSlopeAngle)
    : roofThickM / 2;

  // Ala a 1 agua
  const wingSingleSpanX = wingWidthM + overhangM;
  const wingSingleRafterLength = isSingleShed ? wingSingleSpanX / Math.cos(singleSlopeAngle) : wingSingleSpanX;
  const wingSingleRoofMidX = widthM / 2 + wingSingleSpanX / 2;
  const wingSingleRoofMidY = isSingleShed
    ? (hTransitionSingle + gableRoofHeightM + overhangM * Math.tan(singleSlopeAngle)) / 2 + (roofThickM / 2) / Math.cos(singleSlopeAngle)
    : roofThickM / 2;

  // Posición del centro de los faldones a 2 aguas
  const roofMidX = halfSpanM / 2 + (roofThickM / 2) * Math.sin(roofSlopeAngle);
  const roofMidY = isGableRoof
    ? (gableRoofHeightM - overhangM * Math.tan(roofSlopeAngle)) / 2 + (roofThickM / 2) * Math.cos(roofSlopeAngle)
    : roofThickM / 2;

  // Modulaciones estándar de paneles SIP para losas y cubiertas (estándar LP / PROSIP: 1.22m x 2.44m)
  const wallSideLengthM = Math.max(0.6, lengthM - 2 * wallThickM);
  const totalRoofLengthM = lengthM + 2 * overhangM;
  const floorPanels2D = useMemo(() => getModular2DPanels(widthM, lengthM, 2.44, 1.22), [widthM, lengthM]);
  const wingFloorPanels2D = useMemo(
    () => (isWingExtended ? getModular2DPanels(wingWidthM, wingLengthM, 2.44, 1.22) : []),
    [isWingExtended, wingWidthM, wingLengthM]
  );
  const flatRoofPanels2D = useMemo(
    () => getModular2DPanels(widthM + 2 * overhangM, totalRoofLengthM, 2.44, 1.22),
    [widthM, overhangM, totalRoofLengthM]
  );
  const wingFlatRoofPanels2D = useMemo(
    () => (isWingExtended ? getModular2DPanels(wingWidthM + overhangM, wingLengthM + 2 * overhangM, 2.44, 1.22) : []),
    [isWingExtended, wingWidthM, overhangM, wingLengthM]
  );
  const singleRoofPanels2D = useMemo(
    () => (isSingleShed ? getRoofModularPanels(singleRafterLength, totalRoofLengthM) : []),
    [isSingleShed, singleRafterLength, totalRoofLengthM]
  );
  const roofPanels2D = useMemo(
    () => getRoofModularPanels(roofRafterLength, totalRoofLengthM),
    [roofRafterLength, totalRoofLengthM]
  );
  const wingHalfSpanM = wingLengthM / 2 + overhangM;
  const wingSlopeAngle = isGableRoof ? Math.atan2(gableRoofHeightM, wingLengthM / 2) : 0;
  const wingRafterLength = isGableRoof ? wingHalfSpanM / Math.cos(wingSlopeAngle) : wingHalfSpanM;
  // Techumbre de ala adosada a 2 aguas: desde la fachada de unión (X = widthM/2) hasta el alero exterior
  const totalWingRoofLengthM = wingWidthM + overhangM;
  const wingRoofCenterX = widthM / 2 + totalWingRoofLengthM / 2;
  const wingRoofPanels2D = useMemo(
    () => (isWingExtended ? getRoofModularPanels(wingRafterLength, totalWingRoofLengthM) : []),
    [isWingExtended, wingRafterLength, totalWingRoofLengthM]
  );
  const wingSingleRoofPanels2D = useMemo(
    () => (isWingExtended && isSingleShed ? getRoofModularPanels(wingSingleRafterLength, wingLengthM + 2 * overhangM) : []),
    [isWingExtended, isSingleShed, wingSingleRafterLength, wingLengthM, overhangM]
  );
  const wingRoofMidY = isGableRoof
    ? (gableRoofHeightM - overhangM * Math.tan(wingSlopeAngle)) / 2 + (roofThickM / 2) * Math.cos(wingSlopeAngle)
    : roofThickM / 2;
  const wingRoofMidZ = wingHalfSpanM / 2 + (roofThickM / 2) * Math.sin(wingSlopeAngle);
  const wingPanelsCountX = Math.max(1, Math.ceil(totalWingRoofLengthM / 1.22));
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

              {/* Fundaciones en Pilotes para Ala en L o Multivolumen */}
              {isWingExtended && (
                <group>
                  {Array.from({ length: Math.max(1, Math.ceil(wingWidthM / 1.5)) }).map((_, xi) => {
                    const px = widthM / 2 + ((xi + 1) * wingWidthM) / (Math.max(1, Math.ceil(wingWidthM / 1.5)) + 0.001);
                    const numPilesWing = Math.max(2, Math.ceil(wingLengthM / 1.5) + 1);
                    return Array.from({ length: numPilesWing }).map((_, zi) => {
                      const pz = (lengthM / 2 - wingLengthM) + (zi * wingLengthM) / (numPilesWing - 1);
                      return (
                        <group key={`wing-pil-${xi}-${zi}`} position={[px, -0.45, pz]}>
                          <mesh position={[0, -0.25, 0]} material={materials.concreteG20} castShadow>
                            <boxGeometry args={[0.45, 0.5, 0.45]} />
                          </mesh>
                          <mesh position={[0, 0.25, 0]} material={materials.timberCCA} castShadow>
                            <boxGeometry args={[0.13, 0.5, 0.13]} />
                          </mesh>
                        </group>
                      );
                    });
                  })}
                  {Array.from({ length: Math.max(1, Math.ceil(wingWidthM / 1.5)) }).map((_, idx) => {
                    const px = widthM / 2 + ((idx + 1) * wingWidthM) / (Math.max(1, Math.ceil(wingWidthM / 1.5)) + 0.001);
                    return (
                      <TimberPiece
                        key={`wing-viga-m-${idx}`}
                        args={[0.1, 0.18, wingLengthM]}
                        position={[px, -0.09, lengthM / 2 - wingLengthM / 2]}
                        orientation="horizontal"
                        materials={materials}
                        isExploded={isExploded}
                        explodedProgress={explodedProgress}
                      />
                    );
                  })}
                </group>
              )}
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
              <mesh position={[widthM / 2, -0.08, isWingExtended ? -wingLengthM / 2 : 0]} material={materials.concreteG20} castShadow receiveShadow>
                <boxGeometry args={[0.2, 0.28, isWingExtended ? Math.max(0.4, lengthM - wingLengthM - 0.2) : lengthM - 0.2]} />
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

              {/* Fundaciones de Radier y Sobrecimiento para Ala en L o Multivolumen */}
              {isWingExtended && (
                <group position={[widthM / 2 + wingWidthM / 2, 0, lengthM / 2 - wingLengthM / 2]}>
                  {/* Cimiento Corrido Ala */}
                  <mesh position={[0, -0.45, 0]} material={materials.concreteG20} receiveShadow>
                    <boxGeometry args={[wingWidthM + 0.3, 0.4, wingLengthM + 0.4]} />
                  </mesh>
                  {/* Cama de Estabilizado Ala */}
                  <mesh position={[0, -0.2, 0]} receiveShadow>
                    <boxGeometry args={[wingWidthM + 0.1, 0.15, wingLengthM + 0.2]} />
                    <meshStandardMaterial color="#64748b" roughness={0.95} transparent={isTransparent} opacity={isTransparent ? 0.25 : 1.0} depthWrite={!isTransparent} />
                  </mesh>
                  {/* Sobrecimientos Ala */}
                  <mesh position={[0, -0.08, wingLengthM / 2]} material={materials.concreteG20} castShadow receiveShadow>
                    <boxGeometry args={[wingWidthM + 0.2, 0.28, 0.2]} />
                  </mesh>
                  <mesh position={[wingWidthM / 2, -0.08, 0]} material={materials.concreteG20} castShadow receiveShadow>
                    <boxGeometry args={[0.2, 0.28, wingLengthM - 0.2]} />
                  </mesh>
                  <mesh position={[0, -0.08, -wingLengthM / 2]} material={materials.concreteG20} castShadow receiveShadow>
                    <boxGeometry args={[wingWidthM + 0.2, 0.28, 0.2]} />
                  </mesh>
                  {/* Radier Interior Hormigón Ala */}
                  <mesh position={[0, -0.06, 0]} material={materials.concreteG20} receiveShadow>
                    <boxGeometry args={[wingWidthM - 0.1, 0.12, wingLengthM - 0.2]} />
                  </mesh>
                </group>
              )}

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

              {/* Fundaciones Platea Armada para Ala en L o Multivolumen */}
              {isWingExtended && (
                <group position={[widthM / 2 + wingWidthM / 2, 0, lengthM / 2 - wingLengthM / 2]}>
                  {/* Cama de Estabilizado Ala */}
                  <mesh position={[0, -0.32, 0]} receiveShadow>
                    <boxGeometry args={[wingWidthM + 0.4, 0.15, wingLengthM + 0.4]} />
                    <meshStandardMaterial color="#64748b" roughness={0.95} transparent={isTransparent} opacity={isTransparent ? 0.25 : 1.0} depthWrite={!isTransparent} />
                  </mesh>
                  {/* Vigas Perimetrales Peraltadas Ala */}
                  <mesh position={[0, -0.2, 0]} material={materials.concreteG20} receiveShadow castShadow>
                    <boxGeometry args={[wingWidthM + 0.2, 0.35, wingLengthM + 0.3]} />
                  </mesh>
                  {/* Losa Maciza Continua Superior Ala */}
                  <mesh position={[0, -0.06, 0]} material={materials.concreteG20} receiveShadow castShadow>
                    <boxGeometry args={[wingWidthM + 0.15, 0.18, wingLengthM + 0.2]} />
                  </mesh>
                </group>
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

          {/* Losa de Piso de Ala Lateral en L o Multivolumen */}
          {isWingExtended && (
            <group
              position={[
                widthM / 2 + wingWidthM / 2,
                0,
                lengthM / 2 - wingLengthM / 2,
              ]}
            >
              {wingFloorPanels2D.map((fp, fIdx) => {
                const spreadZ = (fp.zi - (fp.countZ - 1) / 2) * (explodedProgress * 0.35);
                const spreadX = (fp.xi - (fp.countX - 1) / 2) * (explodedProgress * 0.35);
                const staggerY = (fIdx % 2 === 0 ? 0.04 : -0.04) * explodedProgress;

                return (
                  <group
                    key={`wing-floor-sip-${fp.xi}-${fp.zi}`}
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
                      tag={`Losa-Ala-${fIdx + 1}`}
                      isExploded={isExploded}
                    />
                  </group>
                );
              })}

              {/* Vigas de Remate Perimetral de Ala */}
              {(layerTimberStructure || isExploded) && (
                <group>
                  <TimberPiece
                    args={[wingWidthM, floorThickM - 0.022, timberThickM]}
                    position={[0, 0, wingLengthM / 2 - timberThickM / 2]}
                    orientation="horizontal"
                    materials={materials}
                    isExploded={isExploded}
                    explodedProgress={explodedProgress}
                  />
                  <TimberPiece
                    args={[wingWidthM, floorThickM - 0.022, timberThickM]}
                    position={[0, 0, -wingLengthM / 2 + timberThickM / 2]}
                    orientation="horizontal"
                    materials={materials}
                    isExploded={isExploded}
                    explodedProgress={explodedProgress}
                  />
                  <TimberPiece
                    args={[timberThickM, floorThickM - 0.022, wingLengthM - 2 * timberThickM]}
                    position={[wingWidthM / 2 - timberThickM / 2, 0, 0]}
                    orientation="horizontal"
                    materials={materials}
                    isExploded={isExploded}
                    explodedProgress={explodedProgress}
                  />
                </group>
              )}

              {/* Pavimento Interior Ala */}
              {layerCladding && (
                <mesh position={[0, floorThickM / 2 + 0.005, 0]} material={materials.floorInterior} receiveShadow>
                  <boxGeometry args={[wingWidthM - wallThickM, 0.008, wingLengthM - 2 * wallThickM]} />
                </mesh>
              )}
            </group>
          )}
        </group>
      )}

      {/* 3. MUROS PERIMETRALES INTEGRALES CON VANO RECORTADO Y ESTRUCTURA DE MADERA */}
      {(layerWallsSip || layerTimberStructure || layerWindowsDoors) && (
        <group position={[0, floorThickM, 0]}>
          {/* 3.1 Muro Frontal Principal (+Z) */}
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
              claddingType={exteriorCladding}
              layerWindowsDoors={layerWindowsDoors}
              isExploded={isExploded}
              explodedProgress={explodedProgress}
              materials={{
                ...materials,
                cladding: wallExteriorMat,
              }}
            />

            {/* Frontón Frontal (2 Aguas o 1 Agua) SIP */}
            {(isGableRoof || isSingleShed) && (layerWallsSip || layerTimberStructure || isExploded) && (
              <group
                position={[0, eaveHM + (isExploded ? expY * 0.2 : 0), isExploded ? expOutZ * 0.15 : 0]}
              >
                <SipGableAssembly
                  width={widthM}
                  height={isSingleShed && isLShape ? hTransitionSingle : gableRoofHeightM}
                  startHeight={isSingleShed ? 0 : undefined}
                  endHeight={isSingleShed ? (isLShape ? hTransitionSingle : gableRoofHeightM) : undefined}
                  roofStyle={isSingleShed ? 'single_shed' : 'gable_valley'}
                  slopeDirection="left_to_right"
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
              claddingType={exteriorCladding}
              layerWindowsDoors={layerWindowsDoors}
              isExploded={isExploded}
              explodedProgress={explodedProgress}
              materials={{
                ...materials,
                cladding: wallExteriorMat,
              }}
            />

            {/* Frontón Trasero (2 Aguas o 1 Agua) SIP */}
            {(isGableRoof || isSingleShed) && (layerWallsSip || layerTimberStructure || isExploded) && (
              <group
                position={[0, eaveHM + (isExploded ? expY * 0.2 : 0), isExploded ? expOutZ * 0.15 : 0]}
              >
                <SipGableAssembly
                  width={widthM}
                  height={isSingleShed && isLShape ? hTransitionSingle : gableRoofHeightM}
                  startHeight={isSingleShed ? (isLShape ? hTransitionSingle : gableRoofHeightM) : undefined}
                  endHeight={isSingleShed ? 0 : undefined}
                  roofStyle={isSingleShed ? 'single_shed' : 'gable_valley'}
                  slopeDirection="right_to_left"
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
            rotation={[0, -Math.PI / 2, 0]}
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
              claddingType={exteriorCladding}
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
            position={[
              widthM / 2 - wallThickM / 2 + expOutX,
              0,
              isWingExtended ? -wingLengthM / 2 : 0,
            ]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <SipWallAssembly
              wallId="right"
              wallLength={isWingExtended ? Math.max(0.6, lengthM - wingLengthM - wallThickM) : wallSideLengthM}
              wallHeight={!isWingExtended && isSingleShed ? eaveHM + gableRoofHeightM : (isWingExtended && isSingleShed ? eaveHM + hTransitionSingle : eaveHM)}
              wallThickness={wallThickM}
              openings={openings}
              layerWallsSip={layerWallsSip}
              layerTimberStructure={layerTimberStructure}
              layerCladding={layerCladding}
              claddingType={exteriorCladding}
              layerWindowsDoors={layerWindowsDoors}
              isExploded={isExploded}
              explodedProgress={explodedProgress}
              materials={{
                ...materials,
                cladding: wallExteriorMat,
              }}
            />
          </group>

          {/* MUROS ADICIONALES DE LA TIPOLOGÍA EN L O MULTIVOLUMEN */}
          {isWingExtended && (
            <group>
              {/* 3.5 Muro Frontal de Ala (+Z) */}
              <group
                position={[
                  widthM / 2 + wingWidthM / 2,
                  0,
                  lengthM / 2 - wallThickM / 2 + expOutZ,
                ]}
                rotation={[0, 0, 0]}
              >
                <SipWallAssembly
                  wallId="wing_front"
                  wallLength={wingWidthM}
                  wallHeight={eaveHM}
                  wallThickness={wallThickM}
                  openings={openings}
                  layerWallsSip={layerWallsSip}
                  layerTimberStructure={layerTimberStructure}
                  layerCladding={layerCladding}
                  claddingType={exteriorCladding}
                  layerWindowsDoors={layerWindowsDoors}
                  isExploded={isExploded}
                  explodedProgress={explodedProgress}
                  materials={{
                    ...materials,
                    cladding: wallExteriorMat,
                  }}
                />
              </group>

              {/* 3.6 Muro Lateral Exterior de Ala (+X) */}
              <group
                position={[
                  widthM / 2 + wingWidthM - wallThickM / 2 + expOutX,
                  0,
                  lengthM / 2 - wingLengthM / 2,
                ]}
                rotation={[0, Math.PI / 2, 0]}
              >
                <SipWallAssembly
                  wallId="wing_side"
                  wallLength={Math.max(0.6, wingLengthM - wallThickM)}
                  wallHeight={isSingleShed ? eaveHM + gableRoofHeightM : eaveHM}
                  wallThickness={wallThickM}
                  openings={openings}
                  layerWallsSip={layerWallsSip}
                  layerTimberStructure={layerTimberStructure}
                  layerCladding={layerCladding}
                  claddingType={exteriorCladding}
                  layerWindowsDoors={layerWindowsDoors}
                  isExploded={isExploded}
                  explodedProgress={explodedProgress}
                  materials={{
                    ...materials,
                    cladding: wallExteriorMat,
                  }}
                />

                {/* Frontón Exterior de Ala a 2 Aguas (+X) */}
                {isGableRoof && (layerWallsSip || layerTimberStructure || isExploded) && (
                  <group
                    position={[0, eaveHM + (isExploded ? expY * 0.2 : 0), 0]}
                  >
                    <SipGableAssembly
                      width={wingLengthM}
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

              {/* 3.7 Muro Interior Patio de Ala (-Z de ala) */}
              <group
                position={[
                  widthM / 2 + wingWidthM / 2,
                  0,
                  lengthM / 2 - wingLengthM + wallThickM / 2 - expOutZ,
                ]}
                rotation={[0, Math.PI, 0]}
              >
                <SipWallAssembly
                  wallId="wing_inner"
                  wallLength={wingWidthM}
                  wallHeight={eaveHM}
                  wallThickness={wallThickM}
                  openings={openings}
                  layerWallsSip={layerWallsSip}
                  layerTimberStructure={layerTimberStructure}
                  layerCladding={layerCladding}
                  claddingType={exteriorCladding}
                  layerWindowsDoors={layerWindowsDoors}
                  isExploded={isExploded}
                  explodedProgress={explodedProgress}
                  materials={{
                    ...materials,
                    cladding: wallExteriorMat,
                  }}
                />

                {/* Frontón Patio de Ala a 1 Agua */}
                {isSingleShed && (layerWallsSip || layerTimberStructure || isExploded) && (
                  <group
                    position={[0, eaveHM + (isExploded ? expY * 0.2 : 0), isExploded ? expOutZ * 0.15 : 0]}
                  >
                    <SipGableAssembly
                      width={wingWidthM}
                      height={gableRoofHeightM}
                      startHeight={gableRoofHeightM}
                      endHeight={hTransitionSingle}
                      roofStyle="single_shed"
                      slopeDirection="right_to_left"
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

              {/* 3.8 Viga Dintel Estructural de Encuentro y Pilares (en X = widthM / 2) */}
              <group
                position={[
                  widthM / 2 - timberThickM / 2,
                  0,
                  lengthM / 2 - wingLengthM / 2,
                ]}
                rotation={[0, Math.PI / 2, 0]}
              >
                {(layerTimberStructure || isExploded) && (
                  <>
                    {/* Viga Dintel / Header Beam 2x8" sobre el vano de encuentro */}
                    <TimberPiece
                      args={[wingLengthM, 0.185, timberThickM]}
                      position={[0, eaveHM - 0.0925, 0]}
                      orientation="horizontal"
                      materials={materials}
                      isExploded={isExploded}
                      explodedProgress={explodedProgress}
                    />
                    {/* Pilares en los extremos del vano de unión */}
                    <TimberPiece
                      args={[timberThickM, eaveHM - 0.185, timberThickM]}
                      position={[-wingLengthM / 2 + timberThickM / 2, (eaveHM - 0.185) / 2, 0]}
                      orientation="vertical"
                      materials={materials}
                      isExploded={isExploded}
                      explodedProgress={explodedProgress}
                    />
                    <TimberPiece
                      args={[timberThickM, eaveHM - 0.185, timberThickM]}
                      position={[wingLengthM / 2 - timberThickM / 2, (eaveHM - 0.185) / 2, 0]}
                      orientation="vertical"
                      materials={materials}
                      isExploded={isExploded}
                      explodedProgress={explodedProgress}
                    />
                  </>
                )}

                {/* Frontón Triangular de Cierre SIP sobre Viga de Encuentro de Ala */}
                {isGableRoof && (layerWallsSip || layerTimberStructure || isExploded) && (
                  <group
                    position={[0, eaveHM + (isExploded ? expY * 0.2 : 0), 0]}
                  >
                    <SipGableAssembly
                      width={wingLengthM}
                      height={gableRoofHeightM}
                      totalThickness={wallThickM}
                      timberThick={timberThickM}
                      materials={materials}
                      useCladdingOnFront={false}
                      claddingMaterial={wallExteriorMat}
                      layerTimberStructure={layerTimberStructure}
                      isExploded={isExploded}
                      explodedProgress={explodedProgress}
                    />
                  </group>
                )}
              </group>
            </group>
          )}

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

                {/* Revestimiento y Terminación Modular de Cubierta Exterior Faldón Izquierdo */}
                {layerCladding && (
                  <SipRoofCladdingAssembly
                    rafterLength={roofRafterLength}
                    roofLength={totalRoofLengthM}
                    roofThickness={roofThickM}
                    claddingType={roofCladding}
                    materials={materials}
                    axisAlongSlope="x"
                    eaveSide="min"
                    isExploded={isExploded}
                    explodedProgress={explodedProgress}
                  />
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
                        args={[timberThickM, timberWidthM, totalRoofLengthM]}
                        position={[roofRafterLength / 2 - 2.44, -roofThickM / 2 - timberThickM / 2, 0]}
                        orientation="horizontal"
                        materials={materials}
                        isExploded={isExploded}
                        explodedProgress={explodedProgress}
                      />
                    )}

                    {/* Tapacán de Alero (Fascia Board) en el remate del faldón */}
                    <TimberPiece
                      args={[timberThickM, roofThickM, totalRoofLengthM]}
                      position={[roofRafterLength / 2 - timberThickM / 2, 0, 0]}
                      orientation="horizontal"
                      materials={materials}
                      isExploded={isExploded}
                      explodedProgress={explodedProgress}
                    />
                  </group>
                )}

                {/* Revestimiento y Terminación Modular de Cubierta Exterior Faldón Derecho */}
                {layerCladding && (
                  <SipRoofCladdingAssembly
                    rafterLength={roofRafterLength}
                    roofLength={totalRoofLengthM}
                    roofThickness={roofThickM}
                    claddingType={roofCladding}
                    materials={materials}
                    axisAlongSlope="x"
                    eaveSide="max"
                    isExploded={isExploded}
                    explodedProgress={explodedProgress}
                  />
                )}
              </group>

              {/* Hojalatería de Cumbrera Zincalum Principal */}
              {layerRoofSip && (
                <mesh
                  position={[0, gableRoofHeightM + roofThickM / Math.cos(roofSlopeAngle) + 0.02 + (isExploded ? expY * 0.25 : 0), 0]}
                  material={materials.zincalumBlack}
                  castShadow
                >
                  <boxGeometry args={[0.32, 0.04, lengthM + 2 * overhangM + 0.06]} />
                </mesh>
              )}

              {/* TECHUMBRE ADOSADA A 2 AGUAS PARA ALA LATERAL (CASA EN L O MULTIVOLUMEN) */}
              {isWingExtended && (
                <group
                  position={[
                    wingRoofCenterX,
                    0,
                    lengthM / 2 - wingLengthM / 2,
                  ]}
                >
                  {/* Viga Cumbrera de Ala Lateral */}
                  {(layerTimberStructure || isExploded) && (
                    <TimberPiece
                      args={[totalWingRoofLengthM, 0.185, timberThickM]}
                      position={[0, gableRoofHeightM - 0.0925 + (isExploded ? explodedProgress * 0.15 : 0), 0]}
                      orientation="horizontal"
                      materials={materials}
                      isExploded={isExploded}
                      explodedProgress={explodedProgress}
                    />
                  )}

                  {/* Faldón Posterior de Ala (-Z de ala hacia el patio) */}
                  <group
                    position={[0, wingRoofMidY, -wingRoofMidZ - (isExploded ? expOutZ * 0.35 : 0)]}
                    rotation={[-wingSlopeAngle, 0, 0]}
                  >
                    {layerRoofSip &&
                      wingRoofPanels2D.map((rp, rIdx) => {
                        const panelOffsetZ = (rp.zi - (rp.countZ - 1) / 2) * (explodedProgress * 0.35);
                        const panelOffsetX = (rp.xi - (rp.countX - 1) / 2) * (explodedProgress * 0.25);
                        const staggerNorm = (rIdx % 2 === 0 ? 0.06 : -0.03) * explodedProgress;

                        return (
                          <group
                            key={`wing-roof-b-${rp.xi}-${rp.zi}`}
                            position={[rp.cz + panelOffsetX, staggerNorm, rp.cx + panelOffsetZ]}
                            rotation={[-Math.PI / 2, 0, 0]}
                          >
                            <SipIndividualPanel
                              width={rp.l}
                              height={rp.w}
                              totalThickness={roofThickM}
                              recess={0.035}
                              osbMaterial={materials.osbRoofSip}
                              epsMaterial={materials.epsCore}
                              osbEdgeMaterial={materials.osbEdge}
                              claddingMaterial={roofExteriorMat}
                              useCladdingOnFront={layerCladding}
                              tag={`Techo-Ala-B-${rIdx + 1}`}
                              isExploded={isExploded}
                            />
                          </group>
                        );
                      })}

                    {/* Estructura de Madera bajo Faldón Posterior de Ala */}
                    {(layerTimberStructure || isExploded) && (
                      <group>
                        {Array.from({ length: wingPanelsCountX + 1 }).map((_, xi) => {
                          const cx = -totalWingRoofLengthM / 2 + (xi * totalWingRoofLengthM) / wingPanelsCountX;
                          return (
                            <TimberPiece
                              key={`wing-timber-b-${xi}`}
                              args={[timberThickM, timberThickM, wingRafterLength - 0.06]}
                              position={[cx, -roofThickM / 2 - timberThickM / 2, 0]}
                              orientation="horizontal"
                              materials={materials}
                              isExploded={isExploded}
                              explodedProgress={explodedProgress}
                            />
                          );
                        })}
                        {/* Tapacán de Alero de Ala */}
                        <TimberPiece
                          args={[totalWingRoofLengthM, roofThickM, timberThickM]}
                          position={[0, 0, -wingRafterLength / 2 + timberThickM / 2]}
                          orientation="horizontal"
                          materials={materials}
                          isExploded={isExploded}
                          explodedProgress={explodedProgress}
                        />
                      </group>
                    )}

                    {/* Revestimiento Exterior de Techumbre Faldón Posterior de Ala */}
                    {layerCladding && (
                      <SipRoofCladdingAssembly
                        rafterLength={wingRafterLength}
                        roofLength={totalWingRoofLengthM}
                        roofThickness={roofThickM}
                        claddingType={roofCladding}
                        materials={materials}
                        axisAlongSlope="z"
                        eaveSide="min"
                        isExploded={isExploded}
                        explodedProgress={explodedProgress}
                      />
                    )}
                  </group>

                  {/* Faldón Frontal de Ala (+Z de ala hacia el frontis) */}
                  <group
                    position={[0, wingRoofMidY, wingRoofMidZ + (isExploded ? expOutZ * 0.35 : 0)]}
                    rotation={[wingSlopeAngle, 0, 0]}
                  >
                    {layerRoofSip &&
                      wingRoofPanels2D.map((rp, rIdx) => {
                        const panelOffsetZ = (rp.zi - (rp.countZ - 1) / 2) * (explodedProgress * 0.35);
                        const panelOffsetX = (rp.xi - (rp.countX - 1) / 2) * (explodedProgress * 0.25);
                        const staggerNorm = (rIdx % 2 === 0 ? 0.06 : -0.03) * explodedProgress;

                        return (
                          <group
                            key={`wing-roof-f-${rp.xi}-${rp.zi}`}
                            position={[rp.cz + panelOffsetX, staggerNorm, rp.cx + panelOffsetZ]}
                            rotation={[-Math.PI / 2, 0, 0]}
                          >
                            <SipIndividualPanel
                              width={rp.l}
                              height={rp.w}
                              totalThickness={roofThickM}
                              recess={0.035}
                              osbMaterial={materials.osbRoofSip}
                              epsMaterial={materials.epsCore}
                              osbEdgeMaterial={materials.osbEdge}
                              claddingMaterial={roofExteriorMat}
                              useCladdingOnFront={layerCladding}
                              tag={`Techo-Ala-F-${rIdx + 1}`}
                              isExploded={isExploded}
                            />
                          </group>
                        );
                      })}

                    {/* Estructura de Madera bajo Faldón Frontal de Ala */}
                    {(layerTimberStructure || isExploded) && (
                      <group>
                        {Array.from({ length: wingPanelsCountX + 1 }).map((_, xi) => {
                          const cx = -totalWingRoofLengthM / 2 + (xi * totalWingRoofLengthM) / wingPanelsCountX;
                          return (
                            <TimberPiece
                              key={`wing-timber-f-${xi}`}
                              args={[timberThickM, timberThickM, wingRafterLength - 0.06]}
                              position={[cx, -roofThickM / 2 - timberThickM / 2, 0]}
                              orientation="horizontal"
                              materials={materials}
                              isExploded={isExploded}
                              explodedProgress={explodedProgress}
                            />
                          );
                        })}
                        {/* Tapacán de Alero de Ala */}
                        <TimberPiece
                          args={[totalWingRoofLengthM, roofThickM, timberThickM]}
                          position={[0, 0, wingRafterLength / 2 - timberThickM / 2]}
                          orientation="horizontal"
                          materials={materials}
                          isExploded={isExploded}
                          explodedProgress={explodedProgress}
                        />
                      </group>
                    )}

                    {/* Revestimiento Exterior de Techumbre Faldón Frontal de Ala */}
                    {layerCladding && (
                      <SipRoofCladdingAssembly
                        rafterLength={wingRafterLength}
                        roofLength={totalWingRoofLengthM}
                        roofThickness={roofThickM}
                        claddingType={roofCladding}
                        materials={materials}
                        axisAlongSlope="z"
                        eaveSide="max"
                        isExploded={isExploded}
                        explodedProgress={explodedProgress}
                      />
                    )}
                  </group>

                  {/* Cumbrera Zincalum Ala Lateral */}
                  {layerRoofSip && (
                    <mesh
                      position={[
                        0,
                        gableRoofHeightM + roofThickM / Math.cos(wingSlopeAngle) + 0.02 + (isExploded ? expY * 0.25 : 0),
                        0,
                      ]}
                      material={materials.zincalumBlack}
                      castShadow
                    >
                      <boxGeometry args={[totalWingRoofLengthM + 0.06, 0.04, 0.32]} />
                    </mesh>
                  )}

                  {/* Hojalatería de Encuentro / Forro de Unión sobre Panel SIP (Capa superficial) */}
                  {layerRoofSip && (
                    <group>
                      {/* Forro Faldón Posterior */}
                      <mesh
                        position={[
                          -totalWingRoofLengthM / 2 + 0.08,
                          wingRoofMidY + (roofThickM / 2 + 0.004) * Math.cos(wingSlopeAngle) + (isExploded ? expY * 0.2 : 0),
                          -wingRoofMidZ + (roofThickM / 2 + 0.004) * Math.sin(wingSlopeAngle),
                        ]}
                        rotation={[-wingSlopeAngle, 0, 0]}
                        material={materials.zincalumBlack}
                      >
                        <boxGeometry args={[0.16, 0.008, wingRafterLength + 0.04]} />
                      </mesh>
                      {/* Forro Faldón Frontal */}
                      <mesh
                        position={[
                          -totalWingRoofLengthM / 2 + 0.08,
                          wingRoofMidY + (roofThickM / 2 + 0.004) * Math.cos(wingSlopeAngle) + (isExploded ? expY * 0.2 : 0),
                          wingRoofMidZ - (roofThickM / 2 + 0.004) * Math.sin(wingSlopeAngle),
                        ]}
                        rotation={[wingSlopeAngle, 0, 0]}
                        material={materials.zincalumBlack}
                      >
                        <boxGeometry args={[0.16, 0.008, wingRafterLength + 0.04]} />
                      </mesh>
                    </group>
                  )}
                </group>
              )}
            </group>
          ) : isSingleShed ? (
            /* 4.1.2 Techo a 1 Agua (Mono-pitch continuo) */
            <group>
              {/* Faldón Principal a 1 Agua */}
              <group
                position={[singleRoofMidX, singleRoofMidY + (isExploded ? expY * 0.35 : 0), 0]}
                rotation={[0, 0, singleSlopeAngle]}
              >
                {/* Paneles SIP Faldón a 1 Agua */}
                {layerRoofSip &&
                  singleRoofPanels2D.map((rp, rIdx) => {
                    const panelOffsetZ = (rp.zi - (rp.countZ - 1) / 2) * (explodedProgress * 0.35);
                    const panelOffsetX = (rp.xi - (rp.countX - 1) / 2) * (explodedProgress * 0.25);
                    const staggerNorm = (rIdx % 2 === 0 ? 0.06 : -0.03) * explodedProgress;

                    return (
                      <group
                        key={`single-roof-p-${rp.xi}-${rp.zi}`}
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
                          tag={`Techo-1Agua-${rIdx + 1}`}
                          isExploded={isExploded}
                        />
                      </group>
                    );
                  })}

                {/* Estructura de Madera bajo Faldón a 1 Agua */}
                {(layerTimberStructure || isExploded) && (
                  <group>
                    {Array.from({ length: roofPanelsCountZ + 1 }).map((_, zi) => {
                      const cz = -totalRoofLengthM / 2 + (zi * totalRoofLengthM) / roofPanelsCountZ;
                      return (
                        <TimberPiece
                          key={`single-roof-timber-${zi}`}
                          args={[singleRafterLength - 0.06, timberThickM, timberWidthM]}
                          position={[0, -roofThickM / 2 - timberThickM / 2, cz]}
                          orientation="horizontal"
                          materials={materials}
                          isExploded={isExploded}
                          explodedProgress={explodedProgress}
                        />
                      );
                    })}

                    {/* Tapacán Inferior Alero (-X) */}
                    <TimberPiece
                      args={[timberThickM, roofThickM, totalRoofLengthM]}
                      position={[-singleRafterLength / 2 + timberThickM / 2, 0, 0]}
                      orientation="horizontal"
                      materials={materials}
                      isExploded={isExploded}
                      explodedProgress={explodedProgress}
                    />

                    {/* Tapacán Superior Cumbrera (+X) */}
                    <TimberPiece
                      args={[timberThickM, roofThickM, totalRoofLengthM]}
                      position={[singleRafterLength / 2 - timberThickM / 2, 0, 0]}
                      orientation="horizontal"
                      materials={materials}
                      isExploded={isExploded}
                      explodedProgress={explodedProgress}
                    />
                  </group>
                )}

                {/* Revestimiento y Terminación Modular de Cubierta Techo a 1 Agua */}
                {layerCladding && (
                  <SipRoofCladdingAssembly
                    rafterLength={singleRafterLength}
                    roofLength={totalRoofLengthM}
                    roofThickness={roofThickM}
                    claddingType={roofCladding}
                    materials={materials}
                    axisAlongSlope="x"
                    eaveSide="min"
                    isExploded={isExploded}
                    explodedProgress={explodedProgress}
                  />
                )}
              </group>

              {/* Hojalatería Zincalum de Coronación Alta (+X) */}
              {layerRoofSip && (
                <mesh
                  position={[
                    (isWingExtended ? widthM / 2 + wingWidthM : widthM / 2) + overhangM,
                    gableRoofHeightM + (roofThickM / 2) / Math.cos(singleSlopeAngle) + 0.02 + (isExploded ? expY * 0.25 : 0),
                    isWingExtended ? lengthM / 2 - wingLengthM / 2 : 0,
                  ]}
                  material={materials.zincalumBlack}
                  castShadow
                >
                  <boxGeometry args={[0.25, 0.04, (isWingExtended ? wingLengthM : lengthM) + 2 * overhangM + 0.06]} />
                </mesh>
              )}

              {/* Cubierta de Ala Lateral para Casa en L o Multivolumen a 1 Agua */}
              {isWingExtended && (
                <group
                  position={[
                    wingSingleRoofMidX,
                    wingSingleRoofMidY + (isExploded ? expY * 0.35 : 0),
                    lengthM / 2 - wingLengthM / 2,
                  ]}
                  rotation={[0, 0, singleSlopeAngle]}
                >
                  {layerRoofSip &&
                    wingSingleRoofPanels2D.map((rp, rIdx) => {
                      const panelOffsetZ = (rp.zi - (rp.countZ - 1) / 2) * (explodedProgress * 0.35);
                      const panelOffsetX = (rp.xi - (rp.countX - 1) / 2) * (explodedProgress * 0.25);
                      const staggerNorm = (rIdx % 2 === 0 ? 0.06 : -0.03) * explodedProgress;

                      return (
                        <group
                          key={`wing-single-roof-p-${rp.xi}-${rp.zi}`}
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
                            tag={`Techo-Ala-1Agua-${rIdx + 1}`}
                            isExploded={isExploded}
                          />
                        </group>
                      );
                    })}

                  {(layerTimberStructure || isExploded) && (
                    <group>
                      {Array.from({ length: Math.max(1, Math.ceil((wingLengthM + 2 * overhangM) / 1.22)) + 1 }).map((_, zi) => {
                        const cz = -(wingLengthM + 2 * overhangM) / 2 + (zi * (wingLengthM + 2 * overhangM)) / Math.max(1, Math.ceil((wingLengthM + 2 * overhangM) / 1.22));
                        return (
                          <TimberPiece
                            key={`wing-single-timber-${zi}`}
                            args={[wingSingleRafterLength - 0.06, timberThickM, timberWidthM]}
                            position={[0, -roofThickM / 2 - timberThickM / 2, cz]}
                            orientation="horizontal"
                            materials={materials}
                            isExploded={isExploded}
                            explodedProgress={explodedProgress}
                          />
                        );
                      })}
                      {/* Tapacán de Alero y Coronación de Ala a 1 Agua */}
                      <TimberPiece
                        args={[timberThickM, roofThickM, wingLengthM + 2 * overhangM]}
                        position={[-wingSingleRafterLength / 2 + timberThickM / 2, 0, 0]}
                        orientation="horizontal"
                        materials={materials}
                        isExploded={isExploded}
                        explodedProgress={explodedProgress}
                      />
                      <TimberPiece
                        args={[timberThickM, roofThickM, wingLengthM + 2 * overhangM]}
                        position={[wingSingleRafterLength / 2 - timberThickM / 2, 0, 0]}
                        orientation="horizontal"
                        materials={materials}
                        isExploded={isExploded}
                        explodedProgress={explodedProgress}
                      />
                    </group>
                  )}

                  {/* Revestimiento Exterior de Techumbre Ala 1 Agua */}
                  {layerCladding && (
                    <SipRoofCladdingAssembly
                      rafterLength={wingSingleRafterLength}
                      roofLength={wingLengthM + 2 * overhangM}
                      roofThickness={roofThickM}
                      claddingType={roofCladding}
                      materials={materials}
                      axisAlongSlope="x"
                      eaveSide="min"
                      isExploded={isExploded}
                      explodedProgress={explodedProgress}
                    />
                  )}
                </group>
              )}
            </group>
          ) : (
            /* 4.1.3 Cubierta Plana / Techo Recto Horizontal */
            <group position={[0, roofThickM / 2, 0]}>
              {/* Losa Techo Plana Nave Principal */}
              {layerRoofSip &&
                flatRoofPanels2D.map((rp, rIdx) => {
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

              {/* Revestimiento Exterior de Cubierta Plana */}
              {layerCladding && (
                <SipRoofCladdingAssembly
                  rafterLength={widthM + 2 * overhangM}
                  roofLength={totalRoofLengthM}
                  roofThickness={roofThickM}
                  claddingType={roofCladding}
                  materials={materials}
                  axisAlongSlope="x"
                  eaveSide="min"
                  isExploded={isExploded}
                  explodedProgress={explodedProgress}
                />
              )}

              {/* Losa Techo Plana Ala Lateral en L o Multivolumen */}
              {isWingExtended && layerRoofSip &&
                wingFlatRoofPanels2D.map((rp, rIdx) => {
                  const spreadZ = (rp.zi - (rp.countZ - 1) / 2) * (explodedProgress * 0.35);
                  const spreadX = (rp.xi - (rp.countX - 1) / 2) * (explodedProgress * 0.25);
                  const staggerY = (rIdx % 2 === 0 ? 0.06 : -0.03) * explodedProgress;

                  const wingCenterFlatX = widthM / 2 + (wingWidthM + overhangM) / 2;
                  const wingCenterFlatZ = lengthM / 2 - wingLengthM / 2;

                  return (
                    <group
                      key={`roof-wing-flat-p-${rp.xi}-${rp.zi}`}
                      position={[
                        wingCenterFlatX + rp.cx + spreadX,
                        staggerY,
                        wingCenterFlatZ + rp.cz + spreadZ,
                      ]}
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
                        tag={`Techo-Wing-Flat-${rIdx + 1}`}
                        isExploded={isExploded}
                      />
                    </group>
                  );
                })}

              {/* Estructura de Madera de Cubierta Plana (Viguetas/Listones entre paneles y Vigas Perimetrales) */}
              {(layerTimberStructure || isExploded) && (
                <group>
                  {/* Viguetas / Listones transversales de madera entre paneles SIP cada 1.22 m en Nave Principal */}
                  {Array.from({ length: roofPanelsCountZ + 1 }).map((_, zi) => {
                    const cz = -totalRoofLengthM / 2 + (zi * totalRoofLengthM) / roofPanelsCountZ;
                    return (
                      <TimberPiece
                        key={`flat-roof-joist-${zi}`}
                        args={[widthM + 2 * overhangM - 2 * timberThickM, timberWidthM, timberThickM]}
                        position={[0, -roofThickM / 2 - timberThickM / 2, cz]}
                        orientation="horizontal"
                        materials={materials}
                        isExploded={isExploded}
                        explodedProgress={explodedProgress}
                      />
                    );
                  })}

                  {/* Listones de apoyo longitudinal bajo uniones intermedias de panel (si ancho > 2.44m) */}
                  {widthM + 2 * overhangM > 2.44 && (
                    <TimberPiece
                      args={[timberThickM, timberWidthM, totalRoofLengthM - 2 * timberThickM]}
                      position={[0, -roofThickM / 2 - timberThickM / 2, 0]}
                      orientation="horizontal"
                      materials={materials}
                      isExploded={isExploded}
                      explodedProgress={explodedProgress}
                    />
                  )}

                  {/* Viguetas / Listones de madera entre paneles SIP cada 1.22 m en Ala Lateral en L o Multivolumen */}
                  {isWingExtended && (
                    <group>
                      {Array.from({
                        length: Math.max(1, Math.ceil((wingLengthM + 2 * overhangM) / 1.22)) + 1,
                      }).map((_, zi) => {
                        const count = Math.max(1, Math.ceil((wingLengthM + 2 * overhangM) / 1.22));
                        const cz = -(wingLengthM + 2 * overhangM) / 2 + (zi * (wingLengthM + 2 * overhangM)) / count;
                        const wingCenterFlatX = widthM / 2 + (wingWidthM + overhangM) / 2;
                        const wingCenterFlatZ = lengthM / 2 - wingLengthM / 2;

                        return (
                          <TimberPiece
                            key={`flat-wing-joist-${zi}`}
                            args={[wingWidthM + overhangM - timberThickM, timberWidthM, timberThickM]}
                            position={[
                              wingCenterFlatX,
                              -roofThickM / 2 - timberThickM / 2,
                              wingCenterFlatZ + cz,
                            ]}
                            orientation="horizontal"
                            materials={materials}
                            isExploded={isExploded}
                            explodedProgress={explodedProgress}
                          />
                        );
                      })}
                    </group>
                  )}

                  {/* Vigas de Remate Perimetral de Techo (Rim Beams) */}
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
                  {!isWingExtended && (
                    <TimberPiece
                      args={[timberThickM, roofThickM - 0.022, lengthM + 2 * overhangM - 2 * timberThickM]}
                      position={[(widthM + 2 * overhangM) / 2 - timberThickM / 2, 0, 0]}
                      orientation="horizontal"
                      materials={materials}
                      isExploded={isExploded}
                      explodedProgress={explodedProgress}
                    />
                  )}
                  {isWingExtended && (
                    <group>
                      {/* Viga Frontal Ala (+Z) */}
                      <TimberPiece
                        args={[wingWidthM + overhangM, roofThickM - 0.022, timberThickM]}
                        position={[
                          widthM / 2 + (wingWidthM + overhangM) / 2,
                          0,
                          (lengthM + 2 * overhangM) / 2 - timberThickM / 2,
                        ]}
                        orientation="horizontal"
                        materials={materials}
                        isExploded={isExploded}
                        explodedProgress={explodedProgress}
                      />
                      {/* Viga Lateral Ala (+X) */}
                      <TimberPiece
                        args={[timberThickM, roofThickM - 0.022, wingLengthM + 2 * overhangM]}
                        position={[
                          widthM / 2 + wingWidthM + overhangM - timberThickM / 2,
                          0,
                          lengthM / 2 - wingLengthM / 2,
                        ]}
                        orientation="horizontal"
                        materials={materials}
                        isExploded={isExploded}
                        explodedProgress={explodedProgress}
                      />
                      {/* Viga Patio Ala (-Z) */}
                      <TimberPiece
                        args={[wingWidthM + overhangM, roofThickM - 0.022, timberThickM]}
                        position={[
                          widthM / 2 + (wingWidthM + overhangM) / 2,
                          0,
                          lengthM / 2 - wingLengthM - overhangM + timberThickM / 2,
                        ]}
                        orientation="horizontal"
                        materials={materials}
                        isExploded={isExploded}
                        explodedProgress={explodedProgress}
                      />
                    </group>
                  )}
                </group>
              )}

              {/* Hojalatería Zincalum Perimetral de Coronación Plana */}
              {layerRoofSip && (
                <group position={[0, roofThickM / 2 + 0.015, 0]}>
                  <mesh
                    position={[0, 0, (lengthM + 2 * overhangM) / 2]}
                    material={materials.zincalumBlack}
                  >
                    <boxGeometry args={[widthM + 2 * overhangM + 0.04, 0.03, 0.12]} />
                  </mesh>
                  <mesh
                    position={[0, 0, -(lengthM + 2 * overhangM) / 2]}
                    material={materials.zincalumBlack}
                  >
                    <boxGeometry args={[widthM + 2 * overhangM + 0.04, 0.03, 0.12]} />
                  </mesh>
                  <mesh
                    position={[-(widthM + 2 * overhangM) / 2, 0, 0]}
                    material={materials.zincalumBlack}
                  >
                    <boxGeometry args={[0.12, 0.03, lengthM + 2 * overhangM + 0.04]} />
                  </mesh>
                  {!isWingExtended ? (
                    <mesh
                      position={[(widthM + 2 * overhangM) / 2, 0, 0]}
                      material={materials.zincalumBlack}
                    >
                      <boxGeometry args={[0.12, 0.03, lengthM + 2 * overhangM + 0.04]} />
                    </mesh>
                  ) : (
                    <group>
                      {/* Hojalatería Frontal Ala (+Z) */}
                      <mesh
                        position={[widthM / 2 + (wingWidthM + overhangM) / 2, 0, (lengthM + 2 * overhangM) / 2]}
                        material={materials.zincalumBlack}
                      >
                        <boxGeometry args={[wingWidthM + overhangM + 0.04, 0.03, 0.12]} />
                      </mesh>
                      {/* Hojalatería Lateral Ala (+X) */}
                      <mesh
                        position={[widthM / 2 + wingWidthM + overhangM, 0, lengthM / 2 - wingLengthM / 2]}
                        material={materials.zincalumBlack}
                      >
                        <boxGeometry args={[0.12, 0.03, wingLengthM + 2 * overhangM + 0.04]} />
                      </mesh>
                      {/* Hojalatería Patio Ala (-Z) */}
                      <mesh
                        position={[widthM / 2 + (wingWidthM + overhangM) / 2, 0, lengthM / 2 - wingLengthM - overhangM]}
                        material={materials.zincalumBlack}
                      >
                        <boxGeometry args={[wingWidthM + overhangM + 0.04, 0.03, 0.12]} />
                      </mesh>
                    </group>
                  )}
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
