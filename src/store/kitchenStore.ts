import { create } from 'zustand';
import { RoomConfig, getPresetRoomVertices, generateWallsFromRoom } from '../utils/roomGeometry';
import { constrainInsideRoomAndWalls, repositionCabinetsOnRoomChange } from '../utils/kitchenCollision';

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
  | 'place_wall' 
  | 'place_wall_1_door'
  | 'place_wall_2_doors'
  | 'place_wall_lift_up'
  | 'place_wall_lift_up_double'
  | 'place_wall_microwave_niche'
  | 'place_wall_open'
  | 'place_tall' 
  | 'place_tall_1_door'
  | 'place_tall_split_2_doors'
  | 'place_tall_oven_micro'
  | 'place_tall_microwave_niche'
  | 'place_tall_open'
  | 'place_tall_2_doors'
  | 'place_island' 
  | 'place_deco_stove'
  | 'place_deco_fridge'
  | 'place_deco_hood'
  | 'place_deco_plant'
  | 'move_active';

export interface WallType {
  id: string;
  start: [number, number];
  end: [number, number];
  thickness: number;
  height: number;
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

interface KitchenState {
  viewMode: ViewMode;
  toolMode: ToolMode;
  walls: WallType[];
  cabinets: CabinetType[];
  activeCabinetId: string | null;
  showSocle: boolean;
  drawingStart: [number, number] | null;
  isRoomPlannerOpen: boolean;
  roomConfig: RoomConfig;
  wallColor: string;
  floorType: string;

  setViewMode: (mode: ViewMode) => void;
  setToolMode: (mode: ToolMode) => void;
  addWall: (wall: WallType) => void;
  setWalls: (walls: WallType[]) => void;
  addCabinet: (cabinet: CabinetType) => void;
  removeCabinet: (id: string) => void;
  setActiveCabinet: (id: string | null) => void;
  setDrawingStart: (pos: [number, number] | null) => void;
  setShowSocle: (val: boolean) => void;
  updateCabinet: (id: string, updates: Partial<CabinetType>) => void;
  setRoomPlannerOpen: (open: boolean) => void;
  setRoomConfig: (config: RoomConfig) => void;
  setWallColor: (color: string) => void;
  setFloorType: (floorType: string) => void;
  applyGlobalTexture: (part: 'structure' | 'doors' | 'drawerFronts' | 'drawerInner' | 'shelves' | 'back' | 'socle' | 'all', url: string, mat: 'melamina' | 'hpl') => void;
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

  // If height changed and position wasn't explicitly overridden, recalculate Y so it never separates from floor
  if (updates.height !== undefined && (!updates.position || updates.position[1] === undefined)) {
    const newHeight = updates.height;
    if (updatedTarget.type === 'base' || updatedTarget.type === 'tall' || updatedTarget.type === 'island') {
      updatedTarget.position = [updatedTarget.position[0], newHeight / 2, updatedTarget.position[2]];
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
  drawingStart: null,
  isRoomPlannerOpen: false,
  roomConfig: initialRoomConfig,
  wallColor: '#E2E8F0',
  floorType: 'ceramic_white_60x60',

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
        roomPoly
      );
      return { cabinets: [...state.cabinets, { ...cabinet, position: constrainedPos }] };
    }),
  removeCabinet: (id) =>
    set((state) => ({
      cabinets: state.cabinets.filter((c) => c.id !== id),
      activeCabinetId: state.activeCabinetId === id ? null : state.activeCabinetId,
    })),
  setActiveCabinet: (id) => set({ activeCabinetId: id }),
  setDrawingStart: (pos) => set({ drawingStart: pos }),
  setShowSocle: (val) => set({ showSocle: val }),
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
          roomPoly
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
      drawingStart: null,
    });
  },
}));
