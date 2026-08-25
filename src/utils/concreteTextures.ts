import * as THREE from 'three';

let cachedWallTexture: THREE.CanvasTexture | null = null;
let cachedWallBumpMap: THREE.CanvasTexture | null = null;
let cachedWallRoughnessMap: THREE.CanvasTexture | null = null;

let cachedSlabTexture: THREE.CanvasTexture | null = null;
let cachedSlabBumpMap: THREE.CanvasTexture | null = null;
let cachedSlabRoughnessMap: THREE.CanvasTexture | null = null;

let cachedCeilingTexture: THREE.CanvasTexture | null = null;
let cachedLeanConcreteTexture: THREE.CanvasTexture | null = null;

/**
 * Genera texturas hiperrealistas de Hormigón Armado Visto (Béton Brut / Architectural Fair-Faced Concrete)
 * inspiradas directamente en el estándar de encofrado arquitectónico con conos pasamuros,
 * juntas de moldaje moduladas, micro-porosidades de desencofrado y vetas naturales de fraguado.
 */
export function getConcreteTextures() {
  if (
    cachedWallTexture &&
    cachedWallBumpMap &&
    cachedWallRoughnessMap &&
    cachedSlabTexture &&
    cachedSlabBumpMap &&
    cachedSlabRoughnessMap &&
    cachedCeilingTexture &&
    cachedLeanConcreteTexture
  ) {
    return {
      wallTexture: cachedWallTexture,
      wallBumpMap: cachedWallBumpMap,
      wallRoughnessMap: cachedWallRoughnessMap,
      slabTexture: cachedSlabTexture,
      slabBumpMap: cachedSlabBumpMap,
      slabRoughnessMap: cachedSlabRoughnessMap,
      ceilingTexture: cachedCeilingTexture,
      leanConcreteTexture: cachedLeanConcreteTexture,
    };
  }

  // Dimensiones de alta resolución para renderizado nítido
  const size = 1024;

  // -------------------------------------------------------------
  // 1. TEXTURA DE MUROS (HORMIGÓN VISTO ARQUITECTÓNICO CON CONOS)
  // -------------------------------------------------------------
  const wallCanvas = document.createElement('canvas');
  wallCanvas.width = size;
  wallCanvas.height = size;
  const wctx = wallCanvas.getContext('2d');

  const wallBumpCanvas = document.createElement('canvas');
  wallBumpCanvas.width = size;
  wallBumpCanvas.height = size;
  const wbctx = wallBumpCanvas.getContext('2d');

  const wallRoughCanvas = document.createElement('canvas');
  wallRoughCanvas.width = size;
  wallRoughCanvas.height = size;
  const wrctx = wallRoughCanvas.getContext('2d');

  if (wctx && wbctx && wrctx) {
    // 1.1 Base cromática de cemento Portland (gris medio natural)
    wctx.fillStyle = '#9aa1a9';
    wctx.fillRect(0, 0, size, size);

    wbctx.fillStyle = '#808080';
    wbctx.fillRect(0, 0, size, size);

    wrctx.fillStyle = '#b0b0b0'; // Roughness moderada mate
    wrctx.fillRect(0, 0, size, size);

    // 1.2 Capas de nubes de fraguado e hidratación (manchas y variaciones tonales)
    for (let i = 0; i < 45; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 60 + Math.random() * 220;
      const isDark = Math.random() > 0.45;

      const grad = wctx.createRadialGradient(x, y, 10, x, y, radius);
      if (isDark) {
        grad.addColorStop(0, 'rgba(115, 122, 131, 0.28)');
        grad.addColorStop(0.6, 'rgba(130, 137, 146, 0.12)');
        grad.addColorStop(1, 'rgba(154, 161, 169, 0)');
      } else {
        grad.addColorStop(0, 'rgba(182, 189, 197, 0.32)');
        grad.addColorStop(0.6, 'rgba(168, 175, 183, 0.14)');
        grad.addColorStop(1, 'rgba(154, 161, 169, 0)');
      }
      wctx.fillStyle = grad;
      wctx.beginPath();
      wctx.arc(x, y, radius, 0, Math.PI * 2);
      wctx.fill();

      // Bump suave en manchas
      const bgrad = wbctx.createRadialGradient(x, y, 5, x, y, radius);
      bgrad.addColorStop(0, isDark ? 'rgba(110, 110, 110, 0.15)' : 'rgba(145, 145, 145, 0.15)');
      bgrad.addColorStop(1, 'rgba(128, 128, 128, 0)');
      wbctx.fillStyle = bgrad;
      wbctx.beginPath();
      wbctx.arc(x, y, radius, 0, Math.PI * 2);
      wbctx.fill();
    }

    // 1.3 Micro-porosidad y áridos finos (arena silícea y motas de cemento)
    const imgData = wctx.getImageData(0, 0, size, size);
    const bData = wbctx.getImageData(0, 0, size, size);
    const rData = wrctx.getImageData(0, 0, size, size);
    const pixels = imgData.data;
    const bPixels = bData.data;
    const rPixels = rData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      const noise = (Math.random() - 0.5) * 26;
      pixels[i] = Math.min(255, Math.max(0, pixels[i] + noise));
      pixels[i + 1] = Math.min(255, Math.max(0, pixels[i + 1] + noise));
      pixels[i + 2] = Math.min(255, Math.max(0, pixels[i + 2] + noise));

      // Bump con grano mineral fino
      const bumpNoise = (Math.random() - 0.5) * 32;
      bPixels[i] = Math.min(255, Math.max(0, bPixels[i] + bumpNoise));
      bPixels[i + 1] = Math.min(255, Math.max(0, bPixels[i + 1] + bumpNoise));
      bPixels[i + 2] = Math.min(255, Math.max(0, bPixels[i + 2] + bumpNoise));

      // Roughness variable
      rPixels[i] = Math.min(255, Math.max(0, rPixels[i] + (Math.random() - 0.5) * 20));
      rPixels[i + 1] = rPixels[i];
      rPixels[i + 2] = rPixels[i];
    }
    wctx.putImageData(imgData, 0, 0);
    wbctx.putImageData(bData, 0, 0);
    wrctx.putImageData(rData, 0, 0);

    // 1.4 Poro burbujas de desencofrado (pequeñas oquedades esparcidas)
    for (let p = 0; p < 350; p++) {
      const px = Math.random() * size;
      const py = Math.random() * size;
      const pr = 1 + Math.random() * 2.5;

      // Color poro oscuro
      wctx.fillStyle = 'rgba(70, 75, 82, 0.65)';
      wctx.beginPath();
      wctx.arc(px, py, pr, 0, Math.PI * 2);
      wctx.fill();

      // Sombra proyectada del micro-poro
      wctx.fillStyle = 'rgba(195, 202, 210, 0.4)';
      wctx.beginPath();
      wctx.arc(px + 0.8, py + 0.8, pr * 0.7, 0, Math.PI * 2);
      wctx.fill();

      // Bump de hendidura en poro
      wbctx.fillStyle = 'rgba(30, 30, 30, 0.8)';
      wbctx.beginPath();
      wbctx.arc(px, py, pr, 0, Math.PI * 2);
      wbctx.fill();
    }

    // 1.5 Juntas de modulación de tableros de moldaje (panel joints cada 512px)
    const panelLines = [0, size / 2, size - 1];

    // Juntas horizontales y verticales
    panelLines.forEach((pos) => {
      // Línea horizontal
      wctx.strokeStyle = 'rgba(60, 65, 72, 0.6)';
      wctx.lineWidth = 2.5;
      wctx.beginPath();
      wctx.moveTo(0, pos);
      wctx.lineTo(size, pos);
      wctx.stroke();

      // Brillo tenue en el borde superior de la junta
      wctx.strokeStyle = 'rgba(215, 222, 230, 0.45)';
      wctx.lineWidth = 1.5;
      wctx.beginPath();
      wctx.moveTo(0, pos + 2.5);
      wctx.lineTo(size, pos + 2.5);
      wctx.stroke();

      // Línea vertical
      wctx.strokeStyle = 'rgba(60, 65, 72, 0.6)';
      wctx.lineWidth = 2.5;
      wctx.beginPath();
      wctx.moveTo(pos, 0);
      wctx.lineTo(pos, size);
      wctx.stroke();

      // Brillo tenue en el borde derecho
      wctx.strokeStyle = 'rgba(215, 222, 230, 0.45)';
      wctx.lineWidth = 1.5;
      wctx.beginPath();
      wctx.moveTo(pos + 2.5, 0);
      wctx.lineTo(pos + 2.5, size);
      wctx.stroke();

      // Bump de ranura profunda
      wbctx.strokeStyle = 'rgba(10, 10, 10, 0.9)';
      wbctx.lineWidth = 3;
      wbctx.beginPath();
      wbctx.moveTo(0, pos);
      wbctx.lineTo(size, pos);
      wbctx.moveTo(pos, 0);
      wbctx.lineTo(pos, size);
      wbctx.stroke();
    });

    // 1.6 Conos Pasamuros / Tie-rod Holes (con hendidura sombreada y tapón central oscuro)
    const coneCols = [
      size * 0.08,
      size * 0.25,
      size * 0.42,
      size * 0.58,
      size * 0.75,
      size * 0.92,
    ];
    const coneRows = [
      size * 0.08,
      size * 0.25,
      size * 0.42,
      size * 0.58,
      size * 0.75,
      size * 0.92,
    ];

    coneCols.forEach((cx) => {
      coneRows.forEach((cy) => {
        const outerRadius = 8;
        const innerRadius = 3.2;

        // Anillo biselado cónico exterior (sombra deprimida)
        const coneGrad = wctx.createRadialGradient(cx - 1.5, cy - 1.5, 1, cx, cy, outerRadius);
        coneGrad.addColorStop(0, '#505660');
        coneGrad.addColorStop(0.65, '#6a717b');
        coneGrad.addColorStop(0.9, '#8c939c');
        coneGrad.addColorStop(1, 'rgba(154, 161, 169, 0)');

        wctx.fillStyle = coneGrad;
        wctx.beginPath();
        wctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
        wctx.fill();

        // Aro de luz reflejada en el borde inferior del bisel
        wctx.strokeStyle = 'rgba(220, 226, 233, 0.5)';
        wctx.lineWidth = 1.2;
        wctx.beginPath();
        wctx.arc(cx, cy, outerRadius - 0.5, 0.2 * Math.PI, 0.8 * Math.PI);
        wctx.stroke();

        // Agujero / Tapón central oscuro
        wctx.fillStyle = '#2d3137';
        wctx.beginPath();
        wctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
        wctx.fill();

        // Bump del cono pasamuro (depresión circular profunda)
        const bConeGrad = wbctx.createRadialGradient(cx, cy, 1, cx, cy, outerRadius);
        bConeGrad.addColorStop(0, '#050505');
        bConeGrad.addColorStop(0.6, '#353535');
        bConeGrad.addColorStop(1, '#808080');

        wbctx.fillStyle = bConeGrad;
        wbctx.beginPath();
        wbctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
        wbctx.fill();
      });
    });
  }

  // -------------------------------------------------------------
  // 2. TEXTURA DE LOSAS & RADIER (HORMIGÓN ALISADO MECÁNICAMENTE)
  // -------------------------------------------------------------
  const slabCanvas = document.createElement('canvas');
  slabCanvas.width = size;
  slabCanvas.height = size;
  const sctx = slabCanvas.getContext('2d');

  const slabBumpCanvas = document.createElement('canvas');
  slabBumpCanvas.width = size;
  slabBumpCanvas.height = size;
  const sbctx = slabBumpCanvas.getContext('2d');

  if (sctx && sbctx) {
    // Tono más pétreo y pulido / helicóptero para pavimentos
    sctx.fillStyle = '#8f969f';
    sctx.fillRect(0, 0, size, size);

    sbctx.fillStyle = '#808080';
    sbctx.fillRect(0, 0, size, size);

    // Manchas helicoidales suaves de alisado mecánico
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const rad = 100 + Math.random() * 250;
      const isDark = Math.random() > 0.5;

      const grad = sctx.createRadialGradient(x, y, 20, x, y, rad);
      grad.addColorStop(0, isDark ? 'rgba(110, 116, 125, 0.22)' : 'rgba(175, 182, 190, 0.25)');
      grad.addColorStop(1, 'rgba(143, 150, 159, 0)');
      sctx.fillStyle = grad;
      sctx.beginPath();
      sctx.arc(x, y, rad, 0, Math.PI * 2);
      sctx.fill();
    }

    // Grano fino de arena
    const simgData = sctx.getImageData(0, 0, size, size);
    const sbData = sbctx.getImageData(0, 0, size, size);
    for (let i = 0; i < simgData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 18;
      simgData.data[i] += n;
      simgData.data[i + 1] += n;
      simgData.data[i + 2] += n;

      const bn = (Math.random() - 0.5) * 22;
      sbData.data[i] += bn;
      sbData.data[i + 1] += bn;
      sbData.data[i + 2] += bn;
    }
    sctx.putImageData(simgData, 0, 0);
    sbctx.putImageData(sbData, 0, 0);

    // Juntas de dilatación / aserrado de control en cruz
    sctx.strokeStyle = 'rgba(50, 54, 60, 0.7)';
    sctx.lineWidth = 3;
    sctx.beginPath();
    sctx.moveTo(size / 2, 0);
    sctx.lineTo(size / 2, size);
    sctx.moveTo(0, size / 2);
    sctx.lineTo(size, size / 2);
    sctx.stroke();

    sbctx.strokeStyle = '#202020';
    sbctx.lineWidth = 3.5;
    sbctx.beginPath();
    sbctx.moveTo(size / 2, 0);
    sbctx.lineTo(size / 2, size);
    sbctx.moveTo(0, size / 2);
    sbctx.lineTo(size, size / 2);
    sbctx.stroke();
  }

  // -------------------------------------------------------------
  // 3. TEXTURA DE CIELO DE HORMIGÓN VISTO
  // -------------------------------------------------------------
  const ceilingCanvas = document.createElement('canvas');
  ceilingCanvas.width = size;
  ceilingCanvas.height = size;
  const cctx = ceilingCanvas.getContext('2d');
  if (cctx) {
    // Tono ligeramente más claro para reflejar luminosidad en cielos
    cctx.fillStyle = '#a6adb5';
    cctx.fillRect(0, 0, size, size);

    // Formwork de tablas o placa de cielo
    for (let i = 0; i < 35; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 80 + Math.random() * 200;
      const g = cctx.createRadialGradient(x, y, 10, x, y, r);
      g.addColorStop(0, Math.random() > 0.5 ? 'rgba(130, 136, 145, 0.2)' : 'rgba(190, 197, 205, 0.25)');
      g.addColorStop(1, 'rgba(166, 173, 181, 0)');
      cctx.fillStyle = g;
      cctx.beginPath();
      cctx.arc(x, y, r, 0, Math.PI * 2);
      cctx.fill();
    }

    // Juntas de moldaje de cielo (tableros 512px)
    cctx.strokeStyle = 'rgba(70, 75, 82, 0.5)';
    cctx.lineWidth = 2;
    cctx.strokeRect(0, 0, size, size);
    cctx.beginPath();
    cctx.moveTo(size / 2, 0);
    cctx.lineTo(size / 2, size);
    cctx.moveTo(0, size / 2);
    cctx.lineTo(size, size / 2);
    cctx.stroke();
  }

  // -------------------------------------------------------------
  // 4. TEXTURA DE EMPLANTILLADO / HORMIGÓN POBRE
  // -------------------------------------------------------------
  const leanCanvas = document.createElement('canvas');
  leanCanvas.width = 512;
  leanCanvas.height = 512;
  const lctx = leanCanvas.getContext('2d');
  if (lctx) {
    lctx.fillStyle = '#5a6068';
    lctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 800; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 1.5 + Math.random() * 4;
      lctx.fillStyle = Math.random() > 0.5 ? 'rgba(40, 43, 48, 0.7)' : 'rgba(130, 137, 145, 0.7)';
      lctx.beginPath();
      lctx.arc(x, y, r, 0, Math.PI * 2);
      lctx.fill();
    }
  }

  // Creación y configuración de THREE.CanvasTexture con wrapping
  cachedWallTexture = new THREE.CanvasTexture(wallCanvas);
  cachedWallTexture.wrapS = THREE.RepeatWrapping;
  cachedWallTexture.wrapT = THREE.RepeatWrapping;
  cachedWallTexture.repeat.set(1, 1);
  cachedWallTexture.colorSpace = THREE.SRGBColorSpace;

  cachedWallBumpMap = new THREE.CanvasTexture(wallBumpCanvas);
  cachedWallBumpMap.wrapS = THREE.RepeatWrapping;
  cachedWallBumpMap.wrapT = THREE.RepeatWrapping;
  cachedWallBumpMap.repeat.set(1, 1);

  cachedWallRoughnessMap = new THREE.CanvasTexture(wallRoughCanvas);
  cachedWallRoughnessMap.wrapS = THREE.RepeatWrapping;
  cachedWallRoughnessMap.wrapT = THREE.RepeatWrapping;
  cachedWallRoughnessMap.repeat.set(1, 1);

  cachedSlabTexture = new THREE.CanvasTexture(slabCanvas);
  cachedSlabTexture.wrapS = THREE.RepeatWrapping;
  cachedSlabTexture.wrapT = THREE.RepeatWrapping;
  cachedSlabTexture.repeat.set(2, 2);
  cachedSlabTexture.colorSpace = THREE.SRGBColorSpace;

  cachedSlabBumpMap = new THREE.CanvasTexture(slabBumpCanvas);
  cachedSlabBumpMap.wrapS = THREE.RepeatWrapping;
  cachedSlabBumpMap.wrapT = THREE.RepeatWrapping;
  cachedSlabBumpMap.repeat.set(2, 2);

  cachedSlabRoughnessMap = new THREE.CanvasTexture(slabCanvas);
  cachedSlabRoughnessMap.wrapS = THREE.RepeatWrapping;
  cachedSlabRoughnessMap.wrapT = THREE.RepeatWrapping;

  cachedCeilingTexture = new THREE.CanvasTexture(ceilingCanvas);
  cachedCeilingTexture.wrapS = THREE.RepeatWrapping;
  cachedCeilingTexture.wrapT = THREE.RepeatWrapping;
  cachedCeilingTexture.repeat.set(2, 2);
  cachedCeilingTexture.colorSpace = THREE.SRGBColorSpace;

  cachedLeanConcreteTexture = new THREE.CanvasTexture(leanCanvas);
  cachedLeanConcreteTexture.wrapS = THREE.RepeatWrapping;
  cachedLeanConcreteTexture.wrapT = THREE.RepeatWrapping;
  cachedLeanConcreteTexture.repeat.set(3, 3);
  cachedLeanConcreteTexture.colorSpace = THREE.SRGBColorSpace;

  return {
    wallTexture: cachedWallTexture,
    wallBumpMap: cachedWallBumpMap,
    wallRoughnessMap: cachedWallRoughnessMap,
    slabTexture: cachedSlabTexture,
    slabBumpMap: cachedSlabBumpMap,
    slabRoughnessMap: cachedSlabRoughnessMap,
    ceilingTexture: cachedCeilingTexture,
    leanConcreteTexture: cachedLeanConcreteTexture,
  };
}
