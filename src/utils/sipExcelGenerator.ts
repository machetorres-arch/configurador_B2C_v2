import * as XLSX from 'xlsx';
import {
  SipHouseDimensions,
  FoundationType,
  ExteriorCladding,
  RoofCladding,
  InteriorCeiling,
  FlooringType,
  SipOpening,
  SipMepNetwork,
  SipCoreType,
  SipWallThickness,
  SipRoofThickness,
  SipFloorThickness,
  SIP_CORE_SPECS,
  InteriorWall,
} from '../store/sipHouseStore';

export interface SipBomItem {
  especialidad: string;
  codigo: string;
  item: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precioUnitarioClp: number;
  totalClp: number;
  proveedor: string;
}

export function calculateSipHouseQuantities(
  dim: SipHouseDimensions,
  foundationType: FoundationType,
  extCladding: ExteriorCladding,
  roofCladding: RoofCladding,
  interiorCeiling: InteriorCeiling,
  flooringType: FlooringType,
  openings?: SipOpening[],
  mepNetwork?: SipMepNetwork,
  coreType: SipCoreType = 'eps_15kg',
  wallThicknessMm: SipWallThickness = 114,
  roofThicknessMm: SipRoofThickness = 210,
  floorThicknessMm: SipFloorThickness = 162,
  interiorWalls?: InteriorWall[]
) {
  // Dimensiones en metros
  const lengthM = dim.length / 100;
  const widthM = dim.width / 100;
  const eaveHM = dim.eaveHeight / 100;
  const ridgeHM = dim.ridgeHeight / 100;
  const overhangM = (dim.overhang || 25) / 100;

  const coreSpec = SIP_CORE_SPECS[coreType] || SIP_CORE_SPECS.eps_15kg;

  // 1. Superficie Útil de Piso
  const totalFloorM2 = lengthM * widthM;

  // 2. Paneles SIP Losa Piso (1.22 x 2.44m = 2.977 m²)
  const floorSipCount = Math.ceil((totalFloorM2 / (1.22 * 2.44)) * 1.1);

  // 3. Muros Perimetrales SIP
  const perimeterM = 2 * (lengthM + widthM);
  const rectangularWallAreaM2 = perimeterM * eaveHM;
  const gableRoofHeightM = Math.max(0.3, ridgeHM - eaveHM);
  const gableTrianglesAreaM2 = 2 * (0.5 * widthM * gableRoofHeightM);
  const extWallAreaM2 = rectangularWallAreaM2 + gableTrianglesAreaM2;
  const wallExtSip114Count = Math.ceil((extWallAreaM2 / (1.22 * 2.44)) * 1.12);

  // 4. Tabiquería Interior SIP 90 mm
  let intWallLinM = 0;
  let intDoorsCount = 0;
  if (interiorWalls && interiorWalls.length > 0) {
    for (const iw of interiorWalls) {
      if (iw.visible) {
        const len = Math.hypot((iw.endX - iw.startX) / 100, (iw.endZ - iw.startZ) / 100);
        intWallLinM += len;
        if (iw.openings) intDoorsCount += iw.openings.length;
      }
    }
  } else {
    intWallLinM = totalFloorM2 * 0.4;
    intDoorsCount = 2;
  }
  const intWallAreaM2 = intWallLinM * eaveHM;
  const wallIntSip90Count = Math.ceil((intWallAreaM2 / (1.22 * 2.44)) * 1.1);

  // 5. Techumbre SIP a Dos Aguas
  const roofRafterLength = Math.hypot(widthM / 2 + overhangM, gableRoofHeightM) + overhangM;
  const totalRoofLengthM = lengthM + 2 * overhangM;
  const totalRoofAreaM2 = 2 * (roofRafterLength * totalRoofLengthM);
  const roofSip210Count = Math.ceil((totalRoofAreaM2 / (1.22 * 2.44)) * 1.12);

  // 6. Tablillas de OSB (Surface Splines) 11.1mm x 100mm x 2.37m (LP / SIPA NTA NER-1038)
  // 2 tablillas por cada unión vertical y horizontal entre paneles SIP cada 1.22m
  const horizontalJointsWalls = eaveHM > 2.44 ? Math.ceil(perimeterM / 1.22) + Math.ceil((intWallAreaM2 / eaveHM) / 1.22) : 0;
  const verticalJointsWalls = Math.ceil(perimeterM / 1.22) + Math.ceil((intWallAreaM2 / eaveHM) / 1.22);
  const roofJointsCount = Math.ceil(totalRoofLengthM / 1.22) * 2;
  const floorJointsCount = Math.ceil(lengthM / 1.22);
  const totalSurfaceSplinesOSB = (verticalJointsWalls + horizontalJointsWalls + roofJointsCount + floorJointsCount) * 2;

  // 7. Maderas Estructurales - Despiece y Cálculo por Largos Comerciales Estándar (3.20m, 4.00m)
  // A. Losa de Piso (Pino 2x6" o 2x8" según espesor de losa):
  const floorJoistsCount = Math.ceil(lengthM / 1.22) + 1;
  const timberFloorNetLinM = 2 * (lengthM + widthM) + (floorJoistsCount - 2) * widthM;
  const timber2x6LinM = Math.ceil(timberFloorNetLinM * 1.08);
  const timber2x6Commercial32Count = Math.ceil(timber2x6LinM / 3.2);

  // B. Muros Perimetrales e Interiores (Pino Seco Cepillado calibrado al espesor de núcleo):
  // Solera inferior, solera superior con traslape >= 30cm, cap plate doble solera, solera de empalme horizontal intermedia (si H > 2.44m), esquineros, refuerzo de vanos 41x65/41x92mm
  const openingsCount = openings ? openings.length : 3;
  const wallStudsCount = (Math.ceil(perimeterM / 0.6) + 8) + (openingsCount * 4);
  const intermediateHorizPlatesLinM = eaveHM > 2.44 ? perimeterM : 0;
  const wallPlatesLinM = perimeterM * 3 + intermediateHorizPlatesLinM; // Solera inferior + solera superior + doble solera superior + solera intermedia (H>2.44)
  const wallStudsLinM = wallStudsCount * (eaveHM - 0.082);
  const openingsReinforcementLinM = openings
    ? openings.reduce((acc, o) => acc + (2 * (o.width / 100) + 2 * (o.height / 100)), 0)
    : 12.0;
  const timber2x4NetLinM = wallPlatesLinM + wallStudsLinM + openingsReinforcementLinM + (wallIntSip90Count * 2.44 * 1.8);
  const timber2x4LinM = Math.ceil(timber2x4NetLinM * 1.08);
  const timber2x4Commercial32Count = Math.ceil(timber2x4LinM / 3.2);

  // C. Estructura de Techo (Pino 2x8" - 41x185 mm):
  // Viga cumbrera maestra + Pares de apoyo cada 1.22m + Tapacanes y canecillos
  const roofRaftersPairsCount = Math.ceil(totalRoofLengthM / 1.22) + 1;
  const ridgeBeamLinM = totalRoofLengthM;
  const roofRaftersLinM = roofRaftersPairsCount * 2 * roofRafterLength;
  const roofFasciaLinM = 2 * totalRoofLengthM + 4 * roofRafterLength;
  const timber2x8NetLinM = ridgeBeamLinM * 2 + roofRaftersLinM + roofFasciaLinM;
  const timber2x8LinM = Math.ceil(timber2x8NetLinM * 1.08);
  const timber2x8Commercial40Count = Math.ceil(timber2x8LinM / 4.0);

  // D. Listonado para Fachada Ventilada (Rain Screen 1x4" / 2x4") y Techo Ventilado ("Cold Roof")
  const rainScreenFurringLinM = Math.ceil((perimeterM * 3.5 + totalRoofLengthM * 4) * 1.1);
  const rainScreenCommercial32Count = Math.ceil(rainScreenFurringLinM / 3.2);

  // 8. Fundaciones
  // Cálculo paramétrico estructural según NCh 1198 / NCh 433 / Manual SIP:
  // Ejes de vigas maestras distanciados cada max 1.50 m en el ancho
  const axesCountX = Math.max(2, Math.ceil(widthM / 1.5) + 1);
  // Apoyos / pilotes a lo largo de cada viga distanciados cada max 1.50 m en el largo
  const pilesCountZ = Math.max(2, Math.ceil(lengthM / 1.5) + 1);
  // Total real de pilotes / poyos de fundación
  const pilaresFundacionCount = axesCountX * pilesCountZ;

  const isConcreteFoundation =
    foundationType === 'radier_sobrecimiento' ||
    foundationType === 'platea_fundacion' ||
    foundationType === 'radier_hormigon';

  const hormigonG20M3 =
    foundationType === 'radier_sobrecimiento' || foundationType === 'radier_hormigon'
      ? Math.round((totalFloorM2 * 0.10 + perimeterM * (0.4 * 0.4 + 0.15 * 0.3)) * 10) / 10
      : foundationType === 'platea_fundacion'
      ? Math.round((totalFloorM2 * 0.18 + perimeterM * 0.3 * 0.35) * 10) / 10
      : Math.round(pilaresFundacionCount * (0.45 * 0.45 * 0.5) * 10) / 10;

  const pilotesMadera5x5Count = foundationType === 'pilotes_madera' ? pilaresFundacionCount : 0;
  const vigasMaestras2x8LinM = Math.ceil(axesCountX * lengthM * 1.05);
  const vigasMaestras40Count = Math.ceil(vigasMaestras2x8LinM / 4.0);

  // Insumos técnicos para fundaciones de hormigón según Especificación Técnica SIP
  const estabilizadoM3 = Math.round(totalFloorM2 * 0.15 * 10) / 10;
  const ripioCapilaridadM3 = Math.round(totalFloorM2 * 0.08 * 10) / 10;
  const polietileno200MicrasRollos = Math.ceil((totalFloorM2 * 1.3) / 100);
  const moldajesTerciado18mmPlacas = Math.ceil((perimeterM * 0.45) / (1.22 * 2.44));
  const mallaAcmaPlanchas = Math.ceil(totalFloorM2 / 12) * (foundationType === 'platea_fundacion' ? 2 : 1);
  const pernosAnclaje12Qty = Math.ceil(perimeterM / 0.5) + 8; // Distanciados c/40-60cm y esquinas (1/2" x 5 1/2")
  const golillasCuadradas50Qty = pernosAnclaje12Qty; // Golillas 50x50x3 mm DIN 9021
  const selloSoleraRollos = Math.ceil(perimeterM / 10); // Membrana asfáltica SBS / EPDM + Sikaflex 11FC bajo solera

  // 9. Fijaciones y Químicos según Normativa NTA NER-1038 / LP PanelSip
  // Tornillos CRS 6 x 1 1/4" a 15 cm perimetral en ambas caras
  const totalPanelsAll = floorSipCount + wallExtSip114Count + wallIntSip90Count + roofSip210Count;
  const tornillosCRSQty = Math.ceil(totalPanelsAll * 65); // ~65 tornillos CRS por panel (ambas caras cada 15cm)
  // Tornillos largos estructurales para esquinas y amarres soleras (5 1/2" a 10" cada 40 cm)
  const structuralTimberScrewsQty = Math.ceil((perimeterM * 2.5 + 4 * eaveHM * 2.5) * 1.1);
  // Sello adhesivo / Espuma de poliuretano continua para hermeticidad Blower Door (< 1 ACH50)
  const adhesivoPoliuretanoTubos = Math.ceil(totalPanelsAll * 1.8);
  // Barrera de humedad / Fieltro Asfáltico #15 / #30 (Rollos 40 m²)
  const feltRollsCount = Math.ceil((extWallAreaM2 + totalRoofAreaM2 + (isConcreteFoundation ? totalFloorM2 : 0)) / 36);

  // 10. Terminaciones Comerciales
  const volcanitaSTSheets = Math.ceil((intWallAreaM2 * 2 + rectangularWallAreaM2) / (1.2 * 2.4));
  const volcanitaRHSheets = Math.ceil((totalFloorM2 * 0.25 * eaveHM * 2) / (1.2 * 2.4));
  const tinetasPinturaLatex = Math.max(1, Math.ceil((extWallAreaM2 + totalFloorM2) / 160));
  const cajasPisoSpc = Math.ceil((totalFloorM2 * 1.08) / 2.2);
  const planchasZincalumExt = Math.ceil((extWallAreaM2 * 1.1) / (0.5 * 3.0));

  // Precios dinámicos según núcleo y espesores
  const floorPricePerSheet = floorThicknessMm >= 210 ? 58900 : floorThicknessMm >= 162 ? 48900 : 38500;
  const wallPricePerSheet = wallThicknessMm >= 162 ? 48900 : wallThicknessMm >= 114 ? 38500 : wallThicknessMm >= 90 ? 33900 : 29900;
  const roofPricePerSheet = roofThicknessMm >= 210 ? 58900 : roofThicknessMm >= 162 ? 48900 : 38500;

  const items: SipBomItem[] = [
    // Estructura SIP
    {
      especialidad: 'Estructura SIP',
      codigo: `SIP-PISO-${floorThicknessMm}`,
      item: `Panel SIP Losa Piso ${floorThicknessMm} mm (${coreSpec.name})`,
      descripcion: `OSB APA Protec 11.1mm + Núcleo ${coreSpec.name} + OSB 11.1mm. Dim: 1.22 x 2.44 m`,
      unidad: 'Placas',
      cantidad: floorSipCount,
      precioUnitarioClp: floorPricePerSheet,
      totalClp: floorSipCount * floorPricePerSheet,
      proveedor: 'PROSIP / LP Chile',
    },
    {
      especialidad: 'Estructura SIP',
      codigo: `SIP-MURO-${wallThicknessMm}`,
      item: `Panel SIP Muro Perimetral ${wallThicknessMm} mm (${coreSpec.name})`,
      descripcion: `OSB APA Protec 11.1mm + Núcleo ${coreSpec.name} + OSB 11.1mm. Dim: 1.22 x 2.44 m`,
      unidad: 'Placas',
      cantidad: wallExtSip114Count,
      precioUnitarioClp: wallPricePerSheet,
      totalClp: wallExtSip114Count * wallPricePerSheet,
      proveedor: 'PROSIP / LP Chile',
    },
    {
      especialidad: 'Estructura SIP',
      codigo: 'SIP-MURO-90',
      item: `Panel SIP Tabique Interior 90 mm (${coreSpec.name})`,
      descripcion: `OSB APA Protec 11.1mm + Núcleo ${coreSpec.name} + OSB 11.1mm. Dim: 1.22 x 2.44 m`,
      unidad: 'Placas',
      cantidad: wallIntSip90Count,
      precioUnitarioClp: 33900,
      totalClp: wallIntSip90Count * 33900,
      proveedor: 'PROSIP / LP Chile',
    },
    {
      especialidad: 'Estructura SIP',
      codigo: `SIP-TECHO-${roofThicknessMm}`,
      item: `Panel SIP Techumbre ${roofThicknessMm} mm (${coreSpec.name})`,
      descripcion: `OSB APA Protec 11.1mm + Núcleo ${coreSpec.name} + OSB 11.1mm. Dim: 1.22 x 2.44 m`,
      unidad: 'Placas',
      cantidad: roofSip210Count,
      precioUnitarioClp: roofPricePerSheet,
      totalClp: roofSip210Count * roofPricePerSheet,
      proveedor: 'PROSIP / LP Chile',
    },
    {
      especialidad: 'Estructura SIP',
      codigo: 'SIP-SPLINE-OSB',
      item: 'Tablillas Unión OSB 11.1mm x 100mm x 2.37m (Surface Splines)',
      descripcion: 'Doble tablilla de enlace en ranuras perimetrales para unión mecánica de paneles SIP (SIPA/LP)',
      unidad: 'Tiras',
      cantidad: totalSurfaceSplinesOSB,
      precioUnitarioClp: 2800,
      totalClp: totalSurfaceSplinesOSB * 2800,
      proveedor: 'LP Chile / PROSIP',
    },

    // Maderas Estructuración por Medidas Comerciales
    {
      especialidad: 'Maderas y Estructuración',
      codigo: 'MAD-PINO-2X6-3.2',
      item: 'Pino Seco Cepillado 2x6" x 3.20m (Losa SIP)',
      descripcion: `Vigas perimetrales y soleras de losa 41x138mm. (${timber2x6LinM} m. lin. = ${timber2x6Commercial32Count} tiras)`,
      unidad: 'Tiras 3.2m',
      cantidad: timber2x6Commercial32Count,
      precioUnitarioClp: 11040,
      totalClp: timber2x6Commercial32Count * 11040,
      proveedor: 'CMPC / Arauco',
    },
    {
      especialidad: 'Maderas y Estructuración',
      codigo: 'MAD-PINO-2X4-3.2',
      item: 'Pino Seco Cepillado 2x4" x 3.20m (Muros & Refuerzo Vanos)',
      descripcion: `Soleras con traslape >=30cm, cap plates y refuerzos vanos 41x92mm. (${timber2x4LinM} m. lin. = ${timber2x4Commercial32Count} tiras)`,
      unidad: 'Tiras 3.2m',
      cantidad: timber2x4Commercial32Count,
      precioUnitarioClp: 7520,
      totalClp: timber2x4Commercial32Count * 7520,
      proveedor: 'CMPC / Arauco',
    },
    {
      especialidad: 'Maderas y Estructuración',
      codigo: 'MAD-PINO-2X8-4.0',
      item: 'Pino Seco Cepillado 2x8" x 4.00m (Techo 2 Aguas)',
      descripcion: `Viga maestra cumbrera, pares de apoyo cada 1.22m y tapacanes 41x185mm. (${timber2x8LinM} m. lin. = ${timber2x8Commercial40Count} tiras)`,
      unidad: 'Tiras 4.0m',
      cantidad: timber2x8Commercial40Count,
      precioUnitarioClp: 18400,
      totalClp: timber2x8Commercial40Count * 18400,
      proveedor: 'CMPC / Arauco',
    },
    {
      especialidad: 'Maderas y Estructuración',
      codigo: 'MAD-RAIN-SCREEN-1X4',
      item: 'Listones Pino Cepillado 1x4" x 3.20m (Fachada & Techo Ventilado)',
      descripcion: `Cámara de aire y enrejillado de ventilación Rain Screen (${rainScreenFurringLinM} m. lin. = ${rainScreenCommercial32Count} tiras)`,
      unidad: 'Tiras 3.2m',
      cantidad: rainScreenCommercial32Count,
      precioUnitarioClp: 3800,
      totalClp: rainScreenCommercial32Count * 3800,
      proveedor: 'Arauco / CMPC',
    },

    // Fijaciones y Sellos Normativos
    {
      especialidad: 'Fijaciones y Químicos',
      codigo: 'FIJ-TORNILLO-CRS-1.25',
      item: 'Tornillos Trompeta CRS 6 x 1 1/4" (Cajas 1000 un)',
      descripcion: 'Fijación perimetral de tableros OSB a soleras y tablillas cada 15 cm a 1 cm del borde',
      unidad: 'Cajas (1000u)',
      cantidad: Math.max(1, Math.ceil(tornillosCRSQty / 1000)),
      precioUnitarioClp: 12900,
      totalClp: Math.max(1, Math.ceil(tornillosCRSQty / 1000)) * 12900,
      proveedor: 'Mamut / Spax',
    },
    {
      especialidad: 'Fijaciones y Químicos',
      codigo: 'FIJ-TORNILLO-MADERA-5.5',
      item: 'Tornillos Estructurales Spider / HeadLok 5 1/2" a 10"',
      descripcion: 'Unión estructural en esquinas a 90° y fijación de soleras cada 40 cm',
      unidad: 'Unid.',
      cantidad: structuralTimberScrewsQty,
      precioUnitarioClp: 850,
      totalClp: structuralTimberScrewsQty * 850,
      proveedor: 'Simpson Strong-Tie / HeadLok',
    },
    {
      especialidad: 'Fijaciones y Químicos',
      codigo: 'QUIM-SELLO-PUR-750ML',
      item: 'Espuma de Poliuretano Expansión Controlada 750ml',
      descripcion: 'Sello térmico hermético continuo en ranuras y pasadas (Blower Door Test < 1 ACH50)',
      unidad: 'Tubos',
      cantidad: adhesivoPoliuretanoTubos,
      precioUnitarioClp: 7900,
      totalClp: adhesivoPoliuretanoTubos * 7900,
      proveedor: 'Soudal / Sika',
    },
    {
      especialidad: 'Fijaciones y Químicos',
      codigo: 'BARR-FIELTRO-15-30',
      item: 'Membrana Hidrófuga / Fieltro Asfáltico #15/#30 (Rollo 40m²)',
      descripcion: 'Barrera de humedad bajo soleras de fundación y tras enrejillado ventilado',
      unidad: 'Rollos',
      cantidad: feltRollsCount,
      precioUnitarioClp: 19800,
      totalClp: feltRollsCount * 19800,
      proveedor: 'Volcán / Durex',
    },

    // Fundaciones
    ...(foundationType === 'pilotes_madera'
      ? [
          {
            especialidad: 'Fundaciones',
            codigo: 'FUND-PILOTE-5X5',
            item: 'Pilote Pino Impregnado 5x5" x 1.20m',
            descripcion: 'Pilotes de fundación con tratamiento CCA empotrados en dados G20',
            unidad: 'Unid.',
            cantidad: pilotesMadera5x5Count,
            precioUnitarioClp: 12500,
            totalClp: pilotesMadera5x5Count * 12500,
            proveedor: 'Maderas Impregnadas',
          },
          {
            especialidad: 'Fundaciones',
            codigo: 'FUND-VIGA-MAESTRA-4.0',
            item: 'Vigas Maestras 2x8" x 4.00m Impregnadas',
            descripcion: `Envigado maestro sobre pilotes CCA (${vigasMaestras2x8LinM} m. lin. = ${vigasMaestras40Count} tiras de 4.00m)`,
            unidad: 'Tiras 4.0m',
            cantidad: vigasMaestras40Count,
            precioUnitarioClp: 20800,
            totalClp: vigasMaestras40Count * 20800,
            proveedor: 'Arauco',
          },
          {
            especialidad: 'Fundaciones',
            codigo: 'FUND-DADOS-G20',
            item: 'Dados de Hormigón G20 para Apoyo de Pilotes',
            descripcion: 'Hormigón H-20 para dados de fundación 45x45x50 cm',
            unidad: 'm³',
            cantidad: hormigonG20M3,
            precioUnitarioClp: 115000,
            totalClp: Math.round(hormigonG20M3 * 115000),
            proveedor: 'Planta Hormigón Local',
          },
        ]
      : foundationType === 'radier_sobrecimiento' || foundationType === 'radier_hormigon'
      ? [
          {
            especialidad: 'Fundaciones',
            codigo: 'FUND-BASE-ESTABILIZADO',
            item: 'Árido Estabilizado Compactable (0 a 1 1/2")',
            descripcion: 'Subbase compactada al 95% Proctor Modificado e=15cm para corte de asentamientos',
            unidad: 'm³',
            cantidad: estabilizadoM3,
            precioUnitarioClp: 18500,
            totalClp: Math.round(estabilizadoM3 * 18500),
            proveedor: 'Áridos Locales',
          },
          {
            especialidad: 'Fundaciones',
            codigo: 'FUND-BASE-RIPIO-CAP',
            item: 'Ripio / Grava Limpia (Corte de Capilaridad)',
            descripcion: 'Capa granular de drenaje e=8cm que rompe capilaridad de napas freáticas',
            unidad: 'm³',
            cantidad: ripioCapilaridadM3,
            precioUnitarioClp: 19200,
            totalClp: Math.round(ripioCapilaridadM3 * 19200),
            proveedor: 'Áridos Locales',
          },
          {
            especialidad: 'Fundaciones',
            codigo: 'FUND-POLIETILENO-200M',
            item: 'Film Polietileno Virgen 0.20 mm (200 micras)',
            descripcion: 'Barrera de vapor bajo radier traslapada 20 cm y sellada perimetralmente',
            unidad: 'Rollos 100m²',
            cantidad: polietileno200MicrasRollos,
            precioUnitarioClp: 28500,
            totalClp: polietileno200MicrasRollos * 28500,
            proveedor: 'Polietilenos Chile',
          },
          {
            especialidad: 'Fundaciones',
            codigo: 'FUND-MOLDAJE-SOBREC',
            item: 'Tableros Terciados Estructurales 18mm & Encofrados',
            descripcion: 'Moldajes de sobrecimiento continuo elevado (20 a 40cm) con desmoldante vegetal',
            unidad: 'Planchas',
            cantidad: moldajesTerciado18mmPlacas,
            precioUnitarioClp: 26900,
            totalClp: moldajesTerciado18mmPlacas * 26900,
            proveedor: 'Arauco / CMPC',
          },
          {
            especialidad: 'Fundaciones',
            codigo: 'FUND-HORMIGON-CIM-SOBREC',
            item: 'Hormigón H-20 (G20) Cimientos Corridos y Sobrecimiento Continuo',
            descripcion: 'Cimientos corridos y sobrecimiento continuo elevado 20-40cm sobre TN para protección OSB',
            unidad: 'm³',
            cantidad: hormigonG20M3,
            precioUnitarioClp: 118000,
            totalClp: Math.round(hormigonG20M3 * 118000),
            proveedor: 'Planta Hormigón Local',
          },
          {
            especialidad: 'Fundaciones',
            codigo: 'FUND-MALLA-ACMA-C139',
            item: 'Malla Electrosoldada C-139 (2.60 x 5.00 m)',
            descripcion: 'Refuerzo de radier interior sobre calugas plásticas separadoras (recubrimiento 2.5-3cm)',
            unidad: 'Planchas',
            cantidad: mallaAcmaPlanchas,
            precioUnitarioClp: 34500,
            totalClp: mallaAcmaPlanchas * 34500,
            proveedor: 'Acero Gerdau / AZA',
          },
          {
            especialidad: 'Fundaciones',
            codigo: 'FUND-ADITIVO-SIKA1',
            item: 'Aditivo Hidrófugo de Masa (Sika 1) & Microfibra',
            descripcion: 'Reducción de porosidad del hormigón y microfibra anti-fisuras por retracción plástica',
            unidad: 'Kits',
            cantidad: Math.max(1, Math.ceil(totalFloorM2 / 30)),
            precioUnitarioClp: 24900,
            totalClp: Math.max(1, Math.ceil(totalFloorM2 / 30)) * 24900,
            proveedor: 'Sika Chile',
          },
          {
            especialidad: 'Fundaciones',
            codigo: 'FUND-ANCLAJE-PERNOS-12',
            item: 'Pernos de Anclaje Expansivo 1/2" x 5 1/2" (Wedge Anchor / Hilti)',
            descripcion: 'Anclaje sismorresistente cada 40-60cm y a 10-15cm de esquinas de soleras basales',
            unidad: 'Unid.',
            cantidad: pernosAnclaje12Qty,
            precioUnitarioClp: 1650,
            totalClp: pernosAnclaje12Qty * 1650,
            proveedor: 'Hilti / Mamut',
          },
          {
            especialidad: 'Fundaciones',
            codigo: 'FUND-GOLILLAS-DIN9021',
            item: 'Golillas Cuadradas Sobredimensionadas 50x50x3 mm (DIN 9021)',
            descripcion: 'Golillas para distribuir carga sísmica sin incrustar tuerca en fibra de madera solera',
            unidad: 'Unid.',
            cantidad: golillasCuadradas50Qty,
            precioUnitarioClp: 650,
            totalClp: golillasCuadradas50Qty * 650,
            proveedor: 'Simpson Strong-Tie',
          },
          {
            especialidad: 'Fundaciones',
            codigo: 'FUND-SELLO-SOLERA-EPDM',
            item: 'Aislamiento Hidrófugo Continuo de Solera (Membrana SBS / EPDM)',
            descripcion: 'Aislamiento capilar y cordón continuo Sikaflex 11FC bajo durmiente impregnado CCA',
            unidad: 'Rollos/Kits',
            cantidad: selloSoleraRollos,
            precioUnitarioClp: 14500,
            totalClp: selloSoleraRollos * 14500,
            proveedor: 'Sika / Duretan',
          },
        ]
      : [
          /* Platea de Cimentación / Losa Flotante Armada */
          {
            especialidad: 'Fundaciones',
            codigo: 'FUND-PLATEA-ESTABILIZADO',
            item: 'Árido Estabilizado Compactable Base Platea (0 a 1 1/2")',
            descripcion: 'Cama estabilizada compactada al 95% Proctor Modificado bajo diafragma monolítico',
            unidad: 'm³',
            cantidad: estabilizadoM3,
            precioUnitarioClp: 18500,
            totalClp: Math.round(estabilizadoM3 * 18500),
            proveedor: 'Áridos Locales',
          },
          {
            especialidad: 'Fundaciones',
            codigo: 'FUND-PLATEA-POLIETILENO',
            item: 'Film Polietileno Virgen 0.20 mm (200 micras)',
            descripcion: 'Barrera de vapor continua bajo losa flotante armada traslapada 20 cm',
            unidad: 'Rollos 100m²',
            cantidad: polietileno200MicrasRollos,
            precioUnitarioClp: 28500,
            totalClp: polietileno200MicrasRollos * 28500,
            proveedor: 'Polietilenos Chile',
          },
          {
            especialidad: 'Fundaciones',
            codigo: 'FUND-PLATEA-MOLDAJE',
            item: 'Moldajes Terciado Estructural 18mm para Borde Peraltado',
            descripcion: 'Encofrado perimetral para vigas invertidas y losa maciza flotante',
            unidad: 'Planchas',
            cantidad: moldajesTerciado18mmPlacas,
            precioUnitarioClp: 26900,
            totalClp: moldajesTerciado18mmPlacas * 26900,
            proveedor: 'Arauco / CMPC',
          },
          {
            especialidad: 'Fundaciones',
            codigo: 'FUND-PLATEA-HORMIGON-H25',
            item: 'Hormigón Armado H-25 (G25) para Platea Flotante e=15-20cm',
            descripcion: 'Losa maciza continua con vigas perimetrales invertidas, vaciado con vibrador y helicóptero',
            unidad: 'm³',
            cantidad: hormigonG20M3,
            precioUnitarioClp: 128000,
            totalClp: Math.round(hormigonG20M3 * 128000),
            proveedor: 'Planta Hormigón Local',
          },
          {
            especialidad: 'Fundaciones',
            codigo: 'FUND-PLATEA-DOBLE-MALLA',
            item: 'Doble Malla Electrosoldada C-139 / Fierro Estriado A63-42H',
            descripcion: 'Refuerzo superior e inferior con calugas separadoras 3.0cm para diafragma monolítico',
            unidad: 'Planchas',
            cantidad: mallaAcmaPlanchas,
            precioUnitarioClp: 34500,
            totalClp: mallaAcmaPlanchas * 34500,
            proveedor: 'Acero Gerdau / AZA',
          },
          {
            especialidad: 'Fundaciones',
            codigo: 'FUND-PLATEA-QUIMICOS',
            item: 'Aditivo Hidrófugo Sika 1 + Microfibra Sintética 19mm + Antisol',
            descripcion: 'Control de retracción plástica, impermeabilidad de masa y membrana de curado químico',
            unidad: 'Kits',
            cantidad: Math.max(1, Math.ceil(totalFloorM2 / 25)),
            precioUnitarioClp: 38000,
            totalClp: Math.max(1, Math.ceil(totalFloorM2 / 25)) * 38000,
            proveedor: 'Sika Chile',
          },
          {
            especialidad: 'Fundaciones',
            codigo: 'FUND-PLATEA-ESPARRAGOS',
            item: 'Espárragos Roscados Grado 5 Ø 1/2" con Resina Epóxica Sika AnchorFix',
            descripcion: 'Anclajes químicos de alta resistencia cada 40-60cm para resistir corte y tracción sísmica',
            unidad: 'Unid.',
            cantidad: pernosAnclaje12Qty,
            precioUnitarioClp: 3200,
            totalClp: pernosAnclaje12Qty * 3200,
            proveedor: 'Sika / Hilti HIT',
          },
          {
            especialidad: 'Fundaciones',
            codigo: 'FUND-PLATEA-GOLILLAS',
            item: 'Golillas Cuadradas Sobredimensionadas 50x50x3 mm (DIN 9021)',
            descripcion: 'Golillas de alta superficie de apoyo para solera inferior impregnada',
            unidad: 'Unid.',
            cantidad: golillasCuadradas50Qty,
            precioUnitarioClp: 650,
            totalClp: golillasCuadradas50Qty * 650,
            proveedor: 'Simpson Strong-Tie',
          },
          {
            especialidad: 'Fundaciones',
            codigo: 'FUND-PLATEA-SELLO-EPDM',
            item: 'Banda Elastomérica EPDM / Sellador Poliuretano Sikaflex 11FC',
            descripcion: 'Barrera antihumedad bajo solera basal de acople directo SIP',
            unidad: 'Rollos/Kits',
            cantidad: selloSoleraRollos,
            precioUnitarioClp: 14500,
            totalClp: selloSoleraRollos * 14500,
            proveedor: 'Sika / Duretan',
          },
        ]),

    // Terminaciones
    {
      especialidad: 'Terminaciones',
      codigo: 'TERM-VOLCANITA-RF-ST',
      item: 'Planchas Volcanita ST/RF 15mm (1.20 x 2.40m)',
      descripcion: 'Revestimiento interior ignífugo para cumplimiento normativo REI 30 / REI 60 (UNE-EN 13501-1)',
      unidad: 'Planchas',
      cantidad: volcanitaSTSheets,
      precioUnitarioClp: 9800,
      totalClp: volcanitaSTSheets * 9800,
      proveedor: 'Volcán Chile',
    },
    {
      especialidad: 'Terminaciones',
      codigo: 'TERM-PISO-SPC',
      item: 'Piso Vinílico SPC 6mm (Cajas 2.2 m²)',
      descripcion: 'Palmetas click con manta acústica niveladora IXPE incorporada',
      unidad: 'Cajas',
      cantidad: cajasPisoSpc,
      precioUnitarioClp: 41500,
      totalClp: cajasPisoSpc * 41500,
      proveedor: 'Krono / SPC Chile',
    },
    {
      especialidad: 'Terminaciones',
      codigo: 'TERM-PINTURA-LATEX',
      item: 'Tineta Látex Antihumedad 5 Gal (18.9 L)',
      descripcion: 'Pintura esmalte al agua semibrillo blanco para muros y cielos',
      unidad: 'Tinetas',
      cantidad: tinetasPinturaLatex,
      precioUnitarioClp: 54900,
      totalClp: tinetasPinturaLatex * 54900,
      proveedor: 'SIPA / Tricolor',
    },
  ];

  const totalPresupuestoClp = items.reduce((acc, curr) => acc + curr.totalClp, 0);

  return {
    totalFloorM2: Math.round(totalFloorM2 * 10) / 10,
    extWallAreaM2: Math.round(extWallAreaM2 * 10) / 10,
    totalRoofAreaM2: Math.round(totalRoofAreaM2 * 10) / 10,
    coreSpec,
    wallThicknessMm,
    roofThicknessMm,
    floorThicknessMm,
    floorSipCount,
    wallExtSip114Count,
    wallIntSip90Count,
    roofSip210Count,
    totalSurfaceSplinesOSB,
    volcanitaSTSheets,
    volcanitaRHSheets,
    tinetasPinturaLatex,
    cajasPisoSpc,
    planchasZincalumExt,
    timber2x6LinM,
    timber2x6Commercial32Count,
    timber2x4LinM,
    timber2x4Commercial32Count,
    timber2x8LinM,
    timber2x8Commercial40Count,
    rainScreenFurringLinM,
    rainScreenCommercial32Count,
    tornillosCRSQty,
    structuralTimberScrewsQty,
    adhesivoPoliuretanoTubos,
    feltRollsCount,
    // Métricas dinámicas de fundación
    pilaresFundacionCount,
    axesCountX,
    pilesCountZ,
    vigasMaestras2x8LinM,
    vigasMaestras40Count,
    hormigonG20M3,
    pernosAnclaje12Qty,
    mallaAcmaPlanchas,
    estabilizadoM3,
    items,
    totalPresupuestoClp,
  };
}

export function exportSipHouseToExcel(
  dim: SipHouseDimensions,
  foundationType: FoundationType,
  extCladding: ExteriorCladding,
  roofCladding: RoofCladding,
  interiorCeiling: InteriorCeiling,
  flooringType: FlooringType,
  openings?: SipOpening[],
  mepNetwork?: SipMepNetwork,
  coreType: SipCoreType = 'eps_15kg',
  wallThicknessMm: SipWallThickness = 114,
  roofThicknessMm: SipRoofThickness = 210,
  floorThicknessMm: SipFloorThickness = 162,
  interiorWalls?: InteriorWall[]
) {
  const result = calculateSipHouseQuantities(
    dim,
    foundationType,
    extCladding,
    roofCladding,
    interiorCeiling,
    flooringType,
    openings,
    mepNetwork,
    coreType,
    wallThicknessMm,
    roofThicknessMm,
    floorThicknessMm,
    interiorWalls
  );

  const summaryData = [
    ['MEMORIA TÉCNICA, CRITERIOS CONSTRUCTIVOS Y CUBICACIÓN INDUSTRIALIZADA SIP'],
    ['Proyecto:', 'Cabaña Modular Panel SIP Base Rectangular (2 Aguas)'],
    ['Ingeniería & EETT:', 'PROSIP Chile / LP PanelSip / NTA NER-1038 / SIPA'],
    ['Superficie Construida Total:', `${result.totalFloorM2} m²`],
    ['Área Muros Envolvente:', `${result.extWallAreaM2} m²`],
    ['Área Total Cubierta:', `${result.totalRoofAreaM2} m²`],
    ['Fecha de Emisión:', new Date().toLocaleDateString('es-CL')],
    ['Presupuesto Estimado Obra Gruesa + Terminaciones:', `$ ${result.totalPresupuestoClp.toLocaleString('es-CL')} CLP`],
    [],
    ['PARÁMETROS GEOMÉTRICOS DEL MODELO'],
    ['Dimensiones en Planta:', `${dim.length} cm (Largo) x ${dim.width} cm (Ancho)`],
    ['Altura al Alero:', `${dim.eaveHeight} cm`],
    ['Altura a Cumbrera:', `${dim.ridgeHeight} cm`],
    ['Alero de Cubierta:', `${dim.overhang || 25} cm`],
    [],
    ['ESPECIFICACIONES TÉCNICAS DEL PANEL SIP Y NÚCLEO'],
    ['Tipo de Núcleo:', `${result.coreSpec.name} (${result.coreSpec.densityKgM3} kg/m³)`],
    ['Espesor Muros Perimetrales:', `${result.wallThicknessMm} mm (Transmitancia K: ${result.coreSpec.thermalK_Wm2K_114mm} W/m²K)`],
    ['Espesor Losa de Piso:', `${result.floorThicknessMm} mm`],
    ['Espesor Cubierta 2 Aguas:', `${result.roofThicknessMm} mm (R-Value aprox: R-${Math.round(result.coreSpec.rValuePerInch * (result.roofThicknessMm / 25.4))})`],
    ['Clasificación ante Fuego:', result.coreSpec.fireRating],
    [],
    ['CRITERIOS CONSTRUCTIVOS Y REGLAS DE MONTAJE (COMPLIANCE)'],
    ['Distancia mínima vano a esquina sólida:', '30 cm (LP/Foard - Evita concentración de esfuerzos)'],
    ['Luz máxima de vano sin viga compuesta:', '2.44 m (Dinteles SIP > 30cm sobrecarga < 150 kg/m)'],
    ['Regla de traslape solera superior:', 'Mínimo 30 cm respecto a uniones verticales de paneles'],
    ['Tolerancia de dilatación en uniones:', '3 a 4 mm obligatorio en todos los empalmes'],
    ['Fijación mecánica tableros OSB:', 'Tornillos CRS 6x1 1/4" a 1 cm del borde, cada 15 cm perimetral'],
    ['Hermeticidad de aire (Blower Door):', 'Sello continuo con espuma de poliuretano en todo canal EPS (< 1.0 ACH50)'],
    ['Regla MEP (Electricidad/Sanitaria):', 'PROHIBIDO ranurar u horadar horizontalmente el OSB exterior/interior (ductos por alma EPS)'],
    ['Fachada y Techo Ventilado:', 'Rain Screen con cámara de aire 1/4"-1" + Techo frío "Cold Roof" con fieltro #15/#30'],
  ];

  const bomHeaders = [
    'Especialidad',
    'Código Item',
    'Descripción del Material',
    'Especificación Técnica EETT',
    'Unidad',
    'Cantidad',
    'Precio Unitario (CLP)',
    'Subtotal (CLP)',
    'Proveedor Sugerido',
  ];

  const bomRows = result.items.map((it) => [
    it.especialidad,
    it.codigo,
    it.item,
    it.descripcion,
    it.unidad,
    it.cantidad,
    it.precioUnitarioClp,
    it.totalClp,
    it.proveedor,
  ]);

  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  const wsBom = XLSX.utils.aoa_to_sheet([bomHeaders, ...bomRows]);

  wsBom['!cols'] = [
    { wch: 24 },
    { wch: 18 },
    { wch: 34 },
    { wch: 45 },
    { wch: 10 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 24 },
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Memoria & Criterios SIP');
  XLSX.utils.book_append_sheet(wb, wsBom, 'Listado Materiales BoM');

  XLSX.writeFile(wb, `Cubicacion_Cabana_SIP_${Math.round(result.totalFloorM2)}m2.xlsx`);
}
