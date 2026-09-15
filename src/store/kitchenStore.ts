import { create } from 'zustand';
import { RoomConfig, getPresetRoomVertices, generateWallsFromRoom } from '../utils/roomGeometry';
import { constrainInsideRoomAndWalls, repositionCabinetsOnRoomChange, resolveCabinetsAgainstPillars } from '../utils/kitchenCollision';
import { 
  CountertopConfig, 
  DEFAULT_COUNTERTOP_CONFIG, 
  QstoneProductItem, 
  DEFAULT_QSTONE_CATALOG, 
  SinkModelId, 
  CooktopModelId,
  QSTONE_SINKS,
  FDV_COOKTOPS,
  IslandBackConfig,
  DEFAULT_ISLAND_BACK_CONFIG
} from '../types/countertop';

export type { IslandBackConfig };
export { DEFAULT_ISLAND_BACK_CONFIG };


export type GolaSystem = 'none' | 'aluminum' | 'black';

export type ViewMode = '2d' | '3d';
export type ToolMode = 
  | 'select' 
  | 'draw_wall' 
  | 'place_base_1_door' 
  | 'place_base_2_doors' 
  | 'place_base_1_door_1_drawer' 
  | 'place_base_4_drawers' 
  | 'place_base_2_pot_drawers' 
  | 'place_base_spice_rack' 
  | 'place_base_corner_blind' 
  | 'place_base_wine_rack'
  | 'place_wall' 
  | 'place_wall_1_door'
  | 'place_wall_2_doors'
  | 'place_wall_lift_up'
  | 'place_wall_lift_up_double'
  | 'place_wall_microwave_niche'
  | 'place_wall_open'
  | 'place_wall_corner_blind'
  | 'place_wall_wine_rack'
  | 'place_tall' 
  | 'place_tall_1_door'
  | 'place_tall_split_2_doors'
  | 'place_tall_oven_micro'
  | 'place_tall_microwave_niche'
  | 'place_tall_open'
  | 'place_tall_2_doors'
  | 'place_tall_wine_rack'
  | 'place_island' 
  | 'place_island_wine_rack'
  | 'place_deco_stove'
  | 'place_deco_fridge'
  | 'place_deco_hood'
  | 'place_deco_plant'
  | 'place_arch_door'
  | 'place_arch_window'
  | 'place_arch_pillar'
  | 'move_active';

export interface WallType {
  id: string;
  start: [number, number];
  end: [number, number];
  thickness: number;
  height: number;
}

export interface ArchitecturalElement {
  id: string;
  wallId?: string;
  offset?: number;
  type: 'door' | 'window' | 'pillar';
  name: string;
  width: number;
  height: number;
  depth?: number; // thickness / depth for pillars
  length?: number; // length for pillars / walls
  elevation: number; // height from floor (0 for doors/pillars, e.g. 90 for windows)
  position: [number, number, number]; // [x, y, z]
  rotation: number;
}

export interface CabinetType {
  id: string;
  type: 'base' | 'wall' | 'tall' | 'island' | 'decoration';
  variant?: string;
  width: number;
  height: number;
  depth: number;
  position: [number, number, number];
  rotation: number;
  color: string;
  structureColor?: string;
  doorColor?: string;
  drawerFrontColor?: string;
  drawerInnerColor?: string;
  shelfColor?: string;
  backColor?: string;
  socleColor?: string;
  structureMaterial?: 'melamina' | 'hpl';
  doorMaterial?: 'melamina' | 'hpl';
  drawerFrontMaterial?: 'melamina' | 'hpl';
  drawerInnerMaterial?: 'melamina' | 'hpl';
  shelfMaterial?: 'melamina' | 'hpl';
  backMaterial?: 'melamina' | 'hpl';
  socleMaterial?: 'melamina' | 'hpl';
  grainDirection?: 'vertical' | 'horizontal';
  grainElements?: Record<string, 'vertical' | 'horizontal'>;
  hplBalancer?: boolean;
  isOpen?: boolean;
  openElements?: Record<string, boolean>;
}

export interface GolaIncompatibilityAlert {
  isOpen: boolean;
  regruesoCm: number;
  stoneThicknessCm: number;
  attemptedAction: 'gola' | 'regrueso';
}

export function getCabinetLabel(cab: Partial<CabinetType>, index: number): string {
  if (cab.variant === 'deco_hood') return 'Campana FDV Conic 90';
  if (cab.variant === 'deco_stove') return 'Cocina FDV 90';
  if (cab.variant === 'deco_fridge') return 'Refrigerador SBS 513L';
  if (cab.variant === 'deco_plant') return 'Planta Interior';
  if (cab.variant?.startsWith('wall_corner_blind')) return 'Aéreo Esquinero Ciego';
  if (cab.variant?.startsWith('corner_blind')) return 'Esquinero Ciego';
  if (cab.variant === 'base_wine_rack' || (cab.type === 'base' && cab.variant === 'wine_rack')) return 'Botellero Base';
  if (cab.variant === 'wall_wine_rack' || (cab.type === 'wall' && cab.variant === 'wine_rack')) return 'Botellero Aéreo';
  if (cab.variant === 'tall_wine_rack' || (cab.type === 'tall' && cab.variant === 'wine_rack')) return 'Botellero Despensa';
  if (cab.variant === 'island_wine_rack' || (cab.type === 'island' && cab.variant === 'wine_rack')) return 'Botellero Isla';
  if (cab.variant === 'wine_rack') return 'Botellero';
  if (cab.variant === 'tall_1_door') return 'Despensa 1 Puerta Larga';
  if (cab.variant === 'tall_split_2_doors') return 'Despensa 2 Puertas (Línea Base)';
  if (cab.variant === 'tall_oven_micro') return 'Torre Horno + Micro';
  if (cab.variant === 'tall_microwave_niche') return 'Torre Nicho Micro';
  if (cab.variant === 'tall_open') return 'Despensa Abierta';
  if (cab.variant === 'tall_2_doors') return 'Despensa 2 Puertas';
  if (cab.variant === 'wall_1_door') return 'Aéreo 1 Puerta';
  if (cab.variant === 'wall_2_doors') return 'Aéreo 2 Puertas';
  if (cab.variant === 'wall_lift_up') return 'Aéreo Elevable Aventos';
  if (cab.variant === 'wall_lift_up_double') return 'Aéreo Doble Elevable';
  if (cab.variant === 'wall_microwave_niche') return 'Aéreo Nicho Micro';
  if (cab.variant === 'wall_open') return 'Aéreo Abierto Repisas';
  if (cab.variant === '1_door_1_drawer') return 'Base 1 Pta + 1 Cajón';
  if (cab.variant === '4_drawers') return 'Base 4 Cajones';
  if (cab.variant === '2_pot_drawers') return 'Base 2 Olleros';
  if (cab.variant === 'spice_rack') return 'Base Especiero';
  if (cab.variant === '2_doors') return 'Base 2 Puertas';
  if (cab.variant === '1_door') return 'Base 1 Puerta';
  if (cab.type === 'base') return 'Mueble Base';
  if (cab.type === 'tall') return 'Torre / Despensa';
  if (cab.type === 'wall') return 'Mueble Aéreo';
  if (cab.type === 'island') return 'Isla Cocina';
  return `Módulo ${index + 1}`;
}

interface KitchenState {
  viewMode: ViewMode;
  toolMode: ToolMode;
  walls: WallType[];
  cabinets: CabinetType[];
  activeCabinetId: string | null;
  showSocle: boolean;
  golaSystem: GolaSystem;
  golaIncompatibilityAlert: GolaIncompatibilityAlert | null;
  drawingStart: [number, number] | null;
  isRoomPlannerOpen: boolean;
  roomConfig: RoomConfig;
  wallColor: string;
  floorType: string;
  architecturalElements: ArchitecturalElement[];
  activeArchElementId: string | null;
  draggingArchElementId: string | null;
  draggingCabinetId: string | null;
  countertopConfig: CountertopConfig;
  islandBackConfig: IslandBackConfig;
  qstoneCatalog: QstoneProductItem[];

  setViewMode: (mode: ViewMode) => void;
  setToolMode: (mode: ToolMode) => void;
  addWall: (wall: WallType) => void;
  setWalls: (walls: WallType[]) => void;
  addCabinet: (cabinet: CabinetType) => void;
  removeCabinet: (id: string) => void;
  setActiveCabinet: (id: string | null) => void;
  addArchitecturalElement: (el: ArchitecturalElement) => void;
  updateArchitecturalElement: (id: string, updates: Partial<ArchitecturalElement>) => void;
  removeArchitecturalElement: (id: string) => void;
  setActiveArchElement: (id: string | null) => void;
  setDraggingArchElementId: (id: string | null) => void;
  setDraggingCabinetId: (id: string | null) => void;
  setDrawingStart: (pos: [number, number] | null) => void;
  setShowSocle: (val: boolean) => void;
  setGolaSystem: (system: GolaSystem) => void;
  setGolaIncompatibilityAlert: (alert: GolaIncompatibilityAlert | null) => void;
  updateCabinet: (id: string, updates: Partial<CabinetType>) => void;
  setRoomPlannerOpen: (open: boolean) => void;
  setRoomConfig: (config: RoomConfig) => void;
  setWallColor: (color: string) => void;
  setFloorType: (floorType: string) => void;
  applyGlobalTexture: (part: 'structure' | 'doors' | 'drawerFronts' | 'drawerInner' | 'shelves' | 'back' | 'socle' | 'islandBack' | 'all', url: string, mat: 'melamina' | 'hpl') => void;
  setCountertopConfig: (config: Partial<CountertopConfig>) => void;
  setIslandBackConfig: (updates: Partial<IslandBackConfig>) => void;
  setCountertopSink: (model: SinkModelId, cabinetId?: string | null) => { success: boolean; error?: string };
  setCountertopCooktop: (model: CooktopModelId, cabinetId?: string | null) => { success: boolean; error?: string };
  updateQstoneCatalogItemPrice: (id: string, priceM2Clp: number) => void;
  addQstoneCatalogItem: (item: QstoneProductItem) => void;
  updateQstoneCatalogItem: (id: string, updates: Partial<QstoneProductItem>) => void;
  removeQstoneCatalogItem: (id: string) => void;
  validateCabinetForSink: (cab: CabinetType, sinkModel: SinkModelId) => { valid: boolean; minWidth: number; actualWidth: number; reason?: string };
  validateCabinetForCooktop: (cab: CabinetType, cooktopModel: CooktopModelId) => { valid: boolean; minWidth: number; actualWidth: number; reason?: string };
  resetKitchen: () => void;
}

function resolveCabinetsWithResize(
  cabinets: CabinetType[],
  targetId: string,
  updates: Partial<CabinetType>
): CabinetType[] {
  const targetIndex = cabinets.findIndex((c) => c.id === targetId);
  if (targetIndex === -1) return cabinets;

  const target = cabinets[targetIndex];
  const nextCabinets = cabinets.map((c) => ({ ...c }));
  const updatedTarget = nextCabinets.find((c) => c.id === targetId)!;
  
  // Apply direct updates
  Object.assign(updatedTarget, updates);

  // Helper to get left and right flanks in XZ
  const getFlanks = (cab: CabinetType) => {
    const cCos = Math.cos(cab.rotation || 0);
    const cSin = Math.sin(cab.rotation || 0);
    const left: [number, number] = [
      cab.position[0] - (cab.width / 2) * cCos,
      cab.position[2] - (cab.width / 2) * cSin,
    ];
    const right: [number, number] = [
      cab.position[0] + (cab.width / 2) * cCos,
      cab.position[2] + (cab.width / 2) * cSin,
    ];
    return { left, right };
  };

  const dist = (p1: [number, number], p2: [number, number]) => Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);

  // Find left neighbor of a cabinet
  const findLeftNeighbor = (cab: CabinetType, list: CabinetType[]) => {
    const { left } = getFlanks(cab);
    return list.find((other) => {
      if (other.id === cab.id) return false;
      if (Math.abs(other.position[1] - cab.position[1]) > 30) return false;
      const otherFlanks = getFlanks(other);
      return dist(left, otherFlanks.right) < 4;
    });
  };

  // Find right neighbor of a cabinet
  const findRightNeighbor = (cab: CabinetType, list: CabinetType[]) => {
    const { right } = getFlanks(cab);
    return list.find((other) => {
      if (other.id === cab.id) return false;
      if (Math.abs(other.position[1] - cab.position[1]) > 30) return false;
      const otherFlanks = getFlanks(other);
      return dist(right, otherFlanks.left) < 4;
    });
  };

  // If height changed and position wasn't explicitly overridden, recalculate Y so it never separates from floor
  if (updates.height !== undefined && (!updates.position || updates.position[1] === undefined)) {
    const newHeight = updates.height;
    if (updatedTarget.type === 'base' || updatedTarget.type === 'tall' || updatedTarget.type === 'island') {
      updatedTarget.position = [updatedTarget.position[0], newHeight / 2, updatedTarget.position[2]];

      // Sincronizar altura de gabinetes contiguos en la misma corrida continua (base o isla) para mantener la cubierta apoyada y plana
      if (updatedTarget.type === 'base' || updatedTarget.type === 'island') {
        const visitedChain = new Set<string>([updatedTarget.id]);
        const queue: CabinetType[] = [updatedTarget];
        while (queue.length > 0) {
          const curr = queue.shift()!;
          const lNeighbor = findLeftNeighbor(curr, nextCabinets);
          if (lNeighbor && (lNeighbor.type === 'base' || lNeighbor.type === 'island') && !visitedChain.has(lNeighbor.id)) {
            visitedChain.add(lNeighbor.id);
            lNeighbor.height = newHeight;
            lNeighbor.position = [lNeighbor.position[0], newHeight / 2, lNeighbor.position[2]];
            queue.push(lNeighbor);
          }
          const rNeighbor = findRightNeighbor(curr, nextCabinets);
          if (rNeighbor && (rNeighbor.type === 'base' || rNeighbor.type === 'island') && !visitedChain.has(rNeighbor.id)) {
            visitedChain.add(rNeighbor.id);
            rNeighbor.height = newHeight;
            rNeighbor.position = [rNeighbor.position[0], newHeight / 2, rNeighbor.position[2]];
            queue.push(rNeighbor);
          }
        }
      }
    } else if (updatedTarget.type === 'wall' || updatedTarget.variant === 'deco_hood') {
      const currentBottom = target.position[1] - target.height / 2;
      updatedTarget.position = [updatedTarget.position[0], currentBottom + newHeight / 2, updatedTarget.position[2]];
    }
  }

  // If width is NOT changing, return updated list
  if (updates.width === undefined || updates.width === target.width) {
    return nextCabinets;
  }

  const oldWidth = target.width;
  const newWidth = updates.width;
  const deltaW = newWidth - oldWidth;

  const rot = target.rotation || 0;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const u: [number, number] = [cos, sin];

  // Build left chain (all continuous neighbors to the left)
  const leftChain: CabinetType[] = [];
  let currL = findLeftNeighbor(target, cabinets);
  const visitedL = new Set<string>();
  while (currL && !visitedL.has(currL.id)) {
    visitedL.add(currL.id);
    leftChain.push(currL);
    currL = findLeftNeighbor(currL, cabinets);
  }

  // Build right chain (all continuous neighbors to the right)
  const rightChain: CabinetType[] = [];
  let currR = findRightNeighbor(target, cabinets);
  const visitedR = new Set<string>();
  while (currR && !visitedR.has(currR.id)) {
    visitedR.add(currR.id);
    rightChain.push(currR);
    currR = findRightNeighbor(currR, cabinets);
  }

  if (leftChain.length > 0 && rightChain.length === 0) {
    // Anchored on left edge, expands cleanly to the right
    updatedTarget.position = [
      updatedTarget.position[0] + (deltaW / 2) * u[0],
      updatedTarget.position[1],
      updatedTarget.position[2] + (deltaW / 2) * u[1],
    ];
  } else if (leftChain.length === 0 && rightChain.length > 0) {
    // Anchored on right edge, expands cleanly to the left
    updatedTarget.position = [
      updatedTarget.position[0] - (deltaW / 2) * u[0],
      updatedTarget.position[1],
      updatedTarget.position[2] - (deltaW / 2) * u[1],
    ];
  } else if (leftChain.length > 0 && rightChain.length > 0) {
    // In the middle of a run: anchored on left, pushes all right neighbors to the right
    updatedTarget.position = [
      updatedTarget.position[0] + (deltaW / 2) * u[0],
      updatedTarget.position[1],
      updatedTarget.position[2] + (deltaW / 2) * u[1],
    ];
    const rightIds = new Set(rightChain.map((c) => c.id));
    for (const cab of nextCabinets) {
      if (rightIds.has(cab.id)) {
        cab.position = [
          cab.position[0] + deltaW * u[0],
          cab.position[1],
          cab.position[2] + deltaW * u[1],
        ];
      }
    }
  } else {
    // Isolated cabinet: adjust if it collides with another cabinet on the same tier
    for (const other of nextCabinets) {
      if (other.id === targetId) continue;
      if (Math.abs(other.position[1] - updatedTarget.position[1]) > 30) continue;
      const dx = other.position[0] - updatedTarget.position[0];
      const dz = other.position[2] - updatedTarget.position[2];
      const distance = Math.hypot(dx, dz);
      const minDistance = (updatedTarget.width + other.width) / 2;
      if (distance < minDistance - 0.5 && distance > 0.01) {
        const overlap = minDistance - distance;
        const pushX = (dx / distance) * overlap;
        const pushZ = (dz / distance) * overlap;
        other.position = [other.position[0] + pushX, other.position[1], other.position[2] + pushZ];
      }
    }
  }

  return nextCabinets;
}

const initialRoomConfig: RoomConfig = {
  type: 'rectangular',
  wallHeight: 250,
  wallThickness: 20,
  vertices: getPresetRoomVertices('rectangular'),
};

const initialWalls = generateWallsFromRoom(initialRoomConfig);

export const useKitchenStore = create<KitchenState>((set) => ({
  viewMode: '3d',
  toolMode: 'select',
  walls: initialWalls,
  cabinets: [],
  activeCabinetId: null,
  showSocle: false,
  golaSystem: 'none',
  drawingStart: null,
  isRoomPlannerOpen: false,
  roomConfig: initialRoomConfig,
  wallColor: '#E2E8F0',
  floorType: 'ceramic_white_60x60',
  architecturalElements: [],
  activeArchElementId: null,
  draggingArchElementId: null,
  draggingCabinetId: null,
  countertopConfig: DEFAULT_COUNTERTOP_CONFIG,
  islandBackConfig: DEFAULT_ISLAND_BACK_CONFIG,
  qstoneCatalog: DEFAULT_QSTONE_CATALOG,
  golaIncompatibilityAlert: null,

  setViewMode: (mode) => set({ viewMode: mode }),
  setToolMode: (mode) => set({ toolMode: mode, drawingStart: null }),
  addWall: (wall) => set((state) => ({ walls: [...state.walls, wall] })),
  setWalls: (walls) => set({ walls }),
  addCabinet: (cabinet) =>
    set((state) => {
      const walls = state.walls;
      const roomPoly = state.roomConfig?.vertices?.map((v) => [v.x, v.y] as [number, number]) || [];
      const constrainedPos = constrainInsideRoomAndWalls(
        cabinet.position,
        cabinet.rotation || 0,
        cabinet.width,
        cabinet.depth,
        cabinet.height,
        walls,
        roomPoly,
        state.architecturalElements
      );
      return { cabinets: [...state.cabinets, { ...cabinet, position: constrainedPos }] };
    }),
  removeCabinet: (id) =>
    set((state) => ({
      cabinets: state.cabinets.filter((c) => c.id !== id),
      activeCabinetId: state.activeCabinetId === id ? null : state.activeCabinetId,
    })),
  setActiveCabinet: (id) =>
    set((state) => ({
      activeCabinetId: id,
      activeArchElementId: id ? null : state.activeArchElementId,
    })),
  addArchitecturalElement: (el) =>
    set((state) => {
      const architecturalElements = [...state.architecturalElements, el];
      if (el.type === 'pillar') {
        const roomPoly = state.roomConfig?.vertices?.map((v) => [v.x, v.y] as [number, number]) || [];
        const resolvedCabinets = resolveCabinetsAgainstPillars(state.cabinets, architecturalElements, state.walls, roomPoly);
        return { architecturalElements, cabinets: resolvedCabinets, activeArchElementId: el.id, activeCabinetId: null };
      }
      return { architecturalElements, activeArchElementId: el.id, activeCabinetId: null };
    }),
  updateArchitecturalElement: (id, updates) =>
    set((state) => {
      const architecturalElements = state.architecturalElements.map((el) => {
        if (el.id !== id) return el;
        const merged = { ...el, ...updates };
        if (updates.offset !== undefined && updates.position === undefined) {
          const effectiveWalls = state.walls && state.walls.length > 0 ? state.walls : (state.roomConfig?.vertices && state.roomConfig.vertices.length >= 3 ? state.roomConfig.vertices.map((v, i, arr) => {
             const next = arr[(i + 1) % arr.length];
             return { id: `wall_v_${i}`, start: [v.x, v.y], end: [next.x, next.y], thickness: 20, height: 240 };
          }) : []);
          const wall = effectiveWalls.find((w) => w.id === merged.wallId) || effectiveWalls[0];
          if (wall) {
             const [x1, z1] = wall.start;
             const [x2, z2] = wall.end;
             const wLen = Math.hypot(x2 - x1, z2 - z1);
             if (wLen >= 10) {
               const uX = (x2 - x1) / wLen;
               const uZ = (z2 - z1) / wLen;
               const sClamped = Math.max(merged.width / 2 + 2, Math.min(wLen - merged.width / 2 - 2, updates.offset + wLen / 2));
               const pX = x1 + sClamped * uX;
               const pZ = z1 + sClamped * uZ;
               merged.offset = sClamped - wLen / 2;
               merged.position = [pX, merged.elevation + merged.height / 2, pZ];
               merged.rotation = Math.atan2(x1 - x2, z1 - z2);
             }
          }
        }
        return merged;
      });
      const updatedEl = architecturalElements.find((el) => el.id === id);
      if (updatedEl?.type === 'pillar') {
        const roomPoly = state.roomConfig?.vertices?.map((v) => [v.x, v.y] as [number, number]) || [];
        const resolvedCabinets = resolveCabinetsAgainstPillars(state.cabinets, architecturalElements, state.walls, roomPoly);
        return { architecturalElements, cabinets: resolvedCabinets };
      }
      return { architecturalElements };
    }),
  removeArchitecturalElement: (id) => set((state) => ({
    architecturalElements: state.architecturalElements.filter(el => el.id !== id),
    activeArchElementId: state.activeArchElementId === id ? null : state.activeArchElementId,
    draggingArchElementId: state.draggingArchElementId === id ? null : state.draggingArchElementId
  })),
  setActiveArchElement: (id) =>
    set((state) => ({
      activeArchElementId: id,
      activeCabinetId: id ? null : state.activeCabinetId,
    })),
  setDraggingArchElementId: (id) => set({ draggingArchElementId: id }),
  setDraggingCabinetId: (id) => set({ draggingCabinetId: id }),
  setDrawingStart: (pos) => set({ drawingStart: pos }),
  setShowSocle: (val) => set({ showSocle: val }),
  setGolaIncompatibilityAlert: (alert) => set({ golaIncompatibilityAlert: alert }),
  setGolaSystem: (system) => {
    const state = useKitchenStore.getState();
    if (system !== 'none' && state.countertopConfig.enabled && (state.countertopConfig.regruesoCm || 0) > 0) {
      const prod = state.qstoneCatalog.find((p) => p.id === state.countertopConfig.selectedProductId) || state.qstoneCatalog[0];
      const thicknessCm = (prod?.thicknessMm || 20) / 10;
      const regruesoCm = state.countertopConfig.regruesoCm || 0;
      if (regruesoCm > thicknessCm + 2.0) {
        set({
          golaIncompatibilityAlert: {
            isOpen: true,
            regruesoCm,
            stoneThicknessCm: thicknessCm,
            attemptedAction: 'gola',
          },
        });
        return;
      }
    }
    set({ golaSystem: system });
  },
  updateCabinet: (id, updates) =>
    set((state) => {
      const resolved = resolveCabinetsWithResize(state.cabinets, id, updates);
      const walls = state.walls;
      const roomPoly = state.roomConfig?.vertices?.map((v) => [v.x, v.y] as [number, number]) || [];
      const clamped = resolved.map((c) => ({
        ...c,
        position: constrainInsideRoomAndWalls(
          c.position,
          c.rotation || 0,
          c.width,
          c.depth,
          c.height,
          walls,
          roomPoly,
          state.architecturalElements
        ),
      }));
      return { cabinets: clamped };
    }),
  setRoomPlannerOpen: (open) => set({ isRoomPlannerOpen: open }),
  setRoomConfig: (config) => {
    const generatedWalls = generateWallsFromRoom(config);
    set((state) => {
      const repositionedCabinets = repositionCabinetsOnRoomChange(
        state.cabinets,
        generatedWalls,
        config
      );
      return {
        roomConfig: config,
        walls: generatedWalls,
        cabinets: repositionedCabinets,
      };
    });
  },
  setWallColor: (color) => set({ wallColor: color }),
  setFloorType: (floorType) => set({ floorType }),
  applyGlobalTexture: (part, url, mat) =>
    set((state) => {
      // Si la textura o material corresponde a cuarzo, sinterizado o piedra Qstone de marmolería,
      // DEBE aplicarse ÚNICAMENTE a las cubiertas y nunca a gabinetes/puertas/cajones.
      const isStone =
        (mat as any) === 'cuarzo' ||
        (mat as any) === 'sinterizado' ||
        (mat as any) === 'granito' ||
        (mat as any) === 'marmol' ||
        state.qstoneCatalog.some((p) => p.textureUrl === url || p.id === url);

      if (isStone) {
        const matchedProd =
          state.qstoneCatalog.find((p) => p.textureUrl === url || p.id === url) ||
          state.qstoneCatalog[0];
        if (matchedProd) {
          setTimeout(() => {
            useKitchenStore.getState().setCountertopConfig({
              selectedProductId: matchedProd.id,
              enabled: true,
            });
          }, 0);
        }
        return state; // No modificar gabinetes
      }

      if (part === 'islandBack') {
        return {
          islandBackConfig: {
            ...state.islandBackConfig,
            enabled: true,
            materialType: 'decorative',
            decorativeColor: url,
            decorativeMaterial: mat,
          },
        };
      }
      const updatedCabinets = state.cabinets.map((c) => {
        if (c.type === 'decoration') return c;
        const updates: Partial<CabinetType> = {};
        if (part === 'structure' || part === 'all') {
          updates.structureColor = url;
          updates.structureMaterial = mat;
        }
        if (part === 'doors' || part === 'all') {
          updates.doorColor = url;
          updates.doorMaterial = mat;
        }
        if (part === 'drawerFronts' || part === 'all') {
          updates.drawerFrontColor = url;
          updates.drawerFrontMaterial = mat;
        }
        if (part === 'drawerInner' || part === 'all') {
          updates.drawerInnerColor = url;
          updates.drawerInnerMaterial = mat;
        }
        if (part === 'shelves' || part === 'all') {
          updates.shelfColor = url;
          updates.shelfMaterial = mat;
        }
        if (part === 'back' || part === 'all') {
          updates.backColor = url;
          updates.backMaterial = mat;
        }
        if (part === 'socle' || part === 'all') {
          updates.socleColor = url;
          updates.socleMaterial = mat;
        }
        return { ...c, ...updates };
      });
      return { cabinets: updatedCabinets };
    }),
  setCountertopConfig: (updates) => {
    const state = useKitchenStore.getState();
    const targetProductId = updates.selectedProductId || state.countertopConfig.selectedProductId;
    const prod = state.qstoneCatalog.find((p) => p.id === targetProductId) || state.qstoneCatalog[0];
    const thicknessCm = (prod?.thicknessMm || 20) / 10;
    const targetRegrueso = updates.regruesoCm !== undefined ? updates.regruesoCm : state.countertopConfig.regruesoCm;

    if (state.golaSystem !== 'none' && targetRegrueso > thicknessCm + 2.0) {
      set({
        golaIncompatibilityAlert: {
          isOpen: true,
          regruesoCm: targetRegrueso,
          stoneThicknessCm: thicknessCm,
          attemptedAction: 'regrueso',
        },
      });
      // Aplicar las demás actualizaciones sin modificar regruesoCm incompatible
      const { regruesoCm, ...safeUpdates } = updates;
      set((s) => ({
        countertopConfig: { ...s.countertopConfig, ...safeUpdates },
      }));
      return;
    }
    set((s) => ({
      countertopConfig: { ...s.countertopConfig, ...updates },
    }));
  },
  setIslandBackConfig: (updates) =>
    set((state) => {
      const next = { ...state.islandBackConfig, ...updates };
      // Regla estricta: si es material de cubierta, solo hasta el piso (sin zócalo)
      if (next.materialType === 'countertop') {
        next.heightMode = 'to_floor';
      }
      return { islandBackConfig: next };
    }),
  updateQstoneCatalogItemPrice: (id, priceM2Clp) =>
    set((state) => ({
      qstoneCatalog: state.qstoneCatalog.map((item) =>
        item.id === id ? { ...item, priceM2Clp } : item
      ),
    })),
  addQstoneCatalogItem: (item) =>
    set((state) => ({
      qstoneCatalog: [
        ...state.qstoneCatalog.filter((c) => c.id !== item.id),
        item,
      ],
    })),
  updateQstoneCatalogItem: (id, updates) =>
    set((state) => ({
      qstoneCatalog: state.qstoneCatalog.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    })),
  removeQstoneCatalogItem: (id) =>
    set((state) => ({
      qstoneCatalog: state.qstoneCatalog.filter((item) => item.id !== id),
    })),
  validateCabinetForSink: (cab, sinkModel) => {
    if (sinkModel === 'none') return { valid: true, minWidth: 0, actualWidth: cab.width };
    const spec = QSTONE_SINKS[sinkModel];
    if (!spec) return { valid: true, minWidth: 0, actualWidth: cab.width };

    // ALFA ONEC requires min 80cm, ALFA TWOC requires min 90cm
    const minWidth = spec.minCabinetWidthCm;
    const actualWidth = cab.width;
    const valid = actualWidth >= minWidth;
    return {
      valid,
      minWidth,
      actualWidth,
      reason: valid
        ? undefined
        : `La cubeta ${spec.name} requiere un mueble base de al menos ${minWidth} cm de ancho (Encastre: ${(spec.cutoutWidthMm / 10).toFixed(1)} cm). El mueble seleccionado mide ${actualWidth} cm.`,
    };
  },
  validateCabinetForCooktop: (cab, cooktopModel) => {
    if (cooktopModel === 'none') return { valid: true, minWidth: 0, actualWidth: cab.width };
    const spec = FDV_COOKTOPS[cooktopModel];
    if (!spec) return { valid: true, minWidth: 0, actualWidth: cab.width };

    const minWidth = spec.minCabinetWidthCm;
    const actualWidth = cab.width;
    const valid = actualWidth >= minWidth;
    return {
      valid,
      minWidth,
      actualWidth,
      reason: valid
        ? undefined
        : `La encimera ${spec.name} requiere un mueble de al menos ${minWidth} cm de ancho (Encastre: ${(spec.cutoutWidthMm / 10).toFixed(1)} cm). El mueble seleccionado mide ${actualWidth} cm.`,
    };
  },
  setCountertopSink: (model, cabinetId) => {
    const state = useKitchenStore.getState();
    const targetCabId = cabinetId !== undefined ? cabinetId : state.activeCabinetId;
    if (model === 'none') {
      set((s) => ({
        countertopConfig: { ...s.countertopConfig, sinkModel: 'none', sinkCabinetId: null },
      }));
      return { success: true };
    }
    if (!targetCabId) {
      return { success: false, error: 'Debes seleccionar un mueble base para instalar la cubeta.' };
    }
    const cab = state.cabinets.find((c) => c.id === targetCabId);
    if (!cab || (cab.type !== 'base' && cab.type !== 'island')) {
      return { success: false, error: 'Solo se puede instalar la cubeta en un mueble tipo Base o Isla.' };
    }
    const validation = state.validateCabinetForSink(cab, model);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }
    set((s) => ({
      countertopConfig: { ...s.countertopConfig, sinkModel: model, sinkCabinetId: targetCabId },
    }));
    return { success: true };
  },
  setCountertopCooktop: (model, cabinetId) => {
    const state = useKitchenStore.getState();
    const targetCabId = cabinetId !== undefined ? cabinetId : state.activeCabinetId;
    if (model === 'none') {
      set((s) => ({
        countertopConfig: { ...s.countertopConfig, cooktopModel: 'none', cooktopCabinetId: null },
      }));
      return { success: true };
    }
    if (!targetCabId) {
      return { success: false, error: 'Debes seleccionar un mueble base o isla para situar la encimera.' };
    }
    const cab = state.cabinets.find((c) => c.id === targetCabId);
    if (!cab || (cab.type !== 'base' && cab.type !== 'island')) {
      return { success: false, error: 'Solo se puede instalar la encimera en un mueble tipo Base o Isla.' };
    }
    const validation = state.validateCabinetForCooktop(cab, model);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }
    set((s) => ({
      countertopConfig: { ...s.countertopConfig, cooktopModel: model, cooktopCabinetId: targetCabId },
    }));
    return { success: true };
  },
  resetKitchen: () => {
    const defaultRoom: RoomConfig = {
      type: 'rectangular',
      wallHeight: 250,
      wallThickness: 20,
      vertices: getPresetRoomVertices('rectangular'),
    };
    const defaultWalls = generateWallsFromRoom(defaultRoom);
    set({
      cabinets: [],
      activeCabinetId: null,
      walls: defaultWalls,
      roomConfig: defaultRoom,
      wallColor: '#E2E8F0',
      floorType: 'ceramic_white_60x60',
      toolMode: 'select',
      viewMode: '3d',
      showSocle: false,
      golaSystem: 'none',
      drawingStart: null,
      countertopConfig: DEFAULT_COUNTERTOP_CONFIG,
      islandBackConfig: DEFAULT_ISLAND_BACK_CONFIG,
    });
  },
}));
