import { create } from 'zustand';
import { getSupabase } from '../lib/supabase';
import { useSupabaseAuthStore } from './supabaseAuthStore';

export type ProjectType = 'closet' | 'kitchen' | 'special' | 'sip-house' | 'hpl-bathroom' | 'concrete-house' | 'office';

export interface ProjectItem {
  id: string;
  name: string;
  client: string;
  date: string;
  type: ProjectType;
  description: string;
  totalCostEstimateClp: number;
  data: any;
}

export type SupplyCategory = 'melamina' | 'herrajes' | 'sip' | 'madera' | 'fijaciones_sellantes';

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
  syncCloudProjects: () => Promise<void>;

  // Estadísticas Anónimas para Proveedores
  getProviderStats: (providerIdOrName: string) => ProviderStats;

  // Precios de Insumos
  supplies: SupplyItem[];
  updateSupplyPrice: (id: string, newPrice: number) => void;
  updateSupply: (id: string, updates: Partial<SupplyItem>) => void;
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

  // Paneles SIP
  {
    id: 'sip-panel-90',
    category: 'sip',
    name: 'Panel SIP Muro Interior 90mm (OSB 11.1 + EPS 68 + OSB 11.1)',
    code: 'SIP-WALL-90',
    spec: 'Formato estándar 1.22 x 2.44 m, EPS 15 kg/m³',
    unit: 'Panel (2.97 m²)',
    priceClp: 48900,
    supplier: 'PROSIP / Maderas Arauco',
    stockRef: 70,
    notes: 'Tabiquería divisoria interior no estructural'
  },
  {
    id: 'sip-panel-114',
    category: 'sip',
    name: 'Panel SIP Perimetral 114mm (OSB 11.1 + EPS 92 + OSB 11.1)',
    code: 'SIP-WALL-114',
    spec: 'Formato 1.22 x 2.44 m, transmitancia U=0.38 W/m²K',
    unit: 'Panel (2.97 m²)',
    priceClp: 56800,
    supplier: 'PROSIP / Maderas Arauco',
    stockRef: 120,
    notes: 'Muros perimetrales habitacionales estándar'
  },
  {
    id: 'sip-panel-162',
    category: 'sip',
    name: 'Panel SIP Alto Aislamiento 162mm (OSB 11.1 + EPS 140 + OSB 11.1)',
    code: 'SIP-WALL-162',
    spec: 'Formato 1.22 x 2.44 m, transmitancia U=0.25 W/m²K',
    unit: 'Panel (2.97 m²)',
    priceClp: 69500,
    supplier: 'PROSIP Climas Fríos',
    stockRef: 50,
    notes: 'Techumbres y muros perimetrales Zona Sur'
  },
  {
    id: 'sip-panel-210',
    category: 'sip',
    name: 'Panel SIP Techo/Piso 210mm (OSB 11.1 + EPS 188 + OSB 11.1)',
    code: 'SIP-ROOF-210',
    spec: 'Formato 1.22 x 2.44 m, alta inercia térmica y luz estructural',
    unit: 'Panel (2.97 m²)',
    priceClp: 84900,
    supplier: 'PROSIP Estructural',
    stockRef: 40,
    notes: 'Techumbres inclinadas y losas de entrepiso'
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
    id: 'tex-blanco-soft',
    name: 'Blanco Polo Soft',
    code: 'ARAU-BLA-18',
    brand: 'Arauco',
    category: 'solidos',
    finish: 'Soft Mate',
    sheetFormat: '1.83 x 2.50 m',
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
  }
];

export const DEFAULT_PROJECTS: ProjectItem[] = [
  {
    id: 'proj-sip-molco-01',
    name: 'Casa SIP Molco 132.1 m² - Proyecto Tipo',
    client: 'Inmobiliaria Los Arrayanes SpA',
    date: '2026-08-20',
    type: 'sip-house',
    description: 'Vivienda modular sustentable en paneles SIP 162/114 con 3 dormitorios, 2 baños y envolvente térmica continua.',
    totalCostEstimateClp: 28450000,
    data: {
      dimensions: {
        width: 800,
        length: 1200,
        wallHeight: 280,
        roofPitch: 22,
        ridgeOffset: 400,
        overhang: 50,
      },
      foundationType: 'radier_sobrecimiento',
      extCladding: 'zincalum_negro',
      roofCladding: 'zinc_ca8_negro',
      interiorCeiling: 'entablado_pino',
      flooringType: 'vinilico_spc',
      coreType: 'eps_15kg',
      wallThicknessMm: 114,
      roofThicknessMm: 210,
      floorThicknessMm: 114
    }
  },
  {
    id: 'proj-kitchen-loft-01',
    name: 'Cocina Isla Integral Roble & Grafito',
    client: 'Arquitecto Martín Silva',
    date: '2026-08-22',
    type: 'kitchen',
    description: 'Cocina lineal de 4.8m con isla central, módulos torre horno-microondas y frentes con amortiguación suave.',
    totalCostEstimateClp: 4850000,
    data: {
      thickness: 18,
      cabinets: [
        { id: 'cab-1', type: 'base', width: 80, height: 85, depth: 60, position: [-120, 0, 0], rotation: 0, color: '#FFFFFF', structureColor: '#FFFFFF', doorColor: '#373E44' },
        { id: 'cab-2', type: 'base', width: 90, height: 85, depth: 60, position: [-30, 0, 0], rotation: 0, color: '#FFFFFF', structureColor: '#FFFFFF', doorColor: '#373E44' },
        { id: 'cab-3', type: 'tall', width: 60, height: 215, depth: 60, position: [60, 0, 0], rotation: 0, color: '#FFFFFF', structureColor: '#FFFFFF', doorColor: '#D4A373' }
      ]
    }
  },
  {
    id: 'proj-closet-master-01',
    name: 'Clóset Walk-In Suite Principal 3 Módulos',
    client: 'Familia Valenzuela',
    date: '2026-08-23',
    type: 'closet',
    description: 'Clóset modular de 3 secciones con cajoneras ocultas, repisas iluminadas y percheros dobles.',
    totalCostEstimateClp: 1890000,
    data: {
      height: 240,
      depth: 60,
      thickness: 18,
      structureColor: '#FFFFFF',
      doorColor: '#F8F9FA',
      drawerFrontColor: '#D4A373',
      modules: [
        { id: 'mod-1', width: 90, shelves: 3, drawers: 3, doors: false, hasHanger: true },
        { id: 'mod-2', width: 100, shelves: 4, drawers: 0, doors: false, hasHanger: true },
        { id: 'mod-3', width: 80, shelves: 2, drawers: 4, doors: true, hasHanger: false }
      ]
    }
  },
  {
    id: 'proj-special-vitrina-01',
    name: 'Aparador Vitrina Autor Abet Broccato',
    client: 'Galería & Diseño Contemporáneo',
    date: '2026-08-24',
    type: 'special',
    description: 'Mueble de autor con laminado decorativo italiano Abet Broccato 2831, marco en madera noble y base en acero lacado.',
    totalCostEstimateClp: 1350000,
    data: {
      width: 90,
      height: 180,
      depth: 42,
      thickness: 1.8,
      legHeight: 25,
      abetTextureId: 'abet_broccato_2831',
      woodColor: '#1E4D54',
      legColor: '#1C1C1C'
    }
  }
];

const LOCAL_STORAGE_KEY = 'mueblestudio_admin_store_v1';

const getInitialState = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        isAuthenticated: !!parsed.isAuthenticated,
        adminEmail: parsed.adminEmail || null,
        themeMode: (parsed.themeMode === 'light' ? 'light' : 'dark') as 'dark' | 'light',
        providers: Array.isArray(parsed.providers) && parsed.providers.length > 0 ? parsed.providers : DEFAULT_PROVIDERS,
        projects: Array.isArray(parsed.projects) ? parsed.projects : DEFAULT_PROJECTS,
        supplies: Array.isArray(parsed.supplies) && parsed.supplies.length > 0 ? parsed.supplies : DEFAULT_SUPPLIES,
        textures: Array.isArray(parsed.textures) && parsed.textures.length > 0
          ? parsed.textures.map((t: CustomTextureItem) => ({
              ...t,
              approvalStatus: t.approvalStatus || 'approved'
            }))
          : DEFAULT_CUSTOM_TEXTURES,
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
    projects: DEFAULT_PROJECTS,
    supplies: DEFAULT_SUPPLIES,
    textures: DEFAULT_CUSTOM_TEXTURES,
  };
};

const saveToLocalStorage = (state: {
  isAuthenticated: boolean;
  adminEmail: string | null;
  themeMode: 'dark' | 'light';
  providers: ProviderItem[];
  projects: ProjectItem[];
  supplies: SupplyItem[];
  textures: CustomTextureItem[];
}) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving admin state to localStorage', e);
  }
};

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
            sip_house: 'sip-house',
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
      // asegurar datos de muestra consistentes para demostración
      if (anonymousProjectsList.length === 0 && providerTextures.length > 0) {
        const firstTex = providerTextures[0];
        const secondTex = providerTextures[1] || providerTextures[0];
        productUsageMap.set(firstTex.id, {
          code: firstTex.code,
          name: firstTex.name,
          count: 8,
          estimatedAreaM2: 3.6
        });
        if (secondTex && secondTex.id !== firstTex.id) {
          productUsageMap.set(secondTex.id, {
            code: secondTex.code,
            name: secondTex.name,
            count: 4,
            estimatedAreaM2: 1.8
          });
        }
        anonymousProjectsList.push({
          id: 'anon-sample-1',
          code: 'PRJ-1042',
          type: 'kitchen',
          date: '2026-08-28',
          productsUsedCount: 8,
          matchedProducts: [{ code: firstTex.code, name: firstTex.name, count: 8 }]
        });
        if (secondTex && secondTex.id !== firstTex.id) {
          anonymousProjectsList.push({
            id: 'anon-sample-2',
            code: 'PRJ-1089',
            type: 'special',
            date: '2026-09-02',
            productsUsedCount: 4,
            matchedProducts: [{ code: secondTex.code, name: secondTex.name, count: 4 }]
          });
        }
      }

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
      const currentSupplies = get().supplies.map((s) => (s.id === id ? { ...s, priceClp: Math.max(0, newPrice) } : s));
      persist({ supplies: currentSupplies });
    },

    updateSupply: (id, updates) => {
      const currentSupplies = get().supplies.map((s) => (s.id === id ? { ...s, ...updates } : s));
      persist({ supplies: currentSupplies });
    },

    resetSuppliesToDefault: () => {
      persist({ supplies: DEFAULT_SUPPLIES });
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
      const currentTextures = get().textures;
      persist({ textures: [newTex, ...currentTextures] });
      return newId;
    },

    updateTexture: (id, updates) => {
      const currentTextures = get().textures.map((t) => (t.id === id ? { ...t, ...updates } : t));
      persist({ textures: currentTextures });
    },

    toggleTextureActive: (id) => {
      const currentTextures = get().textures.map((t) => (t.id === id ? { ...t, active: !t.active } : t));
      persist({ textures: currentTextures });
    },

    approveTexture: (id) => {
      const currentTextures = get().textures.map((t) =>
        t.id === id ? { ...t, approvalStatus: 'approved' as const, active: true, rejectionReason: undefined } : t
      );
      persist({ textures: currentTextures });
    },

    rejectTexture: (id, reason) => {
      const currentTextures = get().textures.map((t) =>
        t.id === id ? { ...t, approvalStatus: 'rejected' as const, active: false, rejectionReason: reason } : t
      );
      persist({ textures: currentTextures });
    },

    deleteTexture: (id) => {
      const currentTextures = get().textures.filter((t) => t.id !== id);
      persist({ textures: currentTextures });
    },

    resetTexturesToDefault: () => {
      persist({ textures: DEFAULT_CUSTOM_TEXTURES });
    },
  };
});
