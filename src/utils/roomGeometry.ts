export interface RoomVertex {
  id: string;
  x: number; // en cm
  y: number; // en cm (corresponde a Z en escena 3D)
}

export type RoomShapeType = 'rectangular' | 'freeform' | 'l_shape' | 'five_corners' | 'u_shape' | 'linear';

export interface RoomConfig {
  type: RoomShapeType;
  wallHeight: number; // cm (ej. 250)
  wallThickness: number; // cm (ej. 20)
  vertices: RoomVertex[];
}

export interface WallSegmentData {
  index: number;
  label: string; // A, B, C, D...
  start: RoomVertex;
  end: RoomVertex;
  length: number; // cm
  angleWithNext: number; // grados en el vértice end
}

// Genera una letra A, B, C, ... AA, AB etc.
export function getWallLabel(index: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (index < 26) return letters[index];
  return letters[Math.floor(index / 26) - 1] + letters[index % 26];
}

// Calcula la distancia euclidiana entre dos puntos en cm
export function distanceBetween(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

// Calcula el área de un polígono usando el método de Gauss / Shoelace en m²
export function calculatePolygonArea(vertices: RoomVertex[]): number {
  if (vertices.length < 3) return 0;
  let sum = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % n];
    sum += current.x * next.y - next.x * current.y;
  }
  const areaCm2 = Math.abs(sum) / 2;
  return Number((areaCm2 / 10000).toFixed(2)); // m²
}

// Calcula el perímetro total en metros
export function calculatePolygonPerimeter(vertices: RoomVertex[]): number {
  if (vertices.length < 2) return 0;
  let totalCm = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % n];
    totalCm += distanceBetween(current, next);
  }
  return Number((totalCm / 100).toFixed(2)); // metros
}

// Calcula el ángulo interior en grados en el vértice B (entre segmento A->B y B->C)
export function calculateVertexAngle(prev: RoomVertex, current: RoomVertex, next: RoomVertex): number {
  const v1 = { x: prev.x - current.x, y: prev.y - current.y };
  const v2 = { x: next.x - current.x, y: next.y - current.y };

  const angle1 = Math.atan2(v1.y, v1.x);
  const angle2 = Math.atan2(v2.y, v2.x);

  let diff = angle2 - angle1;
  while (diff < 0) diff += Math.PI * 2;
  while (diff >= Math.PI * 2) diff -= Math.PI * 2;

  let deg = Math.round((diff * 180) / Math.PI);
  // Normalizar a valor entre 1 y 359
  if (deg === 0) deg = 360;
  return deg;
}

// Descompone los vértices en datos de segmentos de pared y ángulos
export function analyzeRoomWalls(vertices: RoomVertex[]): WallSegmentData[] {
  const n = vertices.length;
  if (n < 2) return [];

  const segments: WallSegmentData[] = [];
  for (let i = 0; i < n; i++) {
    const start = vertices[i];
    const end = vertices[(i + 1) % n];
    const next = vertices[(i + 2) % n];

    const length = Math.round(distanceBetween(start, end) * 10) / 10;
    const angle = n >= 3 ? calculateVertexAngle(start, end, next) : 90;

    segments.push({
      index: i,
      label: getWallLabel(i),
      start,
      end,
      length,
      angleWithNext: angle,
    });
  }
  return segments;
}

// Centra los vértices alrededor de (0, 0)
export function centerVertices(vertices: RoomVertex[]): RoomVertex[] {
  if (vertices.length === 0) return [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  vertices.forEach(v => {
    if (v.x < minX) minX = v.x;
    if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.y > maxY) maxY = v.y;
  });

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return vertices.map(v => ({
    ...v,
    x: Math.round((v.x - centerX) * 10) / 10,
    y: Math.round((v.y - centerY) * 10) / 10,
  }));
}

// Generadores de Plantillas Predefinidas
export function getPresetRoomVertices(type: RoomShapeType): RoomVertex[] {
  switch (type) {
    case 'rectangular': {
      // 500cm x 400cm centrado (Exacto imagen de referencia)
      const w = 500;
      const h = 400;
      return [
        { id: 'v1', x: -w / 2, y: -h / 2 },
        { id: 'v2', x: w / 2, y: -h / 2 },
        { id: 'v3', x: w / 2, y: h / 2 },
        { id: 'v4', x: -w / 2, y: h / 2 },
      ];
    }
    case 'l_shape': {
      // Forma en L paramétrica
      return [
        { id: 'v1', x: -250, y: -200 },
        { id: 'v2', x: 50, y: -200 },
        { id: 'v3', x: 50, y: 0 },
        { id: 'v4', x: 250, y: 0 },
        { id: 'v5', x: 250, y: 200 },
        { id: 'v6', x: -250, y: 200 },
      ];
    }
    case 'five_corners': {
      // 5 esquinas con chaflán diagonal en esquina superior derecha
      return [
        { id: 'v1', x: -250, y: -200 },
        { id: 'v2', x: 100, y: -200 },
        { id: 'v3', x: 250, y: -50 },
        { id: 'v4', x: 250, y: 200 },
        { id: 'v5', x: -250, y: 200 },
      ];
    }
    case 'u_shape': {
      // Forma en U (3 alas envolventes)
      return [
        { id: 'v1', x: -250, y: -200 },
        { id: 'v2', x: 250, y: -200 },
        { id: 'v3', x: 250, y: 200 },
        { id: 'v4', x: 100, y: 200 },
        { id: 'v5', x: 100, y: 0 },
        { id: 'v6', x: -100, y: 0 },
        { id: 'v7', x: -100, y: 200 },
        { id: 'v8', x: -250, y: 200 },
      ];
    }
    case 'linear': {
      // Cocina abierta de 2 paredes en escuadra (3 vértices)
      return [
        { id: 'v1', x: -200, y: -150 },
        { id: 'v2', x: 250, y: -150 },
        { id: 'v3', x: 250, y: 200 },
        { id: 'v4', x: -200, y: 200 },
      ];
    }
    case 'freeform':
    default: {
      return [
        { id: 'v1', x: -200, y: -150 },
        { id: 'v2', x: 200, y: -150 },
        { id: 'v3', x: 200, y: 150 },
        { id: 'v4', x: -200, y: 150 },
      ];
    }
  }
}

// Convertidor a objetos WallType[] para el motor 3D
export function generateWallsFromRoom(config: RoomConfig): any[] {
  const { vertices, wallHeight, wallThickness } = config;
  const n = vertices.length;
  if (n < 2) return [];

  const walls = [];
  for (let i = 0; i < n; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % n];

    walls.push({
      id: `wall_${i}_${current.id}_${next.id}`,
      start: [current.x, current.y] as [number, number],
      end: [next.x, next.y] as [number, number],
      thickness: wallThickness,
      height: wallHeight,
    });
  }
  return walls;
}
