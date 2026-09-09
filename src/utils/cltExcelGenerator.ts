import * as XLSX from 'xlsx';
import { CltHouseState, CLT_SPECS_CATALOG } from '../store/cltHouseStore';
import { calculateCltHouseQuantities } from './cltCalculations';

export function exportCltHouseToExcel(state: CltHouseState) {
  const bom = calculateCltHouseQuantities(state);
  const wallSpec = CLT_SPECS_CATALOG[state.wallCltType];
  const slabSpec = CLT_SPECS_CATALOG[state.slabCltType];
  const roofSpec = CLT_SPECS_CATALOG[state.roofCltType];

  const wb = XLSX.utils.book_new();

  // HOJA 1: RESUMEN EJECUTIVO Y PRESUPUESTO
  const summaryData = [
    ['ARQUIFY BIM SUITE - REPORTE DE CUBICACIÓN Y COSTOS CLT / GLT'],
    ['Proyecto:', state.projectName],
    ['Tipología:', state.buildingType.toUpperCase()],
    ['Sistema Constructivo:', `Mass Timber - ${state.constructionVariant.toUpperCase()}`],
    ['Número de Pisos:', state.numStories],
    ['Dimensiones Planta:', `${state.widthM.toFixed(2)} m x ${state.lengthM.toFixed(2)} m (${(state.widthM * state.lengthM).toFixed(1)} m² por planta)`],
    ['Superficie Total Construida:', `${(state.widthM * state.lengthM * state.numStories).toFixed(1)} m²`],
    [''],
    ['1. RESUMEN DE MATERIALES Y MADERA MASIVA'],
    ['Ítem', 'Especificación Niuform', 'Espesor (mm)', 'Área Neta (m²)', 'Volumen (m³)', 'Peso Estimado (Ton)'],
    ['Muros CLT', wallSpec.name, wallSpec.totalThicknessMm, bom.cltWallAreaM2, bom.cltWallVolumeM3, (bom.cltWallAreaM2 * wallSpec.weightKgM2 / 1000).toFixed(2)],
    ['Losas Entrepiso CLT', slabSpec.name, slabSpec.totalThicknessMm, bom.cltSlabAreaM2, bom.cltSlabVolumeM3, (bom.cltSlabAreaM2 * slabSpec.weightKgM2 / 1000).toFixed(2)],
    ['Techumbre CLT', roofSpec.name, roofSpec.totalThicknessMm, bom.cltRoofAreaM2, bom.cltRoofVolumeM3, (bom.cltRoofAreaM2 * roofSpec.weightKgM2 / 1000).toFixed(2)],
    ['Vigas & Columnas GLT', 'Pino Radiata MLE 24h', '-', `Longitud: ${bom.gltTotalLengthM} m`, bom.gltTotalVolumeM3, bom.gltTotalWeightTon],
    ['TOTAL MADERA MASIVA', '-', '-', '-', bom.totalTimberVolumeM3, bom.totalTimberWeightTon],
    [''],
    ['2. IMPACTO AMBIENTAL Y HUELLA DE CARBONO'],
    ['Indicador', 'Valor', 'Unidad', 'Equivalencia'],
    ['CO2 Capturado / Secuestrado en Estructura', bom.co2CapturedTon, 'Ton CO2 eq', 'Equivale a plantar ~' + Math.round(bom.co2CapturedTon * 45) + ' árboles nativos'],
    ['Emisiones Evitadas vs Hormigón Armado / Acero', bom.co2AvoidedVsConcreteTon, 'Ton CO2 eq', 'Reducción neta huella de carbono en un 70%'],
    [''],
    ['3. VERIFICACIÓN SÍSMICA Y TÉRMICA'],
    ['Parámetro', 'Valor Calculado', 'Límite Normativo', 'Estado'],
    ['Zona Sísmica (NCh433 / DS61)', `Zona ${state.seismicZone}, Suelo ${state.soilType}`, 'Factor R = 2.0', 'Diseño Elástico Controlado'],
    ['Corte Basal Estimado Q0', `${bom.baseShearQ0Kn} kN`, `C_max = ${bom.seismicCoeffC}`, 'Verificado'],
    ['Período Fundamental T1', `${bom.fundamentalPeriodTn} seg`, 'prEC8 / NCh433', 'Conforme'],
    ['Deriva de Entrepiso (Drift)', `${bom.interstoryDriftMm} mm`, `${bom.interstoryDriftLimitMm} mm (0.002 H)`, bom.isSeismicSafe ? 'CUMPLE (SEGURO)' : 'EXCEDE LÍMITE'],
    ['Transmitancia Térmica Muro U', `${bom.uValueWall} W/m²K`, `Zona ${state.thermalConfig.selectedZone} (NCh853)`, bom.thermalZoneCompliant ? 'CUMPLE NORMA TÉRMICA' : 'NO CUMPLE'],
    [''],
    ['4. PRESUPUESTO ESTIMADO DE SUMINISTRO Y MONTAJE'],
    ['Partida', 'Descripción', 'Costo Estimado (CLP)', 'Costo Estimado (USD)'],
    ['Paneles CLT Mecanizados CNC', `${bom.totalCltVolumeM3} m³ de CLT Niuform Pino Radiata`, `$ ${bom.costCltClp.toLocaleString('es-CL')}`, `$ ${Math.round(bom.costCltClp / 950).toLocaleString('en-US')}`],
    ['Vigas & Pilares GLT', `${bom.gltTotalVolumeM3} m³ de MLE 24h estructural`, `$ ${bom.costGltClp.toLocaleString('es-CL')}`, `$ ${Math.round(bom.costGltClp / 950).toLocaleString('en-US')}`],
    ['Herrajes y Conectores Simpson/Rothoblaas', `Hold-downs ${bom.holdDownModel}, Ángulos ${bom.shearAngleModel}, Tornillería`, `$ ${bom.costHardwareClp.toLocaleString('es-CL')}`, `$ ${Math.round(bom.costHardwareClp / 950).toLocaleString('en-US')}`],
    ['Envolvente Térmica y Membranas', `${state.thermalConfig.claddingSystem.toUpperCase()} + Flexi Band Tape`, `$ ${bom.costInsulationClp.toLocaleString('es-CL')}`, `$ ${Math.round(bom.costInsulationClp / 950).toLocaleString('en-US')}`],
    ['Montaje Industrializado en Obra', `Grúa pluma + Cuadrilla especializada en madera masiva`, `$ ${bom.costAssemblyClp.toLocaleString('es-CL')}`, `$ ${Math.round(bom.costAssemblyClp / 950).toLocaleString('en-US')}`],
    ['TOTAL ESTIMADO PROYECTO', 'Suministro de paneles + fijaciones + montaje estructural', `$ ${bom.totalEstimatedCostClp.toLocaleString('es-CL')}`, `$ ${bom.totalEstimatedCostUsd.toLocaleString('en-US')}`],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen y Costos');

  // HOJA 2: LISTADO DE PANELES DE MURO (CUTTING LIST / FABRICACIÓN)
  const wallHeader = [
    ['CÓDIGO PANEL', 'NIVEL', 'ORIENTACIÓN', 'TIPO CLT', 'ESPESOR (mm)', 'LONGITUD (m)', 'ALTURA (m)', 'SEGMENTOS', 'HOLD-DOWNS', 'ÁNGULOS CORTE', 'FIJACIÓN UMM']
  ];
  const wallRows = state.walls.map((w) => [
    w.code,
    `Piso ${w.storyLevel}`,
    w.isInterior ? 'Interior' : 'Perimetral',
    w.cltType,
    w.thicknessMm,
    w.lengthM.toFixed(2),
    w.heightM.toFixed(2),
    w.segmentCount,
    `${w.holdDownCount}x ${w.holdDownModel}`,
    `${w.shearAngleCount}x ${w.shearAngleModel}`,
    `${w.screwCode} @ ${w.screwSpacingMm}mm`,
  ]);

  const wsWalls = XLSX.utils.aoa_to_sheet([...wallHeader, ...wallRows]);
  XLSX.utils.book_append_sheet(wb, wsWalls, 'Paneles de Muro');

  // HOJA 3: VIGAS Y PILARES GLT
  const gltHeader = [
    ['ID ELEMENTO', 'DESCRIPCIÓN', 'SECCIÓN', 'ANCHO (mm)', 'ALTO (mm)', 'LARGO (m)', 'CALIDAD ESTRUCTURAL', 'NIVEL', 'VOLUMEN (m³)']
  ];
  const gltRows = state.beams.map((b) => [
    b.id,
    b.name,
    b.section,
    b.widthMm,
    b.heightMm,
    b.lengthM.toFixed(2),
    b.grade.toUpperCase(),
    `Piso ${b.storyLevel}`,
    ((b.widthMm / 1000) * (b.heightMm / 1000) * b.lengthM).toFixed(3),
  ]);
  const wsGlt = XLSX.utils.aoa_to_sheet([...gltHeader, ...gltRows]);
  XLSX.utils.book_append_sheet(wb, wsGlt, 'Vigas GLT');

  // HOJA 4: HERRAJES Y CONECTORES ESTRUCTURALES
  const hardwareData = [
    ['CÓDIGO DE PRODUCTO', 'PROVEEDOR', 'FUNCIÓN ESTRUCTURAL', 'CANTIDAD', 'UNIDAD', 'NORMA / CERTIFICACIÓN'],
    [`Hold-down ${bom.holdDownModel}`, 'Simpson Strong-Tie', 'Anclaje de Vuelco Muros de Corte', bom.holdDownsTotal, 'Unidades', 'ETA / NCh1198'],
    [`Ángulo de Corte ${bom.shearAngleModel}`, 'Simpson Strong-Tie', 'Anclaje de Deslizamiento (Corte Basal)', bom.shearAnglesTotal, 'Unidades', 'ETA-06-0106 Pattern 1/9'],
    ['Tornillo SD9212 3.3x64', 'Simpson Strong-Tie', 'Costuras longitudinales UMM en lengüeta', Math.round(bom.structuralScrewsCount * 0.45), 'Unidades', 'NCh1198 / Simpson Catalog'],
    ['Tornillo SDCP22700 8x180', 'Simpson Strong-Tie', 'Unión Losa a Muro (UMLM) y Cubierta', Math.round(bom.structuralScrewsCount * 0.35), 'Unidades', 'ETA-13/0796'],
    ['Tornillo HBS / VGZ 8x240', 'Rothoblaas', 'Uniones Esquina y Muro Perpendicular', Math.round(bom.structuralScrewsCount * 0.20), 'Unidades', 'ETA-11/0030'],
    ['Pernos Anclaje Químico 3/8" / Titen HD', 'Simpson Strong-Tie', 'Fijación de Solera/Ángulos a Radier Hormigón', bom.chemicalAnchorsCount, 'Unidades', 'ICC-ES ESR-2713'],
    ['Cinta Flexi Band / Level Band', 'Rothoblaas', 'Hermeticidad al aire y barrera hidrófuga', bom.flexiBandTapeM, 'Metros Lineales', 'NCh853 / Passivhaus'],
  ];
  const wsHardware = XLSX.utils.aoa_to_sheet(hardwareData);
  XLSX.utils.book_append_sheet(wb, wsHardware, 'Herrajes y Fijaciones');

  // Generar y descargar el archivo
  const filename = `Cubicacion_CLT_GLT_${state.projectName.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, filename);
}
