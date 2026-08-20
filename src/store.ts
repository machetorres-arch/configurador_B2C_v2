import { create } from 'zustand';

export type MaterialType = 'melamina' | 'hpl';
export type PartType = 'structure' | 'doors' | 'drawerFronts' | 'drawerInner' | 'shelves' | 'back' | 'socle';

export interface TextureItem {
  id: string;
  name: string;
  url: string;
}

export interface ClosetModuleOverrides {
  structureMaterial?: MaterialType;
  structureColor?: string;
  doorMaterial?: MaterialType;
  doorColor?: string;
  drawerFrontMaterial?: MaterialType;
  drawerFrontColor?: string;
  grainDirection?: 'vertical' | 'horizontal';
  isOpen?: boolean;
  openElements?: Record<string, boolean>;
  grainElements?: Record<string, 'vertical' | 'horizontal'>;
  hplBalancer?: boolean;
}

export interface ClosetModule {
  id: string;
  width: number;
  shelves: number;
  drawers: number;
  doors: boolean;
  hasHanger?: boolean;
  innerDrawers?: boolean;
  overrides?: ClosetModuleOverrides;
}

export interface ClosetState {
  height: number;
  depth: number;
  thickness: number;
  
  // Materials & Colors
  structureMaterial: MaterialType;
  structureColor: string;
  doorMaterial: MaterialType;
  doorColor: string;
  drawerFrontMaterial: MaterialType;
  drawerFrontColor: string;
  drawerInnerMaterial: MaterialType;
  drawerInnerColor: string;
  shelfMaterial: MaterialType;
  shelfColor: string;
  socleMaterial: MaterialType;
  socleColor: string;
  backColor: string;
  hplInnerFace: 'blanco' | 'color'; // only applies if a part is HPL

  edgeBandingThicknessCabinets: 0.5 | 1.0 | 1.5 | 2.0;
  edgeBandingThicknessFronts: 0.5 | 1.0 | 1.5 | 2.0;

  showTopWall: boolean;
  showBottomWall: boolean;
  hplBalancer: boolean;
  setHplBalancer: (val: boolean) => void;
  showLeftWall: boolean;
  showRightWall: boolean;
  showBackWall: boolean;
  showSocle: boolean;
  showLegs: boolean;
  showDimensions: boolean;
  dimensionLevel: number;
  showDecorations: boolean;
  isTransparent: boolean;
  
  drawerHardware: 'Provelcar' | 'Hafele';
  assemblyType: 'spax' | 'minifix';
  drawerAssemblyType: 'spax' | 'minifix';
  
  modules: ClosetModule[];
  activeModuleId: string | null;
  savedDesigns: string[];
  isPrinting: boolean;

  targetPart: PartType;
  setTargetPart: (part: PartType) => void;
  applyTextureToTarget: (textureUrl: string) => void;
  
  customTextures: TextureItem[];
  setCustomTextures: (textures: TextureItem[]) => void;
  
  setHeight: (h: number) => void;
  setDepth: (d: number) => void;
  setThickness: (t: number) => void;
  
  setStructureMaterial: (m: MaterialType) => void;
  setStructureColor: (c: string) => void;
  setDoorMaterial: (m: MaterialType) => void;
  setDoorColor: (c: string) => void;
  setDrawerFrontMaterial: (m: MaterialType) => void;
  setDrawerFrontColor: (c: string) => void;
  setDrawerInnerMaterial: (m: MaterialType) => void;
  setDrawerInnerColor: (c: string) => void;
  setShelfMaterial: (m: MaterialType) => void;
  setShelfColor: (c: string) => void;
  setSocleMaterial: (m: MaterialType) => void;
  setSocleColor: (c: string) => void;
  setBackColor: (c: string) => void;
  setHplInnerFace: (f: 'blanco' | 'color') => void;
  setEdgeBandingThicknessCabinets: (t: 0.5 | 1.0 | 1.5 | 2.0) => void;
  setEdgeBandingThicknessFronts: (t: 0.5 | 1.0 | 1.5 | 2.0) => void;

  toggleTopWall: () => void;
  toggleBottomWall: () => void;
  toggleLeftWall: () => void;
  toggleRightWall: () => void;
  toggleBackWall: () => void;
  toggleSocle: () => void;
  toggleLegs: () => void;
  toggleDimensions: () => void;
  setDimensionLevel: (l: number) => void;
  toggleDecorations: () => void;
  toggleTransparent: () => void;
  
  setDrawerHardware: (type: 'Provelcar' | 'Hafele') => void;
  setAssemblyType: (type: 'spax' | 'minifix') => void;
  setDrawerAssemblyType: (type: 'spax' | 'minifix') => void;
  
  addModule: () => void;
  updateModule: (id: string, updates: Partial<ClosetModule>) => void;
  updateModuleOverrides: (id: string, overrides: Partial<ClosetModuleOverrides> | null) => void;
  removeModule: (id: string) => void;
  setActiveModule: (id: string | null) => void;
  
  saveDesign: (name: string) => void;
  loadDesign: (name: string) => void;
  setIsPrinting: (val: boolean) => void;
}

const defaultModule: ClosetModule = {
  id: 'mod-1',
  width: 60,
  shelves: 2,
  drawers: 2,
  doors: false,
  hasHanger: true,
  innerDrawers: false
};

const getSavedDesigns = () => {
  const designs = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('closet-design-')) {
      designs.push(key.replace('closet-design-', ''));
    }
  }
  return designs;
};

export const useStore = create<ClosetState>((set, get) => ({
  height: 200,
  depth: 60,
  thickness: 1.5,
  
  structureMaterial: 'melamina',
  structureColor: '#ffffff',
  doorMaterial: 'melamina',
  doorColor: '#e5e7eb',
  drawerFrontMaterial: 'melamina',
  drawerFrontColor: '#e5e7eb',
  drawerInnerMaterial: 'melamina',
  drawerInnerColor: '#ffffff',
  shelfMaterial: 'melamina',
  shelfColor: '#ffffff',
  socleMaterial: 'melamina',
  socleColor: '#ffffff',
  backColor: '#f3f4f6',
  hplInnerFace: 'blanco',
  edgeBandingThicknessCabinets: 1.0,
  edgeBandingThicknessFronts: 1.0,

  showTopWall: true,
  showBottomWall: true,
  hplBalancer: true,
  showLeftWall: true,
  showRightWall: true,
  showBackWall: true,
  showSocle: true,
  showLegs: false,
  showDimensions: true,
  dimensionLevel: 2,
  showDecorations: true,
  isTransparent: false,
  
  drawerHardware: 'Provelcar',
  assemblyType: 'minifix',
  drawerAssemblyType: 'minifix',
  
  modules: [defaultModule],
  activeModuleId: defaultModule.id,
  savedDesigns: getSavedDesigns(),
  isPrinting: false,

  targetPart: 'structure',
  setTargetPart: (part) => set({ targetPart: part }),
  applyTextureToTarget: (textureUrl) => set((state) => {
    switch(state.targetPart) {
      case 'structure': return { structureColor: textureUrl };
      case 'doors': return { doorColor: textureUrl };
      case 'drawerFronts': return { drawerFrontColor: textureUrl };
      case 'drawerInner': return { drawerInnerColor: textureUrl };
      case 'shelves': return { shelfColor: textureUrl };
      case 'back': return { backColor: textureUrl };
      case 'socle': return { socleColor: textureUrl };
      default: return state;
    }
  }),
  
  customTextures: [],
  setCustomTextures: (textures) => set({ customTextures: textures }),
  
  setHeight: (height) => set({ height }),
  setDepth: (depth) => set({ depth }),
  setThickness: (thickness) => set({ thickness }),
  
  setStructureMaterial: (m) => set({ structureMaterial: m }),
  setStructureColor: (c) => set({ structureColor: c }),
  setDoorMaterial: (m) => set({ doorMaterial: m }),
  setDoorColor: (c) => set({ doorColor: c }),
  setDrawerFrontMaterial: (m) => set({ drawerFrontMaterial: m }),
  setDrawerFrontColor: (c) => set({ drawerFrontColor: c }),
  setDrawerInnerMaterial: (m) => set({ drawerInnerMaterial: m }),
  setDrawerInnerColor: (c) => set({ drawerInnerColor: c }),
  setShelfMaterial: (m) => set({ shelfMaterial: m }),
  setShelfColor: (c) => set({ shelfColor: c }),
  setSocleMaterial: (m) => set({ socleMaterial: m }),
  setSocleColor: (c) => set({ socleColor: c }),
  setBackColor: (c) => set({ backColor: c }),
  setHplInnerFace: (f) => set({ hplInnerFace: f }),
  setEdgeBandingThicknessCabinets: (t) => set({ edgeBandingThicknessCabinets: t }),
  setEdgeBandingThicknessFronts: (t) => set({ edgeBandingThicknessFronts: t }),

  toggleTopWall: () => set((state) => ({ showTopWall: !state.showTopWall })),
  toggleBottomWall: () => set((state) => ({ showBottomWall: !state.showBottomWall })),
  setHplBalancer: (val) => set({ hplBalancer: val }),
  toggleLeftWall: () => set((state) => ({ showLeftWall: !state.showLeftWall })),
  toggleRightWall: () => set((state) => ({ showRightWall: !state.showRightWall })),
  toggleBackWall: () => set((state) => ({ showBackWall: !state.showBackWall })),
  toggleSocle: () => set((state) => ({ showSocle: !state.showSocle })),
  toggleLegs: () => set((state) => ({ showLegs: !state.showLegs })),
  toggleDimensions: () => set((state) => ({ showDimensions: !state.showDimensions })),
  setDimensionLevel: (dimensionLevel) => set({ dimensionLevel }),
  toggleDecorations: () => set((state) => ({ showDecorations: !state.showDecorations })),
  toggleTransparent: () => set((state) => ({ isTransparent: !state.isTransparent })),
  
  setDrawerHardware: (type) => set({ drawerHardware: type }),
  setAssemblyType: (type) => set({ assemblyType: type }),
  setDrawerAssemblyType: (type) => set({ drawerAssemblyType: type }),
  
  addModule: () => set((state) => {
    const newId = `mod-${Date.now()}`;
    return {
      modules: [...state.modules, { ...defaultModule, id: newId }],
      activeModuleId: newId
    };
  }),
  
  updateModule: (id, updates) => set((state) => ({
    modules: state.modules.map(m => m.id === id ? { ...m, ...updates } : m)
  })),
  
  updateModuleOverrides: (id, overrides) => set((state) => ({
    modules: state.modules.map(m => m.id === id ? { 
      ...m, 
      overrides: overrides === null ? undefined : { ...(m.overrides || {}), ...overrides } 
    } : m)
  })),
  
  removeModule: (id) => set((state) => {
    const newModules = state.modules.filter(m => m.id !== id);
    return {
      modules: newModules,
      activeModuleId: state.activeModuleId === id ? (newModules[0]?.id || null) : state.activeModuleId
    };
  }),
  
  setActiveModule: (id) => set({ activeModuleId: id }),
  
  saveDesign: (name) => set((state) => {
    const design = {
      height: state.height,
      depth: state.depth,
      thickness: state.thickness,
      structureMaterial: state.structureMaterial,
      structureColor: state.structureColor,
      doorMaterial: state.doorMaterial,
      doorColor: state.doorColor,
      drawerFrontMaterial: state.drawerFrontMaterial,
      drawerFrontColor: state.drawerFrontColor,
      drawerInnerMaterial: state.drawerInnerMaterial,
      drawerInnerColor: state.drawerInnerColor,
      shelfMaterial: state.shelfMaterial,
      shelfColor: state.shelfColor,
      socleMaterial: state.socleMaterial,
      socleColor: state.socleColor,
      backColor: state.backColor,
      hplInnerFace: state.hplInnerFace,
      edgeBandingThicknessCabinets: state.edgeBandingThicknessCabinets,
      edgeBandingThicknessFronts: state.edgeBandingThicknessFronts,
      showTopWall: state.showTopWall,
      showBottomWall: state.showBottomWall,
      hplBalancer: state.hplBalancer,
      showLeftWall: state.showLeftWall,
      showRightWall: state.showRightWall,
      showBackWall: state.showBackWall,
      showSocle: state.showSocle,
      showLegs: state.showLegs,
      drawerHardware: state.drawerHardware,
      assemblyType: state.assemblyType,
      drawerAssemblyType: state.drawerAssemblyType,
      modules: state.modules
    };
    localStorage.setItem(`closet-design-${name}`, JSON.stringify(design));
    return { savedDesigns: getSavedDesigns() };
  }),
  
  loadDesign: (name) => set((state) => {
    const saved = localStorage.getItem(`closet-design-${name}`);
    if (saved) {
      const design = JSON.parse(saved);
      return {
        ...design,
        activeModuleId: design.modules[0]?.id || null
      };
    }
    return state;
  }),
  
  setIsPrinting: (val) => set({ isPrinting: val })
}));
