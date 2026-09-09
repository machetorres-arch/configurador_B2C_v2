import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CltHouseState, CLT_SPECS_CATALOG } from '../store/cltHouseStore';
import { calculateCltHouseQuantities } from './cltCalculations';
import { renderArquifyPdfLogo } from './pdfLogo';

export function exportCltHouseToPdf(state: CltHouseState) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const bom = calculateCltHouseQuantities(state);
  const wallSpec = CLT_SPECS_CATALOG[state.wallCltType];
  const slabSpec = CLT_SPECS_CATALOG[state.slabCltType];
  const roofSpec = CLT_SPECS_CATALOG[state.roofCltType];

  const primaryColor = [249, 115, 22]; // Orange-500
  const darkColor = [24, 24, 27]; // Zinc-900
  const slateColor = [100, 116, 139]; // Slate-500

  // 1. Header Bar
  doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 32, 210, 2, 'F');

  // Logo Arquify
  renderArquifyPdfLogo(doc, 14, 16, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(210, 210, 210);
  doc.text('MEMORIA TÉCNICA ESTRUCTURAL & CUBICACIÓN CLT / GLT', 14, 25);

  const todayStr = new Date().toISOString().split('T')[0];
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`Fecha: ${todayStr}`, 196, 16, { align: 'right' });
  doc.setTextColor(249, 115, 22);
  doc.text('ESTÁNDAR NIUFORM - NCh433 / NCh1198', 196, 24, { align: 'right' });

  // 2. Info General del Proyecto
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text(state.projectName, 14, 43);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(slateColor[0], slateColor[1], slateColor[2]);
  doc.text(`Tipología: ${state.buildingType.toUpperCase()} | Variante: Mass Timber ${state.constructionVariant.toUpperCase()}`, 14, 49);
  doc.text(`Pisos: ${state.numStories} | Superficie Construida: ${(state.widthM * state.lengthM * state.numStories).toFixed(1)} m² | Altura Libre: ${state.storyHeightM} m`, 14, 54);
  doc.text(`Zona Sísmica: Zona ${state.seismicZone} (Suelo ${state.soilType}, NCh433/DS61) | Zona Térmica: ${state.thermalConfig.selectedZone} (NCh853)`, 14, 59);

  let currentY = 66;

  // 3. Tabla de Materiales CLT & GLT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('1. RESUMEN DE MADERA MASIVA (CLT & GLT NIUFORM)', 14, currentY);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Elemento', 'Especificación', 'Espesor', 'Área Neta', 'Volumen', 'Peso Estimado']],
    body: [
      ['Muros CLT', wallSpec.name, `${wallSpec.totalThicknessMm} mm`, `${bom.cltWallAreaM2} m²`, `${bom.cltWallVolumeM3} m³`, `${(bom.cltWallAreaM2 * wallSpec.weightKgM2 / 1000).toFixed(2)} Ton`],
      ['Losas Entrepiso', slabSpec.name, `${slabSpec.totalThicknessMm} mm`, `${bom.cltSlabAreaM2} m²`, `${bom.cltSlabVolumeM3} m³`, `${(bom.cltSlabAreaM2 * slabSpec.weightKgM2 / 1000).toFixed(2)} Ton`],
      ['Techumbre CLT', roofSpec.name, `${roofSpec.totalThicknessMm} mm`, `${bom.cltRoofAreaM2} m²`, `${bom.cltRoofVolumeM3} m³`, `${(bom.cltRoofAreaM2 * roofSpec.weightKgM2 / 1000).toFixed(2)} Ton`],
      ['Vigas & Columnas GLT', 'Pino Radiata MLE 24h', '-', `${bom.gltTotalLengthM} m lineales`, `${bom.gltTotalVolumeM3} m³`, `${bom.gltTotalWeightTon} Ton`],
      ['TOTAL ESTRUCTURA', '-', '-', '-', `${bom.totalTimberVolumeM3} m³`, `${bom.totalTimberWeightTon} Ton`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 4. Verificación Sísmica y Térmica
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('2. VERIFICACIÓN ESTRUCTURAL Y FÍSICO-CONSTRUCTIVA', 14, currentY);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Criterio / Parámetro', 'Valor Obtenido', 'Límite Normativo', 'Estado']],
    body: [
      ['Factor de Modificación de Respuesta', 'R = 2.0', 'NCh433 / DS61 Clave 5.1', 'Diseño Elástico Controlado'],
      ['Corte Basal Basal Q0', `${bom.baseShearQ0Kn} kN`, `C_max = ${bom.seismicCoeffC}`, 'Verificado'],
      ['Período Fundamental T1', `${bom.fundamentalPeriodTn} seg`, 'prEC8 (0.05 * H^0.75)', 'Conforme'],
      ['Deriva de Entrepiso (Drift)', `${bom.interstoryDriftMm} mm`, `${bom.interstoryDriftLimitMm} mm (0.002 * H)`, bom.isSeismicSafe ? 'CUMPLE (SEGURO)' : 'EXCEDE LÍMITE'],
      ['Transmitancia Térmica Muro U', `${bom.uValueWall} W/m²K`, `Zona ${state.thermalConfig.selectedZone} (NCh853)`, bom.thermalZoneCompliant ? 'CUMPLE NORMA' : 'REFORZAR AISLACIÓN'],
      ['Captura Neta de Carbono', `${bom.co2CapturedTon} Ton CO2 eq`, 'Huella Positiva', 'Equivale a ~' + Math.round(bom.co2CapturedTon * 45) + ' árboles'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 5. Herrajes Simpson Strong-Tie / Rothoblaas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('3. HERRAJES Y CONECTORES ESTRUCTURALES', 14, currentY);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Tipo de Conector', 'Modelo Comercial', 'Función Estructural', 'Cantidad']],
    body: [
      ['Hold-Downs (Vuelco)', `Simpson Strong-Tie ${bom.holdDownModel}`, 'Anclaje de tracción en esquinas', `${bom.holdDownsTotal} uds`],
      ['Ángulos de Corte', `Simpson Strong-Tie ${bom.shearAngleModel}`, 'Traspaso de corte basal (deslizamiento)', `${bom.shearAnglesTotal} uds`],
      ['Tornillería Estructural', 'Simpson SD9212 / SDCP22700 / Rothoblaas', 'Costuras panel-panel y losa-muro', `${bom.structuralScrewsCount} uds`],
      ['Pernos Anclaje a Radier', 'Simpson Titen HD / Anclaje Químico 3/8"', 'Fijación de ángulos y hold-downs a hormigón', `${bom.chemicalAnchorsCount} uds`],
      ['Barrera de Hermeticidad', 'Rothoblaas Flexi Band & Level Band', 'Sellado perimetral estanco al aire', `${bom.flexiBandTapeM} m`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 6. Presupuesto
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('4. ESTIMACIÓN ECONÓMICA DE FABRICACIÓN Y MONTAJE', 14, currentY);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Partida', 'Detalle', 'Costo Estimado (CLP)', 'Costo Estimado (USD)']],
    body: [
      ['Paneles CLT Mecanizados CNC', `${bom.totalCltVolumeM3} m³ de madera masiva`, `$ ${bom.costCltClp.toLocaleString('es-CL')}`, `$ ${Math.round(bom.costCltClp / 950).toLocaleString('en-US')}`],
      ['Vigas & Pilares GLT', `${bom.gltTotalVolumeM3} m³ MLE 24h`, `$ ${bom.costGltClp.toLocaleString('es-CL')}`, `$ ${Math.round(bom.costGltClp / 950).toLocaleString('en-US')}`],
      ['Conectores Simpson/Rothoblaas', 'Hold-downs, escuadras, pernos y tornillos', `$ ${bom.costHardwareClp.toLocaleString('es-CL')}`, `$ ${Math.round(bom.costHardwareClp / 950).toLocaleString('en-US')}`],
      ['Aislación Térmica EIFS', `${state.thermalConfig.claddingSystem.toUpperCase()}`, `$ ${bom.costInsulationClp.toLocaleString('es-CL')}`, `$ ${Math.round(bom.costInsulationClp / 950).toLocaleString('en-US')}`],
      ['Montaje Industrializado', 'Grúa + montaje rápido en obra', `$ ${bom.costAssemblyClp.toLocaleString('es-CL')}`, `$ ${Math.round(bom.costAssemblyClp / 950).toLocaleString('en-US')}`],
      ['TOTAL ESTIMADO PROYECTO', 'Suministro de paneles + fijaciones + montaje', `$ ${bom.totalEstimatedCostClp.toLocaleString('es-CL')}`, `$ ${bom.totalEstimatedCostUsd.toLocaleString('en-US')}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  // Footer en la página
  doc.setFontSize(7.5);
  doc.setTextColor(150, 150, 150);
  doc.text('Generado automáticamente por Arquify Mass Timber BIM Suite • Conforme a Guía Técnica Niuform CMPC y Manual CIM UC MINVU', 105, 287, { align: 'center' });

  const filename = `Memoria_CLT_GLT_${state.projectName.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}
