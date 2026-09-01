import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function exportBlueprintDomToPdf(
  filename = 'planos_fabricacion_completos_A3.pdf',
  onProgress?: (current: number, total: number) => void
): Promise<boolean> {
  const pages = Array.from(document.querySelectorAll<HTMLElement>('.blueprint-page'));
  if (!pages.length) {
    console.error('No se encontraron páginas de planos (.blueprint-page)');
    return false;
  }

  // A3 Landscape: 420 x 297 mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a3',
    compress: true
  });

  const total = pages.length;

  for (let i = 0; i < total; i++) {
    const pageEl = pages[i];
    if (onProgress) onProgress(i + 1, total);

    if (i > 0) {
      doc.addPage('a3', 'l');
    }

    try {
      const canvas = await html2canvas(pageEl, {
        scale: 1.5, // High resolution for vector/crisp text while maintaining fast generation
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1587, // ~420mm at 96dpi
        windowHeight: 1122
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      doc.addImage(imgData, 'JPEG', 0, 0, 420, 297, undefined, 'FAST');
    } catch (err) {
      console.error(`Error al procesar la página ${i + 1}`, err);
    }
  }

  doc.save(filename);
  return true;
}
