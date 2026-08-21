import { CabinetType } from '../store/kitchenStore';

export interface Box2D {
  corners: [number, number][]; // 4 corners in XZ
  center: [number, number];
  axes: [number, number][]; // 2 normalized normal axes
  width: number;
  depth: number;
  rotation: number;
  yMin: number;
  yMax: number;
}

export function getCabinetBox2D(
  cab: {
    position: [number, number, number];
    width: number;
    depth: number;
    height: number;
    rotation?: number;
    type?: string;
  }
): Box2D {
  const rot = cab.rotation || 0;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const cx = cab.position[0];
  const cz = cab.position[2];
  const hw = cab.width / 2;
  const hd = cab.depth / 2;

  // Local corners relative to center: (-hw, -hd), (hw, -hd), (hw, hd), (-hw, hd)
  const localCorners: [number, number][] = [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ];

  const corners: [number, number][] = localCorners.map(([lx, lz]) => [
    cx + lx * cos + lz * sin,
    cz + lx * sin - lz * cos,
  ]);

  const axes: [number, number][] = [
    [cos, sin],
    [-sin, cos],
  ];

  const yMin = cab.position[1] - cab.height / 2;
  const yMax = cab.position[1] + cab.height / 2;

  return {
    corners,
    center: [cx, cz],
    axes,
    width: cab.width,
    depth: cab.depth,
    rotation: rot,
    yMin,
    yMax,
  };
}

export function getWallBox2D(wall: {
  start: [number, number];
  end: [number, number];
  thickness?: number;
  height?: number;
}): Box2D {
  const [x1, z1] = wall.start;
  const [x2, z2] = wall.end;
  const dx = x2 - x1;
  const dz = z2 - z1;
  const length = Math.hypot(dx, dz);
  const thickness = wall.thickness || 20;
  const height = wall.height || 250;
  const cx = (x1 + x2) / 2;
  const cz = (z1 + z2) / 2;

  const rot = Math.atan2(dx, dz);
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);

  const hw = thickness / 2;
  const hd = length / 2;

  const localCorners: [number, number][] = [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ];

  const corners: [number, number][] = localCorners.map(([lx, lz]) => [
    cx + lx * cos + lz * sin,
    cz + lx * sin - lz * cos,
  ]);

  const axes: [number, number][] = [
    [cos, sin],
    [-sin, cos],
  ];

  return {
    corners,
    center: [cx, cz],
    axes,
    width: thickness,
    depth: length,
    rotation: rot,
    yMin: 0,
    yMax: height,
  };
}

// Separating Axis Theorem (SAT) collision test in 2D XZ
export function checkOBBCollision(
  boxA: Box2D,
  boxB: Box2D,
  margin = 0.5
): { colliding: boolean; overlap: number; mtvAxis: [number, number] | null } {
  // Check vertical overlap first
  const vOverlap = Math.min(boxA.yMax, boxB.yMax) - Math.max(boxA.yMin, boxB.yMin);
  if (vOverlap <= 5) {
    return { colliding: false, overlap: 0, mtvAxis: null };
  }

  const axes = [...boxA.axes, ...boxB.axes];
  let minOverlap = Infinity;
  let smallestAxis: [number, number] | null = null;

  for (const axis of axes) {
    // Project boxA corners onto axis
    let minA = Infinity;
    let maxA = -Infinity;
    for (const c of boxA.corners) {
      const proj = c[0] * axis[0] + c[1] * axis[1];
      if (proj < minA) minA = proj;
      if (proj > maxA) maxA = proj;
    }

    // Project boxB corners onto axis
    let minB = Infinity;
    let maxB = -Infinity;
    for (const c of boxB.corners) {
      const proj = c[0] * axis[0] + c[1] * axis[1];
      if (proj < minB) minB = proj;
      if (proj > maxB) maxB = proj;
    }

    // Check interval overlap
    const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
    if (overlap <= margin) {
      // Separating axis found -> No collision
      return { colliding: false, overlap: 0, mtvAxis: null };
    }

    if (overlap < minOverlap) {
      minOverlap = overlap;
      smallestAxis = axis;
    }
  }

  // Ensure MTV points from B to A
  if (smallestAxis) {
    const dir = [boxA.center[0] - boxB.center[0], boxA.center[1] - boxB.center[1]];
    if (dir[0] * smallestAxis[0] + dir[1] * smallestAxis[1] < 0) {
      smallestAxis = [-smallestAxis[0], -smallestAxis[1]];
    }
  }

  return { colliding: true, overlap: minOverlap, mtvAxis: smallestAxis };
}

export function isCandidateValid(
  candidate: {
    position: [number, number, number];
    width: number;
    depth: number;
    height: number;
    rotation?: number;
    type?: string;
  },
  existingCabinets: CabinetType[],
  walls: any[] = [],
  ignoreId?: string | null
): boolean {
  const candBox = getCabinetBox2D(candidate);
  for (const cab of existingCabinets) {
    if (ignoreId && cab.id === ignoreId) continue;
    const otherBox = getCabinetBox2D(cab);
    const result = checkOBBCollision(candBox, otherBox, 0.8);
    if (result.colliding) {
      return false;
    }
  }

  for (const wall of walls) {
    const wallBox = getWallBox2D(wall);
    const result = checkOBBCollision(candBox, wallBox, 0.8);
    if (result.colliding) {
      return false;
    }
  }

  return true;
}

export interface SnapAndCollisionResult {
  position: [number, number, number];
  rotation: number;
  isSnapped: boolean;
  isColliding: boolean;
}

// Algoritmo Ray-Casting para comprobar si un punto (x, z) está estrictamente dentro del polígono de la habitación
export function isPointInPolygon(x: number, z: number, poly: [number, number][]): boolean {
  if (!poly || poly.length < 3) return true;
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i][0];
    const zi = poly[i][1];
    const xj = poly[j][0];
    const zj = poly[j][1];
    const intersect =
      zi > z !== zj > z &&
      x < ((xj - xi) * (z - zi)) / (zj - zi + 0.00000001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Calcula la distancia euclidiana y el punto más cercano sobre un segmento [A, B]
export function getClosestPointOnSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): { point: [number, number]; t: number; dist: number } {
  const abX = bx - ax;
  const abZ = bz - az;
  const abLen2 = abX * abX + abZ * abZ;
  if (abLen2 === 0) {
    const d = Math.hypot(px - ax, pz - az);
    return { point: [ax, az], t: 0, dist: d };
  }
  const apX = px - ax;
  const apZ = pz - az;
  const t = Math.max(0, Math.min(1, (apX * abX + apZ * abZ) / abLen2));
  const cx = ax + t * abX;
  const cz = az + t * abZ;
  return { point: [cx, cz], t, dist: Math.hypot(px - cx, pz - cz) };
}

export function resolvePlacement({
  mouseX,
  mouseZ,
  cabWidth,
  cabHeight,
  cabDepth,
  cabType,
  preferredRot = 0,
  cabinets,
  ignoreId = null,
  walls = [],
  roomVertices = [],
}: {
  mouseX: number;
  mouseZ: number;
  cabWidth: number;
  cabHeight: number;
  cabDepth: number;
  cabType: string;
  preferredRot?: number;
  cabinets: CabinetType[];
  ignoreId?: string | null;
  walls?: any[];
  roomVertices?: { x: number; y: number }[];
}): SnapAndCollisionResult {
  // Altura estándar según tipología
  const defaultY =
    cabType === 'wall'
      ? 145
      : cabType === 'tall'
      ? cabHeight / 2
      : cabHeight / 2;

  const otherCabinets = cabinets.filter((c) => !ignoreId || c.id !== ignoreId);

  // Polígono de la estancia (XZ)
  let roomPoly: [number, number][] = [];
  if (roomVertices && roomVertices.length >= 3) {
    roomPoly = roomVertices.map((v) => [v.x, v.y]);
  } else if (walls && walls.length >= 3) {
    roomPoly = walls.map((w) => [w.start[0], w.start[1]]);
  }

  // Centroide del polígono
  let roomCenterX = 0;
  let roomCenterZ = 0;
  if (roomPoly.length > 0) {
    let sumX = 0;
    let sumZ = 0;
    roomPoly.forEach(([vx, vz]) => {
      sumX += vx;
      sumZ += vz;
    });
    roomCenterX = sumX / roomPoly.length;
    roomCenterZ = sumZ / roomPoly.length;
  }

  // Comprobar si el cursor está dentro de la habitación
  const isMouseInsideRoom = roomPoly.length >= 3 ? isPointInPolygon(mouseX, mouseZ, roomPoly) : true;

  // 1. Detección y atracción magnética a otros muebles adyacentes (Snapping Flanco a Flanco)
  const snapThreshold = 45;
  let bestSnap: { pos: [number, number, number]; rot: number; dist: number } | null = null;

  for (const cab of otherCabinets) {
    const rot = cab.rotation || 0;
    const isCornerBlind = cab.variant?.startsWith('corner_blind') || cab.variant === 'corner_blind';
    const isRightBlind = cab.variant !== 'corner_blind_left';

    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const uX: [number, number] = [cos, sin];

    const rightDist = (cab.width + cabWidth) / 2;
    const leftDist = -(cab.width + cabWidth) / 2;

    const candidateRight: [number, number, number] = [
      cab.position[0] + rightDist * uX[0],
      defaultY,
      cab.position[2] + rightDist * uX[1],
    ];

    const candidateLeft: [number, number, number] = [
      cab.position[0] + leftDist * uX[0],
      defaultY,
      cab.position[2] + leftDist * uX[1],
    ];

    const distR = Math.hypot(mouseX - candidateRight[0], mouseZ - candidateRight[2]);
    if (distR < snapThreshold) {
      const isValid = isCandidateValid(
        {
          position: candidateRight,
          width: cabWidth,
          height: cabHeight,
          depth: cabDepth,
          rotation: rot,
          type: cabType,
        },
        otherCabinets,
        walls
      );
      // Validar además que quede dentro del polígono
      const inPoly = roomPoly.length >= 3 ? isPointInPolygon(candidateRight[0], candidateRight[2], roomPoly) : true;
      if (isValid && inPoly && (!bestSnap || distR < bestSnap.dist)) {
        bestSnap = { pos: candidateRight, rot, dist: distR };
      }
    }

    const distL = Math.hypot(mouseX - candidateLeft[0], mouseZ - candidateLeft[2]);
    if (distL < snapThreshold) {
      const isValid = isCandidateValid(
        {
          position: candidateLeft,
          width: cabWidth,
          height: cabHeight,
          depth: cabDepth,
          rotation: rot,
          type: cabType,
        },
        otherCabinets,
        walls
      );
      const inPoly = roomPoly.length >= 3 ? isPointInPolygon(candidateLeft[0], candidateLeft[2], roomPoly) : true;
      if (isValid && inPoly && (!bestSnap || distL < bestSnap.dist)) {
        bestSnap = { pos: candidateLeft, rot, dist: distL };
      }
    }

    // Acople ortogonal en esquineros ciegos
    if (isCornerBlind) {
      const blindW = Math.max(35, cab.width / 2);
      const localBlindOffsetX = isRightBlind ? cab.width / 2 - blindW / 2 : -cab.width / 2 + blindW / 2;
      const orthoRot = isRightBlind ? rot + Math.PI / 2 : rot - Math.PI / 2;
      const dockLocalZ = cab.depth / 2 + cabWidth / 2;

      const dockWorldX = cab.position[0] + (localBlindOffsetX * cos + dockLocalZ * sin);
      const dockWorldZ = cab.position[2] + (localBlindOffsetX * sin - dockLocalZ * cos);
      const distDock = Math.hypot(mouseX - dockWorldX, mouseZ - dockWorldZ);

      if (distDock < snapThreshold * 1.5) {
        const dockPos: [number, number, number] = [dockWorldX, defaultY, dockWorldZ];
        const isValid = isCandidateValid(
          {
            position: dockPos,
            width: cabWidth,
            height: cabHeight,
            depth: cabDepth,
            rotation: orthoRot,
            type: cabType,
          },
          otherCabinets,
          walls
        );
        const inPoly = roomPoly.length >= 3 ? isPointInPolygon(dockPos[0], dockPos[2], roomPoly) : true;
        if (isValid && inPoly && (!bestSnap || distDock < bestSnap.dist)) {
          bestSnap = { pos: dockPos, rot: orthoRot, dist: distDock };
        }
      }
    }
  }

  if (bestSnap) {
    return {
      position: bestSnap.pos,
      rotation: bestSnap.rot,
      isSnapped: true,
      isColliding: false,
    };
  }

  // 2. Detección y atracción magnética directa al muro para muebles base, despensas y aéreos
  // Si el ratón está fuera de la estancia, aumentamos el umbral para que siempre imante al interior de la pared más cercana
  const wallSnapThreshold = isMouseInsideRoom ? 85 : 500;
  let bestWallSnap: { pos: [number, number, number]; rot: number; dist: number } | null = null;

  if (walls && walls.length > 0) {
    for (const w of walls) {
      const x1 = w.start[0];
      const z1 = w.start[1];
      const x2 = w.end[0];
      const z2 = w.end[1];
      const wallLen = Math.hypot(x2 - x1, z2 - z1);
      if (wallLen < 15) continue;

      const uX = (x2 - x1) / wallLen;
      const uZ = (z2 - z1) / wallLen;

      // Vector normal
      let nX = -uZ;
      let nZ = uX;

      // Orientar normal rigurosamente hacia el interior de la habitación
      const midX = (x1 + x2) / 2;
      const midZ = (z1 + z2) / 2;
      const testInX = midX + nX * 5;
      const testInZ = midZ + nZ * 5;

      if (roomPoly.length >= 3) {
        if (!isPointInPolygon(testInX, testInZ, roomPoly)) {
          nX = -nX;
          nZ = -nZ;
        }
      } else {
        const toCenterX = roomCenterX - midX;
        const toCenterZ = roomCenterZ - midZ;
        if (nX * toCenterX + nZ * toCenterZ < 0) {
          nX = -nX;
          nZ = -nZ;
        }
      }

      // Proyectar ratón sobre el muro
      const s = (mouseX - x1) * uX + (mouseZ - z1) * uZ;
      const sClamped = Math.max(cabWidth / 2 + 1, Math.min(wallLen - cabWidth / 2 - 1, s));
      const wallThickness = w.thickness || 20;
      const flushDist = wallThickness / 2 + cabDepth / 2;

      // La posición de enganche siempre queda exactamente en la cara interior del tabique
      const snapPosX = x1 + sClamped * uX + flushDist * nX;
      const snapPosZ = z1 + sClamped * uZ + flushDist * nZ;
      
      // La rotación asegura que la trasera (-Z) esté contra la pared y el frente (+Z) hacia la habitación
      const wallRot = Math.atan2(nX, nZ);

      const snapCandidatePos: [number, number, number] = [snapPosX, defaultY, snapPosZ];
      const distToSnap = Math.hypot(mouseX - snapPosX, mouseZ - snapPosZ);

      if (distToSnap < wallSnapThreshold) {
        // Verificar que no se solape con otro mueble
        const isValid = isCandidateValid(
          {
            position: snapCandidatePos,
            width: cabWidth,
            height: cabHeight,
            depth: cabDepth,
            rotation: wallRot,
            type: cabType,
          },
          otherCabinets,
          [] // Ya está situado en la cara interior del muro
        );

        if (isValid && (!bestWallSnap || distToSnap < bestWallSnap.dist)) {
          bestWallSnap = { pos: snapCandidatePos, rot: wallRot, dist: distToSnap };
        }
      }
    }
  }

  if (bestWallSnap) {
    return {
      position: bestWallSnap.pos,
      rotation: bestWallSnap.rot,
      isSnapped: true,
      isColliding: false,
    };
  }

  // 3. Resolución de Posición Libre dentro del Área de Cocina
  // Si el ratón está fuera de la cocina y no hubo snap, proyectamos la posición al interior del polígono
  let candidatePosX = mouseX;
  let candidatePosZ = mouseZ;

  if (roomPoly.length >= 3 && !isPointInPolygon(candidatePosX, candidatePosZ, roomPoly)) {
    // Buscar el punto interior más cercano
    let closestEdgeDist = Infinity;
    let fallbackX = roomCenterX;
    let fallbackZ = roomCenterZ;

    for (const w of walls) {
      const proj = getClosestPointOnSegment(mouseX, mouseZ, w.start[0], w.start[1], w.end[0], w.end[1]);
      if (proj.dist < closestEdgeDist) {
        closestEdgeDist = proj.dist;
        // Vector normal interior
        const wallLen = Math.hypot(w.end[0] - w.start[0], w.end[1] - w.start[1]);
        if (wallLen > 0.1) {
          let nX = -(w.end[1] - w.start[1]) / wallLen;
          let nZ = (w.end[0] - w.start[0]) / wallLen;
          const midX = (w.start[0] + w.end[0]) / 2;
          const midZ = (w.start[1] + w.end[1]) / 2;
          if (!isPointInPolygon(midX + nX * 5, midZ + nZ * 5, roomPoly)) {
            nX = -nX;
            nZ = -nZ;
          }
          const margin = (w.thickness || 20) / 2 + cabDepth / 2;
          fallbackX = proj.point[0] + nX * margin;
          fallbackZ = proj.point[1] + nZ * margin;
        }
      }
    }
    candidatePosX = fallbackX;
    candidatePosZ = fallbackZ;
  }

  let candidatePos: [number, number, number] = [candidatePosX, defaultY, candidatePosZ];
  let candidateTest = {
    position: candidatePos,
    width: cabWidth,
    height: cabHeight,
    depth: cabDepth,
    rotation: preferredRot,
    type: cabType,
  };

  let isColliding = false;

  // Resolver colisión contra muros: siempre empujar hacia el interior de la habitación
  if (walls && walls.length > 0) {
    for (const w of walls) {
      const wallBox = getWallBox2D(w);
      const candBox = getCabinetBox2D(candidateTest);
      const res = checkOBBCollision(candBox, wallBox, 0.5);
      if (res.colliding && res.mtvAxis) {
        isColliding = true;
        let pushAxis = res.mtvAxis;
        // Comprobar que el eje de empuje apunte hacia el interior de la habitación
        const toRoomX = roomCenterX - candidatePos[0];
        const toRoomZ = roomCenterZ - candidatePos[2];
        if (pushAxis[0] * toRoomX + pushAxis[1] * toRoomZ < 0) {
          pushAxis = [-pushAxis[0], -pushAxis[1]];
        }
        const pushDist = res.overlap + 0.8;
        candidatePos = [
          candidatePos[0] + pushAxis[0] * pushDist,
          candidatePos[1],
          candidatePos[2] + pushAxis[1] * pushDist,
        ];
        candidateTest.position = candidatePos;
      }
    }
  }

  // Resolver colisión contra otros muebles
  for (let iter = 0; iter < 4; iter++) {
    let hadCollision = false;
    const candBox = getCabinetBox2D(candidateTest);

    for (const cab of otherCabinets) {
      const otherBox = getCabinetBox2D(cab);
      const res = checkOBBCollision(candBox, otherBox, 0.5);
      if (res.colliding && res.mtvAxis) {
        hadCollision = true;
        isColliding = true;
        const pushDist = res.overlap + 0.5;
        candidatePos = [
          candidatePos[0] + res.mtvAxis[0] * pushDist,
          candidatePos[1],
          candidatePos[2] + res.mtvAxis[1] * pushDist,
        ];
        candidateTest.position = candidatePos;
        break;
      }
    }
    if (!hadCollision) break;
  }

  return {
    position: candidatePos,
    rotation: preferredRot,
    isSnapped: false,
    isColliding,
  };
}
