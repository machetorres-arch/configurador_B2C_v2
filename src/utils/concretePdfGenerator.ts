import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ConcreteHouseDimensions,
  ConcreteOpening,
  ConcreteInteriorWall,
  WallThicknessMm,
  WallMeshType,
  ConcreteGrade,
  ConcreteSlump,
  ConcreteFoundationType,
  SlabType,
  RebarSteelQuality,
} from '../store/concreteHouseStore';
import { calculateConcreteHouseBOM, ConcreteSummaryMetrics } from './concreteManufacturing';

export function exportConcreteHouseToPdf(
  dims: ConcreteHouseDimensions,
  wallThicknessMm: WallThicknessMm,
  meshType: WallMeshType,
  concreteGrade: ConcreteGrade,
  concreteSlump: ConcreteSlump,
  foundationType: ConcreteFoundationType,
  slabType: SlabType,
  rebarQuality: RebarSteelQuality,
  meshDiameterMm: number,
  openings: ConcreteOpening[],
  interiorWalls: ConcreteInteriorWall[] = []
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const metrics: ConcreteSummaryMetrics = calculateConcreteHouseBOM(
    dims,
    wallThicknessMm,
    meshType,
    concreteGrade,
    concreteSlump,
    foundationType,
    slabType,
    rebarQuality,
    meshDiameterMm,
    openings,
    interiorWalls
  );

  // Colores corporativos de ingeniería
  const primaryColor = [15, 23, 42]; // Slate 900
  const accentColor = [234, 88, 12]; // Orange 600
  const grayColor = [100, 116, 139]; // Slate 500

  // 1. Encabezado
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('MEMORIA TÉCNICA DE HORMIGÓN ARMADO', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(220, 220, 220);
  doc.text('VIVIENDAS DE 1 Y 2 NIVELES • ICH / NCh430 / NCh170 / D.S. N°60', 14, 18);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-CL')}`, 160, 18);

  // 2. Ficha del Proyecto
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. PARÁMETROS DE DISEÑO Y FABRICACIÓN', 14, 36);

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 40, 182, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  const col1X = 18;
  const col2X = 105;

  doc.text(`• Superficie Construida: ${metrics.totalBuiltAreaM2.toFixed(1)} m² (${dims.levels} ${dims.levels === 1 ? 'Piso' : 'Pisos'})`, col1X, 46);
  doc.text(`• Dimensiones en Planta: ${(dims.width / 100).toFixed(2)} x ${(dims.length / 100).toFixed(2)} m (H: ${(dims.wallHeight / 100).toFixed(2)} m)`, col1X, 52);
  doc.text(`• Espesor de Muros: ${wallThicknessMm} mm (${meshType === 'malla_central' ? 'Malla Central' : 'Doble Malla'})`, col1X, 58);
  doc.text(`• Grado de Hormigón: ${concreteGrade.replace('_', ' / ')} (Cono ${concreteSlump === 'fluido_18cm' ? '≥18 cm Fluido' : '10-12 cm'})`, col1X, 64);

  doc.text(`• Tipo de Fundación: ${foundationType === 'losa_fundacion_suples' ? 'Losa con Suples (ICH Lám. 17/29)' : 'Cimiento Corrido (ICH Lám. 20/21)'}`, col2X, 46);
  doc.text(`• Solución Cubierta/Losa: ${slabType.replace(/_/g, ' ')}`, col2X, 52);
  doc.text(`• Calidad de Acero: ${rebarQuality.replace('_', '-')} + Malla AT56-50H`, col2X, 58);
  doc.text(`• Refuerzo Sísmico Vanos: Diagonales 45° + Dinteles extendidos`, col2X, 64);

  // 3. Resumen Global de Partidas (Indicadores clave)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. BALANCE DE CUBICACIÓN INDUSTRIAL', 14, 82);

  const metricsBoxes = [
    { title: 'VOLUMEN HORMIGÓN', val: `${metrics.totalConcreteM3.toFixed(1)} m³`, sub: `~ ${metrics.mixerTruckLoads} Mixers` },
    { title: 'SUPERFICIE MOLDAJE', val: `${metrics.totalFormworkM2.toFixed(1)} m²`, sub: `${metrics.releaseAgentLiters} L Desmoldante` },
    { title: 'ENFIERRADURA TOTAL', val: `${metrics.totalSteelKg.toFixed(0)} kg`, sub: `Cuantía: ${metrics.steelRatioKgM3.toFixed(1)} kg/m³` },
    { title: 'TOTAL PRESUPUESTO', val: `$ ${(metrics.totalCostClp / 1000000).toFixed(2)} M`, sub: `$ ${metrics.costPerM2Clp.toLocaleString('es-CL')}/m²` },
  ];

  metricsBoxes.forEach((bx, idx) => {
    const bxX = 14 + idx * 47;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(bxX, 86, 44, 22, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(bx.title, bxX + 3, 91);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(234, 88, 12);
    doc.text(bx.val, bxX + 3, 98);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(bx.sub, bxX + 3, 104);
  });

  // 4. Tabla de Partidas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('3. DESGLOSE DE PARTIDAS Y MATERIALES (BOM)', 14, 116);

  const tableBody = metrics.items.map((it, i) => [
    (i + 1).toString(),
    it.category,
    it.name,
    it.unit,
    it.quantity.toLocaleString('es-CL'),
    `$ ${it.unitPriceClp.toLocaleString('es-CL')}`,
    `$ ${it.totalPriceClp.toLocaleString('es-CL')}`,
    it.normReference,
  ]);

  // Fila total
  tableBody.push([
    '',
    '',
    'TOTAL OBRA GRUESA HORMIGÓN ARMADO',
    '',
    '',
    '',
    `$ ${metrics.totalCostClp.toLocaleString('es-CL')}`,
    'PRECIO ESTIMADO',
  ]);

  autoTable(doc, {
    startY: 120,
    head: [['#', 'Categoría', 'Descripción del Material', 'Unid.', 'Cant.', 'P. Unit.', 'Total CLP', 'Norma / Ref.']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 26 },
      2: { cellWidth: 55 },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 15, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 24, fontSize: 6.5 },
    },
    didParseCell: (data) => {
      if (data.row.index === tableBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [254, 242, 242];
        data.cell.styles.textColor = [153, 27, 27];
      }
    },
  });

  // 5. Pie de página y firma normativa
  const finalY = (doc as any).lastAutoTable?.finalY || 240;
  if (finalY < 265) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Documento técnico generado automáticamente conforme al Manual de Detallamiento ICH y NCh430. Los diámetros de refuerzo y espesores de muro deben ser validados por el Ingeniero Calculista del proyecto.',
      14,
      finalY + 8,
      { maxWidth: 182 }
    );
  }

  // Descarga
  doc.save(`Ficha_Tecnica_Hormigon_${dims.width / 100}x${dims.length / 100}m_${new Date().toISOString().slice(0, 10)}.pdf`);
}
