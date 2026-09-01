import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CabinetType } from '../store/kitchenStore';
import { generateKitchenPartsList, generateKitchenHardwareList, HARDWARE_SPECS } from './kitchenManufacturing';
import { renderArquifyPdfLogo } from './pdfLogo';
import { getFriendlyColorName } from './colorNames';

export { getFriendlyColorName };

export function exportKitchenPDF(cabinets: CabinetType[], state: any, filename = 'ficha_tecnica_cocina.pdf') {
  const doc = new jsPDF('p', 'mm', 'a4');
  const dateStr = new Date().toLocaleDateString('es-CL');

  const realCabinets = cabinets.filter(c => c.type !== 'decoration' && !c.variant?.startsWith('deco_'));
  const allParts = generateKitchenPartsList(cabinets);
  const hardwareList = generateKitchenHardwareList(cabinets);
  const hwKey = (state.drawerHardware === 'Hafele' ? 'Hafele' : 'Provelcar') as keyof typeof HARDWARE_SPECS;
  const hwSpec = HARDWARE_SPECS[hwKey] || HARDWARE_SPECS.Provelcar;
  const thicknessMm = (state.thickness || 1.5) * 10;
  const customTextures = state.customTextures || [];

  // ==========================================
  // PÁGINA 1: PORTADA TÉCNICA Y RESUMEN GENERAL
  // ==========================================
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 30, 'F');

  renderArquifyPdfLogo(doc, 14, 14, 22);

  doc.setTextColor(248, 250, 252);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('PLANOS DE FABRICACIÓN, DESPIECE CAD/CAM & CUBICACIÓN', 14, 22);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Fecha: ${dateStr} | Versión: 2.4-BIM Cocina`, 135, 21);

  let yPos = 38;

  // Cuadro de Resumen Ejecutivo
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, yPos, 182, 44, 3, 3, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('ESPECIFICACIONES TÉCNICAS GENERALES', 20, yPos + 6.5);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  const baseCount = realCabinets.filter(c => c.type === 'base').length;
  const wallCount = realCabinets.filter(c => c.type === 'wall').length;
  const tallCount = realCabinets.filter(c => c.type === 'tall').length;
  const islandCount = realCabinets.filter(c => c.type === 'island').length;

  doc.text(`• Total Módulos: ${realCabinets.length} unid. (Bajos: ${baseCount}, Aéreos: ${wallCount}, Torres: ${tallCount}, Islas: ${islandCount})`, 20, yPos + 13.5);
  doc.text(`• Espesor Melamina Estructura: ${thicknessMm} mm (Tapacanto PVC 22x0.45 mm)`, 20, yPos + 19.5);
  doc.text(`• Frentes y Puertas: ${thicknessMm} mm (Tapacanto PVC 22x2.0 mm alto impacto)`, 20, yPos + 25.5);
  doc.text(`• Traseras y Fondos de Cajón: Durolac / MDF 3.5 mm ranurado a 15 mm`, 20, yPos + 31.5);
  doc.text(`• Sistema de Herrajes: ${hwSpec.slideName} (Holgura SKW: -${hwSpec.slideClearanceTotal} mm, Descuento SKL: -${hwSpec.drawerLengthDeduction} mm)`, 20, yPos + 37.5);

  yPos += 50;

  // TABLA 1: Listado de Módulos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. RELACIÓN DE GABINETES Y MÓDULOS DEL PROYECTO', 14, yPos);

  const cabRows = realCabinets.map((c, i) => {
    const tagPrefix = c.type === 'wall' ? 'A' : c.type === 'tall' ? 'T' : c.type === 'island' ? 'I' : 'B';
    const tag = `${tagPrefix}-${i + 1}`;
    const typeLabel = c.type === 'base' ? 'Módulo Bajo' : c.type === 'wall' ? 'Módulo Aéreo' : c.type === 'tall' ? 'Torre/Despensa' : 'Isla';
    const variantLabel = c.variant ? c.variant.replace(/_/g, ' ') : 'Estándar';
    const doorCol = getFriendlyColorName(c.doorColor || state.doorColor, customTextures);
    const structCol = getFriendlyColorName(c.structureColor || state.structureColor, customTextures);
    return [
      tag,
      typeLabel,
      `${c.width} x ${c.height} x ${c.depth} cm`,
      variantLabel,
      doorCol,
      structCol
    ];
  });

  autoTable(doc, {
    startY: yPos + 4,
    head: [['Tag', 'Tipo', 'Dimensiones (An x Al x Pr)', 'Configuración', 'Color Puertas', 'Color Cuerpo']],
    body: cabRows,
    theme: 'grid',
    headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2.2, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 32 },
      2: { cellWidth: 38, halign: 'center' },
      3: { cellWidth: 34 },
      4: { cellWidth: 31 },
      5: { cellWidth: 31 }
    },
    margin: { left: 14, right: 14 }
  });

  // ==========================================
  // PÁGINA 2: DESPIECE COMPLETO DE PIEZAS (CAD/CAM)
  // ==========================================
  doc.addPage();
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 16, 'F');
  doc.setTextColor(248, 250, 252);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('2. PLANILLA DE DESPIECE TÉCNICO Y TAPACANTOS (PIEZAS DE CORTE)', 14, 11);

  const partsRows = allParts.map((p, idx) => [
    `${idx + 1}`,
    p.name.replace(/\(Cab \d+ [^)]+\)/, ''),
    `${p.qty}`,
    p.length.toFixed(1),
    p.width.toFixed(1),
    `${p.thickness} mm`,
    p.edgeL1 || p.edgeL2 ? 'Largo' : '-',
    p.edgeW1 || p.edgeW2 ? 'Ancho' : '-',
    p.notes || 'Estándar'
  ]);

  autoTable(doc, {
    startY: 22,
    head: [['#', 'Nombre Pieza', 'Cant.', 'Largo (mm)', 'Ancho (mm)', 'Espesor', 'TC Largo', 'TC Ancho', 'Mecanizado / Notas']],
    body: partsRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 1.8, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 52 },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 16, halign: 'center' },
      7: { cellWidth: 16, halign: 'center' },
      8: { cellWidth: 18 }
    },
    margin: { left: 14, right: 14 }
  });

  // ==========================================
  // PÁGINA 3: RESUMEN DE OPTIMIZACIÓN (NESTING)
  // ==========================================
  doc.addPage();
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 16, 'F');
  doc.setTextColor(248, 250, 252);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('3. RESUMEN DE CUBICACIÓN Y OPTIMIZACIÓN DE PLANCHAS (NESTING 2D)', 14, 11);

  // Calcular cubicación agrupada
  const structParts = allParts.filter(p => p.thickness >= 15 && !p.name.includes('Puerta') && !p.name.includes('Frente') && !p.name.includes('Panel Ciego'));
  const doorParts = allParts.filter(p => p.thickness >= 15 && (p.name.includes('Puerta') || p.name.includes('Frente') || p.name.includes('Panel Ciego')));
  const backParts = allParts.filter(p => p.thickness < 15 || p.name.includes('Fondo') || p.name.includes('Trasera'));

  const structM2 = structParts.reduce((acc, p) => acc + (p.length * p.width * p.qty) / 1000000, 0);
  const doorM2 = doorParts.reduce((acc, p) => acc + (p.length * p.width * p.qty) / 1000000, 0);
  const backM2 = backParts.reduce((acc, p) => acc + (p.length * p.width * p.qty) / 1000000, 0);

  const sheetMelM2 = (2.50 * 1.83); // 4.575 m²
  const sheetDurolacM2 = (2.44 * 1.83); // 4.465 m²

  const structSheets = Math.ceil((structM2 * 1.15) / sheetMelM2) || 1;
  const doorSheets = Math.ceil((doorM2 * 1.15) / sheetMelM2) || (doorParts.length > 0 ? 1 : 0);
  const backSheets = Math.ceil((backM2 * 1.12) / sheetDurolacM2) || (backParts.length > 0 ? 1 : 0);

  const nestingSummary = [
    ['Melamina Estructura y Cajones', `${thicknessMm} mm`, '2500 x 1830 mm', `${structParts.reduce((a, b) => a + b.qty, 0)} unid.`, `${structM2.toFixed(2)} m²`, `${structSheets} planchas`, `${Math.min(92, Math.round((structM2 / (structSheets * sheetMelM2)) * 100))}%`],
    ['Melamina / HPL Puertas y Frentes', `${thicknessMm} mm`, '2500 x 1830 mm', `${doorParts.reduce((a, b) => a + b.qty, 0)} unid.`, `${doorM2.toFixed(2)} m²`, `${doorSheets} planchas`, doorSheets > 0 ? `${Math.min(92, Math.round((doorM2 / (doorSheets * sheetMelM2)) * 100))}%` : '-'],
    ['Durolac / MDF Traseras y Fondos', '3.5 mm', '2440 x 1830 mm', `${backParts.reduce((a, b) => a + b.qty, 0)} unid.`, `${backM2.toFixed(2)} m²`, `${backSheets} planchas`, backSheets > 0 ? `${Math.min(94, Math.round((backM2 / (backSheets * sheetDurolacM2)) * 100))}%` : '-'],
  ];

  autoTable(doc, {
    startY: 24,
    head: [['Material / Sustrato', 'Espesor', 'Formato Plancha', 'Piezas', 'Área Neta', 'Planchas Est.', 'Rendimiento']],
    body: nestingSummary,
    theme: 'grid',
    headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 26, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 24, halign: 'center' },
      6: { cellWidth: 22, halign: 'center' }
    },
    margin: { left: 14, right: 14 }
  });

  let nextY = (doc as any).lastAutoTable.finalY + 12;

  // TABLA 4: QUINCALLERÍA Y HERRAJES (BOM)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('4. LISTADO CONSOLIDADO DE QUINCALLERÍA, HERRAJES Y FIJACIONES (BOM)', 14, nextY);

  const hwRows = hardwareList.map(h => [
    h.Categoria,
    h.Item,
    `${h.Cantidad} ${h.Unidad}`,
    h.Detalles
  ]);

  autoTable(doc, {
    startY: nextY + 4,
    head: [['Categoría', 'Ítem / Herraje', 'Cantidad', 'Especificación Técnica']],
    body: hwRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 52 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 80 }
    },
    margin: { left: 14, right: 14 }
  });

  // Guardar documento
  doc.save(filename);
}
