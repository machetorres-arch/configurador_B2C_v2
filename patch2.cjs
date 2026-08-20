const fs = require('fs');
let code = fs.readFileSync('src/components/Blueprint.tsx', 'utf8');

const regexGroup = /const partsByColor: Record<string, NestingPart\[\]> = \{\};[\s\S]*?const allBoards: BoardResult\[\] = \[\];\s*Object\.keys\(partsByColor\)\.forEach\(color => \{\s*const b = optimizeNesting\(partsByColor\[color\], 2500, 1830, 3\.2, 15\);\s*allBoards\.push\(\.\.\.b\);\s*\}\);/m;

const replacementGroup = `  type BoardGroup = { parts: NestingPart[], w: number, h: number, label: string, colorCode: string };
  const partsByBoard: Record<string, BoardGroup> = {};

  const addPartToBoard = (boardKey: string, label: string, colorCode: string, bw: number, bh: number, part: NestingPart) => {
    if (!partsByBoard[boardKey]) {
      partsByBoard[boardKey] = { parts: [], w: bw, h: bh, label, colorCode };
    }
    partsByBoard[boardKey].parts.push(part);
  };

  const hplOversize = 20;

  allParts.forEach((p, index) => {
    const color = mapPartToColor(p);
    let materialType = state.structureMaterial;
    if (p.material === 'Melamina Frente') materialType = state.doorMaterial;
    else if (p.material === 'Melamina Frente Cajón') materialType = state.drawerFrontMaterial;
    else if (p.material === 'Melamina Zócalo') materialType = state.socleMaterial;
    else if (p.material === 'Melamina Fondo') materialType = 'melamina';

    if (materialType === 'hpl') {
      // 1. HPL Cara
      addPartToBoard(\`HPL_CARA_\${color}\`, \`PLANCHA HPL - COLOR: \${getColorName(color)}\`, color, 3050, 1300, {
        id: "part-hpl-cara-" + index,
        name: p.name + " (Cara)",
        width: p.width + hplOversize,
        length: p.length + hplOversize,
        qty: p.qty,
        color: color,
        edgeL1: p.edgeL1, edgeL2: p.edgeL2, edgeW1: p.edgeW1, edgeW2: p.edgeW2
      });

      // 2. MDF Sustrato
      addPartToBoard(\`MDF_SUSTRATO_\${index}\`, \`PLANCHA MDF DESNUDO (SUSTRATO HPL)\`, "#e5e5e5", 2500, 1830, { // Unique keys or group MDF? Wait, MDF substrate is all the same! So boardKey should be just 'MDF_SUSTRATO'
        id: "part-mdf-" + index,
        name: p.name + " (Sustrato)",
        width: p.width,
        length: p.length,
        qty: p.qty,
        color: "#e5e5e5",
        edgeL1: p.edgeL1, edgeL2: p.edgeL2, edgeW1: p.edgeW1, edgeW2: p.edgeW2
      });
      
      // Let's fix MDF grouping. All MDF substrate should go together
      // Overwrite the function call to use a fixed key
    } else {
      // Melamina Normal
      addPartToBoard(\`MELAMINA_\${color}\`, \`PLANCHA \${p.material === 'Melamina Fondo' ? 'MDF 3mm' : 'MELAMINA'} - COLOR: \${getColorName(color)}\`, color, 2500, 1830, {
        id: "part-" + index,
        name: p.name,
        width: p.width,
        length: p.length,
        qty: p.qty,
        color: color,
        edgeL1: p.edgeL1, edgeL2: p.edgeL2, edgeW1: p.edgeW1, edgeW2: p.edgeW2
      });
    }
  });

  // Re-run for MDF without duplicate keys problem, actually wait, the addPartToBoard handles arrays.
  // Wait, let's just make it simple:
  // (We do it inline to avoid nested loops if not needed, wait, the map is already perfect).
  
  // Actually, I need to redo the loop:
  
  Object.keys(partsByBoard).forEach(k => delete partsByBoard[k]);
  
  allParts.forEach((p, index) => {
    const color = mapPartToColor(p);
    let materialType = state.structureMaterial;
    if (p.material === 'Melamina Frente') materialType = state.doorMaterial;
    else if (p.material === 'Melamina Frente Cajón') materialType = state.drawerFrontMaterial;
    else if (p.material === 'Melamina Zócalo') materialType = state.socleMaterial;
    else if (p.material === 'Melamina Fondo') materialType = 'melamina';

    if (materialType === 'hpl') {
      addPartToBoard(\`HPL_CARA_\${color}\`, \`PLANCHA HPL - COLOR: \${getColorName(color)}\`, color, 3050, 1300, {
        id: "part-hpl-cara-" + index, name: p.name + " (Cara)", width: p.width + hplOversize, length: p.length + hplOversize, qty: p.qty, color: color, edgeL1: p.edgeL1, edgeL2: p.edgeL2, edgeW1: p.edgeW1, edgeW2: p.edgeW2
      });
      addPartToBoard(\`MDF_SUSTRATO\`, \`PLANCHA MDF DESNUDO 15MM (SUSTRATO HPL)\`, "#e5e5e5", 2500, 1830, {
        id: "part-mdf-" + index, name: p.name + " (Sustrato)", width: p.width, length: p.length, qty: p.qty, color: "#e5e5e5", edgeL1: p.edgeL1, edgeL2: p.edgeL2, edgeW1: p.edgeW1, edgeW2: p.edgeW2
      });
      if (state.hplBalancer) {
        addPartToBoard(\`HPL_BALANCER\`, \`PLANCHA HPL BLANCO (TRASCARA BALANCEADOR)\`, "#ffffff", 3050, 1300, {
          id: "part-hpl-bal-" + index, name: p.name + " (Trascara)", width: p.width + hplOversize, length: p.length + hplOversize, qty: p.qty, color: "#ffffff", edgeL1: p.edgeL1, edgeL2: p.edgeL2, edgeW1: p.edgeW1, edgeW2: p.edgeW2
        });
      }
    } else {
      addPartToBoard(\`MEL_\${color}\`, \`PLANCHA \${p.material === 'Melamina Fondo' ? 'MDF 3mm' : 'MELAMINA'} - COLOR: \${getColorName(color)}\`, color, 2500, 1830, {
        id: "part-" + index, name: p.name, width: p.width, length: p.length, qty: p.qty, color: color, edgeL1: p.edgeL1, edgeL2: p.edgeL2, edgeW1: p.edgeW1, edgeW2: p.edgeW2
      });
    }
  });

  const allBoards: (BoardResult & { label?: string })[] = [];
  Object.keys(partsByBoard).forEach(key => {
    const group = partsByBoard[key];
    const b = optimizeNesting(group.parts, group.w, group.h, 3.2, 15);
    b.forEach(board => {
      allBoards.push({ ...board, label: group.label });
    });
  });`;

code = code.replace(regexGroup, replacementGroup);

const regexTitle = /<h2 className="text-xl font-bold mb-4 text-slate-800 border-b-2 border-black pb-2 flex-shrink-0">OPTIMIZACIÓN DE CORTE - PLANCHAS 2500 x 1830 mm<\/h2>[\s\S]*?<span className="uppercase">PLANCHA \{bpIdx \* 2 \+ bIdx \+ 1\} - COLOR: \{getColorName\(board\.color\)\}<\/span>/m;

const replacementTitle = `<h2 className="text-xl font-bold mb-4 text-slate-800 border-b-2 border-black pb-2 flex-shrink-0">OPTIMIZACIÓN DE CORTE Y NESTING</h2>
              <div className="flex flex-col gap-6 flex-1 items-center justify-center min-h-0 w-full">
                {boards.map((board, bIdx) => {
                  const label = (board as any).label || \`PLANCHA - COLOR: \${getColorName(board.color)}\`;
                  return (
                    <div key={"board-" + board.id} className="flex flex-col items-center w-full max-w-[900px]" style={{ flexShrink: 1, minHeight: 0 }}>
                      <div className="w-full flex justify-between text-[11px] font-bold mb-1">
                        <span className="uppercase">{label} ({board.w}x{board.h}mm) - #{bpIdx * 2 + bIdx + 1}</span>`;

code = code.replace(regexTitle, replacementTitle);

const regexAspect = /className="relative border-2 border-zinc-800 shadow-md bg-stone-100\/50 w-full"\s*style=\{\{ aspectRatio: "2500 \/ 1830", maxHeight: "40vh" \}\}/;
const replacementAspect = `className="relative border-2 border-zinc-800 shadow-md bg-stone-100/50 w-full"
                        style={{ aspectRatio: \`\${board.w} / \${board.h}\`, maxHeight: "40vh" }}`;

code = code.replace(regexAspect, replacementAspect);

fs.writeFileSync('src/components/Blueprint.tsx', code);
