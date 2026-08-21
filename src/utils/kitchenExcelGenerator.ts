import * as XLSX from 'xlsx-js-style';
import { useStore } from '../store';
import { useKitchenStore } from '../store/kitchenStore';
import { generateKitchenPartsList, generateKitchenHardwareList } from './kitchenManufacturing';
import { generateEdgeBandingList } from './manufacturing';

export const exportKitchenToExcel = () => {
try {
  const state = useStore.getState();
  const kState = useKitchenStore.getState();
  const cabinets = kState.cabinets;
  
  const parts = generateKitchenPartsList(cabinets);
  const hardware = generateKitchenHardwareList(cabinets);
  const edgeBanding = generateEdgeBandingList(parts);
  
  const wsData = parts.map(p => ({
    Especialidad: 'Carpintería / Muebles',
    Material: p.material,
    Pieza: p.name,
    Cantidad: p.qty,
    'Largo (mm)': p.length.toFixed(1),
    'Ancho (mm)': p.width.toFixed(1),
    'Espesor (mm)': p.thickness.toFixed(1),
    'Tapacanto Largo 1': p.edgeL1 ? 'Sí' : 'No',
    'Tapacanto Largo 2': p.edgeL2 ? 'Sí' : 'No',
    'Tapacanto Ancho 1': p.edgeW1 ? 'Sí' : 'No',
    'Tapacanto Ancho 2': p.edgeW2 ? 'Sí' : 'No',
    Notas: p.notes || ''
  }));

  const ws = XLSX.utils.json_to_sheet(wsData);
  const wsHardware = XLSX.utils.json_to_sheet(hardware);
  const wsEdgeBanding = XLSX.utils.json_to_sheet(edgeBanding);

  // Apply styling
  const headerStyle = {
    fill: { fgColor: { rgb: "F97316" } },
    font: { color: { rgb: "FFFFFF" }, bold: true },
    alignment: { horizontal: "center", vertical: "center" }
  };

  [ws, wsHardware, wsEdgeBanding].forEach(sheet => {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (!sheet[address]) continue;
      sheet[address].s = headerStyle;
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Placas y Cortes (Cocina)");
  XLSX.utils.book_append_sheet(wb, wsHardware, "Herrajes e Insumos");
  XLSX.utils.book_append_sheet(wb, wsEdgeBanding, "Metros Tapacanto");

  XLSX.writeFile(wb, "Optimizacion_Cortes_Cocina.xlsx");
} catch(e: any) { console.error(e); }
};
