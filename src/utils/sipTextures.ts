import * as THREE from 'three';

let cachedOsbTexture: THREE.CanvasTexture | null = null;
let cachedOsbBumpMap: THREE.CanvasTexture | null = null;
let cachedOsbEdgeTexture: THREE.CanvasTexture | null = null;
let cachedEpsTexture: THREE.CanvasTexture | null = null;
let cachedTimberTexture: THREE.CanvasTexture | null = null;
let cachedTimberHorizontalTexture: THREE.CanvasTexture | null = null;
let cachedTimberBumpMap: THREE.CanvasTexture | null = null;
let cachedTimberEndGrainTexture: THREE.CanvasTexture | null = null;

/**
 * Genera texturas procedurales hiperrealistas de OSB (Oriented Strand Board), EPS y Madera Estructural
 * con la estética idéntica a los paneles PROSIP / APA structural SIP panels y maderas de pino estructural calibrado.
 */
export function getSipTextures() {
  if (
    cachedOsbTexture &&
    cachedOsbBumpMap &&
    cachedOsbEdgeTexture &&
    cachedEpsTexture &&
    cachedTimberTexture &&
    cachedTimberHorizontalTexture &&
    cachedTimberBumpMap &&
    cachedTimberEndGrainTexture
  ) {
    return {
      osbTexture: cachedOsbTexture,
      osbBumpMap: cachedOsbBumpMap,
      osbEdgeTexture: cachedOsbEdgeTexture,
      epsTexture: cachedEpsTexture,
      timberTexture: cachedTimberTexture,
      timberHorizontalTexture: cachedTimberHorizontalTexture,
      timberBumpMap: cachedTimberBumpMap,
      timberEndGrainTexture: cachedTimberEndGrainTexture,
    };
  }

  // 1. TEXTURA OSB PRINCIPAL (Caras de tableros de virutas orientadas)
  const osbCanvas = document.createElement('canvas');
  osbCanvas.width = 1024;
  osbCanvas.height = 1024;
  const ctx = osbCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 1024;
  bumpCanvas.height = 1024;
  const bctx = bumpCanvas.getContext('2d');

  if (ctx && bctx) {
    // Fondo base de madera cálida dorada/ámbar
    ctx.fillStyle = '#c7975e';
    ctx.fillRect(0, 0, 1024, 1024);

    bctx.fillStyle = '#808080';
    bctx.fillRect(0, 0, 1024, 1024);

    // Paleta de colores de virutas de madera reales (OSB)
    const flakeColors = [
      '#dfab6c', '#eac183', '#b88147', '#97612c', '#f5d49e',
      '#cca068', '#ad763d', '#865121', '#d49e61', '#f0cca1',
      '#be894e', '#a36c34', '#e6be82', '#7a481c', '#cf9e65',
    ];

    const prng = (seed: number) => {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    let seed = 12345;
    // Dibujar ~2200 virutas alargadas superpuestas orientadas preferentemente en sentido vertical/horizontal
    for (let i = 0; i < 2400; i++) {
      const x = prng(seed++) * 1024;
      const y = prng(seed++) * 1024;
      // Largo y ancho de la viruta
      const length = 35 + prng(seed++) * 110;
      const width = 8 + prng(seed++) * 24;
      // Ángulo: 80% alineadas verticalmente con leve variación (±18 grados), 20% cruzadas
      const isCrossed = prng(seed++) < 0.2;
      const angle = isCrossed
        ? (Math.PI / 2) + (prng(seed++) - 0.5) * 0.4
        : (prng(seed++) - 0.5) * 0.35;

      const colorIdx = Math.floor(prng(seed++) * flakeColors.length);
      const alpha = 0.7 + prng(seed++) * 0.3;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = flakeColors[colorIdx];
      ctx.globalAlpha = alpha;

      // Dibujar viruta poligonal irregular con esquinas rotas
      ctx.beginPath();
      const p1x = -length / 2;
      const p1y = -width / 2 + (prng(seed++) - 0.5) * 4;
      const p2x = length / 2;
      const p2y = -width / 2 + (prng(seed++) - 0.5) * 4;
      const p3x = length / 2 + (prng(seed++) - 0.5) * 6;
      const p3y = width / 2 + (prng(seed++) - 0.5) * 4;
      const p4x = -length / 2 - (prng(seed++) - 0.5) * 6;
      const p4y = width / 2 + (prng(seed++) - 0.5) * 4;

      ctx.moveTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.lineTo(p3x, p3y);
      ctx.lineTo(p4x, p4y);
      ctx.closePath();
      ctx.fill();

      // Líneas de veta interna en cada viruta
      ctx.strokeStyle = prng(seed++) > 0.5 ? 'rgba(80, 40, 10, 0.25)' : 'rgba(255, 230, 180, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-length / 3, 0);
      ctx.lineTo(length / 3, 0);
      ctx.stroke();

      ctx.restore();

      // Grabar en Bump Map
      bctx.save();
      bctx.translate(x, y);
      bctx.rotate(angle);
      const bumpGray = Math.floor(100 + prng(seed++) * 110);
      bctx.fillStyle = `rgb(${bumpGray}, ${bumpGray}, ${bumpGray})`;
      bctx.globalAlpha = 0.5;
      bctx.fillRect(-length / 2, -width / 2, length, width);
      bctx.restore();
    }

    // Tinte de resina fenólica / MDI translúcida
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#6b3600';
    ctx.fillRect(0, 0, 1024, 1024);

    // Timbre técnico PROSIP APA / NCh sutil
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#1e3a8a';
    for (let sy = 120; sy < 1000; sy += 320) {
      ctx.fillText('PROSIP APA RATED OSB/3 STRUCTURAL 11.1mm E1 NCh2165', 80, sy);
      ctx.fillText('▲ THIS SIDE UP - RESINA MDI CLASE 1 - CONTROL CALIDAD', 120, sy + 30);
    }
    ctx.restore();
  }

  // 2. TEXTURA EPS (Poliestireno expandido de alta densidad blanco perlado)
  const epsCanvas = document.createElement('canvas');
  epsCanvas.width = 512;
  epsCanvas.height = 512;
  const ectx = epsCanvas.getContext('2d');
  if (ectx) {
    ectx.fillStyle = '#f8fafc';
    ectx.fillRect(0, 0, 512, 512);

    // Perlas de poliestireno sutiles (micro-esferas EPS 15-20 kg/m3)
    let eseed = 54321;
    const eprng = () => {
      let t = eseed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    for (let i = 0; i < 1800; i++) {
      const ex = eprng() * 512;
      const ey = eprng() * 512;
      const er = 2 + eprng() * 4.5;
      ectx.beginPath();
      ectx.arc(ex, ey, er, 0, Math.PI * 2);
      ectx.fillStyle = eprng() > 0.5 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(226, 232, 240, 0.45)';
      ectx.fill();
      ectx.strokeStyle = 'rgba(203, 213, 225, 0.25)';
      ectx.lineWidth = 0.5;
      ectx.stroke();
    }
  }

  // 3. TEXTURA CANTO OSB CON SELLADOR ROJO / NARANJA DE FÁBRICA
  const edgeCanvas = document.createElement('canvas');
  edgeCanvas.width = 256;
  edgeCanvas.height = 256;
  const edctx = edgeCanvas.getContext('2d');
  if (edctx) {
    // Fondo de capas prensadas de madera
    edctx.fillStyle = '#b3783b';
    edctx.fillRect(0, 0, 256, 256);

    // Franja de sellador impermeable rojo/naranja en el borde exterior
    edctx.fillStyle = '#dc2626';
    edctx.fillRect(0, 0, 256, 32);
    edctx.fillStyle = '#ea580c';
    edctx.fillRect(0, 32, 256, 20);

    // Estratos de virutas cortadas
    for (let y = 52; y < 256; y += 8) {
      edctx.fillStyle = y % 16 === 0 ? '#925c27' : '#caa068';
      edctx.fillRect(0, y, 256, 7);
    }
  }

  // 4. TEXTURA MADERA ESTRUCTURAL REALISTA (Listón de Pino Radiata / Pino Estructural según imagen del usuario)
  // 4.1 Veta Longitudinal Vertical (para pies derechos, jambas, puntales)
  const timberCanvas = document.createElement('canvas');
  timberCanvas.width = 512;
  timberCanvas.height = 512;
  const tctx = timberCanvas.getContext('2d');

  // 4.2 Mapa de Relieve / Bump Map Longitudinal (para sensación física de ranuras y fibras aserradas)
  const timberBumpCanvas = document.createElement('canvas');
  timberBumpCanvas.width = 512;
  timberBumpCanvas.height = 512;
  const tbctx = timberBumpCanvas.getContext('2d');

  if (tctx && tbctx) {
    // Fondo base cálido ámbar/miel de pino natural calibrado (idéntico a la imagen)
    tctx.fillStyle = '#bfa06b';
    tctx.fillRect(0, 0, 512, 512);

    tbctx.fillStyle = '#808080';
    tbctx.fillRect(0, 0, 512, 512);

    // Vetas longitudinales pronunciadas continuas en el eje Y (longitudinal)
    for (let x = 0; x < 512; x += 3) {
      const wave = Math.sin(x * 0.05) * 4 + Math.sin(x * 0.13) * 2;
      const isAnnualRing = x % 20 < 3 || x % 37 < 2;
      const alpha = isAnnualRing ? 0.35 : 0.15;

      tctx.fillStyle = isAnnualRing ? `rgba(118, 77, 34, ${alpha})` : `rgba(156, 114, 62, ${alpha})`;
      tctx.fillRect(x + wave, 0, 2.5, 512);

      const bumpVal = isAnnualRing ? 40 : 110;
      tbctx.fillStyle = `rgb(${bumpVal}, ${bumpVal}, ${bumpVal})`;
      tbctx.fillRect(x + wave, 0, 2.5, 512);
    }

    // Micro-fibras longitudinales y estrías de cepillo
    for (let i = 0; i < 70; i++) {
      const lineX = (i * 13) % 512;
      const wave = Math.cos(i * 0.4) * 2;
      tctx.fillStyle = 'rgba(92, 56, 20, 0.22)';
      tctx.fillRect(lineX + wave, 0, 1.2, 512);

      tbctx.fillStyle = 'rgb(30, 30, 30)';
      tbctx.fillRect(lineX + wave, 0, 1.2, 512);
    }

    // Nudos y desviaciones de veta naturales
    const knots = [
      { x: 130, y: 150, rx: 16, ry: 26 },
      { x: 370, y: 340, rx: 18, ry: 30 },
    ];
    knots.forEach((k) => {
      const grad = tctx.createRadialGradient(k.x, k.y, 2, k.x, k.y, k.ry);
      grad.addColorStop(0, 'rgba(85, 48, 16, 0.7)');
      grad.addColorStop(0.5, 'rgba(130, 85, 38, 0.4)');
      grad.addColorStop(1, 'rgba(191, 160, 107, 0)');
      tctx.fillStyle = grad;
      tctx.beginPath();
      tctx.ellipse(k.x, k.y, k.rx, k.ry, 0, 0, Math.PI * 2);
      tctx.fill();
    });
  }

  // 4.3 Veta Longitudinal Horizontal (para soleras inferiores, superiores, dinteles y vigas)
  const timberHCanvas = document.createElement('canvas');
  timberHCanvas.width = 512;
  timberHCanvas.height = 512;
  const thctx = timberHCanvas.getContext('2d');
  if (thctx) {
    thctx.fillStyle = '#bfa06b';
    thctx.fillRect(0, 0, 512, 512);

    for (let y = 0; y < 512; y += 3) {
      const wave = Math.sin(y * 0.05) * 4 + Math.sin(y * 0.13) * 2;
      const isAnnualRing = y % 20 < 3 || y % 37 < 2;
      const alpha = isAnnualRing ? 0.35 : 0.15;

      thctx.fillStyle = isAnnualRing ? `rgba(118, 77, 34, ${alpha})` : `rgba(156, 114, 62, ${alpha})`;
      thctx.fillRect(0, y + wave, 512, 2.5);
    }

    for (let i = 0; i < 70; i++) {
      const lineY = (i * 13) % 512;
      const wave = Math.cos(i * 0.4) * 2;
      thctx.fillStyle = 'rgba(92, 56, 20, 0.22)';
      thctx.fillRect(0, lineY + wave, 512, 1.2);
    }
  }

  // 4.4 Testa / Corte Transversal con Anillos Concéntricos (como la cabeza del listón en la imagen 1)
  const timberEndCanvas = document.createElement('canvas');
  timberEndCanvas.width = 256;
  timberEndCanvas.height = 256;
  const tectx = timberEndCanvas.getContext('2d');
  if (tectx) {
    tectx.fillStyle = '#bfa06b';
    tectx.fillRect(0, 0, 256, 256);

    const centerX = 230;
    const centerY = 230;

    for (let r = 8; r < 320; r += 7) {
      const isDark = r % 14 === 0;
      tectx.strokeStyle = isDark ? 'rgba(105, 65, 25, 0.55)' : 'rgba(155, 110, 55, 0.3)';
      tectx.lineWidth = isDark ? 2.5 : 1.5;
      tectx.beginPath();
      tectx.arc(centerX, centerY, r, 0, Math.PI * 2);
      tectx.stroke();
    }
  }

  // Crear CanvasTextures de Three.js
  cachedOsbTexture = new THREE.CanvasTexture(osbCanvas);
  cachedOsbTexture.wrapS = THREE.RepeatWrapping;
  cachedOsbTexture.wrapT = THREE.RepeatWrapping;
  cachedOsbTexture.repeat.set(1.5, 2.5);

  cachedOsbBumpMap = new THREE.CanvasTexture(bumpCanvas);
  cachedOsbBumpMap.wrapS = THREE.RepeatWrapping;
  cachedOsbBumpMap.wrapT = THREE.RepeatWrapping;
  cachedOsbBumpMap.repeat.set(1.5, 2.5);

  cachedEpsTexture = new THREE.CanvasTexture(epsCanvas);
  cachedEpsTexture.wrapS = THREE.RepeatWrapping;
  cachedEpsTexture.wrapT = THREE.RepeatWrapping;
  cachedEpsTexture.repeat.set(3, 3);

  cachedOsbEdgeTexture = new THREE.CanvasTexture(edgeCanvas);
  cachedOsbEdgeTexture.wrapS = THREE.RepeatWrapping;
  cachedOsbEdgeTexture.wrapT = THREE.RepeatWrapping;

  cachedTimberTexture = new THREE.CanvasTexture(timberCanvas);
  cachedTimberTexture.wrapS = THREE.RepeatWrapping;
  cachedTimberTexture.wrapT = THREE.RepeatWrapping;
  cachedTimberTexture.repeat.set(1, 4);

  cachedTimberHorizontalTexture = new THREE.CanvasTexture(timberHCanvas);
  cachedTimberHorizontalTexture.wrapS = THREE.RepeatWrapping;
  cachedTimberHorizontalTexture.wrapT = THREE.RepeatWrapping;
  cachedTimberHorizontalTexture.repeat.set(4, 1);

  cachedTimberBumpMap = new THREE.CanvasTexture(timberBumpCanvas);
  cachedTimberBumpMap.wrapS = THREE.RepeatWrapping;
  cachedTimberBumpMap.wrapT = THREE.RepeatWrapping;
  cachedTimberBumpMap.repeat.set(1, 4);

  cachedTimberEndGrainTexture = new THREE.CanvasTexture(timberEndCanvas);

  return {
    osbTexture: cachedOsbTexture,
    osbBumpMap: cachedOsbBumpMap,
    osbEdgeTexture: cachedOsbEdgeTexture,
    epsTexture: cachedEpsTexture,
    timberTexture: cachedTimberTexture,
    timberHorizontalTexture: cachedTimberHorizontalTexture,
    timberBumpMap: cachedTimberBumpMap,
    timberEndGrainTexture: cachedTimberEndGrainTexture,
  };
}
