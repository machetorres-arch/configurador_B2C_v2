import * as THREE from 'three';

export interface WallColorOption {
  id: string;
  name: string;
  hex: string;
  category: string;
  description: string;
}

export const WALL_COLOR_OPTIONS: WallColorOption[] = [
  { id: 'white_pure', name: 'Blanco Nieve / Puro', hex: '#FFFFFF', category: 'Neutros Claros', description: 'Luminoso, limpio y atemporal' },
  { id: 'white_warm', name: 'Blanco Cálido / Hueso', hex: '#F6F3EC', category: 'Neutros Claros', description: 'Acogedor con matiz marfil sutil' },
  { id: 'gray_pearl', name: 'Gris Perla Suave', hex: '#E2E8F0', category: 'Grises', description: 'Neutro contemporáneo elegante' },
  { id: 'gray_greige', name: 'Greige / Cemento', hex: '#CBD5E1', category: 'Grises', description: 'Fusión equilibrada de gris y arena' },
  { id: 'gray_anthracite', name: 'Gris Antracita Profundo', hex: '#334155', category: 'Oscuros / Acento', description: 'Contraste moderno de alta gama' },
  { id: 'sand_warm', name: 'Arena / Lino Cálido', hex: '#E7DEC8', category: 'Tierra', description: 'Tonalidad orgánica y mediterránea' },
  { id: 'sage_green', name: 'Verde Salvia / Eucalipto', hex: '#9CAF88', category: 'Naturales', description: 'Fresco, botánico y relajante' },
  { id: 'terracotta_soft', name: 'Terracota / Barro Suave', hex: '#C88D6F', category: 'Tierra', description: 'Cálido, artesanal y expresivo' },
  { id: 'nordic_navy', name: 'Azul Marino Nórdico', hex: '#2B3A4A', category: 'Oscuros / Acento', description: 'Profundo, elegante y sobrio' },
  { id: 'forest_olive', name: 'Verde Oliva / Bosque', hex: '#4A5B43', category: 'Naturales', description: 'Estilo nórdico sofisticado' },
];

export interface FloorTypeOption {
  id: string;
  name: string;
  type: 'porcelanato' | 'ceramico' | 'madera' | 'marmol' | 'hidraulico' | 'microcemento';
  category: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  roughness: number;
  metalness: number;
  tileRepeat: [number, number];
}

export const FLOOR_TYPE_OPTIONS: FloorTypeOption[] = [
  {
    id: 'porcelain_cement_light',
    name: 'Porcelánico Cemento Claro',
    type: 'porcelanato',
    category: 'Porcelanato',
    description: 'Baldosas 60x60cm de cemento pulido gris perla con juntas finas',
    primaryColor: '#E2E8F0',
    accentColor: '#CBD5E1',
    roughness: 0.55,
    metalness: 0.05,
    tileRepeat: [6, 6],
  },
  {
    id: 'porcelain_anthracite',
    name: 'Porcelánico Antracita Grafito',
    type: 'porcelanato',
    category: 'Porcelanato',
    description: 'Gran formato 60x120cm grafito oscuro mate sedoso',
    primaryColor: '#2D3748',
    accentColor: '#1A202C',
    roughness: 0.45,
    metalness: 0.1,
    tileRepeat: [5, 5],
  },
  {
    id: 'ceramic_white_matte',
    name: 'Cerámica Blanca Mate',
    type: 'ceramico',
    category: 'Cerámico',
    description: 'Cuadrícula 30x30cm esmaltada mate con lechada suave',
    primaryColor: '#F8FAFC',
    accentColor: '#94A3B8',
    roughness: 0.4,
    metalness: 0.05,
    tileRepeat: [8, 8],
  },
  {
    id: 'ceramic_gray_subway',
    name: 'Cerámica Rectangular Gris',
    type: 'ceramico',
    category: 'Cerámico',
    description: 'Patrón trabado 15x30cm contemporáneo con juntas marcadas',
    primaryColor: '#D1D5DB',
    accentColor: '#6B7280',
    roughness: 0.45,
    metalness: 0.05,
    tileRepeat: [7, 7],
  },
  {
    id: 'wood_oak_natural',
    name: 'Parquet Roble Natural',
    type: 'madera',
    category: 'Madera / Parquet',
    description: 'Listones continuos de roble cálido veteado natural',
    primaryColor: '#D4A373',
    accentColor: '#A06E42',
    roughness: 0.65,
    metalness: 0.02,
    tileRepeat: [5, 10],
  },
  {
    id: 'wood_walnut_dark',
    name: 'Parquet Nogal Americano',
    type: 'madera',
    category: 'Madera / Parquet',
    description: 'Madera noble oscura con vetas profundas y acabado satinado',
    primaryColor: '#5C4033',
    accentColor: '#38251B',
    roughness: 0.58,
    metalness: 0.03,
    tileRepeat: [5, 10],
  },
  {
    id: 'marble_carrara_white',
    name: 'Mármol Carrara Blanco',
    type: 'marmol',
    category: 'Mármol',
    description: 'Placas de mármol blanco puro con vetas grises suaves',
    primaryColor: '#F1F5F9',
    accentColor: '#94A3B8',
    roughness: 0.18,
    metalness: 0.12,
    tileRepeat: [4, 4],
  },
  {
    id: 'marble_nero_marquina',
    name: 'Mármol Negro Marquina',
    type: 'marmol',
    category: 'Mármol',
    description: 'Mármol negro azabache de lujo con vetas blancas diagonales',
    primaryColor: '#18181B',
    accentColor: '#F8FAFC',
    roughness: 0.2,
    metalness: 0.18,
    tileRepeat: [4, 4],
  },
  {
    id: 'hydraulic_mosaic_vintage',
    name: 'Mosaico Hidráulico Vintage',
    type: 'hidraulico',
    category: 'Hidráulico',
    description: 'Baldosas decorativas 20x20cm con motivos geométricos tradicionales',
    primaryColor: '#EDE8DF',
    accentColor: '#3B82F6',
    roughness: 0.55,
    metalness: 0.05,
    tileRepeat: [8, 8],
  },
  {
    id: 'microcement_warm_sand',
    name: 'Microcemento Arena Cálido',
    type: 'microcemento',
    category: 'Microcemento',
    description: 'Pavimento continuo sin juntas con textura mineral suave',
    primaryColor: '#D6CEBE',
    accentColor: '#BDB19C',
    roughness: 0.75,
    metalness: 0.02,
    tileRepeat: [3, 3],
  },
];

// Texture cache to prevent recreating textures on every render
const textureCache = new Map<string, THREE.CanvasTexture>();

export function generateFloorCanvasTexture(floorId: string): THREE.CanvasTexture {
  if (textureCache.has(floorId)) {
    return textureCache.get(floorId)!;
  }

  const option = FLOOR_TYPE_OPTIONS.find((f) => f.id === floorId) || FLOOR_TYPE_OPTIONS[0];
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = option.primaryColor;
  ctx.fillRect(0, 0, size, size);

  if (option.type === 'porcelanato') {
    // Large tile with delicate joint lines and subtle cement grain
    const tileSize = size / 2;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        const x = c * tileSize;
        const y = r * tileSize;
        ctx.fillStyle = (r + c) % 2 === 0 ? option.primaryColor : option.accentColor;
        ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

        // subtle noise/speckles
        ctx.fillStyle = 'rgba(0,0,0,0.03)';
        for (let i = 0; i < 40; i++) {
          ctx.fillRect(x + Math.random() * tileSize, y + Math.random() * tileSize, 2, 2);
        }
      }
    }
    // Grout lines
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, size, size);
    ctx.beginPath();
    ctx.moveTo(tileSize, 0);
    ctx.lineTo(tileSize, size);
    ctx.moveTo(0, tileSize);
    ctx.lineTo(size, tileSize);
    ctx.stroke();
  } else if (option.type === 'ceramico') {
    // Grid of smaller tiles
    const tiles = option.id === 'ceramic_gray_subway' ? 4 : 4;
    const tileW = size / tiles;
    const tileH = option.id === 'ceramic_gray_subway' ? size / 8 : size / tiles;

    ctx.fillStyle = option.primaryColor;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = option.accentColor;
    ctx.lineWidth = 2.5;

    if (option.id === 'ceramic_gray_subway') {
      // Running bond pattern
      for (let row = 0; row < 8; row++) {
        const offset = (row % 2) * (tileW / 2);
        for (let col = -1; col < tiles + 1; col++) {
          const x = col * tileW + offset;
          const y = row * tileH;
          ctx.strokeRect(x, y, tileW, tileH);
        }
      }
    } else {
      for (let i = 0; i <= tiles; i++) {
        ctx.beginPath();
        ctx.moveTo(i * tileW, 0);
        ctx.lineTo(i * tileW, size);
        ctx.moveTo(0, i * tileW);
        ctx.lineTo(size, i * tileW);
        ctx.stroke();
      }
    }
  } else if (option.type === 'madera') {
    // Parquet wood planks with grain
    const plankH = size / 4;
    for (let i = 0; i < 4; i++) {
      const y = i * plankH;
      ctx.fillStyle = i % 2 === 0 ? option.primaryColor : option.accentColor;
      ctx.fillRect(0, y + 1, size, plankH - 2);

      // Wood grain lines
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1;
      for (let g = 0; g < 10; g++) {
        const gy = y + Math.random() * plankH;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(size * 0.3, gy + (Math.random() - 0.5) * 6, size * 0.7, gy + (Math.random() - 0.5) * 6, size, gy);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * plankH);
      ctx.lineTo(size, i * plankH);
      ctx.stroke();
    }
  } else if (option.type === 'marmol') {
    // Marble with subtle fluid veins
    ctx.fillStyle = option.primaryColor;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = option.accentColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.bezierCurveTo(150, 180, 240, 320, 480, 512);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(350, 0);
    ctx.bezierCurveTo(280, 200, 180, 380, 50, 512);
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 250);
    ctx.bezierCurveTo(200, 220, 350, 300, 512, 180);
    ctx.stroke();

    // Tile joint frame
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size, size);
  } else if (option.type === 'hidraulico') {
    // Hydraulic tile with circular and geometric floral center
    ctx.fillStyle = option.primaryColor;
    ctx.fillRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;

    // Corner rosettes
    const corners = [[0, 0], [size, 0], [size, size], [0, size]];
    corners.forEach(([x, y]) => {
      ctx.fillStyle = '#C88D6F';
      ctx.beginPath();
      ctx.arc(x, y, 45, 0, Math.PI * 2);
      ctx.fill();
    });

    // Center star / diamond
    ctx.fillStyle = option.accentColor;
    ctx.beginPath();
    ctx.arc(cx, cy, 60, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, size, size);
  } else {
    // Microcemento: continuous mottled mineral texture
    ctx.fillStyle = option.primaryColor;
    ctx.fillRect(0, 0, size, size);

    // Subtle cloud-like spatters
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
      ctx.beginPath();
      ctx.arc(Math.random() * size, Math.random() * size, Math.random() * 40 + 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  const [repX, repY] = option.tileRepeat;
  texture.repeat.set(repX, repY);
  textureCache.set(floorId, texture);
  return texture;
}
