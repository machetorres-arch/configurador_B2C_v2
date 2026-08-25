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

export interface ConcreteBomItem {
  id: string;
  category: 'Hormigones' | 'Moldajes' | 'Enfierradura' | 'Accesorios & Químicos';
  subCategory?: string;
  name: string;
  spec: string;
  unit: 'm³' | 'm²' | 'kg' | 'un' | 'ml' | 'lt' | 'tira (6m)' | 'plancha';
  quantity: number;
  unitPriceClp: number;
  totalPriceClp: number;
  normReference: string;
}

export interface ConcreteSummaryMetrics {
  totalBuiltAreaM2: number;
  footprintAreaM2: number;
  netWallAreaM2: number;
  grossWallAreaM2: number;
  openingsAreaM2: number;
  totalOpeningsCount: number;

  // Volúmenes Hormigón (m³)
  concreteWallM3: number;
  concreteFoundationM3: number;
  concreteSlabM3: number;
  concreteLeanM3: number; // emplantillado
  totalConcreteM3: number;
  mixerTruckLoads: number; // Camiones de 7 m³

  // Moldajes (m²)
  wallFormworkM2: number;
  slabFormworkM2: number;
  foundationFormworkM2: number;
  totalFormworkM2: number;
  releaseAgentLiters: number; // desmoldante

  // Enfierradura (kg)
  meshWeightKg: number;
  meshSheetsCount: number; // planchas 2.6x5.0m
  rebarWeightKg: number; // Barras A630-420H
  stirrupsAndTiesWeightKg: number; // Trabas y estribos
  totalSteelKg: number;
  steelRatioKgM3: number; // kg acero / m³ hormigón
  tieWireKg: number; // Alambre #18
  plasticSpacersCount: number; // Calugas / ruedas separadoras

  // Costo Estimado
  totalCostClp: number;
  costPerM2Clp: number;

  items: ConcreteBomItem[];
}

// Pesos nominales de acero según NCh204 y Manual ICH
export const STEEL_BAR_WEIGHT_KG_M: Record<number, number> = {
  6: 0.222,
  8: 0.395,
  10: 0.617,
  12: 0.888,
  16: 1.580,
  18: 2.000,
  22: 2.980,
  25: 3.850,
};

// Mallas AT56-50H estándar Chile (Mallas Electrosoldadas ICH pág 13-14)
export const MESH_WEIGHT_KG_M2: Record<number, { kgM2: number; name: string }> = {
  4.2: { kgM2: 1.45, name: 'Malla C-139 (Ø4.2 @15x15 cm)' },
  5.0: { kgM2: 2.05, name: 'Malla C-188 (Ø5.0 @15x15 cm)' },
  6.0: { kgM2: 2.96, name: 'Malla C-257 (Ø6.0 @15x15 cm)' },
  7.0: { kgM2: 4.02, name: 'Malla C-335 (Ø7.0 @15x15 cm)' },
  8.0: { kgM2: 5.26, name: 'Malla C-435 (Ø8.0 @15x15 cm)' },
};

// Precios de referencia industrial en Chile (CLP)
export const CONCRETE_DEFAULT_PRICES = {
  concreteG20_M3: 82000,    // H25 Hormigón bombeable cono 18cm
  concreteG25_M3: 89000,    // H30 Hormigón fluido
  concreteG30_M3: 98000,    // H35 Alta resistencia
  concreteLean_M3: 65000,   // H5/H10 Emplantillado
  formworkRental_M2: 14500, // Arriendo/faena moldaje metálico/fenólico
  rebarA630_Kg: 1350,       // Acero corrugado A630-420H dimensionado
  meshAT56_Kg: 1450,        // Malla electrosoldada AT56-50H
  spacers_Un: 180,          // Caluga / rueda separadora plástica
  tieWire_Kg: 2200,         // Alambre recocido #18
  releaseAgent_Lt: 4500,    // Desmoldante base vegetal / mineral
  vaporBarrier_M2: 850,     // Film polietileno 0.2mm
};

export function calculateConcreteHouseBOM(
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
): ConcreteSummaryMetrics {
  const widthM = dims.width / 100;
  const lengthM = dims.length / 100;
  const wallHeightM = dims.wallHeight / 100;
  const wallThicknessM = wallThicknessMm / 1000;
  const levels = dims.levels;

  // 1. Áreas
  const footprintAreaM2 = widthM * lengthM;
  const totalBuiltAreaM2 = footprintAreaM2 * levels;

  // Perímetro exterior
  const exteriorPerimeterM = 2 * (widthM + lengthM);
  const grossExteriorWallAreaM2 = exteriorPerimeterM * wallHeightM * levels;

  // Muros interiores
  let interiorWallAreaM2 = 0;
  interiorWalls.forEach((w) => {
    const dx = (w.endX - w.startX) / 100;
    const dz = (w.endZ - w.startZ) / 100;
    const len = Math.sqrt(dx * dx + dz * dz);
    interiorWallAreaM2 += len * wallHeightM;
  });

  const grossWallAreaM2 = grossExteriorWallAreaM2 + interiorWallAreaM2;

  // Vanos
  let openingsAreaM2 = 0;
  let openingsPerimeterM = 0;
  let windowsCount = 0;
  let doorsCount = 0;

  openings.forEach((op) => {
    const wM = op.width / 100;
    const hM = op.height / 100;
    openingsAreaM2 += wM * hM;
    openingsPerimeterM += 2 * (wM + hM);
    if (op.type === 'door') doorsCount++;
    else windowsCount++;
  });

  const netWallAreaM2 = Math.max(1, grossWallAreaM2 - openingsAreaM2);
  const totalOpeningsCount = openings.length;

  // 2. Volúmenes de Hormigón
  const concreteWallM3 = netWallAreaM2 * wallThicknessM * 1.05; // 5% merma

  let concreteFoundationM3 = 0;
  let concreteLeanM3 = 0; // emplantillado
  let foundationFormworkM2 = 0;

  if (foundationType === 'losa_fundacion_suples') {
    // Losa de fundación e=12 a 15cm + viga borde con diente perimetral inclinado (ICH Lám. 17/29)
    const slabThickM = 0.12;
    const beamExtraM3 = exteriorPerimeterM * 0.30 * 0.25; // Diente perimetral 30x25cm
    concreteFoundationM3 = (footprintAreaM2 * slabThickM + beamExtraM3) * 1.05;
    concreteLeanM3 = (footprintAreaM2 * 0.05); // 5cm emplantillado
    foundationFormworkM2 = exteriorPerimeterM * (slabThickM + 0.25);
  } else {
    // Cimiento corrido (0.40 x 0.60 m) + sobrecimiento + radier interior e=10cm (ICH Lám. 20/21)
    const footingM3 = exteriorPerimeterM * 0.40 * 0.60;
    const stemWallM3 = exteriorPerimeterM * wallThicknessM * 0.30;
    const slabM3 = (footprintAreaM2 - exteriorPerimeterM * wallThicknessM) * 0.10;
    concreteFoundationM3 = (footingM3 + stemWallM3 + slabM3) * 1.05;
    concreteLeanM3 = exteriorPerimeterM * 0.50 * 0.05; // 5cm bajo cimiento corrido
    foundationFormworkM2 = exteriorPerimeterM * (0.60 + 0.30) * 2;
  }

  // Losa de Cielo / Entrepiso
  let concreteSlabM3 = 0;
  let slabFormworkM2 = 0;
  if (levels === 2) {
    // Entrepiso losa hormigón e=12cm + Cubierta
    concreteSlabM3 += footprintAreaM2 * 0.12 * 1.05;
    slabFormworkM2 += footprintAreaM2;
  }
  if (slabType.startsWith('losa_hormigon')) {
    const thick = slabType === 'losa_hormigon_15cm' ? 0.15 : 0.12;
    concreteSlabM3 += (footprintAreaM2 * thick) * 1.05;
    slabFormworkM2 += footprintAreaM2;
  } else {
    // Cadena de coronación perimetral (0.15 x 0.20 m)
    concreteSlabM3 += (exteriorPerimeterM * wallThicknessM * 0.20) * 1.05;
  }

  const totalConcreteM3 = concreteWallM3 + concreteFoundationM3 + concreteSlabM3 + concreteLeanM3;
  const mixerTruckLoads = Math.ceil(totalConcreteM3 / 7); // Camión mixer de 7 m³

  // 3. Moldajes (m²)
  // Muros: 2 caras de contacto + testeros de vanos y cantos
  const wallFormworkM2 = (netWallAreaM2 * 2) + (openingsPerimeterM * wallThicknessM);
  const totalFormworkM2 = wallFormworkM2 + slabFormworkM2 + foundationFormworkM2;
  const releaseAgentLiters = Math.ceil(totalFormworkM2 / 15); // 1L / 15m²

  // 4. Enfierradura & Acero (kg)
  const meshInfo = MESH_WEIGHT_KG_M2[meshDiameterMm] || MESH_WEIGHT_KG_M2[5.0];
  const meshMultiplier = meshType === 'malla_doble' ? 2 : 1;
  const meshNetAreaM2 = netWallAreaM2 * meshMultiplier * 1.10; // 10% traslapes
  const meshWeightKg = meshNetAreaM2 * meshInfo.kgM2;
  const meshSheetsCount = Math.ceil(meshNetAreaM2 / (2.6 * 5.0)); // Planchas estándar 2.6x5.0m

  // Barras longitudinales A630-420H (NCh204)
  // Esquinas (4 esquinas x 4 barras x altura x niveles)
  const cornersCount = 4;
  const cornerBarsPerCorner = 4;
  const cornerRebarLengthM = cornersCount * cornerBarsPerCorner * (wallHeightM * levels + 0.6); // con anclaje a fundación
  const cornerRebarKg = cornerRebarLengthM * STEEL_BAR_WEIGHT_KG_M[12]; // Ø12

  // Dinteles y antepechos de vanos (2 barras Ø12 arriba + 2 barras Ø10 abajo extendidas 40db = 50cm a c/lado)
  let lintelRebarLengthM = 0;
  openings.forEach((op) => {
    const wM = op.width / 100;
    lintelRebarLengthM += (wM + 1.0) * 2; // Dintel
    if (op.type === 'window') {
      lintelRebarLengthM += (wM + 0.8) * 2; // Antepecho
    }
  });
  const lintelRebarKg = lintelRebarLengthM * STEEL_BAR_WEIGHT_KG_M[12];

  // Refuerzos Diagonales en esquinas de ventanas a 45° (4 barras Ø10 x 0.80m por ventana según Manual ICH)
  const diagonalRebarLengthM = windowsCount * 4 * 0.80;
  const diagonalRebarKg = diagonalRebarLengthM * STEEL_BAR_WEIGHT_KG_M[10];

  // Coronaciones / Vigas de amarre (4 barras Ø12 perimetrales)
  const beamLongitudinalM = exteriorPerimeterM * 4 * levels;
  const beamRebarKg = beamLongitudinalM * STEEL_BAR_WEIGHT_KG_M[12];

  // Armadura de fundación (suples / armadura cimiento corrido)
  const foundationRebarKg = exteriorPerimeterM * 4 * STEEL_BAR_WEIGHT_KG_M[12] + (footprintAreaM2 * 2.5);

  const rebarWeightKg = cornerRebarKg + lintelRebarKg + diagonalRebarKg + beamRebarKg + foundationRebarKg;

  // Trabas y Estribos de Confinamiento (Ø8 cada 15-20cm en esquinas y vigas)
  const stirrupCount = Math.ceil((cornersCount * wallHeightM * levels / 0.15) + (exteriorPerimeterM * levels / 0.20));
  const stirrupLengthEachM = (wallThicknessM * 2 + 0.20 * 2) + 0.15; // gancho 135°
  const stirrupsAndTiesWeightKg = stirrupCount * stirrupLengthEachM * STEEL_BAR_WEIGHT_KG_M[8];

  const totalSteelKg = meshWeightKg + rebarWeightKg + stirrupsAndTiesWeightKg;
  const steelRatioKgM3 = totalSteelKg / Math.max(1, (concreteWallM3 + concreteFoundationM3 + concreteSlabM3));

  // Accesorios
  const tieWireKg = Math.ceil(totalSteelKg * 0.015); // 1.5% del peso del acero
  const plasticSpacersCount = Math.ceil((netWallAreaM2 * meshMultiplier * 4) + (footprintAreaM2 * 4)); // 4 separadores/m²

  // 5. Ítems detallados BOM para Excel y UI
  const items: ConcreteBomItem[] = [
    // Hormigones
    {
      id: 'conc-1',
      category: 'Hormigones',
      subCategory: 'Muros Estructurales',
      name: `Hormigón Estructural ${concreteGrade.replace('_', ' / ')}`,
      spec: `Muros e=${wallThicknessMm}mm, cono ${concreteSlump === 'fluido_18cm' ? '≥18 cm (Fluido)' : '10-12 cm'}, NCh170:2016`,
      unit: 'm³',
      quantity: Number(concreteWallM3.toFixed(2)),
      unitPriceClp: CONCRETE_DEFAULT_PRICES.concreteG20_M3,
      totalPriceClp: Math.round(concreteWallM3 * CONCRETE_DEFAULT_PRICES.concreteG20_M3),
      normReference: 'NCh170 / NCh430 / DS60',
    },
    {
      id: 'conc-2',
      category: 'Hormigones',
      subCategory: 'Fundaciones',
      name: `Hormigón Fundación ${concreteGrade.replace('_', ' / ')}`,
      spec: `${foundationType === 'losa_fundacion_suples' ? 'Losa de Fundación + Viga perimetral' : 'Cimiento corrido + Radier interior'}, NCh170`,
      unit: 'm³',
      quantity: Number(concreteFoundationM3.toFixed(2)),
      unitPriceClp: CONCRETE_DEFAULT_PRICES.concreteG20_M3,
      totalPriceClp: Math.round(concreteFoundationM3 * CONCRETE_DEFAULT_PRICES.concreteG20_M3),
      normReference: 'NCh170:2016 / ICH Cap. II-III',
    },
    {
      id: 'conc-3',
      category: 'Hormigones',
      subCategory: 'Losas & Cadenas',
      name: `Hormigón Losa / Coronaciones ${concreteGrade.replace('_', ' / ')}`,
      spec: `${slabType === 'cadena_coronacion_techo_liviano' ? 'Cadenas perimetrales de amarre' : 'Losa de hormigón armado e=12cm'}, NCh170`,
      unit: 'm³',
      quantity: Number(concreteSlabM3.toFixed(2)),
      unitPriceClp: CONCRETE_DEFAULT_PRICES.concreteG20_M3,
      totalPriceClp: Math.round(concreteSlabM3 * CONCRETE_DEFAULT_PRICES.concreteG20_M3),
      normReference: 'NCh430 / ICH Cap. IV',
    },
    {
      id: 'conc-4',
      category: 'Hormigones',
      subCategory: 'Sello de Fundación',
      name: 'Emplantillado Hormigón Pobre H5 / H10',
      spec: 'Espesor 5cm bajo fundaciones para nivelación y recubrimiento limpio',
      unit: 'm³',
      quantity: Number(concreteLeanM3.toFixed(2)),
      unitPriceClp: CONCRETE_DEFAULT_PRICES.concreteLean_M3,
      totalPriceClp: Math.round(concreteLeanM3 * CONCRETE_DEFAULT_PRICES.concreteLean_M3),
      normReference: 'NCh170 / ICH Lám. 17, 20, 27',
    },

    // Moldajes
    {
      id: 'mold-1',
      category: 'Moldajes',
      subCategory: 'Muros',
      name: 'Moldaje Industrializado para Muros (2 Caras)',
      spec: `Superficie de contacto neta descontando vanos + testeros de puertas/ventanas`,
      unit: 'm²',
      quantity: Number(wallFormworkM2.toFixed(2)),
      unitPriceClp: CONCRETE_DEFAULT_PRICES.formworkRental_M2,
      totalPriceClp: Math.round(wallFormworkM2 * CONCRETE_DEFAULT_PRICES.formworkRental_M2),
      normReference: 'NCh430 / Criterio ICH',
    },
    {
      id: 'mold-2',
      category: 'Moldajes',
      subCategory: 'Losas & Fundaciones',
      name: 'Moldaje Fondos de Losa / Sobrecimientos',
      spec: 'Encofrado horizontal con alzaprimas y perfiles de borde',
      unit: 'm²',
      quantity: Number((slabFormworkM2 + foundationFormworkM2).toFixed(2)),
      unitPriceClp: CONCRETE_DEFAULT_PRICES.formworkRental_M2,
      totalPriceClp: Math.round((slabFormworkM2 + foundationFormworkM2) * CONCRETE_DEFAULT_PRICES.formworkRental_M2),
      normReference: 'NCh430:2008',
    },
    {
      id: 'mold-3',
      category: 'Moldajes',
      subCategory: 'Químicos de Desmolde',
      name: 'Desmoldante Químico Biodegradable',
      spec: 'Rendimiento 15 m²/litro para acabado de hormigón visto liso sin manchas',
      unit: 'lt',
      quantity: releaseAgentLiters,
      unitPriceClp: CONCRETE_DEFAULT_PRICES.releaseAgent_Lt,
      totalPriceClp: releaseAgentLiters * CONCRETE_DEFAULT_PRICES.releaseAgent_Lt,
      normReference: 'Manual ICH pág. 7',
    },

    // Enfierradura
    {
      id: 'enf-1',
      category: 'Enfierradura',
      subCategory: 'Mallas Electrosoldadas',
      name: `${meshInfo.name} (${meshMultiplier === 2 ? 'Doble Malla' : 'Malla Central'})`,
      spec: `Acero trefilado corrugado AT56-50H, espaciamiento 15x15cm, NCh218/ASTM A497`,
      unit: 'kg',
      quantity: Number(meshWeightKg.toFixed(1)),
      unitPriceClp: CONCRETE_DEFAULT_PRICES.meshAT56_Kg,
      totalPriceClp: Math.round(meshWeightKg * CONCRETE_DEFAULT_PRICES.meshAT56_Kg),
      normReference: 'NCh204 / Manual ICH pág. 11-14',
    },
    {
      id: 'enf-2',
      category: 'Enfierradura',
      subCategory: 'Barras Longitudinales',
      name: `Barras de Refuerzo Dúctiles ${rebarQuality.replace('_', '-')}`,
      spec: `Barras corrugadas Ø10, Ø12, Ø16 en esquinas, coronación y dinteles de vanos`,
      unit: 'kg',
      quantity: Number(rebarWeightKg.toFixed(1)),
      unitPriceClp: CONCRETE_DEFAULT_PRICES.rebarA630_Kg,
      totalPriceClp: Math.round(rebarWeightKg * CONCRETE_DEFAULT_PRICES.rebarA630_Kg),
      normReference: 'NCh204:2020 / NCh430',
    },
    {
      id: 'enf-3',
      category: 'Enfierradura',
      subCategory: 'Confinamiento',
      name: 'Trabas, Estribos y Refuerzos 45° en Vanos',
      spec: `Ganchos estándar 135° (6db ≥ 75mm) Ø8 y horquillas diagonales de vanos`,
      unit: 'kg',
      quantity: Number(stirrupsAndTiesWeightKg.toFixed(1)),
      unitPriceClp: CONCRETE_DEFAULT_PRICES.rebarA630_Kg,
      totalPriceClp: Math.round(stirrupsAndTiesWeightKg * CONCRETE_DEFAULT_PRICES.rebarA630_Kg),
      normReference: 'Manual ICH pág. 9, 22, 23, 30',
    },

    // Accesorios & Fijaciones
    {
      id: 'acc-1',
      category: 'Accesorios & Químicos',
      subCategory: 'Separadores',
      name: meshType === 'malla_central' ? 'Ruedas Separadoras Plásticas para Malla Central' : 'Separadores H de Malla Doble y Silletas',
      spec: `Garantiza recubrimiento normativo de ${wallThicknessMm <= 100 ? '20mm' : '25mm'}, densidad 4 un/m²`,
      unit: 'un',
      quantity: plasticSpacersCount,
      unitPriceClp: CONCRETE_DEFAULT_PRICES.spacers_Un,
      totalPriceClp: plasticSpacersCount * CONCRETE_DEFAULT_PRICES.spacers_Un,
      normReference: 'Manual ICH pág. 11-13 (Fig. 7, 8, 9)',
    },
    {
      id: 'acc-2',
      category: 'Accesorios & Químicos',
      subCategory: 'Amarras',
      name: 'Alambre Negro Recocido #18',
      spec: 'Alambre para amarre de armaduras y mallas en nudos estructurales',
      unit: 'kg',
      quantity: tieWireKg,
      unitPriceClp: CONCRETE_DEFAULT_PRICES.tieWire_Kg,
      totalPriceClp: tieWireKg * CONCRETE_DEFAULT_PRICES.tieWire_Kg,
      normReference: 'Manual ICH pág. 9 (Sec. 4.10)',
    },
    {
      id: 'acc-3',
      category: 'Accesorios & Químicos',
      subCategory: 'Aislación de Humedad',
      name: 'Barrera de Vapor Film Polietileno 0.20 mm',
      spec: 'Colocado bajo radier/losa de fundación con traslapes de 20cm',
      unit: 'm²',
      quantity: Number((footprintAreaM2 * 1.15).toFixed(1)),
      unitPriceClp: CONCRETE_DEFAULT_PRICES.vaporBarrier_M2,
      totalPriceClp: Math.round(footprintAreaM2 * 1.15 * CONCRETE_DEFAULT_PRICES.vaporBarrier_M2),
      normReference: 'NCh170 / Buenas Prácticas ICH',
    },
  ];

  const totalCostClp = items.reduce((acc, it) => acc + it.totalPriceClp, 0);
  const costPerM2Clp = totalBuiltAreaM2 > 0 ? Math.round(totalCostClp / totalBuiltAreaM2) : 0;

  return {
    totalBuiltAreaM2,
    footprintAreaM2,
    netWallAreaM2,
    grossWallAreaM2,
    openingsAreaM2,
    totalOpeningsCount,

    concreteWallM3,
    concreteFoundationM3,
    concreteSlabM3,
    concreteLeanM3,
    totalConcreteM3,
    mixerTruckLoads,

    wallFormworkM2,
    slabFormworkM2,
    foundationFormworkM2,
    totalFormworkM2,
    releaseAgentLiters,

    meshWeightKg,
    meshSheetsCount,
    rebarWeightKg,
    stirrupsAndTiesWeightKg,
    totalSteelKg,
    steelRatioKgM3,
    tieWireKg,
    plasticSpacersCount,

    totalCostClp,
    costPerM2Clp,

    items,
  };
}
