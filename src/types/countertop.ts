export type CountertopMaterialType = 'quarzo' | 'sinterizado';

export interface QstoneProductItem {
  id: string;
  code: string;
  name: string;
  materialType: CountertopMaterialType;
  thicknessMm: 12 | 18 | 20;
  priceM2Clp: number;
  sheetWidthMm: number; // 3200
  sheetHeightMm: number; // 1600
  colorHex: string;
  textureUrl?: string;
  finish: string;
  description: string;
  active: boolean;
}

export type BacksplashMode = 'none' | 'standard_5cm' | 'full_height';
export type BuildingType = 'casa' | 'edificio'; // 250 cm vs 200 cm máx por tramo

export type SinkModelId = 'none' | 'alfa_onec_3018' | 'alfa_twoc_f5858a';
export type CooktopModelId = 'none' | 'fdv_design_60' | 'fdv_design_90';

export interface SinkSpec {
  id: SinkModelId;
  name: string;
  brand: string;
  code: string;
  bowls: number;
  material: string;
  overallWidthMm: number;
  overallDepthMm: number;
  overallHeightMm: number;
  cutoutWidthMm: number;
  cutoutDepthMm: number;
  cutoutRadiusMm: number;
  minCabinetWidthCm: number;
  valveDiameterMm: number;
  installation: 'bajocubierta';
  pdfRef: string;
}

export interface CooktopSpec {
  id: CooktopModelId;
  name: string;
  brand: string;
  code: string;
  burners: number;
  material: string;
  productWidthMm: number;
  productDepthMm: number;
  productHeightMm: number;
  cutoutWidthMm: number;
  cutoutDepthMm: number;
  minCabinetWidthCm: number;
  gasType: string;
  pdfRef: string;
}

export const QSTONE_SINKS: Record<SinkModelId, SinkSpec | null> = {
  none: null,
  alfa_onec_3018: {
    id: 'alfa_onec_3018',
    name: 'Lavaplatos ALFA ONEC 3018',
    brand: 'Sysprotec / Qstone',
    code: 'ALFA-ONEC-3018',
    bowls: 1,
    material: 'Acero Inoxidable 304 (1.2mm)',
    overallWidthMm: 775,
    overallDepthMm: 480,
    overallHeightMm: 230,
    cutoutWidthMm: 695,
    cutoutDepthMm: 400,
    cutoutRadiusMm: 15,
    minCabinetWidthCm: 80,
    valveDiameterMm: 90,
    installation: 'bajocubierta',
    pdfRef: 'ALFA ONEC 3018.pdf'
  },
  alfa_twoc_f5858a: {
    id: 'alfa_twoc_f5858a',
    name: 'Lavaplatos ALFA TWOC F5858A',
    brand: 'Sysprotec / Qstone',
    code: 'ALFA-TWOC-F5858A',
    bowls: 2,
    material: 'Acero Inoxidable 304 (1.2mm)',
    overallWidthMm: 810,
    overallDepthMm: 480,
    overallHeightMm: 210,
    cutoutWidthMm: 730,
    cutoutDepthMm: 400,
    cutoutRadiusMm: 15,
    minCabinetWidthCm: 90,
    valveDiameterMm: 90,
    installation: 'bajocubierta',
    pdfRef: 'ALFA TWOC F5858A.pdf'
  }
};

export const FDV_COOKTOPS: Record<CooktopModelId, CooktopSpec | null> = {
  none: null,
  fdv_design_60: {
    id: 'fdv_design_60',
    name: 'Encimera FDV DESIGN 60 2.0',
    brand: 'FDV / Kitchen Center',
    code: '11732-NAT',
    burners: 4,
    material: 'Acero Inox + Fierro Fundido',
    productWidthMm: 580,
    productDepthMm: 500,
    productHeightMm: 85,
    cutoutWidthMm: 550,
    cutoutDepthMm: 470,
    minCabinetWidthCm: 60,
    gasType: 'Gas Licuado / Natural (Triple Corona)',
    pdfRef: 'ENCIMERA DESIGN 60 2.0.pdf'
  },
  fdv_design_90: {
    id: 'fdv_design_90',
    name: 'Encimera FDV DESIGN 90',
    brand: 'FDV / Kitchen Center',
    code: '10042-NAT',
    burners: 5,
    material: 'Acero Inox + Fierro Fundido',
    productWidthMm: 860,
    productDepthMm: 500,
    productHeightMm: 104,
    cutoutWidthMm: 840,
    cutoutDepthMm: 470,
    minCabinetWidthCm: 90,
    gasType: 'Gas Licuado / Natural (5 focos con wok)',
    pdfRef: 'ENCIMERA DESIGN 90.pdf'
  }
};

export const DEFAULT_QSTONE_CATALOG: QstoneProductItem[] = [
  // Cuarzos (18 mm y 20 mm)
  {
    id: 'qs-blanco-estelar-20',
    code: 'QS-BLEST-20',
    name: 'Qstone Blanco Estelar 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 165000,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#F8FAFC',
    finish: 'Pulido Brillante',
    description: 'Cuarzo de alta pureza con destellos micro-espejados 20mm.',
    active: true
  },
  {
    id: 'qs-blanco-nieve-18',
    code: 'QS-BLNIE-18',
    name: 'Qstone Blanco Nieve 18mm',
    materialType: 'quarzo',
    thicknessMm: 18,
    priceM2Clp: 145000,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#FFFFFF',
    finish: 'Pulido Seda',
    description: 'Cuarzo blanco puro homogéneo 18mm de espesor.',
    active: true
  },
  {
    id: 'qs-gris-plomo-20',
    code: 'QS-GRPLO-20',
    name: 'Qstone Gris Plomo 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 158000,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#475569',
    finish: 'Suede / Mate Texturado',
    description: 'Tonalidad grafito contemporánea con microgranos.',
    active: true
  },
  {
    id: 'qs-negro-marquina-20',
    code: 'QS-NEMAR-20',
    name: 'Qstone Negro Marquina 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 175000,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#1E293B',
    finish: 'Pulido Alto Brillo',
    description: 'Fondo negro carbón con vetas blancas estilizadas.',
    active: true
  },
  // Sinterizados (12 mm)
  {
    id: 'qs-sint-calacatta-12',
    code: 'QS-SINT-CAL-12',
    name: 'Qstone Sinterizado Calacatta Gold 12mm',
    materialType: 'sinterizado',
    thicknessMm: 12,
    priceM2Clp: 210000,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#F1F5F9',
    finish: 'Satinado Ultra-compacto',
    description: 'Superficie de piedra sinterizada 12mm resistente al fuego directo y rayas.',
    active: true
  },
  {
    id: 'qs-sint-pietra-grey-12',
    code: 'QS-SINT-PIE-12',
    name: 'Qstone Sinterizado Pietra Grey 12mm',
    materialType: 'sinterizado',
    thicknessMm: 12,
    priceM2Clp: 220000,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#334155',
    finish: 'Sedoso Anti-huellas',
    description: 'Piedra sinterizada gris grafito con sutil veta mineral 12mm.',
    active: true
  },
  {
    id: 'qs-sint-statuario-12',
    code: 'QS-SINT-STA-12',
    name: 'Qstone Sinterizado Statuario 12mm',
    materialType: 'sinterizado',
    thicknessMm: 12,
    priceM2Clp: 235000,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#FAFAFA',
    finish: 'Pulido Sedoso',
    description: 'Elegancia clásica de mármol de Carrara en tecnología sinterizada 12mm.',
    active: true
  }
];

export interface CountertopConfig {
  enabled: boolean;
  provider: 'qstone';
  selectedProductId: string;
  regruesoCm: number; // 0 a 5 cm (0, 1, 2, 3, 4, 5 cm)
  backsplashMode: BacksplashMode;
  backsplashHeightCm: number; // 5 cm por defecto o automático a aéreos
  waterfallLeft: boolean; // Remate lateral cascada al suelo
  waterfallRight: boolean; // Remate lateral cascada al suelo
  islandOverhangCm: number; // 0 a 35 cm (barra desayunadora para pisos)
  buildingType: BuildingType; // 'casa' (250 cm max) | 'edificio' (200 cm max)
  sinkModel: SinkModelId;
  sinkCabinetId: string | null;
  cooktopModel: CooktopModelId;
  cooktopCabinetId: string | null;
}

export const DEFAULT_COUNTERTOP_CONFIG: CountertopConfig = {
  enabled: false,
  provider: 'qstone',
  selectedProductId: 'qs-blanco-estelar-20',
  regruesoCm: 0, // 0 cm = canto simple
  backsplashMode: 'standard_5cm',
  backsplashHeightCm: 5,
  waterfallLeft: false,
  waterfallRight: false,
  islandOverhangCm: 30, // 30 cm para barra isla
  buildingType: 'casa',
  sinkModel: 'none',
  sinkCabinetId: null,
  cooktopModel: 'none',
  cooktopCabinetId: null,
};
