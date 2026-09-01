import * as XLSX from 'xlsx-js-style';
import { useStore } from '../store';
import { useKitchenStore } from '../store/kitchenStore';
import { generateKitchenPartsList, generateKitchenHardwareList, HARDWARE_SPECS } from './kitchenManufacturing';
import { generateEdgeBandingList } from './manufacturing';

export const exportKitchenToExcel = () => {
  try {
    const state = useStore.getState();
    const kState = useKitchenStore.getState();
    const cabinets = kState.cabinets;
    const thickness = state.thickness;
    const kerf = 3.2; // mm
    const hplOversize = 20; // mm
    const m2PorPlacaMDF = 2.44 * 1.83; // 4.4652 m²
    const m2PorPlacaHPL = 3.05 * 1.30; // 3.965 m²

    const parts = generateKitchenPartsList(cabinets);
    const hardware = generateKitchenHardwareList(cabinets);
    const edgeBanding = generateEdgeBandingList(parts);

    const DEFAULT_NAMES: Record<string, string> = {
      '#FFFFFF': 'Blanco',
      '#171717': 'Negro',
      '#F8F9FA': 'Bianco Polo',
      '#202020': 'Nero',
      '#D4A373': 'Roble Natural',
      '#A3B18A': 'Verde Salvia',
      '#588157': 'Verde Bosque',
      '#3A5A40': 'Verde Olivo',
      '#E0E1DD': 'Gris Humo',
      '#778DA9': 'Azul Nórdico',
      '#415A77': 'Azul Petróleo',
      '#1B263B': 'Azul Noche',
      '#2B2D42': 'Grafito Mate',
      '#8D99AE': 'Gris Plata',
      '#EDF2F4': 'Blanco Nieve',
      '#DDA15E': 'Madera Teca',
      '#BC6C25': 'Nogal Ceniza',
    };

    const getTextureName = (urlOrColor: string) => {
      if (!urlOrColor) return 'Color Estándar';
      if (urlOrColor.startsWith('data:') || urlOrColor.startsWith('http')) {
        const tex = state.customTextures?.find((t: any) => t.url === urlOrColor);
        return tex ? tex.name.replace(/\.[^/.]+$/, '') : 'Textura Personalizada';
      }
      if (DEFAULT_NAMES[urlOrColor.toUpperCase()]) {
        return DEFAULT_NAMES[urlOrColor.toUpperCase()];
      }
      return `Color ${urlOrColor}`;
    };

    const dataPlacas: any[] = [];
    const dataHPL: any[] = [];

    parts.forEach((p, idx) => {
      const isFront = p.name.toLowerCase().includes('puerta') || p.name.toLowerCase().includes('frente');
      const decorName = getTextureName(p.material);
      const isHPL = (isFront ? state.doorMaterial : state.structureMaterial) === 'hpl';

      if (isHPL) {
        dataHPL.push({
          Gabinete: p.notes?.includes('Cab') ? p.notes : `Gabinete ${(p.moduleIndex || 0) + 1}`,
          Pieza: `${p.name} (Cara HPL)`,
          Material: 'HPL / Laminado Alta Presión',
          Decorativo: decorName,
          'Largo Corte HPL (mm)': (p.length + hplOversize).toFixed(1),
          'Ancho Corte HPL (mm)': (p.width + hplOversize).toFixed(1),
          Cantidad: p.qty
        });
      }

      dataPlacas.push({
        Gabinete: p.notes?.includes('Cab') ? p.notes : `Gabinete ${(p.moduleIndex || 0) + 1}`,
        Pieza: p.name,
        Material: isHPL ? 'MDF Desnudo (Sustrato HPL)' : 'Melamina Estándar',
        Decorativo: decorName,
        'Cortes Totales': p.qty,
        Cantidad: p.qty,
        'Largo (mm)': p.length.toFixed(1),
        'Ancho (mm)': p.width.toFixed(1),
        'Veta (Orientación)': p.grainDirection === 'horizontal' ? 'Horizontal' : 'Vertical',
        'Espesor (mm)': p.thickness.toFixed(1),
        'Tapacanto Largo 1': p.edgeL1 ? 'Sí' : 'No',
        'Tapacanto Largo 2': p.edgeL2 ? 'Sí' : 'No',
        'Tapacanto Ancho 1': p.edgeW1 ? 'Sí' : 'No',
        'Tapacanto Ancho 2': p.edgeW2 ? 'Sí' : 'No',
        Notas: p.notes || ''
      });
    });

    // M² calculations
    const placasByMaterial: Record<string, { name: string; m2: number }> = {};
    dataPlacas.forEach(p => {
      const mat = p.Decorativo;
      if (!placasByMaterial[mat]) placasByMaterial[mat] = { name: mat, m2: 0 };
      placasByMaterial[mat].m2 += (parseFloat(p['Ancho (mm)']) * parseFloat(p['Largo (mm)']) * p.Cantidad) / 1000000;
    });

    const hplByDecorativo: Record<string, { name: string; m2: number }> = {};
    dataHPL.forEach(p => {
      const name = p.Decorativo;
      if (!hplByDecorativo[name]) hplByDecorativo[name] = { name, m2: 0 };
      hplByDecorativo[name].m2 += (parseFloat(p['Ancho Corte HPL (mm)']) * parseFloat(p['Largo Corte HPL (mm)']) * p.Cantidad) / 1000000;
    });

    // Metros de tapacanto calculados
    let cantosGabM = 0;
    let cantosFrentesM = 0;

    dataPlacas.forEach(p => {
      const isFront = p.Pieza.toLowerCase().includes('puerta') || p.Pieza.toLowerCase().includes('frente');
      let cantosL = 0;
      if (p['Tapacanto Largo 1'] === 'Sí') cantosL++;
      if (p['Tapacanto Largo 2'] === 'Sí') cantosL++;
      let cantosA = 0;
      if (p['Tapacanto Ancho 1'] === 'Sí') cantosA++;
      if (p['Tapacanto Ancho 2'] === 'Sí') cantosA++;

      const meters = (((cantosL * parseFloat(p['Largo (mm)'])) + (cantosA * parseFloat(p['Ancho (mm)']))) * p.Cantidad) / 1000;
      if (isFront) {
        cantosFrentesM += meters;
      } else {
        cantosGabM += meters;
      }
    });

    const cantosGabTotal = Math.ceil(cantosGabM * 1.1);
    const cantosFrentesTotal = Math.ceil(cantosFrentesM * 1.1);

    // BoM consolidado
    const dataBoM: any[] = [];

    // Mecanizado
    dataBoM.push({
      Categoria: 'Mecanizado',
      Item: 'Descuento de Sierra (Kerf de Corte)',
      Cantidad: kerf,
      Unidad: 'mm',
      Detalles: 'Espesor de sierra compensado en optimización de corte (Guillotina / Panelera)'
    });

    // Herrajes de armado, tableros, tapacantos e insumos calculados en generateKitchenHardwareList
    hardware.forEach(h => {
      dataBoM.push({
        Categoria: h.Categoria || 'Herrajes',
        Item: h.Item,
        Cantidad: h.Cantidad,
        Unidad: h.Unidad,
        Detalles: h.Detalles || ''
      });
    });

    const wb = XLSX.utils.book_new();
    const wsPlacas = XLSX.utils.json_to_sheet(dataPlacas);
    const wsBoM = XLSX.utils.json_to_sheet(dataBoM);
    const wsEdgeBanding = XLSX.utils.json_to_sheet(edgeBanding);

    // Styling function
    const applyStyles = (ws: any, colWidths: number[]) => {
      if (!ws['!ref']) return;
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + '1';
        if (!ws[address]) continue;
        ws[address].s = {
          fill: { patternType: 'solid', fgColor: { rgb: 'F97316' } }, // Orange 500
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { auto: 1 } },
            bottom: { style: 'thin', color: { auto: 1 } },
            left: { style: 'thin', color: { auto: 1 } },
            right: { style: 'thin', color: { auto: 1 } }
          }
        };
      }

      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const address = XLSX.utils.encode_cell({ c: C, r: R });
          if (!ws[address]) continue;
          ws[address].s = ws[address].s || {};
          ws[address].s.border = {
            top: { style: 'thin', color: { rgb: 'CCCCCC' } },
            bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
            left: { style: 'thin', color: { rgb: 'CCCCCC' } },
            right: { style: 'thin', color: { rgb: 'CCCCCC' } }
          };
          ws[address].s.alignment = { vertical: 'center' };
        }
      }

      ws['!cols'] = colWidths.map(w => ({ wch: w }));
    };

    applyStyles(wsPlacas, [16, 28, 26, 24, 12, 10, 14, 14, 18, 14, 18, 18, 18, 18, 30]);
    applyStyles(wsBoM, [16, 52, 14, 24, 50]);
    applyStyles(wsEdgeBanding, [16, 40, 14, 16, 35]);

    XLSX.utils.book_append_sheet(wb, wsPlacas, '1_Placas_y_Cortes');
    if (dataHPL.length > 0) {
      const wsHPL = XLSX.utils.json_to_sheet(dataHPL);
      applyStyles(wsHPL, [16, 28, 26, 24, 18, 18, 10]);
      XLSX.utils.book_append_sheet(wb, wsHPL, '2_Corte_HPL');
    }
    XLSX.utils.book_append_sheet(wb, wsBoM, '2_BOM_y_Herrajes');
    XLSX.utils.book_append_sheet(wb, wsEdgeBanding, '3_Metros_Tapacanto');

    XLSX.writeFile(wb, 'Optimizacion_Cortes_Cocina.xlsx');
  } catch (e: any) {
    console.error('Error exportando Excel de cocina:', e);
  }
};
