import { CountertopConfig, QstoneProductItem, DEFAULT_QSTONE_CATALOG, QSTONE_SINKS, FDV_COOKTOPS, IslandBackConfig } from '../types/countertop';
import { CabinetType, ArchitecturalElement } from '../store/kitchenStore';
import { getPillarsBox2D } from './kitchenCollision';

export interface CountertopPiece {
  id: string;
  name: string;
  type: 'slab' | 'apron' | 'backsplash' | 'waterfall';
  lengthMm: number;
  widthMm: number;
  thicknessMm: number;
  areaM2: number;
  edgePolishingM: number;
  notes?: string;
  runId?: string;
  hasCutout?: 'sink' | 'cooktop';
}

export interface NestedPiecePlacement {
  pieceId: string;
  pieceName: string;
  type: 'slab' | 'apron' | 'backsplash' | 'waterfall';
  x: number; // mm from slab left
  y: number; // mm from slab top
  widthMm: number;
  lengthMm: number;
  rotated: boolean;
  slabIndex: number;
  hasCutout?: 'sink' | 'cooktop';
}

export interface SlabLayout {
  slabIndex: number;
  slabWidthMm: number; // 3200
  slabHeightMm: number; // 1600
  pieces: NestedPiecePlacement[];
  usedAreaM2: number;
  efficiencyPercent: number;
  offcutAreaM2: number;
}

export interface ContinuousRunInfo {
  id: string;
  name: string;
  type: 'base' | 'island';
  cabinets: CabinetType[];
  totalLengthMm: number;
  depthMm: number;
  heightMm: number;
  segmentsCount: number;
  segmentLengthsMm: number[];
  buildingType: 'casa' | 'edificio';
  maxTransportLengthMm: number;
  startFlankWorld: [number, number];
  endFlankWorld: [number, number];
  centerWorld: [number, number, number];
  rotation: number;
  canWaterfallLeft: boolean;
  canWaterfallRight: boolean;
  cornerExtensionLeftMm: number;
  cornerExtensionRightMm: number;
  extensionToWallLeftMm?: number;
  extensionToWallRightMm?: number;
}

export interface CountertopBOM {
  pieces: CountertopPiece[];
  totalNetAreaM2: number;
  slabsCount: number;
  slabAreaM2: number;
  grossBilledM2: number;
  efficiencyPercent: number;
  totalLinearEdgeM: number;
  cutouts: {
    type: 'sink' | 'cooktop';
    modelName: string;
    cutoutWidthMm: number;
    cutoutDepthMm: number;
    polished: boolean;
  }[];
  product: QstoneProductItem;
  materialCostClp: number;
  fabricationCostClp: number;
  totalCostClp: number;
  runs: ContinuousRunInfo[];
  slabsLayout: SlabLayout[];
}

/**
 * Determina si un punto de flanco en coordenadas de mundo colisiona o linda directamente
 * con un mueble de despensa (tipo 'tall') o columna/muro alto.
 */
export function isFlankBlockedByTall(
  flankWorld: [number, number],
  allCabinets: CabinetType[],
  toleranceCm = 8
): boolean {
  return allCabinets.some((c) => {
    if (c.type !== 'tall') return false;
    const rot = c.rotation || 0;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    // Three.js: uX = [cos, -sin], uZ = [sin, cos]
    const dx = flankWorld[0] - c.position[0];
    const dz = flankWorld[1] - c.position[2];
    const localX = dx * cos - dz * sin;
    const localZ = dx * sin + dz * cos;
    return (
      Math.abs(localX) <= c.width / 2 + toleranceCm &&
      Math.abs(localZ) <= c.depth / 2 + toleranceCm
    );
  });
}

/**
 * Determina si un flanco linda con otro mueble perpendicular o de esquina
 */
export function isFlankBlockedByAnyCabinet(
  flankWorld: [number, number],
  runCabinetIds: Set<string>,
  allCabinets: CabinetType[],
  toleranceCm = 8
): boolean {
  return allCabinets.some((c) => {
    if (runCabinetIds.has(c.id)) return false;
    if (c.type !== 'base' && c.type !== 'tall') return false;
    const rot = c.rotation || 0;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const dx = flankWorld[0] - c.position[0];
    const dz = flankWorld[1] - c.position[2];
    const localX = dx * cos - dz * sin;
    const localZ = dx * sin + dz * cos;
    return (
      Math.abs(localX) <= c.width / 2 + toleranceCm &&
      Math.abs(localZ) <= c.depth / 2 + toleranceCm
    );
  });
}

/**
 * Determina si un flanco linda directamente con un pilar arquitectónico.
 */
export function isFlankBlockedByPillar(
  flankWorld: [number, number],
  elements: ArchitecturalElement[] = [],
  walls: { id: string; start: [number, number]; end: [number, number]; thickness?: number }[] = [],
  toleranceCm = 8
): boolean {
  if (!elements || elements.length === 0) return false;
  const pillarBoxes = getPillarsBox2D(elements, walls);
  return pillarBoxes.some((pBox) => {
    const dx = flankWorld[0] - pBox.center[0];
    const dz = flankWorld[1] - pBox.center[1];
    const uX = pBox.axes[0];
    const uZ = pBox.axes[1];
    const localX = dx * uX[0] + dz * uX[1];
    const localZ = dx * uZ[0] + dz * uZ[1];
    return (
      Math.abs(localX) <= pBox.width / 2 + toleranceCm &&
      Math.abs(localZ) <= pBox.depth / 2 + toleranceCm
    );
  });
}

/**
 * Calcula la extensión requerida del respaldo en el extremo izquierdo o derecho
 * para cubrir el rincón en encuentros de esquina en L.
 */
export function detectCornerBacksplashExtension(
  flankWorld: [number, number],
  runRot: number,
  isLeftFlank: boolean,
  runCabIds: Set<string>,
  allCabinets: CabinetType[],
  walls: { id: string; start: [number, number]; end: [number, number]; thickness?: number }[] = [],
  architecturalElements: ArchitecturalElement[] = []
): number {
  if (isFlankBlockedByPillar(flankWorld, architecturalElements, walls, 5)) {
    return 0;
  }
  const cos = Math.cos(runRot);
  const sin = Math.sin(runRot);
  // Vector apuntando hacia afuera del extremo de la corrida:
  // Si es flank izquierdo, hacia afuera es [-cos, sin]. Si es derecho, es [cos, -sin].
  const outwardDir: [number, number] = isLeftFlank ? [-cos, sin] : [cos, -sin];

  let rawExtCm = 0;

  // 1. Buscar mueble perpendicular adyacente en este extremo
  for (const other of allCabinets) {
    if (runCabIds.has(other.id)) continue;
    if (other.type !== 'base' && other.type !== 'tall') continue;

    const oRot = other.rotation || 0;
    const dot = Math.cos(oRot - runRot);
    // Perpendicular si el producto punto de ángulos es cercano a 0 (dentro de ~25° de ortogonalidad)
    if (Math.abs(dot) > 0.4) continue;

    const dx = other.position[0] - flankWorld[0];
    const dz = other.position[2] - flankWorld[1];
    const projOutward = dx * outwardDir[0] + dz * outwardDir[1];

    if (projOutward > -12 && projOutward < Math.max(other.width, other.depth) + 25) {
      const distToCab = Math.hypot(dx, dz);
      if (distToCab < Math.max(other.width, other.depth) + 30) {
        rawExtCm = (other.depth || 60) + 2;
        break;
      }
    }
  }

  if (rawExtCm <= 0) return 0;

  // 2. SEGURIDAD Y PRECISIÓN ESTRUCTURAL:
  // Si en la trayectoria de extensión hay un pilar arquitectónico, recortar la extensión
  // para que remate limpiamente contra la cara del pilar sin perforarlo.
  if (architecturalElements && architecturalElements.length > 0) {
    const pillarBoxes = getPillarsBox2D(architecturalElements, walls);
    for (const pBox of pillarBoxes) {
      const uX = pBox.axes[0];
      const uZ = pBox.axes[1];
      for (let t = 2; t <= rawExtCm; t += 2) {
        const ptX = flankWorld[0] + t * outwardDir[0];
        const ptZ = flankWorld[1] + t * outwardDir[1];
        const localX = (ptX - pBox.center[0]) * uX[0] + (ptZ - pBox.center[1]) * uX[1];
        const localZ = (ptX - pBox.center[0]) * uZ[0] + (ptZ - pBox.center[1]) * uZ[1];
        if (
          Math.abs(localX) <= pBox.width / 2 + 1 &&
          Math.abs(localZ) <= pBox.depth / 2 + 1
        ) {
          rawExtCm = Math.max(0, t - 2);
          break;
        }
      }
    }
  }

  return Math.round(rawExtCm * 10);
}

/**
 * Detecta la distancia exacta desde el flanco exterior de la corrida hasta la cara
 * de un muro o pilar arquitectónico frontal/adyacente, permitiendo que la cubierta
 * remate a tope contra el muro/pilar si el usuario activó la opción.
 */
export function getEffectiveWallsFromInputs(
  walls?: { id: string; start: [number, number]; end: [number, number]; thickness?: number; height?: number }[],
  roomConfig?: any
): { id: string; start: [number, number]; end: [number, number]; thickness: number; height?: number }[] {
  if (roomConfig?.vertices && roomConfig.vertices.length >= 3) {
    return roomConfig.vertices.map((v: any, i: number, arr: any[]) => {
      const next = arr[(i + 1) % arr.length];
      return {
        id: `wall_${i}`,
        start: [v.x, v.y] as [number, number],
        end: [next.x, next.y] as [number, number],
        thickness: roomConfig.wallThickness || 20,
        height: roomConfig.wallHeight || 250,
      };
    });
  }
  if (walls && walls.length > 0) {
    return walls.map((w, idx) => ({
      id: w.id || `wall_${idx}`,
      start: w.start,
      end: w.end,
      thickness: w.thickness || 20,
      height: w.height || 250,
    }));
  }
  return [];
}

/**
 * Detecta si el extremo libre de una corrida puede extenderse hacia un muro, pilar arquitectónico
 * o mueble adyacente dentro de una distancia máxima configurable (maxGapCm).
 * Calcula con precisión geométrica el tope exacto contra la cara interior del elemento.
 */
export function detectCountertopExtensionToWallOrPillar(
  flankWorld: [number, number],
  runRot: number,
  isLeftFlank: boolean,
  walls: { id: string; start: [number, number]; end: [number, number]; thickness?: number }[] = [],
  architecturalElements: ArchitecturalElement[] = [],
  maxGapCm = 50,
  roomConfig?: any,
  allCabinets: CabinetType[] = [],
  runCabIds: Set<string> = new Set()
): number {
  const effectiveWalls = getEffectiveWallsFromInputs(walls, roomConfig);
  const cos = Math.cos(runRot);
  const sin = Math.sin(runRot);
  // Vector apuntando hacia afuera del flanco (en plano XZ de Three.js):
  // Local +X rotado por runRot es [cos, -sin] (extremo derecho)
  // Local -X rotado por runRot es [-cos, sin] (extremo izquierdo)
  const outwardDir: [number, number] = isLeftFlank ? [-cos, sin] : [cos, -sin];

  let minGapCm = Infinity;

  // 1. Verificar muros perpendiculares u oblicuos en la trayectoria del rayo
  if (effectiveWalls.length > 0) {
    for (const w of effectiveWalls) {
      const wdx = w.end[0] - w.start[0];
      const wdz = w.end[1] - w.start[1];
      const wLen = Math.hypot(wdx, wdz);
      if (wLen < 5) continue;

      const wallDir: [number, number] = [wdx / wLen, wdz / wLen];

      // Intersección de rayo desde flankWorld a lo largo de outwardDir con la recta del muro:
      // flankWorld + t * outwardDir = w.start + s * wallDir
      const denom = outwardDir[0] * wallDir[1] - outwardDir[1] * wallDir[0];
      if (Math.abs(denom) > 1e-4) {
        const dx = w.start[0] - flankWorld[0];
        const dz = w.start[1] - flankWorld[1];
        const t = (dx * wallDir[1] - dz * wallDir[0]) / denom;
        const s = (dx * outwardDir[1] - dz * outwardDir[0]) / denom;

        const halfThick = (w.thickness || 20) / 2;
        // Distancia neta hasta la cara interior del muro (descontando el semi-espesor proyectado)
        const tFace = t - (halfThick / Math.abs(denom));

        // s es la posición a lo largo del segmento de muro en cm (desde 0 en w.start hasta wLen en w.end).
        // Aceptamos intersecciones dentro de la extensión del muro con margen por su espesor:
        if (tFace > 0.5 && tFace <= maxGapCm && s >= -halfThick && s <= wLen + halfThick) {
          if (tFace < minGapCm) {
            minGapCm = tFace;
          }
        }
      }
    }
  }

  // 2. Verificar pilares arquitectónicos
  if (architecturalElements && architecturalElements.length > 0) {
    const pillarBoxes = getPillarsBox2D(architecturalElements, effectiveWalls);
    for (const pBox of pillarBoxes) {
      const uX = pBox.axes[0];
      const uZ = pBox.axes[1];
      const maxSteps = Math.min(maxGapCm, 300);
      for (let t = 1; t <= maxSteps; t += 1) {
        const ptX = flankWorld[0] + t * outwardDir[0];
        const ptZ = flankWorld[1] + t * outwardDir[1];
        const localX = (ptX - pBox.center[0]) * uX[0] + (ptZ - pBox.center[1]) * uX[1];
        const localZ = (ptX - pBox.center[0]) * uZ[0] + (ptZ - pBox.center[1]) * uZ[1];
        if (
          Math.abs(localX) <= pBox.width / 2 + 0.5 &&
          Math.abs(localZ) <= pBox.depth / 2 + 0.5
        ) {
          if (t < minGapCm) {
            minGapCm = t;
          }
          break;
        }
      }
    }
  }

  // 3. Verificar gabinetes adyacentes a través del vano (ej. vano de lavavajillas o columna)
  if (allCabinets && allCabinets.length > 0) {
    for (const other of allCabinets) {
      if (runCabIds.has(other.id)) continue;
      const otherRot = other.rotation || 0;
      const oCos = Math.cos(otherRot);
      const oSin = Math.sin(otherRot);
      const oWidth = other.width || 60;
      const oDepth = other.depth || 60;
      const oX = other.position[0];
      const oZ = other.position[2];

      const maxSteps = Math.min(maxGapCm, minGapCm === Infinity ? maxGapCm : minGapCm);
      for (let t = 2; t <= maxSteps; t += 2) {
        const ptX = flankWorld[0] + t * outwardDir[0];
        const ptZ = flankWorld[1] + t * outwardDir[1];
        const relX = ptX - oX;
        const relZ = ptZ - oZ;
        const localX = relX * oCos - relZ * oSin;
        const localZ = relX * oSin + relZ * oCos;
        if (Math.abs(localX) <= oWidth / 2 + 0.5 && Math.abs(localZ) <= oDepth / 2 + 0.5) {
          if (t < minGapCm) {
            minGapCm = t;
          }
          break;
        }
      }
    }
  }

  if (minGapCm === Infinity || minGapCm <= 0.5) return 0;
  return Math.round(minGapCm * 10);
}

/**
 * Agrupa gabinetes adyacentes y alineados en corridas continuas (runs).
 */
export function detectContinuousCabinetRuns(
  cabinets: CabinetType[],
  config?: CountertopConfig,
  walls?: { id: string; start: [number, number]; end: [number, number]; thickness?: number }[],
  architecturalElements?: ArchitecturalElement[],
  roomConfig?: any
): ContinuousRunInfo[] {
  const eligible = cabinets.filter(
    (c) => (c.type === 'base' || c.type === 'island') && !c.variant?.startsWith('deco_')
  );
  if (eligible.length === 0) return [];

  const bType = config?.buildingType || 'casa';
  const maxSegmentLengthMm = bType === 'edificio' ? 2000 : 2500;

  const getFlanks = (cab: CabinetType) => {
    const rot = cab.rotation || 0;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    // Three.js: uX = [cos, -sin]
    const left: [number, number] = [
      cab.position[0] - (cab.width / 2) * cos,
      cab.position[2] + (cab.width / 2) * sin,
    ];
    const right: [number, number] = [
      cab.position[0] + (cab.width / 2) * cos,
      cab.position[2] - (cab.width / 2) * sin,
    ];
    return { left, right, rot, cos, sin };
  };

  const dist = (p1: [number, number], p2: [number, number]) =>
    Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);

  const areCollinear = (c1: CabinetType, c2: CabinetType) => {
    if (c1.type !== c2.type) return false;
    const diffRot = Math.abs((c1.rotation || 0) - (c2.rotation || 0));
    const isRotAligned = Math.cos(diffRot) > 0.92;
    const isHeightAligned =
      Math.abs(c1.position[1] + c1.height / 2 - (c2.position[1] + c2.height / 2)) < 5;
    return isRotAligned && isHeightAligned;
  };

  // Encontrar vecino derecho
  const findRightNeighbor = (cab: CabinetType, list: CabinetType[]) => {
    const { right } = getFlanks(cab);
    return list.find((other) => {
      if (other.id === cab.id || !areCollinear(cab, other)) return false;
      const otherFlanks = getFlanks(other);
      return dist(right, otherFlanks.left) < 4.5;
    });
  };

  // Encontrar vecino izquierdo
  const findLeftNeighbor = (cab: CabinetType, list: CabinetType[]) => {
    const { left } = getFlanks(cab);
    return list.find((other) => {
      if (other.id === cab.id || !areCollinear(cab, other)) return false;
      const otherFlanks = getFlanks(other);
      return dist(left, otherFlanks.right) < 4.5;
    });
  };

  const visited = new Set<string>();
  const runs: ContinuousRunInfo[] = [];

  // 1. Identificar cabezas de corrida (gabinetes que no tienen vecino a su izquierda)
  for (const cab of eligible) {
    if (visited.has(cab.id)) continue;
    const leftNeighbor = findLeftNeighbor(cab, eligible);
    if (!leftNeighbor) {
      // Iniciar corrida desde este extremo izquierdo
      const chain: CabinetType[] = [cab];
      visited.add(cab.id);
      let curr = cab;
      while (true) {
        const next = findRightNeighbor(curr, eligible);
        if (next && !visited.has(next.id)) {
          chain.push(next);
          visited.add(next.id);
          curr = next;
        } else {
          break;
        }
      }

      // Procesar esta corrida
      const isIsland = chain[0].type === 'island';
      const overhangFront = 2;
      const overhangRear = isIsland ? (config?.islandOverhangCm ?? 30) : 0;
      const depthMm = ((chain[0].depth || 60) + overhangFront + overhangRear) * 10;
      // Altura exacta de la cara superior de los gabinetes de la corrida (apoyo real sin flotar)
      const cabTopCm = Math.max(
        ...chain.map((c) =>
          c.position ? c.position[1] + c.height / 2 : c.height || 85
        )
      );
      const heightMm = Math.round(cabTopCm * 10);
      const totalLengthMm = Math.round(chain.reduce((acc, c) => acc + c.width * 10, 0));

      const firstFlanks = getFlanks(chain[0]);
      const lastFlanks = getFlanks(chain[chain.length - 1]);
      const runRot = chain[0].rotation || 0;
      const runCabIds = new Set(chain.map((c) => c.id));

      // Detección de bloqueos de cascada
      const isLeftBlockedByTall = isFlankBlockedByTall(firstFlanks.left, cabinets);
      const isLeftBlockedByAny = isFlankBlockedByAnyCabinet(firstFlanks.left, runCabIds, cabinets);
      const isLeftBlockedByPillar = isFlankBlockedByPillar(firstFlanks.left, architecturalElements, walls);
      const isRightBlockedByTall = isFlankBlockedByTall(lastFlanks.right, cabinets);
      const isRightBlockedByAny = isFlankBlockedByAnyCabinet(lastFlanks.right, runCabIds, cabinets);
      const isRightBlockedByPillar = isFlankBlockedByPillar(lastFlanks.right, architecturalElements, walls);

      const canWaterfallLeft = !isLeftBlockedByTall && !isLeftBlockedByAny && !isLeftBlockedByPillar;
      const canWaterfallRight = !isRightBlockedByTall && !isRightBlockedByAny && !isRightBlockedByPillar;

      // Detección de extensión de respaldo en esquinas L
      const cornerExtLeftMm = detectCornerBacksplashExtension(
        firstFlanks.left,
        runRot,
        true,
        runCabIds,
        cabinets,
        walls,
        architecturalElements
      );
      const cornerExtRightMm = detectCornerBacksplashExtension(
        lastFlanks.right,
        runRot,
        false,
        runCabIds,
        cabinets,
        walls,
        architecturalElements
      );

      // Extensión seleccionable por usuario hacia muro o pilar:
      const maxGapCm = config?.extendToWallMaxGapCm ?? 50;
      const shouldExtendLeft = !!config?.extendToWallLeft && (!isIsland || !config?.extendBaseOnly);
      const shouldExtendRight = !!config?.extendToWallRight && (!isIsland || !config?.extendBaseOnly);

      const extWallLeftMm = shouldExtendLeft
        ? detectCountertopExtensionToWallOrPillar(
            firstFlanks.left,
            runRot,
            true,
            walls,
            architecturalElements,
            maxGapCm,
            roomConfig,
            cabinets,
            runCabIds
          )
        : 0;

      const extWallRightMm = shouldExtendRight
        ? detectCountertopExtensionToWallOrPillar(
            lastFlanks.right,
            runRot,
            false,
            walls,
            architecturalElements,
            maxGapCm,
            roomConfig,
            cabinets,
            runCabIds
          )
        : 0;

      // Segmentación según criterio logístico de transporte (Casa <= 2500mm, Edificio <= 2000mm)
      let segmentLengthsMm: number[] = [];
      if (totalLengthMm <= maxSegmentLengthMm) {
        // Un solo tramo continuo entero sin cortes
        segmentLengthsMm = [totalLengthMm];
      } else {
        const numSegs = Math.ceil(totalLengthMm / maxSegmentLengthMm);
        const baseSeg = Math.floor(totalLengthMm / numSegs);
        const remainder = totalLengthMm - baseSeg * numSegs;
        segmentLengthsMm = Array.from({ length: numSegs }, (_, idx) =>
          idx === numSegs - 1 ? baseSeg + remainder : baseSeg
        );
      }

      const runId = `${isIsland ? 'ISL' : 'BASE'}-RUN-${runs.length + 1}`;
      const centerWorld: [number, number, number] = [
        (firstFlanks.left[0] + lastFlanks.right[0]) / 2,
        chain[0].position[1] + chain[0].height / 2,
        (firstFlanks.left[1] + lastFlanks.right[1]) / 2,
      ];

      runs.push({
        id: runId,
        name: `Corrida Continua ${isIsland ? 'Isla' : 'Base'} (${totalLengthMm} mm)`,
        type: isIsland ? 'island' : 'base',
        cabinets: chain,
        totalLengthMm,
        depthMm,
        heightMm,
        segmentsCount: segmentLengthsMm.length,
        segmentLengthsMm,
        buildingType: bType,
        maxTransportLengthMm: maxSegmentLengthMm,
        startFlankWorld: firstFlanks.left,
        endFlankWorld: lastFlanks.right,
        centerWorld,
        rotation: runRot,
        canWaterfallLeft: canWaterfallLeft && extWallLeftMm === 0,
        canWaterfallRight: canWaterfallRight && extWallRightMm === 0,
        cornerExtensionLeftMm: cornerExtLeftMm,
        cornerExtensionRightMm: cornerExtRightMm,
        extensionToWallLeftMm: extWallLeftMm,
        extensionToWallRightMm: extWallRightMm,
      });
    }
  }

  // 2. Gabinetes aislados o en ciclo que no entraron en las cabezas
  for (const cab of eligible) {
    if (visited.has(cab.id)) continue;
    visited.add(cab.id);
    const isIsland = cab.type === 'island';
    const depthMm = ((cab.depth || 60) + 2 + (isIsland ? (config?.islandOverhangCm ?? 30) : 0)) * 10;
    const cabTopCm = cab.position ? cab.position[1] + cab.height / 2 : cab.height || 85;
    const heightMm = Math.round(cabTopCm * 10);
    const totalLengthMm = Math.round(cab.width * 10);
    const flanks = getFlanks(cab);
    const cabRot = cab.rotation || 0;
    const cabIds = new Set([cab.id]);

    const isLeftBlockedByTall = isFlankBlockedByTall(flanks.left, cabinets);
    const isLeftBlockedByAny = isFlankBlockedByAnyCabinet(flanks.left, cabIds, cabinets);
    const isLeftBlockedByPillar = isFlankBlockedByPillar(flanks.left, architecturalElements, walls);
    const isRightBlockedByTall = isFlankBlockedByTall(flanks.right, cabinets);
    const isRightBlockedByAny = isFlankBlockedByAnyCabinet(flanks.right, cabIds, cabinets);
    const isRightBlockedByPillar = isFlankBlockedByPillar(flanks.right, architecturalElements, walls);

    const cornerExtLeftMm = detectCornerBacksplashExtension(
      flanks.left,
      cabRot,
      true,
      cabIds,
      cabinets,
      walls,
      architecturalElements
    );
    const cornerExtRightMm = detectCornerBacksplashExtension(
      flanks.right,
      cabRot,
      false,
      cabIds,
      cabinets,
      walls,
      architecturalElements
    );

    const maxGapCm = config?.extendToWallMaxGapCm ?? 50;
    const shouldExtendLeft = !!config?.extendToWallLeft && (!isIsland || !config?.extendBaseOnly);
    const shouldExtendRight = !!config?.extendToWallRight && (!isIsland || !config?.extendBaseOnly);

    const extWallLeftMm = shouldExtendLeft
      ? detectCountertopExtensionToWallOrPillar(
          flanks.left,
          cabRot,
          true,
          walls,
          architecturalElements,
          maxGapCm
        )
      : 0;

    const extWallRightMm = shouldExtendRight
      ? detectCountertopExtensionToWallOrPillar(
          flanks.right,
          cabRot,
          false,
          walls,
          architecturalElements,
          maxGapCm
        )
      : 0;

    runs.push({
      id: `${isIsland ? 'ISL' : 'BASE'}-RUN-${runs.length + 1}`,
      name: `Mueble Aislado (${totalLengthMm} mm)`,
      type: isIsland ? 'island' : 'base',
      cabinets: [cab],
      totalLengthMm,
      depthMm,
      heightMm,
      segmentsCount: 1,
      segmentLengthsMm: [totalLengthMm],
      buildingType: bType,
      maxTransportLengthMm: maxSegmentLengthMm,
      startFlankWorld: flanks.left,
      endFlankWorld: flanks.right,
      centerWorld: [cab.position[0], cab.position[1] + cab.height / 2, cab.position[2]],
      rotation: cabRot,
      canWaterfallLeft: !isLeftBlockedByTall && !isLeftBlockedByAny && !isLeftBlockedByPillar && extWallLeftMm === 0,
      canWaterfallRight: !isRightBlockedByTall && !isRightBlockedByAny && !isRightBlockedByPillar && extWallRightMm === 0,
      cornerExtensionLeftMm: cornerExtLeftMm,
      cornerExtensionRightMm: cornerExtRightMm,
      extensionToWallLeftMm: extWallLeftMm,
      extensionToWallRightMm: extWallRightMm,
    });
  }

  return runs;
}

/**
 * Empaca 2D las piezas de marmolería en planchas Qstone (3200 x 1600 mm)
 * considerando espesor de disco diamantado (kerf 3.5mm) y despunte perimetral (10mm).
 */
export function packPiecesIntoSlabs(
  pieces: CountertopPiece[],
  sheetWidthMm = 3200,
  sheetHeightMm = 1600,
  kerf = 3.5,
  margin = 10
): SlabLayout[] {
  if (pieces.length === 0) return [];

  const usableW = sheetWidthMm - margin * 2;
  const usableH = sheetHeightMm - margin * 2;

  // Ordenar piezas: primero cubiertas mayores y cascadas, luego faldones y respaldos por longitud
  const sorted = [...pieces].sort((a, b) => {
    const rank = (type: string) => {
      if (type === 'slab') return 1;
      if (type === 'waterfall') return 2;
      if (type === 'backsplash') return 3;
      return 4; // apron
    };
    if (rank(a.type) !== rank(b.type)) return rank(a.type) - rank(b.type);
    return b.areaM2 - a.areaM2;
  });

  interface SlabState {
    index: number;
    placements: NestedPiecePlacement[];
    // Bounding boxes ocupados [x1, y1, x2, y2]
    occupied: [number, number, number, number][];
  }

  const slabs: SlabState[] = [];

  const canPlace = (
    slab: SlabState,
    x: number,
    y: number,
    w: number,
    h: number
  ): boolean => {
    if (x + w > margin + usableW || y + h > margin + usableH) return false;
    for (const [ox1, oy1, ox2, oy2] of slab.occupied) {
      // Chequear colisión con margen kerf
      const collides = !(
        x + w <= ox1 - kerf ||
        x >= ox2 + kerf ||
        y + h <= oy1 - kerf ||
        y >= oy2 + kerf
      );
      if (collides) return false;
    }
    return true;
  };

  const findPositionInSlab = (
    slab: SlabState,
    w: number,
    h: number
  ): { x: number; y: number; rotated: boolean } | null => {
    // Generar candidatos de coordenadas (x, y) anclados a las esquinas de piezas existentes
    const candidateX = [margin];
    const candidateY = [margin];

    for (const [ox1, oy1, ox2, oy2] of slab.occupied) {
      candidateX.push(ox2 + kerf);
      candidateY.push(oy2 + kerf);
    }

    candidateX.sort((a, b) => a - b);
    candidateY.sort((a, b) => a - b);

    // Intentar orientación normal primero
    for (const y of candidateY) {
      for (const x of candidateX) {
        if (canPlace(slab, x, y, w, h)) {
          return { x, y, rotated: false };
        }
      }
    }

    // Intentar orientación rotada 90°
    for (const y of candidateY) {
      for (const x of candidateX) {
        if (canPlace(slab, x, y, h, w)) {
          return { x, y, rotated: true };
        }
      }
    }

    return null;
  };

  for (const piece of sorted) {
    const pW = piece.lengthMm;
    const pH = piece.widthMm;
    let placed = false;

    // Buscar espacio en planchas abiertas
    for (const slab of slabs) {
      const pos = findPositionInSlab(slab, pW, pH);
      if (pos) {
        const actualW = pos.rotated ? pH : pW;
        const actualH = pos.rotated ? pW : pH;
        slab.placements.push({
          pieceId: piece.id,
          pieceName: piece.name,
          type: piece.type,
          x: pos.x,
          y: pos.y,
          widthMm: actualW,
          lengthMm: actualH,
          rotated: pos.rotated,
          slabIndex: slab.index,
          hasCutout: piece.hasCutout,
        });
        slab.occupied.push([pos.x, pos.y, pos.x + actualW, pos.y + actualH]);
        placed = true;
        break;
      }
    }

    // Si no cupo en ninguna plancha, abrir una nueva
    if (!placed) {
      const newIndex = slabs.length + 1;
      const newSlab: SlabState = {
        index: newIndex,
        placements: [],
        occupied: [],
      };

      // Comprobar si cabe directo o rotada
      let actualW = pW;
      let actualH = pH;
      let isRotated = false;

      if (pW > usableW && pH <= usableW) {
        actualW = pH;
        actualH = pW;
        isRotated = true;
      }

      newSlab.placements.push({
        pieceId: piece.id,
        pieceName: piece.name,
        type: piece.type,
        x: margin,
        y: margin,
        widthMm: actualW,
        lengthMm: actualH,
        rotated: isRotated,
        slabIndex: newIndex,
        hasCutout: piece.hasCutout,
      });
      newSlab.occupied.push([margin, margin, margin + actualW, margin + actualH]);
      slabs.push(newSlab);
    }
  }

  const slabTotalAreaM2 = (sheetWidthMm * sheetHeightMm) / 1000000;

  return slabs.map((s) => {
    const usedM2 = s.placements.reduce((acc, p) => acc + (p.widthMm * p.lengthMm) / 1000000, 0);
    const eff = Math.min(96, Math.round((usedM2 / slabTotalAreaM2) * 100));
    return {
      slabIndex: s.index,
      slabWidthMm: sheetWidthMm,
      slabHeightMm: sheetHeightMm,
      pieces: s.placements,
      usedAreaM2: Number(usedM2.toFixed(3)),
      efficiencyPercent: eff,
      offcutAreaM2: Number(Math.max(0, slabTotalAreaM2 - usedM2).toFixed(3)),
    };
  });
}

/**
 * Genera el BOM completo de marmolería Qstone considerando:
 * - Corridas continuas de gabinetes (en lugar de partir la cubierta por cada gabinete individual)
 * - Restricciones de transporte reales (Casa: máx 2500mm, Edificio/Depto: máx 2000mm)
 * - Tiras de faldón/regrueso y respaldo/zócalo continuas
 * - Patas cascada en extremos libres
 * - Optimización gráfica de corte (Nesting) en planchas de 3200 x 1600 mm
 */
export function generateCountertopPieces(
  cabinets: CabinetType[],
  config: CountertopConfig,
  catalog: QstoneProductItem[] = DEFAULT_QSTONE_CATALOG,
  islandBackConfig?: IslandBackConfig,
  walls?: { id: string; start: [number, number]; end: [number, number]; thickness?: number }[],
  architecturalElements?: ArchitecturalElement[],
  roomConfig?: any
): CountertopBOM | null {
  if (!config.enabled) return null;

  const product = catalog.find((p) => p.id === config.selectedProductId) || catalog[0];
  const maxSegmentLengthMm = config.buildingType === 'edificio' ? 2000 : 2500;
  const pieces: CountertopPiece[] = [];

  const continuousRuns = detectContinuousCabinetRuns(cabinets, config, walls, architecturalElements, roomConfig);
  if (continuousRuns.length === 0) return null;

  let pieceCounter = 1;

  for (const run of continuousRuns) {
    const isIsland = run.type === 'island';
    const prefix = isIsland ? 'ISL' : 'BASE';

    // Chequear si esta corrida contiene encastre de lavaplatos o encimera
    const hasSinkInRun = run.cabinets.some((c) => c.id === config.sinkCabinetId);
    const hasCooktopInRun = run.cabinets.some((c) => c.id === config.cooktopCabinetId);

    // Si la corrida no supera la cota de transporte: ES UN ÚNICO TRAMO ENTERO CONTINUO
    for (let segIdx = 0; segIdx < run.segmentLengthsMm.length; segIdx++) {
      const segLengthMm = run.segmentLengthsMm[segIdx];
      const pieceId = `${prefix}-TOP-${pieceCounter}`;
      const isSingleSegment = run.segmentLengthsMm.length === 1;

      const extraLeft =
        segIdx === 0
          ? (run.cornerExtensionLeftMm || 0) + (run.extensionToWallLeftMm || 0)
          : 0;
      const extraRight =
        segIdx === run.segmentLengthsMm.length - 1
          ? (run.cornerExtensionRightMm || 0) + (run.extensionToWallRightMm || 0)
          : 0;
      const totalSlabLengthMm = segLengthMm + extraLeft + extraRight;

      const slabName = isSingleSegment
        ? `Tramo Cubierta Corrida ${pieceId} (${totalSlabLengthMm}x${run.depthMm}mm)`
        : `Tramo Cubierta ${pieceId} (Seg. ${segIdx + 1}/${run.segmentLengthsMm.length} - ${totalSlabLengthMm}x${run.depthMm}mm)`;

      let cutoutType: 'sink' | 'cooktop' | undefined = undefined;
      if (hasSinkInRun && segIdx === 0) cutoutType = 'sink';
      else if (hasCooktopInRun) cutoutType = 'cooktop';

      // 1. Tramo horizontal de cubierta (cubre la totalidad de la superficie hasta el muro/pilar)
      pieces.push({
        id: pieceId,
        name: slabName,
        type: 'slab',
        lengthMm: totalSlabLengthMm,
        widthMm: run.depthMm,
        thicknessMm: product.thicknessMm,
        areaM2: (totalSlabLengthMm * run.depthMm) / 1000000,
        edgePolishingM:
          (totalSlabLengthMm + (segIdx === 0 || segIdx === run.segmentLengthsMm.length - 1 ? run.depthMm : 0)) /
          1000,
        notes: isSingleSegment
          ? `Tramo continuo entero sin uniones intermedias (${config.buildingType === 'casa' ? 'Casa: máx 2500mm' : 'Edificio: máx 2000mm'})${extraLeft || extraRight ? ' (incluye extensión a muro/pilar)' : ''}.`
          : `Junta ortogonal a 90° rectificada con disco diamantado kerf 3.5mm${extraLeft || extraRight ? ' (incluye extensión a muro/pilar)' : ''}.`,
        runId: run.id,
        hasCutout: cutoutType,
      });

      // 2. Faldón Delantero / Regrueso
      if (config.regruesoCm > 0) {
        const apronHeightMm = Math.round(config.regruesoCm * 10);
        const apronLengthMm = segLengthMm + extraLeft + extraRight;
        pieces.push({
          id: `${pieceId}-FALDON`,
          name: `Faldón Delantero ${pieceId} (${apronLengthMm}x${apronHeightMm}mm)`,
          type: 'apron',
          lengthMm: apronLengthMm,
          widthMm: apronHeightMm,
          thicknessMm: product.thicknessMm,
          areaM2: (apronLengthMm * apronHeightMm) / 1000000,
          edgePolishingM: apronLengthMm / 1000,
          notes: `Tira de regrueso frontal ${config.regruesoCm}cm ingletada o a tope 90°.`,
          runId: run.id,
        });
      }

      // 3. Respaldo / Zócalo Posterior (solo en muros pegados a pared)
      if (!isIsland && config.backsplashMode !== 'none') {
        const bsHeightMm =
          config.backsplashMode === 'standard_5cm'
            ? Math.round(config.backsplashHeightCm * 10)
            : 550; // 55cm revestimiento completo
        const totalBsLengthMm = segLengthMm + extraLeft + extraRight;

        pieces.push({
          id: `${pieceId}-RESPALDO`,
          name: `${
            config.backsplashMode === 'standard_5cm'
              ? 'Zócalo / Respaldo 5cm'
              : 'Revestimiento Muro Completo'
          } ${pieceId} (${totalBsLengthMm}x${bsHeightMm}mm)`,
          type: 'backsplash',
          lengthMm: totalBsLengthMm,
          widthMm: bsHeightMm,
          thicknessMm: product.thicknessMm,
          areaM2: (totalBsLengthMm * bsHeightMm) / 1000000,
          edgePolishingM: totalBsLengthMm / 1000,
          notes:
            config.backsplashMode === 'standard_5cm'
              ? `Zócalo de protección perimetral 50mm con canto superior pulido${extraLeft || extraRight ? ' (incluye extensión a muro/pilar)' : ''}`
              : `Revestimiento de muro completo hasta muebles aéreos${extraLeft || extraRight ? ' (incluye extensión a muro/pilar)' : ''}`,
          runId: run.id,
        });
      }

      pieceCounter++;
    }

    // 4. Patas Cascada (Waterfall) laterales - Solo si el extremo está libre (sin despensa ni esquina)
    if (config.waterfallLeft && run.canWaterfallLeft) {
      pieces.push({
        id: `${prefix}-CASCADA-IZQ`,
        name: `Pata Cascada Lateral Izquierda (${run.heightMm}x${run.depthMm}mm)`,
        type: 'waterfall',
        lengthMm: run.heightMm,
        widthMm: run.depthMm,
        thicknessMm: product.thicknessMm,
        areaM2: (run.heightMm * run.depthMm) / 1000000,
        edgePolishingM: (run.heightMm * 2 + run.depthMm) / 1000,
        notes: 'Bajada vertical a piso 90° con pulido de cantos (extremo libre)',
        runId: run.id,
      });
    }

    if (config.waterfallRight && run.canWaterfallRight) {
      pieces.push({
        id: `${prefix}-CASCADA-DER`,
        name: `Pata Cascada Lateral Derecha (${run.heightMm}x${run.depthMm}mm)`,
        type: 'waterfall',
        lengthMm: run.heightMm,
        widthMm: run.depthMm,
        thicknessMm: product.thicknessMm,
        areaM2: (run.heightMm * run.depthMm) / 1000000,
        edgePolishingM: (run.heightMm * 2 + run.depthMm) / 1000,
        notes: 'Bajada vertical a piso 90° con pulido de cantos (extremo libre)',
        runId: run.id,
      });
    }

    // 5. Panel Trasero Trasdosado Continuo de Isla (en material de cubierta, siempre a piso)
    if (isIsland && islandBackConfig?.enabled && islandBackConfig.materialType === 'countertop') {
      const panelLengthMm = run.totalLengthMm;
      const panelHeightMm = run.heightMm; // estrictamente a piso
      pieces.push({
        id: `${prefix}-TRASERA-ISLA`,
        name: `Panel Trasero Trasdosado Isla (${panelLengthMm}x${panelHeightMm}mm)`,
        type: 'slab',
        lengthMm: panelLengthMm,
        widthMm: panelHeightMm,
        thicknessMm: product.thicknessMm,
        areaM2: (panelLengthMm * panelHeightMm) / 1000000,
        edgePolishingM: (panelLengthMm * 2 + panelHeightMm * 2) / 1000,
        notes: 'Panel trasero continuo a piso en piedra de cubierta (sin zócalo)',
        runId: run.id,
      });
    }
  }

  if (pieces.length === 0) return null;

  // Encastres
  const cutouts: CountertopBOM['cutouts'] = [];

  if (config.sinkModel && config.sinkModel !== 'none') {
    const sink = QSTONE_SINKS[config.sinkModel];
    if (sink) {
      cutouts.push({
        type: 'sink',
        modelName: sink.name,
        cutoutWidthMm: sink.cutoutWidthMm,
        cutoutDepthMm: sink.cutoutDepthMm,
        polished: true,
      });
    }
  }

  if (config.cooktopModel && config.cooktopModel !== 'none') {
    const cooktop = FDV_COOKTOPS[config.cooktopModel];
    if (cooktop) {
      cutouts.push({
        type: 'cooktop',
        modelName: cooktop.name,
        cutoutWidthMm: cooktop.cutoutWidthMm,
        cutoutDepthMm: cooktop.cutoutDepthMm,
        polished: false,
      });
    }
  }

  // Nesting 2D real en planchas 3200 x 1600 mm
  const slabsLayout = packPiecesIntoSlabs(
    pieces,
    product.sheetWidthMm,
    product.sheetHeightMm,
    3.5,
    10
  );
  const slabAreaM2 = (product.sheetWidthMm * product.sheetHeightMm) / 1000000;
  const slabsCount = Math.max(1, slabsLayout.length);
  const grossBilledM2 = slabsCount * slabAreaM2;

  const totalNetAreaM2 = pieces.reduce((sum, p) => sum + p.areaM2, 0);
  const totalLinearEdgeM = pieces.reduce((sum, p) => sum + p.edgePolishingM, 0);
  const efficiencyPercent = Math.min(
    95,
    Math.round((totalNetAreaM2 / grossBilledM2) * 100)
  );

  // Costos
  const materialCostClp = Math.round(totalNetAreaM2 * product.priceM2Clp);
  const polishCost = Math.round(totalLinearEdgeM * 18000);
  const cutoutCost = cutouts.reduce((acc, c) => acc + (c.polished ? 45000 : 25000), 0);
  const fabricationCostClp = polishCost + cutoutCost;
  const totalCostClp = materialCostClp + fabricationCostClp;

  return {
    pieces,
    totalNetAreaM2: Number(totalNetAreaM2.toFixed(2)),
    slabsCount,
    slabAreaM2: Number(slabAreaM2.toFixed(2)),
    grossBilledM2: Number(grossBilledM2.toFixed(2)),
    efficiencyPercent,
    totalLinearEdgeM: Number(totalLinearEdgeM.toFixed(2)),
    cutouts,
    product,
    materialCostClp,
    fabricationCostClp,
    totalCostClp,
    runs: continuousRuns,
    slabsLayout,
  };
}
