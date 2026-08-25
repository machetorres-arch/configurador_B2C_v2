import { create } from 'zustand';

// --- 1. ENUMS Y TIPOS BASE ---
export type FoundationType = 'pilotes_madera' | 'radier_sobrecimiento' | 'platea_fundacion' | 'radier_hormigon';
export type ExteriorCladding = 'zincalum_negro' | 'arratia_microacanalado' | 'madera_tinglada' | 'fibrocemento_gris' | 'panel_sip_visto';
export type RoofCladding = 'zinc_ca8_negro' | 'arratia_microacanalado' | 'teja_asfaltica_negra' | 'panel_sip_visto';
export type InteriorCeiling = 'entablado_pino' | 'yeso_carton_blanco';
export type FlooringType = 'vinilico_spc' | 'porcelanato' | 'radier_pulido';

export type SipCoreType = 'eps_15kg' | 'neopor_18kg' | 'xps_25kg' | 'pur_pir_40kg';
export type SipWallThickness = 75 | 90 | 114 | 162;
export type SipRoofThickness = 114 | 162 | 210;
export type SipFloorThickness = 90 | 114 | 162 | 210;

// --- TIPOS DE TABIQUERÍA Y DISTRIBUCIÓN INTERIOR ---
export type InteriorLayoutPreset =
  | 'open_loft'
  | '1bed_1bath'
  | '2bed_1bath'
  | '2bed_2bath'
  | '3bed_1bath'
  | '3bed_2bath'
  | '4bed_2bath'
  | 'custom';

export type BedroomPlacementStrategy = 'rear' | 'split_wings' | 'side';

export interface InteriorWallOpening {
  id: string;
  type: 'door' | 'pocket_door' | 'opening';
  name: string;
  width: number;           // cm (ej. 70, 80, 90)
  height: number;          // cm (ej. 200, 210)
  offsetAlongWall: number; // cm desde start
}

export interface InteriorWall {
  id: string;
  name: string;
  zone: 'bedroom' | 'bathroom' | 'hallway' | 'living' | 'kitchen' | 'other';
  startX: number; // cm en coords de casa (-width/2 a +width/2)
  startZ: number; // cm en coords de casa (-length/2 a +length/2)
  endX: number;   // cm
  endZ: number;   // cm
  thicknessMm: 90 | 114;
  heightCm?: number;
  openings: InteriorWallOpening[];
  visible: boolean;
}

export interface PresetParams {
  bedroomDepthPercent: number; // 30% a 65% del largo para zona dormitorios
  bathWidthPercent: number;    // 20% a 50% del ancho para baño
  hallwayWidthCm: number;      // 80 a 120 cm
  secondaryBedWidthPercent: number; // 35% a 65%
  placementStrategy: BedroomPlacementStrategy; // 'rear' (fondo), 'split_wings' (alas separadas), 'side' (costado)
  mirrorX: boolean; // Invertir izquierda / derecha (espejar este/oeste)
  mirrorZ: boolean; // Invertir frente / fondo (orientación norte/sur)
  separateKitchen: boolean; // Añadir tabique de cocina cerrada
  includeLivingOffice: boolean; // Convertir/añadir zona home office o sala de estar
}

export interface InteriorZone {
  id: string;
  name: string;
  type: 'living' | 'bedroom' | 'bathroom' | 'kitchen' | 'hallway';
  areaM2: number;
  labelPosition: { x: number; z: number }; // cm
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  color: string;
}

export interface SipCoreProperties {
  name: string;
  densityKgM3: number;
  rValuePerInch: number;
  thermalK_Wm2K_114mm: number;
  fireRating: string;
  description: string;
}

export const SIP_CORE_SPECS: Record<SipCoreType, SipCoreProperties> = {
  eps_15kg: {
    name: 'EPS Estándar (15 kg/m³)',
    densityKgM3: 15,
    rValuePerInch: 3.8,
    thermalK_Wm2K_114mm: 0.28,
    fireRating: 'Clase I / Autoextinguible (Fuego ASTM E84)',
    description: 'Poliestireno expandido de alta densidad 15 kg/m³ adherido con poliuretano de alta resistencia (LP PanelSip / SIPA NER-1038).',
  },
  neopor_18kg: {
    name: 'Neopor® Grafito (18 kg/m³)',
    densityKgM3: 18.5,
    rValuePerInch: 4.7,
    thermalK_Wm2K_114mm: 0.24,
    fireRating: 'Clase I / Ignífugo con aditivo BASF',
    description: 'Poliestireno con partículas de grafito que reflejan la radiación térmica (+20% R-Value sin aumentar espesor).',
  },
  xps_25kg: {
    name: 'XPS Extruido (25 kg/m³)',
    densityKgM3: 25,
    rValuePerInch: 5.0,
    thermalK_Wm2K_114mm: 0.22,
    fireRating: 'Clase I / Alta densidad',
    description: 'Espuma extruida de celdas cerradas, máxima resistencia a compresión mecánica y nula absorción de humedad.',
  },
  pur_pir_40kg: {
    name: 'PUR / PIR Celda Cerrada (40 kg/m³)',
    densityKgM3: 42,
    rValuePerInch: 5.7,
    thermalK_Wm2K_114mm: 0.18,
    fireRating: 'B-s1,d0 (UNE-EN 13501-1 / PIR Ignífugo)',
    description: 'Poliisocianurato inyectado continuo de máxima aislación térmica y comportamiento superior ante el fuego.',
  },
};

// --- 2. VANOS (PUERTAS Y VENTANAS) EN MUROS PARAMÉTRICOS ---
export type WallTarget =
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'wing_front'
  | 'wing_back'
  | 'wing_side'
  | 'wing_inner';

export interface SipOpening {
  id: string;
  type: 'door' | 'window';
  code: string;
  name: string;
  assignedWall: WallTarget;
  width: number;          // cm
  height: number;         // cm
  sillHeight: number;     // cm (antepecho, 0 para puertas)
  offsetAlongWall: number;// cm desde la esquina izquierda del muro
  glazingType?: 'termopanel_dvp' | 'simple_vidrio';
  frameMaterial?: 'pvc_negro' | 'pvc_folio_madera' | 'aluminio_rtt' | 'madera_lenga';
}

// --- 3. TRAZADOS Y REDES MEP ---
export interface SipMepNetwork {
  waterColdPprLinM: number;
  waterHotPexLinM: number;
  waterTerminalPoints: number;
  gasCopperLinM: number;
  gasTerminalPoints: number;
  electricalConduitLinM: number;
  electricalJunctionBoxes: number;
  electricalSwitchesQty: number;
  electricalOutletsQty: number;
  lightingPointsQty: number;
  tdaPanelCapacityAmps: number;
}

// --- 4. TERMINACIONES Y RENDIMIENTOS ---
export interface SipFinishesQuantities {
  exteriorWallAreaM2: number;
  exteriorCladdingSheets: number;
  interiorDryWallAreaM2: number;
  interiorHumidWallAreaM2: number;
  interiorDryWallSheets: number;
  interiorHumidWallSheets: number;
  ceilingAreaM2: number;
  flooringAreaM2: number;
  flooringSpcBoxes: number;
  paintLatexBuckets: number;
  paintWaterEnamelBuckets: number;
  waterproofingGalQty: number;
}

// --- 5. TIPOLOGÍAS Y DIMENSIONES VOLUMÉTRICAS GLOBALES ---
export type HouseShape = 'rectangular' | 'l_shape';
export type RoofStyle = 'gable_valley' | 'single_shed' | 'flat' | 'split_shed';
export type WingCorner = 'front_left' | 'front_right' | 'back_left' | 'back_right';

export interface SipHouseDimensions {
  length: number;       // cm (Largo eje principal L1, ej. 800 cm / 8.0m)
  width: number;        // cm (Ancho crujía principal W1, ej. 450 cm / 4.5m)
  eaveHeight: number;   // cm (Altura al alero / muros laterales, ej. 260 cm / 2.6m)
  ridgeHeight: number;  // cm (Altura a cumbrera techo 2 aguas, ej. 360 cm / 3.6m)
  overhang: number;     // cm (Alero de cubierta, ej. 25 cm)
  // Parámetros Casa en L:
  shape: HouseShape;    // 'rectangular' | 'l_shape'
  wingLength: number;   // cm (Largo ala lateral L2, ej. 420 cm / 4.2m)
  wingWidth: number;    // cm (Ancho crujía ala W2, ej. 360 cm / 3.6m)
  wingCorner: WingCorner;// 'front_left' | 'front_right' | 'back_left' | 'back_right'
  roofStyle: RoofStyle; // 'gable_valley' (2 Aguas con limahoya) | 'split_shed' (Desfasado a desnivel)
}

// --- 6. ESTADO ZUSTAND INTEGRAL ---
export interface SipHouseState {
  dimensions: SipHouseDimensions;
  
  coreType: SipCoreType;
  wallThicknessMm: SipWallThickness;
  roofThicknessMm: SipRoofThickness;
  floorThicknessMm: SipFloorThickness;

  foundationType: FoundationType;
  exteriorCladding: ExteriorCladding;
  roofCladding: RoofCladding;
  interiorCeiling: InteriorCeiling;
  flooringType: FlooringType;
  
  openings: SipOpening[];
  mepNetwork: SipMepNetwork;

  // Distribución de Muros Interiores
  layoutPreset: InteriorLayoutPreset;
  presetParams: PresetParams;
  interiorWalls: InteriorWall[];
  
  // Capas BIM
  layerFoundations: boolean;
  layerFloorSip: boolean;
  layerWallsSip: boolean;
  layerInteriorWalls: boolean;
  layerTimberStructure: boolean;
  layerRoofSip: boolean;
  layerCladding: boolean;
  layerWindowsDoors: boolean;
  layerElectricalMep: boolean;
  layerSanitaryMep: boolean;
  layerGasMep: boolean;

  isTransparent: boolean;
  explodedProgress: number; // 0 por defecto (totalmente armada)

  // Cotas y Niveles de Intensidad Paramétrica (0: Off, 1: Generales, 2: Interiores/Ejes, 3: Vanos, 4: BIM/Paneles SIP)
  showDimensions: boolean;
  dimensionDetailLevel: number; // 1 a 4

  // Acciones
  setDimension: <K extends keyof SipHouseDimensions>(key: K, value: SipHouseDimensions[K]) => void;
  setCoreType: (core: SipCoreType) => void;
  setWallThicknessMm: (t: SipWallThickness) => void;
  setRoofThicknessMm: (t: SipRoofThickness) => void;
  setFloorThicknessMm: (t: SipFloorThickness) => void;
  setFoundationType: (type: FoundationType) => void;
  setExteriorCladding: (clad: ExteriorCladding) => void;
  setRoofCladding: (clad: RoofCladding) => void;
  setInteriorCeiling: (ceil: InteriorCeiling) => void;
  setFlooringType: (floor: FlooringType) => void;
  setIsTransparent: (val: boolean) => void;
  toggleTransparent: () => void;

  setShowDimensions: (show: boolean) => void;
  setDimensionDetailLevel: (level: number) => void;
  toggleDimensions: () => void;
  
  // Acciones de Tabiquería Interior
  setLayoutPreset: (preset: InteriorLayoutPreset) => void;
  setPresetParams: (updates: Partial<PresetParams>) => void;
  toggleInteriorWall: (id: string) => void;
  updateInteriorWall: (id: string, updates: Partial<InteriorWall>) => void;
  addInteriorOpening: (wallId: string, opening: Omit<InteriorWallOpening, 'id'>) => void;
  removeInteriorOpening: (wallId: string, openingId: string) => void;

  // Acciones de Vanos
  addOpening: (opening: Omit<SipOpening, 'id'>) => void;
  removeOpening: (id: string) => void;
  updateOpening: (id: string, updates: Partial<SipOpening>) => void;
  
  // Acciones MEP
  updateMepNetwork: (updates: Partial<SipMepNetwork>) => void;

  toggleLayer: (layer: keyof SipHouseState) => void;
  setExplodedProgress: (val: number) => void;
  resetToDefaultTemplate: () => void;
}

export const DEFAULT_SIP_DIMENSIONS: SipHouseDimensions = {
  length: 600.0,      // 6.00 m
  width: 400.0,       // 4.00 m
  eaveHeight: 260.0,  // 2.60 m
  ridgeHeight: 360.0, // 3.60 m
  overhang: 25.0,     // 0.25 m
  shape: 'rectangular',
  wingLength: 420.0,  // 4.20 m
  wingWidth: 360.0,   // 3.60 m
  wingCorner: 'front_right',
  roofStyle: 'gable_valley',
};

export const DEFAULT_PRESET_PARAMS: PresetParams = {
  bedroomDepthPercent: 48,
  bathWidthPercent: 38,
  hallwayWidthCm: 90,
  secondaryBedWidthPercent: 50,
  placementStrategy: 'rear',
  mirrorX: false,
  mirrorZ: false,
  separateKitchen: false,
  includeLivingOffice: false,
};

export interface LayoutPresetOption {
  id: InteriorLayoutPreset;
  title: string;
  desc: string;
  badge: string;
  icon: string;
  minM2: number;
  minWidthM: number;
  minLengthM: number;
  category: 'compact' | 'medium' | 'large';
  features: string[];
}

export const LAYOUT_PRESETS_CATALOG: LayoutPresetOption[] = [
  {
    id: 'open_loft',
    title: 'Monoambiente / Loft Abierto',
    desc: 'Espacio integrado diáfano sin tabiquería divisoria. Máxima amplitud visual.',
    badge: 'Loft',
    icon: '🏡',
    minM2: 12,
    minWidthM: 3.0,
    minLengthM: 4.0,
    category: 'compact',
    features: ['Estar Integrado', 'Cocina Abierta', 'Iluminación 360°'],
  },
  {
    id: '1bed_1bath',
    title: '1 Dormitorio + 1 Baño',
    desc: 'Dormitorio privado independiente, baño completo y living-cocina americana.',
    badge: '1D / 1B',
    icon: '🛏️',
    minM2: 24,
    minWidthM: 3.5,
    minLengthM: 5.0,
    category: 'compact',
    features: ['Dormitorio Suite', 'Baño Completo', 'Living-Comedor'],
  },
  {
    id: '2bed_1bath',
    title: '2 Dormitorios + 1 Baño',
    desc: 'Dormitorio principal matrimonial, 2do dormitorio (hijos/oficina) y baño central.',
    badge: '2D / 1B',
    icon: '🛌',
    minM2: 38,
    minWidthM: 4.0,
    minLengthM: 6.5,
    category: 'medium',
    features: ['Dormitorio Principal', 'Dormitorio Secundario', 'Baño Compartido'],
  },
  {
    id: '2bed_2bath',
    title: '2 Dormitorios + 2 Baños (Doble Suite)',
    desc: 'Doble suite privada en extremos opuestos con baños independientes y estar central.',
    badge: '2D / 2B Suite',
    icon: '✨',
    minM2: 50,
    minWidthM: 5.0,
    minLengthM: 7.5,
    category: 'medium',
    features: ['2 Suites Privadas', '2 Baños Completos', 'Gran Privacidad Acústica'],
  },
  {
    id: '3bed_1bath',
    title: '3 Dormitorios + 1 Baño + Logia',
    desc: 'Distribución familiar optimizada con 3 dormitorios compactos y zona de servicio.',
    badge: '3D / 1B',
    icon: '👨‍👩‍👧',
    minM2: 60,
    minWidthM: 5.5,
    minLengthM: 8.0,
    category: 'medium',
    features: ['3 Dormitorios', 'Baño Familiar', 'Cocina con Logia'],
  },
  {
    id: '3bed_2bath',
    title: '3 Dormitorios + 2 Baños (Suite + Niños)',
    desc: 'Dormitorio en suite con baño privado, 2 dormitorios de niños y 2do baño completo.',
    badge: '3D / 2B',
    icon: '🏠',
    minM2: 68,
    minWidthM: 6.0,
    minLengthM: 8.5,
    category: 'large',
    features: ['Suite Matrimonial con Baño', '2 Dormitorios Niños', 'Baño Visitas/General'],
  },
  {
    id: '4bed_2bath',
    title: '4 Dormitorios + 2 Baños + Home Office',
    desc: 'Residencia amplia con 4 dormitorios (o 3D + Sala de Estar/Oficina), 2 baños y gran living.',
    badge: '4D / 2B Master',
    icon: '🏰',
    minM2: 90,
    minWidthM: 6.5,
    minLengthM: 10.0,
    category: 'large',
    features: ['Suite Principal', '3 Dormitorios/Estar', '2 Baños Completos', 'Espacio Multiuso'],
  },
];

/**
 * Retorna las tipologías desbloqueadas según las dimensiones reales de la vivienda
 */
export function getAvailablePresetsForDimensions(dimensions: SipHouseDimensions): LayoutPresetOption[] {
  const m2 = (dimensions.width * dimensions.length) / 10000;
  const widthM = dimensions.width / 100;
  const lengthM = dimensions.length / 100;

  return LAYOUT_PRESETS_CATALOG.filter((preset) => {
    return m2 >= preset.minM2 * 0.88 && widthM >= preset.minWidthM * 0.85 && lengthM >= preset.minLengthM * 0.85;
  });
}

/**
 * Aplica transformaciones de inversión geométrica (espejado X / Z) a un muro interior
 */
function transformWall(
  wall: InteriorWall,
  mirrorX: boolean,
  mirrorZ: boolean
): InteriorWall {
  let { startX, endX, startZ, endZ } = wall;

  if (mirrorX) {
    startX = -startX;
    endX = -endX;
  }
  if (mirrorZ) {
    startZ = -startZ;
    endZ = -endZ;
  }

  // Normalizar para que startX <= endX o startZ <= endZ si corresponde
  const transformedWall: InteriorWall = {
    ...wall,
    startX,
    startZ,
    endX,
    endZ,
  };

  return transformedWall;
}

/**
 * Aplica transformaciones de inversión geométrica a una zona interior
 */
function transformZone(
  zone: InteriorZone,
  mirrorX: boolean,
  mirrorZ: boolean
): InteriorZone {
  let { minX, maxX, minZ, maxZ } = zone.bounds;
  let { x, z } = zone.labelPosition;

  if (mirrorX) {
    const origMinX = minX;
    const origMaxX = maxX;
    minX = -origMaxX;
    maxX = -origMinX;
    x = -x;
  }

  if (mirrorZ) {
    const origMinZ = minZ;
    const origMaxZ = maxZ;
    minZ = -origMaxZ;
    maxZ = -origMinZ;
    z = -z;
  }

  return {
    ...zone,
    bounds: { minX, maxX, minZ, maxZ },
    labelPosition: { x, z },
  };
}

export function generateInteriorWallsForPreset(
  preset: InteriorLayoutPreset,
  dimensions: SipHouseDimensions,
  params: PresetParams = DEFAULT_PRESET_PARAMS,
  wallThicknessMm: SipWallThickness = 114
): InteriorWall[] {
  if (preset === 'open_loft') {
    return [];
  }

  const length = dimensions.length;
  const width = dimensions.width;
  const outerThick = wallThicknessMm / 10; // cm
  const minX = -width / 2 + outerThick;
  const maxX = width / 2 - outerThick;
  const minZ = -length / 2 + outerThick;
  const maxZ = length / 2 - outerThick;
  const usableWidth = maxX - minX;
  const usableLength = maxZ - minZ;
  const eaveH = dimensions.eaveHeight;

  let rawWalls: InteriorWall[] = [];

  const strategy = params.placementStrategy || 'rear';

  // --- ESTRATEGIA ALAS SEPARADAS (SPLIT WINGS) ---
  if (strategy === 'split_wings' && (preset === '2bed_1bath' || preset === '2bed_2bath' || preset === '3bed_2bath' || preset === '4bed_2bath')) {
    const wingW = usableWidth * 0.32;
    const leftWingX = minX + wingW;
    const rightWingX = maxX - wingW;
    const midSplitZ = minZ + usableLength * 0.50;

    // Muro divisorio ala izquierda (Suite / Dormitorio 1)
    rawWalls.push({
      id: 'iw-wing-left-split',
      name: 'Muro Ala Oeste / Suite',
      zone: 'bedroom',
      startX: leftWingX,
      startZ: minZ,
      endX: leftWingX,
      endZ: maxZ,
      thicknessMm: 90,
      heightCm: eaveH,
      visible: true,
      openings: [
        {
          id: 'idoor-wing-left',
          type: 'door',
          name: 'Puerta Ala Oeste',
          width: 80,
          height: 200,
          offsetAlongWall: Math.max(20, (maxZ - minZ) * 0.4),
        },
      ],
    });

    // Muro divisorio ala derecha (Dormitorios 2 y 3)
    rawWalls.push({
      id: 'iw-wing-right-split',
      name: 'Muro Ala Este / Dormitorios',
      zone: 'bedroom',
      startX: rightWingX,
      startZ: minZ,
      endX: rightWingX,
      endZ: maxZ,
      thicknessMm: 90,
      heightCm: eaveH,
      visible: true,
      openings: [
        {
          id: 'idoor-wing-right',
          type: 'door',
          name: 'Puerta Ala Este',
          width: 80,
          height: 200,
          offsetAlongWall: Math.max(20, (maxZ - minZ) * 0.4),
        },
      ],
    });

    // Subdivisión de baño en suite en ala izquierda
    rawWalls.push({
      id: 'iw-wing-left-bath',
      name: 'Muro Baño Suite Ala Oeste',
      zone: 'bathroom',
      startX: minX,
      startZ: midSplitZ,
      endX: leftWingX,
      endZ: midSplitZ,
      thicknessMm: 90,
      heightCm: eaveH,
      visible: true,
      openings: [
        {
          id: 'idoor-wleft-bath',
          type: 'door',
          name: 'Puerta Baño Suite',
          width: 70,
          height: 200,
          offsetAlongWall: Math.max(15, wingW - 85),
        },
      ],
    });

    // Subdivisión dormitorios / baño en ala derecha
    rawWalls.push({
      id: 'iw-wing-right-divider',
      name: 'Muro Divisorio Ala Este',
      zone: 'bedroom',
      startX: rightWingX,
      startZ: midSplitZ,
      endX: maxX,
      endZ: midSplitZ,
      thicknessMm: 90,
      heightCm: eaveH,
      visible: true,
      openings: [
        {
          id: 'idoor-wright-div',
          type: 'door',
          name: 'Puerta Dormitorio 3',
          width: 75,
          height: 200,
          offsetAlongWall: 20,
        },
      ],
    });
  }
  // --- ESTRATEGIA LATERAL (SIDE) ---
  else if (strategy === 'side' && (preset === '2bed_1bath' || preset === '3bed_1bath' || preset === '3bed_2bath')) {
    const sideW = usableWidth * 0.42;
    const splitX = minX + sideW;
    const splitZ1 = minZ + usableLength * 0.35;
    const splitZ2 = minZ + usableLength * 0.70;

    // Muro longitudinal divisorio social / privado
    rawWalls.push({
      id: 'iw-side-longitudinal',
      name: 'Muro Divisorio Lateral (Social / Dormitorios)',
      zone: 'hallway',
      startX: splitX,
      startZ: minZ,
      endX: splitX,
      endZ: maxZ,
      thicknessMm: 90,
      heightCm: eaveH,
      visible: true,
      openings: [
        {
          id: 'idoor-side-1',
          type: 'door',
          name: 'Puerta Dormitorio 1',
          width: 80,
          height: 200,
          offsetAlongWall: 20,
        },
        {
          id: 'idoor-side-2',
          type: 'door',
          name: 'Puerta Baño Lateral',
          width: 70,
          height: 200,
          offsetAlongWall: Math.max(20, (splitZ2 - minZ) * 0.5),
        },
        {
          id: 'idoor-side-3',
          type: 'door',
          name: 'Puerta Dormitorio 2',
          width: 80,
          height: 200,
          offsetAlongWall: Math.max(20, splitZ2 - minZ + 20),
        },
      ],
    });

    // Divisores transversales del ala lateral
    rawWalls.push({
      id: 'iw-side-trans-1',
      name: 'Muro Dormitorio 1 / Baño',
      zone: 'bedroom',
      startX: minX,
      startZ: splitZ1,
      endX: splitX,
      endZ: splitZ1,
      thicknessMm: 90,
      heightCm: eaveH,
      visible: true,
      openings: [],
    });

    rawWalls.push({
      id: 'iw-side-trans-2',
      name: 'Muro Baño / Dormitorio 2',
      zone: 'bathroom',
      startX: minX,
      startZ: splitZ2,
      endX: splitX,
      endZ: splitZ2,
      thicknessMm: 90,
      heightCm: eaveH,
      visible: true,
      openings: [],
    });
  }
  // --- ESTRATEGIA TRASERA (REAR) / CLÁSICA ---
  else {
    if (preset === '1bed_1bath') {
      const splitZ = minZ + usableLength * (params.bedroomDepthPercent / 100);
      const splitX = minX + usableWidth * (params.bathWidthPercent / 100);

      rawWalls.push({
        id: 'iw-1b-main-split',
        name: 'Muro Divisorio Día/Noche',
        zone: 'bedroom',
        startX: minX,
        startZ: splitZ,
        endX: maxX,
        endZ: splitZ,
        thicknessMm: 90,
        heightCm: eaveH,
        visible: true,
        openings: [
          {
            id: 'idoor-1',
            type: 'door',
            name: 'Puerta Dormitorio Principal',
            width: 80,
            height: 200,
            offsetAlongWall: Math.min(maxX - minX - 100, Math.max(20, splitX - minX + 30)),
          },
        ],
      });

      rawWalls.push({
        id: 'iw-1b-bath-split',
        name: 'Muro Divisorio Baño',
        zone: 'bathroom',
        startX: splitX,
        startZ: minZ,
        endX: splitX,
        endZ: splitZ,
        thicknessMm: 90,
        heightCm: eaveH,
        visible: true,
        openings: [
          {
            id: 'idoor-2',
            type: 'door',
            name: 'Puerta Baño',
            width: 70,
            height: 200,
            offsetAlongWall: Math.max(15, splitZ - minZ - 85),
          },
        ],
      });
    } else if (preset === '2bed_1bath') {
      const splitZ = minZ + usableLength * (params.bedroomDepthPercent / 100);
      const bathW = usableWidth * (params.bathWidthPercent / 100);
      const splitX1 = minX + bathW;
      const splitX2 = splitX1 + (usableWidth - bathW) * (params.secondaryBedWidthPercent / 100);

      rawWalls.push({
        id: 'iw-2b-main-split',
        name: 'Muro Divisorio Estar / Zona Privada',
        zone: 'hallway',
        startX: minX,
        startZ: splitZ,
        endX: maxX,
        endZ: splitZ,
        thicknessMm: 90,
        heightCm: eaveH,
        visible: true,
        openings: [
          {
            id: 'idoor-d1',
            type: 'door',
            name: 'Puerta Dormitorio 1',
            width: 80,
            height: 200,
            offsetAlongWall: Math.max(15, splitX1 - minX + 15),
          },
          {
            id: 'idoor-d2',
            type: 'door',
            name: 'Puerta Dormitorio 2',
            width: 80,
            height: 200,
            offsetAlongWall: Math.max(15, splitX2 - minX + 15),
          },
        ],
      });

      rawWalls.push({
        id: 'iw-2b-bath-wall',
        name: 'Muro Baño / Dormitorio 1',
        zone: 'bathroom',
        startX: splitX1,
        startZ: minZ,
        endX: splitX1,
        endZ: splitZ,
        thicknessMm: 90,
        heightCm: eaveH,
        visible: true,
        openings: [
          {
            id: 'idoor-bath',
            type: 'door',
            name: 'Puerta Baño',
            width: 70,
            height: 200,
            offsetAlongWall: Math.max(15, splitZ - minZ - 85),
          },
        ],
      });

      rawWalls.push({
        id: 'iw-2b-bed-divider',
        name: 'Muro Divisorio Dormitorio 1 / Dormitorio 2',
        zone: 'bedroom',
        startX: splitX2,
        startZ: minZ,
        endX: splitX2,
        endZ: splitZ,
        thicknessMm: 90,
        heightCm: eaveH,
        visible: true,
        openings: [],
      });
    } else if (preset === '2bed_2bath') {
      const splitZ = minZ + usableLength * (params.bedroomDepthPercent / 100);
      const splitX = minX + usableWidth * 0.50;
      const subZ = minZ + (splitZ - minZ) * 0.40;

      rawWalls.push({
        id: 'iw-2b2b-main',
        name: 'Muro Divisorio Principal',
        zone: 'hallway',
        startX: minX,
        startZ: splitZ,
        endX: maxX,
        endZ: splitZ,
        thicknessMm: 90,
        heightCm: eaveH,
        visible: true,
        openings: [
          {
            id: 'idoor-2b2b-1',
            type: 'door',
            name: 'Puerta Suite 1',
            width: 80,
            height: 200,
            offsetAlongWall: 25,
          },
          {
            id: 'idoor-2b2b-2',
            type: 'door',
            name: 'Puerta Suite 2',
            width: 80,
            height: 200,
            offsetAlongWall: Math.max(25, splitX - minX + 25),
          },
        ],
      });

      rawWalls.push({
        id: 'iw-2b2b-center',
        name: 'Muro Divisorio Suites',
        zone: 'bedroom',
        startX: splitX,
        startZ: minZ,
        endX: splitX,
        endZ: splitZ,
        thicknessMm: 90,
        heightCm: eaveH,
        visible: true,
        openings: [],
      });

      // Baños de cada suite
      rawWalls.push({
        id: 'iw-2b2b-bath1',
        name: 'Muro Baño Suite 1',
        zone: 'bathroom',
        startX: minX,
        startZ: subZ,
        endX: splitX,
        endZ: subZ,
        thicknessMm: 90,
        heightCm: eaveH,
        visible: true,
        openings: [
          {
            id: 'idoor-b1',
            type: 'door',
            name: 'Puerta Baño 1',
            width: 70,
            height: 200,
            offsetAlongWall: Math.max(15, splitX - minX - 85),
          },
        ],
      });

      rawWalls.push({
        id: 'iw-2b2b-bath2',
        name: 'Muro Baño Suite 2',
        zone: 'bathroom',
        startX: splitX,
        startZ: subZ,
        endX: maxX,
        endZ: subZ,
        thicknessMm: 90,
        heightCm: eaveH,
        visible: true,
        openings: [
          {
            id: 'idoor-b2',
            type: 'door',
            name: 'Puerta Baño 2',
            width: 70,
            height: 200,
            offsetAlongWall: 15,
          },
        ],
      });
    } else if (preset === '3bed_1bath') {
      const splitZ = minZ + usableLength * Math.max(0.45, params.bedroomDepthPercent / 100);
      const splitX1 = minX + usableWidth * 0.33;
      const splitX2 = minX + usableWidth * 0.66;
      const bathZ = minZ + (splitZ - minZ) * 0.45;

      rawWalls.push({
        id: 'iw-3b1b-main',
        name: 'Muro Divisorio Principal',
        zone: 'hallway',
        startX: minX,
        startZ: splitZ,
        endX: maxX,
        endZ: splitZ,
        thicknessMm: 90,
        heightCm: eaveH,
        visible: true,
        openings: [
          { id: 'id-31-d1', type: 'door', name: 'Puerta Dormitorio 1', width: 80, height: 200, offsetAlongWall: 20 },
          { id: 'id-31-d2', type: 'door', name: 'Puerta Dormitorio 2', width: 80, height: 200, offsetAlongWall: Math.max(20, splitX1 - minX + 20) },
          { id: 'id-31-d3', type: 'door', name: 'Puerta Dormitorio 3', width: 80, height: 200, offsetAlongWall: Math.max(20, splitX2 - minX + 20) },
        ],
      });

      rawWalls.push({
        id: 'iw-3b1b-div1',
        name: 'Muro Divisorio D1/D2',
        zone: 'bedroom',
        startX: splitX1,
        startZ: minZ,
        endX: splitX1,
        endZ: splitZ,
        thicknessMm: 90,
        heightCm: eaveH,
        visible: true,
        openings: [],
      });

      rawWalls.push({
        id: 'iw-3b1b-div2',
        name: 'Muro Divisorio D2/D3',
        zone: 'bedroom',
        startX: splitX2,
        startZ: minZ,
        endX: splitX2,
        endZ: splitZ,
        thicknessMm: 90,
        heightCm: eaveH,
        visible: true,
        openings: [],
      });

      rawWalls.push({
        id: 'iw-3b1b-bath',
        name: 'Muro Baño Familiar Central',
        zone: 'bathroom',
        startX: splitX1,
        startZ: bathZ,
        endX: splitX2,
        endZ: bathZ,
        thicknessMm: 90,
        heightCm: eaveH,
        visible: true,
        openings: [
          { id: 'id-31-bath', type: 'door', name: 'Puerta Baño', width: 70, height: 200, offsetAlongWall: 15 },
        ],
      });
    } else if (preset === '3bed_2bath') {
      const splitZ = minZ + usableLength * Math.max(0.45, params.bedroomDepthPercent / 100);
      const suiteSplitX = minX + usableWidth * 0.40;
      const rightSplitX = suiteSplitX + (usableWidth - (suiteSplitX - minX)) * 0.5;

      rawWalls.push({
        id: 'iw-3b-main',
        name: 'Muro Principal Frente / Noche',
        zone: 'hallway',
        startX: minX,
        startZ: splitZ,
        endX: maxX,
        endZ: splitZ,
        thicknessMm: 90,
        heightCm: eaveH,
        visible: true,
        openings: [
          { id: 'idoor-suite', type: 'door', name: 'Puerta Suite Principal', width: 80, height: 200, offsetAlongWall: 25 },
          { id: 'idoor-bed2', type: 'door', name: 'Puerta Dormitorio 2', width: 80, height: 200, offsetAlongWall: Math.max(15, suiteSplitX - minX + 20) },
          { id: 'idoor-bed3', type: 'door', name: 'Puerta Dormitorio 3', width: 80, height: 200, offsetAlongWall: Math.max(15, rightSplitX - minX + 20) },
        ],
      });

      rawWalls.push({
        id: 'iw-3b-suite-divider',
        name: 'Muro Suite Principal',
        zone: 'bedroom',
        startX: suiteSplitX,
        startZ: minZ,
        endX: suiteSplitX,
        endZ: splitZ,
        thicknessMm: 90,
        heightCm: eaveH,
        visible: true,
        openings: [],
      });

      const suiteBathZ = minZ + (splitZ - minZ) * 0.45;
      rawWalls.push({
        id: 'iw-3b-suite-bath',
        name: 'Muro Baño en Suite',
        zone: 'bathroom',
        startX: minX,
        startZ: suiteBathZ,
        endX: suiteSplitX,
        endZ: suiteBathZ,
        thicknessMm: 90,
        heightCm: eaveH,
        visible: true,
        openings: [
          { id: 'idoor-sbath', type: 'door', name: 'Puerta Baño Suite', width: 70, height: 200, offsetAlongWall: Math.max(15, suiteSplitX - minX - 85) },
        ],
      });

      rawWalls.push({
        id: 'iw-3b-bed23-divider',
        name: 'Muro Divisorio Dormitorio 2 / 3',
        zone: 'bedroom',
        startX: rightSplitX,
        startZ: minZ,
        endX: rightSplitX,
        endZ: splitZ,
        thicknessMm: 90,
        heightCm: eaveH,
        visible: true,
        openings: [],
      });

      const bath2Z = minZ + (splitZ - minZ) * 0.45;
      rawWalls.push({
        id: 'iw-3b-bath2',
        name: 'Muro Baño General',
        zone: 'bathroom',
        startX: suiteSplitX,
        startZ: bath2Z,
        endX: rightSplitX,
        endZ: bath2Z,
        thicknessMm: 90,
        heightCm: eaveH,
        visible: true,
        openings: [
          { id: 'idoor-bath2', type: 'door', name: 'Puerta Baño General', width: 70, height: 200, offsetAlongWall: 15 },
        ],
      });
    } else if (preset === '4bed_2bath') {
      const splitZ = minZ + usableLength * Math.max(0.50, params.bedroomDepthPercent / 100);
      const splitX1 = minX + usableWidth * 0.30;
      const splitX2 = minX + usableWidth * 0.70;
      const subZ = minZ + (splitZ - minZ) * 0.50;

      rawWalls.push({
        id: 'iw-4b-main',
        name: 'Muro Principal Pasillo / Noche',
        zone: 'hallway',
        startX: minX,
        startZ: splitZ,
        endX: maxX,
        endZ: splitZ,
        thicknessMm: 90,
        heightCm: eaveH,
        visible: true,
        openings: [
          { id: 'id-4b-1', type: 'door', name: 'Puerta Suite Master', width: 80, height: 200, offsetAlongWall: 20 },
          { id: 'id-4b-2', type: 'door', name: 'Puerta Dormitorio 2', width: 80, height: 200, offsetAlongWall: Math.max(20, splitX1 - minX + 15) },
          { id: 'id-4b-3', type: 'door', name: 'Puerta Dormitorio 3 / Home Office', width: 80, height: 200, offsetAlongWall: Math.max(20, splitX2 - minX + 15) },
        ],
      });

      rawWalls.push({
        id: 'iw-4b-div1',
        name: 'Muro Suite / Dormitorios Centrales',
        zone: 'bedroom',
        startX: splitX1,
        startZ: minZ,
        endX: splitX1,
        endZ: splitZ,
        thicknessMm: 90,
        heightCm: eaveH,
        visible: true,
        openings: [],
      });

      rawWalls.push({
        id: 'iw-4b-div2',
        name: 'Muro Dormitorio 3 / Dormitorio 4',
        zone: 'bedroom',
        startX: splitX2,
        startZ: minZ,
        endX: splitX2,
        endZ: splitZ,
        thicknessMm: 90,
        heightCm: eaveH,
        visible: true,
        openings: [],
      });

      // Baño suite
      rawWalls.push({
        id: 'iw-4b-bath-suite',
        name: 'Muro Baño Suite',
        zone: 'bathroom',
        startX: minX,
        startZ: subZ,
        endX: splitX1,
        endZ: subZ,
        thicknessMm: 90,
        heightCm: eaveH,
        visible: true,
        openings: [
          { id: 'id-4b-bsuite', type: 'door', name: 'Puerta Baño Suite', width: 70, height: 200, offsetAlongWall: Math.max(15, splitX1 - minX - 85) },
        ],
      });

      // Baño general central y divisor D2/D4
      rawWalls.push({
        id: 'iw-4b-bath-gen',
        name: 'Muro Baño General',
        zone: 'bathroom',
        startX: splitX1,
        startZ: subZ,
        endX: splitX2,
        endZ: subZ,
        thicknessMm: 90,
        heightCm: eaveH,
        visible: true,
        openings: [
          { id: 'id-4b-bgen', type: 'door', name: 'Puerta Baño General', width: 70, height: 200, offsetAlongWall: 15 },
        ],
      });

      rawWalls.push({
        id: 'iw-4b-div-sub',
        name: 'Muro Divisorio Dormitorio 3 / 4',
        zone: 'bedroom',
        startX: splitX2,
        startZ: subZ,
        endX: maxX,
        endZ: subZ,
        thicknessMm: 90,
        heightCm: eaveH,
        visible: true,
        openings: [
          { id: 'id-4b-d4', type: 'door', name: 'Puerta Dormitorio 4', width: 80, height: 200, offsetAlongWall: 20 },
        ],
      });
    }
  }

  // Opciones opcionales: Cocina cerrada
  if (params.separateKitchen) {
    const kitchenZ = minZ + usableLength * 0.78;
    const kitchenX = minX + usableWidth * 0.40;
    rawWalls.push({
      id: 'iw-opt-kitchen',
      name: 'Muro Tabique Cocina Cerrada',
      zone: 'kitchen',
      startX: minX,
      startZ: kitchenZ,
      endX: kitchenX,
      endZ: kitchenZ,
      thicknessMm: 90,
      heightCm: eaveH,
      visible: true,
      openings: [
        { id: 'id-opt-kdoor', type: 'pocket_door', name: 'Puerta Corredera Cocina', width: 80, height: 200, offsetAlongWall: Math.max(15, kitchenX - minX - 95) },
      ],
    });
  }

  // Aplicar transformaciones de orientación (espejado X / Z)
  return rawWalls.map((wall) => transformWall(wall, params.mirrorX, params.mirrorZ));
}

export function getInteriorZones(
  preset: InteriorLayoutPreset,
  dimensions: SipHouseDimensions,
  params: PresetParams = DEFAULT_PRESET_PARAMS
): InteriorZone[] {
  const totalFloorM2 = (dimensions.width * dimensions.length) / 10000;
  const width = dimensions.width;
  const length = dimensions.length;

  const minX = -width / 2;
  const maxX = width / 2;
  const minZ = -length / 2;
  const maxZ = length / 2;

  let rawZones: InteriorZone[] = [];

  if (preset === 'open_loft') {
    rawZones = [
      {
        id: 'z-loft',
        name: 'Espacio Abierto Integrado (Living, Cocina, Dormitorio)',
        type: 'living',
        areaM2: Math.round(totalFloorM2 * 10) / 10,
        labelPosition: { x: 0, z: 0 },
        bounds: { minX, maxX, minZ, maxZ },
        color: '#38bdf8',
      },
    ];
  } else {
    const strategy = params.placementStrategy || 'rear';

    // 1. ESTRATEGIA ALAS SEPARADAS
    if (strategy === 'split_wings') {
      const wingW = width * 0.32;
      const leftWingX = minX + wingW;
      const rightWingX = maxX - wingW;
      const midZ = minZ + length * 0.50;

      const livingArea = Math.round(totalFloorM2 * 0.40 * 10) / 10;
      const suiteArea = Math.round(totalFloorM2 * 0.20 * 10) / 10;
      const bath1Area = Math.round(totalFloorM2 * 0.10 * 10) / 10;
      const bed2Area = Math.round(totalFloorM2 * 0.18 * 10) / 10;
      const bed3Area = Math.round(totalFloorM2 * 0.12 * 10) / 10;

      rawZones = [
        {
          id: 'z-living-center',
          name: 'Living - Comedor Central',
          type: 'living',
          areaM2: livingArea,
          labelPosition: { x: 0, z: 0 },
          bounds: { minX: leftWingX, maxX: rightWingX, minZ, maxZ },
          color: '#38bdf8',
        },
        {
          id: 'z-suite-wing',
          name: 'Suite Master (Ala Oeste)',
          type: 'bedroom',
          areaM2: suiteArea,
          labelPosition: { x: minX + wingW / 2, z: midZ + (maxZ - midZ) / 2 },
          bounds: { minX, maxX: leftWingX, minZ: midZ, maxZ },
          color: '#818cf8',
        },
        {
          id: 'z-bath-wing',
          name: 'Baño Suite (Ala Oeste)',
          type: 'bathroom',
          areaM2: bath1Area,
          labelPosition: { x: minX + wingW / 2, z: minZ + (midZ - minZ) / 2 },
          bounds: { minX, maxX: leftWingX, minZ, maxZ: midZ },
          color: '#34d399',
        },
        {
          id: 'z-bed2-wing',
          name: 'Dormitorio 2 (Ala Este)',
          type: 'bedroom',
          areaM2: bed2Area,
          labelPosition: { x: rightWingX + wingW / 2, z: midZ + (maxZ - midZ) / 2 },
          bounds: { minX: rightWingX, maxX, minZ: midZ, maxZ },
          color: '#a78bfa',
        },
        {
          id: 'z-bed3-wing',
          name: 'Dormitorio 3 / Baño (Ala Este)',
          type: 'bedroom',
          areaM2: bed3Area,
          labelPosition: { x: rightWingX + wingW / 2, z: minZ + (midZ - minZ) / 2 },
          bounds: { minX: rightWingX, maxX, minZ, maxZ: midZ },
          color: '#c084fc',
        },
      ];
    }
    // 2. ESTRATEGIA LATERAL
    else if (strategy === 'side') {
      const sideW = width * 0.42;
      const splitX = minX + sideW;
      const splitZ1 = minZ + length * 0.35;
      const splitZ2 = minZ + length * 0.70;

      const livingArea = Math.round(totalFloorM2 * 0.55 * 10) / 10;
      const bed1Area = Math.round(totalFloorM2 * 0.18 * 10) / 10;
      const bathArea = Math.round(totalFloorM2 * 0.10 * 10) / 10;
      const bed2Area = Math.round(totalFloorM2 * 0.17 * 10) / 10;

      rawZones = [
        {
          id: 'z-living-side',
          name: 'Gran Living - Comedor - Cocina',
          type: 'living',
          areaM2: livingArea,
          labelPosition: { x: splitX + (maxX - splitX) / 2, z: 0 },
          bounds: { minX: splitX, maxX, minZ, maxZ },
          color: '#38bdf8',
        },
        {
          id: 'z-bed1-side',
          name: 'Dormitorio Principal',
          type: 'bedroom',
          areaM2: bed1Area,
          labelPosition: { x: minX + sideW / 2, z: minZ + (splitZ1 - minZ) / 2 },
          bounds: { minX, maxX: splitX, minZ, maxZ: splitZ1 },
          color: '#818cf8',
        },
        {
          id: 'z-bath-side',
          name: 'Baño Completo',
          type: 'bathroom',
          areaM2: bathArea,
          labelPosition: { x: minX + sideW / 2, z: splitZ1 + (splitZ2 - splitZ1) / 2 },
          bounds: { minX, maxX: splitX, minZ: splitZ1, maxZ: splitZ2 },
          color: '#34d399',
        },
        {
          id: 'z-bed2-side',
          name: 'Dormitorio 2 / Visitas',
          type: 'bedroom',
          areaM2: bed2Area,
          labelPosition: { x: minX + sideW / 2, z: splitZ2 + (maxZ - splitZ2) / 2 },
          bounds: { minX, maxX: splitX, minZ: splitZ2, maxZ },
          color: '#a78bfa',
        },
      ];
    }
    // 3. ESTRATEGIA TRASERA / FONDO
    else {
      const nightRatio = params.bedroomDepthPercent / 100;
      const splitZ = minZ + length * nightRatio;

      if (preset === '1bed_1bath') {
        const bathRatio = params.bathWidthPercent / 100;
        const splitX = minX + width * bathRatio;
        const dayArea = Math.round(totalFloorM2 * (1 - nightRatio) * 10) / 10;
        const bathArea = Math.round(totalFloorM2 * nightRatio * bathRatio * 10) / 10;
        const bedArea = Math.round((totalFloorM2 * nightRatio - bathArea) * 10) / 10;

        rawZones = [
          {
            id: 'z-living',
            name: 'Living - Comedor - Cocina',
            type: 'living',
            areaM2: dayArea,
            labelPosition: { x: 0, z: splitZ + (maxZ - splitZ) / 2 },
            bounds: { minX, maxX, minZ: splitZ, maxZ },
            color: '#38bdf8',
          },
          {
            id: 'z-bed1',
            name: 'Dormitorio Principal',
            type: 'bedroom',
            areaM2: bedArea,
            labelPosition: { x: splitX + (maxX - splitX) / 2, z: minZ + (splitZ - minZ) / 2 },
            bounds: { minX: splitX, maxX, minZ, maxZ: splitZ },
            color: '#818cf8',
          },
          {
            id: 'z-bath1',
            name: 'Baño Completo',
            type: 'bathroom',
            areaM2: bathArea,
            labelPosition: { x: minX + (splitX - minX) / 2, z: minZ + (splitZ - minZ) / 2 },
            bounds: { minX, maxX: splitX, minZ, maxZ: splitZ },
            color: '#34d399',
          },
        ];
      } else if (preset === '2bed_1bath') {
        const bathW = width * (params.bathWidthPercent / 100);
        const splitX1 = minX + bathW;
        const splitX2 = splitX1 + (width - bathW) * (params.secondaryBedWidthPercent / 100);
        const nightArea = totalFloorM2 * nightRatio;
        const bathArea = Math.round(nightArea * (bathW / width) * 10) / 10;
        const remainingNight = nightArea - bathArea;
        const bed1Area = Math.round(remainingNight * (params.secondaryBedWidthPercent / 100) * 10) / 10;
        const bed2Area = Math.round((remainingNight - bed1Area) * 10) / 10;
        const dayArea = Math.round(totalFloorM2 * (1 - nightRatio) * 10) / 10;

        rawZones = [
          {
            id: 'z-living',
            name: 'Living - Comedor - Cocina',
            type: 'living',
            areaM2: dayArea,
            labelPosition: { x: 0, z: splitZ + (maxZ - splitZ) / 2 },
            bounds: { minX, maxX, minZ: splitZ, maxZ },
            color: '#38bdf8',
          },
          {
            id: 'z-bed1',
            name: 'Dormitorio 1 (Principal)',
            type: 'bedroom',
            areaM2: bed1Area,
            labelPosition: { x: splitX1 + (splitX2 - splitX1) / 2, z: minZ + (splitZ - minZ) / 2 },
            bounds: { minX: splitX1, maxX: splitX2, minZ, maxZ: splitZ },
            color: '#818cf8',
          },
          {
            id: 'z-bed2',
            name: 'Dormitorio 2',
            type: 'bedroom',
            areaM2: bed2Area,
            labelPosition: { x: splitX2 + (maxX - splitX2) / 2, z: minZ + (splitZ - minZ) / 2 },
            bounds: { minX: splitX2, maxX, minZ, maxZ: splitZ },
            color: '#a78bfa',
          },
          {
            id: 'z-bath',
            name: 'Baño Completo',
            type: 'bathroom',
            areaM2: bathArea,
            labelPosition: { x: minX + (splitX1 - minX) / 2, z: minZ + (splitZ - minZ) / 2 },
            bounds: { minX, maxX: splitX1, minZ, maxZ: splitZ },
            color: '#34d399',
          },
        ];
      } else if (preset === '2bed_2bath') {
        const splitX = minX + width * 0.50;
        const subZ = minZ + (splitZ - minZ) * 0.40;
        const dayArea = Math.round(totalFloorM2 * (1 - nightRatio) * 10) / 10;
        const nightArea = totalFloorM2 * nightRatio;
        const suiteArea = Math.round(nightArea * 0.35 * 10) / 10;
        const bathArea = Math.round(nightArea * 0.15 * 10) / 10;

        rawZones = [
          {
            id: 'z-living',
            name: 'Living - Comedor - Cocina',
            type: 'living',
            areaM2: dayArea,
            labelPosition: { x: 0, z: splitZ + (maxZ - splitZ) / 2 },
            bounds: { minX, maxX, minZ: splitZ, maxZ },
            color: '#38bdf8',
          },
          {
            id: 'z-suite1',
            name: 'Suite 1 (Principal)',
            type: 'bedroom',
            areaM2: suiteArea,
            labelPosition: { x: minX + (splitX - minX) / 2, z: subZ + (splitZ - subZ) / 2 },
            bounds: { minX, maxX: splitX, minZ: subZ, maxZ: splitZ },
            color: '#818cf8',
          },
          {
            id: 'z-bath1',
            name: 'Baño Suite 1',
            type: 'bathroom',
            areaM2: bathArea,
            labelPosition: { x: minX + (splitX - minX) / 2, z: minZ + (subZ - minZ) / 2 },
            bounds: { minX, maxX: splitX, minZ, maxZ: subZ },
            color: '#34d399',
          },
          {
            id: 'z-suite2',
            name: 'Suite 2',
            type: 'bedroom',
            areaM2: suiteArea,
            labelPosition: { x: splitX + (maxX - splitX) / 2, z: subZ + (splitZ - subZ) / 2 },
            bounds: { minX: splitX, maxX, minZ: subZ, maxZ: splitZ },
            color: '#a78bfa',
          },
          {
            id: 'z-bath2',
            name: 'Baño Suite 2',
            type: 'bathroom',
            areaM2: bathArea,
            labelPosition: { x: splitX + (maxX - splitX) / 2, z: minZ + (subZ - minZ) / 2 },
            bounds: { minX: splitX, maxX, minZ, maxZ: subZ },
            color: '#2dd4bf',
          },
        ];
      } else if (preset === '3bed_1bath' || preset === '3bed_2bath') {
        const suiteSplitX = minX + width * 0.40;
        const rightSplitX = suiteSplitX + (width - (suiteSplitX - minX)) * 0.5;
        const subZ = minZ + (splitZ - minZ) * 0.45;

        const dayArea = Math.round(totalFloorM2 * (1 - nightRatio) * 10) / 10;
        const nightArea = totalFloorM2 * nightRatio;
        const bath1Area = Math.round(nightArea * 0.16 * 10) / 10;
        const bath2Area = Math.round(nightArea * 0.16 * 10) / 10;
        const suiteArea = Math.round(nightArea * 0.32 * 10) / 10;
        const bed2Area = Math.round(nightArea * 0.18 * 10) / 10;
        const bed3Area = Math.round((nightArea - bath1Area - bath2Area - suiteArea - bed2Area) * 10) / 10;

        rawZones = [
          {
            id: 'z-living',
            name: 'Living - Comedor - Cocina',
            type: 'living',
            areaM2: dayArea,
            labelPosition: { x: 0, z: splitZ + (maxZ - splitZ) / 2 },
            bounds: { minX, maxX, minZ: splitZ, maxZ },
            color: '#38bdf8',
          },
          {
            id: 'z-suite',
            name: 'Suite Principal',
            type: 'bedroom',
            areaM2: suiteArea,
            labelPosition: { x: minX + (suiteSplitX - minX) / 2, z: subZ + (splitZ - subZ) / 2 },
            bounds: { minX, maxX: suiteSplitX, minZ: subZ, maxZ: splitZ },
            color: '#818cf8',
          },
          {
            id: 'z-sbath',
            name: 'Baño en Suite',
            type: 'bathroom',
            areaM2: bath1Area,
            labelPosition: { x: minX + (suiteSplitX - minX) / 2, z: minZ + (subZ - minZ) / 2 },
            bounds: { minX, maxX: suiteSplitX, minZ, maxZ: subZ },
            color: '#34d399',
          },
          {
            id: 'z-bed2',
            name: 'Dormitorio 2',
            type: 'bedroom',
            areaM2: bed2Area,
            labelPosition: { x: rightSplitX + (maxX - rightSplitX) / 2, z: subZ + (splitZ - subZ) / 2 },
            bounds: { minX: rightSplitX, maxX, minZ: subZ, maxZ: splitZ },
            color: '#a78bfa',
          },
          {
            id: 'z-bed3',
            name: 'Dormitorio 3',
            type: 'bedroom',
            areaM2: bed3Area,
            labelPosition: { x: rightSplitX + (maxX - rightSplitX) / 2, z: minZ + (subZ - minZ) / 2 },
            bounds: { minX: rightSplitX, maxX, minZ, maxZ: subZ },
            color: '#c084fc',
          },
          {
            id: 'z-bath2',
            name: 'Baño General',
            type: 'bathroom',
            areaM2: bath2Area,
            labelPosition: { x: suiteSplitX + (rightSplitX - suiteSplitX) / 2, z: minZ + (subZ - minZ) / 2 },
            bounds: { minX: suiteSplitX, maxX: rightSplitX, minZ, maxZ: subZ },
            color: '#2dd4bf',
          },
        ];
      } else if (preset === '4bed_2bath') {
        const splitX1 = minX + width * 0.30;
        const splitX2 = minX + width * 0.70;
        const subZ = minZ + (splitZ - minZ) * 0.50;

        const dayArea = Math.round(totalFloorM2 * (1 - nightRatio) * 10) / 10;
        const nightArea = totalFloorM2 * nightRatio;

        rawZones = [
          {
            id: 'z-living',
            name: 'Gran Living - Comedor - Cocina',
            type: 'living',
            areaM2: dayArea,
            labelPosition: { x: 0, z: splitZ + (maxZ - splitZ) / 2 },
            bounds: { minX, maxX, minZ: splitZ, maxZ },
            color: '#38bdf8',
          },
          {
            id: 'z-suite-master',
            name: 'Suite Master',
            type: 'bedroom',
            areaM2: Math.round(nightArea * 0.26 * 10) / 10,
            labelPosition: { x: minX + (splitX1 - minX) / 2, z: subZ + (splitZ - subZ) / 2 },
            bounds: { minX, maxX: splitX1, minZ: subZ, maxZ: splitZ },
            color: '#818cf8',
          },
          {
            id: 'z-bath-suite4',
            name: 'Baño Suite Master',
            type: 'bathroom',
            areaM2: Math.round(nightArea * 0.12 * 10) / 10,
            labelPosition: { x: minX + (splitX1 - minX) / 2, z: minZ + (subZ - minZ) / 2 },
            bounds: { minX, maxX: splitX1, minZ, maxZ: subZ },
            color: '#34d399',
          },
          {
            id: 'z-bed2-4b',
            name: 'Dormitorio 2',
            type: 'bedroom',
            areaM2: Math.round(nightArea * 0.18 * 10) / 10,
            labelPosition: { x: splitX1 + (splitX2 - splitX1) / 2, z: subZ + (splitZ - subZ) / 2 },
            bounds: { minX: splitX1, maxX: splitX2, minZ: subZ, maxZ: splitZ },
            color: '#a78bfa',
          },
          {
            id: 'z-bath-gen4',
            name: 'Baño General',
            type: 'bathroom',
            areaM2: Math.round(nightArea * 0.12 * 10) / 10,
            labelPosition: { x: splitX1 + (splitX2 - splitX1) / 2, z: minZ + (subZ - minZ) / 2 },
            bounds: { minX: splitX1, maxX: splitX2, minZ, maxZ: subZ },
            color: '#2dd4bf',
          },
          {
            id: 'z-bed3-4b',
            name: 'Dormitorio 3 / Home Office',
            type: 'bedroom',
            areaM2: Math.round(nightArea * 0.16 * 10) / 10,
            labelPosition: { x: splitX2 + (maxX - splitX2) / 2, z: subZ + (splitZ - subZ) / 2 },
            bounds: { minX: splitX2, maxX, minZ: subZ, maxZ: splitZ },
            color: '#f472b6',
          },
          {
            id: 'z-bed4-4b',
            name: 'Dormitorio 4',
            type: 'bedroom',
            areaM2: Math.round(nightArea * 0.16 * 10) / 10,
            labelPosition: { x: splitX2 + (maxX - splitX2) / 2, z: minZ + (subZ - minZ) / 2 },
            bounds: { minX: splitX2, maxX, minZ, maxZ: subZ },
            color: '#c084fc',
          },
        ];
      }
    }
  }

  return rawZones.map((zone) => transformZone(zone, params.mirrorX, params.mirrorZ));
}

// 1 Puerta principal + 2 Ventanas estándar limpias
export const DEFAULT_SIP_OPENINGS: SipOpening[] = [
  {
    id: 'p1',
    type: 'door',
    code: 'P1',
    name: 'Puerta Principal Lenga 90x210',
    assignedWall: 'front',
    width: 90,
    height: 210,
    sillHeight: 0,
    offsetAlongWall: 60,
    frameMaterial: 'madera_lenga',
  },
  {
    id: 'v1',
    type: 'window',
    code: 'V1',
    name: 'Ventana Living Termopanel 140x120',
    assignedWall: 'front',
    width: 140,
    height: 120,
    sillHeight: 90,
    offsetAlongWall: 200,
    glazingType: 'termopanel_dvp',
    frameMaterial: 'pvc_negro',
  },
  {
    id: 'v2',
    type: 'window',
    code: 'V2',
    name: 'Ventana Lateral 120x100',
    assignedWall: 'left',
    width: 120,
    height: 100,
    sillHeight: 100,
    offsetAlongWall: 240,
    glazingType: 'termopanel_dvp',
    frameMaterial: 'pvc_negro',
  },
];

export const DEFAULT_MEP_NETWORK: SipMepNetwork = {
  waterColdPprLinM: 18.5,
  waterHotPexLinM: 12.0,
  waterTerminalPoints: 5,
  gasCopperLinM: 8.0,
  gasTerminalPoints: 2,
  electricalConduitLinM: 45.0,
  electricalJunctionBoxes: 10,
  electricalSwitchesQty: 6,
  electricalOutletsQty: 12,
  lightingPointsQty: 6,
  tdaPanelCapacityAmps: 25,
};

/**
 * Retorna el largo útil en cm para el muro seleccionado
 */
export function getWallLengthCm(wall: WallTarget, dimensions: SipHouseDimensions): number {
  if (dimensions.shape === 'l_shape') {
    if (wall === 'front') return dimensions.width;
    if (wall === 'back') return dimensions.width;
    if (wall === 'left' || wall === 'right') return Math.max(100, Math.round(dimensions.length - 22.8));
    if (wall === 'wing_front' || wall === 'wing_back') return dimensions.wingWidth;
    if (wall === 'wing_side') return dimensions.wingLength;
    if (wall === 'wing_inner') return dimensions.wingLength;
  }
  if (wall === 'front' || wall === 'back') {
    return dimensions.width;
  }
  return Math.max(100, Math.round(dimensions.length - 22.8));
}

/**
 * Valida y restringe un vano para evitar colisiones con esquinas y otros vanos del mismo muro
 * Siguiendo normativas técnicas SIP (LP PanelSip / Foard Panel / NTA NER-1038):
 * - Distancia mínima a esquina sólida: 30 cm
 * - Altura mínima de dintel portante sobre vano: 30 cm
 * - Longitud máxima de vano estándar sin viga compuesta especial: 244 cm (2.44 m)
 * - Separación mínima entre vanos adyacentes para dobles jambas: 20 cm
 */
export function validateAndConstrainOpening(
  opening: SipOpening,
  allOpenings: SipOpening[],
  dimensions: SipHouseDimensions
): SipOpening {
  const wallLength = getWallLengthCm(opening.assignedWall, dimensions);
  const wallHeight = dimensions.eaveHeight;
  const CORNER_MARGIN = 30; // 30 cm mínimo desde las esquinas según norma SIP (LP/Foard)
  const MIN_BETWEEN = 20;   // 20 cm mínimo entre vanos adyacentes para dobles jambas
  const MIN_W = 40;
  const MAX_W_STANDARD = 244; // 2.44 m largo máximo estándar sin viga compuesta
  const MIN_H = 40;
  const MIN_HEAD = 30;      // 30 cm mínimo de dintel SIP portante sobre el vano

  // 1. Restricción vertical
  let sillHeight = opening.type === 'door' ? 0 : Math.max(15, opening.sillHeight || 15);
  let maxHeight = wallHeight - sillHeight - MIN_HEAD;
  if (maxHeight < MIN_H) {
    if (opening.type === 'door') {
      sillHeight = 0;
      maxHeight = Math.max(MIN_H, wallHeight - MIN_HEAD);
    } else {
      sillHeight = Math.max(15, wallHeight - MIN_H - MIN_HEAD);
      maxHeight = MIN_H;
    }
  }
  const height = Math.min(Math.max(MIN_H, opening.height), maxHeight);

  // 2. Restricción horizontal y detección de colisiones con otros vanos en el mismo muro
  const otherOpenings = allOpenings
    .filter((o) => o.id !== opening.id && o.assignedWall === opening.assignedWall)
    .sort((a, b) => a.offsetAlongWall - b.offsetAlongWall);

  let leftLimit = CORNER_MARGIN;
  let rightLimit = wallLength - CORNER_MARGIN;

  // Determinar los límites izquierdo y derecho según la posición relativa del vano
  for (const other of otherOpenings) {
    const otherStart = other.offsetAlongWall;
    const otherEnd = other.offsetAlongWall + other.width;

    if (opening.offsetAlongWall >= otherEnd - 5) {
      leftLimit = Math.max(leftLimit, otherEnd + MIN_BETWEEN);
    } else if (opening.offsetAlongWall + (opening.width || MIN_W) <= otherStart + 5) {
      rightLimit = Math.min(rightLimit, otherStart - MIN_BETWEEN);
      break;
    }
  }

  // Ancho máximo admisible en el tramo libre disponible
  const maxAvailableW = Math.min(MAX_W_STANDARD, Math.max(MIN_W, rightLimit - leftLimit));
  const width = Math.min(Math.max(MIN_W, opening.width), maxAvailableW);

  // Offset acotado para garantizar no sobreposición ni salida del muro
  const maxOffset = Math.max(leftLimit, rightLimit - width);
  const offsetAlongWall = Math.min(Math.max(leftLimit, opening.offsetAlongWall), maxOffset);

  return {
    ...opening,
    width,
    height,
    sillHeight,
    offsetAlongWall,
  };
}

/**
 * Valida todos los vanos existentes frente a las dimensiones globales
 */
export function validateAllOpenings(openings: SipOpening[], dimensions: SipHouseDimensions): SipOpening[] {
  const result: SipOpening[] = [];
  const walls: WallTarget[] =
    dimensions.shape === 'l_shape'
      ? ['front', 'back', 'left', 'right', 'wing_front', 'wing_back', 'wing_side', 'wing_inner']
      : ['front', 'back', 'left', 'right'];

  for (const wall of walls) {
    const wallOps = openings
      .filter((o) => o.assignedWall === wall)
      .sort((a, b) => a.offsetAlongWall - b.offsetAlongWall);

    for (const op of wallOps) {
      const validated = validateAndConstrainOpening(op, result, dimensions);
      result.push(validated);
    }
  }
  return result;
}

export const useSipHouseStore = create<SipHouseState>((set) => ({
  dimensions: { ...DEFAULT_SIP_DIMENSIONS },

  coreType: 'eps_15kg',
  wallThicknessMm: 114,
  roofThicknessMm: 210,
  floorThicknessMm: 162,

  foundationType: 'pilotes_madera',
  exteriorCladding: 'panel_sip_visto',
  roofCladding: 'panel_sip_visto',
  interiorCeiling: 'entablado_pino',
  flooringType: 'vinilico_spc',

  openings: validateAllOpenings(DEFAULT_SIP_OPENINGS, DEFAULT_SIP_DIMENSIONS),
  mepNetwork: { ...DEFAULT_MEP_NETWORK },

  layoutPreset: '1bed_1bath',
  presetParams: { ...DEFAULT_PRESET_PARAMS },
  interiorWalls: generateInteriorWallsForPreset('1bed_1bath', DEFAULT_SIP_DIMENSIONS, DEFAULT_PRESET_PARAMS, 114),

  layerFoundations: true,
  layerFloorSip: true,
  layerWallsSip: true,
  layerInteriorWalls: true,
  layerTimberStructure: true,
  layerRoofSip: true,
  layerCladding: true,
  layerWindowsDoors: true,
  layerElectricalMep: false,
  layerSanitaryMep: false,
  layerGasMep: false,

  isTransparent: false,
  explodedProgress: 0, // Cerrada y armada por defecto

  showDimensions: true,
  dimensionDetailLevel: 1, // 1: Generales, 2: Interiores/Ejes, 3: Vanos, 4: BIM/Paneles SIP

  setDimension: (key, value) =>
    set((state) => {
      const newDims = {
        ...state.dimensions,
        [key]: typeof value === 'number' ? Math.max(50, Math.min(3000, value)) : value,
      };
      const updatedWalls =
        state.layoutPreset !== 'custom'
          ? generateInteriorWallsForPreset(state.layoutPreset, newDims, state.presetParams, state.wallThicknessMm)
          : state.interiorWalls;

      return {
        dimensions: newDims,
        openings: validateAllOpenings(state.openings, newDims),
        interiorWalls: updatedWalls,
      };
    }),

  setCoreType: (coreType) => set({ coreType }),
  setWallThicknessMm: (wallThicknessMm) =>
    set((state) => ({
      wallThicknessMm,
      interiorWalls:
        state.layoutPreset !== 'custom'
          ? generateInteriorWallsForPreset(state.layoutPreset, state.dimensions, state.presetParams, wallThicknessMm)
          : state.interiorWalls,
    })),
  setRoofThicknessMm: (roofThicknessMm) => set({ roofThicknessMm }),
  setFloorThicknessMm: (floorThicknessMm) => set({ floorThicknessMm }),

  setFoundationType: (foundationType) => set({ foundationType }),
  setExteriorCladding: (exteriorCladding) => set({ exteriorCladding }),
  setRoofCladding: (roofCladding) => set({ roofCladding }),
  setInteriorCeiling: (interiorCeiling) => set({ interiorCeiling }),
  setFlooringType: (flooringType) => set({ flooringType }),

  setLayoutPreset: (preset) =>
    set((state) => ({
      layoutPreset: preset,
      interiorWalls: generateInteriorWallsForPreset(preset, state.dimensions, state.presetParams, state.wallThicknessMm),
    })),

  setPresetParams: (updates) =>
    set((state) => {
      const newParams = { ...state.presetParams, ...updates };
      return {
        presetParams: newParams,
        interiorWalls: generateInteriorWallsForPreset(state.layoutPreset, state.dimensions, newParams, state.wallThicknessMm),
      };
    }),

  toggleInteriorWall: (id) =>
    set((state) => ({
      interiorWalls: state.interiorWalls.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)),
    })),

  updateInteriorWall: (id, updates) =>
    set((state) => ({
      layoutPreset: 'custom',
      interiorWalls: state.interiorWalls.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    })),

  addInteriorOpening: (wallId, opening) =>
    set((state) => ({
      layoutPreset: 'custom',
      interiorWalls: state.interiorWalls.map((w) => {
        if (w.id !== wallId) return w;
        const newOp: InteriorWallOpening = {
          ...opening,
          id: `idoor-${Date.now()}`,
        };
        return {
          ...w,
          openings: [...w.openings, newOp],
        };
      }),
    })),

  removeInteriorOpening: (wallId, openingId) =>
    set((state) => ({
      layoutPreset: 'custom',
      interiorWalls: state.interiorWalls.map((w) => {
        if (w.id !== wallId) return w;
        return {
          ...w,
          openings: w.openings.filter((o) => o.id !== openingId),
        };
      }),
    })),

  addOpening: (opening) =>
    set((state) => {
      const tempId = `op-${Date.now()}`;
      const unvalidated: SipOpening = { ...opening, id: tempId };
      const validated = validateAndConstrainOpening(unvalidated, state.openings, state.dimensions);
      return {
        openings: [...state.openings, validated],
      };
    }),

  removeOpening: (id) =>
    set((state) => ({
      openings: state.openings.filter((o) => o.id !== id),
    })),

  updateOpening: (id, updates) =>
    set((state) => {
      const target = state.openings.find((o) => o.id === id);
      if (!target) return state;

      const merged: SipOpening = { ...target, ...updates };
      const validated = validateAndConstrainOpening(merged, state.openings, state.dimensions);

      return {
        openings: state.openings.map((o) => (o.id === id ? validated : o)),
      };
    }),

  updateMepNetwork: (updates) =>
    set((state) => ({
      mepNetwork: { ...state.mepNetwork, ...updates },
    })),

  toggleLayer: (layer) =>
    set((state) => ({
      [layer]: !state[layer as keyof SipHouseState],
    })),

  setIsTransparent: (isTransparent) => set({ isTransparent }),
  toggleTransparent: () => set((state) => ({ isTransparent: !state.isTransparent })),

  setShowDimensions: (showDimensions) => set({ showDimensions }),
  setDimensionDetailLevel: (dimensionDetailLevel) =>
    set({ dimensionDetailLevel: Math.max(1, Math.min(4, dimensionDetailLevel)) }),
  toggleDimensions: () => set((state) => ({ showDimensions: !state.showDimensions })),

  setExplodedProgress: (explodedProgress) => set({ explodedProgress }),

  resetToDefaultTemplate: () =>
    set({
      dimensions: { ...DEFAULT_SIP_DIMENSIONS },
      coreType: 'eps_15kg',
      wallThicknessMm: 114,
      roofThicknessMm: 210,
      floorThicknessMm: 162,
      foundationType: 'pilotes_madera',
      exteriorCladding: 'panel_sip_visto',
      roofCladding: 'panel_sip_visto',
      interiorCeiling: 'entablado_pino',
      flooringType: 'vinilico_spc',
      openings: validateAllOpenings(DEFAULT_SIP_OPENINGS, DEFAULT_SIP_DIMENSIONS),
      mepNetwork: { ...DEFAULT_MEP_NETWORK },
      layoutPreset: '1bed_1bath',
      presetParams: { ...DEFAULT_PRESET_PARAMS },
      interiorWalls: generateInteriorWallsForPreset('1bed_1bath', DEFAULT_SIP_DIMENSIONS, DEFAULT_PRESET_PARAMS, 114),
      layerFoundations: true,
      layerFloorSip: true,
      layerWallsSip: true,
      layerInteriorWalls: true,
      layerTimberStructure: true,
      layerRoofSip: true,
      layerCladding: true,
      layerWindowsDoors: true,
      layerElectricalMep: false,
      layerSanitaryMep: false,
      layerGasMep: false,
      isTransparent: false,
      explodedProgress: 0,
      showDimensions: true,
      dimensionDetailLevel: 1,
    }),
}));
