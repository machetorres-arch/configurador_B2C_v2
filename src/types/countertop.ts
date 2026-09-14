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
  // 1. Cuarzos (18 mm y 20 mm)
  {
    id: 'qs-black-mamba-18',
    code: 'QP_BM22320160',
    name: 'Qstone Cuarzo Black Mamba 18mm',
    materialType: 'quarzo',
    thicknessMm: 18,
    priceM2Clp: 338859,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#1C1C1E',
    finish: 'Pulido Seda',
    description: 'Cuarzo de alta densidad fondo negro profundo 18mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-pure-white-18',
    code: 'QP_PW21320160',
    name: 'Qstone Cuarzo Pure White 18mm',
    materialType: 'quarzo',
    thicknessMm: 18,
    priceM2Clp: 339818,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#FFFFFF',
    finish: 'Pulido Seda',
    description: 'Cuarzo blanco puro de grano extra fino 18mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-salt-pool-18',
    code: 'QP_SL21320160',
    name: 'Qstone Cuarzo Salt Pool 18mm',
    materialType: 'quarzo',
    thicknessMm: 18,
    priceM2Clp: 311978,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#EAECEE',
    finish: 'Pulido Seda',
    description: 'Cuarzo blanco con sutiles microcristales salinos 18mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-sand-20',
    code: 'QP_SA31320160',
    name: 'Qstone Cuarzo Sand 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 353264,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#DDD5C7',
    finish: 'Suede / Mate',
    description: 'Tono arena cálido natural 20mm textura suave. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-snow-powder-18',
    code: 'QP_SP21320160',
    name: 'Qstone Cuarzo Snow Powder 18mm',
    materialType: 'quarzo',
    thicknessMm: 18,
    priceM2Clp: 321574,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#F5F5F7',
    finish: 'Pulido Seda',
    description: 'Blanco nevado con textura translúcida 18mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-snow-powder-20',
    code: 'QP_SP31320160',
    name: 'Qstone Cuarzo Snow Powder 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 347495,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#F5F5F7',
    finish: 'Pulido Seda',
    description: 'Blanco nevado con textura translúcida 20mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-white-mamba-18',
    code: 'QP_WM21320160',
    name: 'Qstone Cuarzo White Mamba 18mm',
    materialType: 'quarzo',
    thicknessMm: 18,
    priceM2Clp: 327343,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#F0F2F5',
    finish: 'Pulido Brillante',
    description: 'Blanco brillante con vetas dinámicas tipo mamba 18mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-calacatta-gold-20',
    code: 'QP_CO31320160',
    name: 'Qstone Cuarzo Calacatta Gold 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 612315,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#F7F6F2',
    finish: 'Pulido Seda',
    description: 'Fondo blanco cálido con vetas doradas y gris perla 20mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-calacatta-sharp-20',
    code: 'QP_CT31320160',
    name: 'Qstone Cuarzo Calacatta Sharp 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 503981,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#F4F5F8',
    finish: 'Pulido Brillante',
    description: 'Vetas afiladas de alto contraste sobre blanco puro 20mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-concrete-honed-20',
    code: 'QP_CH32320160',
    name: 'Qstone Cuarzo Concrete Honed 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 358285,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#9E9E9E',
    finish: 'Honed / Mate',
    description: 'Textura hormigón arquitectónico pulido mate al agua 20mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-calacatta-aosta-20',
    code: 'QP_CF31320160',
    name: 'Qstone Cuarzo Calacatta Aosta 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 594988,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#F3F4F6',
    finish: 'Pulido Seda',
    description: 'Veteado alpino tipo valle de Aosta de gran movimiento 20mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-calacatta-stratus-20',
    code: 'QP_CR31320160',
    name: 'Qstone Cuarzo Calacatta Stratus 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 510990,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#EEF0F2',
    finish: 'Pulido Seda',
    description: 'Patrón estratificado nebuloso de mármol blanco y gris 20mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-dark-grey-20',
    code: 'QP_DG31320160',
    name: 'Qstone Cuarzo Dark Grey 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 359022,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#424242',
    finish: 'Suede / Mate',
    description: 'Gris oscuro profundo arquitectónico con microtextura 20mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-imperium-polished-20',
    code: 'QP_IP31320160',
    name: 'Qstone Cuarzo Imperium Polished 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 485737,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#2E2D32',
    finish: 'Pulido Alto Brillo',
    description: 'Negro imperial pulido con destellos minerales 20mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-cool-street-20',
    code: 'QP_CS32320160',
    name: 'Qstone Cuarzo Cool Street 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 328303,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#B0BEC5',
    finish: 'Suede / Mate',
    description: 'Gris urbano frío contemporáneo industrial 20mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-cotton-diamond-20',
    code: 'QP_CD31320160',
    name: 'Qstone Cuarzo Cotton Diamond 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 359982,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#FAFAFB',
    finish: 'Pulido Seda',
    description: 'Blanco algodón puro con destellos diamantados 20mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-cotton-diamond-18',
    code: 'QP_CD21320160',
    name: 'Qstone Cuarzo Cotton Diamond 18mm',
    materialType: 'quarzo',
    thicknessMm: 18,
    priceM2Clp: 352842,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#FAFAFB',
    finish: 'Pulido Seda',
    description: 'Blanco algodón puro con destellos diamantados 18mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-onix-20',
    code: 'QP_ON32320161',
    name: 'Qstone Cuarzo Onix 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 455978,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#E0D7C6',
    finish: 'Pulido Translúcido',
    description: 'Efecto ónix ámbar marfil con translucidez mineral 20mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-ash-honed-20',
    code: 'QP_AH32300140',
    name: 'Qstone Cuarzo Ash Honed 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 359022,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#78909C',
    finish: 'Honed / Mate',
    description: 'Ceniza mate apomazado contemporáneo 20mm. Proveedor SYSPROTEC.',
    active: true
  },

  // 2. Piedras Sinterizadas (12 mm)
  {
    id: 'qs-sint-ana-white-12',
    code: 'QP_AN51320160',
    name: 'Qstone Sinterizado Ana White 12mm',
    materialType: 'sinterizado',
    thicknessMm: 12,
    priceM2Clp: 331282,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#FDFEFE',
    finish: 'Satinado Ultra-compacto',
    description: 'Piedra sinterizada blanco satinado ultra homogéneo 12mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-sint-aurota-black-12',
    code: 'QP_AB52320160',
    name: 'Qstone Sinterizado Aurota Black 12mm',
    materialType: 'sinterizado',
    thicknessMm: 12,
    priceM2Clp: 331282,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#18191A',
    finish: 'Satinado Anti-huellas',
    description: 'Negro espacial ultra mate resistente al calor 12mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-sint-deep-indigo-black-12',
    code: 'QP_DP52320160',
    name: 'Qstone Sinterizado Deep Indigo Black 12mm',
    materialType: 'sinterizado',
    thicknessMm: 12,
    priceM2Clp: 331282,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#1A1C23',
    finish: 'Satinado Ultra-compacto',
    description: 'Negro profundo con sutil matiz índigo mineral 12mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-sint-golden-jade-white-12',
    code: 'QP_GJ51320160',
    name: 'Qstone Sinterizado Golden Jade White 12mm',
    materialType: 'sinterizado',
    thicknessMm: 12,
    priceM2Clp: 331282,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#F9F8F3',
    finish: 'Pulido Sedoso',
    description: 'Fondo jade marfil con vetas doradas continuas 12mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-sint-light-clement-grey-12',
    code: 'QP_LG52320160',
    name: 'Qstone Sinterizado Light Clement Grey 12mm',
    materialType: 'sinterizado',
    thicknessMm: 12,
    priceM2Clp: 331282,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#CFD8DC',
    finish: 'Satinado Ultra-compacto',
    description: 'Gris clement claro mineral suave 12mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-sint-light-clement-white-12',
    code: 'QP_LC51320160',
    name: 'Qstone Sinterizado Light Clement White 12mm',
    materialType: 'sinterizado',
    thicknessMm: 12,
    priceM2Clp: 331282,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#F5F7F8',
    finish: 'Satinado Ultra-compacto',
    description: 'Blanco perla clement con textura ultra compacta 12mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-sint-lime-stone-grey-12',
    code: 'QP_LS52320160',
    name: 'Qstone Sinterizado Lime Stone Grey 12mm',
    materialType: 'sinterizado',
    thicknessMm: 12,
    priceM2Clp: 331282,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#90A4AE',
    finish: 'Texturado Piedra Caliza',
    description: 'Piedra caliza gris texturada antibacteriana 12mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-sint-lime-stone-white-12',
    code: 'QP_LI51320160',
    name: 'Qstone Sinterizado Lime Stone White 12mm',
    materialType: 'sinterizado',
    thicknessMm: 12,
    priceM2Clp: 331282,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#F0EFEB',
    finish: 'Texturado Piedra Caliza',
    description: 'Piedra caliza blanca cálida natural 12mm. Proveedor SYSPROTEC.',
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
  extendToWallLeft?: boolean; // Extender cubierta rematando hasta muro/pilar izquierdo
  extendToWallRight?: boolean; // Extender cubierta rematando hasta muro/pilar derecho
  extendToWallMaxGapCm?: number; // Distancia máxima de holgura permitida para llegar al muro/pilar (por defecto 50 cm)
  extendBaseOnly?: boolean; // Solo para muebles adosados a muro (no islas libres por defecto)
}

export const DEFAULT_COUNTERTOP_CONFIG: CountertopConfig = {
  enabled: false,
  provider: 'qstone',
  selectedProductId: 'qs-pure-white-18',
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
  extendToWallLeft: false, // Las cubiertas terminan donde termina el mueble por defecto
  extendToWallRight: false,
  extendToWallMaxGapCm: 50,
  extendBaseOnly: true,
};

export interface IslandBackConfig {
  enabled: boolean;
  materialType: 'decorative' | 'countertop';
  decorativeColor: string;
  decorativeMaterial: 'melamina' | 'hpl';
  heightMode: 'to_floor' | 'with_socle'; // estrictamente 'to_floor' cuando materialType === 'countertop'
  thicknessCm: number;
}

export const DEFAULT_ISLAND_BACK_CONFIG: IslandBackConfig = {
  enabled: false,
  materialType: 'decorative',
  decorativeColor: '#FFFFFF',
  decorativeMaterial: 'melamina',
  heightMode: 'to_floor',
  thicknessCm: 1.8,
};

