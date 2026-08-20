export interface NestingPart {
  id: string;
  name: string;
  width: number;
  length: number;
  qty: number;
  color: string;
  edgeL1: boolean;
  edgeL2: boolean;
  edgeW1: boolean;
  edgeW2: boolean;
  allowRotation?: boolean;
}

export interface PlacedPart {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotated: boolean;
  edgeTop: boolean;
  edgeBottom: boolean;
  edgeLeft: boolean;
  edgeRight: boolean;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BoardResult {
  id: number;
  color: string;
  w: number;
  h: number;
  placedParts: PlacedPart[];
  freeRects: Rect[];
  usedArea: number;
  totalArea: number;
  wastePercentage: number;
}

export function optimizeNesting(parts: NestingPart[], boardW = 2500, boardH = 1830, kerf = 3.2, margin = 15): BoardResult[] {
  // 1. Expand parts by quantity
  let items: { id: string, name: string, w: number, h: number, eL1: boolean, eL2: boolean, eW1: boolean, eW2: boolean, allowRotation: boolean }[] = [];
  parts.forEach(p => {
    for(let i = 0; i < p.qty; i++) {
      items.push({ id: `${p.id}-${i}`, name: p.name, w: p.length, h: p.width, eL1: p.edgeL1, eL2: p.edgeL2, eW1: p.edgeW1, eW2: p.edgeW2, allowRotation: p.allowRotation ?? true });
    }
  });

  // 2. Sort items: largest area first, then longest side
  items.sort((a, b) => (b.w * b.h) - (a.w * a.h) || Math.max(b.w, b.h) - Math.max(a.w, a.h));

  const boards: BoardResult[] = [];

  const createBoard = (id: number, color: string): BoardResult => ({
    id,
    color,
    w: boardW,
    h: boardH,
    placedParts: [],
    freeRects: [{ x: margin, y: margin, w: boardW - 2 * margin, h: boardH - 2 * margin }],
    usedArea: 0,
    totalArea: boardW * boardH,
    wastePercentage: 100
  });

  const splitFreeRect = (freeRects: Rect[], fr: Rect, pw: number, ph: number) => {
    const rightW = fr.w - pw - kerf;
    const bottomH = fr.h - ph - kerf;

    const splitHorizontally = (pw * bottomH) > (rightW * ph);

    if (splitHorizontally) {
      if (rightW > 0 && ph > 0) {
        freeRects.push({ x: fr.x + pw + kerf, y: fr.y, w: rightW, h: ph });
      }
      if (bottomH > 0 && fr.w > 0) {
        freeRects.push({ x: fr.x, y: fr.y + ph + kerf, w: fr.w, h: bottomH });
      }
    } else {
      if (rightW > 0 && fr.h > 0) {
        freeRects.push({ x: fr.x + pw + kerf, y: fr.y, w: rightW, h: fr.h });
      }
      if (bottomH > 0 && pw > 0) {
        freeRects.push({ x: fr.x, y: fr.y + ph + kerf, w: pw, h: bottomH });
      }
    }
  };

  const tryPlaceItem = (board: BoardResult, item: { id: string, name: string, w: number, h: number, eL1: boolean, eL2: boolean, eW1: boolean, eW2: boolean, allowRotation: boolean }): boolean => {
    let bestScore = Infinity;
    let bestRectIndex = -1;
    let bestRotated = false;

    for (let i = 0; i < board.freeRects.length; i++) {
      const fr = board.freeRects[i];
      
      // Normal orientation
      if (item.w <= fr.w && item.h <= fr.h) {
        let score = Math.min(fr.w - item.w, fr.h - item.h);
        if (score < bestScore) { bestScore = score; bestRectIndex = i; bestRotated = false; }
      }
      
      // Rotated orientation
      if (item.allowRotation && item.h <= fr.w && item.w <= fr.h) {
        let score = Math.min(fr.w - item.h, fr.h - item.w);
        if (score < bestScore) { bestScore = score; bestRectIndex = i; bestRotated = true; }
      }
    }

    if (bestRectIndex !== -1) {
      const fr = board.freeRects[bestRectIndex];
      const pw = bestRotated ? item.h : item.w;
      const ph = bestRotated ? item.w : item.h;

            let eT = false, eB = false, eL = false, eR = false;
      if (bestRotated) {
        eT = item.eW1; eB = item.eW2; eL = item.eL1; eR = item.eL2;
      } else {
        eT = item.eL1; eB = item.eL2; eL = item.eW1; eR = item.eW2;
      }

      board.placedParts.push({
        id: item.id,
        name: item.name,
        x: fr.x,
        y: fr.y,
        w: pw,
        h: ph,
        rotated: bestRotated,
        edgeTop: eT,
        edgeBottom: eB,
        edgeLeft: eL,
        edgeRight: eR
      });

      board.freeRects.splice(bestRectIndex, 1);
      splitFreeRect(board.freeRects, fr, pw, ph);

      board.usedArea += (pw * ph);
      board.wastePercentage = 100 - ((board.usedArea / board.totalArea) * 100);
      return true;
    }
    
    return false;
  };

  // 3. Process each item
  for (const item of items) {
    let placed = false;
    for (const board of boards) {
      if (tryPlaceItem(board, item)) {
        placed = true;
        break;
      }
    }
    
    if (!placed) {
      const newBoard = createBoard(boards.length + 1, parts[0]?.color || '#ffffff');
      // If it still doesn't fit on an empty board, it means it's larger than the board itself.
      // In a real system, you'd alert the user. Here we just place it and it will clip.
      tryPlaceItem(newBoard, item); 
      boards.push(newBoard);
    }
  }

  return boards;
}
