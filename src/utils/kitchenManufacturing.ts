import { CabinetType } from '../store/kitchenStore';
import { useStore } from '../store';
import { useKitchenStore } from '../store/kitchenStore';
import { Part, generateEdgeBandingList } from './manufacturing';
import { calculateSocleSystem } from './kitchenSocle';

// Parámetros técnicos de herrajes según marca (igualados con el configurador de closets)
export const HARDWARE_SPECS = {
  Provelcar: {
    // Según plano técnico Provelcar "undermount full extension":
    // SKW (Drawer Width) = LW (Inside Cabinet Width) - 49
    slideClearanceTotal: 49, 
    slideName: 'Corredera Oculta Provelcar Ext. Total (Cierre Suave)',
    // Según plano: SKL (Drawer Length) = NL - 10
    drawerLengthDeduction: 10,
    maxSideThickness: 18 // Espesor máximo admitido para el lateral del cajón
  },
  Hafele: {
    // Referencia estándar Häfele Matrix / Moovit
    slideClearanceTotal: 42, 
    slideName: 'Corredera Oculta Häfele (Cierre Suave)',
    drawerLengthDeduction: 0,
    maxSideThickness: 16
  }
};

export function getNominalSlideLength(innerDepthMm: number): number {
  const availableNLs = [250, 300, 350, 400, 450, 500, 550];
  // Requerimiento mínimo (LT min = NL + 3). Holgura de seguridad de +10mm
  for (let i = availableNLs.length - 1; i >= 0; i--) {
    if (availableNLs[i] + 10 <= innerDepthMm) {
      return availableNLs[i];
    }
  }
  return 250; // Fallback mínimo
}

export function generateKitchenPartsList(cabinets: CabinetType[]): Part[] {
  const parts: Part[] = [];
  const state = useStore.getState();
  const thickness = state.thickness; // thickness in cm
  const hwSpec = HARDWARE_SPECS[state.drawerHardware || 'Provelcar'] || HARDWARE_SPECS.Provelcar;
  
  cabinets.forEach((cab, index) => {
    if (cab.type === 'decoration' || cab.variant?.startsWith('deco_')) return;
    const cabName = `(Cab ${index+1} ${cab.type})`;
    const w = cab.width;
    const h = cab.height;
    const d = cab.depth;
    
    // Base cabinet legs
    const legsHeight = (cab.type === 'base' || cab.type === 'island') ? 15 : 0;
    const cabH = h - legsHeight;
    const innerW = w - thickness * 2;
    const innerH = cabH - thickness * ((cab.type === 'base' || cab.type === 'island') ? 1 : 2);
    
    // 1. Laterales (Sides)
    parts.push({
      name: `Lateral ${cabName}`,
      moduleId: cab.id,
      moduleIndex: index,
      qty: 2,
      length: cabH * 10,
      width: d * 10,
      thickness: thickness * 10,
      material: cab.structureColor || state.structureColor,
      edgeL1: true, edgeL2: false, edgeW1: true, edgeW2: true,
      notes: 'Laterales del gabinete'
    });

    // 2. Base
    parts.push({
      name: `Piso ${cabName}`,
      moduleId: cab.id,
      moduleIndex: index,
      qty: 1,
      length: innerW * 10,
      width: d * 10,
      thickness: thickness * 10,
      material: cab.structureColor || state.structureColor,
      edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
      notes: 'Piso del gabinete'
    });

    // 3. Techo o Barras de Armado
    if (cab.type === 'base' || cab.type === 'island') {
        // Barras superior delantera
        parts.push({
            name: `Barra Frontal ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: innerW * 10,
            width: 10 * 10, // 10 cm width
            thickness: thickness * 10,
            material: cab.structureColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false
        });
        // Barra trasera
        parts.push({
            name: `Barra Trasera ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: innerW * 10,
            width: 10 * 10, // 10 cm width
            thickness: thickness * 10,
            material: cab.structureColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false
        });
    } else {
        // Wall or Tall cabinet has a full top
        parts.push({
            name: `Techo ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: innerW * 10,
            width: d * 10,
            thickness: thickness * 10,
            material: cab.structureColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Techo del gabinete'
        });
    }

    // 4. Fondo (Back panel)
    parts.push({
        name: `Fondo Trasera ${cabName}`,
        moduleId: cab.id,
        moduleIndex: index,
        qty: 1,
        length: innerW * 10,
        width: innerH * 10,
        thickness: 3, // Placa MDF 3mm trasera
        material: cab.backColor || state.structureColor,
        edgeL1: false, edgeL2: false, edgeW1: false, edgeW2: false,
        notes: 'Placa de fondo 3mm'
    });

    // 5. Repisas (Shelves) y Divisores si corresponde
    if (cab.variant === '2_doors' || cab.variant === '1_door' || cab.variant?.startsWith('corner_blind') || cab.variant === 'corner_blind') {
        parts.push({
            name: `Repisa ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (innerW - 0.2) * 10,
            width: (d - 4) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false
        });
    } else if (cab.variant === 'tall_1_door' || cab.variant === 'tall_2_doors') {
        parts.push({
            name: `Repisa Despensa ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 4,
            length: (innerW - 0.2) * 10,
            width: (d - 4) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Repisas interiores de despensa alta'
        });
    } else if (cab.variant === 'tall_split_2_doors') {
        parts.push({
            name: `Divisor Fijo Línea Base ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: innerW * 10,
            width: (d - 2) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Divisor estructural a cota 70cm (línea de muebles base)'
        });
        parts.push({
            name: `Repisas Interiores ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 4,
            length: (innerW - 0.2) * 10,
            width: (d - 4) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: '1 repisa módulo inferior + 3 repisas módulo superior'
        });
    } else if (cab.variant === 'tall_oven_micro') {
        parts.push({
            name: `Base Soporte Horno ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: innerW * 10,
            width: (d - 2) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Base reforzada soporte horno a 70cm'
        });
        parts.push({
            name: `Divisor Horno / Microondas ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: innerW * 10,
            width: (d - 2) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Divisor entre horno y microondas empotrado'
        });
        parts.push({
            name: `Techo Nicho Torre ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: innerW * 10,
            width: (d - 2) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Cierre superior nicho de electrodomésticos'
        });
        parts.push({
            name: `Repisas Interiores ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 2,
            length: (innerW - 0.2) * 10,
            width: (d - 4) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: '1 repisa inferior + 1 repisa superior'
        });
    } else if (cab.variant === 'tall_microwave_niche') {
        parts.push({
            name: `Base Soporte Nicho Microondas ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: innerW * 10,
            width: (d - 2) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Base soporte nicho microondas a 70cm'
        });
        parts.push({
            name: `Techo Nicho Abierto ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: innerW * 10,
            width: (d - 2) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Cierre superior nicho abierto para microondas de sobremesa'
        });
        parts.push({
            name: `Repisas Interiores ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 3,
            length: (innerW - 0.2) * 10,
            width: (d - 4) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: '1 repisa inferior + 2 repisas superiores'
        });
    } else if (cab.variant === 'tall_open' || (cab.type === 'tall' && cab.variant === 'open')) {
        parts.push({
            name: `Repisas a la Vista ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 5,
            length: (innerW - 0.2) * 10,
            width: (d - 2) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: '5 repisas vistas distribuidas simétricamente'
        });
    }

    // 6. Frentes (Doors/Drawers)
    const gap = 0.3; // 3mm gap
    const frontMat = cab.doorColor || state.doorColor;
    if (cab.variant?.startsWith('corner_blind') || cab.variant === 'corner_blind') {
        const blindW = Math.max(35, w / 2);
        const doorW = w - blindW - gap * 2;
        parts.push({
            name: `Panel Ciego ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (cabH - gap * 2) * 10,
            width: blindW * 10,
            thickness: thickness * 10,
            material: cab.structureColor || state.structureColor,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Panel ciego frontal esquinero (mismo tono estructura/paredes)'
        });
        parts.push({
            name: `Puerta Frontal ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (cabH - gap * 2) * 10,
            width: doorW * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Puerta batiente esquinero'
        });
        parts.push({
            name: `Poste Amarre Ciego ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: cabH * 10,
            width: 10 * 10,
            thickness: thickness * 10,
            material: cab.structureColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Regleta vertical de fijación'
        });
    } else if (cab.variant === '1_door' || cab.variant === 'spice_rack' || cab.variant === 'tall_1_door') {
        parts.push({
            name: `Puerta Frontal ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (cabH - gap*2) * 10,
            width: (w - gap*2) * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true
        });
    } else if (cab.variant === '2_doors' || cab.variant === 'tall_2_doors') {
        parts.push({
            name: `Puerta Frontal ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 2,
            length: (cabH - gap*2) * 10,
            width: ((w - gap*3)/2) * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true
        });
    } else if (cab.variant === 'tall_split_2_doors') {
        const baseH = 70;
        const lowerDoorH = baseH - gap*2;
        const upperDoorH = (cabH - baseH) - gap*2;
        parts.push({
            name: `Puerta Inferior Base ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: lowerDoorH * 10,
            width: (w - gap*2) * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Puerta inferior a cota de mueble base'
        });
        parts.push({
            name: `Puerta Superior Alta ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: upperDoorH * 10,
            width: (w - gap*2) * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Puerta superior despensa'
        });
    } else if (cab.variant === 'tall_oven_micro') {
        const baseH = 70;
        const ovenH = 60;
        const microH = 38;
        const topH = Math.max(10, cabH - (baseH + ovenH + microH));
        const lowerDoorH = baseH - gap*2;
        const topDoorH = topH - gap*2;

        parts.push({
            name: `Puerta Inferior Base ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: lowerDoorH * 10,
            width: (w - gap*2) * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true
        });
        if (topDoorH > 10) {
            parts.push({
                name: `Puerta Superior Despensa ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: 1,
                length: topDoorH * 10,
                width: (w - gap*2) * 10,
                thickness: thickness * 10,
                material: frontMat,
                edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true
            });
        }
    } else if (cab.variant === 'tall_microwave_niche') {
        const baseH = 70;
        const nicheH = 45;
        const topH = Math.max(10, cabH - (baseH + nicheH));
        const lowerDoorH = baseH - gap*2;
        const topDoorH = topH - gap*2;

        parts.push({
            name: `Puerta Inferior Base ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: lowerDoorH * 10,
            width: (w - gap*2) * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true
        });
        if (topDoorH > 10) {
            parts.push({
                name: `Puerta Superior Despensa ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: 1,
                length: topDoorH * 10,
                width: (w - gap*2) * 10,
                thickness: thickness * 10,
                material: frontMat,
                edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true
            });
        }
    } else if (cab.variant === 'wall_lift_up') {
        parts.push({
            name: `Puerta Elevable Aventos ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (cabH - gap * 2) * 10,
            width: (w - gap * 2) * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Puerta basculante hacia arriba con pistones a gas'
        });
        if (cabH > 50) {
            parts.push({
                name: `Repisa Interior ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: 1,
                length: (innerW - 0.2) * 10,
                width: (d - 2) * 10,
                thickness: thickness * 10,
                material: cab.shelfColor || state.structureColor,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false
            });
        }
    } else if (cab.variant === 'wall_lift_up_double') {
        const sectionH = (cabH - gap * 3) / 2;
        parts.push({
            name: `Puerta Elevable Inferior ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: sectionH * 10,
            width: (w - gap * 2) * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Módulo inferior basculante'
        });
        parts.push({
            name: `Puerta Elevable Superior ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: sectionH * 10,
            width: (w - gap * 2) * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Módulo superior basculante'
        });
        parts.push({
            name: `Divisor Horizontal Fijo ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (innerW - 0.2) * 10,
            width: (d - 2) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Repisa divisoria entre tramos basculantes'
        });
    } else if (cab.variant === 'wall_microwave_niche') {
        const nicheH = 38;
        const topH = Math.max(20, cabH - nicheH - gap * 2);
        const topDoorH = topH - gap * 2;
        parts.push({
            name: `Divisor Base Nicho Microondas ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (innerW - 0.2) * 10,
            width: (d - 2) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Repisa reforzada sobre nicho microondas'
        });
        parts.push({
            name: `Puerta Superior Elevable ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: topDoorH * 10,
            width: (w - gap * 2) * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Puerta abatible superior de mueble microondas'
        });
        if (topH > 45) {
            parts.push({
                name: `Repisa Interior Superior ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: 1,
                length: (innerW - 0.2) * 10,
                width: (d - 2) * 10,
                thickness: thickness * 10,
                material: cab.shelfColor || state.structureColor,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false
            });
        }
    } else if (cab.variant === 'wall_open') {
        parts.push({
            name: `Repisas a la Vista ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 2,
            length: (innerW - 0.2) * 10,
            width: (d - 2) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: '2 repisas vistas interiores'
        });
    } else if (cab.variant === '4_drawers' || cab.variant === '2_pot_drawers' || cab.variant === '1_door_1_drawer') {
        let drawCount = 0;
        let drawerHeights: number[] = [];
        let isPotDrawer = cab.variant === '2_pot_drawers';
        
        if (cab.variant === '4_drawers') { drawCount = 4; drawerHeights = [(cabH - gap*5)/4, (cabH - gap*5)/4, (cabH - gap*5)/4, (cabH - gap*5)/4]; }
        if (cab.variant === '2_pot_drawers') { drawCount = 2; drawerHeights = [(cabH - gap*3)/2, (cabH - gap*3)/2]; }
        if (cab.variant === '1_door_1_drawer') { drawCount = 1; drawerHeights = [18]; } // Just the drawer part
        
        drawerHeights.forEach((dh, i) => {
            parts.push({
                name: `Frente Cajón ${i+1} ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: 1,
                length: (w - gap*2) * 10,
                width: dh * 10,
                thickness: thickness * 10,
                material: cab.drawerFrontColor || frontMat,
                edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
                notes: 'Tapacanto perimetral'
            });
        });

        if (cab.variant === '1_door_1_drawer') {
            const doorH = cabH - gap*3 - 18;
            parts.push({
                name: `Puerta Frontal ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: 1,
                length: (w - gap*2) * 10,
                width: doorH * 10,
                thickness: thickness * 10,
                material: frontMat,
                edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true
            });
        }
        
        // Cajas de cajones calculadas con HARDWARE_SPECS exactos
        const innerDepthMm = (d - 5) * 10;
        const nominalLength = getNominalSlideLength(innerDepthMm);
        const drawerBoxLength = nominalLength - hwSpec.drawerLengthDeduction;
        const drawerBoxOuterWidth = innerW * 10 - hwSpec.slideClearanceTotal;
        const drawerFrontBackLength = drawerBoxOuterWidth - (2 * thickness * 10);
        const sideH = isPotDrawer ? 180 : 120; // 180mm para olleros, 120mm estándar
        const cInnerMat = cab.drawerInnerColor || state.structureColor;

        for (let i=0; i<drawCount; i++) {
            // Laterales cajon
            parts.push({
                name: `Lateral Cajón ${cabName} (${i+1})`,
                moduleId: cab.id, moduleIndex: index, qty: 2,
                length: drawerBoxLength, width: sideH, thickness: thickness * 10, material: cInnerMat,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
                notes: `P/ ${hwSpec.slideName} (NL=${nominalLength}mm)`
            });
            // Frente y trasera caja
            parts.push({
                name: `Tr/Fr Cajón ${cabName} (${i+1})`,
                moduleId: cab.id, moduleIndex: index, qty: 2,
                length: drawerFrontBackLength, width: sideH, thickness: thickness * 10, material: cInnerMat,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
                notes: `P/ ${hwSpec.slideName}`
            });
            // Fondo de cajón (3mm)
            parts.push({
                name: `Fondo Cajón ${cabName} (${i+1})`,
                moduleId: cab.id, moduleIndex: index, qty: 1,
                length: drawerBoxLength, width: drawerBoxOuterWidth, thickness: 3, material: cab.backColor || '#dddddd',
                edgeL1: false, edgeL2: false, edgeW1: false, edgeW2: false,
                notes: 'Fondo ranurado/clavado 3mm'
            });
        }
    }
  });

  return parts;
}

export function generateKitchenHardwareList(cabinets: CabinetType[]) {
    const hardware = [];

    const state = useStore.getState();
    const kState = useKitchenStore.getState();
    const hwSpec = HARDWARE_SPECS[state.drawerHardware || 'Provelcar'] || HARDWARE_SPECS.Provelcar;

    let totalHinges = 0;
    let totalDrawers = 0;
    const slidesByNL: Record<number, number> = {};
    
    let totalStructureScrews = 0;
    let totalStructureMinifix = 0;
    let totalStructureDowels = 0;
    
    let totalDrawerScrews = 0;
    let totalDrawerMinifix = 0;
    let totalDrawerDowels = 0;
    
    let builtInOvensCount = 0;
    let builtInMicrowavesCount = 0;
    let portableMicrowavesCount = 0;
    let stoveFd90Count = 0;
    let fridgeSBSCount = 0;
    let hoodConic90Count = 0;
    let plantDecoCount = 0;
    let wallCabinetsCount = 0;
    let liftUpPistonsCount = 0;
    
    const baseCabinets = cabinets.filter(c => c.type === 'base' || c.type === 'island' || c.type === 'tall');
    
    cabinets.forEach(cab => {
        if (cab.type === 'decoration' || cab.variant?.startsWith('deco_')) {
            if (cab.variant === 'deco_stove') stoveFd90Count += 1;
            else if (cab.variant === 'deco_fridge') fridgeSBSCount += 1;
            else if (cab.variant === 'deco_hood') hoodConic90Count += 1;
            else if (cab.variant === 'deco_plant') plantDecoCount += 1;
            return;
        }

        if (cab.type === 'wall') {
            wallCabinetsCount += 1;
        }

        // Fijaciones estructurales por módulo
        const fixPoints = cab.type === 'tall' ? 36 : (cab.type === 'wall' ? 16 : 20);
        if (state.assemblyType === 'minifix') {
            totalStructureMinifix += fixPoints;
            totalStructureDowels += fixPoints * 2; // 2 tarugos por cada perno minifix de apoyo
        } else {
            totalStructureScrews += fixPoints;
            totalStructureDowels += 8; // Guías de tarugo para alineación
        }

        // Bisagras y Sistemas Elevadores
        if (cab.variant === '1_door' || cab.variant === 'spice_rack' || cab.variant === '1_door_1_drawer' || cab.variant?.startsWith('corner_blind') || cab.variant === 'corner_blind') {
            totalHinges += 2;
        } else if (cab.variant === '2_doors') {
            totalHinges += 4;
        } else if (cab.variant === 'wall_lift_up') {
            liftUpPistonsCount += 2;
        } else if (cab.variant === 'wall_lift_up_double') {
            liftUpPistonsCount += 4;
        } else if (cab.variant === 'wall_microwave_niche') {
            liftUpPistonsCount += 2;
            portableMicrowavesCount += 1;
        } else if (cab.variant === 'tall_1_door') {
            totalHinges += 4;
        } else if (cab.variant === 'tall_2_doors') {
            totalHinges += 8;
        } else if (cab.variant === 'tall_split_2_doors') {
            totalHinges += 6; // 2 inferior + 4 superior
        } else if (cab.variant === 'tall_oven_micro') {
            totalHinges += 4; // 2 inferior + 2 superior
            builtInOvensCount += 1;
            builtInMicrowavesCount += 1;
        } else if (cab.variant === 'tall_microwave_niche') {
            totalHinges += 5; // 2 inferior + 3 superior
            portableMicrowavesCount += 1;
        }
        
        // Cajones
        let cabDrawers = 0;
        if (cab.variant === '4_drawers') cabDrawers = 4;
        if (cab.variant === '2_pot_drawers') cabDrawers = 2;
        if (cab.variant === '1_door_1_drawer') cabDrawers = 1;

        if (cabDrawers > 0) {
            totalDrawers += cabDrawers;
            const innerDepthMm = (cab.depth - 5) * 10;
            const nl = getNominalSlideLength(innerDepthMm);
            slidesByNL[nl] = (slidesByNL[nl] || 0) + cabDrawers;

            // Armado de cajones
            if (state.drawerAssemblyType === 'minifix') {
                totalDrawerMinifix += cabDrawers * 8;
                totalDrawerDowels += cabDrawers * 8;
            } else {
                totalDrawerScrews += cabDrawers * 8; // Tornillos 4x40mm o 4x50mm
            }
        }
    });

    // 1. HERRAJES DE ARMADO (Minifix, Tarugos, Tornillos)
    if (state.assemblyType === 'minifix' || totalDrawerMinifix > 0) {
        const totalMinifix = totalStructureMinifix + totalDrawerMinifix;
        hardware.push({
            Categoria: 'Quincallería',
            Item: 'Pernos Minifix + Cajas Excéntricas 15mm',
            Cantidad: totalMinifix,
            Unidad: 'Juegos',
            Detalles: `Estructura (${totalStructureMinifix}) + Cajones (${totalDrawerMinifix})`
        });
        hardware.push({
            Categoria: 'Insumos',
            Item: 'Tarugos de Madera 8x30mm',
            Cantidad: totalStructureDowels + totalDrawerDowels,
            Unidad: 'Unidades',
            Detalles: 'Encastre y alineación estructural mecanizada'
        });
        hardware.push({
            Categoria: 'Insumos',
            Item: 'Tapas Adhesivas Embellecedoras para Minifix (Ø15mm)',
            Cantidad: totalMinifix,
            Unidad: 'Unidades',
            Detalles: 'Ocultamiento estético de cajas excéntricas'
        });
    }

    if (state.assemblyType === 'spax' || totalDrawerScrews > 0) {
        if (totalStructureScrews > 0) {
            hardware.push({
                Categoria: 'Insumos',
                Item: 'Tornillos Soberbio / Spax 4x50mm',
                Cantidad: totalStructureScrews,
                Unidad: 'Unidades',
                Detalles: 'Armado general de gabinetes y módulos'
            });
            hardware.push({
                Categoria: 'Insumos',
                Item: 'Tapas Adhesivas p/Tornillos',
                Cantidad: totalStructureScrews,
                Unidad: 'Unidades',
                Detalles: 'Tapa-tornillos al tono de la melamina'
            });
        }
        if (totalDrawerScrews > 0) {
            hardware.push({
                Categoria: 'Insumos',
                Item: 'Tornillos Spax 4x40mm (Cajas de Cajón)',
                Cantidad: totalDrawerScrews,
                Unidad: 'Unidades',
                Detalles: 'Fijación de laterales y frentes/traseras de cajón'
            });
        }
        if (totalStructureDowels > 0 && state.assemblyType === 'spax') {
            hardware.push({
                Categoria: 'Insumos',
                Item: 'Tarugos de Madera 8x30mm (Guías)',
                Cantidad: totalStructureDowels,
                Unidad: 'Unidades',
                Detalles: 'Guías de centrado previo a atornillado'
            });
        }
    }

    // Tornillos de fijación frente de cajón
    if (totalDrawers > 0) {
        hardware.push({
            Categoria: 'Insumos',
            Item: 'Tornillos Fijación Frente de Cajón 4x30mm',
            Cantidad: totalDrawers * 4,
            Unidad: 'Unidades',
            Detalles: '4 tornillos por frente exterior'
        });
        hardware.push({
            Categoria: 'Insumos',
            Item: 'Tornillos Fijación Correderas a Lateral 3.5x16mm',
            Cantidad: totalDrawers * 12,
            Unidad: 'Unidades',
            Detalles: 'Fijación técnica de guías telescópicas'
        });
    }

    // 2. CORREDERAS DE CAJÓN (Quincallería con especificación y NL)
    Object.keys(slidesByNL).forEach(nlStr => {
        const nl = Number(nlStr);
        const qty = slidesByNL[nl];
        hardware.push({
            Categoria: 'Quincallería',
            Item: `${hwSpec.slideName} ${nl}mm (NL)`,
            Cantidad: qty,
            Unidad: 'Pares',
            Detalles: `Montaje bajo fondo para profundidad ${nl + 50}mm`
        });
    });

    // 3. BISAGRAS Y SISTEMAS ELEVADORES (Quincallería)
    if (totalHinges > 0) {
        hardware.push({
            Categoria: 'Quincallería',
            Item: 'Bisagras Cazoleta 35mm Rectas (Cierre Suave)',
            Cantidad: totalHinges,
            Unidad: 'Unidades',
            Detalles: 'Puertas exteriores de gabinetes y despensas'
        });
        hardware.push({
            Categoria: 'Insumos',
            Item: 'Tornillos Fijación Bisagras 3.5x16mm',
            Cantidad: totalHinges * 4,
            Unidad: 'Unidades',
            Detalles: 'Para cazoleta y base de montaje'
        });
    }

    if (liftUpPistonsCount > 0) {
        hardware.push({
            Categoria: 'Quincallería',
            Item: 'Pistones a Gas / Sistema Elevador Aventos (100N / Cierre Suave)',
            Cantidad: liftUpPistonsCount,
            Unidad: 'Unidades',
            Detalles: `${liftUpPistonsCount / 2} juego(s) p/ puertas abatibles superiores de muebles aéreos`
        });
        hardware.push({
            Categoria: 'Insumos',
            Item: 'Tornillos Fijación Sistema Elevador 3.5x16mm',
            Cantidad: liftUpPistonsCount * 4,
            Unidad: 'Unidades',
            Detalles: 'Anclaje a lateral y cara interior de puerta'
        });
    }

    // 4. COLGADORES PARA MUEBLES AÉREOS (Murales)
    if (wallCabinetsCount > 0) {
        hardware.push({
            Categoria: 'Quincallería',
            Item: 'Colgadores Regulables Ocultos p/ Mueble Aéreo (Juego Izq/Der)',
            Cantidad: wallCabinetsCount,
            Unidad: 'Juegos',
            Detalles: 'Capacidad 130kg por par con regulación 3D'
        });
        hardware.push({
            Categoria: 'Quincallería',
            Item: 'Riel de Suspensión Metálico p/ Muro (Tira de Anclaje)',
            Cantidad: wallCabinetsCount,
            Unidad: 'Unidades',
            Detalles: 'Fijación a muro estructural'
        });
    }

    // 5. PATAS REGULABLES PARA MUEBLES BASE E ISLAS
    if (baseCabinets.length > 0) {
        hardware.push({
            Categoria: 'Quincallería',
            Item: 'Patas Regulables 10-15cm para Mueble Base',
            Cantidad: baseCabinets.length * 4,
            Unidad: 'Unidades',
            Detalles: 'Soporte nivelable de gabinetes inferiores'
        });
        hardware.push({
            Categoria: 'Insumos',
            Item: 'Tornillos Fijación Patas Regulables 3.5x16mm',
            Cantidad: baseCabinets.length * 16,
            Unidad: 'Unidades',
            Detalles: '4 tornillos por base de pata'
        });
    }

    // 6. ELECTRODOMÉSTICOS Y DECORACIÓN
    if (builtInOvensCount > 0) hardware.push({ Categoria: 'Equipamiento', Item: 'Horno Eléctrico Empotrable 60cm', Cantidad: builtInOvensCount, Unidad: 'Unidades', Detalles: 'Nicho torre 60cm' });
    if (builtInMicrowavesCount > 0) hardware.push({ Categoria: 'Equipamiento', Item: 'Microondas Empotrado con Marco de Acero', Cantidad: builtInMicrowavesCount, Unidad: 'Unidades', Detalles: 'Nicho torre 38cm' });
    if (portableMicrowavesCount > 0) hardware.push({ Categoria: 'Equipamiento', Item: 'Microondas Portátil / Sobremesa 25L', Cantidad: portableMicrowavesCount, Unidad: 'Unidades', Detalles: 'Nicho abierto' });
    if (stoveFd90Count > 0) hardware.push({ Categoria: 'Equipamiento', Item: 'Cocina FDV FS UNIQUE 90 (Acero Inox - 5 Quemadores + Horno 107L)', Cantidad: stoveFd90Count, Unidad: 'Unidades', Detalles: 'SAP 13297' });
    if (fridgeSBSCount > 0) hardware.push({ Categoria: 'Equipamiento', Item: 'Refrigerador FDV SBS SIGNATURE 2.0 513L (Dark Inox)', Cantidad: fridgeSBSCount, Unidad: 'Unidades', Detalles: 'SAP 16692' });
    if (hoodConic90Count > 0) hardware.push({ Categoria: 'Equipamiento', Item: 'Campana FDV New Conic 90 (Acero Inox - 780 m3/h - 3 Velocidades)', Cantidad: hoodConic90Count, Unidad: 'Unidades', Detalles: 'SAP 16309 (Ancho 898mm, Fondo 500mm, Iluminación LED 2x2W)' });
    if (plantDecoCount > 0) hardware.push({ Categoria: 'Decoración', Item: 'Planta Decorativa Interior con Macetero y Soporte de Madera', Cantidad: plantDecoCount, Unidad: 'Unidades', Detalles: 'Ambientación 3D' });

    // 7. ZÓCALO Y PERFILERÍA OPTIMIZADA A TIRAS DE 3000mm (3m)
    if (kState.showSocle && baseCabinets.length > 0) {
        const socleSystem = calculateSocleSystem(baseCabinets, kState.walls, kState.roomConfig?.vertices);
        const frontLengthMm = socleSystem.pieces.reduce((acc, p) => acc + p.length, 0) * 10;
        const lateralLengthMm = socleSystem.laterals.reduce((acc, l) => acc + l.depth, 0) * 10;
        const totalLinearLengthMm = frontLengthMm + lateralLengthMm;

        const straightJointsCount = socleSystem.straightJoints.length;
        const cornerJoints90Count = socleSystem.corners.length;
        const exposedFlanksCount = socleSystem.laterals.length;
        const socleStrips = Math.max(1, Math.ceil((totalLinearLengthMm * 1.05) / 3000));

        hardware.push({
            Categoria: 'Zócalos',
            Item: 'Zócalo de PVC/Aluminio con Sello de Agua (Tira 3000mm / 3m)',
            Cantidad: socleStrips,
            Unidad: 'Tiras',
            Detalles: `Protección hidrófuga perimetral 10cm. Optimizado a tiras comerciales continuas de 3m (${(totalLinearLengthMm/1000).toFixed(2)} m lineales)`
        });
        if (straightJointsCount > 0) {
            hardware.push({
                Categoria: 'Zócalos',
                Item: 'Perfil Unión Recta 180° para Zócalo (Empalme >3m)',
                Cantidad: straightJointsCount,
                Unidad: 'Unidades',
                Detalles: 'Continuidad técnica en tramos lineales superiores a 3000mm'
            });
        }
        if (cornerJoints90Count > 0) {
            hardware.push({
                Categoria: 'Zócalos',
                Item: 'Conector Esquinero 90° para Zócalo',
                Cantidad: cornerJoints90Count,
                Unidad: 'Unidades',
                Detalles: 'Encuentros frontales y retornos en esquinas expuestas'
            });
        }
        if (exposedFlanksCount > 0) {
            hardware.push({
                Categoria: 'Zócalos',
                Item: 'Terminal / Tapa Final de Zócalo (Remate a Pared)',
                Cantidad: exposedFlanksCount,
                Unidad: 'Unidades',
                Detalles: 'Cierre lateral hermético hacia muro estructural'
            });
        }
        const totalClips = (baseCabinets.length * 2) + exposedFlanksCount;
        hardware.push({
            Categoria: 'Zócalos',
            Item: 'Pinzas / Clips de Fijación Zócalo a Pata',
            Cantidad: totalClips,
            Unidad: 'Unidades',
            Detalles: 'Enganche a presión sobre patas niveladoras'
        });
    }

    return hardware;
}

