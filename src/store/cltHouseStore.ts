import { create } from 'zustand';

export type CltPanelType = 
  | 'CLT 60s3'
  | 'CLT 80s3'
  | 'CLT 90s3'
  | 'CLT 100s3'
  | 'CLT 110s3'
  | 'CLT 120s3'
  | 'CLT 130s5'
  | 'CLT 150s5'
  | 'CLT 160s5'
  | 'CLT 170s5'
  | 'CLT 180s5'
  | 'CLT 200s5'
  | 'CLT 210s7'
  | 'CLT 240s7'
  | 'CLT 280s7';

export interface CltPanelSpec {
  name: CltPanelType;
  layers: number;
  totalThicknessMm: number;
  layerThicknesses: number[];
  layerGrades: string[]; // e.g. ['C24L', 'C16T', 'C24L']
  weightKgM2: number;
  thermalConductivity: number; // W/mK
  charringRate: number; // mm/min (0.64 para Pino Radiata)
  bendingStiffnessEI: number; // 10^9 N mm2
  shearStiffnessGA: number; // 10^6 N
}

export const CLT_SPECS_CATALOG: Record<CltPanelType, CltPanelSpec> = {
  'CLT 60s3': {
    name: 'CLT 60s3',
    layers: 3,
    totalThicknessMm: 60,
    layerThicknesses: [20, 20, 20],
    layerGrades: ['C24L', 'C16T', 'C24L'],
    weightKgM2: 28.5,
    thermalConductivity: 0.104,
    charringRate: 0.64,
    bendingStiffnessEI: 820,
    shearStiffnessGA: 5.2,
  },
  'CLT 80s3': {
    name: 'CLT 80s3',
    layers: 3,
    totalThicknessMm: 80,
    layerThicknesses: [25, 30, 25],
    layerGrades: ['C24L', 'C16T', 'C24L'],
    weightKgM2: 38.0,
    thermalConductivity: 0.104,
    charringRate: 0.64,
    bendingStiffnessEI: 1650,
    shearStiffnessGA: 7.8,
  },
  'CLT 90s3': {
    name: 'CLT 90s3',
    layers: 3,
    totalThicknessMm: 90,
    layerThicknesses: [30, 30, 30],
    layerGrades: ['C24L', 'C16T', 'C24L'],
    weightKgM2: 42.8,
    thermalConductivity: 0.104,
    charringRate: 0.64,
    bendingStiffnessEI: 2460,
    shearStiffnessGA: 9.1,
  },
  'CLT 100s3': {
    name: 'CLT 100s3',
    layers: 3,
    totalThicknessMm: 100,
    layerThicknesses: [33, 34, 33],
    layerGrades: ['C24L', 'C16T', 'C24L'],
    weightKgM2: 47.6,
    thermalConductivity: 0.104,
    charringRate: 0.64,
    bendingStiffnessEI: 3100,
    shearStiffnessGA: 10.2,
  },
  'CLT 110s3': {
    name: 'CLT 110s3',
    layers: 3,
    totalThicknessMm: 110,
    layerThicknesses: [35, 40, 35],
    layerGrades: ['C24L', 'C16T', 'C24L'],
    weightKgM2: 52.3,
    thermalConductivity: 0.104,
    charringRate: 0.64,
    bendingStiffnessEI: 3950,
    shearStiffnessGA: 11.5,
  },
  'CLT 120s3': {
    name: 'CLT 120s3',
    layers: 3,
    totalThicknessMm: 120,
    layerThicknesses: [40, 40, 40],
    layerGrades: ['C24L', 'C16T', 'C24L'],
    weightKgM2: 57.1,
    thermalConductivity: 0.104,
    charringRate: 0.64,
    bendingStiffnessEI: 4800,
    shearStiffnessGA: 12.8,
  },
  'CLT 130s5': {
    name: 'CLT 130s5',
    layers: 5,
    totalThicknessMm: 130,
    layerThicknesses: [26, 26, 26, 26, 26],
    layerGrades: ['C24L', 'C16T', 'C24L', 'C16T', 'C24L'],
    weightKgM2: 61.8,
    thermalConductivity: 0.104,
    charringRate: 0.64,
    bendingStiffnessEI: 2100,
    shearStiffnessGA: 11.0,
  },
  'CLT 150s5': {
    name: 'CLT 150s5',
    layers: 5,
    totalThicknessMm: 150,
    layerThicknesses: [30, 30, 30, 30, 30],
    layerGrades: ['C24L', 'C16T', 'C24L', 'C16T', 'C24L'],
    weightKgM2: 71.4,
    thermalConductivity: 0.104,
    charringRate: 0.64,
    bendingStiffnessEI: 2466,
    shearStiffnessGA: 11.2,
  },
  'CLT 160s5': {
    name: 'CLT 160s5',
    layers: 5,
    totalThicknessMm: 160,
    layerThicknesses: [32, 32, 32, 32, 32],
    layerGrades: ['C24L', 'C16T', 'C24L', 'C16T', 'C24L'],
    weightKgM2: 76.1,
    thermalConductivity: 0.104,
    charringRate: 0.64,
    bendingStiffnessEI: 2850,
    shearStiffnessGA: 12.0,
  },
  'CLT 170s5': {
    name: 'CLT 170s5',
    layers: 5,
    totalThicknessMm: 170,
    layerThicknesses: [34, 34, 34, 34, 34],
    layerGrades: ['C24L', 'C16T', 'C24L', 'C16T', 'C24L'],
    weightKgM2: 80.9,
    thermalConductivity: 0.104,
    charringRate: 0.64,
    bendingStiffnessEI: 3300,
    shearStiffnessGA: 12.9,
  },
  'CLT 180s5': {
    name: 'CLT 180s5',
    layers: 5,
    totalThicknessMm: 180,
    layerThicknesses: [36, 36, 36, 36, 36],
    layerGrades: ['C24L', 'C16T', 'C24L', 'C16T', 'C24L'],
    weightKgM2: 85.6,
    thermalConductivity: 0.104,
    charringRate: 0.64,
    bendingStiffnessEI: 3800,
    shearStiffnessGA: 13.8,
  },
  'CLT 200s5': {
    name: 'CLT 200s5',
    layers: 5,
    totalThicknessMm: 200,
    layerThicknesses: [40, 40, 40, 40, 40],
    layerGrades: ['C24L', 'C16T', 'C24L', 'C16T', 'C24L'],
    weightKgM2: 95.2,
    thermalConductivity: 0.104,
    charringRate: 0.64,
    bendingStiffnessEI: 4900,
    shearStiffnessGA: 15.4,
  },
  'CLT 210s7': {
    name: 'CLT 210s7',
    layers: 7,
    totalThicknessMm: 210,
    layerThicknesses: [30, 30, 30, 30, 30, 30, 30],
    layerGrades: ['C24L', 'C16T', 'C24L', 'C16T', 'C24L', 'C16T', 'C24L'],
    weightKgM2: 100.0,
    thermalConductivity: 0.104,
    charringRate: 0.64,
    bendingStiffnessEI: 4500,
    shearStiffnessGA: 16.0,
  },
  'CLT 240s7': {
    name: 'CLT 240s7',
    layers: 7,
    totalThicknessMm: 240,
    layerThicknesses: [34, 34, 34, 34, 34, 34, 34],
    layerGrades: ['C24L', 'C16T', 'C24L', 'C16T', 'C24L', 'C16T', 'C24L'],
    weightKgM2: 114.2,
    thermalConductivity: 0.104,
    charringRate: 0.64,
    bendingStiffnessEI: 6200,
    shearStiffnessGA: 18.2,
  },
  'CLT 280s7': {
    name: 'CLT 280s7',
    layers: 7,
    totalThicknessMm: 280,
    layerThicknesses: [40, 40, 40, 40, 40, 40, 40],
    layerGrades: ['C24L', 'C16T', 'C24L', 'C16T', 'C24L', 'C16T', 'C24L'],
    weightKgM2: 133.2,
    thermalConductivity: 0.104,
    charringRate: 0.64,
    bendingStiffnessEI: 9400,
    shearStiffnessGA: 21.0,
  },
};

export type GltSectionType =
  | '75x160'
  | '75x220'
  | '75x300'
  | '100x360'
  | '100x440'
  | '100x500'
  | '115x360'
  | '115x500'
  | '135x390'
  | '135x500'
  | '135x640'
  | '185x610'
  | '185x840'
  | '185x1000'
  | '185x185'; // Columna

export interface GltBeamItem {
  id: string;
  name: string;
  section: GltSectionType;
  widthMm: number;
  heightMm: number;
  lengthM: number;
  grade: 'mle24h' | 'mle24c' | 'mle20h';
  storyLevel: number;
  startX: number; // m
  startY: number; // m
  endX: number; // m
  endY: number; // m
  elevationZ: number; // m
  isColumn?: boolean;
}

export interface CltOpening {
  id: string;
  type: 'window' | 'door';
  wallId: string;
  storyLevel: number;
  widthCm: number;
  heightCm: number;
  sillHeightCm: number;
  offsetFromStartCm: number;
  openingMethod: 'cut_out' | 'segmented';
  frameMaterial: 'pvc_antracita' | 'madera_masiva' | 'aluminio_rtt';
  glazing: 'termopanel_dvp' | 'triple_vidrio_pasivo';
}

export interface CltWallSegment {
  id: string;
  code: string; // ej: "Eje A.1"
  storyLevel: number;
  startX: number; // m
  startY: number; // m
  endX: number; // m
  endY: number; // m
  lengthM: number;
  heightM: number;
  thicknessMm: number;
  cltType: CltPanelType;
  wallType: 'monolithic' | 'segmented' | 'gravitational';
  segmentCount: number;
  panelWidthM: number;
  holdDownModel: 'HHDQ11' | 'HHDQ14' | 'HTT5' | 'RSFJ_Sismico';
  shearAngleModel: 'E20/3' | 'ABR255_P1' | 'ABR255_P9' | 'AE116' | 'ABR9020';
  holdDownCount: number;
  shearAngleCount: number;
  screwCode: 'SD9212' | 'SDCP22700' | 'SDWS' | 'HBS';
  screwSpacingMm: number;
  isInterior?: boolean;
}

export type ChileanThermalZone = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';

export interface ThermalInsulationConfig {
  claddingSystem: 'weber_eifs_60' | 'weber_eifs_80' | 'weber_eifs_100' | 'volcanboard_madera_8' | 'ventilada_madera';
  insulationThicknessMm: number;
  hasWaterproofMembrane: boolean;
  hasInteriorPlasterboard: boolean;
  plasterboardThicknessMm: number;
  selectedZone: ChileanThermalZone;
}

export type ConstructionSystemVariant = 'plataforma' | 'balloon' | 'hibrido_glt_clt';

export interface CltHouseState {
  // Configuración general del proyecto
  projectName: string;
  buildingType: 'casa_2p' | 'edificio_3p' | 'casa_140m2' | 'personalizado';
  constructionVariant: ConstructionSystemVariant;
  numStories: number;
  storyHeightM: number;
  slabThicknessMm: number;
  roofPitchDeg: number;
  overhangLengthCm: number;
  
  // Dimensiones en metros de la envolvente base
  widthM: number;
  lengthM: number;

  // Paneles de piso y techumbre
  slabCltType: CltPanelType;
  roofCltType: CltPanelType;
  wallCltType: CltPanelType;

  // Listados BIM
  walls: CltWallSegment[];
  beams: GltBeamItem[];
  openings: CltOpening[];

  // Configuración térmica y zona NCh853
  thermalConfig: ThermalInsulationConfig;

  // Configuración sísmica NCh433 / DS61
  seismicZone: 1 | 2 | 3;
  soilType: 'A' | 'B' | 'C' | 'D' | 'E';
  importanceFactor: number; // I = 1.0 (Normal) o 1.2

  // Visualización 3D y secuencias
  viewMode: '3d' | '2d';
  renderStyle: 'architectural' | 'structural_xray' | 'connectors' | 'assembly_sequence';
  currentAssemblyStep: number; // 0 to 6
  showRoof: boolean;
  showUpperFloors: boolean;
  activeStoryLevel: number; // 1, 2, 3...
  showDimensions3D: boolean;
  showPiersLabels: boolean;

  // Métodos de mutación
  setDimensions: (widthM: number, lengthM: number, storyHeightM?: number) => void;
  setNumStories: (stories: number) => void;
  setConstructionVariant: (variant: ConstructionSystemVariant) => void;
  setWallCltType: (type: CltPanelType) => void;
  setSlabCltType: (type: CltPanelType) => void;
  setRoofCltType: (type: CltPanelType) => void;
  setThermalZone: (zone: ChileanThermalZone) => void;
  setCladdingSystem: (system: ThermalInsulationConfig['claddingSystem']) => void;
  setSeismicParams: (zone: 1 | 2 | 3, soil: 'A' | 'B' | 'C' | 'D' | 'E') => void;
  
  // Operaciones de muros y vanos
  addOpening: (opening: Omit<CltOpening, 'id'>) => void;
  removeOpening: (id: string) => void;
  updateOpening: (id: string, updates: Partial<CltOpening>) => void;
  
  // Presets
  loadPreset: (preset: 'casa_niuform_2p' | 'edificio_ds49_3p' | 'casa_glt_clt_140') => void;
  resetToDefault: () => void;

  // Controles de visualización
  setViewMode: (mode: '3d' | '2d') => void;
  setRenderStyle: (style: 'architectural' | 'structural_xray' | 'connectors' | 'assembly_sequence') => void;
  setCurrentAssemblyStep: (step: number) => void;
  setShowRoof: (show: boolean) => void;
  setShowUpperFloors: (show: boolean) => void;
  setActiveStoryLevel: (level: number) => void;
  setShowDimensions3D: (show: boolean) => void;
  setShowPiersLabels: (show: boolean) => void;
}

// Generador de muros perimetrales e interiores
function generateWallsForBuilding(
  width: number,
  length: number,
  stories: number,
  storyHeight: number,
  cltType: CltPanelType
): CltWallSegment[] {
  const spec = CLT_SPECS_CATALOG[cltType];
  const walls: CltWallSegment[] = [];

  for (let s = 1; s <= stories; s++) {
    // Muro Frontal (Sur) - Segmentado
    walls.push({
      id: `w_front_s${s}`,
      code: `M.Sur-${s}`,
      storyLevel: s,
      startX: 0,
      startY: 0,
      endX: width,
      endY: 0,
      lengthM: width,
      heightM: storyHeight,
      thicknessMm: spec.totalThicknessMm,
      cltType,
      wallType: width > 3.5 ? 'segmented' : 'monolithic',
      segmentCount: Math.max(1, Math.ceil(width / 1.1)),
      panelWidthM: Math.min(1.2, width / Math.max(1, Math.ceil(width / 1.1))),
      holdDownModel: s === 1 ? 'HHDQ14' : 'HHDQ11',
      shearAngleModel: s === 1 ? 'ABR255_P9' : 'ABR255_P1',
      holdDownCount: 2,
      shearAngleCount: Math.max(2, Math.ceil(width / 1.2)),
      screwCode: 'SD9212',
      screwSpacingMm: 50,
      isInterior: false,
    });

    // Muro Posterior (Norte) - Segmentado
    walls.push({
      id: `w_back_s${s}`,
      code: `M.Norte-${s}`,
      storyLevel: s,
      startX: 0,
      startY: length,
      endX: width,
      endY: length,
      lengthM: width,
      heightM: storyHeight,
      thicknessMm: spec.totalThicknessMm,
      cltType,
      wallType: width > 3.5 ? 'segmented' : 'monolithic',
      segmentCount: Math.max(1, Math.ceil(width / 1.1)),
      panelWidthM: Math.min(1.2, width / Math.max(1, Math.ceil(width / 1.1))),
      holdDownModel: s === 1 ? 'HHDQ14' : 'HHDQ11',
      shearAngleModel: s === 1 ? 'ABR255_P9' : 'ABR255_P1',
      holdDownCount: 2,
      shearAngleCount: Math.max(2, Math.ceil(width / 1.2)),
      screwCode: 'SD9212',
      screwSpacingMm: 50,
      isInterior: false,
    });

    // Muro Izquierdo (Oeste) - Monolítico o segmentado
    walls.push({
      id: `w_left_s${s}`,
      code: `M.Oeste-${s}`,
      storyLevel: s,
      startX: 0,
      startY: 0,
      endX: 0,
      endY: length,
      lengthM: length,
      heightM: storyHeight,
      thicknessMm: spec.totalThicknessMm,
      cltType,
      wallType: length > 4.0 ? 'segmented' : 'monolithic',
      segmentCount: Math.max(1, Math.ceil(length / 1.2)),
      panelWidthM: Math.min(1.2, length / Math.max(1, Math.ceil(length / 1.2))),
      holdDownModel: s === 1 ? 'HHDQ14' : 'HHDQ11',
      shearAngleModel: s === 1 ? 'ABR255_P9' : 'ABR255_P1',
      holdDownCount: 2,
      shearAngleCount: Math.max(2, Math.ceil(length / 1.2)),
      screwCode: 'SD9212',
      screwSpacingMm: 50,
      isInterior: false,
    });

    // Muro Derecho (Este)
    walls.push({
      id: `w_right_s${s}`,
      code: `M.Este-${s}`,
      storyLevel: s,
      startX: width,
      startY: 0,
      endX: width,
      endY: length,
      lengthM: length,
      heightM: storyHeight,
      thicknessMm: spec.totalThicknessMm,
      cltType,
      wallType: length > 4.0 ? 'segmented' : 'monolithic',
      segmentCount: Math.max(1, Math.ceil(length / 1.2)),
      panelWidthM: Math.min(1.2, length / Math.max(1, Math.ceil(length / 1.2))),
      holdDownModel: s === 1 ? 'HHDQ14' : 'HHDQ11',
      shearAngleModel: s === 1 ? 'ABR255_P9' : 'ABR255_P1',
      holdDownCount: 2,
      shearAngleCount: Math.max(2, Math.ceil(length / 1.2)),
      screwCode: 'SD9212',
      screwSpacingMm: 50,
      isInterior: false,
    });

    // Muro divisorio central (Eje estructurante)
    if (width >= 5.0) {
      walls.push({
        id: `w_mid_s${s}`,
        code: `M.Central-${s}`,
        storyLevel: s,
        startX: width / 2,
        startY: 0,
        endX: width / 2,
        endY: length,
        lengthM: length,
        heightM: storyHeight,
        thicknessMm: spec.totalThicknessMm,
        cltType,
        wallType: 'monolithic',
        segmentCount: Math.max(1, Math.ceil(length / 1.5)),
        panelWidthM: Math.min(1.2, length / Math.max(1, Math.ceil(length / 1.5))),
        holdDownModel: s === 1 ? 'HHDQ11' : 'HTT5',
        shearAngleModel: 'ABR255_P1',
        holdDownCount: 2,
        shearAngleCount: Math.max(2, Math.ceil(length / 1.5)),
        screwCode: 'SD9212',
        screwSpacingMm: 100,
        isInterior: true,
      });
    }
  }

  return walls;
}

// Preset 1: Casa / Módulo de Capacitación Niuform (2 Pisos)
const PRESET_NIUFORM_2P = {
  projectName: 'Módulo de Capacitación Niuform CLT 2 Pisos',
  buildingType: 'casa_2p' as const,
  constructionVariant: 'plataforma' as const,
  numStories: 2,
  storyHeightM: 2.4,
  slabThicknessMm: 150,
  roofPitchDeg: 6,
  overhangLengthCm: 45,
  widthM: 4.8,
  lengthM: 6.0,
  wallCltType: 'CLT 90s3' as CltPanelType,
  slabCltType: 'CLT 150s5' as CltPanelType,
  roofCltType: 'CLT 100s3' as CltPanelType,
  thermalConfig: {
    claddingSystem: 'weber_eifs_60' as const,
    insulationThicknessMm: 60,
    hasWaterproofMembrane: true,
    hasInteriorPlasterboard: true,
    plasterboardThicknessMm: 12.5,
    selectedZone: 'C' as ChileanThermalZone,
  },
  seismicZone: 2 as const,
  soilType: 'C' as const,
  importanceFactor: 1.0,
  beams: [
    {
      id: 'beam_glt_1',
      name: 'Viga GLT Dintel Eje Central',
      section: '135x390' as GltSectionType,
      widthMm: 135,
      heightMm: 390,
      lengthM: 4.8,
      grade: 'mle24h' as const,
      storyLevel: 1,
      startX: 0,
      startY: 3.0,
      endX: 4.8,
      endY: 3.0,
      elevationZ: 2.4,
    },
  ],
  openings: [
    {
      id: 'op_p1_door',
      type: 'door' as const,
      wallId: 'w_front_s1',
      storyLevel: 1,
      widthCm: 90,
      heightCm: 210,
      sillHeightCm: 0,
      offsetFromStartCm: 100,
      openingMethod: 'cut_out' as const,
      frameMaterial: 'pvc_antracita' as const,
      glazing: 'termopanel_dvp' as const,
    },
    {
      id: 'op_p1_win1',
      type: 'window' as const,
      wallId: 'w_front_s1',
      storyLevel: 1,
      widthCm: 140,
      heightCm: 120,
      sillHeightCm: 90,
      offsetFromStartCm: 280,
      openingMethod: 'cut_out' as const,
      frameMaterial: 'pvc_antracita' as const,
      glazing: 'termopanel_dvp' as const,
    },
    {
      id: 'op_p2_win1',
      type: 'window' as const,
      wallId: 'w_front_s2',
      storyLevel: 2,
      widthCm: 140,
      heightCm: 120,
      sillHeightCm: 90,
      offsetFromStartCm: 100,
      openingMethod: 'cut_out' as const,
      frameMaterial: 'pvc_antracita' as const,
      glazing: 'termopanel_dvp' as const,
    },
    {
      id: 'op_p2_win2',
      type: 'window' as const,
      wallId: 'w_front_s2',
      storyLevel: 2,
      widthCm: 140,
      heightCm: 120,
      sillHeightCm: 90,
      offsetFromStartCm: 280,
      openingMethod: 'cut_out' as const,
      frameMaterial: 'pvc_antracita' as const,
      glazing: 'termopanel_dvp' as const,
    },
    {
      id: 'op_p1_back_win',
      type: 'window' as const,
      wallId: 'w_back_s1',
      storyLevel: 1,
      widthCm: 180,
      heightCm: 120,
      sillHeightCm: 90,
      offsetFromStartCm: 200,
      openingMethod: 'cut_out' as const,
      frameMaterial: 'pvc_antracita' as const,
      glazing: 'termopanel_dvp' as const,
    },
  ],
};

// Preset 2: Edificio Habitacional DS49 CIM UC - MINVU (3 Pisos)
const PRESET_MINVU_3P = {
  projectName: 'Edificio Residencial DS49 CLT CIM UC (3 Pisos)',
  buildingType: 'edificio_3p' as const,
  constructionVariant: 'plataforma' as const,
  numStories: 3,
  storyHeightM: 2.4,
  slabThicknessMm: 150,
  roofPitchDeg: 4,
  overhangLengthCm: 30,
  widthM: 12.0,
  lengthM: 16.0,
  wallCltType: 'CLT 90s3' as CltPanelType,
  slabCltType: 'CLT 150s5' as CltPanelType,
  roofCltType: 'CLT 130s5' as CltPanelType,
  thermalConfig: {
    claddingSystem: 'weber_eifs_80' as const,
    insulationThicknessMm: 80,
    hasWaterproofMembrane: true,
    hasInteriorPlasterboard: true,
    plasterboardThicknessMm: 15.0,
    selectedZone: 'D' as ChileanThermalZone,
  },
  seismicZone: 2 as const,
  soilType: 'C' as const,
  importanceFactor: 1.0,
  beams: [
    {
      id: 'beam_core_1',
      name: 'Viga GLT Eje Núcleo Escala',
      section: '185x610' as GltSectionType,
      widthMm: 185,
      heightMm: 610,
      lengthM: 6.0,
      grade: 'mle24h' as const,
      storyLevel: 1,
      startX: 6.0,
      startY: 5.0,
      endX: 6.0,
      endY: 11.0,
      elevationZ: 2.4,
    },
    {
      id: 'beam_core_2',
      name: 'Viga GLT Eje Núcleo P2',
      section: '185x610' as GltSectionType,
      widthMm: 185,
      heightMm: 610,
      lengthM: 6.0,
      grade: 'mle24h' as const,
      storyLevel: 2,
      startX: 6.0,
      startY: 5.0,
      endX: 6.0,
      endY: 11.0,
      elevationZ: 4.8,
    },
  ],
  openings: [
    {
      id: 'op_ed_door_1',
      type: 'door' as const,
      wallId: 'w_front_s1',
      storyLevel: 1,
      widthCm: 120,
      heightCm: 220,
      sillHeightCm: 0,
      offsetFromStartCm: 540,
      openingMethod: 'cut_out' as const,
      frameMaterial: 'aluminio_rtt' as const,
      glazing: 'termopanel_dvp' as const,
    },
    {
      id: 'op_ed_win_1',
      type: 'window' as const,
      wallId: 'w_front_s1',
      storyLevel: 1,
      widthCm: 150,
      heightCm: 140,
      sillHeightCm: 80,
      offsetFromStartCm: 150,
      openingMethod: 'segmented' as const,
      frameMaterial: 'pvc_antracita' as const,
      glazing: 'termopanel_dvp' as const,
    },
    {
      id: 'op_ed_win_2',
      type: 'window' as const,
      wallId: 'w_front_s1',
      storyLevel: 1,
      widthCm: 150,
      heightCm: 140,
      sillHeightCm: 80,
      offsetFromStartCm: 900,
      openingMethod: 'segmented' as const,
      frameMaterial: 'pvc_antracita' as const,
      glazing: 'termopanel_dvp' as const,
    },
    {
      id: 'op_ed_win_p2_1',
      type: 'window' as const,
      wallId: 'w_front_s2',
      storyLevel: 2,
      widthCm: 150,
      heightCm: 140,
      sillHeightCm: 80,
      offsetFromStartCm: 150,
      openingMethod: 'segmented' as const,
      frameMaterial: 'pvc_antracita' as const,
      glazing: 'termopanel_dvp' as const,
    },
    {
      id: 'op_ed_win_p2_2',
      type: 'window' as const,
      wallId: 'w_front_s2',
      storyLevel: 2,
      widthCm: 150,
      heightCm: 140,
      sillHeightCm: 80,
      offsetFromStartCm: 900,
      openingMethod: 'segmented' as const,
      frameMaterial: 'pvc_antracita' as const,
      glazing: 'termopanel_dvp' as const,
    },
    {
      id: 'op_ed_win_p3_1',
      type: 'window' as const,
      wallId: 'w_front_s3',
      storyLevel: 3,
      widthCm: 150,
      heightCm: 140,
      sillHeightCm: 80,
      offsetFromStartCm: 150,
      openingMethod: 'segmented' as const,
      frameMaterial: 'pvc_antracita' as const,
      glazing: 'termopanel_dvp' as const,
    },
    {
      id: 'op_ed_win_p3_2',
      type: 'window' as const,
      wallId: 'w_front_s3',
      storyLevel: 3,
      widthCm: 150,
      heightCm: 140,
      sillHeightCm: 80,
      offsetFromStartCm: 900,
      openingMethod: 'segmented' as const,
      frameMaterial: 'pvc_antracita' as const,
      glazing: 'termopanel_dvp' as const,
    },
  ],
};

// Preset 3: Casa Unifamiliar CLT + Pórticos GLT (140 m²)
const PRESET_CASA_GLT_140 = {
  projectName: 'Casa Unifamiliar CLT & Pórticos GLT 140m²',
  buildingType: 'casa_140m2' as const,
  constructionVariant: 'hibrido_glt_clt' as const,
  numStories: 2,
  storyHeightM: 2.6,
  slabThicknessMm: 150,
  roofPitchDeg: 12,
  overhangLengthCm: 60,
  widthM: 8.4,
  lengthM: 10.0,
  wallCltType: 'CLT 100s3' as CltPanelType,
  slabCltType: 'CLT 150s5' as CltPanelType,
  roofCltType: 'CLT 130s5' as CltPanelType,
  thermalConfig: {
    claddingSystem: 'weber_eifs_80' as const,
    insulationThicknessMm: 80,
    hasWaterproofMembrane: true,
    hasInteriorPlasterboard: false, // Madera CLT vista al interior
    plasterboardThicknessMm: 0,
    selectedZone: 'E' as ChileanThermalZone,
  },
  seismicZone: 3 as const,
  soilType: 'C' as const,
  importanceFactor: 1.0,
  beams: [
    {
      id: 'col_glt_1',
      name: 'Columna GLT 185x185 Living',
      section: '185x185' as GltSectionType,
      widthMm: 185,
      heightMm: 185,
      lengthM: 2.6,
      grade: 'mle24h' as const,
      storyLevel: 1,
      startX: 4.2,
      startY: 5.0,
      endX: 4.2,
      endY: 5.0,
      elevationZ: 0,
      isColumn: true,
    },
    {
      id: 'beam_glt_portico',
      name: 'Viga Maestra GLT 185x440',
      section: '100x440' as GltSectionType,
      widthMm: 100,
      heightMm: 440,
      lengthM: 8.4,
      grade: 'mle24h' as const,
      storyLevel: 1,
      startX: 0,
      startY: 5.0,
      endX: 8.4,
      endY: 5.0,
      elevationZ: 2.6,
    },
  ],
  openings: [
    {
      id: 'op_c140_ventanal',
      type: 'door' as const,
      wallId: 'w_front_s1',
      storyLevel: 1,
      widthCm: 280,
      heightCm: 230,
      sillHeightCm: 0,
      offsetFromStartCm: 120,
      openingMethod: 'cut_out' as const,
      frameMaterial: 'aluminio_rtt' as const,
      glazing: 'triple_vidrio_pasivo' as const,
    },
    {
      id: 'op_c140_win_kitchen',
      type: 'window' as const,
      wallId: 'w_front_s1',
      storyLevel: 1,
      widthCm: 160,
      heightCm: 110,
      sillHeightCm: 100,
      offsetFromStartCm: 500,
      openingMethod: 'cut_out' as const,
      frameMaterial: 'pvc_antracita' as const,
      glazing: 'termopanel_dvp' as const,
    },
  ],
};

export const useCltHouseStore = create<CltHouseState>((set, get) => ({
  projectName: PRESET_NIUFORM_2P.projectName,
  buildingType: PRESET_NIUFORM_2P.buildingType,
  constructionVariant: PRESET_NIUFORM_2P.constructionVariant,
  numStories: PRESET_NIUFORM_2P.numStories,
  storyHeightM: PRESET_NIUFORM_2P.storyHeightM,
  slabThicknessMm: PRESET_NIUFORM_2P.slabThicknessMm,
  roofPitchDeg: PRESET_NIUFORM_2P.roofPitchDeg,
  overhangLengthCm: PRESET_NIUFORM_2P.overhangLengthCm,
  widthM: PRESET_NIUFORM_2P.widthM,
  lengthM: PRESET_NIUFORM_2P.lengthM,
  wallCltType: PRESET_NIUFORM_2P.wallCltType,
  slabCltType: PRESET_NIUFORM_2P.slabCltType,
  roofCltType: PRESET_NIUFORM_2P.roofCltType,
  thermalConfig: PRESET_NIUFORM_2P.thermalConfig,
  seismicZone: PRESET_NIUFORM_2P.seismicZone,
  soilType: PRESET_NIUFORM_2P.soilType,
  importanceFactor: PRESET_NIUFORM_2P.importanceFactor,
  beams: PRESET_NIUFORM_2P.beams,
  openings: PRESET_NIUFORM_2P.openings,
  walls: generateWallsForBuilding(
    PRESET_NIUFORM_2P.widthM,
    PRESET_NIUFORM_2P.lengthM,
    PRESET_NIUFORM_2P.numStories,
    PRESET_NIUFORM_2P.storyHeightM,
    PRESET_NIUFORM_2P.wallCltType
  ),

  viewMode: '3d',
  renderStyle: 'architectural',
  currentAssemblyStep: 6,
  showRoof: true,
  showUpperFloors: true,
  activeStoryLevel: 1,
  showDimensions3D: true,
  showPiersLabels: true,

  setDimensions: (widthM, lengthM, storyHeightM) => {
    const s = get();
    const h = storyHeightM !== undefined ? storyHeightM : s.storyHeightM;
    const newWalls = generateWallsForBuilding(widthM, lengthM, s.numStories, h, s.wallCltType);
    set({
      widthM,
      lengthM,
      storyHeightM: h,
      walls: newWalls,
    });
  },

  setNumStories: (stories) => {
    const s = get();
    const newWalls = generateWallsForBuilding(s.widthM, s.lengthM, stories, s.storyHeightM, s.wallCltType);
    set({
      numStories: stories,
      walls: newWalls,
    });
  },

  setConstructionVariant: (variant) => set({ constructionVariant: variant }),

  setWallCltType: (type) => {
    const s = get();
    const updatedWalls = s.walls.map((w) => ({
      ...w,
      cltType: type,
      thicknessMm: CLT_SPECS_CATALOG[type].totalThicknessMm,
    }));
    set({ wallCltType: type, walls: updatedWalls });
  },

  setSlabCltType: (type) => set({ slabCltType: type, slabThicknessMm: CLT_SPECS_CATALOG[type].totalThicknessMm }),
  setRoofCltType: (type) => set({ roofCltType: type }),

  setThermalZone: (zone) =>
    set((state) => ({
      thermalConfig: {
        ...state.thermalConfig,
        selectedZone: zone,
      },
    })),

  setCladdingSystem: (system) => {
    let thickness = 60;
    if (system === 'weber_eifs_80') thickness = 80;
    if (system === 'weber_eifs_100') thickness = 100;
    if (system === 'volcanboard_madera_8') thickness = 8;
    set((state) => ({
      thermalConfig: {
        ...state.thermalConfig,
        claddingSystem: system,
        insulationThicknessMm: thickness,
      },
    }));
  },

  setSeismicParams: (zone, soil) => set({ seismicZone: zone, soilType: soil }),

  addOpening: (openingData) => {
    const newId = `op_${Date.now()}`;
    set((state) => ({
      openings: [...state.openings, { ...openingData, id: newId }],
    }));
  },

  removeOpening: (id) =>
    set((state) => ({
      openings: state.openings.filter((o) => o.id !== id),
    })),

  updateOpening: (id, updates) =>
    set((state) => ({
      openings: state.openings.map((o) => (o.id === id ? { ...o, ...updates } : o)),
    })),

  loadPreset: (presetKey) => {
    if (presetKey === 'casa_niuform_2p') {
      set({
        projectName: PRESET_NIUFORM_2P.projectName,
        buildingType: PRESET_NIUFORM_2P.buildingType,
        constructionVariant: PRESET_NIUFORM_2P.constructionVariant,
        numStories: PRESET_NIUFORM_2P.numStories,
        storyHeightM: PRESET_NIUFORM_2P.storyHeightM,
        slabThicknessMm: PRESET_NIUFORM_2P.slabThicknessMm,
        roofPitchDeg: PRESET_NIUFORM_2P.roofPitchDeg,
        overhangLengthCm: PRESET_NIUFORM_2P.overhangLengthCm,
        widthM: PRESET_NIUFORM_2P.widthM,
        lengthM: PRESET_NIUFORM_2P.lengthM,
        wallCltType: PRESET_NIUFORM_2P.wallCltType,
        slabCltType: PRESET_NIUFORM_2P.slabCltType,
        roofCltType: PRESET_NIUFORM_2P.roofCltType,
        thermalConfig: PRESET_NIUFORM_2P.thermalConfig,
        seismicZone: PRESET_NIUFORM_2P.seismicZone,
        soilType: PRESET_NIUFORM_2P.soilType,
        importanceFactor: PRESET_NIUFORM_2P.importanceFactor,
        beams: PRESET_NIUFORM_2P.beams,
        openings: PRESET_NIUFORM_2P.openings,
        walls: generateWallsForBuilding(
          PRESET_NIUFORM_2P.widthM,
          PRESET_NIUFORM_2P.lengthM,
          PRESET_NIUFORM_2P.numStories,
          PRESET_NIUFORM_2P.storyHeightM,
          PRESET_NIUFORM_2P.wallCltType
        ),
      });
    } else if (presetKey === 'edificio_ds49_3p') {
      set({
        projectName: PRESET_MINVU_3P.projectName,
        buildingType: PRESET_MINVU_3P.buildingType,
        constructionVariant: PRESET_MINVU_3P.constructionVariant,
        numStories: PRESET_MINVU_3P.numStories,
        storyHeightM: PRESET_MINVU_3P.storyHeightM,
        slabThicknessMm: PRESET_MINVU_3P.slabThicknessMm,
        roofPitchDeg: PRESET_MINVU_3P.roofPitchDeg,
        overhangLengthCm: PRESET_MINVU_3P.overhangLengthCm,
        widthM: PRESET_MINVU_3P.widthM,
        lengthM: PRESET_MINVU_3P.lengthM,
        wallCltType: PRESET_MINVU_3P.wallCltType,
        slabCltType: PRESET_MINVU_3P.slabCltType,
        roofCltType: PRESET_MINVU_3P.roofCltType,
        thermalConfig: PRESET_MINVU_3P.thermalConfig,
        seismicZone: PRESET_MINVU_3P.seismicZone,
        soilType: PRESET_MINVU_3P.soilType,
        importanceFactor: PRESET_MINVU_3P.importanceFactor,
        beams: PRESET_MINVU_3P.beams,
        openings: PRESET_MINVU_3P.openings,
        walls: generateWallsForBuilding(
          PRESET_MINVU_3P.widthM,
          PRESET_MINVU_3P.lengthM,
          PRESET_MINVU_3P.numStories,
          PRESET_MINVU_3P.storyHeightM,
          PRESET_MINVU_3P.wallCltType
        ),
      });
    } else if (presetKey === 'casa_glt_clt_140') {
      set({
        projectName: PRESET_CASA_GLT_140.projectName,
        buildingType: PRESET_CASA_GLT_140.buildingType,
        constructionVariant: PRESET_CASA_GLT_140.constructionVariant,
        numStories: PRESET_CASA_GLT_140.numStories,
        storyHeightM: PRESET_CASA_GLT_140.storyHeightM,
        slabThicknessMm: PRESET_CASA_GLT_140.slabThicknessMm,
        roofPitchDeg: PRESET_CASA_GLT_140.roofPitchDeg,
        overhangLengthCm: PRESET_CASA_GLT_140.overhangLengthCm,
        widthM: PRESET_CASA_GLT_140.widthM,
        lengthM: PRESET_CASA_GLT_140.lengthM,
        wallCltType: PRESET_CASA_GLT_140.wallCltType,
        slabCltType: PRESET_CASA_GLT_140.slabCltType,
        roofCltType: PRESET_CASA_GLT_140.roofCltType,
        thermalConfig: PRESET_CASA_GLT_140.thermalConfig,
        seismicZone: PRESET_CASA_GLT_140.seismicZone,
        soilType: PRESET_CASA_GLT_140.soilType,
        importanceFactor: PRESET_CASA_GLT_140.importanceFactor,
        beams: PRESET_CASA_GLT_140.beams,
        openings: PRESET_CASA_GLT_140.openings,
        walls: generateWallsForBuilding(
          PRESET_CASA_GLT_140.widthM,
          PRESET_CASA_GLT_140.lengthM,
          PRESET_CASA_GLT_140.numStories,
          PRESET_CASA_GLT_140.storyHeightM,
          PRESET_CASA_GLT_140.wallCltType
        ),
      });
    }
  },

  resetToDefault: () => get().loadPreset('casa_niuform_2p'),

  setViewMode: (mode) => set({ viewMode: mode }),
  setRenderStyle: (style) => set({ renderStyle: style }),
  setCurrentAssemblyStep: (step) => set({ currentAssemblyStep: step }),
  setShowRoof: (show) => set({ showRoof: show }),
  setShowUpperFloors: (show) => set({ showUpperFloors: show }),
  setActiveStoryLevel: (level) => set({ activeStoryLevel: level }),
  setShowDimensions3D: (show) => set({ showDimensions3D: show }),
  setShowPiersLabels: (show) => set({ showPiersLabels: show }),
}));
