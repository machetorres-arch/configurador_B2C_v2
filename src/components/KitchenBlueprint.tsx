import React, { useState } from 'react';
import { Printer, Download, X, HelpCircle, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { useStore } from '../store';
import { useKitchenStore, CabinetType } from '../store/kitchenStore';
import { analyzeRoomWalls } from '../utils/roomGeometry';
import { getCabinetBox2D } from '../utils/kitchenCollision';
import { Part } from '../utils/manufacturing';
import { generateKitchenPartsList, generateKitchenHardwareList, HARDWARE_SPECS } from '../utils/kitchenManufacturing';
import { optimizeNesting, NestingPart, BoardResult } from '../utils/nesting';
import { exportKitchenPDF } from '../utils/kitchenPdfGenerator';
import { exportBlueprintDomToPdf } from '../utils/blueprintPdfExport';

export function KitchenBlueprint() {
  const state = useStore();
  const kState = useKitchenStore();
  const [isExportingA3, setIsExportingA3] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);

  if (!state.isPrinting) return null;

  const handleExportA3 = async () => {
    setIsExportingA3(true);
    try {
      await exportBlueprintDomToPdf('planos_fabricacion_cocina_A3.pdf', (curr, tot) => {
        setExportProgress({ current: curr, total: tot });
      });
    } catch (err) {
      console.error('Error al exportar planos A3 en PDF', err);
      alert('Ocurrió un detalle al generar el archivo. También puedes utilizar el botón "Imprimir / Guardar".');
    } finally {
      setIsExportingA3(false);
      setExportProgress(null);
    }
  };

  let allParts: Part[] = [];
  try {
    allParts = generateKitchenPartsList(kState.cabinets);
  } catch (e: any) {
    console.error('Kitchen Blueprint error:', e);
  }
  
  const hwSpec = HARDWARE_SPECS[state.drawerHardware || 'Provelcar'] || HARDWARE_SPECS.Provelcar;
  const hardwareList = generateKitchenHardwareList(kState.cabinets);
  const thicknessMm = (state.thickness || 1.5) * 10;
  const halfThickness = thicknessMm / 2;

  // Filtrar muebles reales (no decorativos)
  const realCabinets = kState.cabinets.filter(c => c.type !== 'decoration' && !c.variant?.startsWith('deco_'));

  // Agrupar piezas por gabinete y paginar
  const printPages: { 
    cab: CabinetType; 
    index: number; 
    identTag: string;
    parts: Part[]; 
    isContinuation: boolean; 
    pageSubIndex: number; 
    totalModPages: number;
    moduleParts: Part[];
  }[] = [];
  
  realCabinets.forEach((cab, index) => {
    const cabParts = allParts.filter(p => p.moduleId === cab.id);
    
    // Tag de identificación de etiqueta (A-1, B-1, T-1, etc.)
    const tagPrefix = cab.type === 'wall' ? 'A' : cab.type === 'tall' ? 'T' : cab.type === 'island' ? 'I' : 'B';
    const identTag = `${tagPrefix}-${index + 1}`;

    // Agrupar piezas únicas
    const uniqueParts: Part[] = [];
    cabParts.forEach(p => {
      const existing = uniqueParts.find(up => up.name === p.name && Math.abs(up.length - p.length) < 1 && Math.abs(up.width - p.width) < 1 && up.material === p.material);
      if (existing) {
        existing.qty += p.qty;
      } else {
        uniqueParts.push({ ...p });
      }
    });

    const partsPerPage = 8;
    const totalPages = Math.max(1, Math.ceil(uniqueParts.length / partsPerPage));
    
    for (let i = 0; i < totalPages; i++) {
      printPages.push({
        cab,
        index,
        identTag,
        parts: uniqueParts.slice(i * partsPerPage, (i + 1) * partsPerPage),
        isContinuation: i > 0,
        pageSubIndex: i + 1,
        totalModPages: totalPages,
        moduleParts: cabParts
      });
    }
  });

  // Helper para nombre de color
  const getColorName = (colorVal?: string) => {
    if (!colorVal) return 'Melamina Blanca 15mm';
    const hexMap: Record<string, string> = {
      '#FFFFFF': 'Blanco Frost',
      '#171717': 'Negro Profundo',
      '#F8F9FA': 'Bianco Polo',
      '#202020': 'Nero',
      '#D4A373': 'Roble Natural',
      '#A3B18A': 'Verde Salvia',
      '#588157': 'Verde Bosque',
      '#3A5A40': 'Verde Olivo',
      '#E0E1DD': 'Gris Humo',
      '#778DA9': 'Azul Nórdico',
      '#415A77': 'Azul Petróleo',
      '#1B263B': 'Azul Noche',
      '#2B2D42': 'Grafito Mate',
      '#8D99AE': 'Gris Plata',
      '#EDF2F4': 'Blanco Nieve',
      '#DDA15E': 'Madera Teca',
      '#BC6C25': 'Nogal Ceniza',
    };
    if (colorVal.startsWith('#')) return hexMap[colorVal.toUpperCase()] || `Color ${colorVal}`;
    const found = state.customTextures?.find((t: any) => t.url === colorVal);
    if (found) return found.name;
    const parts = colorVal.split('/');
    return parts[parts.length - 1].replace('.jpg', '').replace('.png', '').replace('.svg', '').replace(/[-_]/g, ' ');
  };

  // Nesting (Optimización de corte agrupada por material / sustrato)
  interface BoardGroupDef {
    key: string;
    label: string;
    materialCategory: 'doors' | 'structure' | 'backs' | 'hpl';
    materialName: string;
    color: string;
    thicknessMm: number;
    w: number;
    h: number;
    parts: NestingPart[];
  }

  const boardGroups: Record<string, BoardGroupDef> = {};

  allParts.forEach((p, pIdx) => {
    const isFront = p.name.includes('Puerta') || p.name.includes('Frente') || p.name.includes('Panel Ciego');
    const isBack = p.thickness === 3 || p.thickness === 3.5 || p.material === 'Melamina Fondo' || (p.name.includes('Fondo') && !p.name.includes('Soporte')) || (p.name.includes('Trasera') && !p.name.includes('Barra') && !p.name.includes('Caja Cajón'));

    let groupKey = '';
    let label = '';
    let materialCategory: 'doors' | 'structure' | 'backs' | 'hpl' = 'structure';
    let w = 2440;
    let h = 1830;
    let thick = thicknessMm;
    const matName = getColorName(p.material);

    if (isBack) {
      groupKey = `BACKS_${p.material || 'mdf3mm'}`;
      label = `PLANCHA DUROLAC / MDF 3MM (FONDOS Y TRASERAS) - COLOR: ${matName}`;
      materialCategory = 'backs';
      thick = 3;
    } else if (isFront) {
      const isHPL = state.doorMaterial === 'hpl';
      if (isHPL) {
        groupKey = `HPL_DOORS_${p.material}`;
        label = `PLANCHA LAMINADO HPL PUERTAS Y FRENTES - COLOR: ${matName}`;
        materialCategory = 'hpl';
        w = 3050;
        h = 1300;
      } else {
        groupKey = `MEL_DOORS_${p.material}`;
        label = `PLANCHA MELAMINA PUERTAS Y FRENTES ${thicknessMm}MM - COLOR: ${matName}`;
        materialCategory = 'doors';
      }
    } else {
      groupKey = `MEL_STRUCT_${p.material}`;
      label = `PLANCHA MELAMINA ESTRUCTURA Y CAJONES ${thicknessMm}MM - COLOR: ${matName}`;
      materialCategory = 'structure';
    }

    if (!boardGroups[groupKey]) {
      boardGroups[groupKey] = {
        key: groupKey,
        label,
        materialCategory,
        materialName: matName,
        color: p.material || '#FFFFFF',
        thicknessMm: thick,
        w,
        h,
        parts: []
      };
    }

    const isWoodGrain = p.material?.includes('roble') || p.material?.includes('nogal') || p.material?.includes('madera') || p.material?.includes('hickory') || p.material?.includes('wood');
    const allowRotation = isBack ? true : !isWoodGrain;

    boardGroups[groupKey].parts.push({
      id: `p-${pIdx}-${p.name}`,
      name: p.name,
      width: Math.round(p.width),
      length: Math.round(p.length),
      color: p.material || '#FFFFFF',
      qty: p.qty,
      edgeL1: isBack ? false : !!p.edgeL1,
      edgeL2: isBack ? false : !!p.edgeL2,
      edgeW1: isBack ? false : !!p.edgeW1,
      edgeW2: isBack ? false : !!p.edgeW2,
      allowRotation
    });
  });

  const boardResults: (BoardResult & { label: string; materialName: string; materialCategory: string; thicknessMm: number })[] = [];
  const groupOrder = ['doors', 'hpl', 'structure', 'backs'];
  const sortedGroups = Object.values(boardGroups).sort((a, b) => {
    return groupOrder.indexOf(a.materialCategory) - groupOrder.indexOf(b.materialCategory);
  });

  sortedGroups.forEach(group => {
    const res = optimizeNesting(group.parts, group.w, group.h, 3.2, 15);
    res.forEach(b => {
      boardResults.push({
        ...b,
        label: group.label,
        materialName: group.materialName,
        materialCategory: group.materialCategory,
        thicknessMm: group.thicknessMm
      });
    });
  });

  const totalDocPages = 1 + printPages.length + boardResults.length + 1;

  const getCabinetTypeName = (cab: CabinetType) => {
    if (cab.type === 'wall') return 'MUEBLE AÉREO / MURAL';
    if (cab.type === 'tall') return 'MUEBLE TORRE / DESPENSA';
    if (cab.type === 'island') return 'MUEBLE ISLA';
    return 'MUEBLE BASE';
  };

  /**
   * Renderizado Paramétrico de Perforaciones y Cotas de Eje según Tipo de Ensamble y Pieza
   */
  const renderPartMachiningSVG = (part: Part, cab: CabinetType, drawW: number, drawH: number, scale: number) => {
    const isLateral = part.name.includes("Lateral") && !part.name.includes("Cajón");
    const isPiso = part.name.includes("Piso") || (part.name.includes("Base") && !part.name.includes("Soporte Horno"));
    const isTecho = part.name.includes("Techo");
    const isBarraAmarre = part.name.includes("Barra") || part.name.includes("Amarre");
    const isRepisa = part.name.includes("Repisa") || part.name.includes("Divisor");
    const isPuerta = part.name.includes("Puerta");
    const isFrenteCajon = part.name.includes("Frente Cajón");
    const isLateralCajon = part.name.includes("Lateral Cajón");
    const isTrasera = part.name.includes("Fondo") || part.name.includes("Trasera");

    const isMinifix = state.assemblyType === 'minifix';
    const hasDoors = cab.variant === '1_door' || cab.variant === '2_doors' || cab.variant === '1_door_1_drawer' || cab.variant?.startsWith('wall_1_door') || cab.variant?.startsWith('wall_2_doors') || cab.variant?.startsWith('tall_1_door') || cab.variant?.startsWith('tall_2_doors') || cab.variant === 'corner_blind' || cab.variant?.startsWith('corner_blind');
    const hasDrawers = cab.variant === '4_drawers' || cab.variant === '2_pot_drawers' || cab.variant === '1_door_1_drawer';

    const elements: React.ReactNode[] = [];

    // Colores estándar de la Nomenclatura Técnica
    const COLOR_MAGENTA = "#d946ef"; // Cotas Generales
    const COLOR_MINIFIX = "#16a34a"; // Perforación Minifix Ø15/Ø8
    const COLOR_TARUGO = "#dc2626";  // Perforación Tarugo Ø8x30
    const COLOR_SPAX = "#2563eb";    // Perforación Tornillo Spax Ø5
    const COLOR_DETALLE = "#2563eb"; // Cotas de Ejes y Detalles
    const COLOR_CANAL = "#9333ea";   // Canal Durolac

    // 1. COSTADOS / LATERALES (Desglose de ensambles, ranura durolac, bisagras y correderas)
    if (isLateral) {
      const topY = halfThickness * scale;
      const bottomY = drawH - (halfThickness * scale);
      const canalX = drawW - (15 * scale); // Canal a 15mm del borde posterior

      // Ranura Durolac en lateral
      elements.push(
        <g key="canal-durolac">
          <line x1={canalX} y1={0} x2={canalX} y2={drawH} stroke={COLOR_CANAL} strokeWidth="0.8" strokeDasharray="3,2" />
          <line x1={canalX - (4 * scale)} y1={0} x2={canalX - (4 * scale)} y2={drawH} stroke={COLOR_CANAL} strokeWidth="0.5" strokeDasharray="3,2" />
          {/* Cota canal a borde con mayor separación */}
          <line x1={canalX} y1={drawH + 8} x2={drawW} y2={drawH + 8} stroke={COLOR_DETALLE} strokeWidth="0.6" />
          <line x1={canalX} y1={drawH} x2={canalX} y2={drawH + 11} stroke={COLOR_DETALLE} strokeWidth="0.6" />
          <line x1={drawW} y1={drawH} x2={drawW} y2={drawH + 11} stroke={COLOR_DETALLE} strokeWidth="0.6" />
          <text x={canalX + (15 * scale)/2} y={drawH + 17} fontSize="8" fill={COLOR_DETALLE} textAnchor="middle" fontWeight="bold">15</text>
        </g>
      );

      // Mecanizado de Ensambles en extremos superior e inferior
      if (isMinifix) {
        // Ensamble Minifix: Pernos Ø8/Ø5 a 34mm de bordes + Tarugos Ø8 a 66mm (o 32mm de paso)
        const fxFront = 34 * scale;
        const fxBack = drawW - (50 * scale);
        const trgFront = (34 + 32) * scale;
        const trgBack = drawW - (50 + 32) * scale;

        // Perforaciones Sup / Inf
        [topY, bottomY].forEach((yPos, i) => {
          const isTop = i === 0;
          const cotaY = isTop ? -14 : drawH + 14;
          const extY = isTop ? -18 : drawH + 18;
          const prefix = isTop ? 'top' : 'bot';

          // Pernos Minifix (Verde)
          elements.push(
            <circle key={`mf-pin-1-${prefix}`} cx={fxFront} cy={yPos} r={2.4} fill={COLOR_MINIFIX} stroke="#065f46" strokeWidth="0.5" />,
            <circle key={`mf-pin-2-${prefix}`} cx={fxBack} cy={yPos} r={2.4} fill={COLOR_MINIFIX} stroke="#065f46" strokeWidth="0.5" />,
            // Tarugos Madera (Rojo)
            <circle key={`trg-pin-1-${prefix}`} cx={trgFront} cy={yPos} r={2.2} fill={COLOR_TARUGO} stroke="#991b1b" strokeWidth="0.5" />,
            <circle key={`trg-pin-2-${prefix}`} cx={trgBack} cy={yPos} r={2.2} fill={COLOR_TARUGO} stroke="#991b1b" strokeWidth="0.5" />
          );

          // Cotas de Eje al borde frontal en NIVELES ESCALONADOS (Nivel 1 = 34mm, Nivel 2 = 32mm)
          if (isTop) {
            const level1Y = -12;
            const level2Y = -24;
            const ext1Y = -15;
            const ext2Y = -27;

            elements.push(
              <g key="cota-eje-sup-front">
                {/* NIVEL 1: Cota 34mm (Borde a Minifix) */}
                <line x1={0} y1={level1Y} x2={fxFront} y2={level1Y} stroke={COLOR_DETALLE} strokeWidth="0.6" />
                <line x1={0} y1={ext1Y} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth="0.6" />
                <line x1={fxFront} y1={ext1Y} x2={fxFront} y2={yPos} stroke={COLOR_DETALLE} strokeWidth="0.6" />
                <text x={fxFront / 2} y={level1Y - 2.5} fontSize="7.5" fill={COLOR_DETALLE} textAnchor="middle" fontWeight="bold">34</text>
                
                {/* NIVEL 2: Cota 32mm (Entre Minifix y Tarugo) */}
                <line x1={fxFront} y1={level2Y} x2={trgFront} y2={level2Y} stroke={COLOR_DETALLE} strokeWidth="0.6" />
                <line x1={fxFront} y1={ext2Y} x2={fxFront} y2={level1Y} stroke={COLOR_DETALLE} strokeWidth="0.6" />
                <line x1={trgFront} y1={ext2Y} x2={trgFront} y2={yPos} stroke={COLOR_DETALLE} strokeWidth="0.6" />
                <text x={(fxFront + trgFront) / 2} y={level2Y - 2.5} fontSize="7.5" fill={COLOR_DETALLE} textAnchor="middle" fontWeight="bold">32</text>
              </g>
            );
          }
        });
      } else {
        // Ensamble Spax / Soberbio 5x50: Pasante a 50mm del borde frontal y posterior
        const fxFront = 50 * scale;
        const fxBack = drawW - (50 * scale);

        [topY, bottomY].forEach((yPos, i) => {
          const isTop = i === 0;
          const cotaY = isTop ? -14 : drawH + 14;
          const extY = isTop ? -18 : drawH + 18;
          const prefix = isTop ? 'top' : 'bot';

          elements.push(
            <circle key={`spax-1-${prefix}`} cx={fxFront} cy={yPos} r={2.4} fill={COLOR_SPAX} stroke="#1e3a8a" strokeWidth="0.5" />,
            <circle key={`spax-2-${prefix}`} cx={fxBack} cy={yPos} r={2.4} fill={COLOR_SPAX} stroke="#1e3a8a" strokeWidth="0.5" />
          );

          if (isTop) {
            elements.push(
              <g key="cota-spax-sup-front">
                <line x1={0} y1={cotaY} x2={fxFront} y2={cotaY} stroke={COLOR_DETALLE} strokeWidth="0.6" />
                <line x1={0} y1={extY} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth="0.6" />
                <line x1={fxFront} y1={extY} x2={fxFront} y2={yPos} stroke={COLOR_DETALLE} strokeWidth="0.6" />
                <text x={fxFront / 2} y={cotaY - 3} fontSize="8.5" fill={COLOR_DETALLE} textAnchor="middle" fontWeight="bold">50</text>
              </g>
            );
          }
        });
      }

      // Perforaciones de Base de Bisagras en Lateral (Eje a 37mm del borde frontal)
      if (hasDoors) {
        const hingeEjeX = 37 * scale;
        const hTopY = 90 * scale;
        const hBotY = drawH - (90 * scale);

        elements.push(
          <g key="hinge-bases">
            {/* Eje 37mm */}
            <line x1={hingeEjeX} y1={0} x2={hingeEjeX} y2={drawH} stroke="#f97316" strokeWidth="0.7" strokeDasharray="4,2" />
            
            {/* Base Sup (2 orificios distanciados a 32mm) */}
            <circle cx={hingeEjeX} cy={hTopY - (16 * scale)} r={2.0} fill="#ea580c" />
            <circle cx={hingeEjeX} cy={hTopY + (16 * scale)} r={2.0} fill="#ea580c" />
            
            {/* Base Inf */}
            <circle cx={hingeEjeX} cy={hBotY - (16 * scale)} r={2.0} fill="#ea580c" />
            <circle cx={hingeEjeX} cy={hBotY + (16 * scale)} r={2.0} fill="#ea580c" />

            {/* Cota Eje 37mm a borde frontal */}
            <line x1={0} y1={hTopY} x2={hingeEjeX} y2={hTopY} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <text x={hingeEjeX / 2} y={hTopY - 3} fontSize="8" fill={COLOR_DETALLE} textAnchor="middle" fontWeight="bold">37</text>
            
            {/* Cota Eje 90mm al borde superior con separación */}
            <line x1={-12} y1={0} x2={-12} y2={hTopY} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <line x1={-16} y1={0} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <line x1={-16} y1={hTopY} x2={hingeEjeX} y2={hTopY} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <text x={-19} y={hTopY / 2} fontSize="8.5" fill={COLOR_DETALLE} transform={`rotate(-90 -19 ${hTopY / 2})`} textAnchor="middle" fontWeight="bold">90</text>
          </g>
        );
      }

      // Perforaciones de Correderas de Cajón en Lateral (Eje a 37mm frontal, distancias del sistema 32)
      if (hasDrawers) {
        const slideEjeX = 37 * scale;
        const numDrawers = cab.variant === '4_drawers' ? 4 : cab.variant === '2_pot_drawers' ? 2 : 1;
        const drawerSpacing = (drawH - (thicknessMm * 2 * scale)) / numDrawers;

        elements.push(
          <g key="slides-holes">
            <line x1={slideEjeX} y1={0} x2={slideEjeX} y2={drawH} stroke="#16a34a" strokeWidth="0.7" strokeDasharray="4,2" />
            {Array.from({ length: numDrawers }).map((_, dIdx) => {
              const slideY = drawH - (thicknessMm * scale) - ((dIdx + 0.3) * drawerSpacing);
              const hole2X = slideEjeX + (128 * scale);
              const hole3X = slideEjeX + ((128 + 96) * scale);

              return (
                <g key={`slide-row-${dIdx}`}>
                  <circle cx={slideEjeX} cy={slideY} r={2.0} fill={COLOR_MINIFIX} />
                  <circle cx={hole2X} cy={slideY} r={2.0} fill={COLOR_MINIFIX} />
                  {hole3X < drawW - (20 * scale) && <circle cx={hole3X} cy={slideY} r={2.0} fill={COLOR_MINIFIX} />}
                  
                  {/* Cota de altura desde el fondo/piso al eje de la corredera */}
                  <line x1={drawW + 8} y1={drawH} x2={drawW + 8} y2={slideY} stroke={COLOR_DETALLE} strokeWidth="0.6" />
                  <line x1={drawW} y1={slideY} x2={drawW + 12} y2={slideY} stroke={COLOR_DETALLE} strokeWidth="0.6" />
                  <text x={drawW + 16} y={slideY + 3} fontSize="8" fill={COLOR_DETALLE} fontWeight="bold">
                    {Math.round(((drawH - slideY) / scale))}
                  </text>
                </g>
              );
            })}
          </g>
        );
      }
    }

    // 2. BARRAS / AMARRES (Mecanizado en extremos de listón horizontal)
    if (isBarraAmarre) {
      const topY = 9.5 * scale;
      const bottomY = drawH - (9.5 * scale);
      const fx1 = 34 * scale;
      const trg1 = (34 + 32) * scale;

      if (isMinifix) {
        // En cada extremo (superior e inferior), 1 Minifix (34mm) + 1 Tarugo (66mm) a 9.5mm de la testa
        [topY, bottomY].forEach((yPos, i) => {
          const isTop = i === 0;
          const prefix = isTop ? 'top' : 'bot';

          elements.push(
            <g key={`mf-barra-${prefix}`}>
              {/* Minifix Ø15 */}
              <circle cx={fx1} cy={yPos} r={4.5 * scale} fill="none" stroke={COLOR_MINIFIX} strokeWidth="0.8" strokeDasharray="2,2" />
              <circle cx={fx1} cy={yPos} r={2.0} fill={COLOR_MINIFIX} />
              
              {/* Tarugo Ø8 */}
              <circle cx={trg1} cy={yPos} r={2.2} fill={COLOR_TARUGO} stroke="#991b1b" strokeWidth="0.5" />
            </g>
          );
        });

        // Cotas para Barra en NIVELES ESCALONADOS (Extremo Superior)
        elements.push(
          <g key="cota-barra-top">
            {/* Cota Eje Y 9.5mm a la testa (Lateral Izquierdo Nivel 1) */}
            <line x1={-10} y1={0} x2={-10} y2={topY} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <line x1={-14} y1={0} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <line x1={-14} y1={topY} x2={fx1} y2={topY} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <text x={-16} y={topY / 2 + 3} fontSize="7.5" fill={COLOR_DETALLE} transform={`rotate(-90 -16 ${topY / 2 + 3})`} textAnchor="middle" fontWeight="bold">9.5</text>

            {/* NIVEL 1: Cota X 34mm al borde frontal */}
            <line x1={0} y1={-12} x2={fx1} y2={-12} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <line x1={0} y1={-15} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <line x1={fx1} y1={-15} x2={fx1} y2={topY} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <text x={fx1 / 2} y={-14.5} fontSize="7.5" fill={COLOR_DETALLE} textAnchor="middle" fontWeight="bold">34</text>

            {/* NIVEL 2: Cota X 32mm entre Minifix y Tarugo */}
            <line x1={fx1} y1={-24} x2={trg1} y2={-24} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <line x1={fx1} y1={-27} x2={fx1} y2={-12} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <line x1={trg1} y1={-27} x2={trg1} y2={topY} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <text x={(fx1 + trg1) / 2} y={-26.5} fontSize="7.5" fill={COLOR_DETALLE} textAnchor="middle" fontWeight="bold">32</text>
          </g>
        );
      } else {
        // Spax en barras
        const spax1 = 30 * scale;
        const spax2 = 70 * scale;

        [2 * scale, drawH - (2 * scale)].forEach((yPos, i) => {
          elements.push(
            <circle key={`spax-b-1-${i}`} cx={spax1} cy={yPos} r={2.0} fill={COLOR_SPAX} />,
            <circle key={`spax-b-2-${i}`} cx={spax2} cy={yPos} r={2.0} fill={COLOR_SPAX} />
          );
        });

        elements.push(
          <g key="cota-spax-barra">
            <line x1={0} y1={-10} x2={spax1} y2={-10} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <line x1={0} y1={-14} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <line x1={spax1} y1={-14} x2={spax1} y2={0} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <text x={spax1 / 2} y={-13} fontSize="7.5" fill={COLOR_DETALLE} textAnchor="middle" fontWeight="bold">30</text>
          </g>
        );
      }
    }

    // 3. PISO / TECHO / REPISAS (Mecanizado en extremos de tableros anchos)
    if (isPiso || isTecho || isRepisa) {
      const canalX = drawW - (15 * scale); // Canal durolac paralelo al borde posterior

      if (isPiso || isTecho) {
        elements.push(
          <g key="canal-horiz">
            <line x1={canalX} y1={0} x2={canalX} y2={drawH} stroke={COLOR_CANAL} strokeWidth="0.8" strokeDasharray="3,2" />
            <line x1={canalX - (4 * scale)} y1={0} x2={canalX - (4 * scale)} y2={drawH} stroke={COLOR_CANAL} strokeWidth="0.5" strokeDasharray="3,2" />
            {/* Cota de 15 mm */}
            <line x1={canalX} y1={drawH + 8} x2={drawW} y2={drawH + 8} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <line x1={canalX} y1={drawH} x2={canalX} y2={drawH + 11} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <line x1={drawW} y1={drawH} x2={drawW} y2={drawH + 11} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <text x={canalX + (15 * scale)/2} y={drawH + 17} fontSize="8" fill={COLOR_DETALLE} textAnchor="middle" fontWeight="bold">15</text>
          </g>
        );
      }

      if (isMinifix) {
        const topY = 9.5 * scale;
        const bottomY = drawH - (9.5 * scale);
        const fxFront = 34 * scale;
        const trgFront = (34 + 32) * scale;
        const fxBack = drawW - (50 * scale);
        const trgBack = drawW - (50 + 32) * scale;

        // Cajas excéntricas Minifix Ø15mm + Tarugos Ø8mm en ambos extremos (superior e inferior)
        [topY, bottomY].forEach((yPos, sideIdx) => {
          const isTop = sideIdx === 0;
          const prefix = isTop ? 'top' : 'bot';

          elements.push(
            <g key={`mf-panel-${prefix}`}>
              {/* Grupo Frontal */}
              <circle cx={fxFront} cy={yPos} r={4.5 * scale} fill="none" stroke={COLOR_MINIFIX} strokeWidth="0.8" strokeDasharray="2,2" />
              <circle cx={fxFront} cy={yPos} r={2.0} fill={COLOR_MINIFIX} />
              <circle cx={trgFront} cy={yPos} r={2.2} fill={COLOR_TARUGO} stroke="#991b1b" strokeWidth="0.5" />

              {/* Grupo Posterior */}
              <circle cx={fxBack} cy={yPos} r={4.5 * scale} fill="none" stroke={COLOR_MINIFIX} strokeWidth="0.8" strokeDasharray="2,2" />
              <circle cx={fxBack} cy={yPos} r={2.0} fill={COLOR_MINIFIX} />
              <circle cx={trgBack} cy={yPos} r={2.2} fill={COLOR_TARUGO} stroke="#991b1b" strokeWidth="0.5" />
            </g>
          );
        });

        // Cotas Técnicas Superiores en NIVELES ESCALONADOS
        elements.push(
          <g key="cota-panel-top">
            {/* Cota Eje Y 9.5mm (Izquierda Nivel 1) */}
            <line x1={-10} y1={0} x2={-10} y2={topY} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <line x1={-14} y1={0} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <line x1={-14} y1={topY} x2={fxFront} y2={topY} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <text x={-16} y={topY / 2 + 3} fontSize="7.5" fill={COLOR_DETALLE} transform={`rotate(-90 -16 ${topY / 2 + 3})`} textAnchor="middle" fontWeight="bold">9.5</text>

            {/* GRUPO FRONTAL: */}
            {/* NIVEL 1: Cota Frontal 34mm */}
            <line x1={0} y1={-12} x2={fxFront} y2={-12} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <line x1={0} y1={-15} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <line x1={fxFront} y1={-15} x2={fxFront} y2={topY} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <text x={fxFront / 2} y={-14.5} fontSize="7.5" fill={COLOR_DETALLE} textAnchor="middle" fontWeight="bold">34</text>

            {/* NIVEL 2: Cota 32mm entre Minifix y Tarugo Frontal */}
            <line x1={fxFront} y1={-24} x2={trgFront} y2={-24} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <line x1={fxFront} y1={-27} x2={fxFront} y2={-12} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <line x1={trgFront} y1={-27} x2={trgFront} y2={topY} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <text x={(fxFront + trgFront) / 2} y={-26.5} fontSize="7.5" fill={COLOR_DETALLE} textAnchor="middle" fontWeight="bold">32</text>

            {/* GRUPO POSTERIOR: */}
            {/* NIVEL 1: Cota Posterior 50mm */}
            <line x1={fxBack} y1={-12} x2={drawW} y2={-12} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <line x1={drawW} y1={-15} x2={drawW} y2={0} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <line x1={fxBack} y1={-15} x2={fxBack} y2={topY} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <text x={(fxBack + drawW) / 2} y={-14.5} fontSize="7.5" fill={COLOR_DETALLE} textAnchor="middle" fontWeight="bold">50</text>

            {/* NIVEL 2: Cota 32mm entre Minifix y Tarugo Posterior */}
            <line x1={trgBack} y1={-24} x2={fxBack} y2={-24} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <line x1={trgBack} y1={-27} x2={trgBack} y2={topY} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <line x1={fxBack} y1={-27} x2={fxBack} y2={-12} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <text x={(trgBack + fxBack) / 2} y={-26.5} fontSize="7.5" fill={COLOR_DETALLE} textAnchor="middle" fontWeight="bold">32</text>
          </g>
        );
      } else {
        // Ensamble Spax: Perforación guía en canto a 50mm de extremos
        const fx1 = 50 * scale;
        const fx2 = drawW - (50 * scale);
        
        [2 * scale, drawH - (2 * scale)].forEach((yPos, sideIdx) => {
          elements.push(
            <circle key={`spax-guide-1-${sideIdx}`} cx={fx1} cy={yPos} r={2.0} fill={COLOR_SPAX} />,
            <circle key={`spax-guide-2-${sideIdx}`} cx={fx2} cy={yPos} r={2.0} fill={COLOR_SPAX} />
          );
        });

        elements.push(
          <g key="cota-spax-horiz">
            <line x1={0} y1={-10} x2={fx1} y2={-10} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <line x1={0} y1={-14} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <line x1={fx1} y1={-14} x2={fx1} y2={0} stroke={COLOR_DETALLE} strokeWidth="0.6" />
            <text x={fx1 / 2} y={-13} fontSize="7.5" fill={COLOR_DETALLE} textAnchor="middle" fontWeight="bold">50</text>
          </g>
        );
      }
    }

    // 3. PUERTAS (Cazoletas de bisagra Ø35 mm a 22.5 mm del borde lateral y 90 mm de bordes sup/inf)
    if (isPuerta) {
      const hingeCupX = 22.5 * scale;
      const hTopY = 90 * scale;
      const hBotY = drawH - (90 * scale);
      const isTall = drawH > 1000 * scale;
      const hMidY = drawH / 2;

      const hingePositions = [hTopY, hBotY];
      if (isTall) hingePositions.push(hMidY);

      elements.push(
        <g key="door-hinges">
          {/* Eje longitudinal 22.5mm */}
          <line x1={hingeCupX} y1={0} x2={hingeCupX} y2={drawH} stroke="#ea580c" strokeWidth="0.7" strokeDasharray="4,2" />

          {hingePositions.map((hy, idx) => (
            <g key={`cup-${idx}`}>
              {/* Cazoleta Ø35 mm */}
              <circle cx={hingeCupX} cy={hy} r={17.5 * scale} fill="none" stroke="#ea580c" strokeWidth="0.9" strokeDasharray="2,2" />
              <circle cx={hingeCupX} cy={hy} r={2.2} fill="#ea580c" />
              <line x1={hingeCupX - (5 * scale)} y1={hy} x2={hingeCupX + (5 * scale)} y2={hy} stroke="#ea580c" strokeWidth="0.6" />
              <line x1={hingeCupX} y1={hy - (5 * scale)} x2={hingeCupX} y2={hy + (5 * scale)} stroke="#ea580c" strokeWidth="0.6" />
              <text x={hingeCupX + (19 * scale)} y={hy + 3} fontSize="8" fill="#ea580c" fontWeight="bold">Ø35</text>
            </g>
          ))}

          {/* Cota Eje 22.5 mm al borde lateral más cercano con separación */}
          <line x1={0} y1={hTopY - (28 * scale)} x2={hingeCupX} y2={hTopY - (28 * scale)} stroke={COLOR_DETALLE} strokeWidth="0.6" />
          <line x1={0} y1={hTopY - (32 * scale)} x2={0} y2={hTopY} stroke={COLOR_DETALLE} strokeWidth="0.6" />
          <line x1={hingeCupX} y1={hTopY - (32 * scale)} x2={hingeCupX} y2={hTopY} stroke={COLOR_DETALLE} strokeWidth="0.6" />
          <text x={hingeCupX / 2} y={hTopY - (30 * scale)} fontSize="8" fill={COLOR_DETALLE} textAnchor="middle" fontWeight="bold">22.5</text>

          {/* Cota Eje 90 mm al borde superior más cercano */}
          <line x1={-12} y1={0} x2={-12} y2={hTopY} stroke={COLOR_DETALLE} strokeWidth="0.6" />
          <line x1={-16} y1={0} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth="0.6" />
          <line x1={-16} y1={hTopY} x2={hingeCupX} y2={hTopY} stroke={COLOR_DETALLE} strokeWidth="0.6" />
          <text x={-19} y={hTopY / 2} fontSize="8.5" fill={COLOR_DETALLE} transform={`rotate(-90 -19 ${hTopY / 2})`} textAnchor="middle" fontWeight="bold">90</text>

          {/* Cota Eje 90 mm al borde inferior */}
          <line x1={-12} y1={hBotY} x2={-12} y2={drawH} stroke={COLOR_DETALLE} strokeWidth="0.6" />
          <line x1={-16} y1={drawH} x2={0} y2={drawH} stroke={COLOR_DETALLE} strokeWidth="0.6" />
          <line x1={-16} y1={hBotY} x2={hingeCupX} y2={hBotY} stroke={COLOR_DETALLE} strokeWidth="0.6" />
          <text x={-19} y={(hBotY + drawH) / 2} fontSize="8.5" fill={COLOR_DETALLE} transform={`rotate(-90 -19 ${(hBotY + drawH) / 2})`} textAnchor="middle" fontWeight="bold">90</text>
        </g>
      );
    }

    // 4. CAJONES (Laterales y Frentes de Cajón)
    if (isLateralCajon || isFrenteCajon) {
      const edgeOffset = 15 * scale;
      elements.push(
        <g key="cajon-fix">
          <line x1={edgeOffset} y1={0} x2={edgeOffset} y2={drawH} stroke={COLOR_SPAX} strokeWidth="0.6" strokeDasharray="2,2" />
          <line x1={drawW - edgeOffset} y1={0} x2={drawW - edgeOffset} y2={drawH} stroke={COLOR_SPAX} strokeWidth="0.6" strokeDasharray="2,2" />
          <circle cx={edgeOffset} cy={drawH / 2} r={2.0} fill={isMinifix ? COLOR_MINIFIX : COLOR_SPAX} />
          <circle cx={drawW - edgeOffset} cy={drawH / 2} r={2.0} fill={isMinifix ? COLOR_MINIFIX : COLOR_SPAX} />
          <text x={edgeOffset / 2} y={drawH / 2 + 3} fontSize="7.5" fill={COLOR_DETALLE} textAnchor="middle" fontWeight="bold">15</text>
          <text x={drawW - (edgeOffset / 2)} y={drawH / 2 + 3} fontSize="7.5" fill={COLOR_DETALLE} textAnchor="middle" fontWeight="bold">15</text>
        </g>
      );
    }

    return (
      <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-20">
        {elements}
      </svg>
    );
  };

  /**
   * Title Block Inferior con Nomenclatura Técnica exactamente según el plano de referencia
   */
  const BlueprintTitleBlock = ({ 
    pageNum, 
    title, 
    cab, 
    identTag,
    customContent
  }: { 
    pageNum: number; 
    title: string; 
    cab?: CabinetType; 
    identTag?: string;
    customContent?: string;
  }) => (
    <div className="absolute bottom-4 left-4 right-4 h-24 border-2 border-black flex text-[9px] bg-white z-30">
      {/* Columna 1: Datos de Proyecto */}
      <div className="w-[28%] border-r-2 border-black p-2 flex flex-col justify-between">
        <div>
          <div className="font-bold text-sm text-slate-900 tracking-tight truncate">{title}</div>
          <div className="text-slate-600 mt-0.5"><span className="font-bold text-black">CLIENTE:</span> PROYECTO COCINA ARQUIFY</div>
          <div className="text-slate-600 truncate"><span className="font-bold text-black">CONTENIDO:</span> {customContent || (cab ? `${getCabinetTypeName(cab)} (${cab.width}x${cab.height}x${cab.depth} cm)` : 'OPTIMIZACIÓN & LISTADO')}</div>
        </div>
        <div className="flex justify-between border-t border-slate-300 pt-1 text-[8px] text-slate-500">
          <span>DIBUJANTE: ARQUIFY BIM CAD</span>
          <span>FECHA: {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Columna 2: Observaciones & Tapacantos */}
      <div className="w-[30%] border-r-2 border-black p-2 flex flex-col justify-between">
        <div>
          <div className="font-bold text-black uppercase tracking-wider mb-1">OBSERVACIONES & TAPACANTOS</div>
          <div className="flex items-center gap-1.5 mb-1 text-slate-700">
            <div className="w-2.5 h-2.5 rotate-45 bg-orange-500 border border-black shadow-xs"></div>
            <span><strong className="text-black">TC PVC 22x0.45 MM:</strong> Estructura y frentes interiores</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <div className="w-2.5 h-2.5 rotate-45 bg-rose-600 border border-black shadow-xs"></div>
            <span><strong className="text-black">TC PVC 22x2.0 MM:</strong> Puertas y frentes vistos</span>
          </div>
        </div>
        <div className="text-[8px] text-slate-500">
          <span>Correderas: <strong>{state.drawerHardware}</strong> • Ranura durolac 4x7.5mm a 15mm</span>
        </div>
      </div>

      {/* Columna 3: NOMENCLATURA DE COTAS */}
      <div className="w-[24%] border-r-2 border-black p-2 flex flex-col justify-between bg-slate-50/50">
        <div className="font-bold text-black uppercase tracking-widest text-[8.5px] border-b border-black/20 pb-0.5 mb-1">
          NOMENCLATURA DE COTAS
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[8px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-xs bg-[#d946ef]"></span>
            <span className="font-bold text-[#d946ef]">GENERAL</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#16a34a]"></span>
            <span className="font-bold text-[#16a34a]">MINIFIX</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#dc2626]"></span>
            <span className="font-bold text-[#dc2626]">TARUGO</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#2563eb]"></span>
            <span className="font-bold text-[#2563eb]">TORNILLO</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <span className="w-2 h-2 rounded-xs bg-[#2563eb]"></span>
            <span className="font-bold text-[#2563eb]">DETALLES / EJES</span>
          </div>
        </div>
      </div>

      {/* Columna 4: Tag de Identificación & Escala */}
      <div className="w-[18%] p-2 flex flex-col justify-between items-end bg-white">
        <div className="w-full flex justify-between items-start">
          <div className="text-left">
            <div className="text-[7.5px] text-slate-400 font-bold uppercase">IDENT. ETIQ.</div>
            <div className="font-mono font-black text-xl text-rose-600 border border-rose-500/30 px-2 py-0.5 rounded bg-rose-50/50">
              {identTag || `P-${pageNum}`}
            </div>
          </div>
          <div className="text-right text-[8px]">
            <div><strong>LÁMINA:</strong> {String(pageNum).padStart(2, '0')} / {String(totalDocPages).padStart(2, '0')}</div>
            <div><strong>ESCALA:</strong> S.E (A3)</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-bellota font-bold text-xl lowercase text-orange-600 tracking-tight select-none">arquify</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-800 text-black overflow-auto print-only-container">
      {/* Barra Superior Flotante de Acciones y Descarga de PDF */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] print:hidden flex flex-wrap items-center justify-center gap-3 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-md max-w-[95vw]">
        <div className="flex items-center gap-2 text-xs font-bold text-orange-400 mr-2 border-r border-white/20 pr-3">
          <FileText size={16} />
          <span>PLANOS DE FABRICACIÓN</span>
        </div>

        {/* Botón Principal: Descargar Planos Completos A3 en PDF */}
        <button 
          onClick={handleExportA3}
          disabled={isExportingA3}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 active:scale-95 text-white px-4 py-2 rounded-xl font-bold uppercase text-xs tracking-wider shadow-lg flex items-center gap-2 transition-all cursor-pointer"
          title="Generar y descargar todos los planos y despieces en formato A3 de alta resolución"
        >
          {isExportingA3 ? (
            <>
              <Loader2 size={15} className="animate-spin text-white" />
              <span>Generando PDF ({exportProgress ? `${exportProgress.current}/${exportProgress.total}` : 'Iniciando...'})</span>
            </>
          ) : (
            <>
              <Download size={15} />
              <span>Descargar Planos Completos PDF (A3)</span>
            </>
          )}
        </button>

        {/* Botón Secundario: Ficha Técnica PDF Directo */}
        <button 
          onClick={() => exportKitchenPDF(kState.cabinets, state)}
          className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-4 py-2 rounded-xl font-bold uppercase text-xs tracking-wider shadow-lg flex items-center gap-2 transition-all cursor-pointer"
          title="Descargar archivo PDF con despiece de corte, resumen de cubicación y herrajes"
        >
          <FileText size={15} />
          <span>Ficha Técnica PDF (Despiece / BOM)</span>
        </button>

        {/* Botón Terciario: Cuadro de Impresión Nativo */}
        <button 
          onClick={() => window.print()}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3.5 py-2 rounded-xl font-semibold text-xs tracking-wider border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
          title="Abrir cuadro de diálogo de impresión del navegador"
        >
          <Printer size={14} />
          <span>Imprimir</span>
        </button>

        {/* Botón Cerrar */}
        <button 
          onClick={() => state.setIsPrinting(false)}
          className="bg-slate-700 hover:bg-red-600 text-white px-3.5 py-2 rounded-xl font-semibold text-xs tracking-wider shadow-md hover:shadow-red-500/20 transition-all flex items-center gap-1.5 cursor-pointer ml-1"
        >
          <X size={15} />
          <span>Cerrar</span>
        </button>
      </div>

      <style>{`
        @media screen { 
           .print-only-container { display: flex; flex-direction: column; background: #525252; padding: 2rem; align-items: center; gap: 2rem; } 
           .blueprint-page { 
             background: white; 
             width: 420mm; 
             min-width: 420mm; 
             max-width: 420mm; 
             height: 297mm; 
             min-height: 297mm; 
             max-height: 297mm; 
             flex-shrink: 0; 
             position: relative; 
             box-shadow: 0 4px 15px rgba(0,0,0,0.5); 
             box-sizing: border-box;
           }
        }
        @media print {
          body * { visibility: hidden; }
          .print-only-container, .print-only-container * { visibility: visible; }
          .print-only-container { position: absolute; left: 0; top: 0; width: 100%; height: auto; display: block; background: white !important; }
          .blueprint-page { 
            width: 420mm; 
            height: 297mm; 
            min-height: 297mm;
            max-height: 297mm;
            position: relative; 
            page-break-after: always; 
            page-break-inside: avoid;
            overflow: hidden; 
            box-sizing: border-box;
          }
          @page { size: A3 landscape; margin: 0; }
        }
      `}</style>

      {/* 1. LÁMINA 1: PLANO GENERAL DEL PROYECTO, ELEVACIONES, DETALLES Y EETT (100% DINÁMICO) */}
      {(() => {
        const vertices = kState.roomConfig?.vertices || [];
        const wallSegments = vertices.length >= 3 ? analyzeRoomWalls(vertices) : [];

        // Calcular Bounding Box del plano de la habitación y gabinetes en cm
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        if (vertices.length > 0) {
          vertices.forEach(v => {
            minX = Math.min(minX, v.x);
            maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y);
            maxY = Math.max(maxY, v.y);
          });
        } else {
          minX = -250; maxX = 250; minY = -200; maxY = 200;
        }

        realCabinets.forEach(c => {
          minX = Math.min(minX, c.position[0] - c.width / 2);
          maxX = Math.max(maxX, c.position[0] + c.width / 2);
          minY = Math.min(minY, c.position[2] - c.depth / 2);
          maxY = Math.max(maxY, c.position[2] + c.depth / 2);
        });

        // Margen de 60 cm para encuadre seguro y holgura para cotas exteriores
        minX -= 60; maxX += 60; minY -= 60; maxY += 60;
        const spanX = Math.max(160, maxX - minX);
        const spanY = Math.max(140, maxY - minY);

        // Mapeo a SVG de Planta (520 x 280)
        const svgW = 520;
        const svgH = 280;
        const scale2D = Math.min(svgW / spanX, svgH / spanY);
        const offsetX = (svgW - spanX * scale2D) / 2;
        const offsetY = (svgH - spanY * scale2D) / 2;

        const toSvgX = (xCm: number) => offsetX + (xCm - minX) * scale2D;
        const toSvgY = (yCm: number) => offsetY + (yCm - minY) * scale2D;

        // Calcular gabinetes proyectados en cada muro para las elevaciones
        const activeWallsData = wallSegments.map(wall => {
          const S = wall.start;
          const E = wall.end;
          const L = wall.length;
          if (L < 1) return { wall, cabinetsOnWall: [] };

          const ux = (E.x - S.x) / L;
          const uy = (E.y - S.y) / L;
          const nx = -uy;
          const ny = ux;

          const cabsOnWall = realCabinets.map(cab => {
            const cx = cab.position[0];
            const cz = cab.position[2];

            // Distancia a lo largo del muro (desde start)
            const t = (cx - S.x) * ux + (cz - S.y) * uy;
            // Distancia perpendicular al eje del muro
            const d = Math.abs((cx - S.x) * nx + (cz - S.y) * ny);

            // Umbral de proximidad al muro
            if (d <= cab.depth + 60 && t >= -cab.width / 2 - 10 && t <= L + cab.width / 2 + 10) {
              return {
                cab,
                t,
                offsetMm: Math.round((t - cab.width / 2) * 10),
                widthMm: Math.round(cab.width * 10),
                heightMm: Math.round(cab.height * 10),
                yBottomMm: Math.round((cab.position[1] - cab.height / 2) * 10),
              };
            }
            return null;
          }).filter(Boolean) as {
            cab: CabinetType;
            t: number;
            offsetMm: number;
            widthMm: number;
            heightMm: number;
            yBottomMm: number;
          }[];

          // Ordenar gabinetes por su posición a lo largo del muro
          cabsOnWall.sort((a, b) => a.t - b.t);

          return { wall, cabinetsOnWall: cabsOnWall };
        });

        // Filtrar ÚNICAMENTE los muros que tienen muebles colocados (cero vistas en blanco)
        let wallsWithCabs = activeWallsData.filter(w => w.cabinetsOnWall.length > 0);

        // Si ningún muro tiene muebles detectados por proximidad, asociar los muebles al muro principal
        if (wallsWithCabs.length === 0 && wallSegments.length > 0) {
          const mainWall = wallSegments[0];
          let runningOffsetMm = 100;
          const cabsOnMain = realCabinets.map(cab => {
            const item = {
              cab,
              t: runningOffsetMm / 10 + cab.width / 2,
              offsetMm: runningOffsetMm,
              widthMm: Math.round(cab.width * 10),
              heightMm: Math.round(cab.height * 10),
              yBottomMm: Math.round((cab.position[1] - cab.height / 2) * 10),
            };
            runningOffsetMm += Math.round(cab.width * 10);
            return item;
          });
          wallsWithCabs = [{ wall: mainWall, cabinetsOnWall: cabsOnMain }];
        }

        // Mostrar solo los muros con muebles reales (máximo 3 para la lámina)
        const displayWalls = wallsWithCabs.slice(0, 3);
        const colSpanClass = displayWalls.length === 1 ? 'col-span-12' : displayWalls.length === 2 ? 'col-span-6' : 'col-span-4';

        return (
          <div className="blueprint-page border border-black/30 flex flex-col justify-between p-6 pb-28 bg-white relative overflow-hidden font-sans select-none">
            
            {/* ENCABEZADO SUPERIOR */}
            <div className="flex justify-between items-start h-[34px] border-b-2 border-slate-900 pb-1 mb-1">
              <div>
                <div className="text-[14px] font-black text-slate-900 tracking-tight uppercase leading-none font-sans flex items-center gap-2">
                  <span>PROYECTO COCINA MODULAR ARQUIFY</span>
                </div>
                <div className="text-[10px] font-bold text-slate-600 tracking-tight uppercase mt-0.5 leading-none">
                  PLANTA GENERAL Y ELEVACIONES ({realCabinets.length} {realCabinets.length === 1 ? 'MÓDULO' : 'MÓDULOS'})
                </div>
              </div>
              <div className="text-right text-[9px] text-slate-500 font-mono font-medium">
                ARQUIFY CAD / SISTEMA INTERIORISMO CORPORATIVO
              </div>
            </div>

            {/* SECTOR SUPERIOR: VISTA PLANTA (9 Cols), DETALLE 1 (3 Cols) - ALTO CONTROLADO 290px */}
            <div className="grid grid-cols-12 gap-3 h-[290px] items-start border-b border-slate-300 pb-2">
              
              {/* COLUMNA 1 (Principal - 9 Cols): VISTA DE PLANTA REAL DINÁMICA */}
              <div className="col-span-9 flex flex-col items-center justify-center h-full relative border-r border-slate-200 pr-2">
                <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full max-h-[280px]">
                  {/* Polígono de Suelo de la Habitación */}
                  {vertices.length >= 3 && (
                    <polygon
                      points={vertices.map(v => `${toSvgX(v.x)},${toSvgY(v.y)}`).join(' ')}
                      fill="#ffffff"
                      stroke="#1e293b"
                      strokeWidth="4.5"
                      strokeLinejoin="miter"
                    />
                  )}

                  {/* Cotas y Muros Perimetrales */}
                  {wallSegments.map((wall, wIdx) => {
                    const x1 = toSvgX(wall.start.x);
                    const y1 = toSvgY(wall.start.y);
                    const x2 = toSvgX(wall.end.x);
                    const y2 = toSvgY(wall.end.y);
                    const mx = (x1 + x2) / 2;
                    const my = (y1 + y2) / 2;

                    // Vector normal exterior para la cota
                    const dx = x2 - x1;
                    const dy = y2 - y1;
                    const len = Math.hypot(dx, dy);
                    const normX = len > 0 ? -dy / len : 0;
                    const normY = len > 0 ? dx / len : 0;

                    const cotaDist = 16;
                    const cx1 = x1 + normX * cotaDist;
                    const cy1 = y1 + normY * cotaDist;
                    const cx2 = x2 + normX * cotaDist;
                    const cy2 = y2 + normY * cotaDist;
                    const cmx = mx + normX * (cotaDist + 4);
                    const cmy = my + normY * (cotaDist + 4);

                    return (
                      <g key={wIdx}>
                        {/* Línea de Cota Exterior Total */}
                        <line x1={cx1} y1={cy1} x2={cx2} y2={cy2} stroke="#334155" strokeWidth="0.8" />
                        <line x1={cx1 - normX * 3.5} y1={cy1 - normY * 3.5} x2={cx1 + normX * 3.5} y2={cy1 + normY * 3.5} stroke="#334155" strokeWidth="0.8" />
                        <line x1={cx2 - normX * 3.5} y1={cy2 - normY * 3.5} x2={cx2 + normX * 3.5} y2={cy2 + normY * 3.5} stroke="#334155" strokeWidth="0.8" />
                        <text
                          x={cmx}
                          y={cmy + 3}
                          fontSize="7.5"
                          fontWeight="bold"
                          fill="#0f172a"
                          textAnchor="middle"
                        >
                          {Math.round(wall.length * 10)}
                        </text>

                        {/* Símbolo de Muro / Vista (Ⓐ, Ⓑ, Ⓒ...) con flecha hacia el interior */}
                        <g transform={`translate(${mx - normX * 14}, ${my - normY * 14})`}>
                          <circle cx="0" cy="0" r="7" fill="#ffffff" stroke="#16a34a" strokeWidth="1.2" />
                          <text x="0" y="2.5" fontSize="7.5" fontWeight="bold" fill="#16a34a" textAnchor="middle">
                            {wall.label}
                          </text>
                        </g>
                      </g>
                    );
                  })}

                  {/* Renderizado de MUEBLES REALES en Planta con Sub-Cotas */}
                  {realCabinets.map((cab, cIdx) => {
                    const box = getCabinetBox2D(cab);
                    const svgCorners = box.corners.map(([cx, cz]) => [toSvgX(cx), toSvgY(cz)]);
                    const pointsStr = svgCorners.map(([sx, sy]) => `${sx},${sy}`).join(' ');

                    const isWall = cab.type === 'wall';
                    const isTall = cab.type === 'tall';
                    const isIsland = cab.type === 'island';
                    const centerSvgX = toSvgX(cab.position[0]);
                    const centerSvgY = toSvgY(cab.position[2]);

                    // Etiqueta técnica según tipología
                    let label = `M.B ${Math.round(cab.width * 10)}`;
                    if (isWall) label = `M.A ${Math.round(cab.width * 10)}`;
                    else if (isTall) label = `TORRE ${Math.round(cab.width * 10)}`;
                    else if (isIsland) label = `ISLA ${Math.round(cab.width * 10)}`;
                    else if (cab.variant === '4_drawers' || cab.variant === '2_pot_drawers') label = `CAJ ${Math.round(cab.width * 10)}`;

                    return (
                      <g key={cIdx}>
                        {/* Polígono del Módulo */}
                        <polygon
                          points={pointsStr}
                          fill={isWall ? '#ffffff' : isTall ? '#f8fafc' : '#ffffff'}
                          stroke={isWall ? '#64748b' : '#0f172a'}
                          strokeWidth={isWall ? '1' : '1.3'}
                          strokeDasharray={isWall ? '3,2' : undefined}
                        />

                        {/* Si es Torre / Despensa: Diagonales X */}
                        {isTall && svgCorners.length === 4 && (
                          <g stroke="#94a3b8" strokeWidth="0.6" strokeDasharray="2,2">
                            <line x1={svgCorners[0][0]} y1={svgCorners[0][1]} x2={svgCorners[2][0]} y2={svgCorners[2][1]} />
                            <line x1={svgCorners[1][0]} y1={svgCorners[1][1]} x2={svgCorners[3][0]} y2={svgCorners[3][1]} />
                          </g>
                        )}

                        {/* Etiqueta del Módulo */}
                        <text
                          x={centerSvgX}
                          y={centerSvgY + 2.5}
                          fontSize="6.5"
                          fontWeight="bold"
                          fill={isWall ? '#64748b' : '#16a34a'}
                          textAnchor="middle"
                        >
                          {label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Etiqueta Central */}
                  <text x={svgW / 2} y={svgH - 6} fontSize="7.5" fontWeight="bold" fill="#64748b" letterSpacing="2" textAnchor="middle">
                    VISTA PLANTA
                  </text>
                </svg>
              </div>

              {/* COLUMNA 3 (Der - 3 Cols): DETALLE 1 (Corte Constructivo Proporcionado) */}
              <div className="col-span-3 flex flex-col justify-between items-center h-full pl-1">
                <div className="w-full flex justify-between items-center border-b border-slate-200 pb-1">
                  <span className="text-[8.5px] font-bold text-slate-900 uppercase tracking-wider">DETALLE 1</span>
                  <span className="text-[7px] font-mono text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 font-bold">ESC 1:5</span>
                </div>

                <div className="relative w-full flex-1 flex items-center justify-center my-0.5">
                  <svg viewBox="0 0 170 155" className="w-full h-full max-h-[160px]">
                    {/* Muro Trasero */}
                    <rect x="15" y="10" width="14" height="135" fill="#e2e8f0" stroke="#475569" strokeWidth="1" />
                    {/* Hachurado decorativo muro */}
                    <line x1="15" y1="30" x2="29" y2="44" stroke="#94a3b8" strokeWidth="0.5" />
                    <line x1="15" y1="60" x2="29" y2="74" stroke="#94a3b8" strokeWidth="0.5" />
                    <line x1="15" y1="90" x2="29" y2="104" stroke="#94a3b8" strokeWidth="0.5" />
                    <line x1="15" y1="120" x2="29" y2="134" stroke="#94a3b8" strokeWidth="0.5" />
                    
                    {/* Respaldo de Piedra */}
                    <rect x="29" y="15" width="8" height="35" fill="#fecdd3" stroke="#e11d48" strokeWidth="0.8" />
                    
                    {/* Cubierta de Piedra Superior con Regrueso Frontal */}
                    <path d="M 29 50 L 142 50 L 142 70 L 126 70 L 126 58 L 29 58 Z" fill="#ffe4e6" stroke="#e11d48" strokeWidth="1.2" />
                    
                    {/* Costado Mueble Base */}
                    <rect x="35" y="58" width="75" height="87" fill="#f8fafc" stroke="#0f172a" strokeWidth="1" />

                    {/* Barra de Armado Melamina Superior */}
                    <rect x="75" y="58" width="35" height="10" fill="#fed7aa" stroke="#ea580c" strokeWidth="0.8" />
                    
                    {/* Perfil Gola Aluminio en L / J (Provelcar) */}
                    <path d="M 110 58 L 124 58 L 124 76 L 117 82 L 112 82 L 112 72 L 110 72 Z" fill="#dbeafe" stroke="#2563eb" strokeWidth="1" />
                    
                    {/* Puerta / Frente Cajón con rebaje */}
                    <rect x="122" y="84" width="10" height="61" fill="#f1f5f9" stroke="#0f172a" strokeWidth="1" />

                    {/* Línea de Cota 27mm */}
                    <line x1="140" y1="58" x2="140" y2="84" stroke="#e11d48" strokeWidth="0.7" />
                    <line x1="136" y1="58" x2="144" y2="58" stroke="#e11d48" strokeWidth="0.7" />
                    <line x1="136" y1="84" x2="144" y2="84" stroke="#e11d48" strokeWidth="0.7" />
                    <text x="148" y="73" fontSize="7" fill="#e11d48" fontWeight="bold">27</text>

                    {/* Llamadas de texto con flechas */}
                    <path d="M 115 40 L 95 40 L 95 48" fill="none" stroke="#e11d48" strokeWidth="0.6" />
                    <text x="120" y="42" fontSize="6" fill="#e11d48" fontWeight="bold">CUBIERTA</text>

                    <path d="M 45 80 L 70 80 L 80 65" fill="none" stroke="#ea580c" strokeWidth="0.6" />
                    <text x="45" y="88" fontSize="5.5" fill="#ea580c" fontWeight="bold">BARRA ARMADO</text>

                    <path d="M 45 105 L 85 105 L 114 78" fill="none" stroke="#2563eb" strokeWidth="0.6" />
                    <text x="45" y="113" fontSize="5" fill="#2563eb" fontWeight="bold">PERFIL GOLA ALUMINIO</text>
                    <text x="45" y="119" fontSize="4.5" fill="#64748b">(PROVELCAR)</text>
                  </svg>
                </div>

                <div className="w-full text-center bg-slate-50 border border-slate-200 py-0.5 rounded text-[7px] font-bold text-slate-700">
                  DETALLE 1
                </div>
              </div>
            </div>

            {/* SECTOR MEDIO E INFERIOR: VISTAS FRONTALES DE LOS MUROS ACTIVOS - ALTO ADAPTATIVO */}
            <div className="grid grid-cols-12 gap-3 flex-1 pt-1.5 pb-1 items-stretch overflow-hidden">
              {displayWalls.map((wData, wIdx) => {
                const wall = wData.wall;
                const cabs = wData.cabinetsOnWall;
                const wallLenMm = Math.max(1200, Math.round(wall.length * 10));
                const maxH = 2400; // mm

                const isSingle = displayWalls.length === 1;
                // Viewbox de elevación adaptativo para llenar la cuadrícula armónicamente
                const elevW = isSingle ? 750 : displayWalls.length === 2 ? 460 : 360;
                const elevH = 260;
                const elevPadX = isSingle ? 50 : 35;
                const elevPadY = 20;
                const groundY = elevH - 35;

                const elevScaleX = (elevW - elevPadX * 2) / wallLenMm;
                const elevScaleY = (groundY - elevPadY) / maxH;
                const elevScale = Math.min(elevScaleX, elevScaleY);

                const wallDrawW = wallLenMm * elevScale;
                const wallStartX = (elevW - wallDrawW) / 2;

                return (
                  <div key={wIdx} className={`${colSpanClass} border border-slate-200 p-2.5 rounded flex flex-col justify-between bg-white relative h-full`}>
                    <div className="flex justify-between items-center mb-1 border-b border-slate-200 pb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full border border-green-600 text-green-600 font-bold text-[8px] flex items-center justify-center">
                          {wall.label}
                        </span>
                        <span className="text-[8.5px] font-black text-slate-900 tracking-wider">
                          VISTA FRONTAL {wall.label}
                        </span>
                      </div>
                      <span className="text-[7.5px] font-mono text-slate-500">L = {wallLenMm} mm</span>
                    </div>

                    {/* Dibujo Elevación SVG Dinámica con Rango Completo */}
                    <div className="flex-1 flex items-center justify-center overflow-hidden py-1">
                      <svg viewBox={`0 0 ${elevW} ${elevH}`} className="w-full h-full max-h-[380px]">
                        {/* Línea de Suelo (+0.00) */}
                        <line x1="8" y1={groundY} x2={elevW - 8} y2={groundY} stroke="#0f172a" strokeWidth="1.2" />
                        <text x="10" y={groundY + 10} fontSize="7" fill="#64748b">0.00</text>

                        {/* Muro Trasero de Fondo */}
                        <rect
                          x={wallStartX}
                          y={groundY - 2200 * elevScale}
                          width={wallDrawW}
                          height={2200 * elevScale}
                          fill="#f8fafc"
                          stroke="#cbd5e1"
                          strokeWidth="0.8"
                        />

                        {/* Línea de Zócalo General (h=100mm) */}
                        <rect
                          x={wallStartX}
                          y={groundY - 100 * elevScale}
                          width={wallDrawW}
                          height={100 * elevScale}
                          fill="#e2e8f0"
                          stroke="#94a3b8"
                          strokeWidth="0.6"
                        />

                        {/* Renderizado de los Módulos Reales en la Elevación */}
                        {cabs.map((cItem, ci) => {
                          const cab = cItem.cab;
                          const cLeftX = wallStartX + Math.max(0, cItem.offsetMm * elevScale);
                          const cW = cItem.widthMm * elevScale;
                          const cH = cItem.heightMm * elevScale;
                          const cBottomY = groundY - (cItem.yBottomMm * elevScale);
                          const cTopY = cBottomY - cH;

                          const isTall = cab.type === 'tall';
                          const isWall = cab.type === 'wall';
                          const isBase = cab.type === 'base' || cab.type === 'island';

                          return (
                            <g key={ci}>
                              {/* Caja Principal del Módulo */}
                              <rect
                                x={cLeftX}
                                y={cTopY}
                                width={cW}
                                height={cH}
                                fill="#ffffff"
                                stroke="#0f172a"
                                strokeWidth="1.2"
                              />

                              {/* Si es Base: Cubierta Superior (+0.90) con Respaldo en Rojo */}
                              {isBase && (
                                <g>
                                  <rect
                                    x={cLeftX - 1}
                                    y={cTopY - 4}
                                    width={cW + 2}
                                    height={4}
                                    fill="#fecdd3"
                                    stroke="#e11d48"
                                    strokeWidth="0.8"
                                  />
                                  {/* Llamada DETALLE 1 */}
                                  <path d={`M ${cLeftX + cW * 0.3} ${cTopY - 4} L ${cLeftX + cW * 0.25} ${cTopY - 20}`} fill="none" stroke="#2563eb" strokeWidth="0.6" />
                                  <text x={cLeftX + cW * 0.25} y={cTopY - 22} fontSize="5.5" fill="#2563eb" fontWeight="bold">DETALLE 1</text>
                                </g>
                              )}

                              {/* Detalles de Frentes / Puertas / Cajones */}
                              {cab.variant === '4_drawers' ? (
                                <g stroke="#0f172a" strokeWidth="0.7">
                                  <line x1={cLeftX} y1={cTopY + cH * 0.25} x2={cLeftX + cW} y2={cTopY + cH * 0.25} />
                                  <line x1={cLeftX} y1={cTopY + cH * 0.5} x2={cLeftX + cW} y2={cTopY + cH * 0.5} />
                                  <line x1={cLeftX} y1={cTopY + cH * 0.75} x2={cLeftX + cW} y2={cTopY + cH * 0.75} />
                                </g>
                              ) : cab.variant === '2_pot_drawers' ? (
                                <g stroke="#0f172a" strokeWidth="0.7">
                                  <line x1={cLeftX} y1={cTopY + cH * 0.5} x2={cLeftX + cW} y2={cTopY + cH * 0.5} />
                                </g>
                              ) : cab.variant === '2_doors' || cab.variant === 'wall_2_doors' || cab.variant === 'tall_2_doors' ? (
                                <g stroke="#0f172a" strokeWidth="0.7">
                                  <line x1={cLeftX + cW / 2} y1={cTopY} x2={cLeftX + cW / 2} y2={cBottomY} />
                                  {/* Diagonales de apertura */}
                                  <path d={`M ${cLeftX} ${cTopY + cH / 2} L ${cLeftX + cW / 2} ${cTopY} L ${cLeftX + cW / 2} ${cBottomY} Z`} fill="none" stroke="#c026d3" strokeWidth="0.6" />
                                  <path d={`M ${cLeftX + cW} ${cTopY + cH / 2} L ${cLeftX + cW / 2} ${cTopY} L ${cLeftX + cW / 2} ${cBottomY} Z`} fill="none" stroke="#c026d3" strokeWidth="0.6" />
                                </g>
                              ) : isTall ? (
                                <g stroke="#0f172a" strokeWidth="0.7">
                                  <line x1={cLeftX} y1={cTopY + cH * 0.3} x2={cLeftX + cW} y2={cTopY + cH * 0.3} />
                                  <line x1={cLeftX} y1={cTopY + cH * 0.7} x2={cLeftX + cW} y2={cTopY + cH * 0.7} />
                                  <text x={cLeftX + cW / 2} y={cTopY + cH * 0.52} fontSize="6" fill="#ea580c" fontWeight="bold" textAnchor="middle">
                                    HORNO EMPOTRADO
                                  </text>
                                </g>
                              ) : (
                                <g>
                                  {/* Puerta 1 hoja con diagonal */}
                                  <path d={`M ${cLeftX} ${cTopY + cH / 2} L ${cLeftX + cW} ${cTopY} L ${cLeftX + cW} ${cBottomY} Z`} fill="none" stroke="#c026d3" strokeWidth="0.6" />
                                </g>
                              )}

                              {/* Cota de Ancho del Módulo */}
                              <g stroke="#000" strokeWidth="0.6">
                                <line x1={cLeftX} y1={cTopY - 6} x2={cLeftX + cW} y2={cTopY - 6} />
                                <line x1={cLeftX} y1={cTopY - 10} x2={cLeftX} y2={cTopY - 2} />
                                <line x1={cLeftX + cW} y1={cTopY - 10} x2={cLeftX + cW} y2={cTopY - 2} />
                                <text x={cLeftX + cW / 2} y={cTopY - 8} fontSize="7" fontWeight="bold" fill="#000" stroke="none" textAnchor="middle">
                                  {cItem.widthMm}
                                </text>
                              </g>
                            </g>
                          );
                        })}

                        {/* Cota de Altura Total Muro a la Izquierda (h=2200) */}
                        <g stroke="#c026d3" strokeWidth="0.7">
                          <line x1={wallStartX - 10} y1={groundY} x2={wallStartX - 10} y2={groundY - 2200 * elevScale} />
                          <line x1={wallStartX - 14} y1={groundY} x2={wallStartX - 6} y2={groundY} />
                          <line x1={wallStartX - 14} y1={groundY - 2200 * elevScale} x2={wallStartX - 6} y2={groundY - 2200 * elevScale} />
                          <text
                            x={wallStartX - 16}
                            y={groundY - 1100 * elevScale}
                            fontSize="7.5"
                            fontWeight="bold"
                            fill="#c026d3"
                            stroke="none"
                            textAnchor="middle"
                            transform={`rotate(-90 ${wallStartX - 16} ${groundY - 1100 * elevScale})`}
                          >
                            2200
                          </text>
                        </g>

                        {/* Indicador de Nivel +0.90 Cubierta */}
                        <text x={wallStartX + wallDrawW + 6} y={groundY - 900 * elevScale + 3} fontSize="6" fill="#e11d48" fontWeight="bold">
                          +0.90
                        </text>

                        {/* Cota de Largo Total del Muro Inferior */}
                        <g stroke="#000" strokeWidth="0.7">
                          <line x1={wallStartX} y1={groundY + 18} x2={wallStartX + wallDrawW} y2={groundY + 18} />
                          <line x1={wallStartX} y1={groundY + 14} x2={wallStartX} y2={groundY + 22} />
                          <line x1={wallStartX + wallDrawW} y1={groundY + 14} x2={wallStartX + wallDrawW} y2={groundY + 22} />
                          <text x={wallStartX + wallDrawW / 2} y={groundY + 28} fontSize="7.5" fontWeight="bold" fill="#000" stroke="none" textAnchor="middle">
                            {wallLenMm}
                          </text>
                        </g>
                      </svg>
                    </div>

                    <div className="text-[7px] text-slate-500 border-t border-slate-100 pt-0.5 flex justify-between">
                      <span>Murales con puertas y anclajes a muro</span>
                      <span className="font-bold text-slate-700">Costados {getColorName(state.doorColor)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VIÑETA ARQUITECTÓNICA INFERIOR ESTANDARIZADA (EN LA BASE EXACTA DE LA HOJA) */}
            <BlueprintTitleBlock 
              pageNum={1} 
              title="PROYECTO COCINA MODULAR ARQUIFY" 
              identTag="PL-01" 
              customContent="PLANTA GENERAL Y ELEVACIONES" 
            />

          </div>
        );
      })()}

      {/* 2. LÁMINAS TÉCNICAS DE FABRICACIÓN POR MÓDULO (Estilo Plano de Referencia) */}
      {printPages.map((page, pIdx) => {
        const pageNum = pIdx + 2;
        const cab = page.cab;

        // Escala consistente para el despiece de piezas del módulo
        const maxDimInModule = Math.max(...page.moduleParts.map(p => Math.max(p.length, p.width)), 600);
        const partScale = 220 / maxDimInModule;

        // Escala para las 3 vistas arquitectónicas del módulo
        const totalW = cab.width + cab.depth;
        const totalH = cab.depth + cab.height;
        const viewScale = Math.min(260 / totalW, 440 / totalH, 2.2);

        const legsH = (cab.type === 'base' || cab.type === 'island') ? 15 : 0;
        const bodyH = cab.height - legsH;

        return (
          <div key={pIdx} className="blueprint-page border border-black/10 flex flex-col justify-between p-8 bg-white relative">
            
            {/* Header del Módulo */}
            <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-4">
              <div>
                <div className="text-xs font-bold text-rose-600 uppercase tracking-widest">
                  NV-{cab.id.slice(0, 5).toUpperCase()} - COCINA MODULAR
                </div>
                <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900">
                  {getCabinetTypeName(cab)} {page.identTag} ({cab.width} x {cab.height} x {cab.depth} cm)
                </h2>
                <div className="flex gap-4 text-[10px] text-slate-600 mt-0.5">
                  <span><strong>Estructura:</strong> {getColorName(cab.structureColor || state.structureColor)} {thicknessMm}mm</span>
                  <span><strong>Frentes:</strong> {getColorName(cab.doorColor || state.doorColor)}</span>
                  <span><strong>Trasera:</strong> Durolac 3.5mm</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="border-2 border-rose-600 bg-rose-50 px-4 py-1 rounded text-center">
                  <div className="text-[8px] font-bold text-rose-500 uppercase">IDENT. ETIQ</div>
                  <div className="font-mono font-black text-xl text-rose-600">{page.identTag}</div>
                </div>
              </div>
            </div>

            {/* Contenido Principal: Vistas 3D a la Izquierda + Despiece a la Derecha */}
            <div className="flex-1 grid grid-cols-12 gap-6 pb-28 overflow-hidden">
              
              {/* COLUMNA IZQUIERDA: 3 VISTAS DEL MÓDULO (Planta, Frontal, Lateral) */}
              <div className="col-span-4 border-r-2 border-slate-300 pr-6 flex flex-col justify-between items-center py-2">
                
                {/* VISTA DE PLANTA */}
                <div className="flex flex-col items-center w-full">
                  <div className="text-[11px] font-bold tracking-widest text-slate-700 mb-6 uppercase">
                    VISTA DE PLANTA
                  </div>
                  <div 
                    className="relative border-2 border-slate-900 bg-slate-100/50 flex items-center justify-center shadow-xs"
                    style={{ width: `${cab.width * viewScale}px`, height: `${cab.depth * viewScale}px` }}
                  >
                    {/* Cota Ancho Superior (Magenta) */}
                    <div className="absolute -top-4 w-full flex flex-col items-center">
                      <div className="w-full border-b border-[#d946ef] relative">
                        <div className="absolute -top-1 left-0 h-2 border-l border-[#d946ef]"></div>
                        <div className="absolute -top-1 right-0 h-2 border-r border-[#d946ef]"></div>
                      </div>
                      <div className="text-[9.5px] text-[#d946ef] font-bold font-mono -mt-0.5">
                        {cab.width * 10} mm
                      </div>
                    </div>
                    {/* Cota Fondo Derecha (Magenta) */}
                    <div className="absolute top-0 -right-8 h-full flex items-center">
                      <div className="h-full border-r border-[#d946ef] relative">
                        <div className="absolute top-0 -left-1 w-2 border-t border-[#d946ef]"></div>
                        <div className="absolute bottom-0 -left-1 w-2 border-b border-[#d946ef]"></div>
                      </div>
                      <div className="text-[9.5px] ml-1.5 -rotate-90 origin-left translate-x-2 text-[#d946ef] font-bold font-mono">
                        {cab.depth * 10}
                      </div>
                    </div>

                    {/* Simetría o división interior */}
                    <svg className="absolute inset-0 w-full h-full">
                      <line x1="0" y1="0" x2="100%" y2="100%" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="2,2"/>
                      <line x1="0" y1="100%" x2="100%" y2="0" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="2,2"/>
                    </svg>
                  </div>
                </div>

                {/* VISTAS ELEVACIÓN: FRONTAL Y LATERAL */}
                <div className="flex gap-8 w-full justify-center items-end mt-4">
                  {/* VISTA FRONTAL */}
                  <div className="flex flex-col items-center">
                    <div className="text-[11px] font-bold tracking-widest text-slate-700 mb-6 uppercase">
                      VISTA FRONTAL
                    </div>
                    <div 
                      className="relative border-2 border-slate-900 bg-slate-50 flex flex-col justify-between shadow-xs"
                      style={{ width: `${cab.width * viewScale}px`, height: `${cab.height * viewScale}px` }}
                    >
                      {/* Cota Ancho Superior (Magenta) */}
                      <div className="absolute -top-4 w-full flex flex-col items-center">
                        <div className="w-full border-b border-[#d946ef] relative">
                          <div className="absolute -top-1 left-0 h-2 border-l border-[#d946ef]"></div>
                          <div className="absolute -top-1 right-0 h-2 border-r border-[#d946ef]"></div>
                        </div>
                        <div className="text-[9.5px] text-[#d946ef] font-bold font-mono -mt-0.5">
                          {cab.width * 10}
                        </div>
                      </div>
                      {/* Cota Alto Total Izquierda (Magenta) */}
                      <div className="absolute top-0 -left-8 h-full flex items-center">
                        <div className="h-full border-l border-[#d946ef] relative">
                          <div className="absolute top-0 -right-1 w-2 border-t border-[#d946ef]"></div>
                          <div className="absolute bottom-0 -right-1 w-2 border-b border-[#d946ef]"></div>
                        </div>
                        <div className="text-[9.5px] -mr-1.5 -rotate-90 origin-center text-[#d946ef] font-bold font-mono">
                          {cab.height * 10}
                        </div>
                      </div>

                      {/* Cuerpo de Gabinete vs Zócalo */}
                      <div className="relative flex-1 border-b border-slate-800 flex items-center justify-center">
                        {/* Diagonales de apertura de puertas */}
                        {cab.variant === '2_doors' && (
                          <svg className="absolute inset-0 w-full h-full">
                            <line x1="0" y1="50%" x2="50%" y2="0" stroke="#c026d3" strokeWidth="0.8"/>
                            <line x1="0" y1="50%" x2="50%" y2="100%" stroke="#c026d3" strokeWidth="0.8"/>
                            <line x1="100%" y1="50%" x2="50%" y2="0" stroke="#c026d3" strokeWidth="0.8"/>
                            <line x1="100%" y1="50%" x2="50%" y2="100%" stroke="#c026d3" strokeWidth="0.8"/>
                            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#0f172a" strokeWidth="1"/>
                          </svg>
                        )}
                        {cab.variant === '1_door' && (
                          <svg className="absolute inset-0 w-full h-full">
                            <line x1="0" y1="50%" x2="100%" y2="0" stroke="#c026d3" strokeWidth="0.8"/>
                            <line x1="0" y1="50%" x2="100%" y2="100%" stroke="#c026d3" strokeWidth="0.8"/>
                          </svg>
                        )}
                        {cab.variant === '4_drawers' && (
                          <div className="w-full h-full flex flex-col justify-between">
                            {Array.from({ length: 4 }).map((_, di) => (
                              <div key={di} className="flex-1 border-b border-slate-700 flex items-center justify-center text-[8px] text-slate-500 font-mono">
                                Cajón {di + 1}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Zócalo o Patas */}
                      {legsH > 0 && (
                        <div className="h-[20px] bg-slate-200/80 border-t border-slate-900 flex justify-between px-2 items-center text-[7px] text-slate-600 font-bold">
                          <span>PATAS REGULABLES</span>
                          <span>H=150</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* VISTA LATERAL */}
                  <div className="flex flex-col items-center">
                    <div className="text-[11px] font-bold tracking-widest text-slate-700 mb-6 uppercase">
                      VISTA LATERAL
                    </div>
                    <div 
                      className="relative border-2 border-slate-900 bg-slate-50 shadow-xs"
                      style={{ width: `${cab.depth * viewScale}px`, height: `${cab.height * viewScale}px` }}
                    >
                      {/* Cota Fondo Superior (Magenta) */}
                      <div className="absolute -top-4 w-full flex flex-col items-center">
                        <div className="w-full border-b border-[#d946ef] relative">
                          <div className="absolute -top-1 left-0 h-2 border-l border-[#d946ef]"></div>
                          <div className="absolute -top-1 right-0 h-2 border-r border-[#d946ef]"></div>
                        </div>
                        <div className="text-[9.5px] text-[#d946ef] font-bold font-mono -mt-0.5">
                          {cab.depth * 10}
                        </div>
                      </div>

                      {/* Indicación de Trasera a la izquierda (borde posterior) */}
                      <div className="absolute left-0 top-0 h-full w-[3px] bg-purple-600" title="Ranura Durolac"></div>
                      
                      {/* Frentes a la derecha (borde frontal) */}
                      <div className="absolute right-0 top-0 h-full w-[4px] bg-orange-500/80" title="Frente de Puerta / Cajón"></div>

                      {legsH > 0 && (
                        <div className="absolute bottom-0 left-0 w-full h-[20px] bg-slate-200/80 border-t border-slate-900 flex items-center justify-center text-[7px] text-slate-600">
                          ZÓCALO
                        </div>
                      )}
                    </div>
                  </div>

                </div>

              </div>

              {/* COLUMNA DERECHA: DESPIECE TÉCNICO Y PERFORACIONES PARAMÉTRICAS */}
              <div className="col-span-8 flex flex-col justify-between">
                
                {/* Cuadrícula de Piezas */}
                <div className="grid grid-cols-4 gap-x-12 gap-y-16 items-end pr-4 pt-6">
                  {page.parts.map((part, pSubIdx) => {
                    const drawW = Math.max(part.width * partScale, 24);
                    const drawH = Math.max(part.length * partScale, 24);

                    // Unificación estricta de espesor y tipo de tapacanto por pieza
                    const isFrontPiece = part.name.includes("Puerta") || part.name.includes("Frente") || part.name.includes("Panel Ciego") || part.name.includes("Tapa");
                    const isThick = isFrontPiece ? (state.edgeBandingThicknessFronts || 2.0) >= 1.0 : (state.edgeBandingThicknessCabinets || 0.5) >= 1.0;
                    const edgeDiamondClass = isThick ? "bg-rose-600 border border-white" : "bg-orange-500 border border-white";
                    const edgeDiamondTitle = isThick ? "TC PVC 22x2.0 MM (Frentes)" : "TC PVC 22x0.45 MM (Estructura)";

                    return (
                      <div key={pSubIdx} className="flex flex-col items-center relative">
                        
                        {/* Cabecera de la Pieza */}
                        <div className="flex flex-col items-center mb-6 h-14 justify-end">
                          <div className="text-[10px] font-bold text-slate-900 uppercase tracking-tight text-center leading-tight">
                            {part.name.replace(/\(Cab \d+ [^)]+\)/, '')}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] bg-black text-white px-2 py-0.5 rounded font-mono font-bold">
                              {part.qty} UN
                            </span>
                            <span className="text-[8px] text-slate-500">
                              {part.thickness}mm
                            </span>
                          </div>
                        </div>

                        {/* Contenedor Gráfico de la Pieza a Escala */}
                        <div className="relative z-10" style={{ width: `${drawW}px`, height: `${drawH}px` }}>
                          
                          {/* Superficie de la pieza */}
                          <div className="absolute inset-0 bg-[#faf8f5] border-2 border-slate-800 shadow-xs"></div>

                          {/* Rombos de Tapacanto Unificados */}
                          {part.edgeL1 && (
                            <div className={`absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rotate-45 ${edgeDiamondClass} shadow-xs z-30`} title={`Canto Largo 1 - ${edgeDiamondTitle}`}></div>
                          )}
                          {part.edgeL2 && (
                            <div className={`absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-3 h-3 rotate-45 ${edgeDiamondClass} shadow-xs z-30`} title={`Canto Largo 2 - ${edgeDiamondTitle}`}></div>
                          )}
                          {part.edgeW1 && (
                            <div className={`absolute top-0 left-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rotate-45 ${edgeDiamondClass} shadow-xs z-30`} title={`Canto Ancho 1 - ${edgeDiamondTitle}`}></div>
                          )}
                          {part.edgeW2 && (
                            <div className={`absolute bottom-0 left-1/2 translate-y-1/2 -translate-x-1/2 w-3 h-3 rotate-45 ${edgeDiamondClass} shadow-xs z-30`} title={`Canto Ancho 2 - ${edgeDiamondTitle}`}></div>
                          )}

                          {/* Cota General Horizontal Inferior (NIVEL 2 EXTERIOR - Magenta) */}
                          <div className="absolute -bottom-11 left-0 w-full flex flex-col items-center pointer-events-none">
                            {/* Líneas guía / extensión desde la pieza */}
                            <div className="w-full relative h-0">
                              <div className="absolute -top-5 left-0 h-5 border-l border-[#d946ef]/60 border-dashed"></div>
                              <div className="absolute -top-5 right-0 h-5 border-r border-[#d946ef]/60 border-dashed"></div>
                            </div>
                            <div className="w-full border-b-2 border-[#d946ef] relative">
                              <div className="absolute -top-1.5 left-0 h-3 border-l-2 border-[#d946ef]"></div>
                              <div className="absolute -top-1.5 right-0 h-3 border-r-2 border-[#d946ef]"></div>
                            </div>
                            <div className="text-[10px] text-[#d946ef] font-black font-mono mt-0.5 bg-white/90 px-1 rounded">
                              {part.width.toFixed(0)}
                            </div>
                          </div>

                          {/* Cota General Vertical Derecha (NIVEL 2 EXTERIOR - Magenta) */}
                          <div className="absolute top-0 -right-14 h-full flex items-center pointer-events-none">
                            {/* Líneas guía / extensión desde la pieza */}
                            <div className="h-full relative w-0">
                              <div className="absolute top-0 -left-7 w-7 border-t border-[#d946ef]/60 border-dashed"></div>
                              <div className="absolute bottom-0 -left-7 w-7 border-b border-[#d946ef]/60 border-dashed"></div>
                            </div>
                            <div className="h-full border-r-2 border-[#d946ef] relative">
                              <div className="absolute top-0 -left-1.5 w-3 border-t-2 border-[#d946ef]"></div>
                              <div className="absolute bottom-0 -left-1.5 w-3 border-b-2 border-[#d946ef]"></div>
                            </div>
                            <div className="text-[10px] ml-1.5 -rotate-90 origin-center text-[#d946ef] font-black font-mono bg-white/90 px-1 rounded whitespace-nowrap">
                              {part.length.toFixed(0)}
                            </div>
                          </div>

                          {/* Renderizado de Mecanizados, Perforaciones y Cotas de Eje */}
                          {renderPartMachiningSVG(part, cab, drawW, drawH, partScale)}

                        </div>

                      </div>
                    );
                  })}
                </div>

                {/* DETALLES TÉCNICOS AMPLIADOS (Callouts al pie según plano de referencia) */}
                <div className="grid grid-cols-3 gap-4 bg-slate-50/80 p-3 rounded-lg border border-slate-200 mt-6">
                  {/* Detalle 1: Canal Durolac */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-2 border-purple-500 bg-white flex items-center justify-center shrink-0 relative overflow-hidden">
                      <svg viewBox="0 0 50 50" className="w-full h-full p-1">
                        <rect x="5" y="10" width="40" height="30" fill="#f8fafc" stroke="#334155" strokeWidth="1"/>
                        <rect x="28" y="10" width="8" height="15" fill="#e2e8f0" stroke="#9333ea" strokeWidth="1" strokeDasharray="1,1"/>
                        <line x1="28" y1="35" x2="36" y2="35" stroke="#2563eb" strokeWidth="0.8"/>
                        <text x="32" y="42" fontSize="6" fill="#2563eb" textAnchor="middle">4mm</text>
                      </svg>
                    </div>
                    <div className="text-[8px] text-slate-700 leading-tight">
                      <div className="font-bold text-purple-700 uppercase">DETALLE 1</div>
                      <div>CANAL TRASERA / DUROLAC</div>
                      <div className="text-slate-500">A 15mm del borde • Prof. 7.5mm</div>
                    </div>
                  </div>

                  {/* Detalle 2: Ensamble Minifix o Tornillo */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-2 border-emerald-500 bg-white flex items-center justify-center shrink-0 relative overflow-hidden">
                      <svg viewBox="0 0 50 50" className="w-full h-full p-1">
                        {state.assemblyType === 'minifix' ? (
                          <>
                            <circle cx="25" cy="25" r="10" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.2"/>
                            <circle cx="25" cy="25" r="3" fill="#16a34a"/>
                            <line x1="12" y1="25" x2="38" y2="25" stroke="#16a34a" strokeWidth="0.6"/>
                            <text x="25" y="44" fontSize="6" fill="#16a34a" textAnchor="middle" fontWeight="bold">Ø15 Minifix</text>
                          </>
                        ) : (
                          <>
                            <circle cx="25" cy="25" r="5" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.2"/>
                            <line x1="20" y1="20" x2="30" y2="30" stroke="#2563eb" strokeWidth="1"/>
                            <line x1="20" y1="30" x2="30" y2="20" stroke="#2563eb" strokeWidth="1"/>
                            <text x="25" y="44" fontSize="6" fill="#2563eb" textAnchor="middle" fontWeight="bold">Ø5 Tornillo</text>
                          </>
                        )}
                      </svg>
                    </div>
                    <div className="text-[8px] text-slate-700 leading-tight">
                      <div className="font-bold text-emerald-700 uppercase">DETALLE 2</div>
                      <div>ENSAMBLE ESTRUCTURAL</div>
                      <div className="text-slate-500">
                        {state.assemblyType === 'minifix' ? 'Minifix a 34mm + Tarugo a 66mm' : 'Soberbio Spax 5x50 a 50mm'}
                      </div>
                    </div>
                  </div>

                  {/* Detalle 3: Cazoleta Bisagra */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-2 border-orange-500 bg-white flex items-center justify-center shrink-0 relative overflow-hidden">
                      <svg viewBox="0 0 50 50" className="w-full h-full p-1">
                        <circle cx="25" cy="25" r="14" fill="#ffedd5" stroke="#ea580c" strokeWidth="1.2" strokeDasharray="2,2"/>
                        <circle cx="25" cy="25" r="3" fill="#ea580c"/>
                        <line x1="25" y1="5" x2="25" y2="45" stroke="#ea580c" strokeWidth="0.6" strokeDasharray="1,1"/>
                        <text x="25" y="44" fontSize="6" fill="#ea580c" textAnchor="middle" fontWeight="bold">Ø35 Bisagra</text>
                      </svg>
                    </div>
                    <div className="text-[8px] text-slate-700 leading-tight">
                      <div className="font-bold text-orange-700 uppercase">DETALLE 3</div>
                      <div>CAZOLETA DE BISAGRA</div>
                      <div className="text-slate-500">Eje a 22.5mm • A 90mm de extremos</div>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* TitleBlock de la Lámina Técnica */}
            <BlueprintTitleBlock 
              pageNum={pageNum} 
              title={`PLANOS DE FABRICACIÓN: ${getCabinetTypeName(cab)}`} 
              cab={cab}
              identTag={page.identTag}
            />

          </div>
        );
      })}

      {/* 3. PLANOS DE OPTIMIZACIÓN DE CORTE (NESTING) */}
      {boardResults.map((board, bIndex) => {
        const pageNum = 1 + printPages.length + bIndex + 1;

        return (
          <div key={'board-' + bIndex} className="blueprint-page border border-black/10 flex flex-col justify-between p-8 pb-32 bg-white relative">
            <div className="flex justify-between items-end border-b-2 border-slate-900 pb-3 mb-2 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-orange-100 text-orange-800">
                    {board.label}
                  </span>
                  <span className="text-[10px] uppercase font-mono text-slate-500">
                    Plancha #{bIndex + 1} de {boardResults.length}
                  </span>
                </div>
                <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900">
                  Esquema de Corte & Optimización <span className="text-orange-500">#{bIndex + 1}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider">
                  Material: <span className="font-bold text-slate-800">{board.materialName}</span> • Formato: <span className="font-mono font-bold text-slate-800">{board.w} x {board.h} x {board.thicknessMm} mm</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-0.5">Aprovechamiento</p>
                <p className="font-mono text-xl font-bold text-emerald-600">{(100 - board.wastePercentage).toFixed(1)}%</p>
              </div>
            </div>
            
            <div className="w-full flex items-center justify-center my-auto">
              <div 
                className="relative bg-slate-100 border-2 border-slate-700 rounded shadow-md overflow-hidden w-full max-w-[880px]" 
                style={{ aspectRatio: `${board.w} / ${board.h}`, maxHeight: '560px' }}
              >
                {board.placedParts.map((bp, pi) => {
                  const scaleX = 100 / board.w;
                  const scaleY = 100 / board.h;
                  return (
                    <div 
                      key={pi}
                      className="absolute border border-slate-700 bg-white hover:bg-amber-50/50 shadow-xs flex flex-col items-center justify-center p-0.5 overflow-hidden transition-colors"
                      style={{
                        left: `${bp.x * scaleX}%`,
                        top: `${bp.y * scaleY}%`,
                        width: `${bp.w * scaleX}%`,
                        height: `${bp.h * scaleY}%`,
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* Tapacantos visuales en los bordes */}
                      {bp.edgeTop && <div className="absolute top-0 left-0 right-0 h-[2px] bg-orange-500 z-10" />}
                      {bp.edgeBottom && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-orange-500 z-10" />}
                      {bp.edgeLeft && <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-orange-500 z-10" />}
                      {bp.edgeRight && <div className="absolute top-0 bottom-0 right-0 w-[2px] bg-orange-500 z-10" />}

                      <span className="text-[8px] font-bold text-slate-900 text-center leading-tight truncate max-w-full px-1">
                        {bp.name.replace(/\(Cab \d+ [^)]+\)/, '')}
                      </span>
                      <span className="text-[7.5px] font-mono font-bold text-orange-600">
                        {bp.w} x {bp.h} mm
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-600 border-t border-slate-200 pt-2 shrink-0">
              <div className="flex gap-8">
                <p><span className="font-bold text-black">Formato Plancha:</span> {board.w} x {board.h} mm</p>
                <p><span className="font-bold text-black">Espesor Hoja Sierra:</span> 3.2 mm</p>
                <p><span className="font-bold text-black">Margen Refilado:</span> 15 mm</p>
              </div>
              <div>
                <span className="font-bold text-black">Total Piezas Plancha:</span> {board.placedParts.length} un.
              </div>
            </div>

            <BlueprintTitleBlock pageNum={pageNum} title={`OPTIMIZACIÓN CORTE: ${board.label}`} />
          </div>
        );
      })}
      
      {/* 4. LISTADO DE HERRAJES E INSUMOS (BoM) */}
      <div className="blueprint-page border border-black/10 flex flex-col justify-between p-8 bg-white relative">
        <div className="flex justify-between items-end border-b-2 border-slate-900 pb-3 mb-4">
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900">
              Listado Consolidado de Materiales e Insumos <span className="text-orange-500">(BOM)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider">
              Sistema: {state.assemblyType === 'minifix' ? 'Minifix + Tarugo 8x30' : 'Soberbio / Spax 5x50'} • Correderas: {state.drawerHardware} • Tableros Formato Estándar
            </p>
          </div>
        </div>

        <table className="w-full text-left text-xs border-collapse flex-1 mb-24">
          <thead>
            <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px]">
              <th className="p-2 border-b-2 border-slate-300">Categoría</th>
              <th className="p-2 border-b-2 border-slate-300">Ítem / Componente</th>
              <th className="p-2 border-b-2 border-slate-300 text-center">Cantidad</th>
              <th className="p-2 border-b-2 border-slate-300 text-center">Unidad</th>
              <th className="p-2 border-b-2 border-slate-300">Detalles de Aplicación</th>
            </tr>
          </thead>
          <tbody>
            {hardwareList.map((hw, idx) => {
              const catColors: Record<string, string> = {
                Tableros: 'bg-amber-100 text-amber-900',
                Insumos: 'bg-sky-100 text-sky-900',
                Quincallería: 'bg-blue-100 text-blue-900',
                Zócalos: 'bg-emerald-100 text-emerald-900',
                Equipamiento: 'bg-purple-100 text-purple-900',
                Decoración: 'bg-pink-100 text-pink-900'
              };
              const badgeClass = catColors[hw.Categoria] || 'bg-slate-100 text-slate-800';

              return (
                <tr key={idx} className="border-b border-slate-200 even:bg-slate-50/50">
                  <td className="p-2">
                    <span className={`px-2 py-0.5 text-[9px] uppercase font-bold rounded ${badgeClass}`}>
                      {hw.Categoria || 'General'}
                    </span>
                  </td>
                  <td className="p-2 font-medium text-slate-800">{hw.Item}</td>
                  <td className="p-2 text-center font-mono font-bold">{hw.Cantidad}</td>
                  <td className="p-2 text-center text-slate-500">{hw.Unidad}</td>
                  <td className="p-2 text-slate-600 text-[11px]">{hw.Detalles || ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        <BlueprintTitleBlock pageNum={totalDocPages} title="LISTADO CONSOLIDADO DE MATERIALES E INSUMOS (BOM)" />
      </div>

    </div>
  );
}
