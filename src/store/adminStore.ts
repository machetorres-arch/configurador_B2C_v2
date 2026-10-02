import { create } from 'zustand';
import { getSupabase } from '../lib/supabase';
import { useSupabaseAuthStore } from './supabaseAuthStore';
import { useKitchenStore } from './kitchenStore';

export type ProjectType = 'closet' | 'kitchen' | 'special' | 'hpl-bathroom' | 'office' | 'chair';
export type ProjectStatus = 'designed' | 'quoted' | 'sold' | 'in_production';

export interface ProjectItem {
  id: string;
  name: string;
  client: string;
  date: string;
  type: ProjectType;
  description: string;
  totalCostEstimateClp: number;
  data: any;
  status?: ProjectStatus;
  soldDate?: string;
  finalSalePriceClp?: number;
  orderNumber?: string;
}

export type SupplyCategory = 'melamina' | 'herrajes' | 'cubiertas_qstone' | 'madera' | 'fijaciones_sellantes';

export interface SupplyItem {
  id: string;
  category: SupplyCategory;
  name: string;
  code: string;
  spec: string;
  unit: string;
  priceClp: number;
  supplier: string;
  stockRef?: number;
  notes?: string;
}

export type TextureApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ManufacturingRateConfig {
  manufacturingPricePerM2: number; // Tarifa base de manufactura CLP/m² neto procesado (corte + canteado + mecanizado CNC)
  preAssemblyPricePerCabinet: number; // Tarifa opcional de pre-armado por mueble/módulo
  enablePreAssembly: boolean; // Si el pre-armado en fábrica está activo por defecto
  minifixMachiningPrice: number; // Tarifa opcional de perforación minifix por mueble
  defaultDesignerMarginPercent: number; // Margen comercial sugerido al diseñador/arquitecto (ej: 35%)
}

export const DEFAULT_MANUFACTURING_RATES: ManufacturingRateConfig = {
  manufacturingPricePerM2: 14500, // $14.500 CLP por m² de panel neto (sin mermas)
  preAssemblyPricePerCabinet: 8500, // $8.500 CLP por módulo armado
  enablePreAssembly: false,
  minifixMachiningPrice: 2500,
  defaultDesignerMarginPercent: 35, // 35% de margen comercial sobre costo B2B
};

export interface CustomTextureItem {
  id: string;
  name: string;
  code: string;
  brand: string;
  category: 'maderas' | 'solidos' | 'hpl_autor' | 'piedras_marmoles';
  finish: string;
  sheetFormat: string;
  priceM2Clp: number;
  priceSheetClp: number;
  url: string;
  previewUrl: string;
  active: boolean;
  createdAt: string;
  // Flujo de Proveedores y VB Superadmin
  providerId?: string;
  providerName?: string;
  approvalStatus?: TextureApprovalStatus;
  commissionPercentage?: number;
  providerNetPriceClp?: number;
  rejectionReason?: string;
  // Espesor técnico y medidas métricas de plancha
  thicknessMm?: number;
  sheetWidthM?: number;
  sheetHeightM?: number;
}

export interface ProviderItem {
  id: string;
  name: string;
  rut?: string;
  email: string;
  phone?: string;
  address?: string;
  commissionPercentage: number; // % comisión de Arquify por defecto (ej. 15%)
  active: boolean;
  createdAt: string;
}

export interface AnonymousProjectUsage {
  id: string;
  code: string;
  type: ProjectType;
  date: string;
  productsUsedCount: number;
  matchedProducts: { code: string; name: string; count: number }[];
}

export interface ProviderStats {
  providerName: string;
  totalProjects: number;
  totalProductsUsed: number;
  productsBreakdown: {
    code: string;
    name: string;
    count: number;
    estimatedAreaM2: number;
  }[];
  anonymousProjects: AnonymousProjectUsage[];
}

export interface AdminState {
  // Autenticación
  isAuthenticated: boolean;
  adminEmail: string | null;
  login: (user: string, pass: string) => { success: boolean; error?: string };
  logout: () => void;

  // Modo Claro / Oscuro del Backoffice
  themeMode: 'dark' | 'light';
  setThemeMode: (mode: 'dark' | 'light') => void;
  toggleThemeMode: () => void;

  // Proveedores
  providers: ProviderItem[];
  addProvider: (provider: Omit<ProviderItem, 'id' | 'createdAt'>) => string;
  updateProvider: (id: string, updates: Partial<ProviderItem>) => void;
  deleteProvider: (id: string) => void;

  // Proyectos
  projects: ProjectItem[];
  saveProject: (project: Omit<ProjectItem, 'id' | 'date'>) => string;
  updateProject: (id: string, updates: Partial<ProjectItem>) => void;
  renameProject: (id: string, newName: string, newClient?: string) => void;
  duplicateProject: (id: string) => string;
  deleteProject: (id: string) => void;
  clearAllProjects: () => void;
  syncCloudProjects: () => Promise<void>;

  // Estadísticas Anónimas para Proveedores
  getProviderStats: (providerIdOrName: string) => ProviderStats;

  // Precios de Insumos
  supplies: SupplyItem[];
  updateSupplyPrice: (id: string, newPrice: number) => void;
  updateSupply: (id: string, updates: Partial<SupplyItem>) => void;
  addSupply: (supply: Omit<SupplyItem, 'id'>) => string;
  deleteSupply: (id: string) => void;
  resetSuppliesToDefault: () => void;

  // Texturas y Decorativos
  textures: CustomTextureItem[];
  addTexture: (texture: Omit<CustomTextureItem, 'id' | 'createdAt'>) => string;
  updateTexture: (id: string, updates: Partial<CustomTextureItem>) => void;
  toggleTextureActive: (id: string) => void;
  approveTexture: (id: string) => void;
  rejectTexture: (id: string, reason?: string) => void;
  deleteTexture: (id: string) => void;
  resetTexturesToDefault: () => void;

  // Tarifas de Manufactura B2B
  manufacturingRates: ManufacturingRateConfig;
  updateManufacturingRates: (updates: Partial<ManufacturingRateConfig>) => void;
  resetManufacturingRates: () => void;
}

export const DEFAULT_SUPPLIES: SupplyItem[] = [
  // Melamina y Tableros
  {
    id: 'mel-15-blanco',
    category: 'melamina',
    name: 'Melamina 15mm Blanco Estándar (1.83 x 2.50 m)',
    code: 'TAB-MEL-15-BLA',
    spec: 'Base aglomerado MDP 15 mm, 2 caras melamínicas',
    unit: 'Plancha (4.57 m²)',
    priceClp: 28900,
    supplier: 'Arauco / Masisa',
    stockRef: 120,
    notes: 'Tablero para interiores de módulo y fondos'
  },
  {
    id: 'mel-18-blanco',
    category: 'melamina',
    name: 'Melamina 18mm Blanco Premium (1.83 x 2.50 m)',
    code: 'TAB-MEL-18-BLA',
    spec: 'Aglomerado alta densidad 18 mm, acabado Soft',
    unit: 'Plancha (4.57 m²)',
    priceClp: 34500,
    supplier: 'Arauco / Masisa',
    stockRef: 85,
    notes: 'Estructura principal y laterales de gabinetes'
  },
  {
    id: 'mel-18-diseno',
    category: 'melamina',
    name: 'Melamina 18mm Roble / Madera Diseño (1.83 x 2.50 m)',
    code: 'TAB-MEL-18-ROB',
    spec: 'Diseño sincronizado con textura maderada',
    unit: 'Plancha (4.57 m²)',
    priceClp: 46900,
    supplier: 'Masisa Línea Innova',
    stockRef: 60,
    notes: 'Frentes, puertas y vistas expuestas'
  },
  {
    id: 'hpl-abet-305',
    category: 'melamina',
    name: 'Laminado Alta Presión HPL Abet Laminati (1.30 x 3.05 m)',
    code: 'LAM-HPL-ABET-09',
    spec: 'HPL espesor 0.9 mm de autor para aplacado',
    unit: 'Plancha (3.96 m²)',
    priceClp: 92000,
    supplier: 'Abet Laminati Italia / Provelcar',
    stockRef: 24,
    notes: 'Aplacado en MDF 18 mm con contrabalanceador'
  },

  // Herrajes y Canto
  {
    id: 'canto-pvc-05',
    category: 'herrajes',
    name: 'Tapacanto PVC 0.45 mm x 22 mm',
    code: 'CANTO-PVC-045',
    spec: 'PVC flexible con primer adhesivo hot-melt',
    unit: 'Metro lineal',
    priceClp: 180,
    supplier: 'Provelcar / Rehau',
    stockRef: 2500,
    notes: 'Cantos interiores no expuestos'
  },
  {
    id: 'canto-pvc-20',
    category: 'herrajes',
    name: 'Tapacanto PVC 2.00 mm x 22 mm Anti-Impacto',
    code: 'CANTO-PVC-200',
    spec: 'PVC rígido biselado para frentes y puertas',
    unit: 'Metro lineal',
    priceClp: 620,
    supplier: 'Provelcar / Rehau',
    stockRef: 1200,
    notes: 'Alta durabilidad para frentes de cajón y puertas'
  },
  {
    id: 'bisagra-cierre-suave',
    category: 'herrajes',
    name: 'Bisagra Cazoleta 35mm Cierre Suave Clip-On 110°',
    code: 'HER-BIS-CS-110',
    spec: 'Base 3D de regulación excéntrica y pistón hidráulico',
    unit: 'Par',
    priceClp: 3200,
    supplier: 'DTC / Blum / Häfele',
    stockRef: 300,
    notes: '2 a 4 por puerta según altura'
  },
  {
    id: 'corredera-telescopica-soft',
    category: 'herrajes',
    name: 'Corredera Telescópica 45mm Cierre Suave (500mm)',
    code: 'HER-CORR-TEL-500',
    spec: 'Capacidad de carga 35 kg con amortiguador dual',
    unit: 'Juego (Par)',
    priceClp: 8900,
    supplier: 'DTC / Provelcar',
    stockRef: 150,
    notes: 'Para cajones de cocina y clóset'
  },
  {
    id: 'patas-regulables-100',
    category: 'herrajes',
    name: 'Pata Plástica Regulable H=100-120mm + Clip Zócalo',
    code: 'HER-PATA-REG-100',
    spec: 'Polímero reforzado soporta 150 kg/pata',
    unit: 'Unid.',
    priceClp: 850,
    supplier: 'Häfele / Provelcar',
    stockRef: 400,
    notes: 'Nivelación precisa de gabinetes bajos'
  },
  {
    id: 'conector-minifix',
    category: 'herrajes',
    name: 'Kit Conector Minifix Perno + Caja Rasant 15mm',
    code: 'HER-MINIFIX-15',
    spec: 'Zamac niquelado para unión oculta desmontable',
    unit: 'Kit',
    priceClp: 290,
    supplier: 'Häfele',
    stockRef: 2000,
    notes: 'Ensamble de módulos desarmables'
  },

  // Cubiertas y Marmolería Qstone / SYSPROTEC (Cuarzos & Sinterizados Oficiales)
  {
    id: 'qs-pure-white-18',
    category: 'cubiertas_qstone',
    name: 'Qstone Cuarzo Pure White 18mm',
    code: 'QP_PW21320160',
    spec: 'Cuarzo blanco puro 18mm formato 3.20 x 1.60 m (5.12 m²). Venta c/IVA $339.818 /m²',
    unit: 'm²',
    priceClp: 339818,
    supplier: 'SYSPROTEC (Qstone)',
    stockRef: 40,
    notes: 'Margen Robfu 20% ($56.636 /m²)'
  },
  {
    id: 'qs-black-mamba-18',
    category: 'cubiertas_qstone',
    name: 'Qstone Cuarzo Black Mamba 18mm',
    code: 'QP_BM22320160',
    spec: 'Cuarzo 18mm formato 3.20 x 1.60 m (5.12 m²). Venta c/IVA $338.859 /m² (neto $237.296)',
    unit: 'm²',
    priceClp: 338859,
    supplier: 'SYSPROTEC (Qstone)',
    stockRef: 25,
    notes: 'Margen Robfu 20% ($56.476 /m²)'
  },
  {
    id: 'qs-calacatta-gold-20',
    category: 'cubiertas_qstone',
    name: 'Qstone Cuarzo Calacatta Gold 20mm',
    code: 'QP_CO31320160',
    spec: 'Cuarzo blanco veta dorada 20mm formato 3.20 x 1.60 m (5.12 m²). Venta c/IVA $612.315 /m²',
    unit: 'm²',
    priceClp: 612315,
    supplier: 'SYSPROTEC (Qstone)',
    stockRef: 15,
    notes: 'Margen Robfu 20% ($102.052 /m²)'
  },
  {
    id: 'qs-sand-20',
    category: 'cubiertas_qstone',
    name: 'Qstone Cuarzo Sand 20mm',
    code: 'QP_SA31320160',
    spec: 'Cuarzo tono arena 20mm formato 3.20 x 1.60 m (5.12 m²). Venta c/IVA $353.264 /m²',
    unit: 'm²',
    priceClp: 353264,
    supplier: 'SYSPROTEC (Qstone)',
    stockRef: 20,
    notes: 'Margen Robfu 20% ($58.877 /m²)'
  },
  {
    id: 'qs-sint-ana-white-12',
    category: 'cubiertas_qstone',
    name: 'Qstone Sinterizado Ana White 12mm',
    code: 'QP_AN51320160',
    spec: 'Piedra sinterizada blanco satinado 12mm formato 3.20 x 1.60 m (5.12 m²). Venta c/IVA $331.282 /m²',
    unit: 'm²',
    priceClp: 331282,
    supplier: 'SYSPROTEC (Qstone)',
    stockRef: 15,
    notes: 'Margen Robfu 20% ($55.214 /m²)'
  },
  {
    id: 'qs-sint-aurota-black-12',
    category: 'cubiertas_qstone',
    name: 'Qstone Sinterizado Aurota Black 12mm',
    code: 'QP_AB52320160',
    spec: 'Piedra sinterizada negro mate 12mm formato 3.20 x 1.60 m (5.12 m²). Venta c/IVA $331.282 /m²',
    unit: 'm²',
    priceClp: 331282,
    supplier: 'SYSPROTEC (Qstone)',
    stockRef: 15,
    notes: 'Margen Robfu 20% ($55.214 /m²)'
  },
  {
    id: 'qs-sint-lime-stone-grey-12',
    category: 'cubiertas_qstone',
    name: 'Qstone Sinterizado Lime Stone Grey 12mm',
    code: 'QP_LS52320160',
    spec: 'Piedra sinterizada caliza gris 12mm formato 3.20 x 1.60 m (5.12 m²). Venta c/IVA $331.282 /m²',
    unit: 'm²',
    priceClp: 331282,
    supplier: 'SYSPROTEC (Qstone)',
    stockRef: 15,
    notes: 'Margen Robfu 20% ($55.214 /m²)'
  },
  {
    id: 'qs-canto-pulido',
    category: 'cubiertas_qstone',
    name: 'Mano de Obra: Pulido y Bisel Canto Recto Qstone',
    code: 'QS-CANTO-PUL',
    spec: 'Corte diamantado CNC + pulido de cantos visibles al agua (Kerf 3.5mm)',
    unit: 'Metro Lineal (m)',
    priceClp: 18500,
    supplier: 'Marmolería Especializada',
    stockRef: 999,
    notes: 'Biselado de aristas 2mm anti-desportille'
  },
  {
    id: 'qs-encastre-lavaplatos',
    category: 'cubiertas_qstone',
    name: 'Mano de Obra: Perforación y Encastre Lavaplatos Bajo Cubierta',
    code: 'QS-ENC-LAVA',
    spec: 'Ruteado CNC + pulido interior de perímetro para cubeta bajo cubierta',
    unit: 'Unid.',
    priceClp: 45000,
    supplier: 'Marmolería Especializada',
    stockRef: 999,
    notes: 'Incluye perforación grifería monomando'
  },
  {
    id: 'qs-encastre-encimera',
    category: 'cubiertas_qstone',
    name: 'Mano de Obra: Calado y Perforación para Encimera / Placa de Cocción',
    code: 'QS-ENC-ENCI',
    spec: 'Corte en ángulo recto con esquinas redondeadas R=10mm anti-fisura',
    unit: 'Unid.',
    priceClp: 38000,
    supplier: 'Marmolería Especializada',
    stockRef: 999,
    notes: 'Para encimeras a gas o inducción sobrepuesta'
  },

  // Madera Estructural
  {
    id: 'mad-ipv-2x3',
    category: 'madera',
    name: 'Madera Pino Radiata IPV 2x3" x 3.20m Grado C16 (CCA)',
    code: 'MAD-IPV-2X3-32',
    spec: 'Impregnada CCA según NCh 819 para soleras y pie derechos',
    unit: 'Tira 3.20 m',
    priceClp: 4850,
    supplier: 'CMPC / Arauco',
    stockRef: 350,
    notes: 'Soleras de anclaje panel 90mm'
  },
  {
    id: 'mad-ipv-2x4',
    category: 'madera',
    name: 'Madera Pino Radiata IPV 2x4" x 3.20m Grado C24 Cepillado',
    code: 'MAD-IPV-2X4-32',
    spec: 'Seco en cámara KD 12-15%, impregnado CCA',
    unit: 'Tira 3.20 m',
    priceClp: 7200,
    supplier: 'CMPC / Arauco',
    stockRef: 420,
    notes: 'Llaves de unión y soleras panel 114mm'
  },
  {
    id: 'mad-ipv-2x6',
    category: 'madera',
    name: 'Madera Pino Radiata Estructural 2x6" x 3.20m Grado C24',
    code: 'MAD-IPV-2X6-32',
    spec: 'Seco y calibrado para soleras panel 162mm',
    unit: 'Tira 3.20 m',
    priceClp: 11400,
    supplier: 'CMPC / Arauco',
    stockRef: 180,
    notes: 'Soleras y vanos panel 162mm'
  },
  {
    id: 'viga-lamelada-4x8',
    category: 'madera',
    name: 'Viga Laminada Glulam 4x8" x 6.00m (GL24h)',
    code: 'MAD-GLU-4X8-60',
    spec: 'Adhesivo fenólico exterior calidad vista',
    unit: 'Unid. (6.00 m)',
    priceClp: 74000,
    supplier: 'Hilam Arauco',
    stockRef: 25,
    notes: 'Cumbreras y vigas maestras a la vista'
  },

  // Fijaciones y Sellantes
  {
    id: 'fij-tornillo-torx-sip',
    category: 'fijaciones_sellantes',
    name: 'Tornillo Estructural Torx 6.0 x 130mm Tratamiento Ruspert',
    code: 'FIJ-TORX-6X130',
    spec: 'Resistencia a 1000 hrs niebla salina, punta broca tipo 17',
    unit: 'Caja (100 unid.)',
    priceClp: 28500,
    supplier: 'Rothoblaas / Simpson Strong-Tie',
    stockRef: 60,
    notes: 'Unión panel a solera y encuentro de esquinas'
  },
  {
    id: 'fij-tornillo-spax-mueble',
    category: 'fijaciones_sellantes',
    name: 'Tornillo Spax Mueblista 4.0 x 50mm Cabeza Plana PZ2',
    code: 'FIJ-SPAX-4X50',
    spec: 'Rosca parcial autorroscante con costillas de fresado',
    unit: 'Caja (500 unid.)',
    priceClp: 9800,
    supplier: 'SPAX / Mamut',
    stockRef: 110,
    notes: 'Armado de cascos melamina'
  },
  {
    id: 'sell-espuma-pu',
    category: 'fijaciones_sellantes',
    name: 'Espuma Poliuretano Expansiva Baja Expansión (750ml)',
    code: 'SEL-PU-GUN-750',
    spec: 'Conductividad térmica 0.034 W/mK para juntas herméticas SIP',
    unit: 'Tubo 750 ml',
    priceClp: 6900,
    supplier: 'Soudal / Sika Boom',
    stockRef: 210,
    notes: 'Sellado hermético entre paneles'
  },
  {
    id: 'sell-sikaflex-11fc',
    category: 'fijaciones_sellantes',
    name: 'Sellador Poliuretánico Elastomérico Sikaflex 11FC (300ml)',
    code: 'SEL-SIKA-11FC',
    spec: 'Alto módulo de elasticidad para sellado solera-radier',
    unit: 'Cartucho 300 ml',
    priceClp: 6400,
    supplier: 'Sika Chile',
    stockRef: 180,
    notes: 'Barrera de agua y vapor en solera basal'
  }
];

export const DEFAULT_CUSTOM_TEXTURES: CustomTextureItem[] = [
  {
    id: 'tex-abet-2831',
    name: 'Broccato 2831',
    code: 'SAP 2831',
    brand: 'Abet Laminati',
    category: 'hpl_autor',
    finish: 'Longline Mate',
    sheetFormat: '1.30 x 3.05 m',
    priceM2Clp: 23200,
    priceSheetClp: 92000,
    url: '/textures/abet-broccato-2831.svg',
    previewUrl: '/textures/abet-broccato-2831.svg',
    active: true,
    createdAt: '2026-01-10',
    approvalStatus: 'approved',
    providerName: 'Abet Laminati / Provelcar',
    commissionPercentage: 15,
    providerNetPriceClp: 78200
  },
  {
    id: 'tex-abet-2824',
    name: 'Fiore Pop 2824',
    code: 'SAP 2824',
    brand: 'Abet Laminati',
    category: 'hpl_autor',
    finish: 'Longline Satin',
    sheetFormat: '1.30 x 3.05 m',
    priceM2Clp: 23200,
    priceSheetClp: 92000,
    url: '/textures/abet-fiore-pop-2824.svg',
    previewUrl: '/textures/abet-fiore-pop-2824.svg',
    active: true,
    createdAt: '2026-01-15',
    approvalStatus: 'approved',
    providerName: 'Abet Laminati / Provelcar',
    commissionPercentage: 15,
    providerNetPriceClp: 78200
  },
  {
    id: 'tex-light-wood',
    name: 'Roble Natural Nórdico',
    code: 'MAS-ROB-01',
    brand: 'Masisa',
    category: 'maderas',
    finish: 'Poro Sincronizado',
    sheetFormat: '1.83 x 2.50 m',
    thicknessMm: 18,
    priceM2Clp: 10250,
    priceSheetClp: 46900,
    url: '/textures/light-wood-grain.svg',
    previewUrl: '/textures/light-wood-grain.svg',
    active: true,
    createdAt: '2026-02-01',
    approvalStatus: 'approved',
    providerName: 'Masisa Chile',
    commissionPercentage: 12,
    providerNetPriceClp: 41272
  },
  {
    id: 'tex-blanco-soft-15',
    name: 'Blanco Estándar 15mm',
    code: 'TAB-MEL-15-BLA',
    brand: 'Arauco',
    category: 'solidos',
    finish: 'Soft Mate',
    sheetFormat: '1.83 x 2.50 m',
    thicknessMm: 15,
    priceM2Clp: 6310,
    priceSheetClp: 28900,
    url: '#FFFFFF',
    previewUrl: '#FFFFFF',
    active: true,
    createdAt: '2026-02-05',
    approvalStatus: 'approved',
    providerName: 'Arauco Soluciones',
    commissionPercentage: 10,
    providerNetPriceClp: 26010
  },
  {
    id: 'tex-blanco-soft',
    name: 'Blanco Polo Soft 18mm',
    code: 'ARAU-BLA-18',
    brand: 'Arauco',
    category: 'solidos',
    finish: 'Soft Mate',
    sheetFormat: '1.83 x 2.50 m',
    thicknessMm: 18,
    priceM2Clp: 7540,
    priceSheetClp: 34500,
    url: '#F8F9FA',
    previewUrl: '#F8F9FA',
    active: true,
    createdAt: '2026-02-10',
    approvalStatus: 'approved',
    providerName: 'Arauco Soluciones',
    commissionPercentage: 10,
    providerNetPriceClp: 31050
  },
  {
    id: 'tex-grafito-mate',
    name: 'Gris Grafito Antracita',
    code: 'VEST-GRAF-18',
    brand: 'Vesto',
    category: 'solidos',
    finish: 'Seda Antihuella',
    sheetFormat: '1.83 x 2.50 m',
    thicknessMm: 18,
    priceM2Clp: 9400,
    priceSheetClp: 43000,
    url: '#373E44',
    previewUrl: '#373E44',
    active: true,
    createdAt: '2026-02-18',
    approvalStatus: 'approved',
    providerName: 'Arauco Soluciones',
    commissionPercentage: 10,
    providerNetPriceClp: 38700
  },
  // --- Cubiertas de Cuarzo y Sinterizados Qstone / SYSPROTEC (Oficiales) ---
  {
    id: 'tex-qs-pure-white-18',
    name: 'Qstone Cuarzo Pure White 18mm',
    code: 'QP_PW21320160',
    brand: 'Qstone / SYSPROTEC',
    category: 'piedras_marmoles',
    finish: 'Pulido Seda',
    sheetFormat: '1.60 x 3.20 m (5.12 m²)',
    priceM2Clp: 339818,
    priceSheetClp: 1739868,
    url: '#FFFFFF',
    previewUrl: '#FFFFFF',
    active: true,
    createdAt: '2026-03-01',
    approvalStatus: 'approved',
    providerName: 'SYSPROTEC (Qstone)',
    commissionPercentage: 20,
    providerNetPriceClp: 1218392
  },
  {
    id: 'tex-qs-black-mamba-18',
    name: 'Qstone Cuarzo Black Mamba 18mm',
    code: 'QP_BM22320160',
    brand: 'Qstone / SYSPROTEC',
    category: 'piedras_marmoles',
    finish: 'Pulido Seda',
    sheetFormat: '1.60 x 3.20 m (5.12 m²)',
    priceM2Clp: 338859,
    priceSheetClp: 1734958,
    url: '#1C1C1E',
    previewUrl: '#1C1C1E',
    active: true,
    createdAt: '2026-03-01',
    approvalStatus: 'approved',
    providerName: 'SYSPROTEC (Qstone)',
    commissionPercentage: 20,
    providerNetPriceClp: 1214956
  },
  {
    id: 'tex-qs-calacatta-gold-20',
    name: 'Qstone Cuarzo Calacatta Gold 20mm',
    code: 'QP_CO31320160',
    brand: 'Qstone / SYSPROTEC',
    category: 'piedras_marmoles',
    finish: 'Pulido Seda',
    sheetFormat: '1.60 x 3.20 m (5.12 m²)',
    priceM2Clp: 612315,
    priceSheetClp: 3135053,
    url: '#F7F6F2',
    previewUrl: '#F7F6F2',
    active: true,
    createdAt: '2026-03-01',
    approvalStatus: 'approved',
    providerName: 'SYSPROTEC (Qstone)',
    commissionPercentage: 20,
    providerNetPriceClp: 2195411
  },
  {
    id: 'tex-qs-sand-20',
    name: 'Qstone Cuarzo Sand 20mm',
    code: 'QP_SA31320160',
    brand: 'Qstone / SYSPROTEC',
    category: 'piedras_marmoles',
    finish: 'Suede / Mate',
    sheetFormat: '1.60 x 3.20 m (5.12 m²)',
    priceM2Clp: 353264,
    priceSheetClp: 1808712,
    url: '#DDD5C7',
    previewUrl: '#DDD5C7',
    active: true,
    createdAt: '2026-03-01',
    approvalStatus: 'approved',
    providerName: 'SYSPROTEC (Qstone)',
    commissionPercentage: 20,
    providerNetPriceClp: 1266580
  },
  {
    id: 'tex-qs-sint-ana-white-12',
    name: 'Qstone Sinterizado Ana White 12mm',
    code: 'QP_AN51320160',
    brand: 'Qstone / SYSPROTEC',
    category: 'piedras_marmoles',
    finish: 'Satinado Ultra-compacto',
    sheetFormat: '1.60 x 3.20 m (5.12 m²)',
    priceM2Clp: 331282,
    priceSheetClp: 1696164,
    url: '#FDFEFE',
    previewUrl: '#FDFEFE',
    active: true,
    createdAt: '2026-03-01',
    approvalStatus: 'approved',
    providerName: 'SYSPROTEC (Qstone)',
    commissionPercentage: 20,
    providerNetPriceClp: 1187807
  },
  {
    id: 'tex-qs-sint-aurota-black-12',
    name: 'Qstone Sinterizado Aurota Black 12mm',
    code: 'QP_AB52320160',
    brand: 'Qstone / SYSPROTEC',
    category: 'piedras_marmoles',
    finish: 'Satinado Anti-huellas',
    sheetFormat: '1.60 x 3.20 m (5.12 m²)',
    priceM2Clp: 331282,
    priceSheetClp: 1696164,
    url: '#18191A',
    previewUrl: '#18191A',
    active: true,
    createdAt: '2026-03-01',
    approvalStatus: 'approved',
    providerName: 'SYSPROTEC (Qstone)',
    commissionPercentage: 20,
    providerNetPriceClp: 1187807
  },
  {
    id: 'tex-qs-sint-lime-stone-grey-12',
    name: 'Qstone Sinterizado Lime Stone Grey 12mm',
    code: 'QP_LS52320160',
    brand: 'Qstone / SYSPROTEC',
    category: 'piedras_marmoles',
    finish: 'Texturado Piedra Caliza',
    sheetFormat: '1.60 x 3.20 m (5.12 m²)',
    priceM2Clp: 331282,
    priceSheetClp: 1696164,
    url: '#90A4AE',
    previewUrl: '#90A4AE',
    active: true,
    createdAt: '2026-03-01',
    approvalStatus: 'approved',
    providerName: 'SYSPROTEC (Qstone)',
    commissionPercentage: 20,
    providerNetPriceClp: 1187807
  }
];

export const DEFAULT_PROVIDERS: ProviderItem[] = [
  {
    id: 'prov-masisa',
    name: 'Masisa Chile',
    rut: '96.540.120-K',
    email: 'contacto@masisa.com',
    phone: '+56 2 2700 8000',
    address: 'Av. Apoquindo 3650, Las Condes, Santiago',
    commissionPercentage: 12,
    active: true,
    createdAt: '2026-01-01'
  },
  {
    id: 'prov-arauco',
    name: 'Arauco Soluciones',
    rut: '91.500.000-8',
    email: 'ventas@arauco.cl',
    phone: '+56 2 2461 7000',
    address: 'Av. El Golf 150, Las Condes, Santiago',
    commissionPercentage: 10,
    active: true,
    createdAt: '2026-01-01'
  },
  {
    id: 'prov-abet',
    name: 'Abet Laminati / Provelcar',
    rut: '76.123.456-7',
    email: 'contacto@provelcar.cl',
    phone: '+56 2 2234 5678',
    address: 'Av. Italia 1234, Providencia, Santiago',
    commissionPercentage: 15,
    active: true,
    createdAt: '2026-01-05'
  },
  {
    id: 'prov-sysprotec',
    name: 'SYSPROTEC (Qstone)',
    rut: '76.890.123-4',
    email: 'contacto@sysprotec.cl',
    phone: '+56 2 2898 5000',
    address: 'Av. Américo Vespucio 1500, Quilicura, Santiago',
    commissionPercentage: 20,
    active: true,
    createdAt: '2026-03-01'
  }
];

export const DEFAULT_PROJECTS: ProjectItem[] = [];

const LOCAL_STORAGE_KEY = 'mueblestudio_admin_store_v1';

export function textureToSupplyItem(tex: CustomTextureItem): SupplyItem {
  const isStone =
    tex.category === 'piedras_marmoles' ||
    tex.brand?.toLowerCase().includes('qstone') ||
    tex.brand?.toLowerCase().includes('sysprotec');
  const isHpl = tex.category === 'hpl_autor' || tex.brand?.toLowerCase().includes('abet');
  const category: SupplyCategory = isStone ? 'cubiertas_qstone' : 'melamina';

  const thicknessStr = tex.thicknessMm ? `${tex.thicknessMm}mm ` : '';
  const unit = isStone
    ? 'm²'
    : isHpl
    ? 'Plancha (3.96 m²)'
    : tex.sheetFormat
    ? `Plancha (${tex.sheetFormat})`
    : 'Plancha (4.57 m²)';

  const priceClp = isStone
    ? tex.priceM2Clp || Math.round((tex.priceSheetClp || 280000) / 3.965)
    : tex.priceSheetClp || 45000;

  const displayName = `${tex.name} ${thicknessStr}${tex.sheetFormat ? `(${tex.sheetFormat})` : ''}`.replace(/\s+/g, ' ').trim();

  return {
    id: `sup-${tex.id}`,
    category,
    name: displayName,
    code: tex.code || `TAB-${tex.id.slice(-6).toUpperCase()}`,
    spec: `${tex.brand || 'Proveedor'} - ${tex.finish || 'Estándar'} (${thicknessStr.trim() || 'Tablero'})`,
    unit,
    priceClp,
    supplier: tex.providerName || tex.brand || 'Proveedor Registrado',
    stockRef: 50,
    notes: `Decorativo 3D sincronizado automáticamente`,
  };
}

export function mergeTexturesIntoSupplies(baseSupplies: SupplyItem[], textures: CustomTextureItem[]): SupplyItem[] {
  const map = new Map<string, SupplyItem>();
  baseSupplies.forEach((s) => map.set(s.id, s));

  textures.forEach((tex) => {
    const supId = `sup-${tex.id}`;
    const generated = textureToSupplyItem(tex);
    const existing = map.get(supId) || Array.from(map.values()).find((s) => s.code === tex.code);
    if (existing) {
      map.set(existing.id, {
        ...existing,
        name: generated.name,
        priceClp: generated.priceClp,
        supplier: generated.supplier,
        spec: generated.spec,
        unit: generated.unit,
        category: generated.category,
      });
    } else {
      map.set(supId, generated);
    }
  });

  return Array.from(map.values());
}

// IDs de productos/texturas ficticias en desuso para depuración automática
const DEPRECATED_FICTITIOUS_IDS = new Set([
  'qs-salt-pool-18', 'qs-snow-powder-18', 'qs-snow-powder-20', 'qs-white-mamba-18',
  'qs-calacatta-sharp-20', 'qs-concrete-honed-20', 'qs-calacatta-aosta-20', 'qs-calacatta-stratus-20',
  'qs-dark-grey-20', 'qs-imperium-polished-20', 'qs-cool-street-20', 'qs-cotton-diamond-20',
  'qs-cotton-diamond-18', 'qs-onix-20', 'qs-ash-honed-20', 'qs-sint-deep-indigo-black-12',
  'qs-sint-golden-jade-white-12', 'qs-sint-light-clement-grey-12', 'qs-sint-light-clement-white-12',
  'qs-sint-lime-stone-white-12',
  'tex-qs-salt-pool-18', 'tex-qs-snow-powder-18', 'tex-qs-snow-powder-20', 'tex-qs-white-mamba-18',
  'tex-qs-calacatta-sharp-20', 'tex-qs-concrete-honed-20', 'tex-qs-calacatta-aosta-20', 'tex-qs-calacatta-stratus-20',
  'tex-qs-dark-grey-20', 'tex-qs-imperium-polished-20', 'tex-qs-cool-street-20', 'tex-qs-cotton-diamond-20',
  'tex-qs-cotton-diamond-18', 'tex-qs-onix-20', 'tex-qs-ash-honed-20', 'tex-qs-sint-deep-indigo-black-12',
  'tex-qs-sint-golden-jade-white-12', 'tex-qs-sint-light-clement-grey-12', 'tex-qs-sint-light-clement-white-12',
  'tex-qs-sint-lime-stone-white-12',
  'def_mas_blanco_15', 'def_mas_blanco_18', 'def_mas_negro_18'
]);

// IDs de proyectos de muestra para depuración automática
const DEMO_PROJECT_IDS = new Set([
  'proj-kitchen-loft-01',
  'proj-closet-master-01',
  'proj-special-vitrina-01',
  'proj-bath-suite-01',
  'proj-office-executive-01',
  'proj-chair-parametric-01',
]);

const getInitialState = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const parsedTextures: CustomTextureItem[] = (() => {
        if (!Array.isArray(parsed.textures) || parsed.textures.length === 0) return DEFAULT_CUSTOM_TEXTURES;
        const map = new Map<string, CustomTextureItem>();
        DEFAULT_CUSTOM_TEXTURES.forEach((t) => map.set(t.id, t));
        parsed.textures.forEach((t: CustomTextureItem) => {
          if (!t || !t.id || DEPRECATED_FICTITIOUS_IDS.has(t.id)) return;
          const def = map.get(t.id);
          map.set(t.id, def ? { ...def, ...t } : t);
        });
        return Array.from(map.values()).map((t) => ({
          ...t,
          approvalStatus: t.approvalStatus || 'approved'
        }));
      })();

      const parsedSupplies: SupplyItem[] = (() => {
        if (!Array.isArray(parsed.supplies) || parsed.supplies.length === 0) {
          return mergeTexturesIntoSupplies(DEFAULT_SUPPLIES, parsedTextures);
        }
        const map = new Map<string, SupplyItem>();
        DEFAULT_SUPPLIES.forEach((s) => map.set(s.id, s));
        parsed.supplies.forEach((s: SupplyItem) => {
          if (!s || !s.id || DEPRECATED_FICTITIOUS_IDS.has(s.id) || (s.id.startsWith('sup-') && DEPRECATED_FICTITIOUS_IDS.has(s.id.replace('sup-', '')))) return;
          const def = map.get(s.id);
          map.set(s.id, def ? { ...def, ...s } : s);
        });
        return mergeTexturesIntoSupplies(Array.from(map.values()), parsedTextures);
      })();

      return {
        isAuthenticated: !!parsed.isAuthenticated,
        adminEmail: parsed.adminEmail || null,
        themeMode: (parsed.themeMode === 'light' ? 'light' : 'dark') as 'dark' | 'light',
        providers: (() => {
          if (!Array.isArray(parsed.providers) || parsed.providers.length === 0) return DEFAULT_PROVIDERS;
          const map = new Map<string, ProviderItem>();
          DEFAULT_PROVIDERS.forEach((p) => map.set(p.id, p));
          parsed.providers.forEach((p: ProviderItem) => {
            const def = map.get(p.id);
            map.set(p.id, def ? { ...def, ...p } : p);
          });
          return Array.from(map.values());
        })(),
        projects: Array.isArray(parsed.projects)
          ? (parsed.projects as ProjectItem[]).filter(
              (p) => p && p.id && !DEMO_PROJECT_IDS.has(p.id) && !p.id.startsWith('proj-kitchen-loft') && !p.id.startsWith('proj-closet-master') && !p.id.startsWith('proj-special-vitrina')
            )
          : [],
        supplies: parsedSupplies,
        textures: parsedTextures,
        manufacturingRates: parsed.manufacturingRates
          ? { ...DEFAULT_MANUFACTURING_RATES, ...parsed.manufacturingRates }
          : DEFAULT_MANUFACTURING_RATES,
      };
    }
  } catch (e) {
    console.error('Error loading admin state from localStorage', e);
  }
  return {
    isAuthenticated: false,
    adminEmail: null,
    themeMode: 'dark' as 'dark' | 'light',
    providers: DEFAULT_PROVIDERS,
    projects: [],
    supplies: mergeTexturesIntoSupplies(DEFAULT_SUPPLIES, DEFAULT_CUSTOM_TEXTURES),
    textures: DEFAULT_CUSTOM_TEXTURES,
    manufacturingRates: DEFAULT_MANUFACTURING_RATES,
  };
};

function sanitizeStringForStorage(val: string | undefined, maxLen = 4000): string {
  if (!val) return '';
  if (val.startsWith('data:image') || val.length > maxLen) {
    if (val.startsWith('#')) return val;
    return '#CCCCCC';
  }
  return val;
}

function sanitizeObjectForStorage(obj: any, depth = 0): any {
  if (depth > 5) return undefined;
  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string' && (obj.startsWith('data:image') || obj.length > 4000)) {
      return '#CCCCCC';
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.slice(0, 80).map((item) => sanitizeObjectForStorage(item, depth + 1));
  }
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'screenshot' || k === 'previewImage' || k === 'thumbnail' || k === 'meshGeometry') {
      continue;
    }
    clean[k] = sanitizeObjectForStorage(v, depth + 1);
  }
  return clean;
}

const saveToLocalStorage = (state: {
  isAuthenticated: boolean;
  adminEmail: string | null;
  themeMode: 'dark' | 'light';
  providers: ProviderItem[];
  projects: ProjectItem[];
  supplies: SupplyItem[];
  textures: CustomTextureItem[];
  manufacturingRates?: ManufacturingRateConfig;
}) => {
  if (typeof window === 'undefined' || !window.localStorage) return;

  // 1. Sanitizar texturas (remover data URLs / SVGs gigantes)
  const cleanTextures = (state.textures || []).map((t) => ({
    ...t,
    url: sanitizeStringForStorage(t.url, 4000),
    previewUrl: sanitizeStringForStorage(t.previewUrl, 4000),
  }));

  // 2. Sanitizar proyectos (remover binarios/blobs gigantes de data)
  const cleanProjects = (state.projects || []).map((p) => ({
    ...p,
    data: sanitizeObjectForStorage(p.data),
  }));

  const cleanState = {
    ...state,
    textures: cleanTextures,
    projects: cleanProjects,
  };

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanState));
  } catch (e1: any) {
    console.warn('LocalStorage quota warning (Tier 1), attempting pruned save:', e1?.message);
    try {
      // Tier 2: Conservar los 30 proyectos más recientes con datos aligerados
      const tier2Projects = cleanProjects.slice(0, 30).map((p) => ({
        ...p,
        data: p.data ? {
          cabinets: Array.isArray(p.data.cabinets)
            ? p.data.cabinets.map((c: any) => ({
                id: c.id,
                name: c.name,
                type: c.type,
                width: c.width,
                height: c.height,
                depth: c.depth,
                structureColor: c.structureColor,
                doorColor: c.doorColor,
                finish: c.finish,
                drawersCount: c.drawersCount,
                doorsCount: c.doorsCount,
                hasGola: c.hasGola,
              }))
            : undefined,
          modules: p.data.modules,
          roomConfig: p.data.roomConfig ? {
            width: p.data.roomConfig.width,
            length: p.data.roomConfig.length,
            height: p.data.roomConfig.height,
            shape: p.data.roomConfig.shape,
          } : undefined,
          countertopMaterial: p.data.countertopMaterial,
          totalFloorM2: p.data.totalFloorM2,
        } : {},
      }));

      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          ...cleanState,
          projects: tier2Projects,
        })
      );
    } catch (e2: any) {
      console.warn('LocalStorage quota warning (Tier 2), attempting emergency minimal save:', e2?.message);
      try {
        // Tier 3: Guardar sólo metadatos esenciales de proyectos
        const tier3Projects = cleanProjects.slice(0, 15).map((p) => ({
          id: p.id,
          name: p.name,
          client: p.client,
          date: p.date,
          type: p.type,
          description: p.description,
          totalCostEstimateClp: p.totalCostEstimateClp,
          status: p.status,
          finalSalePriceClp: p.finalSalePriceClp,
          orderNumber: p.orderNumber,
          soldDate: p.soldDate,
          data: {},
        }));

        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify({
            ...cleanState,
            projects: tier3Projects,
          })
        );
      } catch (e3) {
        console.warn('LocalStorage limit reached; in-memory state preserved safely without throwing.', e3);
      }
    }
  }
};

function syncTextureToKitchenStore(tex: CustomTextureItem) {
  const isStone =
    tex.category === 'piedras_marmoles' ||
    tex.brand?.toLowerCase().includes('qstone') ||
    tex.brand?.toLowerCase().includes('sysprotec') ||
    tex.name.toLowerCase().includes('qstone') ||
    tex.providerName?.toLowerCase().includes('qstone') ||
    tex.providerName?.toLowerCase().includes('sysprotec');

  if (!isStone) return;

  try {
    const isApproved = tex.active && (tex.approvalStatus === 'approved' || !tex.approvalStatus);
    if (isApproved) {
      const isSintered =
        tex.name.toLowerCase().includes('sinteriz') ||
        tex.finish?.toLowerCase().includes('sinteriz') ||
        tex.category === 'piedras_marmoles' ||
        tex.sheetFormat?.toLowerCase().includes('3.2');

      const priceM2 = tex.priceM2Clp || Math.round((tex.priceSheetClp || 280000) / 3.965) || 280000;

      useKitchenStore.getState().addQstoneCatalogItem({
        id: tex.id,
        code: tex.code || 'QS-CUSTOM',
        name: tex.name,
        materialType: isSintered ? 'sinterizado' : 'quarzo',
        thicknessMm: (tex as any).thicknessMm || (tex.name.includes('20') ? 20 : (tex.name.includes('18') ? 18 : 12)),
        priceM2Clp: priceM2,
        sheetWidthMm: 3200,
        sheetHeightMm: 1600,
        colorHex: tex.url && tex.url.startsWith('#') ? tex.url : '#F5F5F7',
        textureUrl: (tex.url && !tex.url.startsWith('#')) ? tex.url : ((tex.previewUrl && !tex.previewUrl.startsWith('#')) ? tex.previewUrl : undefined),
        finish: tex.finish || 'Pulido Seda',
        description: `${tex.brand || 'SYSPROTEC (QSTONE)'} - ${tex.finish || 'Formato Placa'}`,
        active: true,
      });
    } else {
      useKitchenStore.getState().removeQstoneCatalogItem(tex.id);
    }
  } catch (e) {
    console.warn('Error sincronizando textura con kitchenStore:', e);
  }
}

export const useAdminStore = create<AdminState>((set, get) => {
  const initial = getInitialState();

  const persist = (partial: Partial<AdminState>) => {
    set((state) => {
      const updated = { ...state, ...partial };
      saveToLocalStorage({
        isAuthenticated: updated.isAuthenticated,
        adminEmail: updated.adminEmail,
        themeMode: updated.themeMode,
        providers: updated.providers,
        projects: updated.projects,
        supplies: updated.supplies,
        textures: updated.textures,
        manufacturingRates: updated.manufacturingRates,
      });
      return updated;
    });
  };

  return {
    isAuthenticated: initial.isAuthenticated,
    adminEmail: initial.adminEmail,

    themeMode: initial.themeMode || 'dark',
    setThemeMode: (mode: 'dark' | 'light') => {
      persist({ themeMode: mode });
    },
    toggleThemeMode: () => {
      const current = get().themeMode;
      persist({ themeMode: current === 'dark' ? 'light' : 'dark' });
    },

    providers: initial.providers,
    addProvider: (providerData) => {
      const newId = `prov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newProvider: ProviderItem = {
        ...providerData,
        id: newId,
        createdAt: new Date().toISOString().split('T')[0]
      };
      const current = get().providers;
      persist({ providers: [newProvider, ...current] });
      return newId;
    },
    updateProvider: (id, updates) => {
      const current = get().providers.map((p) => (p.id === id ? { ...p, ...updates } : p));
      persist({ providers: current });
    },
    deleteProvider: (id) => {
      const current = get().providers.filter((p) => p.id !== id);
      persist({ providers: current });
    },

    login: (user: string, pass: string) => {
      const cleanUser = user.trim().toLowerCase();
      const cleanPass = pass.trim();
      if (
        (cleanUser === 'marcelo@robfu.cl' && cleanPass === 'Robfu2026@') ||
        (cleanUser === 'marcelo@robfu.com' && cleanPass === '123456')
      ) {
        persist({ isAuthenticated: true, adminEmail: cleanUser });
        return { success: true };
      }
      return { success: false, error: 'Credenciales inválidas. Verifique usuario y contraseña de Superadministrador.' };
    },

    logout: () => {
      persist({ isAuthenticated: false, adminEmail: null });
    },

    projects: initial.projects,

    saveProject: (projectData) => {
      const newId = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newProj: ProjectItem = {
        ...projectData,
        id: newId,
        date: new Date().toISOString().split('T')[0],
        status: projectData.status || 'designed',
      };
      const currentProjects = get().projects;
      persist({ projects: [newProj, ...currentProjects] });
      return newId;
    },

    updateProject: (id, updates) => {
      const currentProjects = get().projects.map((p) => (p.id === id ? { ...p, ...updates } : p));
      persist({ projects: currentProjects });
    },

    renameProject: (id, newName, newClient) => {
      const currentProjects = get().projects.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            name: newName,
            ...(newClient !== undefined ? { client: newClient } : {}),
          };
        }
        return p;
      });
      persist({ projects: currentProjects });
    },

    duplicateProject: (id) => {
      const target = get().projects.find((p) => p.id === id);
      if (!target) return '';
      const newId = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const duplicated: ProjectItem = {
        ...target,
        id: newId,
        name: `${target.name} (Copia)`,
        date: new Date().toISOString().split('T')[0],
      };
      const currentProjects = get().projects;
      persist({ projects: [duplicated, ...currentProjects] });
      return newId;
    },

    deleteProject: (id) => {
      const currentProjects = get().projects.filter((p) => p.id !== id);
      persist({ projects: currentProjects });
    },

    clearAllProjects: () => {
      persist({ projects: [] });
    },

    syncCloudProjects: async () => {
      const supabase = getSupabase();
      const currentUser = useSupabaseAuthStore.getState().user;
      if (!supabase || !currentUser?.tenant_id) return;

      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('tenant_id', currentUser.tenant_id)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const typeMap: Record<string, ProjectType> = {
            kitchen: 'kitchen',
            closet: 'closet',
            special_furniture: 'special',
            special: 'special',
            hpl_bathroom: 'hpl-bathroom',
            office: 'office',
            chair: 'chair',
          };

          const cloudProjectItems: ProjectItem[] = data.map((cp) => ({
            id: cp.id,
            name: cp.name,
            client: cp.client_name || 'Cliente Cloud',
            date: cp.created_at ? cp.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            type: typeMap[cp.project_type] || 'kitchen',
            description: `Proyecto Nube (${cp.code || 'PRJ'}) - ${cp.status || 'draft'}`,
            totalCostEstimateClp: Number(cp.total_price) || 0,
            data: cp.config_json || {},
          }));

          const localProjects = get().projects;
          const mergedMap = new Map<string, ProjectItem>();

          // Primero cloud
          cloudProjectItems.forEach((p) => mergedMap.set(p.id, p));
          // Luego locales que no colisionen
          localProjects.forEach((p) => {
            if (!mergedMap.has(p.id)) {
              mergedMap.set(p.id, p);
            }
          });

          const merged = Array.from(mergedMap.values());
          persist({ projects: merged });
        }
      } catch (err) {
        console.warn('Error sincronizando proyectos desde la nube:', err);
      }
    },

    // Cálculo y agregación de métricas de uso anónimas para proveedores
    getProviderStats: (providerIdOrName: string): ProviderStats => {
      const cleanTerm = (providerIdOrName || '').toLowerCase().trim();
      const allTextures = get().textures;
      const allProjects = get().projects;

      // Identificar las texturas que corresponden a este proveedor
      const providerTextures = allTextures.filter((t) => {
        const pId = (t.providerId || '').toLowerCase();
        const pName = (t.providerName || '').toLowerCase();
        const brand = (t.brand || '').toLowerCase();
        return (
          pId === cleanTerm ||
          pName.includes(cleanTerm) ||
          cleanTerm.includes(pName) ||
          brand.includes(cleanTerm) ||
          cleanTerm.includes(brand)
        );
      });

      const productUsageMap = new Map<string, { code: string; name: string; count: number; estimatedAreaM2: number }>();
      const anonymousProjectsList: AnonymousProjectUsage[] = [];

      allProjects.forEach((proj, idx) => {
        const dataStr = JSON.stringify(proj.data || {}).toLowerCase();
        let projectMatchedCount = 0;
        const projectMatchedProducts: { code: string; name: string; count: number }[] = [];

        providerTextures.forEach((tex) => {
          const texNameLower = tex.name.toLowerCase();
          const texCodeLower = tex.code.toLowerCase();
          const texUrlLower = (tex.url || '').toLowerCase();

          // Contar ocurrencias o referencias en el JSON del proyecto
          let count = 0;
          if (dataStr.includes(texCodeLower)) {
            count += (dataStr.split(texCodeLower).length - 1);
          }
          if (dataStr.includes(texNameLower)) {
            count += (dataStr.split(texNameLower).length - 1);
          }
          if (texUrlLower && texUrlLower.length > 4 && dataStr.includes(texUrlLower)) {
            count += (dataStr.split(texUrlLower).length - 1);
          }

          // Si el proyecto es del tipo del proveedor o contiene gabinetes
          if (count === 0) {
            // Inspección de módulos
            const cabinets = (proj.data?.cabinets as any[]) || [];
            cabinets.forEach((cab) => {
              const cabStr = JSON.stringify(cab).toLowerCase();
              if (cabStr.includes(cleanTerm) || cabStr.includes(texNameLower)) {
                count += 1;
              }
            });
          }

          if (count > 0) {
            projectMatchedCount += count;
            projectMatchedProducts.push({
              code: tex.code,
              name: tex.name,
              count
            });

            const currentProductStat = productUsageMap.get(tex.id) || {
              code: tex.code,
              name: tex.name,
              count: 0,
              estimatedAreaM2: 0,
            };
            currentProductStat.count += count;
            currentProductStat.estimatedAreaM2 += Math.round(count * 0.45 * 10) / 10;
            productUsageMap.set(tex.id, currentProductStat);
          }
        });

        if (projectMatchedCount > 0) {
          // Generar código anónimo de proyecto: NO incluir nombres ni emails de clientes
          const anonymousCode = `PRJ-${(1000 + idx * 7).toString().padStart(4, '0')}`;
          anonymousProjectsList.push({
            id: proj.id,
            code: anonymousCode,
            type: proj.type,
            date: proj.date,
            productsUsedCount: projectMatchedCount,
            matchedProducts: projectMatchedProducts
          });
        }
      });

      // Si no hubo menciones directas en proyectos reales pero el proveedor tiene texturas,
      // no inventar proyectos ficticios; devolver únicamente métricas reales
      const productsBreakdown = Array.from(productUsageMap.values());
      const totalProductsUsed = productsBreakdown.reduce((sum, item) => sum + item.count, 0);

      return {
        providerName: providerIdOrName,
        totalProjects: anonymousProjectsList.length,
        totalProductsUsed,
        productsBreakdown,
        anonymousProjects: anonymousProjectsList
      };
    },

    supplies: initial.supplies,

    updateSupplyPrice: (id, newPrice) => {
      const validPrice = Math.max(0, newPrice);
      const currentSupplies = get().supplies.map((s) => (s.id === id ? { ...s, priceClp: validPrice } : s));
      
      // Si el insumo corresponde a una textura personalizada, actualizar el precio de la textura
      let currentTextures = get().textures;
      if (id.startsWith('sup-')) {
        const texId = id.replace('sup-', '');
        currentTextures = currentTextures.map((t) =>
          t.id === texId ? { ...t, priceSheetClp: validPrice, priceM2Clp: Math.round(validPrice / 4.57) } : t
        );
      }

      persist({ supplies: currentSupplies, textures: currentTextures });
      try {
        useKitchenStore.getState().updateQstoneCatalogItemPrice(id, validPrice);
      } catch (e) {
        console.warn('Error sincronizando precio con kitchenStore:', e);
      }
    },

    updateSupply: (id, updates) => {
      const currentSupplies = get().supplies.map((s) => (s.id === id ? { ...s, ...updates } : s));
      
      // Sincronizar hacia textures si corresponde
      let currentTextures = get().textures;
      if (id.startsWith('sup-')) {
        const texId = id.replace('sup-', '');
        currentTextures = currentTextures.map((t) => {
          if (t.id === texId) {
            return {
              ...t,
              ...(updates.priceClp !== undefined
                ? { priceSheetClp: updates.priceClp, priceM2Clp: Math.round(updates.priceClp / 4.57) }
                : {}),
              ...(updates.supplier ? { providerName: updates.supplier, brand: updates.supplier } : {}),
            };
          }
          return t;
        });
      }

      persist({ supplies: currentSupplies, textures: currentTextures });
      try {
        if (updates.priceClp !== undefined) {
          useKitchenStore.getState().updateQstoneCatalogItemPrice(id, updates.priceClp);
        }
        if (updates.name || updates.spec || updates.supplier) {
          useKitchenStore.getState().updateQstoneCatalogItem(id, {
            name: updates.name,
            description: updates.spec,
          });
        }
      } catch (e) {
        console.warn('Error sincronizando supply con kitchenStore:', e);
      }
    },

    addSupply: (supplyData) => {
      const newId = `sup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newItem: SupplyItem = {
        ...supplyData,
        id: newId,
      };
      const currentSupplies = [newItem, ...get().supplies];
      persist({ supplies: currentSupplies });

      if (supplyData.category === 'cubiertas_qstone') {
        try {
          const isSintered = supplyData.spec.toLowerCase().includes('sinteriz') || supplyData.name.toLowerCase().includes('sinteriz');
          useKitchenStore.getState().addQstoneCatalogItem({
            id: newId,
            code: supplyData.code,
            name: supplyData.name,
            materialType: isSintered ? 'sinterizado' : 'quarzo',
            thicknessMm: isSintered ? 12 : 20,
            priceM2Clp: supplyData.priceClp,
            sheetWidthMm: 3200,
            sheetHeightMm: 1600,
            colorHex: '#E2E8F0',
            finish: supplyData.spec,
            description: supplyData.notes || supplyData.spec,
            active: true,
          });
        } catch (e) {
          console.warn('Error añadiendo material a kitchenStore:', e);
        }
      }
      return newId;
    },

    deleteSupply: (id) => {
      const currentSupplies = get().supplies.filter((s) => s.id !== id);
      persist({ supplies: currentSupplies });
      try {
        useKitchenStore.getState().removeQstoneCatalogItem(id);
      } catch (e) {}
    },

    resetSuppliesToDefault: () => {
      persist({ supplies: DEFAULT_SUPPLIES });
      try {
        DEFAULT_SUPPLIES.filter((s) => s.category === 'cubiertas_qstone').forEach((s) => {
          useKitchenStore.getState().updateQstoneCatalogItemPrice(s.id, s.priceClp);
        });
      } catch (e) {}
    },

    textures: initial.textures,

    addTexture: (textureData) => {
      const newId = `tex-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newTex: CustomTextureItem = {
        ...textureData,
        id: newId,
        createdAt: new Date().toISOString().split('T')[0],
        approvalStatus: textureData.approvalStatus || 'approved'
      };
      const currentTextures = [newTex, ...get().textures];
      const supItem = textureToSupplyItem(newTex);
      const currentSupplies = [supItem, ...get().supplies.filter((s) => s.id !== supItem.id && s.code !== supItem.code)];
      persist({ textures: currentTextures, supplies: currentSupplies });
      syncTextureToKitchenStore(newTex);
      return newId;
    },

    updateTexture: (id, updates) => {
      const currentTextures = get().textures.map((t) => (t.id === id ? { ...t, ...updates } : t));
      const target = currentTextures.find((t) => t.id === id);
      let currentSupplies = get().supplies;
      if (target) {
        const supItem = textureToSupplyItem(target);
        currentSupplies = currentSupplies.map((s) => (s.id === `sup-${id}` || s.code === target.code ? { ...s, ...supItem } : s));
      }
      persist({ textures: currentTextures, supplies: currentSupplies });
      if (target) syncTextureToKitchenStore(target);
    },

    toggleTextureActive: (id) => {
      const currentTextures = get().textures.map((t) => (t.id === id ? { ...t, active: !t.active } : t));
      persist({ textures: currentTextures });
      const updated = currentTextures.find((t) => t.id === id);
      if (updated) syncTextureToKitchenStore(updated);
    },

    approveTexture: (id) => {
      const currentTextures = get().textures.map((t) =>
        t.id === id ? { ...t, approvalStatus: 'approved' as const, active: true, rejectionReason: undefined } : t
      );
      persist({ textures: currentTextures });
      const updated = currentTextures.find((t) => t.id === id);
      if (updated) syncTextureToKitchenStore(updated);
    },

    rejectTexture: (id, reason) => {
      const currentTextures = get().textures.map((t) =>
        t.id === id ? { ...t, approvalStatus: 'rejected' as const, active: false, rejectionReason: reason } : t
      );
      persist({ textures: currentTextures });
      try {
        useKitchenStore.getState().removeQstoneCatalogItem(id);
      } catch (e) {}
    },

    deleteTexture: (id) => {
      const currentTextures = get().textures.filter((t) => t.id !== id);
      const currentSupplies = get().supplies.filter((s) => s.id !== `sup-${id}`);
      persist({ textures: currentTextures, supplies: currentSupplies });
      try {
        useKitchenStore.getState().removeQstoneCatalogItem(id);
      } catch (e) {}
    },

    resetTexturesToDefault: () => {
      const defaultSuppliesMerged = mergeTexturesIntoSupplies(DEFAULT_SUPPLIES, DEFAULT_CUSTOM_TEXTURES);
      persist({ textures: DEFAULT_CUSTOM_TEXTURES, supplies: defaultSuppliesMerged });
      try {
        DEFAULT_CUSTOM_TEXTURES.forEach(syncTextureToKitchenStore);
      } catch (e) {}
    },

    // Tarifas de Manufactura B2B
    manufacturingRates: initial.manufacturingRates || DEFAULT_MANUFACTURING_RATES,
    updateManufacturingRates: (updates) => {
      const current = get().manufacturingRates;
      persist({ manufacturingRates: { ...current, ...updates } });
    },
    resetManufacturingRates: () => {
      persist({ manufacturingRates: DEFAULT_MANUFACTURING_RATES });
    },
  };
});

// Sincronización diferida inicial de texturas aprobadas con el catálogo de cubiertas
if (typeof window !== 'undefined') {
  setTimeout(() => {
    try {
      const storedTextures = useAdminStore.getState().textures || [];
      storedTextures.forEach(syncTextureToKitchenStore);
    } catch (e) {}
  }, 150);
}
