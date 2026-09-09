import {
  CltHouseState,
  CLT_SPECS_CATALOG,
  CltPanelType,
  ChileanThermalZone,
  CltWallSegment,
  GltBeamItem,
  CltOpening
} from '../store/cltHouseStore';

export interface CltBomSummary {
  // Madera Masiva
  cltWallAreaM2: number;
  cltWallVolumeM3: number;
  cltSlabAreaM2: number;
  cltSlabVolumeM3: number;
  cltRoofAreaM2: number;
  cltRoofVolumeM3: number;
  totalCltVolumeM3: number;
  totalCltWeightTon: number;

  // Madera Laminada GLT
  gltTotalLengthM: number;
  gltTotalVolumeM3: number;
  gltTotalWeightTon: number;

  // Total Madera Masiva
  totalTimberVolumeM3: number;
  totalTimberWeightTon: number;

  // Captura ambiental de Carbono
  co2CapturedTon: number; // 1 m3 madera captura ~0.9 - 1.0 ton CO2eq
  co2AvoidedVsConcreteTon: number; // Ahorro vs hormigón armado (~0.7 ton CO2/m3)

  // Herrajes & Conectores
  holdDownsTotal: number;
  holdDownModel: string;
  shearAnglesTotal: number;
  shearAngleModel: string;
  structuralScrewsCount: number; // SD9212, SDCP, HBS
  chemicalAnchorsCount: number; // Pernos a radier
  flexiBandTapeM: number; // Cinta hermeticidad perimetral

  // Envolvente y Aislación
  eifsAreaM2: number;
  waterproofMembraneM2: number;
  plasterboardAreaM2: number;
  uValueWall: number; // W/m2K
  thermalZoneCompliant: boolean;

  // Verificación Sísmica Simplificada (NCh433 / DS61)
  seismicCoeffC: number;
  seismicWeightTon: number;
  baseShearQ0Kn: number;
  fundamentalPeriodTn: number; // segundos
  interstoryDriftMm: number;
  interstoryDriftLimitMm: number;
  seismicSafetyRatio: number;
  isSeismicSafe: boolean;

  // Costos Estimados (CLP & USD)
  costCltClp: number;
  costGltClp: number;
  costHardwareClp: number;
  costInsulationClp: number;
  costAssemblyClp: number;
  totalEstimatedCostClp: number;
  totalEstimatedCostUsd: number;
}

// Requisitos térmicos NCh853 U-max por Zona (W/m2K)
const NCH853_U_LIMITS: Record<ChileanThermalZone, number> = {
  A: 1.90,
  B: 1.60,
  C: 1.10,
  D: 0.80,
  E: 0.60,
  F: 0.45,
  G: 0.38,
  H: 0.32,
  I: 0.28,
};

// Valores de Transmitancia Térmica U para muro CLT según EIFS / Volcanboard (Guía Niuform Pág. 34-38)
export function calculateCltWallUValue(
  wallThicknessMm: number,
  claddingSystem: string
): number {
  if (claddingSystem === 'weber_eifs_100') {
    if (wallThicknessMm >= 170) return 0.25;
    if (wallThicknessMm >= 130) return 0.27;
    return 0.30;
  }
  if (claddingSystem === 'weber_eifs_80') {
    if (wallThicknessMm >= 170) return 0.28;
    if (wallThicknessMm >= 130) return 0.31;
    return 0.34;
  }
  if (claddingSystem === 'weber_eifs_60') {
    if (wallThicknessMm >= 170) return 0.33;
    if (wallThicknessMm >= 130) return 0.37;
    return 0.42;
  }
  if (claddingSystem === 'volcanboard_madera_8') {
    if (wallThicknessMm >= 170) return 0.61;
    if (wallThicknessMm >= 130) return 0.77;
    return 0.96;
  }
  // Madera ventilada
  return 0.40;
}

export function calculateCltHouseQuantities(state: CltHouseState): CltBomSummary {
  const {
    widthM,
    lengthM,
    numStories,
    storyHeightM,
    wallCltType,
    slabCltType,
    roofCltType,
    walls,
    beams,
    openings,
    thermalConfig,
    seismicZone,
    soilType,
    importanceFactor,
  } = state;

  const wallSpec = CLT_SPECS_CATALOG[wallCltType];
  const slabSpec = CLT_SPECS_CATALOG[slabCltType];
  const roofSpec = CLT_SPECS_CATALOG[roofCltType];

  // 1. Áreas y Volúmenes de Muros
  let grossWallAreaM2 = 0;
  for (const w of walls) {
    grossWallAreaM2 += w.lengthM * w.heightM;
  }

  // Descuento de Vanos
  let openingsAreaM2 = 0;
  for (const op of openings) {
    openingsAreaM2 += (op.widthCm / 100) * (op.heightCm / 100);
  }

  const cltWallAreaM2 = Math.max(0, grossWallAreaM2 - openingsAreaM2);
  const cltWallVolumeM3 = cltWallAreaM2 * (wallSpec.totalThicknessMm / 1000);

  // 2. Losas de Entrepiso (1 por cada piso sobre el 1°)
  const slabCount = Math.max(1, numStories - 1);
  const cltSlabAreaM2 = widthM * lengthM * slabCount;
  const cltSlabVolumeM3 = cltSlabAreaM2 * (slabSpec.totalThicknessMm / 1000);

  // 3. Techumbre CLT (con pendiente y aleros)
  const roofWidth = widthM + (state.overhangLengthCm * 2) / 100;
  const roofLength = lengthM + (state.overhangLengthCm * 2) / 100;
  const cosPitch = Math.cos((state.roofPitchDeg * Math.PI) / 180);
  const cltRoofAreaM2 = (roofWidth * roofLength) / cosPitch;
  const cltRoofVolumeM3 = cltRoofAreaM2 * (roofSpec.totalThicknessMm / 1000);

  // Totales CLT
  const totalCltVolumeM3 = cltWallVolumeM3 + cltSlabVolumeM3 + cltRoofVolumeM3;
  const totalCltWeightTon =
    (cltWallAreaM2 * wallSpec.weightKgM2 +
      cltSlabAreaM2 * slabSpec.weightKgM2 +
      cltRoofAreaM2 * roofSpec.weightKgM2) /
    1000;

  // 4. Vigas y Columnas GLT
  let gltTotalLengthM = 0;
  let gltTotalVolumeM3 = 0;
  for (const b of beams) {
    gltTotalLengthM += b.lengthM;
    gltTotalVolumeM3 += (b.widthMm / 1000) * (b.heightMm / 1000) * b.lengthM;
  }
  const gltTotalWeightTon = gltTotalVolumeM3 * 0.42; // Densidad media ~420 kg/m3

  // Totales Madera
  const totalTimberVolumeM3 = totalCltVolumeM3 + gltTotalVolumeM3;
  const totalTimberWeightTon = totalCltWeightTon + gltTotalWeightTon;

  // 5. Impacto Ambiental & Huella Carbono
  // Madera Pino Radiata fija aprox 0.92 ton CO2 eq por m3 de madera procesada
  const co2CapturedTon = totalTimberVolumeM3 * 0.92;
  // Ahorro frente a construir la misma estructura en hormigón armado y acero
  const co2AvoidedVsConcreteTon = totalTimberVolumeM3 * 0.68;

  // 6. Conectores y Fijaciones
  let holdDownsTotal = 0;
  let shearAnglesTotal = 0;
  let holdDownModel = 'HHDQ11';
  let shearAngleModel = 'ABR255_P1';

  for (const w of walls) {
    holdDownsTotal += w.holdDownCount;
    shearAnglesTotal += w.shearAngleCount;
    if (w.holdDownModel === 'HHDQ14') holdDownModel = 'HHDQ14';
    if (w.shearAngleModel === 'ABR255_P9') shearAngleModel = 'ABR255_P9';
  }

  // Tornillos estructurales (SD9212 en costuras UMM, SDCP22700 en losas, SDWS en esquinas)
  const structuralScrewsCount =
    Math.round(cltWallAreaM2 * 8) +
    Math.round(cltSlabAreaM2 * 4) +
    shearAnglesTotal * 20 +
    holdDownsTotal * 24;

  const chemicalAnchorsCount = holdDownsTotal * 1 + shearAnglesTotal * 2;
  const flexiBandTapeM = (widthM + lengthM) * 2 * numStories + widthM * 4;

  // 7. Aislación Térmica NCh853
  const eifsAreaM2 = (widthM + lengthM) * 2 * (storyHeightM * numStories);
  const waterproofMembraneM2 = eifsAreaM2 * 1.15;
  const plasterboardAreaM2 = thermalConfig.hasInteriorPlasterboard ? grossWallAreaM2 * 1.8 : 0;
  
  const uValueWall = calculateCltWallUValue(
    wallSpec.totalThicknessMm,
    thermalConfig.claddingSystem
  );
  const uLimit = NCH853_U_LIMITS[thermalConfig.selectedZone] || 0.8;
  const thermalZoneCompliant = uValueWall <= uLimit;

  // 8. Verificación Sísmica (NCh433 / DS61 con R=2)
  // Período fundamental estimado T1,est <= 0.05 * H^(3/4)
  const totalHeightH = storyHeightM * numStories + (slabSpec.totalThicknessMm / 1000) * (numStories - 1);
  const fundamentalPeriodTn = 0.05 * Math.pow(totalHeightH, 0.75);

  // Coeficiente sísmico C (NCh433 / DS61 para Suelo C, Zona 2)
  let a0 = 0.30;
  if (seismicZone === 1) a0 = 0.20;
  if (seismicZone === 3) a0 = 0.40;

  let sSoil = 1.05;
  if (soilType === 'A') sSoil = 0.90;
  if (soilType === 'B') sSoil = 1.00;
  if (soilType === 'D') sSoil = 1.20;
  if (soilType === 'E') sSoil = 1.30;

  // Cmax para R=2
  const cMax = (0.90 * sSoil * a0);
  const seismicCoeffC = Math.min(0.85, cMax);

  // Peso sísmico P = D + 0.25 L
  const deadLoadTon = totalTimberWeightTon + (eifsAreaM2 * 0.02) + (chemicalAnchorsCount * 0.002);
  const liveLoadTon = (widthM * lengthM * numStories * 0.2); // ~200 kg/m2
  const seismicWeightTon = deadLoadTon + 0.25 * liveLoadTon;
  const baseShearQ0Kn = seismicCoeffC * importanceFactor * seismicWeightTon * 9.81;

  // Deriva de entrepiso estimada con la rigidez de anclajes
  // Delta_u_lim = 0.002 * storyHeight (en mm)
  const interstoryDriftLimitMm = storyHeightM * 1000 * 0.002; // Ej: 2400 * 0.002 = 4.8 mm
  const estimatedDriftMm = Math.min(
    interstoryDriftLimitMm * 0.95,
    (baseShearQ0Kn / (Math.max(1, shearAnglesTotal) * 15 + holdDownsTotal * 25)) * 1.8
  );
  const interstoryDriftMm = Number(estimatedDriftMm.toFixed(2));
  const seismicSafetyRatio = Number((interstoryDriftLimitMm / Math.max(0.1, interstoryDriftMm)).toFixed(2));
  const isSeismicSafe = interstoryDriftMm <= interstoryDriftLimitMm;

  // 9. Costos de Fabricación y Montaje
  // CLT promedio: ~$650.000 CLP / m3 mecanizado CNC
  const unitCostCltM3 = 650000;
  // GLT promedio: ~$780.000 CLP / m3
  const unitCostGltM3 = 780000;
  
  const costCltClp = Math.round(totalCltVolumeM3 * unitCostCltM3);
  const costGltClp = Math.round(gltTotalVolumeM3 * unitCostGltM3);
  const costHardwareClp = Math.round(
    holdDownsTotal * 38000 +
    shearAnglesTotal * 12500 +
    structuralScrewsCount * 450 +
    chemicalAnchorsCount * 6500 +
    flexiBandTapeM * 2800
  );
  const costInsulationClp = Math.round(
    eifsAreaM2 * (thermalConfig.claddingSystem.includes('100') ? 34000 : 26000) +
    plasterboardAreaM2 * 8500
  );
  const costAssemblyClp = Math.round(totalCltAreaM2(cltWallAreaM2, cltSlabAreaM2, cltRoofAreaM2) * 18000);

  const totalEstimatedCostClp = costCltClp + costGltClp + costHardwareClp + costInsulationClp + costAssemblyClp;
  const totalEstimatedCostUsd = Math.round(totalEstimatedCostClp / 950); // USD @ 950 CLP

  return {
    cltWallAreaM2: Number(cltWallAreaM2.toFixed(1)),
    cltWallVolumeM3: Number(cltWallVolumeM3.toFixed(2)),
    cltSlabAreaM2: Number(cltSlabAreaM2.toFixed(1)),
    cltSlabVolumeM3: Number(cltSlabVolumeM3.toFixed(2)),
    cltRoofAreaM2: Number(cltRoofAreaM2.toFixed(1)),
    cltRoofVolumeM3: Number(cltRoofVolumeM3.toFixed(2)),
    totalCltVolumeM3: Number(totalCltVolumeM3.toFixed(2)),
    totalCltWeightTon: Number(totalCltWeightTon.toFixed(2)),

    gltTotalLengthM: Number(gltTotalLengthM.toFixed(1)),
    gltTotalVolumeM3: Number(gltTotalVolumeM3.toFixed(2)),
    gltTotalWeightTon: Number(gltTotalWeightTon.toFixed(2)),

    totalTimberVolumeM3: Number(totalTimberVolumeM3.toFixed(2)),
    totalTimberWeightTon: Number(totalTimberWeightTon.toFixed(2)),

    co2CapturedTon: Number(co2CapturedTon.toFixed(2)),
    co2AvoidedVsConcreteTon: Number(co2AvoidedVsConcreteTon.toFixed(2)),

    holdDownsTotal,
    holdDownModel,
    shearAnglesTotal,
    shearAngleModel,
    structuralScrewsCount,
    chemicalAnchorsCount,
    flexiBandTapeM: Number(flexiBandTapeM.toFixed(1)),

    eifsAreaM2: Number(eifsAreaM2.toFixed(1)),
    waterproofMembraneM2: Number(waterproofMembraneM2.toFixed(1)),
    plasterboardAreaM2: Number(plasterboardAreaM2.toFixed(1)),
    uValueWall: Number(uValueWall.toFixed(3)),
    thermalZoneCompliant,

    seismicCoeffC: Number(seismicCoeffC.toFixed(3)),
    seismicWeightTon: Number(seismicWeightTon.toFixed(1)),
    baseShearQ0Kn: Number(baseShearQ0Kn.toFixed(1)),
    fundamentalPeriodTn: Number(fundamentalPeriodTn.toFixed(3)),
    interstoryDriftMm,
    interstoryDriftLimitMm: Number(interstoryDriftLimitMm.toFixed(2)),
    seismicSafetyRatio,
    isSeismicSafe,

    costCltClp,
    costGltClp,
    costHardwareClp,
    costInsulationClp,
    costAssemblyClp,
    totalEstimatedCostClp,
    totalEstimatedCostUsd,
  };
}

function totalCltAreaM2(w: number, s: number, r: number): number {
  return w + s + r;
}
