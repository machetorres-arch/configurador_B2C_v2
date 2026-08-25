import * as XLSX from 'xlsx';
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

export function exportConcreteHouseToExcel(
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

  const wb = XLSX.utils.book_new();

  // --- HOJA 1: RESUMEN EJECUTIVO ---
  const summaryRows = [
    ['MEMORIA DE CUBICACIÓN Y PRESUPUESTO - CASA HORMIGÓN ARMADO'],
    ['Normativa Aplicada: NCh430.Of2008 / D.S. N°60 / NCh170:2016 / Manual ICH'],
    ['Fecha de Emisión:', new Date().toLocaleDateString('es-CL')],
    [''],
    ['1. PARÁMETROS GENERALES DEL PROYECTO'],
    ['Superficie Construida Total:', `${metrics.totalBuiltAreaM2.toFixed(1)} m²`],
    ['Huella en Planta:', `${metrics.footprintAreaM2.toFixed(1)} m² (${(dims.width / 100).toFixed(2)} x ${(dims.length / 100).toFixed(2)} m)`],
    ['Altura Libre de Muros:', `${(dims.wallHeight / 100).toFixed(2)} m`],
    ['Niveles:', dims.levels],
    ['Espesor de Muros:', `${wallThicknessMm} mm (${meshType === 'malla_central' ? 'Malla Central' : 'Doble Malla'})`],
    ['Calidad de Hormigón:', `${concreteGrade.replace('_', ' / ')} (Cono: ${concreteSlump === 'fluido_18cm' ? '≥18 cm Fluido' : '10-12 cm'})`],
    ['Tipo de Fundación:', foundationType === 'losa_fundacion_suples' ? 'Losa de Fundación con Suples (ICH Lám. 17/29)' : 'Cimientos Corridos + Radier (ICH Lám. 20/21)'],
    ['Solución de Cielo / Losa:', slabType.replace(/_/g, ' ')],
    ['Acero de Refuerzo:', `${rebarQuality.replace('_', '-')} + Mallas AT56-50H`],
    [''],
    ['2. RESUMEN DE CUBICACIÓN GLOBAL'],
    ['Volumen Total de Hormigón:', `${metrics.totalConcreteM3.toFixed(2)} m³`, `(~ ${metrics.mixerTruckLoads} camiones mixer 7m³)`],
    ['Superficie Total de Moldaje:', `${metrics.totalFormworkM2.toFixed(2)} m²`, `(${metrics.releaseAgentLiters} L de desmoldante)`],
    ['Peso Total de Acero / Enfierradura:', `${metrics.totalSteelKg.toFixed(1)} kg`, `(Cuantía media: ${metrics.steelRatioKgM3.toFixed(1)} kg/m³)`],
    ['Total Vanos (Puertas y Ventanas):', `${metrics.totalOpeningsCount} unidades`, `(${metrics.openingsAreaM2.toFixed(2)} m² de vanos descontados)`],
    [''],
    ['3. PRESUPUESTO ESTIMATIVO DE OBRA GRUESA'],
    ['Costo Total Estimado:', `$ ${metrics.totalCostClp.toLocaleString('es-CL')} CLP`],
    ['Costo por m² Construido:', `$ ${metrics.costPerM2Clp.toLocaleString('es-CL')} CLP/m²`],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 38 }, { wch: 25 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Ejecutivo');

  // --- HOJA 2: LISTADO DE PARTIDAS (BOM) ---
  const bomHeaders = [
    ['Ítem', 'Categoría', 'Subpartida', 'Descripción Técnica', 'Especificación / Dimensión', 'Unid.', 'Cantidad', 'P. Unitario ($)', 'Total ($)', 'Norma Ref.']
  ];

  const bomRows = metrics.items.map((it, idx) => [
    idx + 1,
    it.category,
    it.subCategory || '-',
    it.name,
    it.spec,
    it.unit,
    it.quantity,
    it.unitPriceClp,
    it.totalPriceClp,
    it.normReference,
  ]);

  // Fila de total
  bomRows.push([
    '', '', '', 'TOTAL PRESUPUESTO OBRA GRUESA HA', '', '', '', '', metrics.totalCostClp, ''
  ]);

  const wsBOM = XLSX.utils.aoa_to_sheet([...bomHeaders, ...bomRows]);
  wsBOM['!cols'] = [
    { wch: 6 },
    { wch: 20 },
    { wch: 22 },
    { wch: 42 },
    { wch: 45 },
    { wch: 8 },
    { wch: 12 },
    { wch: 15 },
    { wch: 16 },
    { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(wb, wsBOM, 'Partidas & Presupuesto');

  // --- HOJA 3: DETALLE DE VANOS Y REFUERZOS SÍSMICOS ---
  const openingsHeaders = [
    ['N°', 'Tipo', 'Nombre Vano', 'Muro', 'Ancho (cm)', 'Alto (cm)', 'Antepecho (cm)', 'Área (m²)', 'Refuerzo 45°', 'Dintel Rebar', 'Criterio Sísmico']
  ];

  const openingsRows = openings.map((op, idx) => [
    idx + 1,
    op.type === 'door' ? 'Puerta' : 'Ventana',
    op.name,
    op.wall.toUpperCase(),
    op.width,
    op.height,
    op.sillHeight,
    Number(((op.width * op.height) / 10000).toFixed(2)),
    op.hasDiagonalRebar ? '4 barras Ø10 a 45°' : 'Estándar',
    `2 Ø${op.lintelRebarDiameter || 10} pasados 50cm`,
    'Control fisuración NCh430 / ICH',
  ]);

  const wsOpenings = XLSX.utils.aoa_to_sheet([...openingsHeaders, ...openingsRows]);
  wsOpenings['!cols'] = [
    { wch: 5 },
    { wch: 10 },
    { wch: 28 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
    { wch: 12 },
    { wch: 22 },
    { wch: 25 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsOpenings, 'Detalle Vanos y Refuerzos');

  // Descarga
  const filename = `Cubicacion_Casa_Hormigon_${dims.width / 100}x${dims.length / 100}m_${wallThicknessMm}mm_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
