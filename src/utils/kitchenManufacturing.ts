import { CabinetType } from '../store/kitchenStore';
import { useStore } from '../store';
import { useKitchenStore } from '../store/kitchenStore';
import { Part, generateEdgeBandingList, generateHardwareList } from './manufacturing';
import { calculateSocleSystem } from './kitchenSocle';

export function getNominalSlideLength(nominalDepth: number): number {
    const validLengths = [25, 30, 35, 40, 45, 50, 55, 60, 65, 70];
    let maxValid = 25;
    for (const l of validLengths) {
        if (l <= nominalDepth) {
            maxValid = l;
        } else {
            break;
        }
    }
    return maxValid;
}

export function generateKitchenPartsList(cabinets: CabinetType[]): Part[] {
  const parts: Part[] = [];
  const state = useStore.getState();
  const thickness = state.thickness; // thickness in cm
  
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
    // using 1.5 cm for calculation, though in code we used thickness
    parts.push({
        name: `Fondo Traseara ${cabName}`,
        moduleId: cab.id,
        moduleIndex: index,
        qty: 1,
        length: innerW * 10,
        width: innerH * 10,
        thickness: thickness * 10,
        material: cab.backColor || state.structureColor,
        edgeL1: false, edgeL2: false, edgeW1: false, edgeW2: false
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
    } else if (cab.variant === '4_drawers' || cab.variant === '2_pot_drawers' || cab.variant === '1_door_1_drawer') {
        let drawCount = 0;
        let drawerHeights: number[] = [];
        
        if (cab.variant === '4_drawers') { drawCount = 4; drawerHeights = [(cabH - gap*5)/4, (cabH - gap*5)/4, (cabH - gap*5)/4, (cabH - gap*5)/4]; }
        if (cab.variant === '2_pot_drawers') { drawCount = 2; drawerHeights = [(cabH - gap*3)/2, (cabH - gap*3)/2]; }
        if (cab.variant === '1_door_1_drawer') { drawCount = 1; drawerHeights = [18]; } // Just the drawer part
        
        drawerHeights.forEach((dh, i) => {
            parts.push({
                name: `Frente Cajón ${i+1} ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: 1,
                length: dh * 10,
                width: (w - gap*2) * 10,
                thickness: thickness * 10,
                material: cab.drawerFrontColor || frontMat,
                edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true
            });
        });

        if (cab.variant === '1_door_1_drawer') {
            const doorH = cabH - gap*3 - 18;
            parts.push({
                name: `Puerta Frontal ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: 1,
                length: doorH * 10,
                width: (w - gap*2) * 10,
                thickness: thickness * 10,
                material: frontMat,
                edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true
            });
        }
        
        // Cajas de cajones
        const sideH = 12; // cm
        const slideLen = getNominalSlideLength(d - 5);
        const skw = innerW - 4.9; // mm clear inside width for drawer box calculation
        const cInnerMat = cab.drawerInnerColor || state.structureColor;

        for (let i=0; i<drawCount; i++) {
            // Laterales cajon
            parts.push({
                name: `Cajón Lateral ${cabName} (${i+1})`,
                moduleId: cab.id, moduleIndex: index, qty: 2,
                length: slideLen * 10, width: sideH * 10, thickness: thickness * 10, material: cInnerMat,
                edgeL1: true, edgeL2: false, edgeW1: true, edgeW2: true
            });
            // Frente y trasera caja
            parts.push({
                name: `Cajón F/T ${cabName} (${i+1})`,
                moduleId: cab.id, moduleIndex: index, qty: 2,
                length: skw * 10, width: (sideH - 1.2) * 10, thickness: thickness * 10, material: cInnerMat,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false
            });
            // Fondo de cajón (3mm)
            parts.push({
                name: `Cajón Piso ${cabName} (${i+1})`,
                moduleId: cab.id, moduleIndex: index, qty: 1,
                length: slideLen * 10, width: skw * 10, thickness: 3, material: '#dddddd',
                edgeL1: false, edgeL2: false, edgeW1: false, edgeW2: false
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
    let totalHinges = 0;
    let totalDrawerSlides = 0;
    let totalScrews = 0;
    let builtInOvensCount = 0;
    let builtInMicrowavesCount = 0;
    let portableMicrowavesCount = 0;
    let stoveFd90Count = 0;
    let fridgeSBSCount = 0;
    let plantDecoCount = 0;
    
    const baseCabinets = cabinets.filter(c => c.type === 'base' || c.type === 'island' || c.type === 'tall');
    
    cabinets.forEach(cab => {
        if (cab.type === 'decoration' || cab.variant?.startsWith('deco_')) {
            if (cab.variant === 'deco_stove') stoveFd90Count += 1;
            else if (cab.variant === 'deco_fridge') fridgeSBSCount += 1;
            else if (cab.variant === 'deco_plant') plantDecoCount += 1;
            return;
        }
        totalScrews += cab.type === 'tall' ? 36 : 20; // Structural assembly
        if (cab.variant === '1_door' || cab.variant === 'spice_rack' || cab.variant === '1_door_1_drawer' || cab.variant?.startsWith('corner_blind') || cab.variant === 'corner_blind') {
            totalHinges += 2;
        } else if (cab.variant === '2_doors') {
            totalHinges += 4;
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
        
        if (cab.variant === '4_drawers') totalDrawerSlides += 4;
        if (cab.variant === '2_pot_drawers') totalDrawerSlides += 2;
        if (cab.variant === '1_door_1_drawer') totalDrawerSlides += 1;
    });
    
    hardware.push({ Item: 'Tornillos Spax 4x50', Cantidad: totalScrews, 'Unidad': 'un' });
    if (totalHinges > 0) hardware.push({ Item: 'Bisagras Rectas Cierre Suave (Cazoleta 35mm)', Cantidad: totalHinges, 'Unidad': 'un' });
    if (totalDrawerSlides > 0) hardware.push({ Item: `Correderas Ocultas ${state.drawerHardware}`, Cantidad: totalDrawerSlides, 'Unidad': 'par' });
    if (builtInOvensCount > 0) hardware.push({ Item: 'Horno Eléctrico Empotrable 60cm', Cantidad: builtInOvensCount, 'Unidad': 'un' });
    if (builtInMicrowavesCount > 0) hardware.push({ Item: 'Microondas Empotrado con Marco de Acero', Cantidad: builtInMicrowavesCount, 'Unidad': 'un' });
    if (portableMicrowavesCount > 0) hardware.push({ Item: 'Microondas Portátil / Sobremesa 25L', Cantidad: portableMicrowavesCount, 'Unidad': 'un' });
    if (stoveFd90Count > 0) hardware.push({ Item: 'Cocina FDV FS UNIQUE 90 (Acero Inox - 5 Quemadores + Horno 107L)', Cantidad: stoveFd90Count, 'Unidad': 'un' });
    if (fridgeSBSCount > 0) hardware.push({ Item: 'Refrigerador FDV SBS SIGNATURE 2.0 513L (Dark Inox)', Cantidad: fridgeSBSCount, 'Unidad': 'un' });
    if (plantDecoCount > 0) hardware.push({ Item: 'Planta Decorativa Interior con Macetero y Soporte de Madera', Cantidad: plantDecoCount, 'Unidad': 'un' });
    if (baseCabinets.length > 0) {
        hardware.push({ Item: 'Patas Regulables 10cm', Cantidad: baseCabinets.length * 4, 'Unidad': 'un' });
    }

    if (kState.showSocle && baseCabinets.length > 0) {
        let totalLinearLengthMm = 0;
        let exposedFlanksCount = 0;
        let cornerJoints90Count = 0;

        // Identificar corridas lineales continuas (módulos contiguos en la misma línea/rotación)
        const visited = new Set<string>();
        const linearRuns: { lengthMm: number; count: number }[] = [];

        baseCabinets.forEach(cab => {
            const cCos = Math.cos(cab.rotation || 0);
            const cSin = Math.sin(cab.rotation || 0);
            const leftFlank: [number, number] = [
                cab.position[0] - (cab.width / 2) * cCos,
                cab.position[2] - (cab.width / 2) * cSin,
            ];
            const rightFlank: [number, number] = [
                cab.position[0] + (cab.width / 2) * cCos,
                cab.position[2] + (cab.width / 2) * cSin,
            ];

            const leftNeighbor = baseCabinets.find(other => {
                if (other.id === cab.id) return false;
                if (Math.abs(other.position[1] - cab.position[1]) > 30) return false;
                const oCos = Math.cos(other.rotation || 0);
                const oSin = Math.sin(other.rotation || 0);
                const otherRight: [number, number] = [
                    other.position[0] + (other.width / 2) * oCos,
                    other.position[2] + (other.width / 2) * oSin,
                ];
                const otherLeft: [number, number] = [
                    other.position[0] - (other.width / 2) * oCos,
                    other.position[2] - (other.width / 2) * oSin,
                ];
                return Math.hypot(leftFlank[0] - otherRight[0], leftFlank[1] - otherRight[1]) < 4 || Math.hypot(leftFlank[0] - otherLeft[0], leftFlank[1] - otherLeft[1]) < 4;
            });

            const rightNeighbor = baseCabinets.find(other => {
                if (other.id === cab.id) return false;
                if (Math.abs(other.position[1] - cab.position[1]) > 30) return false;
                const oCos = Math.cos(other.rotation || 0);
                const oSin = Math.sin(other.rotation || 0);
                const otherLeft: [number, number] = [
                    other.position[0] - (other.width / 2) * oCos,
                    other.position[2] - (other.width / 2) * oSin,
                ];
                const otherRight: [number, number] = [
                    other.position[0] + (other.width / 2) * oCos,
                    other.position[2] + (other.width / 2) * oSin,
                ];
                return Math.hypot(rightFlank[0] - otherLeft[0], rightFlank[1] - otherLeft[1]) < 4 || Math.hypot(rightFlank[0] - otherRight[0], rightFlank[1] - otherRight[1]) < 4;
            });

            // Si el lateral izquierdo está libre (extremo de corrida)
            if (!leftNeighbor) {
                totalLinearLengthMm += (cab.depth - 4) * 10;
                exposedFlanksCount += 1;
                cornerJoints90Count += 1; // Encuentro frontal-lateral a 90°
            }

            // Si el lateral derecho está libre (extremo de corrida)
            if (!rightNeighbor) {
                totalLinearLengthMm += (cab.depth - 4) * 10;
                exposedFlanksCount += 1;
                cornerJoints90Count += 1; // Encuentro frontal-lateral a 90°
            } else {
                // Verificar si hay encuentro en L a 90° entre corridas
                const rotDiff = Math.abs((rightNeighbor.rotation || 0) - (cab.rotation || 0));
                if (Math.abs(rotDiff - Math.PI / 2) < 0.2 || Math.abs(rotDiff - Math.PI * 1.5) < 0.2) {
                    cornerJoints90Count += 1;
                }
            }

            // Agrupar en corridas lineales para cálculo de tiras continuas de 3000 mm
            if (!visited.has(cab.id)) {
                let runMm = 0;
                let count = 0;
                const queue = [cab];
                visited.add(cab.id);

                while (queue.length > 0) {
                    const current = queue.shift()!;
                    runMm += current.width * 10;
                    count += 1;
                    totalLinearLengthMm += current.width * 10;

                    // Buscar vecinos directos en la misma línea
                    baseCabinets.forEach(other => {
                        if (!visited.has(other.id) && Math.abs((other.rotation || 0) - (current.rotation || 0)) < 0.1 && Math.abs(other.position[1] - current.position[1]) < 30) {
                            const curCos = Math.cos(current.rotation || 0);
                            const curSin = Math.sin(current.rotation || 0);
                            const cL: [number, number] = [current.position[0] - (current.width / 2) * curCos, current.position[2] - (current.width / 2) * curSin];
                            const cR: [number, number] = [current.position[0] + (current.width / 2) * curCos, current.position[2] + (current.width / 2) * curSin];
                            
                            const oCos = Math.cos(other.rotation || 0);
                            const oSin = Math.sin(other.rotation || 0);
                            const oL: [number, number] = [other.position[0] - (other.width / 2) * oCos, other.position[2] - (other.width / 2) * oSin];
                            const oR: [number, number] = [other.position[0] + (other.width / 2) * oCos, other.position[2] + (other.width / 2) * oSin];

                            const isTouching = Math.hypot(cL[0] - oR[0], cL[1] - oR[1]) < 4 || Math.hypot(cR[0] - oL[0], cR[1] - oL[1]) < 4;
                            if (isTouching) {
                                visited.add(other.id);
                                queue.push(other);
                            }
                        }
                    });
                }
                linearRuns.push({ lengthMm: runMm, count });
            }
        });

        // Uniones rectas optimizadas: calculadas por cada punto de corte modular que supere los 3000 mm
        const socleSystem = calculateSocleSystem(baseCabinets);
        const straightJointsCount = socleSystem.straightJoints.length;

        // Tiras comerciales de Zócalo (3000 mm) con cálculo de optimización y 5% de merma
        const socleStrips = Math.max(1, Math.ceil((totalLinearLengthMm * 1.05) / 3000));
        hardware.push({ Item: 'Zócalo de PVC/Aluminio con Sello de Agua (Tira 3m)', Cantidad: socleStrips, 'Unidad': 'tiras' });
        
        // Perfil de Unión Recta (Unión a lo largo 180°) para Zócalo (solo si la corrida supera 3m)
        if (straightJointsCount > 0) {
            hardware.push({ Item: 'Perfil Unión Recta 180° para Zócalo (Empalme a lo largo >3m)', Cantidad: straightJointsCount, 'Unidad': 'un' });
        }

        // Conector Esquinero 90° para Zócalo (Encuentro frontales con retornos laterales y esquinas L)
        if (cornerJoints90Count > 0) {
            hardware.push({ Item: 'Conector Esquinero 90° para Zócalo (Ángulo 90°)', Cantidad: cornerJoints90Count, 'Unidad': 'un' });
        }

        // Terminales de remate a pared
        if (exposedFlanksCount > 0) {
            hardware.push({ Item: 'Terminal / Tapa Final de Zócalo (Remate a Pared)', Cantidad: exposedFlanksCount, 'Unidad': 'un' });
        }

        // Clips de fijación para patas de zócalo (2 clips por módulo + 1 por lateral expuesto)
        const totalClips = (baseCabinets.length * 2) + exposedFlanksCount;
        hardware.push({ Item: 'Pinzas / Clips de Fijación Zócalo a Pata', Cantidad: totalClips, 'Unidad': 'un' });
    }

    return hardware;
}
