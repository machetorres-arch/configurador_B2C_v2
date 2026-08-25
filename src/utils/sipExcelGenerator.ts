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

/**
 * Calcula la cantidad de piezas/tiras comerciales estándar de 3.20 m (3200 mm) necesarias para cubrir
 * una longitud corrida L (en metros), considerando empalmes o traslapes sobre apoyos estructurales
 * (mínimo 30 cm de traslape / empalme sobre pie derecho, pilar o apoyo cuando L > 3.20 m).
 */
export function calculateStrips320(runLengthM: number, runCount: number = 1, overlapM: number = 0.30): number {
  if (runLengthM <= 0 || runCount <= 0) return 0;
  if (runLengthM <= 3.20) {
    // Si la pieza mide <= 3.20 m, cada corrida requiere 1 tira comercial estándar de 3.20 m
    return Math.ceil(runCount);
  }
  // Si L > 3.20 m, se requieren empalmes sobre pie derecho o apoyo estructural
  const jointsPerRun = Math.ceil(runLengthM / 3.20) - 1;
  const effectiveLengthM = runLengthM + jointsPerRun * overlapM;
  const stripsPerRun = Math.ceil(effectiveLengthM / 3.20);
  return stripsPerRun * runCount;
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

  const isLShape = dim.shape === 'l_shape';
  const wingLengthM = isLShape ? (dim.wingLength || 420) / 100 : 0;
  const wingWidthM = isLShape ? (dim.wingWidth || 360) / 100 : 0;

  const coreSpec = SIP_CORE_SPECS[coreType] || SIP_CORE_SPECS.eps_15kg;

  // 1. Superficie Útil de Piso (L1 x W1 + L2 x W2)
  const totalFloorM2 = isLShape ? lengthM * widthM + wingLengthM * wingWidthM : lengthM * widthM;

  // 2. Paneles SIP Losa Piso (1.22 x 2.44m = 2.977 m²)
  const floorSipCount = Math.ceil((totalFloorM2 / (1.22 * 2.44)) * 1.1);

  // 3. Muros Perimetrales SIP 114 mm (Rectangulares + Frontones Triangulares)
  // Perímetro L-shape: 2*(L1 + W1 + W2)
  const perimeterM = isLShape ? 2 * (lengthM + widthM + wingWidthM) : 2 * (lengthM + widthM);
  const rectangularWallAreaM2 = perimeterM * eaveHM;
  const isGableRoof = ridgeHM > eaveHM + 0.15;
  const gableRoofHeightM = Math.max(0.05, ridgeHM - eaveHM);
  // Área neta de los frontones triangulares:
  const gableTrianglesAreaM2 = isGableRoof
    ? isLShape
      ? (widthM + wingWidthM) * gableRoofHeightM
      : widthM * gableRoofHeightM
    : 0;
  const extWallAreaM2 = rectangularWallAreaM2 + gableTrianglesAreaM2;

  // Optimización de cubicación industrial SIP (Aprovechamiento de cortes pareados en frontón diagonal):
  const wallRectangularSip114Count = Math.ceil((rectangularWallAreaM2 / (1.22 * 2.44)) * 1.08);
  // Al cortar paneles de 1.22 x 2.44m en diagonal para el frontón, los retazos opuestos son simétricos para ambas vertientes:
  const gablePanelsCount = isGableRoof
    ? Math.max(2, Math.ceil((gableTrianglesAreaM2 / (1.22 * 2.44)) * 1.15))
    : 0;
  const wallExtSip114Count = wallRectangularSip114Count + gablePanelsCount;

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

  // 5. Techumbre SIP a Dos Aguas (Modulación estándar LP / PROSIP: 1.22m ancho x 2.44m largo, espesor 210 mm)
  const halfSpanM = widthM / 2 + overhangM;
  const roofSlopeAngle = isGableRoof ? Math.atan2(gableRoofHeightM, widthM / 2) : 0;
  const roofRafterLength = isGableRoof ? halfSpanM / Math.cos(roofSlopeAngle) : halfSpanM;
  const totalRoofLengthM = lengthM + 2 * overhangM;
  
  // Para techumbre en L:
  const wingHalfSpanM = wingLengthM / 2 + overhangM;
  const wingRoofRafterLength = isGableRoof ? wingHalfSpanM / Math.cos(roofSlopeAngle) : wingHalfSpanM;
  const wingRoofAreaM2 = isLShape ? 2 * (wingRoofRafterLength * (wingWidthM + overhangM)) : 0;
  const totalRoofAreaM2 = (isGableRoof ? 2 * (roofRafterLength * totalRoofLengthM) : totalRoofLengthM * widthM) + wingRoofAreaM2;

  // Modulación real: Si caída de agua <= 2.44m es 1 panel entero continuo; si > 2.44m son paneles con empalme sobre viga
  const roofPanelsAlongLen = Math.ceil(totalRoofLengthM / 1.22);
  const roofPanelsAlongRafter = roofRafterLength <= 2.44 ? 1 : Math.ceil(roofRafterLength / 2.44);
  const mainRoofSip210Count = (isGableRoof ? 2 : 1) * roofPanelsAlongLen * roofPanelsAlongRafter;
  const wingRoofSip210Count = isLShape
    ? (isGableRoof ? 2 : 1) * Math.ceil((wingWidthM + overhangM) / 1.22) * (wingRoofRafterLength <= 2.44 ? 1 : Math.ceil(wingRoofRafterLength / 2.44))
    : 0;
  const roofSip210Count = mainRoofSip210Count + wingRoofSip210Count;

  // 6. Tablillas de OSB (Surface Splines) 11.1mm x 100mm x 2.37m (LP / SIPA NTA NER-1038)
  // 2 tablillas por cada unión vertical y horizontal entre paneles SIP cada 1.22m
  const horizontalJointsWalls = eaveHM > 2.44 ? Math.ceil(perimeterM / 1.22) + Math.ceil((intWallAreaM2 / eaveHM) / 1.22) : 0;
  const verticalJointsWalls = Math.ceil(perimeterM / 1.22) + Math.ceil((intWallAreaM2 / eaveHM) / 1.22);
  const roofJointsCount = Math.ceil(totalRoofLengthM / 1.22) * 2;
  const floorJointsCount = Math.ceil(lengthM / 1.22);
  const totalSurfaceSplinesOSB = (verticalJointsWalls + horizontalJointsWalls + roofJointsCount + floorJointsCount) * 2;

  // 7. Maderas Estructurales - Despiece y Cálculo por Largo Comercial Máximo Estándar (3.20 m / 3200 mm)
  // A. Losa de Piso (Pino 2x6" o 2x8" según espesor de losa):
  // Vigas de borde perimetrales (2 corridas de largo + 2 corridas de ancho) + viguetas intermedias cada 1.22 m
  const floorJoistsCount = Math.ceil(lengthM / 1.22) + 1;
  const floorRimStripsLength = calculateStrips320(lengthM, 2);
  const floorRimStripsWidth = calculateStrips320(widthM, 2);
  const floorInternalJoistsStrips = calculateStrips320(widthM, Math.max(0, floorJoistsCount - 2));
  const timber2x6Commercial32Count = floorRimStripsLength + floorRimStripsWidth + floorInternalJoistsStrips;
  const timberFloorNetLinM = 2 * (lengthM + widthM) + Math.max(0, floorJoistsCount - 2) * widthM;
  const timber2x6LinM = Math.ceil(timberFloorNetLinM * 1.08);

  // B. Muros Perimetrales e Interiores (Pino Seco Cepillado 2x4" calibrado al espesor de núcleo):
  // Solera inferior de anclaje, solera superior con traslape >= 30cm, doble solera (cap plate), solera intermedia (si H > 2.44m), pies derechos y refuerzos de vanos
  const openingsCount = openings ? openings.length : 3;
  const wallStudsCount = (Math.ceil(perimeterM / 0.6) + 8) + (openingsCount * 4);
  const platesRunsPerWall = eaveHM > 2.44 ? 4 : 3; // Solera inferior + superior + cap plate + intermedia
  const wallPlatesLengthStrips = calculateStrips320(lengthM, platesRunsPerWall * 2);
  const wallPlatesWidthStrips = calculateStrips320(widthM, platesRunsPerWall * 2);
  const intWallPlatesStrips = intWallLinM > 0 ? calculateStrips320(intWallLinM, 2) : 0;
  
  // Pies derechos (studs) de altura eaveHM - 0.082 m (< 3.20 m)
  const studsPerCommercialStrip = Math.max(1, Math.floor(3.20 / Math.max(0.5, eaveHM - 0.082)));
  const wallStudsStrips = Math.ceil(wallStudsCount / studsPerCommercialStrip);
  
  // Refuerzos de vanos (jambas, dinteles, antepechos)
  const openingsReinforcementLinM = openings
    ? openings.reduce((acc, o) => acc + (2 * (o.width / 100) + 2 * (o.height / 100)), 0)
    : 12.0;
  const openingsReinforcementStrips = Math.ceil(openingsReinforcementLinM / 3.20);
  const intWallStudsStrips = Math.ceil((wallIntSip90Count * 2.44 * 1.8) / 3.20);
  
  const timber2x4Commercial32Count =
    wallPlatesLengthStrips +
    wallPlatesWidthStrips +
    intWallPlatesStrips +
    wallStudsStrips +
    openingsReinforcementStrips +
    intWallStudsStrips;

  const intermediateHorizPlatesLinM = eaveHM > 2.44 ? perimeterM : 0;
  const wallPlatesLinM = perimeterM * 3 + intermediateHorizPlatesLinM;
  const wallStudsLinM = wallStudsCount * (eaveHM - 0.082);
  const timber2x4NetLinM = wallPlatesLinM + wallStudsLinM + openingsReinforcementLinM + (wallIntSip90Count * 2.44 * 1.8);
  const timber2x4LinM = Math.ceil(timber2x4NetLinM * 1.08);

  // C. Estructura de Techo (Pino 2x8" - 41x185 mm):
  // Viga cumbrera maestra continua (doble viga 2x8") + Pares de vigas (rafters) cada 1.22m + Tapacanes y frontones
  const roofRaftersPairsCount = Math.ceil(totalRoofLengthM / 1.22) + 1;
  const ridgeBeamStrips = calculateStrips320(totalRoofLengthM, 2); // Doble viga cumbrera con empalmes sobre apoyos
  const roofRaftersStrips = calculateStrips320(roofRafterLength, roofRaftersPairsCount * 2);
  const roofFasciaStrips = calculateStrips320(totalRoofLengthM, 2) + calculateStrips320(roofRafterLength, 4);
  const timber2x8Commercial32Count = ridgeBeamStrips + roofRaftersStrips + roofFasciaStrips;
  const timber2x8Commercial40Count = timber2x8Commercial32Count; // Alias para retrocompatibilidad
  
  const ridgeBeamLinM = totalRoofLengthM;
  const roofRaftersLinM = roofRaftersPairsCount * 2 * roofRafterLength;
  const roofFasciaLinM = 2 * totalRoofLengthM + 4 * roofRafterLength;
  const timber2x8NetLinM = ridgeBeamLinM * 2 + roofRaftersLinM + roofFasciaLinM;
  const timber2x8LinM = Math.ceil(timber2x8NetLinM * 1.08);

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
  const vigasMaestras32Count = calculateStrips320(lengthM, axesCountX);
  const vigasMaestras40Count = vigasMaestras32Count;

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

    // Maderas Estructuración por Medidas Comerciales (Restricción máx 3.20m)
    {
      especialidad: 'Maderas y Estructuración',
      codigo: 'MAD-PINO-2X6-3.2',
      item: 'Pino Seco Cepillado 2x6" x 3.20m (Losa SIP)',
      descripcion: `Vigas perimetrales y soleras de losa 41x138mm. (${timber2x6LinM} m lineales totales | ${timber2x6Commercial32Count} Tiras de 3.20 m)`,
      unidad: 'Tiras de 3.20 m',
      cantidad: timber2x6Commercial32Count,
      precioUnitarioClp: 11040,
      totalClp: timber2x6Commercial32Count * 11040,
      proveedor: 'CMPC / Arauco',
    },
    {
      especialidad: 'Maderas y Estructuración',
      codigo: 'MAD-PINO-2X4-3.2',
      item: 'Pino Seco Cepillado 2x4" x 3.20m (Soleras Anclaje/Amarre & Muros)',
      descripcion: `Soleras basales de anclaje, soleras superiores con traslape >=30cm, cap plates y refuerzos vanos 41x92mm. (${timber2x4LinM} m lineales totales | ${timber2x4Commercial32Count} Tiras de 3.20 m)`,
      unidad: 'Tiras de 3.20 m',
      cantidad: timber2x4Commercial32Count,
      precioUnitarioClp: 7520,
      totalClp: timber2x4Commercial32Count * 7520,
      proveedor: 'CMPC / Arauco',
    },
    {
      especialidad: 'Maderas y Estructuración',
      codigo: 'MAD-PINO-2X8-3.2',
      item: 'Pino Seco Cepillado 2x8" x 3.20m (Vigas Techo & Cumbrera)',
      descripcion: `Viga cumbrera maestra, pares de apoyo cada 1.22m y tapacanes 41x185mm con empalmes sobre apoyo (${timber2x8LinM} m lineales totales | ${timber2x8Commercial32Count} Tiras de 3.20 m)`,
      unidad: 'Tiras de 3.20 m',
      cantidad: timber2x8Commercial32Count,
      precioUnitarioClp: 14720,
      totalClp: timber2x8Commercial32Count * 14720,
      proveedor: 'CMPC / Arauco',
    },
    {
      especialidad: 'Maderas y Estructuración',
      codigo: 'MAD-RAIN-SCREEN-1X4',
      item: 'Listones Pino Cepillado 1x4" x 3.20m (Fachada & Techo Ventilado)',
      descripcion: `Cámara de aire y enrejillado de ventilación Rain Screen (${rainScreenFurringLinM} m lineales totales | ${rainScreenCommercial32Count} Tiras de 3.20 m)`,
      unidad: 'Tiras de 3.20 m',
      cantidad: rainScreenCommercial32Count,
      precioUnitarioClp: 3800,
      totalClp: rainScreenCommercial32Count * 3800,
      proveedor: 'Arauco / CMPC',
    },
    ...(isLShape
      ? [
          {
            especialidad: 'Maderas y Estructuración',
            codigo: 'MAD-LIMAHOYA-2X8',
            item: 'Viga Limahoya Diagonal 2x8" & Canaleta Hojalatería en V',
            descripcion: 'Viga diagonal de madera para encuentro de vertientes de techos en L con canaleta hojalatería Zincalum 0.5mm',
            unidad: 'Kit/Tira',
            cantidad: 2,
            precioUnitarioClp: 28900,
            totalClp: 57800,
            proveedor: 'Arauco / Cintac',
          },
        ]
      : []),

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
            codigo: 'FUND-VIGA-MAESTRA-3.2',
            item: 'Vigas Maestras Pino Impregnado 2x8" x 3.20m (Fundación)',
            descripcion: `Envigado maestro sobre pilotes CCA con empalmes a media madera sobre apoyos (${vigasMaestras2x8LinM} m lineales totales | ${vigasMaestras32Count} Tiras de 3.20 m)`,
            unidad: 'Tiras de 3.20 m',
            cantidad: vigasMaestras32Count,
            precioUnitarioClp: 16640,
            totalClp: vigasMaestras32Count * 16640,
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

    // Revestimientos Exteriores y Fachada Ventilada
    {
      especialidad: 'Revestimientos Exteriores',
      codigo: 'REV-TYVEK-HOMEWRAP',
      item: 'Membrana Hidrófuga y Respirable Tyvek HomeWrap (Rollo 50m²)',
      descripcion: 'Barrera continua contra el viento y agua líquida con alta permeabilidad al vapor para protección del OSB SIP',
      unidad: 'Rollos',
      cantidad: Math.max(1, Math.ceil((extWallAreaM2 + totalRoofAreaM2) / 45)),
      precioUnitarioClp: 48900,
      totalClp: Math.max(1, Math.ceil((extWallAreaM2 + totalRoofAreaM2) / 45)) * 48900,
      proveedor: 'DuPont Tyvek / Durex',
    },
    ...(extCladding === 'arratia_microacanalado'
      ? [
          {
            especialidad: 'Revestimientos Exteriores',
            codigo: 'REV-ARRATIA-MICRO-04',
            item: 'Plancha Arratia Microacanalada Zincalum 0.4mm Negro Mate',
            descripcion: 'Revestimiento metálico microondulado arquitectónico prepintado negro mate para fachada ventilada',
            unidad: 'Planchas (0.50x2.50m)',
            cantidad: Math.ceil((extWallAreaM2 * 1.12) / 1.25),
            precioUnitarioClp: 18900,
            totalClp: Math.ceil((extWallAreaM2 * 1.12) / 1.25) * 18900,
            proveedor: 'Arratia Metales / Cintac',
          },
        ]
      : extCladding === 'zincalum_negro'
      ? [
          {
            especialidad: 'Revestimientos Exteriores',
            codigo: 'REV-ZINC-OND-NEGRO',
            item: 'Planchas Zincalum Ondulado CA-8 / 5V Prepintado Negro 0.4mm',
            descripcion: 'Planchas de acero zincalum prepintado negro mate 0.85 x 3.00 m para fachada',
            unidad: 'Planchas',
            cantidad: Math.ceil((extWallAreaM2 * 1.12) / 2.55),
            precioUnitarioClp: 14500,
            totalClp: Math.ceil((extWallAreaM2 * 1.12) / 2.55) * 14500,
            proveedor: 'Cintac',
          },
        ]
      : extCladding === 'madera_tinglada'
      ? [
          {
            especialidad: 'Revestimientos Exteriores',
            codigo: 'REV-TINGLADO-PINO-1X5',
            item: 'Tinglado Pino Radiata Impregnado CCA 1x5" x 3.20m',
            descripcion: 'Tablas de madera machihembrada / tinglada para fachada rústica tratada para intemperie',
            unidad: 'Tiras de 3.20m',
            cantidad: Math.ceil((extWallAreaM2 * 1.15) / (0.11 * 3.20)),
            precioUnitarioClp: 4800,
            totalClp: Math.ceil((extWallAreaM2 * 1.15) / (0.11 * 3.20)) * 4800,
            proveedor: 'Arauco / CMPC',
          },
        ]
      : extCladding === 'fibrocemento_gris'
      ? [
          {
            especialidad: 'Revestimientos Exteriores',
            codigo: 'REV-SIDING-FIBROCEMENTO',
            item: 'Siding Fibrocemento Cedral Madera 6mm (0.19 x 3.66m)',
            descripcion: 'Tablas de fibrocemento textura madera gris grafito incombustible y resistente a la humedad',
            unidad: 'Tablas',
            cantidad: Math.ceil((extWallAreaM2 * 1.12) / (0.16 * 3.66)),
            precioUnitarioClp: 7200,
            totalClp: Math.ceil((extWallAreaM2 * 1.12) / (0.16 * 3.66)) * 7200,
            proveedor: 'Etex / Cedral',
          },
        ]
      : [
          {
            especialidad: 'Revestimientos Exteriores',
            codigo: 'REV-PROTECTOR-OSB',
            item: 'Protector Hidrorrepelente Impregnante UV OSB (Galón 3.78L)',
            descripcion: 'Sellador acrílico protector antihumedad con filtro solar UV para paneles SIP vistos',
            unidad: 'Galones',
            cantidad: Math.max(1, Math.ceil(extWallAreaM2 / 35)),
            precioUnitarioClp: 29900,
            totalClp: Math.max(1, Math.ceil(extWallAreaM2 / 35)) * 29900,
            proveedor: 'Chilcorrofin / Sika',
          },
        ]),

    // Revestimientos de Techumbre y Cubierta
    ...(roofCladding === 'arratia_microacanalado'
      ? [
          {
            especialidad: 'Cubiertas y Techumbres',
            codigo: 'CUB-ARRATIA-TECHO-05',
            item: 'Plancha Arratia Techo Continuo Zincalum 0.5mm Negro Mate',
            descripcion: 'Cubierta metálica estanca de diseño microacanalado para techos ventilados con fijación estanca',
            unidad: 'Planchas (0.50x3.66m)',
            cantidad: Math.ceil((totalRoofAreaM2 * 1.12) / 1.83),
            precioUnitarioClp: 24500,
            totalClp: Math.ceil((totalRoofAreaM2 * 1.12) / 1.83) * 24500,
            proveedor: 'Arratia Metales / Cintac',
          },
        ]
      : roofCladding === 'zinc_ca8_negro'
      ? [
          {
            especialidad: 'Cubiertas y Techumbres',
            codigo: 'CUB-ZINC-CA8-NEGRO',
            item: 'Planchas Zinc Acanalado Ondulado CA-8 Negro 0.4mm x 3.66m',
            descripcion: 'Planchas de zinc acanalado prepintado negro para cubiertas inclinadas',
            unidad: 'Planchas',
            cantidad: Math.ceil((totalRoofAreaM2 * 1.12) / (0.85 * 3.66)),
            precioUnitarioClp: 16900,
            totalClp: Math.ceil((totalRoofAreaM2 * 1.12) / (0.85 * 3.66)) * 16900,
            proveedor: 'Cintac',
          },
        ]
      : roofCladding === 'teja_asfaltica_negra'
      ? [
          {
            especialidad: 'Cubiertas y Techumbres',
            codigo: 'CUB-TEJA-ASFALTICA-3TAB',
            item: 'Teja Asfáltica 3-Tab Negra Grafito (Paquete 3.1 m²)',
            descripcion: 'Tejas de base asfáltica reforzada con fibra de vidrio y gránulos minerales cerámicos',
            unidad: 'Paquetes',
            cantidad: Math.ceil((totalRoofAreaM2 * 1.15) / 3.1),
            precioUnitarioClp: 28900,
            totalClp: Math.ceil((totalRoofAreaM2 * 1.15) / 3.1) * 28900,
            proveedor: 'CertainTeed / IKO',
          },
        ]
      : [
          {
            especialidad: 'Cubiertas y Techumbres',
            codigo: 'CUB-MEMBRANA-LIQUIDA',
            item: 'Membrana Impermeabilizante Poliuretánica Líquida UV (Tineta 20kg)',
            descripcion: 'Impermeabilización elástica sin uniones para techos planos o cubiertas expuestas',
            unidad: 'Tinetas',
            cantidad: Math.max(1, Math.ceil(totalRoofAreaM2 / 20)),
            precioUnitarioClp: 68900,
            totalClp: Math.max(1, Math.ceil(totalRoofAreaM2 / 20)) * 68900,
            proveedor: 'Sika Sikalastic',
          },
        ]),

    // Hojalatería y Fijaciones de Terminación Exterior
    {
      especialidad: 'Hojalatería y Remates',
      codigo: 'HOJ-ESQUINERO-EXT-NEGRO',
      item: 'Esquineros Exteriores Hojalatería Zincalum 0.5mm Negro Mate (2.50m)',
      descripcion: 'Remates angulares 50x50mm prepintados negro para sellado estanco de esquinas exteriores',
      unidad: 'Tiras de 2.50m',
      cantidad: Math.max(4, Math.ceil((4 * eaveHM + (isLShape ? 2 * eaveHM : 0)) / 2.4)),
      precioUnitarioClp: 6800,
      totalClp: Math.max(4, Math.ceil((4 * eaveHM + (isLShape ? 2 * eaveHM : 0)) / 2.4)) * 6800,
      proveedor: 'Cintac / Arratia',
    },
    {
      especialidad: 'Hojalatería y Remates',
      codigo: 'HOJ-CUMBRERA-NEGRO',
      item: 'Caballete Cumbrera Doble Ala Zincalum 0.5mm Negro Mate (2.50m)',
      descripcion: 'Remate de cumbrera con doble ala 150mm y solape estanco con ventilación',
      unidad: 'Tiras de 2.50m',
      cantidad: Math.max(1, Math.ceil((lengthM + 2 * overhangM + (isLShape ? wingLengthM : 0)) / 2.2)),
      precioUnitarioClp: 8900,
      totalClp: Math.max(1, Math.ceil((lengthM + 2 * overhangM + (isLShape ? wingLengthM : 0)) / 2.2)) * 8900,
      proveedor: 'Cintac / Arratia',
    },
    {
      especialidad: 'Fijaciones y Químicos',
      codigo: 'FIJ-TORNILLO-EPDM-10X1',
      item: 'Tornillos Autoperforantes Hexagonales 10 x 1" con Golilla EPDM',
      descripcion: 'Fijación de planchas y remates con sello hermético de goma de alta durabilidad (Cajas 500u)',
      unidad: 'Cajas (500u)',
      cantidad: Math.max(1, Math.ceil(((extWallAreaM2 + totalRoofAreaM2) * 8) / 500)),
      precioUnitarioClp: 16800,
      totalClp: Math.max(1, Math.ceil(((extWallAreaM2 + totalRoofAreaM2) * 8) / 500)) * 16800,
      proveedor: 'Mamut / Spax',
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
    timber2x8Commercial32Count,
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
    vigasMaestras32Count,
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
    ['Restricción largo comercial de maderas:', 'Largo estándar máx. 3.20 m (3200 mm). Toda pieza continua > 3.20 m (soleras de anclaje, soleras de amarre, vigas de borde 2x6", soleras de muro 2x4", vigas de techo 2x8" y vigas maestras) considera empalmes a media madera o placas de unión en apoyos estructurales (pies derechos/pilotes) con traslape mínimo de 30 cm.'],
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
