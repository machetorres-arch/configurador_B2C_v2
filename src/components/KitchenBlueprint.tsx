import React, { useState } from 'react';
import { Printer, Download, X, HelpCircle, FileText, CheckCircle2, Loader2, QrCode, Cpu, FileSpreadsheet, DollarSign } from 'lucide-react';
import { useStore } from '../store';
import { useKitchenStore, CabinetType } from '../store/kitchenStore';
import { analyzeRoomWalls } from '../utils/roomGeometry';
import { getCabinetBox2D } from '../utils/kitchenCollision';
import { Part } from '../utils/manufacturing';
import { generateKitchenPartsList, generateKitchenHardwareList, HARDWARE_SPECS, getResolvedCabinetShelfElevations, isCabinetWithDoors, isCabinetWithSplitDoors } from '../utils/kitchenManufacturing';
import { optimizeNesting, NestingPart, BoardResult } from '../utils/nesting';
import { exportKitchenPDF } from '../utils/kitchenPdfGenerator';
import { exportBlueprintDomToPdf } from '../utils/blueprintPdfExport';
import { exportKitchenToExcel } from '../utils/kitchenExcelGenerator';
import { KitchenB2BQuoteModal } from './kitchen/KitchenB2BQuoteModal';
import { getFriendlyColorName } from '../utils/colorNames';
import { generateCountertopPieces } from '../utils/countertopNesting';
import { calculateCncMachiningForPart } from '../utils/kitchenCncMachining';
import { downloadPartDxfFile, downloadAllPartsDxf, downloadKitchenDxfZip } from '../utils/kitchenCncDxf';
import { exportKitchenLabelsPDF } from '../utils/kitchenLabelsPdfGenerator';
import { KitchenMepBlueprintSheet } from './kitchen/KitchenMepBlueprintSheet';

export function KitchenBlueprint() {
  const state = useStore();
  const kState = useKitchenStore();
  const [isExportingA3, setIsExportingA3] = useState(false);
  const [isExportingLabels, setIsExportingLabels] = useState(false);
  const [isExportingDxf, setIsExportingDxf] = useState(false);
  const [isB2BQuoteOpen, setIsB2BQuoteOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);

  if (!state.isPrinting) return null;

  const handleExportLabels = async () => {
    setIsExportingLabels(true);
    try {
      await exportKitchenLabelsPDF(kState.cabinets, state);
    } catch (err) {
      console.error('Error exportando etiquetas:', err);
      alert('Ocurrió un error al compilar las etiquetas de producción.');
    } finally {
      setIsExportingLabels(false);
    }
  };

  const handleExportAllDxf = async () => {
    setIsExportingDxf(true);
    try {
      const realCabs = kState.cabinets.filter(c => c.type !== 'decoration' && !c.variant?.startsWith('deco_'));
      const allParts = generateKitchenPartsList(realCabs);
      
      const getTypeName = (cab: CabinetType) => {
        if (cab.type === 'wall') return 'AEREO';
        if (cab.type === 'tall') return 'TORRE';
        if (cab.type === 'island') return 'ISLA';
        return 'BASE';
      };

      const groups = realCabs.map((cab, index) => {
        const cabParts = allParts.filter(p => p.moduleId === cab.id);
        const tagPrefix = cab.type === 'wall' ? 'A' : cab.type === 'tall' ? 'T' : cab.type === 'island' ? 'I' : 'B';
        const identTag = `${tagPrefix}-${index + 1}`;
        const typeName = getTypeName(cab);
        const wCm = Math.round(cab.width);
        const hCm = Math.round(cab.height);
        const dCm = Math.round(cab.depth);
        const numStr = (index + 1).toString().padStart(2, '0');
        const folderName = `${numStr}_MUEBLE_${typeName}_${wCm}x${hCm}x${dCm}cm_${identTag}`;

        const cncParts = cabParts.map(p => {
          return calculateCncMachiningForPart(
            p, 
            cab, 
            state.drawerHardware === 'Hafele' ? 'Hafele' : 'Provelcar', 
            state.assemblyType === 'minifix' ? 'minifix' : 'spax', 
            kState.golaSystem,
            kState.handleConfig
          );
        });

        return {
          folderName,
          cabinetTag: identTag,
          cabinetName: `${typeName} ${wCm}x${hCm}x${dCm}cm`,
          parts: cncParts
        };
      }).filter(g => g.parts.length > 0);

      await downloadKitchenDxfZip(groups, 'Cocina_Modular_Planos_CNC');
    } catch (err) {
      console.error('Error exportando paquete DXF:', err);
      alert('Ocurrió un error al compilar el paquete ZIP de archivos DXF.');
    } finally {
      setIsExportingDxf(false);
    }
  };

  const handleExportA3 = async () => {
    setIsExportingA3(true);
    setGeneratedPdfUrl(null);
    try {
      const url = await exportBlueprintDomToPdf('planos_fabricacion_cocina_A3.pdf', (curr, tot) => {
        setExportProgress({ current: curr, total: tot });
      });
      if (url) {
        setGeneratedPdfUrl(url);
      } else {
        alert('No se pudieron compilar las láminas A3. Puedes usar el botón "Imprimir" (Guardar como PDF) o la "Ficha Técnica PDF (Despiece / BOM)".');
      }
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
  const getColorName = (colorVal?: string) => getFriendlyColorName(colorVal, state.customTextures);

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

  const ctBOM = generateCountertopPieces(kState.cabinets, kState.countertopConfig, kState.qstoneCatalog, kState.islandBackConfig, kState.walls, kState.architecturalElements, kState.roomConfig);
  const stonePagesCount = (kState.countertopConfig?.enabled && ctBOM && ctBOM.pieces.length > 0) ? ctBOM.slabsLayout.length : 0;
  const hasMepPage = kState.mepPoints && kState.mepPoints.length > 0;
  const mepPagesCount = hasMepPage ? 1 : 0;

  const totalDocPages = 1 + mepPagesCount + printPages.length + boardResults.length + stonePagesCount + 1;

  const getCabinetTypeName = (cab: CabinetType) => {
    if (cab.type === 'wall') return 'MUEBLE AÉREO / MURAL';
    if (cab.type === 'tall') return 'MUEBLE TORRE / DESPENSA';
    if (cab.type === 'island') return 'MUEBLE ISLA';
    return 'MUEBLE BASE';
  };

  /**
   * Renderizado Paramétrico Vectorial SVG Unificado por Pieza (Cotas, Tapacantos, Mecanizados)
   * Escala y centra matemáticamente la pieza y sus cotas dentro del viewBox SVG.
   * Calibrado para que la pieza y cotas ocupen ~80% del recuadro disponible con tipografías legibles (mínimo 9-11pt).
   */
  const renderUnifiedPartSVG = (part: Part, cab: CabinetType) => {
    const pw = Math.round(part.width);
    const pl = Math.round(part.length);
    const baseDim = Math.max(pw, pl, 200);

    const isLateral = part.name.includes("Lateral") && !part.name.includes("Cajón");
    const isPiso = part.name.includes("Piso") || (part.name.includes("Base") && !part.name.includes("Soporte Horno"));
    const isTecho = part.name.includes("Techo");
    const isBarraAmarre = part.name.includes("Barra") || part.name.includes("Amarre");
    const isRepisa = part.name.includes("Repisa") || part.name.includes("Divisor");
    const isPuerta = part.name.includes("Puerta");
    const isFrenteCajon = part.name.includes("Frente Cajón");
    const isLateralCajon = part.name.includes("Lateral Cajón");

    const isMinifix = state.assemblyType === 'minifix';

    // Detección de mecanizados por cara para cálculo de paddings
    const hasTopMachining = isLateral || isFrenteCajon || ((isPiso || isTecho || isBarraAmarre) && isMinifix);
    const hasLeftMachining = isPuerta || isLateral || isFrenteCajon || isLateralCajon || ((isPiso || isTecho || isBarraAmarre) && isMinifix);

    const vMax = Math.max(pw, pl, 300);

    // Tipografía CAD nítida y de alta legibilidad calibrada para pantalla y A3
    // Se escala matemáticamente para asegurar números grandes (mínimo 13-16px reales en pantalla)
    const fSizeCotaGeneral = Math.max(48, Math.round(vMax * 0.105));
    // En piezas angostas (barras 100mm, laterales cajón) se ajusta proporcionalmente para no desbordar
    const fSizeCotaHoriz = Math.min(fSizeCotaGeneral, Math.max(34, Math.round(pw * 0.38)));
    const fSizeCotaVert = fSizeCotaGeneral;
    // Cota técnica de mecanizados (34, 32, 50, 15, 22.5, 9.5)
    const fSizeSm = Math.max(38, Math.round(vMax * 0.088));

    // Espesores de trazo sólidos y definidos (elimina líneas subpixel borrosas)
    const strokeThick = Math.max(3.8, Math.round(vMax * 0.012));
    const strokeMed = Math.max(2.6, Math.round(vMax * 0.008));
    const strokeThin = Math.max(1.8, Math.round(vMax * 0.0055));
    const haloWidth = Math.max(4.2, strokeMed * 2.2);

    const isNarrowPiece = isBarraAmarre || pw < 280;

    const isFrontPiece = part.name.includes("Puerta") || part.name.includes("Frente") || part.name.includes("Panel Ciego") || part.name.includes("Tapa");
    const isThickEdge = isFrontPiece ? (state.edgeBandingThicknessFronts || 2.0) >= 1.0 : (state.edgeBandingThicknessCabinets || 0.5) >= 1.0;
    const edgeColor = isThickEdge ? "#e11d48" : "#f97316";

    const COLOR_MAGENTA = "#c026d3"; // Cotas Generales de Corte (Magenta puro alta saturación)
    const COLOR_MINIFIX = "#15803d"; // Perforación Minifix Ø15/Ø8
    const COLOR_TARUGO = "#b91c1c";  // Perforación Tarugo Ø8x30
    const COLOR_SPAX = "#1d4ed8";    // Perforación Tornillo Spax Ø5
    const COLOR_DETALLE = "#1e40af"; // Cotas de Ejes y Perforaciones (Azul técnico alto contraste)
    const COLOR_CANAL = "#7e22ce";   // Canal Durolac

    // CÁLCULO RIGUROSO DE PADDINGS PARA EVITAR CORTES DE COTAS Y TEXTOS
    const padT = hasTopMachining 
      ? (isMinifix ? Math.max(125, Math.round(vMax * 0.25)) : Math.max(95, Math.round(vMax * 0.20))) 
      : Math.max(40, Math.round(vMax * 0.08));

    const padL = hasLeftMachining 
      ? Math.max(105, Math.round(vMax * 0.22)) 
      : Math.max(40, Math.round(vMax * 0.08));

    // Espacio inferior (padB): cotas de detalle + Cota General + Altura de texto
    const distB = isLateral ? Math.max(75, Math.round(vMax * 0.16)) : Math.max(55, Math.round(vMax * 0.12));
    const cotaBottomY = pl + distB;
    const padB = (cotaBottomY - pl) + fSizeCotaHoriz * 1.6 + 28;

    // Espacio derecho (padR): Cota General Vertical + Texto Rotado
    const distR = Math.max(55, Math.round(vMax * 0.12));
    const cotaRightX = pw + distR;
    const padR = (cotaRightX - pw) + fSizeCotaVert * 1.6 + 28;

    const viewBoxW = pw + padL + padR;
    const viewBoxH = pl + padT + padB;

    return (
      <svg 
        viewBox={`-${padL} -${padT} ${viewBoxW} ${viewBoxH}`} 
        className="w-full h-[215px] max-h-[225px] overflow-visible"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* 1. Superficie de la Pieza */}
        <rect 
          x={0} 
          y={0} 
          width={pw} 
          height={pl} 
          fill="#faf8f5" 
          stroke="#0f172a" 
          strokeWidth={strokeThick} 
        />

        {/* 2. Tapacantos en Bordes con Distintivo de Rombo */}
        {part.edgeW1 && (
          <g>
            <line x1={0} y1={0} x2={pw} y2={0} stroke={edgeColor} strokeWidth={strokeThick * 2} />
            <polygon points={`${pw / 2},-${strokeThick * 2} ${pw / 2 + 5},-${strokeThick * 2 - 5} ${pw / 2},-${strokeThick * 2 - 10} ${pw / 2 - 5},-${strokeThick * 2 - 5}`} fill={edgeColor} stroke="#ffffff" strokeWidth="0.8" />
          </g>
        )}
        {part.edgeW2 && (
          <g>
            <line x1={0} y1={pl} x2={pw} y2={pl} stroke={edgeColor} strokeWidth={strokeThick * 2} />
            <polygon points={`${pw / 2},${pl + strokeThick * 2} ${pw / 2 + 5},${pl + strokeThick * 2 + 5} ${pw / 2},${pl + strokeThick * 2 + 10} ${pw / 2 - 5},${pl + strokeThick * 2 + 5}`} fill={edgeColor} stroke="#ffffff" strokeWidth="0.8" />
          </g>
        )}
        {part.edgeL1 && (
          <g>
            <line x1={0} y1={0} x2={0} y2={pl} stroke={edgeColor} strokeWidth={strokeThick * 2} />
            <polygon points={`-${strokeThick * 2},${pl / 2} -${strokeThick * 2 - 5},${pl / 2 + 5} -${strokeThick * 2 - 10},${pl / 2} -${strokeThick * 2 - 5},${pl / 2 - 5}`} fill={edgeColor} stroke="#ffffff" strokeWidth="0.8" />
          </g>
        )}
        {part.edgeL2 && (
          <g>
            <line x1={pw} y1={0} x2={pw} y2={pl} stroke={edgeColor} strokeWidth={strokeThick * 2} />
            <polygon points={`${pw + strokeThick * 2},${pl / 2} ${pw + strokeThick * 2 + 5},${pl / 2 + 5} ${pw + strokeThick * 2 + 10},${pl / 2} ${pw + strokeThick * 2 + 5},${pl / 2 - 5}`} fill={edgeColor} stroke="#ffffff" strokeWidth="0.8" />
          </g>
        )}

        {/* 3. Cota General Horizontal Inferior (Magenta) - Nítida con Halo Blanco Antidesenfoque */}
        <g>
          <line x1={0} y1={cotaBottomY} x2={pw} y2={cotaBottomY} stroke={COLOR_MAGENTA} strokeWidth={strokeMed} />
          <line x1={0} y1={pl + 3} x2={0} y2={cotaBottomY + 6} stroke={COLOR_MAGENTA} strokeWidth={strokeThin} strokeDasharray="4,2" />
          <line x1={pw} y1={pl + 3} x2={pw} y2={cotaBottomY + 6} stroke={COLOR_MAGENTA} strokeWidth={strokeThin} strokeDasharray="4,2" />
          <line x1={-5} y1={cotaBottomY + 5} x2={5} y2={cotaBottomY - 5} stroke={COLOR_MAGENTA} strokeWidth={strokeMed * 1.5} />
          <line x1={pw - 5} y1={cotaBottomY + 5} x2={pw + 5} y2={cotaBottomY - 5} stroke={COLOR_MAGENTA} strokeWidth={strokeMed * 1.5} />
          <text 
            x={pw / 2} 
            y={cotaBottomY + fSizeCotaHoriz * 0.95 + 4} 
            fontSize={fSizeCotaHoriz} 
            fill={COLOR_MAGENTA} 
            stroke="#ffffff"
            strokeWidth={haloWidth}
            paintOrder="stroke fill"
            strokeLinejoin="round"
            fontWeight="900" 
            fontFamily="monospace"
            textAnchor="middle"
            textRendering="geometricPrecision"
          >
            {pw}
          </text>
        </g>

        {/* 4. Cota General Vertical Derecha (Magenta) - Nítida con Halo Blanco */}
        <g>
          <line x1={cotaRightX} y1={0} x2={cotaRightX} y2={pl} stroke={COLOR_MAGENTA} strokeWidth={strokeMed} />
          <line x1={pw + 3} y1={0} x2={cotaRightX + 6} y2={0} stroke={COLOR_MAGENTA} strokeWidth={strokeThin} strokeDasharray="4,2" />
          <line x1={pw + 3} y1={pl} x2={cotaRightX + 6} y2={pl} stroke={COLOR_MAGENTA} strokeWidth={strokeThin} strokeDasharray="4,2" />
          <line x1={cotaRightX - 5} y1={5} x2={cotaRightX + 5} y2={-5} stroke={COLOR_MAGENTA} strokeWidth={strokeMed * 1.5} />
          <line x1={cotaRightX - 5} y1={pl + 5} x2={cotaRightX + 5} y2={pl - 5} stroke={COLOR_MAGENTA} strokeWidth={strokeMed * 1.5} />
          <text 
            x={cotaRightX + fSizeCotaVert * 0.95 + 4} 
            y={pl / 2} 
            fontSize={fSizeCotaVert} 
            fill={COLOR_MAGENTA} 
            stroke="#ffffff"
            strokeWidth={haloWidth}
            paintOrder="stroke fill"
            strokeLinejoin="round"
            fontWeight="900" 
            fontFamily="monospace"
            textAnchor="middle"
            textRendering="geometricPrecision"
            transform={`rotate(90 ${cotaRightX + fSizeCotaVert * 0.95 + 4} ${pl / 2})`}
          >
            {pl}
          </text>
        </g>

        {/* 5. Mecanizados y Perforaciones Técnicas con Tipografía Grande y Definida */}
        {isLateral && (
          <g key="machining-lateral">
            {/* Canal Trasera / Durolac */}
            <line x1={pw - 15} y1={0} x2={pw - 15} y2={pl} stroke={COLOR_CANAL} strokeWidth={strokeMed} strokeDasharray="5,3" />
            <line x1={pw - 19} y1={0} x2={pw - 19} y2={pl} stroke={COLOR_CANAL} strokeWidth={strokeThin} strokeDasharray="5,3" />
            {/* Cota Canal Durolac a 15mm */}
            <line x1={pw - 15} y1={pl + 24} x2={pw} y2={pl + 24} stroke={COLOR_CANAL} strokeWidth={strokeThin} />
            <line x1={pw - 15} y1={pl + 3} x2={pw - 15} y2={pl + 30} stroke={COLOR_CANAL} strokeWidth={strokeThin} />
            <line x1={pw} y1={pl + 3} x2={pw} y2={pl + 30} stroke={COLOR_CANAL} strokeWidth={strokeThin} />
            <text x={pw - 7.5} y={pl + 20} fontSize={fSizeSm} fill={COLOR_CANAL} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">15</text>

            {isMinifix ? (
              <g>
                {/* Perforaciones Minifix + Tarugo */}
                {[halfThickness, pl - halfThickness].map((yPos, i) => (
                  <g key={i}>
                    <circle cx={34} cy={yPos} r={Math.max(6, Math.round(vMax * 0.016))} fill={COLOR_MINIFIX} stroke="#065f46" strokeWidth={strokeThin} />
                    <circle cx={66} cy={yPos} r={Math.max(4.5, Math.round(vMax * 0.012))} fill={COLOR_TARUGO} stroke="#991b1b" strokeWidth={strokeThin} />
                    <circle cx={pw - 50} cy={yPos} r={Math.max(6, Math.round(vMax * 0.016))} fill={COLOR_MINIFIX} stroke="#065f46" strokeWidth={strokeThin} />
                    <circle cx={pw - 82} cy={yPos} r={Math.max(4.5, Math.round(vMax * 0.012))} fill={COLOR_TARUGO} stroke="#991b1b" strokeWidth={strokeThin} />
                  </g>
                ))}
                {/* Cotas Minifix Frontal: Tier 1 a 34mm, Tier 2 a 32mm */}
                <line x1={0} y1={-padT * 0.36} x2={34} y2={-padT * 0.36} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={0} y1={-padT * 0.48} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={34} y1={-padT * 0.48} x2={34} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <text x={17} y={-padT * 0.36 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">34</text>

                <line x1={34} y1={-padT * 0.72} x2={66} y2={-padT * 0.72} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={34} y1={-padT * 0.84} x2={34} y2={-padT * 0.36} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={66} y1={-padT * 0.84} x2={66} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <text x={50} y={-padT * 0.72 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">32</text>

                {/* Cotas Minifix Trasero: 50mm y 32mm */}
                <line x1={pw - 50} y1={-padT * 0.36} x2={pw} y2={-padT * 0.36} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={pw - 50} y1={-padT * 0.48} x2={pw - 50} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={pw} y1={-padT * 0.48} x2={pw} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <text x={pw - 25} y={-padT * 0.36 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">50</text>

                {/* Cota vertical de canto: halfThickness desde bordes superior e inferior */}
                <line x1={-padL * 0.38} y1={0} x2={-padL * 0.38} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={-padL * 0.50} y1={0} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={-padL * 0.50} y1={halfThickness} x2={34} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <text x={-padL * 0.62} y={halfThickness / 2 + fSizeSm * 0.35} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">{halfThickness}</text>

                <line x1={-padL * 0.38} y1={pl - halfThickness} x2={-padL * 0.38} y2={pl} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={-padL * 0.50} y1={pl - halfThickness} x2={34} y2={pl - halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={-padL * 0.50} y1={pl} x2={0} y2={pl} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <text x={-padL * 0.62} y={pl - halfThickness / 2 + fSizeSm * 0.35} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">{halfThickness}</text>
              </g>
            ) : (
              <g>
                {/* Perforaciones Tornillo Soberbio Spax Ø5 */}
                {[halfThickness, pl - halfThickness].map((yPos, i) => (
                  <g key={i}>
                    <circle cx={50} cy={yPos} r={Math.max(5, Math.round(vMax * 0.014))} fill={COLOR_SPAX} stroke="#1e40af" strokeWidth={strokeThin} />
                    <line x1={44} y1={yPos} x2={56} y2={yPos} stroke="#ffffff" strokeWidth={strokeThin} />
                    <line x1={50} y1={yPos - 6} x2={50} y2={yPos + 6} stroke="#ffffff" strokeWidth={strokeThin} />
                    <circle cx={pw - 50} cy={yPos} r={Math.max(5, Math.round(vMax * 0.014))} fill={COLOR_SPAX} stroke="#1e40af" strokeWidth={strokeThin} />
                    <line x1={pw - 56} y1={yPos} x2={pw - 44} y2={yPos} stroke="#ffffff" strokeWidth={strokeThin} />
                    <line x1={pw - 50} y1={yPos - 6} x2={pw - 50} y2={yPos + 6} stroke="#ffffff" strokeWidth={strokeThin} />
                  </g>
                ))}
                {/* Cotas Horizontales Perforaciones Tornillos a 50mm */}
                <line x1={0} y1={-padT * 0.38} x2={50} y2={-padT * 0.38} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={0} y1={-padT * 0.50} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={50} y1={-padT * 0.50} x2={50} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <text x={25} y={-padT * 0.38 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">50</text>

                <line x1={pw - 50} y1={-padT * 0.38} x2={pw} y2={-padT * 0.38} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={pw - 50} y1={-padT * 0.50} x2={pw - 50} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={pw} y1={-padT * 0.50} x2={pw} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <text x={pw - 25} y={-padT * 0.38 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">50</text>

                {/* Cotas Verticales Perforaciones Tornillos: halfThickness */}
                <line x1={-padL * 0.38} y1={0} x2={-padL * 0.38} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={-padL * 0.50} y1={0} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={-padL * 0.50} y1={halfThickness} x2={50} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <text x={-padL * 0.62} y={halfThickness / 2 + fSizeSm * 0.35} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">{halfThickness}</text>

                <line x1={-padL * 0.38} y1={pl - halfThickness} x2={-padL * 0.38} y2={pl} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={-padL * 0.50} y1={pl - halfThickness} x2={50} y2={pl - halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={-padL * 0.50} y1={pl} x2={0} y2={pl} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <text x={-padL * 0.62} y={pl - halfThickness / 2 + fSizeSm * 0.35} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">{halfThickness}</text>

                <text x={64} y={halfThickness + fSizeSm * 0.38} fontSize={Math.round(fSizeSm * 0.9)} fill={COLOR_SPAX} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">Ø5</text>
              </g>
            )}

            {/* Rebajes / Destajes CNC para Paso Continuo de Riel Gola (L Superior y C Intermedio) */}
            {((kState.golaSystem === 'aluminum' || kState.golaSystem === 'black') && (cab.type === 'base' || cab.type === 'island')) && (
              <g key="cnc-machining-gola">
                {/* Rebaje Gola L Superior: 58mm alto x 26mm fondo en esquina frontal superior */}
                <rect 
                  x={0} 
                  y={0} 
                  width={26} 
                  height={58} 
                  fill="#fef3c7" 
                  stroke="#d97706" 
                  strokeWidth={strokeMed} 
                  strokeDasharray="4,2" 
                />
                <line x1={0} y1={0} x2={26} y2={58} stroke="#d97706" strokeWidth={strokeThin * 0.7} strokeDasharray="2,2" />
                <line x1={0} y1={58} x2={26} y2={0} stroke="#d97706" strokeWidth={strokeThin * 0.7} strokeDasharray="2,2" />

                {/* Cota fondo de rebaje: 26mm */}
                <line x1={0} y1={58 + 14} x2={26} y2={58 + 14} stroke="#d97706" strokeWidth={strokeThin} />
                <line x1={0} y1={58 + 7} x2={0} y2={58 + 21} stroke="#d97706" strokeWidth={strokeThin} />
                <line x1={26} y1={58 + 7} x2={26} y2={58 + 21} stroke="#d97706" strokeWidth={strokeThin} />
                <text x={13} y={58 + 27} fontSize={Math.round(fSizeSm * 0.8)} fill="#d97706" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">26</text>

                {/* Cota alto de rebaje: 58mm */}
                <line x1={26 + 14} y1={0} x2={26 + 14} y2={58} stroke="#d97706" strokeWidth={strokeThin} />
                <line x1={26 + 7} y1={0} x2={26 + 21} y2={0} stroke="#d97706" strokeWidth={strokeThin} />
                <line x1={26 + 7} y1={58} x2={26 + 21} y2={58} stroke="#d97706" strokeWidth={strokeThin} />
                <text x={26 + 26} y={34} fontSize={Math.round(fSizeSm * 0.8)} fill="#d97706" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="start" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">58</text>

                {/* Etiqueta CNC */}
                <text x={38} y={20} fontSize={Math.round(fSizeSm * 0.7)} fill="#b45309" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">CNC: REBAJE GOLA L 58x26</text>

                {/* Rebaje Gola C Intermedio si corresponde a cajoneras */}
                {(cab.variant === '1_door_1_drawer' || cab.variant === '2_pot_drawers' || cab.variant === '4_drawers' || part.notes?.includes('Gola C')) && (
                  (() => {
                    const golaCY = Math.round(pl * 0.35);
                    return (
                      <g key="cnc-gola-c">
                        <rect 
                          x={0} 
                          y={golaCY - 34} 
                          width={26} 
                          height={68} 
                          fill="#fef3c7" 
                          stroke="#d97706" 
                          strokeWidth={strokeMed} 
                          strokeDasharray="4,2" 
                        />
                        <line x1={0} y1={golaCY - 34} x2={26} y2={golaCY + 34} stroke="#d97706" strokeWidth={strokeThin * 0.7} strokeDasharray="2,2" />
                        <line x1={0} y1={golaCY + 34} x2={26} y2={golaCY - 34} stroke="#d97706" strokeWidth={strokeThin * 0.7} strokeDasharray="2,2" />

                        {/* Cota alto 68mm */}
                        <line x1={26 + 14} y1={golaCY - 34} x2={26 + 14} y2={golaCY + 34} stroke="#d97706" strokeWidth={strokeThin} />
                        <line x1={26 + 7} y1={golaCY - 34} x2={26 + 21} y2={golaCY - 34} stroke="#d97706" strokeWidth={strokeThin} />
                        <line x1={26 + 7} y1={golaCY + 34} x2={26 + 21} y2={golaCY + 34} stroke="#d97706" strokeWidth={strokeThin} />
                        <text x={26 + 26} y={golaCY + 6} fontSize={Math.round(fSizeSm * 0.8)} fill="#d97706" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="start" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">68</text>

                        {/* Etiqueta CNC */}
                        <text x={38} y={golaCY - 16} fontSize={Math.round(fSizeSm * 0.7)} fill="#b45309" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">CNC: REBAJE GOLA C 68x26</text>
                      </g>
                    );
                  })()
                )}
              </g>
            )}

            {/* Perforaciones para Soportes de Repisas Regulables (Pitones Ø5mm) con Evasión Anti-Colisión */}
            {isCabinetWithDoors(cab) && (() => {
              const shelfElevations = getResolvedCabinetShelfElevations(cab, state.thickness);
              if (!shelfElevations || shelfElevations.length === 0) return null;

              const xFrontHole = 37;
              const xRearHole = Math.max(xFrontHole + 120, pw - 50);

              return (
                <g key="shelf-support-drilling">
                  {shelfElevations.map((elev, sIdx) => {
                    const elevMm = Math.round(elev * 10);
                    const yHole = pl - elevMm;
                    if (yHole <= 30 || yHole >= pl - 30) return null;

                    return (
                      <g key={`shelf-hole-${sIdx}`}>
                        {/* Línea de eje horizontal de apoyo */}
                        <line 
                          x1={xFrontHole - 12} 
                          y1={yHole} 
                          x2={xRearHole + 12} 
                          y2={yHole} 
                          stroke="#0284c7" 
                          strokeWidth={strokeThin * 0.75} 
                          strokeDasharray="4,2" 
                        />

                        {/* Perforación Frontal Ø5 */}
                        <circle 
                          cx={xFrontHole} 
                          cy={yHole} 
                          r={Math.max(4.5, Math.round(vMax * 0.012))} 
                          fill="#0284c7" 
                          stroke="#0369a1" 
                          strokeWidth={strokeThin} 
                        />
                        <line x1={xFrontHole - 5} y1={yHole} x2={xFrontHole + 5} y2={yHole} stroke="#ffffff" strokeWidth={strokeThin} />
                        <line x1={xFrontHole} y1={yHole - 5} x2={xFrontHole} y2={yHole + 5} stroke="#ffffff" strokeWidth={strokeThin} />

                        {/* Perforación Trasera Ø5 */}
                        <circle 
                          cx={xRearHole} 
                          cy={yHole} 
                          r={Math.max(4.5, Math.round(vMax * 0.012))} 
                          fill="#0284c7" 
                          stroke="#0369a1" 
                          strokeWidth={strokeThin} 
                        />
                        <line x1={xRearHole - 5} y1={yHole} x2={xRearHole + 5} y2={yHole} stroke="#ffffff" strokeWidth={strokeThin} />
                        <line x1={xRearHole} y1={yHole - 5} x2={xRearHole} y2={yHole + 5} stroke="#ffffff" strokeWidth={strokeThin} />

                        {/* Etiqueta Técnica de Mecanizado */}
                        <text 
                          x={(xFrontHole + xRearHole) / 2} 
                          y={yHole - 6} 
                          fontSize={Math.round(fSizeSm * 0.72)} 
                          fill="#0284c7" 
                          stroke="#ffffff" 
                          strokeWidth={haloWidth} 
                          paintOrder="stroke fill" 
                          strokeLinejoin="round" 
                          textAnchor="middle" 
                          fontWeight="900" 
                          fontFamily="monospace" 
                          textRendering="geometricPrecision"
                        >
                          {isCabinetWithSplitDoors(cab) 
                            ? (elevMm <= 700 ? `2x Ø5 SOP. REPISA INF (H=${elevMm})` : `2x Ø5 SOP. REPISA SUP (H=${elevMm})`)
                            : `2x Ø5 SOPORTE REPISA (H=${elevMm})`}
                        </text>

                        {/* Cota vertical de elevación desde base */}
                        <line x1={xRearHole + 20} y1={pl} x2={xRearHole + 20} y2={yHole} stroke="#0284c7" strokeWidth={strokeThin * 0.7} strokeDasharray="2,2" />
                        <text 
                          x={xRearHole + 24} 
                          y={yHole + Math.round(fSizeSm * 0.3)} 
                          fontSize={Math.round(fSizeSm * 0.65)} 
                          fill="#0369a1" 
                          stroke="#ffffff" 
                          strokeWidth={haloWidth} 
                          paintOrder="stroke fill" 
                          strokeLinejoin="round" 
                          textAnchor="start" 
                          fontWeight="900" 
                          fontFamily="monospace" 
                          textRendering="geometricPrecision"
                        >
                          H={elevMm}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })()}
          </g>
        )}

        {/* Perforaciones en Piso / Techo / Barra de Amarre / Repisa */}
        {(isPiso || isTecho || isBarraAmarre || isRepisa) && (
          <g key="machining-horizontal">
            {isNarrowPiece ? (
              // PIEZA ESTRECHA (Barra de amarre pw <= 280mm): 1 solo conjunto de ensamble sin solapamiento
              isMinifix ? (
                <>
                  {[halfThickness, pl - halfThickness].map((yPos, i) => (
                    <g key={i}>
                      <circle cx={34} cy={yPos} r={Math.max(6, Math.round(vMax * 0.016))} fill="none" stroke={COLOR_MINIFIX} strokeWidth={strokeMed} strokeDasharray="3,2" />
                      <circle cx={34} cy={yPos} r={Math.max(3, Math.round(vMax * 0.008))} fill={COLOR_MINIFIX} />
                      {pw >= 85 && (
                        <circle cx={66} cy={yPos} r={Math.max(4.5, Math.round(vMax * 0.012))} fill={COLOR_TARUGO} stroke="#991b1b" strokeWidth={strokeThin} />
                      )}
                    </g>
                  ))}
                  {/* Cota Tier 1: 34mm */}
                  <line x1={0} y1={-padT * 0.36} x2={34} y2={-padT * 0.36} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={0} y1={-padT * 0.48} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={34} y1={-padT * 0.48} x2={34} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <text x={17} y={-padT * 0.36 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">34</text>

                  {/* Cota Tier 2: 32mm al tarugo si la pieza tiene al menos 85mm de ancho */}
                  {pw >= 85 && (
                    <>
                      <line x1={34} y1={-padT * 0.72} x2={66} y2={-padT * 0.72} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                      <line x1={34} y1={-padT * 0.84} x2={34} y2={-padT * 0.36} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                      <line x1={66} y1={-padT * 0.84} x2={66} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                      <text x={50} y={-padT * 0.72 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">32</text>
                    </>
                  )}

                  {/* Cota vertical 9.5mm a centro Minifix */}
                  <line x1={-padL * 0.38} y1={0} x2={-padL * 0.38} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={-padL * 0.50} y1={0} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={-padL * 0.50} y1={halfThickness} x2={34} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <text x={-padL * 0.62} y={halfThickness / 2 + fSizeSm * 0.35} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">{halfThickness}</text>
                  <text x={isNarrowPiece ? pw - 4 : 46} y={halfThickness + fSizeSm * 0.38} fontSize={Math.round(fSizeSm * 0.85)} fill={COLOR_MINIFIX} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" fontWeight="900" fontFamily="monospace" textAnchor={isNarrowPiece ? "end" : "start"} textRendering="geometricPrecision">Ø15</text>
                </>
              ) : (
                <>
                  {/* Spax en barra estrecha: 1 solo tornillo centrado a pw/2 */}
                  {[halfThickness, pl - halfThickness].map((yPos, i) => (
                    <g key={i}>
                      <circle cx={pw / 2} cy={yPos} r={Math.max(4.5, Math.round(vMax * 0.012))} fill={COLOR_SPAX} stroke="#1e40af" strokeWidth={strokeThin} />
                      <line x1={pw / 2 - 5} y1={yPos} x2={pw / 2 + 5} y2={yPos} stroke="#ffffff" strokeWidth={strokeThin} />
                      <line x1={pw / 2} y1={yPos - 5} x2={pw / 2} y2={yPos + 5} stroke="#ffffff" strokeWidth={strokeThin} />
                    </g>
                  ))}
                  <line x1={0} y1={-padT * 0.38} x2={pw / 2} y2={-padT * 0.38} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={0} y1={-padT * 0.50} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={pw / 2} y1={-padT * 0.50} x2={pw / 2} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <text x={pw / 4} y={-padT * 0.38 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">{Math.round(pw / 2)}</text>
                </>
              )
            ) : (
              // PIEZA ANCHA (Piso, Techo, Repisa pw > 280mm): Ensamble frontal y trasero
              isMinifix ? (
                <>
                  {[halfThickness, pl - halfThickness].map((yPos, i) => (
                    <g key={i}>
                      <circle cx={34} cy={yPos} r={Math.max(6, Math.round(vMax * 0.016))} fill="none" stroke={COLOR_MINIFIX} strokeWidth={strokeMed} strokeDasharray="3,2" />
                      <circle cx={34} cy={yPos} r={Math.max(3, Math.round(vMax * 0.008))} fill={COLOR_MINIFIX} />
                      <circle cx={66} cy={yPos} r={Math.max(4.5, Math.round(vMax * 0.012))} fill={COLOR_TARUGO} stroke="#991b1b" strokeWidth={strokeThin} />
                      <circle cx={pw - 50} cy={yPos} r={Math.max(6, Math.round(vMax * 0.016))} fill="none" stroke={COLOR_MINIFIX} strokeWidth={strokeMed} strokeDasharray="3,2" />
                      <circle cx={pw - 50} cy={yPos} r={Math.max(3, Math.round(vMax * 0.008))} fill={COLOR_MINIFIX} />
                      <circle cx={pw - 82} cy={yPos} r={Math.max(4.5, Math.round(vMax * 0.012))} fill={COLOR_TARUGO} stroke="#991b1b" strokeWidth={strokeThin} />
                    </g>
                  ))}
                  {/* Frontal: 34 y 32 */}
                  <line x1={0} y1={-padT * 0.36} x2={34} y2={-padT * 0.36} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={0} y1={-padT * 0.48} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={34} y1={-padT * 0.48} x2={34} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <text x={17} y={-padT * 0.36 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">34</text>

                  <line x1={34} y1={-padT * 0.72} x2={66} y2={-padT * 0.72} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={34} y1={-padT * 0.84} x2={34} y2={-padT * 0.36} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={66} y1={-padT * 0.84} x2={66} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <text x={50} y={-padT * 0.72 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">32</text>

                  {/* Trasero: 50 y 32 */}
                  <line x1={pw - 50} y1={-padT * 0.36} x2={pw} y2={-padT * 0.36} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={pw - 50} y1={-padT * 0.48} x2={pw - 50} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={pw} y1={-padT * 0.48} x2={pw} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <text x={pw - 25} y={-padT * 0.36 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">50</text>

                  {/* Cota vertical 9.5mm a centro Minifix */}
                  <line x1={-padL * 0.38} y1={0} x2={-padL * 0.38} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={-padL * 0.50} y1={0} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={-padL * 0.50} y1={halfThickness} x2={34} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <text x={-padL * 0.62} y={halfThickness / 2 + fSizeSm * 0.35} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">{halfThickness}</text>
                  <text x={46} y={halfThickness + fSizeSm * 0.38} fontSize={Math.round(fSizeSm * 0.9)} fill={COLOR_MINIFIX} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">Ø15</text>
                </>
              ) : (
                <>
                  {[halfThickness, pl - halfThickness].map((yPos, i) => (
                    <g key={i}>
                      <circle cx={50} cy={yPos} r={Math.max(4.5, Math.round(vMax * 0.012))} fill={COLOR_SPAX} stroke="#1e40af" strokeWidth={strokeThin} />
                      <circle cx={pw - 50} cy={yPos} r={Math.max(4.5, Math.round(vMax * 0.012))} fill={COLOR_SPAX} stroke="#1e40af" strokeWidth={strokeThin} />
                    </g>
                  ))}
                  <line x1={0} y1={-padT * 0.38} x2={50} y2={-padT * 0.38} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={0} y1={-padT * 0.50} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={50} y1={-padT * 0.50} x2={50} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <text x={25} y={-padT * 0.38 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">50</text>

                  <line x1={pw - 50} y1={-padT * 0.38} x2={pw} y2={-padT * 0.38} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={pw - 50} y1={-padT * 0.50} x2={pw - 50} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={pw} y1={-padT * 0.50} x2={pw} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <text x={pw - 25} y={-padT * 0.38 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">50</text>
                </>
              )
            )}
          </g>
        )}

        {/* Cazoletas de Bisagra en Puertas */}
        {isPuerta && (
          <g key="machining-door">
            {[90, pl - 90].map((hy, idx) => (
              <g key={idx}>
                <circle cx={22.5} cy={hy} r={Math.max(16, Math.round(vMax * 0.040))} fill="none" stroke="#ea580c" strokeWidth={strokeMed} strokeDasharray="3,2" />
                <circle cx={22.5} cy={hy} r={Math.max(3.5, Math.round(vMax * 0.010))} fill="#ea580c" />
                <line x1={12} y1={hy} x2={33} y2={hy} stroke="#ea580c" strokeWidth={strokeThin} />
                <line x1={22.5} y1={hy - 10} x2={22.5} y2={hy + 10} stroke="#ea580c" strokeWidth={strokeThin} />
                <text x={48} y={hy + fSizeSm * 0.35} fontSize={fSizeSm} fill="#ea580c" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">Ø35</text>
              </g>
            ))}
            {/* Cota horizontal eje a 22.5mm */}
            <line x1={0} y1={90 - 32} x2={22.5} y2={90 - 32} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={0} y1={90 - 40} x2={0} y2={90} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={22.5} y1={90 - 40} x2={22.5} y2={90} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <text x={11.25} y={90 - 35} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">22.5</text>

            {/* Cotas verticales eje a 90mm de extremos */}
            <line x1={-padL * 0.40} y1={0} x2={-padL * 0.40} y2={90} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={-padL * 0.52} y1={0} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={-padL * 0.52} y1={90} x2={22.5} y2={90} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <text x={-padL * 0.65} y={45} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision" transform={`rotate(-90 -${padL * 0.65} 45)`}>90</text>

            <line x1={-padL * 0.40} y1={pl - 90} x2={-padL * 0.40} y2={pl} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={-padL * 0.52} y1={pl - 90} x2={22.5} y2={pl - 90} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={-padL * 0.52} y1={pl} x2={0} y2={pl} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <text x={-padL * 0.65} y={pl - 45} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision" transform={`rotate(-90 -${padL * 0.65} ${pl - 45})`}>90</text>

            {/* Perforaciones de Tirador en Puerta (lado opuesto a bisagras - Cotas limpias sin colisión) */}
            {(() => {
              const hConf = kState.handleConfig;
              const isGola = kState.golaSystem !== 'none';
              if (isGola || !hConf || hConf.model === 'none') return null;

              const isSingleHole = hConf.model === 'balin' || hConf.model === 'berlin';
              const isRearPestana = hConf.model === 'ce' || hConf.model === 'oslo';
              const handleX = pw - 45;
              const handleCenterY = 70;

              if (isRearPestana) {
                return (
                  <g key="door-handle-pestana">
                    <line x1={pw - 120} y1={6} x2={pw} y2={6} stroke="#2563eb" strokeWidth={strokeMed} strokeDasharray="4,2" />
                    <text x={pw - 60} y={24} fontSize={Math.round(fSizeSm * 0.8)} fill="#2563eb" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" textAnchor="middle" fontWeight="bold">Tirador Pestaña Trasero</text>
                  </g>
                );
              }

              if (isSingleHole) {
                return (
                  <g key="door-handle-single">
                    <circle cx={handleX} cy={handleCenterY} r={Math.max(4.5, Math.round(vMax * 0.012))} fill="#2563eb" stroke="#1d4ed8" strokeWidth={strokeThin} />
                    <line x1={handleX - 8} y1={handleCenterY} x2={handleX + 8} y2={handleCenterY} stroke="#1d4ed8" strokeWidth={strokeThin} />
                    <line x1={handleX} y1={handleCenterY - 8} x2={handleX} y2={handleCenterY + 8} stroke="#1d4ed8" strokeWidth={strokeThin} />
                    {/* Cota horizontal 45mm hacia el canto */}
                    <line x1={handleX} y1={handleCenterY - 18} x2={pw} y2={handleCenterY - 18} stroke="#2563eb" strokeWidth={strokeThin} />
                    <line x1={handleX} y1={handleCenterY - 24} x2={handleX} y2={handleCenterY - 12} stroke="#2563eb" strokeWidth={strokeThin} />
                    <line x1={pw} y1={handleCenterY - 24} x2={pw} y2={handleCenterY - 12} stroke="#2563eb" strokeWidth={strokeThin} />
                    <text x={handleX + 22.5} y={handleCenterY - 22} fontSize={Math.round(fSizeSm * 0.85)} fill="#2563eb" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" textAnchor="middle" fontWeight="bold">45</text>
                    {/* Cota vertical 70mm interior (sin invadir el exterior derecho) */}
                    <line x1={handleX - 25} y1={0} x2={handleX - 25} y2={handleCenterY} stroke="#2563eb" strokeWidth={strokeThin} />
                    <line x1={handleX - 30} y1={0} x2={pw} y2={0} stroke="#2563eb" strokeWidth={strokeThin} />
                    <line x1={handleX - 30} y1={handleCenterY} x2={handleX} y2={handleCenterY} stroke="#2563eb" strokeWidth={strokeThin} />
                    <text x={handleX - 32} y={38} fontSize={Math.round(fSizeSm * 0.85)} fill="#2563eb" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" textAnchor="end" fontWeight="bold">70</text>
                    {/* Etiqueta hacia el interior */}
                    <text x={handleX - 10} y={handleCenterY + 20} fontSize={Math.round(fSizeSm * 0.8)} fill="#2563eb" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" textAnchor="end" fontWeight="bold">Ø4.5 Pomo</text>
                  </g>
                );
              }

              const hLen = hConf.lengthMm || 128;
              const y1 = handleCenterY;
              const y2 = handleCenterY + hLen;
              const cotaX = handleX - 25;
              const cotaY70X = handleX - 48;

              return (
                <g key="door-handle-double">
                  {/* Taladros Pasantes Ø4.5 */}
                  <circle cx={handleX} cy={y1} r={Math.max(4.5, Math.round(vMax * 0.012))} fill="#2563eb" stroke="#1d4ed8" strokeWidth={strokeThin} />
                  <circle cx={handleX} cy={y2} r={Math.max(4.5, Math.round(vMax * 0.012))} fill="#2563eb" stroke="#1d4ed8" strokeWidth={strokeThin} />
                  {/* Cruz de centro */}
                  <line x1={handleX - 6} y1={y1} x2={handleX + 6} y2={y1} stroke="#1d4ed8" strokeWidth={strokeThin} />
                  <line x1={handleX} y1={y1 - 6} x2={handleX} y2={y1 + 6} stroke="#1d4ed8" strokeWidth={strokeThin} />
                  <line x1={handleX - 6} y1={y2} x2={handleX + 6} y2={y2} stroke="#1d4ed8" strokeWidth={strokeThin} />
                  <line x1={handleX} y1={y2 - 6} x2={handleX} y2={y2 + 6} stroke="#1d4ed8" strokeWidth={strokeThin} />
                  <line x1={handleX} y1={y1} x2={handleX} y2={y2} stroke="#2563eb" strokeWidth={strokeThin} strokeDasharray="3,2" />

                  {/* Cota entre ejes de tirador hacia el INTERIOR (despejada de bordes y cotas exteriores) */}
                  <line x1={cotaX} y1={y1} x2={cotaX} y2={y2} stroke="#2563eb" strokeWidth={strokeThin} />
                  <line x1={cotaX - 5} y1={y1} x2={handleX} y2={y1} stroke="#2563eb" strokeWidth={strokeThin} />
                  <line x1={cotaX - 5} y1={y2} x2={handleX} y2={y2} stroke="#2563eb" strokeWidth={strokeThin} />
                  <text x={cotaX - 7} y={(y1 + y2) / 2 + 4} fontSize={Math.round(fSizeSm * 0.9)} fill="#2563eb" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" textAnchor="end" fontWeight="900" fontFamily="monospace">{hLen}</text>

                  {/* Cota horizontal 45mm superior */}
                  <line x1={handleX} y1={y1 - 18} x2={pw} y2={y1 - 18} stroke="#2563eb" strokeWidth={strokeThin} />
                  <line x1={handleX} y1={y1 - 24} x2={handleX} y2={y1 - 12} stroke="#2563eb" strokeWidth={strokeThin} />
                  <line x1={pw} y1={y1 - 24} x2={pw} y2={y1 - 12} stroke="#2563eb" strokeWidth={strokeThin} />
                  <text x={handleX + 22.5} y={y1 - 22} fontSize={Math.round(fSizeSm * 0.85)} fill="#2563eb" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" textAnchor="middle" fontWeight="bold">45</text>

                  {/* Cota vertical 70mm al canto superior (interna) */}
                  <line x1={cotaY70X} y1={0} x2={cotaY70X} y2={y1} stroke="#2563eb" strokeWidth={strokeThin} />
                  <line x1={cotaY70X - 5} y1={0} x2={pw} y2={0} stroke="#2563eb" strokeWidth={strokeThin} />
                  <line x1={cotaY70X - 5} y1={y1} x2={cotaX} y2={y1} stroke="#2563eb" strokeWidth={strokeThin} />
                  <text x={cotaY70X - 7} y={38} fontSize={Math.round(fSizeSm * 0.85)} fill="#2563eb" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" textAnchor="end" fontWeight="bold">70</text>

                  {/* Etiqueta técnica orientada al interior para evitar desborde */}
                  <text x={handleX - 10} y={y2 + 22} fontSize={Math.round(fSizeSm * 0.8)} fill="#2563eb" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" textAnchor="end" fontWeight="bold">2x Ø4.5 Tirador</text>
                </g>
              );
            })()}
          </g>
        )}

        {/* Frentes de Cajón: Perforaciones de fijación y tirador */}
        {isFrenteCajon && (
          <g key="machining-frente-cajon">
            {/* Ejes de fijación caja cajón a 15mm */}
            <line x1={15} y1={0} x2={15} y2={pl} stroke={COLOR_DETALLE} strokeWidth={strokeThin} strokeDasharray="4,2" />
            <line x1={pw - 15} y1={0} x2={pw - 15} y2={pl} stroke={COLOR_DETALLE} strokeWidth={strokeThin} strokeDasharray="4,2" />
            <circle cx={15} cy={35} r={Math.max(4, Math.round(vMax * 0.012))} fill={COLOR_SPAX} />
            <circle cx={15} cy={pl - 35} r={Math.max(4, Math.round(vMax * 0.012))} fill={COLOR_SPAX} />
            <circle cx={pw - 15} cy={35} r={Math.max(4, Math.round(vMax * 0.012))} fill={COLOR_SPAX} />
            <circle cx={pw - 15} cy={pl - 35} r={Math.max(4, Math.round(vMax * 0.012))} fill={COLOR_SPAX} />

            {/* Cota horizontal 15mm superior izquierda */}
            <line x1={0} y1={-padT * 0.38} x2={15} y2={-padT * 0.38} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={0} y1={-padT * 0.50} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={15} y1={-padT * 0.50} x2={15} y2={35} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <text x={7.5} y={-padT * 0.38 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">15</text>

            {/* Cota horizontal 15mm superior derecha */}
            <line x1={pw - 15} y1={-padT * 0.38} x2={pw} y2={-padT * 0.38} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={pw - 15} y1={-padT * 0.50} x2={pw - 15} y2={35} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={pw} y1={-padT * 0.50} x2={pw} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <text x={pw - 7.5} y={-padT * 0.38 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">15</text>

            {/* Cota vertical 35mm a tornillo */}
            <line x1={-padL * 0.38} y1={0} x2={-padL * 0.38} y2={35} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={-padL * 0.50} y1={0} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={-padL * 0.50} y1={35} x2={15} y2={35} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <text x={-padL * 0.62} y={18 + fSizeSm * 0.35} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">35</text>

            {/* Perforaciones de Tirador Paramétrico */}
            {(() => {
              const hConf = kState.handleConfig;
              const isGola = kState.golaSystem !== 'none';
              if (isGola || !hConf || hConf.model === 'none') return null;

              const isSingleHole = hConf.model === 'balin' || hConf.model === 'berlin';
              const isRearPestana = hConf.model === 'ce' || hConf.model === 'oslo';
              const cy = pl / 2;

              if (isRearPestana) {
                return (
                  <g key="cajon-handle-pestana">
                    <line x1={pw / 2 - 100} y1={6} x2={pw / 2 + 100} y2={6} stroke="#2563eb" strokeWidth={strokeMed} strokeDasharray="4,2" />
                    <text x={pw / 2} y={22} fontSize={Math.round(fSizeSm * 0.8)} fill="#2563eb" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" textAnchor="middle" fontWeight="bold">Tirador Pestaña Superior</text>
                  </g>
                );
              }

              if (isSingleHole) {
                return (
                  <g key="cajon-handle-single">
                    <circle cx={pw / 2} cy={cy} r={Math.max(4.5, Math.round(vMax * 0.012))} fill="#2563eb" stroke="#1d4ed8" strokeWidth={strokeThin} />
                    <line x1={pw / 2 - 8} y1={cy} x2={pw / 2 + 8} y2={cy} stroke="#1d4ed8" strokeWidth={strokeThin} />
                    <line x1={pw / 2} y1={cy - 8} x2={pw / 2 + 8} y2={cy} stroke="#1d4ed8" strokeWidth={strokeThin} />
                    <text x={pw / 2} y={cy + 18} fontSize={Math.round(fSizeSm * 0.85)} fill="#2563eb" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" textAnchor="middle" fontWeight="bold">Ø4.5 Tirador Botón</text>
                  </g>
                );
              }

              const hLen = hConf.lengthMm || 128;
              if (pw < hLen + 40) return null;

              const cx1 = pw / 2 - hLen / 2;
              const cx2 = pw / 2 + hLen / 2;

              return (
                <g key="cajon-handle-double">
                  <circle cx={cx1} cy={cy} r={Math.max(4.5, Math.round(vMax * 0.012))} fill="#2563eb" stroke="#1d4ed8" strokeWidth={strokeThin} />
                  <circle cx={cx2} cy={cy} r={Math.max(4.5, Math.round(vMax * 0.012))} fill="#2563eb" stroke="#1d4ed8" strokeWidth={strokeThin} />
                  <line x1={cx1} y1={cy} x2={cx2} y2={cy} stroke="#2563eb" strokeWidth={strokeThin} strokeDasharray="4,2" />
                  {/* Cota horizontal entre centros */}
                  <line x1={cx1} y1={cy - 18} x2={cx2} y2={cy - 18} stroke="#2563eb" strokeWidth={strokeThin} />
                  <line x1={cx1} y1={cy - 24} x2={cx1} y2={cx1} stroke="#2563eb" strokeWidth={strokeThin} />
                  <line x1={cx2} y1={cy - 24} x2={cx2} y2={cy} stroke="#2563eb" strokeWidth={strokeThin} />
                  <text x={pw / 2} y={cy - 22} fontSize={Math.round(fSizeSm * 0.85)} fill="#2563eb" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" textAnchor="middle" fontWeight="900" fontFamily="monospace">{hLen}</text>
                  <text x={pw / 2} y={cy + 18} fontSize={Math.round(fSizeSm * 0.8)} fill="#2563eb" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" textAnchor="middle" fontWeight="bold">2x Ø4.5 Tirador ({hLen}mm)</text>
                </g>
              );
            })()}
          </g>
        )}

        {/* Laterales de Cajón: Perforaciones para corredera y ensamble */}
        {isLateralCajon && (
          <g key="machining-lateral-cajon">
            {/* Eje corredera a 25mm del fondo */}
            <line x1={0} y1={pl - 25} x2={pw} y2={pl - 25} stroke={COLOR_DETALLE} strokeWidth={strokeThin} strokeDasharray="4,2" />
            <circle cx={37} cy={pl - 25} r={Math.max(4, Math.round(vMax * 0.012))} fill={COLOR_SPAX} />
            <circle cx={pw - 37} cy={pl - 25} r={Math.max(4, Math.round(vMax * 0.012))} fill={COLOR_SPAX} />

            {/* Cota horizontal 37mm */}
            <line x1={0} y1={-padT * 0.38} x2={37} y2={-padT * 0.38} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={0} y1={-padT * 0.50} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={37} y1={-padT * 0.50} x2={37} y2={pl - 25} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <text x={18.5} y={-padT * 0.38 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">37</text>

            {/* Cota vertical 25mm eje corredera */}
            <line x1={-padL * 0.38} y1={pl - 25} x2={-padL * 0.38} y2={pl} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={-padL * 0.50} y1={pl - 25} x2={37} y2={pl - 25} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={-padL * 0.50} y1={pl} x2={0} y2={pl} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <text x={-padL * 0.62} y={pl - 12 + fSizeSm * 0.35} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">25</text>
            <text x={pw / 2} y={pl - 32} fontSize={Math.round(fSizeSm * 0.85)} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">Eje Corredera Ø4</text>
          </g>
        )}
      </svg>
    );
  };

  /**
   * Renderizado Paramétrico de las 3 Vistas Ortogonales del Módulo (Planta, Frontal, Lateral)
   * 100% Vectorial SVG con cotas magenta arquitectónicas y líneas de extensión sin cortes.
   */
  const renderCabinetOrthographicViews = (cab: CabinetType) => {
    const cabW = Math.round(cab.width * 10);
    const cabD = Math.round(cab.depth * 10);
    const cabH = Math.round(cab.height * 10);

    const legsH = cab.type === 'base' ? 150 : 0;
    const bodyH = cabH - legsH;

    // VISTA DE PLANTA: cotas en TOP (Ancho) y RIGHT (Profundidad)
    const baseDimP = Math.max(cabW, cabD, 400);
    const padLeftP = Math.max(25, Math.round(cabW * 0.05));
    const padTopP = Math.max(75, Math.round(cabD * 0.16));
    const padRightP = Math.max(130, Math.round(cabW * 0.22));
    const padBottomP = Math.max(25, Math.round(cabD * 0.05));
    const fSizeP = Math.max(28, Math.round(baseDimP * 0.075));
    const strokeP = Math.max(1.5, baseDimP * 0.0035);

    // VISTA FRONTAL: cotas en TOP (Ancho) y LEFT (Alto)
    const baseDimF = Math.max(cabW, cabH, 400);
    const padLeftF = Math.max(150, Math.round(cabH * 0.22));
    const padTopF = Math.max(75, Math.round(cabW * 0.14));
    const padRightF = Math.max(25, Math.round(cabW * 0.04));
    const padBottomF = Math.max(30, Math.round(cabH * 0.05));
    const fSizeF = Math.max(30, Math.round(baseDimF * 0.075));
    const strokeF = Math.max(1.5, baseDimF * 0.0035);

    // VISTA LATERAL: cotas en TOP (Profundidad) y RIGHT (Alto) - Evita colisión en zona media
    const baseDimL = Math.max(cabD, cabH, 400);
    const padLeftL = Math.max(25, Math.round(cabD * 0.04));
    const padTopL = Math.max(75, Math.round(cabD * 0.14));
    const padRightL = Math.max(150, Math.round(cabH * 0.22));
    const padBottomL = Math.max(30, Math.round(cabH * 0.05));
    const fSizeL = Math.max(30, Math.round(baseDimL * 0.075));
    const strokeL = Math.max(1.5, baseDimL * 0.0035);

    const COLOR_MAGENTA = "#d946ef";

    const isBaseGola = (kState.golaSystem === 'aluminum' || kState.golaSystem === 'black') && (cab.type === 'base' || cab.type === 'island');
    const hasGolaC = isBaseGola && (cab.variant === '1_door_1_drawer' || cab.variant === '2_pot_drawers' || cab.variant === '4_drawers');
    const golaCY_lat = Math.round(bodyH * 0.35);
    const golaColorHex = kState.golaSystem === 'black' ? '#18181b' : '#94a3b8';

    return (
      <div className="flex flex-col justify-between items-center w-full h-full py-2 gap-4">
        {/* VISTA DE PLANTA */}
        <div className="flex flex-col items-center w-full">
          <div className="text-xs font-black tracking-widest text-slate-800 mb-1.5 uppercase">
            VISTA DE PLANTA
          </div>
          <svg 
            viewBox={`-${padLeftP} -${padTopP} ${cabW + padLeftP + padRightP} ${cabD + padTopP + padBottomP}`}
            className="w-full h-[240px] max-h-[260px] overflow-visible"
            preserveAspectRatio="xMidYMid meet"
          >
            <rect x={0} y={0} width={cabW} height={cabD} fill="#f8fafc" stroke="#0f172a" strokeWidth={strokeP * 1.5} />
            <line x1={0} y1={0} x2={cabW} y2={cabD} stroke="#94a3b8" strokeWidth={strokeP * 0.6} strokeDasharray="4,4" />
            <line x1={0} y1={cabD} x2={cabW} y2={0} stroke="#94a3b8" strokeWidth={strokeP * 0.6} strokeDasharray="4,4" />

            {/* Riel Gola en Vista de Planta (Paso de lado a lado continuo) */}
            {isBaseGola && (
              <g>
                <rect x={0} y={cabD - 26} width={cabW} height={26} fill={golaColorHex} opacity={0.65} stroke="#0f172a" strokeWidth={strokeP * 0.8} />
                <text x={cabW / 2} y={cabD - 10} fontSize={Math.max(13, fSizeP * 0.4)} fill={kState.golaSystem === 'black' ? '#ffffff' : '#0f172a'} fontWeight="bold" textAnchor="middle" fontFamily="monospace">CANAL GOLA CONTINUO</text>
              </g>
            )}
            
            {/* Cota Ancho Superior */}
            <line x1={0} y1={-padTopP * 0.42} x2={cabW} y2={-padTopP * 0.42} stroke={COLOR_MAGENTA} strokeWidth={strokeP} />
            <line x1={0} y1={-padTopP * 0.52} x2={0} y2={0} stroke={COLOR_MAGENTA} strokeWidth={strokeP * 0.8} />
            <line x1={cabW} y1={-padTopP * 0.52} x2={cabW} y2={0} stroke={COLOR_MAGENTA} strokeWidth={strokeP * 0.8} />
            <line x1={-5} y1={-padTopP * 0.42 + 5} x2={5} y2={-padTopP * 0.42 - 5} stroke={COLOR_MAGENTA} strokeWidth={strokeP * 1.6} />
            <line x1={cabW - 5} y1={-padTopP * 0.42 + 5} x2={cabW + 5} y2={-padTopP * 0.42 - 5} stroke={COLOR_MAGENTA} strokeWidth={strokeP * 1.6} />
            <text 
              x={cabW / 2} 
              y={-padTopP * 0.42 - 8} 
              fontSize={fSizeP} 
              fill={COLOR_MAGENTA} 
              stroke="#ffffff"
              strokeWidth={strokeP * 2}
              paintOrder="stroke fill"
              strokeLinejoin="round"
              fontWeight="900" 
              fontFamily="monospace" 
              textAnchor="middle"
              textRendering="geometricPrecision"
            >
              {cabW} mm
            </text>
            
            {/* Cota Profundidad Derecha */}
            <line x1={cabW + padRightP * 0.42} y1={0} x2={cabW + padRightP * 0.42} y2={cabD} stroke={COLOR_MAGENTA} strokeWidth={strokeP} />
            <line x1={cabW} y1={0} x2={cabW + padRightP * 0.52} y2={0} stroke={COLOR_MAGENTA} strokeWidth={strokeP * 0.8} />
            <line x1={cabW} y1={cabD} x2={cabW + padRightP * 0.52} y2={cabD} stroke={COLOR_MAGENTA} strokeWidth={strokeP * 0.8} />
            <line x1={cabW + padRightP * 0.42 - 5} y1={5} x2={cabW + padRightP * 0.42 + 5} y2={-5} stroke={COLOR_MAGENTA} strokeWidth={strokeP * 1.6} />
            <line x1={cabW + padRightP * 0.42 - 5} y1={cabD + 5} x2={cabW + padRightP * 0.42 + 5} y2={cabD - 5} stroke={COLOR_MAGENTA} strokeWidth={strokeP * 1.6} />
            <text 
              x={cabW + padRightP * 0.42 + fSizeP * 0.65 + 4} 
              y={cabD / 2} 
              fontSize={fSizeP} 
              fill={COLOR_MAGENTA} 
              stroke="#ffffff"
              strokeWidth={strokeP * 2}
              paintOrder="stroke fill"
              strokeLinejoin="round"
              fontWeight="900" 
              fontFamily="monospace" 
              textAnchor="middle" 
              textRendering="geometricPrecision"
              transform={`rotate(90 ${cabW + padRightP * 0.42 + fSizeP * 0.65 + 4} ${cabD / 2})`}
            >
              {cabD}
            </text>
          </svg>
        </div>

        {/* VISTAS ELEVACIÓN: FRONTAL Y LATERAL */}
        <div className="flex gap-4 w-full justify-center items-end">
          {/* VISTA FRONTAL */}
          <div className="flex-1 flex flex-col items-center">
            <div className="text-xs font-black tracking-widest text-slate-800 mb-1.5 uppercase">
              VISTA FRONTAL
            </div>
            <svg 
              viewBox={`-${padLeftF} -${padTopF} ${cabW + padLeftF + padRightF} ${cabH + padTopF + padBottomF}`}
              className="w-full h-[300px] max-h-[320px] overflow-visible"
              preserveAspectRatio="xMidYMid meet"
            >
              <rect x={0} y={0} width={cabW} height={bodyH} fill="#ffffff" stroke="#0f172a" strokeWidth={strokeF * 1.5} />
              {/* Perfiles Gola L y Gola C en Vista Frontal */}
              {isBaseGola && (
                <g>
                  <rect x={0} y={0} width={cabW} height={35} fill={golaColorHex} stroke="#0f172a" strokeWidth={strokeF * 0.8} />
                  <text x={cabW / 2} y={23} fontSize={Math.max(14, fSizeF * 0.42)} fill={kState.golaSystem === 'black' ? '#ffffff' : '#0f172a'} fontWeight="bold" textAnchor="middle" fontFamily="monospace">RIEL GOLA L (CONTINUO)</text>
                </g>
              )}
              {hasGolaC && (
                <g>
                  <rect x={0} y={golaCY_lat - 20} width={cabW} height={40} fill={golaColorHex} stroke="#0f172a" strokeWidth={strokeF * 0.8} />
                  <text x={cabW / 2} y={golaCY_lat + 6} fontSize={Math.max(14, fSizeF * 0.42)} fill={kState.golaSystem === 'black' ? '#ffffff' : '#0f172a'} fontWeight="bold" textAnchor="middle" fontFamily="monospace">RIEL GOLA C (CONTINUO)</text>
                </g>
              )}
              {legsH > 0 && (
                <g>
                  <rect x={15} y={bodyH} width={cabW - 30} height={legsH} fill="#e2e8f0" stroke="#475569" strokeWidth={strokeF} />
                  <rect x={35} y={bodyH} width={25} height={legsH} fill="#94a3b8" />
                  <rect x={cabW - 60} y={bodyH} width={25} height={legsH} fill="#94a3b8" />
                  <text x={cabW / 2} y={bodyH + legsH * 0.65} fontSize={Math.max(20, fSizeF * 0.6)} fill="#475569" fontWeight="bold" textAnchor="middle">ZÓCALO H=150</text>
                </g>
              )}
              {cab.variant === '4_drawers' ? (
                Array.from({ length: 4 }).map((_, di) => {
                  const dy = (bodyH / 4) * di;
                  const dh = bodyH / 4;
                  return (
                    <g key={di}>
                      <line x1={0} y1={dy} x2={cabW} y2={dy} stroke="#0f172a" strokeWidth={strokeF * 0.8} />
                      <text x={cabW / 2} y={dy + dh * 0.6} fontSize={Math.max(18, fSizeF * 0.55)} fill="#64748b" textAnchor="middle" fontFamily="monospace">Cajón {di + 1}</text>
                    </g>
                  );
                })
              ) : cab.variant === '2_doors' ? (
                <g>
                  <line x1={cabW / 2} y1={0} x2={cabW / 2} y2={bodyH} stroke="#0f172a" strokeWidth={strokeF} />
                  <path d={`M 0 ${bodyH / 2} L ${cabW / 2} 0 L ${cabW / 2} ${bodyH} Z`} fill="none" stroke="#c026d3" strokeWidth={strokeF * 0.8} strokeDasharray="4,4" />
                  <path d={`M ${cabW} ${bodyH / 2} L ${cabW / 2} 0 L ${cabW / 2} ${bodyH} Z`} fill="none" stroke="#c026d3" strokeWidth={strokeF * 0.8} strokeDasharray="4,4" />
                </g>
              ) : (
                <path d={`M 0 ${bodyH / 2} L ${cabW} 0 L ${cabW} ${bodyH} Z`} fill="none" stroke="#c026d3" strokeWidth={strokeF * 0.8} strokeDasharray="4,4" />
              )}

              {/* Repisas Interiores en Vista Frontal (proyección oculta) */}
              {isCabinetWithDoors(cab) && (() => {
                const shelfElevations = getResolvedCabinetShelfElevations(cab, state.thickness);
                const thickMm = (state.thickness || 1.8) * 10;
                const sideThickMm = (state.thickness || 1.8) * 10;
                return shelfElevations.map((elev, sIdx) => {
                  const elevMm = Math.round(elev * 10);
                  const yShelf = bodyH - elevMm - thickMm / 2;
                  return (
                    <g key={`front-shelf-${sIdx}`}>
                      <line 
                        x1={sideThickMm} 
                        y1={yShelf + thickMm / 2} 
                        x2={cabW - sideThickMm} 
                        y2={yShelf + thickMm / 2} 
                        stroke="#0284c7" 
                        strokeWidth={strokeF * 0.8} 
                        strokeDasharray="4,3" 
                      />
                    </g>
                  );
                });
              })()}

              {/* Cota Ancho Superior */}
              <line x1={0} y1={-padTopF * 0.42} x2={cabW} y2={-padTopF * 0.42} stroke={COLOR_MAGENTA} strokeWidth={strokeF} />
              <line x1={0} y1={-padTopF * 0.52} x2={0} y2={0} stroke={COLOR_MAGENTA} strokeWidth={strokeF * 0.8} />
              <line x1={cabW} y1={-padTopF * 0.52} x2={cabW} y2={0} stroke={COLOR_MAGENTA} strokeWidth={strokeF * 0.8} />
              <line x1={-5} y1={-padTopF * 0.42 + 5} x2={5} y2={-padTopF * 0.42 - 5} stroke={COLOR_MAGENTA} strokeWidth={strokeF * 1.6} />
              <line x1={cabW - 5} y1={-padTopF * 0.42 + 5} x2={cabW + 5} y2={-padTopF * 0.42 - 5} stroke={COLOR_MAGENTA} strokeWidth={strokeF * 1.6} />
              <text 
                x={cabW / 2} 
                y={-padTopF * 0.42 - 8} 
                fontSize={fSizeF} 
                fill={COLOR_MAGENTA} 
                stroke="#ffffff"
                strokeWidth={strokeF * 2}
                paintOrder="stroke fill"
                strokeLinejoin="round"
                fontWeight="900" 
                fontFamily="monospace" 
                textAnchor="middle"
                textRendering="geometricPrecision"
              >
                {cabW}
              </text>
              
              {/* Cota Alto Izquierda (Nunca se corta) */}
              <line x1={-padLeftF * 0.42} y1={0} x2={-padLeftF * 0.42} y2={cabH} stroke={COLOR_MAGENTA} strokeWidth={strokeF} />
              <line x1={-padLeftF * 0.52} y1={0} x2={0} y2={0} stroke={COLOR_MAGENTA} strokeWidth={strokeF * 0.8} />
              <line x1={-padLeftF * 0.52} y1={cabH} x2={0} y2={cabH} stroke={COLOR_MAGENTA} strokeWidth={strokeF * 0.8} />
              <line x1={-padLeftF * 0.42 - 5} y1={5} x2={-padLeftF * 0.42 + 5} y2={-5} stroke={COLOR_MAGENTA} strokeWidth={strokeF * 1.6} />
              <line x1={-padLeftF * 0.42 - 5} y1={cabH + 5} x2={-padLeftF * 0.42 + 5} y2={cabH - 5} stroke={COLOR_MAGENTA} strokeWidth={strokeF * 1.6} />
              <text 
                x={-padLeftF * 0.42 - fSizeF * 0.55 - 4} 
                y={cabH / 2} 
                fontSize={fSizeF} 
                fill={COLOR_MAGENTA} 
                stroke="#ffffff"
                strokeWidth={strokeF * 2}
                paintOrder="stroke fill"
                strokeLinejoin="round"
                fontWeight="900" 
                fontFamily="monospace" 
                textAnchor="middle" 
                textRendering="geometricPrecision"
                transform={`rotate(-90 ${-padLeftF * 0.42 - fSizeF * 0.55 - 4} ${cabH / 2})`}
              >
                {cabH}
              </text>
            </svg>
          </div>

          {/* VISTA LATERAL: Cota de Alto a la derecha para balance simétrico */}
          <div className="flex-1 flex flex-col items-center">
            <div className="text-xs font-black tracking-widest text-slate-800 mb-1.5 uppercase">
              VISTA LATERAL
            </div>
            <svg 
              viewBox={`-${padLeftL} -${padTopL} ${cabD + padLeftL + padRightL} ${cabH + padTopL + padBottomL}`}
              className="w-full h-[300px] max-h-[320px] overflow-visible"
              preserveAspectRatio="xMidYMid meet"
            >
              <rect x={0} y={0} width={cabD} height={bodyH} fill="#ffffff" stroke="#0f172a" strokeWidth={strokeL * 1.5} />
              <rect x={15} y={0} width={4} height={bodyH} fill="#9333ea" />
              <text x={17} y={bodyH / 2} fontSize={Math.max(16, fSizeL * 0.5)} fill="#9333ea" fontWeight="bold" transform={`rotate(-90 17 ${bodyH / 2})`} textAnchor="middle">DUROLAC</text>

              {/* Destaje CNC y Perfil Gola L Superior en Lateral */}
              {isBaseGola && (
                <g>
                  {/* Rebaje CNC 58mm alto x 26mm fondo */}
                  <rect x={cabD - 26} y={0} width={26} height={58} fill="#fef3c7" stroke="#d97706" strokeWidth={strokeL} strokeDasharray="3,2" />
                  {/* Perfil Gola L Provelcar x175 en sección oficial Tipo J */}
                  <path 
                    d={`M ${cabD - 1} 0 L ${cabD - 26} 0 L ${cabD - 26} 38 Q ${cabD - 26} 55 ${cabD - 13} 55 Q ${cabD - 3.5} 55 ${cabD - 3.5} 33 L ${cabD - 5} 33 Q ${cabD - 5} 53.5 ${cabD - 13} 53.5 Q ${cabD - 24.5} 53.5 ${cabD - 24.5} 38 L ${cabD - 24.5} 1.5 L ${cabD - 1} 1.5 Z`} 
                    fill={golaColorHex} 
                    stroke="#0f172a" 
                    strokeWidth={strokeL * 0.8} 
                  />
                  
                  {/* Cota fondo de rebaje 26mm */}
                  <line x1={cabD - 26} y1={68} x2={cabD} y2={68} stroke="#d97706" strokeWidth={strokeL * 0.8} />
                  <text x={cabD - 13} y={80} fontSize={Math.max(13, fSizeL * 0.42)} fill="#d97706" fontWeight="bold" textAnchor="middle" fontFamily="monospace">26</text>
                  
                  {/* Cota alto de rebaje 58mm */}
                  <line x1={cabD - 36} y1={0} x2={cabD - 36} y2={58} stroke="#d97706" strokeWidth={strokeL * 0.8} />
                  <text x={cabD - 40} y={34} fontSize={Math.max(13, fSizeL * 0.42)} fill="#d97706" fontWeight="bold" textAnchor="end" fontFamily="monospace">58</text>
                  <text x={cabD - 13} y={22} fontSize={Math.max(11, fSizeL * 0.38)} fill={kState.golaSystem === 'black' ? '#ffffff' : '#0f172a'} fontWeight="900" textAnchor="middle">GOLA L</text>
                </g>
              )}

              {/* Destaje CNC y Perfil Gola C Intermedio en Lateral */}
              {hasGolaC && (
                <g>
                  {/* Rebaje CNC 68mm alto x 26mm fondo */}
                  <rect x={cabD - 26} y={golaCY_lat - 34} width={26} height={68} fill="#fef3c7" stroke="#d97706" strokeWidth={strokeL} strokeDasharray="3,2" />
                  {/* Perfil Gola C Provelcar x176 en sección oficial Tipo C / U */}
                  <path 
                    d={`M ${cabD - 3.5} ${golaCY_lat - 28} Q ${cabD - 9} ${golaCY_lat - 14} ${cabD - 26} ${golaCY_lat - 24} L ${cabD - 26} ${golaCY_lat + 24} Q ${cabD - 9} ${golaCY_lat + 14} ${cabD - 3.5} ${golaCY_lat + 28} L ${cabD - 5} ${golaCY_lat + 28} Q ${cabD - 10} ${golaCY_lat + 15.5} ${cabD - 24.5} ${golaCY_lat + 24} L ${cabD - 24.5} ${golaCY_lat - 24} Q ${cabD - 10} ${golaCY_lat - 15.5} ${cabD - 5} ${golaCY_lat - 28} Z`} 
                    fill={golaColorHex} 
                    stroke="#0f172a" 
                    strokeWidth={strokeL * 0.8} 
                  />
                  
                  {/* Cota alto de rebaje C 68mm */}
                  <line x1={cabD - 36} y1={golaCY_lat - 34} x2={cabD - 36} y2={golaCY_lat + 34} stroke="#d97706" strokeWidth={strokeL * 0.8} />
                  <text x={cabD - 40} y={golaCY_lat + 5} fontSize={Math.max(13, fSizeL * 0.42)} fill="#d97706" fontWeight="bold" textAnchor="end" fontFamily="monospace">68</text>
                  <text x={cabD - 13} y={golaCY_lat + 5} fontSize={Math.max(11, fSizeL * 0.38)} fill={kState.golaSystem === 'black' ? '#ffffff' : '#0f172a'} fontWeight="900" textAnchor="middle">GOLA C</text>
                </g>
              )}

              {/* Repisas Interiores y Soportes en Vista Lateral */}
              {isCabinetWithDoors(cab) && (() => {
                const shelfElevations = getResolvedCabinetShelfElevations(cab, state.thickness);
                const thickMm = (state.thickness || 1.8) * 10;
                return shelfElevations.map((elev, sIdx) => {
                  const elevMm = Math.round(elev * 10);
                  const yShelf = bodyH - elevMm - thickMm / 2;
                  return (
                    <g key={`lat-shelf-${sIdx}`}>
                      <rect 
                        x={25} 
                        y={yShelf} 
                        width={cabD - 45} 
                        height={thickMm} 
                        fill="#cbd5e1" 
                        stroke="#0284c7" 
                        strokeWidth={strokeL * 0.7} 
                      />
                      {/* Pitones de soporte Ø5 */}
                      <circle cx={37} cy={yShelf + thickMm} r={3} fill="#0284c7" />
                      <circle cx={cabD - 45} cy={yShelf + thickMm} r={3} fill="#0284c7" />
                      <text 
                        x={cabD / 2} 
                        y={yShelf - 4} 
                        fontSize={Math.max(10, fSizeL * 0.35)} 
                        fill="#0284c7" 
                        fontWeight="bold" 
                        textAnchor="middle" 
                        fontFamily="monospace"
                      >
                        REPISA (H={elevMm})
                      </text>
                    </g>
                  );
                });
              })()}

              <rect x={cabD - 18} y={isBaseGola ? 35 : 0} width={18} height={isBaseGola ? bodyH - 35 : bodyH} fill="#f97316" stroke="#ea580c" strokeWidth={strokeL * 0.8} />
              {legsH > 0 && (
                <g>
                  <rect x={15} y={bodyH} width={cabD - 30} height={legsH} fill="#e2e8f0" stroke="#475569" strokeWidth={strokeL} />
                  <text x={cabD / 2} y={bodyH + legsH * 0.65} fontSize={Math.max(20, fSizeL * 0.6)} fill="#475569" fontWeight="bold" textAnchor="middle">ZÓCALO</text>
                </g>
              )}

              {/* Cota Profundidad Superior */}
              <line x1={0} y1={-padTopL * 0.42} x2={cabD} y2={-padTopL * 0.42} stroke={COLOR_MAGENTA} strokeWidth={strokeL} />
              <line x1={0} y1={-padTopL * 0.52} x2={0} y2={0} stroke={COLOR_MAGENTA} strokeWidth={strokeL * 0.8} />
              <line x1={cabD} y1={-padTopL * 0.52} x2={cabD} y2={0} stroke={COLOR_MAGENTA} strokeWidth={strokeL * 0.8} />
              <line x1={-5} y1={-padTopL * 0.42 + 5} x2={5} y2={-padTopL * 0.42 - 5} stroke={COLOR_MAGENTA} strokeWidth={strokeL * 1.6} />
              <line x1={cabD - 5} y1={-padTopL * 0.42 + 5} x2={cabD + 5} y2={-padTopL * 0.42 - 5} stroke={COLOR_MAGENTA} strokeWidth={strokeL * 1.6} />
              <text 
                x={cabD / 2} 
                y={-padTopL * 0.42 - 8} 
                fontSize={fSizeL} 
                fill={COLOR_MAGENTA} 
                stroke="#ffffff"
                strokeWidth={strokeL * 2}
                paintOrder="stroke fill"
                strokeLinejoin="round"
                fontWeight="900" 
                fontFamily="monospace" 
                textAnchor="middle"
                textRendering="geometricPrecision"
              >
                {cabD}
              </text>
              
              {/* Cota Alto Derecha (Nunca se corta y balancea con la vista frontal) */}
              <line x1={cabD + padRightL * 0.42} y1={0} x2={cabD + padRightL * 0.42} y2={cabH} stroke={COLOR_MAGENTA} strokeWidth={strokeL} />
              <line x1={cabD} y1={0} x2={cabD + padRightL * 0.52} y2={0} stroke={COLOR_MAGENTA} strokeWidth={strokeL * 0.8} />
              <line x1={cabD} y1={cabH} x2={cabD + padRightL * 0.52} y2={cabH} stroke={COLOR_MAGENTA} strokeWidth={strokeL * 0.8} />
              <line x1={cabD + padRightL * 0.42 - 5} y1={5} x2={cabD + padRightL * 0.42 + 5} y2={-5} stroke={COLOR_MAGENTA} strokeWidth={strokeL * 1.6} />
              <line x1={cabD + padRightL * 0.42 - 5} y1={cabH + 5} x2={cabD + padRightL * 0.42 + 5} y2={cabH - 5} stroke={COLOR_MAGENTA} strokeWidth={strokeL * 1.6} />
              <text 
                x={cabD + padRightL * 0.42 + fSizeL * 0.65 + 4} 
                y={cabH / 2} 
                fontSize={fSizeL} 
                fill={COLOR_MAGENTA} 
                stroke="#ffffff"
                strokeWidth={strokeL * 2}
                paintOrder="stroke fill"
                strokeLinejoin="round"
                fontWeight="900" 
                fontFamily="monospace" 
                textAnchor="middle" 
                textRendering="geometricPrecision"
                transform={`rotate(90 ${cabD + padRightL * 0.42 + fSizeL * 0.65 + 4} ${cabH / 2})`}
              >
                {cabH}
              </text>
            </svg>
          </div>
        </div>
      </div>
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
    <div className="fixed inset-0 z-[100] bg-neutral-800 text-black flex flex-col overflow-hidden">
      {/* Header Superior Fijo Integrado (Opción 1) */}
      <header className="sticky top-0 left-0 right-0 z-40 print:hidden w-full bg-slate-900/95 border-b border-slate-800 backdrop-blur-md px-4 py-2.5 shadow-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Identificación y Título */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-orange-400 border-r border-slate-700 pr-3">
            <FileText size={16} className="text-orange-500 shrink-0" />
            <span className="tracking-wider uppercase">PLANOS DE FABRICACIÓN</span>
          </div>
          <span className="hidden xl:inline-block text-[11px] text-slate-400 font-medium">
            Láminas Técnicas A3 &middot; Despiece CNC &middot; BOM
          </span>
        </div>

        {/* Acciones Técnicas y Exportaciones */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botón Principal: Descargar Planos Completos A3 en PDF */}
          <button 
            onClick={handleExportA3}
            disabled={isExportingA3}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 active:scale-95 text-white px-3 py-1.5 rounded-lg font-bold uppercase text-[11px] tracking-wider shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            title="Generar y descargar todos los planos y despieces en formato A3 de alta resolución"
          >
            {isExportingA3 ? (
              <>
                <Loader2 size={14} className="animate-spin text-white" />
                <span>Generando ({exportProgress ? `${exportProgress.current}/${exportProgress.total}` : '...'})</span>
              </>
            ) : (
              <>
                <Download size={14} />
                <span>Planos PDF (A3)</span>
              </>
            )}
          </button>

          {generatedPdfUrl && (
            <a
              href={generatedPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download="planos_fabricacion_cocina_A3.pdf"
              className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg font-bold uppercase text-[11px] tracking-wider shadow-sm flex items-center gap-1.5 animate-pulse cursor-pointer"
              title="Haz clic para abrir o descargar directamente el PDF generado"
            >
              <Download size={14} />
              <span>PDF Listo</span>
            </a>
          )}

          {/* Botón Secundario: Ficha Técnica PDF Directo */}
          <button 
            onClick={() => exportKitchenPDF(kState.cabinets, state)}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-3 py-1.5 rounded-lg font-bold uppercase text-[11px] tracking-wider shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            title="Descargar archivo PDF con despiece de corte, resumen de cubicación y herrajes"
          >
            <FileText size={14} />
            <span>Ficha (BOM)</span>
          </button>

          {/* Botón CAD/CAM: Exportar Excel de Corte y Materiales */}
          <button 
            onClick={exportKitchenToExcel}
            className="bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white px-3 py-1.5 rounded-lg font-bold uppercase text-[11px] tracking-wider shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            title="Descargar planilla Excel CAD/CAM para seccionadoras y centros de corte"
          >
            <FileSpreadsheet size={14} />
            <span>Excel CAD/CAM</span>
          </button>

          {/* Botón Industria 4.0: Etiquetas de Producción con Código QR */}
          <button 
            onClick={handleExportLabels}
            disabled={isExportingLabels}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 active:scale-95 text-white px-3 py-1.5 rounded-lg font-bold uppercase text-[11px] tracking-wider shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            title="Generar hoja de etiquetas adhesivas de corte y mecanizado con código QR y cantos"
          >
            {isExportingLabels ? (
              <Loader2 size={14} className="animate-spin text-white" />
            ) : (
              <QrCode size={14} />
            )}
            <span>Etiquetas QR</span>
          </button>

          {/* Botón Industria 4.0: Exportar Paquete DXF para CNC */}
          <button 
            onClick={handleExportAllDxf}
            disabled={isExportingDxf}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 active:scale-95 text-white px-3 py-1.5 rounded-lg font-bold uppercase text-[11px] tracking-wider shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            title="Descargar paquete ZIP con subcarpetas por mueble y archivos DXF con capas CNC para centros de corte"
          >
            {isExportingDxf ? (
              <Loader2 size={14} className="animate-spin text-white" />
            ) : (
              <Cpu size={14} />
            )}
            <span>DXF CNC</span>
          </button>
        </div>

        {/* Lado Derecho: Comercial, Imprimir y Cerrar */}
        <div className="flex items-center gap-2">
          {/* Botón Comercial: Cotización Dual B2B & Retail */}
          <button 
            onClick={() => setIsB2BQuoteOpen(true)}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:scale-95 text-white px-3.5 py-1.5 rounded-lg font-bold uppercase text-[11px] tracking-wider shadow-md flex items-center gap-1.5 transition-all cursor-pointer border border-amber-400/30"
            title="Abrir cotizador comercial B2B & Retail con desglose de costos y márgenes"
          >
            <DollarSign size={14} />
            <span>Cotización B2B / Retail</span>
          </button>

          <button 
            onClick={() => window.print()}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
            title="Imprimir"
          >
            <Printer size={14} />
          </button>

          <button 
            onClick={() => state.setIsPrinting(false)}
            className="bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer ml-1"
            title="Cerrar vista de planos (Esc)"
          >
            <X size={15} />
            <span>Cerrar</span>
          </button>
        </div>
      </header>

      {/* Contenedor con Scroll para las Láminas A3 */}
      <div className="flex-1 overflow-auto bg-neutral-800 print-only-container">

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
                  {(() => {
                    const roomCenterSvgX = vertices.length > 0 ? toSvgX(vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length) : svgW / 2;
                    const roomCenterSvgY = vertices.length > 0 ? toSvgY(vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length) : svgH / 2;

                    return wallSegments.map((wall, wIdx) => {
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
                      let normX = len > 0 ? -dy / len : 0;
                      let normY = len > 0 ? dx / len : 0;

                      // Forzar dirección exterior respecto al centro geométrico del recinto
                      const toCenterX = roomCenterSvgX - mx;
                      const toCenterY = roomCenterSvgY - my;
                      if (normX * toCenterX + normY * toCenterY > 0) {
                        normX = -normX;
                        normY = -normY;
                      }

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
                  });
                })()}

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
                                  {/* Llamada DETALLE 1 solo en el primer módulo base para evitar saturación */}
                                  {ci === cabs.findIndex(c => c.cab.type === 'base' || c.cab.type === 'island') && (
                                    <g>
                                      <path d={`M ${cLeftX + cW * 0.2} ${cTopY - 4} L ${cLeftX + cW * 0.2} ${cTopY - 24}`} fill="none" stroke="#2563eb" strokeWidth="0.8" />
                                      <circle cx={cLeftX + cW * 0.2} cy={cTopY - 4} r={1.5} fill="#2563eb" />
                                      <text x={cLeftX + cW * 0.2} y={cTopY - 27} fontSize="6" fill="#2563eb" fontWeight="bold" textAnchor="middle">DETALLE 1</text>
                                    </g>
                                  )}
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

      {/* LÁMINA TÉCNICA DE INSTALACIONES MEP (AGUA, DESAGÜE, GAS, FUERZA) */}
      {hasMepPage && (
        <KitchenMepBlueprintSheet pageNum={2} />
      )}

      {/* 2. LÁMINAS TÉCNICAS DE FABRICACIÓN POR MÓDULO (Estilo Plano de Referencia) */}
      {printPages.map((page, pIdx) => {
        const pageNum = pIdx + 2 + mepPagesCount;
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
            <div className="flex-1 grid grid-cols-12 gap-8 pb-32 overflow-hidden items-start pt-2">
              
              {/* COLUMNA IZQUIERDA: 3 VISTAS DEL MÓDULO (Planta, Frontal, Lateral) */}
              <div className="col-span-4 border-r-2 border-slate-300 pr-4 flex flex-col justify-between items-center py-1 h-full">
                {renderCabinetOrthographicViews(cab)}
              </div>

              {/* COLUMNA DERECHA: DESPIECE TÉCNICO Y PERFORACIONES PARAMÉTRICAS */}
              <div className="col-span-8 flex flex-col justify-between">
                
                {/* Cuadrícula de Piezas */}
                <div className="grid grid-cols-4 gap-x-4 gap-y-4 items-start pr-2 pt-1">
                  {page.parts.map((part, pSubIdx) => (
                    <div key={pSubIdx} className="flex flex-col items-center bg-slate-50/50 p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                      {/* Cabecera de la Pieza */}
                      <div className="w-full flex flex-col items-center mb-1.5 justify-center">
                        <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight text-center leading-tight line-clamp-1 max-w-full">
                          {part.name.replace(/\(Cab \d+ [^)]+\)/, '')}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded font-mono font-black tracking-wide">
                            {part.qty} UN
                          </span>
                          <span className="text-[10px] text-slate-700 font-mono font-black">
                            {part.thickness}mm
                          </span>
                        </div>
                      </div>

                      {/* Contenedor Gráfico de la Pieza a Escala Vectorial SVG */}
                      <div className="w-full flex items-center justify-center p-0.5">
                        {renderUnifiedPartSVG(part, cab)}
                      </div>

                      {/* Botón CNC DXF por pieza individual */}
                      <button
                        onClick={() => {
                          const cncPart = calculateCncMachiningForPart(
                            part, 
                            cab, 
                            state.drawerHardware === 'Hafele' ? 'Hafele' : 'Provelcar', 
                            state.assemblyType === 'minifix' ? 'minifix' : 'spax', 
                            kState.golaSystem,
                            kState.handleConfig
                          );
                          downloadPartDxfFile(cncPart);
                        }}
                        className="print:hidden mt-2 px-2.5 py-1 bg-slate-800 hover:bg-orange-600 active:scale-95 text-white rounded text-[9px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                        title={`Descargar archivo DXF CNC para ${part.name}`}
                      >
                        <Download size={10} />
                        <span>DXF CNC</span>
                      </button>
                    </div>
                  ))}
                </div>

                {/* DETALLES TÉCNICOS AMPLIADOS (Callouts al pie según plano de referencia) */}
                <div className="grid grid-cols-3 gap-4 bg-slate-50/95 p-3 rounded-lg border border-slate-200 mt-4">
                  {/* Detalle 1: Canal Durolac */}
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-full border-2 border-purple-500 bg-white flex items-center justify-center shrink-0 relative overflow-hidden shadow-xs">
                      <svg viewBox="0 0 50 50" className="w-full h-full p-1">
                        <rect x="5" y="10" width="40" height="30" fill="#f8fafc" stroke="#334155" strokeWidth="1.2"/>
                        <rect x="28" y="10" width="8" height="15" fill="#e2e8f0" stroke="#9333ea" strokeWidth="1.2" strokeDasharray="1,1"/>
                        <line x1="28" y1="35" x2="36" y2="35" stroke="#2563eb" strokeWidth="1"/>
                        <text x="32" y="44" fontSize="8.5" fill="#2563eb" textAnchor="middle" fontWeight="900" fontFamily="monospace">4mm</text>
                      </svg>
                    </div>
                    <div className="text-[10.5px] text-slate-800 leading-tight">
                      <div className="font-black text-purple-700 uppercase">DETALLE 1</div>
                      <div className="font-bold">CANAL TRASERA / DUROLAC</div>
                      <div className="text-slate-600 font-medium">A 15mm del borde • Prof. 7.5mm</div>
                    </div>
                  </div>

                  {/* Detalle 2: Ensamble Minifix o Tornillo */}
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-full border-2 border-emerald-500 bg-white flex items-center justify-center shrink-0 relative overflow-hidden shadow-xs">
                      <svg viewBox="0 0 50 50" className="w-full h-full p-1">
                        {state.assemblyType === 'minifix' ? (
                          <>
                            <circle cx="25" cy="23" r="11" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.4"/>
                            <circle cx="25" cy="23" r="3.5" fill="#16a34a"/>
                            <line x1="12" y1="23" x2="38" y2="23" stroke="#16a34a" strokeWidth="0.8"/>
                            <text x="25" y="44" fontSize="8.5" fill="#16a34a" textAnchor="middle" fontWeight="900" fontFamily="monospace">Ø15 Minifix</text>
                          </>
                        ) : (
                          <>
                            <circle cx="25" cy="23" r="6" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.4"/>
                            <line x1="20" y1="18" x2="30" y2="28" stroke="#2563eb" strokeWidth="1.2"/>
                            <line x1="20" y1="28" x2="30" y2="18" stroke="#2563eb" strokeWidth="1.2"/>
                            <text x="25" y="44" fontSize="8.5" fill="#2563eb" textAnchor="middle" fontWeight="900" fontFamily="monospace">Ø5 Tornillo</text>
                          </>
                        )}
                      </svg>
                    </div>
                    <div className="text-[10.5px] text-slate-800 leading-tight">
                      <div className="font-black text-emerald-700 uppercase">DETALLE 2</div>
                      <div className="font-bold">ENSAMBLE ESTRUCTURAL</div>
                      <div className="text-slate-600 font-medium">
                        {state.assemblyType === 'minifix' ? 'Minifix a 34mm + Tarugo a 66mm' : 'Soberbio Spax 5x50 a 50mm'}
                      </div>
                    </div>
                  </div>

                  {/* Detalle 3: Cazoleta Bisagra */}
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-full border-2 border-orange-500 bg-white flex items-center justify-center shrink-0 relative overflow-hidden shadow-xs">
                      <svg viewBox="0 0 50 50" className="w-full h-full p-1">
                        <circle cx="25" cy="23" r="14" fill="#ffedd5" stroke="#ea580c" strokeWidth="1.4" strokeDasharray="2,2"/>
                        <circle cx="25" cy="23" r="3.5" fill="#ea580c"/>
                        <line x1="25" y1="5" x2="25" y2="41" stroke="#ea580c" strokeWidth="0.8" strokeDasharray="1,1"/>
                        <text x="25" y="44" fontSize="8.5" fill="#ea580c" textAnchor="middle" fontWeight="900" fontFamily="monospace">Ø35 Bisagra</text>
                      </svg>
                    </div>
                    <div className="text-[10.5px] text-slate-800 leading-tight">
                      <div className="font-black text-orange-700 uppercase">DETALLE 3</div>
                      <div className="font-bold">CAZOLETA DE BISAGRA</div>
                      <div className="text-slate-600 font-medium">Eje a 22.5mm • A 90mm de extremos</div>
                    </div>
                  </div>

                  {/* Detalle 4: Soportes de Repisa / Pitón Ø5 */}
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-full border-2 border-sky-500 bg-white flex items-center justify-center shrink-0 relative overflow-hidden shadow-xs">
                      <svg viewBox="0 0 50 50" className="w-full h-full p-1">
                        <circle cx="25" cy="23" r="5" fill="#0284c7" stroke="#0369a1" strokeWidth="1.2"/>
                        <line x1="18" y1="23" x2="32" y2="23" stroke="#ffffff" strokeWidth="0.8"/>
                        <line x1="25" y1="16" x2="25" y2="30" stroke="#ffffff" strokeWidth="0.8"/>
                        <text x="25" y="44" fontSize="8" fill="#0284c7" textAnchor="middle" fontWeight="900" fontFamily="monospace">Ø5 Pitón</text>
                      </svg>
                    </div>
                    <div className="text-[10.5px] text-slate-800 leading-tight">
                      <div className="font-black text-sky-700 uppercase">DETALLE 4</div>
                      <div className="font-bold">SOPORTE REPISA (PITÓN)</div>
                      <div className="text-slate-600 font-medium">Ø5mm x 10mm • Evasión anti-colisión</div>
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
        const pageNum = 1 + mepPagesCount + printPages.length + bIndex + 1;

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
              <svg 
                viewBox={`-20 -20 ${board.w + 40} ${board.h + 40}`} 
                className="w-full max-w-[880px] max-h-[500px] bg-slate-100 border-2 border-slate-800 rounded shadow-md"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Plancha Base */}
                <rect x={0} y={0} width={board.w} height={board.h} fill="#f8fafc" stroke="#334155" strokeWidth={3} />
                
                {board.placedParts.map((bp, pi) => {
                  const fontSize = Math.max(16, Math.min(bp.w / 9, bp.h / 4, 34));
                  return (
                    <g key={pi}>
                      <rect
                        x={bp.x}
                        y={bp.y}
                        width={bp.w}
                        height={bp.h}
                        fill="#ffffff"
                        stroke="#1e293b"
                        strokeWidth={1.5}
                      />
                      {/* Tapacantos visuales */}
                      {bp.edgeTop && <line x1={bp.x} y1={bp.y + 2} x2={bp.x + bp.w} y2={bp.y + 2} stroke="#f97316" strokeWidth={4} />}
                      {bp.edgeBottom && <line x1={bp.x} y1={bp.y + bp.h - 2} x2={bp.x + bp.w} y2={bp.y + bp.h - 2} stroke="#f97316" strokeWidth={4} />}
                      {bp.edgeLeft && <line x1={bp.x + 2} y1={bp.y} x2={bp.x + 2} y2={bp.y + bp.h} stroke="#f97316" strokeWidth={4} />}
                      {bp.edgeRight && <line x1={bp.x + bp.w - 2} y1={bp.y} x2={bp.x + bp.w - 2} y2={bp.y + bp.h} stroke="#f97316" strokeWidth={4} />}

                      {bp.h > 40 && bp.w > 60 && (
                        <>
                          <text
                            x={bp.x + bp.w / 2}
                            y={bp.y + bp.h / 2 - (bp.h > 75 ? fontSize * 0.35 : 0)}
                            textAnchor="middle"
                            fontSize={fontSize}
                            fontWeight="bold"
                            fill="#0f172a"
                          >
                            {bp.name.replace(/\(Cab \d+ [^)]+\)/, '')}
                          </text>
                          {bp.h > 75 && (
                            <text
                              x={bp.x + bp.w / 2}
                              y={bp.y + bp.h / 2 + fontSize * 0.9}
                              textAnchor="middle"
                              fontSize={fontSize * 0.8}
                              fontFamily="monospace"
                              fontWeight="bold"
                              fill="#ea580c"
                            >
                              {bp.w} x {bp.h} mm
                            </text>
                          )}
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
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

      {/* 3.1. PLANOS DE OPTIMIZACIÓN DE CORTE EN PLANCHA QSTONE (3200 x 1600 mm) */}
      {kState.countertopConfig?.enabled && ctBOM && ctBOM.slabsLayout.map((slab, sIndex) => {
        const pageNum = 1 + mepPagesCount + printPages.length + boardResults.length + sIndex + 1;
        const bType = kState.countertopConfig.buildingType === 'edificio' ? 'Edificio (máx 2000 mm)' : 'Casa (máx 2500 mm)';

        return (
          <div key={'qstone-slab-' + sIndex} className="blueprint-page border border-black/10 flex flex-col justify-between p-8 pb-32 bg-white relative">
            <div className="flex justify-between items-end border-b-2 border-slate-900 pb-3 mb-2 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                    Marmolería & Cubiertas Qstone
                  </span>
                  <span className="text-[10px] uppercase font-mono text-slate-500">
                    Plancha #{sIndex + 1} de {ctBOM.slabsLayout.length}
                  </span>
                </div>
                <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900">
                  Esquema de Corte & Optimización en Plancha <span className="text-amber-600">#{sIndex + 1}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider">
                  Material: <span className="font-bold text-slate-800">{ctBOM.product.name}</span> • Espesor: <span className="font-bold text-slate-800">{ctBOM.product.thicknessMm} mm</span> • Criterio Logístico: <span className="font-bold text-amber-700">{bType}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-0.5">Aprovechamiento</p>
                <p className="font-mono text-xl font-bold text-emerald-600">{slab.efficiencyPercent}%</p>
                <p className="text-[10px] text-slate-500 font-mono">Útil: {slab.usedAreaM2} m² | Retazo: {slab.offcutAreaM2} m²</p>
              </div>
            </div>

            <div className="w-full flex items-center justify-center my-auto">
              <svg
                viewBox="-40 -40 3280 1680"
                className="w-full max-w-[940px] max-h-[460px] bg-slate-50 border-2 border-slate-800 rounded shadow-md"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Plancha Base Qstone 3200 x 1600 mm */}
                <rect x={0} y={0} width={3200} height={1600} fill="#f1f5f9" stroke="#1e293b" strokeWidth={4} />

                {/* Margen de despunte perimetral de fábrica (10mm) */}
                <rect x={10} y={10} width={3180} height={1580} fill="none" stroke="#94a3b8" strokeWidth={2} strokeDasharray="16,8" />

                {/* Piezas Anidadas */}
                {slab.pieces.map((p, pIdx) => {
                  let fillColor = '#fef3c7'; // amber-100
                  let strokeColor = '#d97706'; // amber-600
                  if (p.type === 'apron') {
                    fillColor = '#ffedd5'; // orange-100
                    strokeColor = '#ea580c'; // orange-600
                  } else if (p.type === 'backsplash') {
                    fillColor = '#e0f2fe'; // sky-100
                    strokeColor = '#0284c7'; // sky-600
                  } else if (p.type === 'waterfall') {
                    fillColor = '#f3e8ff'; // purple-100
                    strokeColor = '#9333ea'; // purple-600
                  }

                  const fontSize = Math.max(22, Math.min(p.widthMm / 16, p.lengthMm / 4, 48));

                  return (
                    <g key={pIdx}>
                      <rect
                        x={p.x}
                        y={p.y}
                        width={p.widthMm}
                        height={p.lengthMm}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={3}
                      />

                      {/* Calado de lavaplatos o encimera en líneas punteadas */}
                      {p.hasCutout && p.widthMm > 600 && p.lengthMm > 350 && (
                        <g>
                          <rect
                            x={p.x + (p.widthMm - (p.hasCutout === 'sink' ? 695 : 550)) / 2}
                            y={p.y + (p.lengthMm - (p.hasCutout === 'sink' ? 400 : 470)) / 2}
                            width={p.hasCutout === 'sink' ? 695 : 550}
                            height={p.hasCutout === 'sink' ? 400 : 470}
                            fill="#ffffff"
                            stroke="#dc2626"
                            strokeWidth={3}
                            strokeDasharray="12,8"
                          />
                          <text
                            x={p.x + p.widthMm / 2}
                            y={p.y + p.lengthMm / 2 + 8}
                            textAnchor="middle"
                            fontSize={24}
                            fontWeight="bold"
                            fill="#dc2626"
                          >
                            {p.hasCutout === 'sink' ? 'CALADO ENCASTRE LAVAPLATOS' : 'CALADO ENCIMERA'}
                          </text>
                        </g>
                      )}

                      {/* Identificación y medidas de la pieza */}
                      {p.widthMm > 150 && p.lengthMm > 60 && (
                        <>
                          <text
                            x={p.x + p.widthMm / 2}
                            y={p.y + p.lengthMm / 2 - (p.lengthMm > 120 ? fontSize * 0.4 : 0)}
                            textAnchor="middle"
                            fontSize={fontSize}
                            fontWeight="bold"
                            fill="#0f172a"
                          >
                            {p.pieceId}
                          </text>
                          {p.lengthMm > 120 && (
                            <text
                              x={p.x + p.widthMm / 2}
                              y={p.y + p.lengthMm / 2 + fontSize * 0.9}
                              textAnchor="middle"
                              fontSize={fontSize * 0.75}
                              fontFamily="monospace"
                              fontWeight="bold"
                              fill="#b45309"
                            >
                              {p.widthMm} x {p.lengthMm} mm
                            </text>
                          )}
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-600 border-t border-slate-200 pt-2 shrink-0">
              <div className="flex gap-8">
                <p><span className="font-bold text-black">Formato Plancha:</span> 3200 x 1600 mm</p>
                <p><span className="font-bold text-black">Espesor Disco Diamante:</span> Kerf 3.5 mm</p>
                <p><span className="font-bold text-black">Despunte Perimetral:</span> 10 mm</p>
                <p><span className="font-bold text-black">Criterio Logístico:</span> {bType}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-200 border border-amber-600"></span><span>Cubierta</span></div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-200 border border-orange-600"></span><span>Faldón</span></div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-sky-200 border border-sky-600"></span><span>Respaldo</span></div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-purple-200 border border-purple-600"></span><span>Cascada</span></div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-100 border border-red-600 border-dashed"></span><span>Encastre</span></div>
              </div>
            </div>

            <BlueprintTitleBlock pageNum={pageNum} title={`OPTIMIZACIÓN CUBIERTA QSTONE: PLANCHA #${slab.slabIndex}`} />
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

      {/* Modal de PDF Listo para Descargar */}
      {generatedPdfUrl && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6 border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl mx-auto flex items-center justify-center">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">¡Planos A3 Generados con Éxito!</h3>
              <p className="text-slate-600 text-sm mt-2">Su documento PDF de fabricación está listo para descargar.</p>
            </div>
            <div className="space-y-3">
              <a
                href={generatedPdfUrl}
                download="planos_fabricacion_cocina_A3.pdf"
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer text-base"
              >
                <Download size={20} />
                <span>Descargar Archivo PDF</span>
              </a>
              <button
                onClick={() => setGeneratedPdfUrl(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-2xl transition-all cursor-pointer text-sm"
              >
                Cerrar ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cotización Dual B2B & Retail integrado */}
      <KitchenB2BQuoteModal
        isOpen={isB2BQuoteOpen}
        onClose={() => setIsB2BQuoteOpen(false)}
      />

    </div>
  );
}
