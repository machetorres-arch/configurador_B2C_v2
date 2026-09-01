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
  interface ItemToPlace {
    id: string;
    name: string;
    w: number;
    h: number;
    eL1: boolean;
    eL2: boolean;
    eW1: boolean;
    eW2: boolean;
    allowRotation: boolean;
  }

  const baseItems: ItemToPlace[] = [];
  parts.forEach(p => {
    for (let i = 0; i < p.qty; i++) {
      baseItems.push({
        id: `${p.id}-${i}`,
        name: p.name,
        w: Math.round(p.length),
        h: Math.round(p.width),
        eL1: p.edgeL1,
        eL2: p.edgeL2,
        eW1: p.edgeW1,
        eW2: p.edgeW2,
        allowRotation: p.allowRotation ?? true
      });
    }
  });

  if (baseItems.length === 0) return [];

  // Split Rules for Pure Industrial Guillotine Cutting (Beam saw / Panel saw / Encuadradora)
  type SplitRule = 'ShorterAxis' | 'LongerAxis' | 'HorizontalFirst' | 'VerticalFirst' | 'MinArea';

  // Helper to run a Guillotine Simulation with a specific sort order and split rule
  const runGuillotineSimulation = (items: ItemToPlace[], splitRule: SplitRule, preferStrips: 'horizontal' | 'vertical' = 'vertical'): BoardResult[] => {
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

    // Pure Guillotine Split function: Divides a rectangle into exactly 2 disjoint sub-rectangles
    const splitGuillotineRect = (freeRects: Rect[], frIndex: number, pw: number, ph: number) => {
      const fr = freeRects[frIndex];
      freeRects.splice(frIndex, 1);

      const remW = fr.w - pw - kerf;
      const remH = fr.h - ph - kerf;

      // Determine cut orientation based on industrial panel saw cutting rules
      let cutHorizontally = false;

      if (remW <= 0 && remH <= 0) {
        return; // Exact fit, no remnant rects created
      } else if (remW <= 0) {
        cutHorizontally = true;
      } else if (remH <= 0) {
        cutHorizontally = false;
      } else {
        switch (splitRule) {
          case 'HorizontalFirst':
            cutHorizontally = true;
            break;
          case 'VerticalFirst':
            cutHorizontally = false;
            break;
          case 'ShorterAxis':
            // Cut along the shorter dimension of fr to preserve longer continuous strips
            cutHorizontally = fr.w < fr.h;
            break;
          case 'LongerAxis':
            cutHorizontally = fr.w >= fr.h;
            break;
          case 'MinArea':
          default:
            // Prefer keeping the larger remnant area continuous
            cutHorizontally = (pw * remH) > (remW * ph);
            break;
        }
      }

      if (cutHorizontally) {
        // Horizontal Guillotine Cut across fr.w:
        // Top-Right rect (same strip height ph):
        if (remW > 0 && ph > 0) {
          freeRects.push({ x: fr.x + pw + kerf, y: fr.y, w: remW, h: ph });
        }
        // Bottom rect (full strip width fr.w across):
        if (remH > 0 && fr.w > 0) {
          freeRects.push({ x: fr.x, y: fr.y + ph + kerf, w: fr.w, h: remH });
        }
      } else {
        // Vertical Guillotine Cut across fr.h:
        // Bottom-Left rect (same strip width pw):
        if (remH > 0 && pw > 0) {
          freeRects.push({ x: fr.x, y: fr.y + ph + kerf, w: pw, h: remH });
        }
        // Right rect (full strip height fr.h across):
        if (remW > 0 && fr.h > 0) {
          freeRects.push({ x: fr.x + pw + kerf, y: fr.y, w: remW, h: fr.h });
        }
      }
    };

    // Place an item into the best fitting Guillotine Free Rectangle
    const tryPlaceItem = (board: BoardResult, item: ItemToPlace): boolean => {
      let bestScore = Infinity;
      let bestRectIndex = -1;
      let bestRotated = false;

      for (let i = 0; i < board.freeRects.length; i++) {
        const fr = board.freeRects[i];

        // 1. Normal Orientation
        if (item.w <= fr.w && item.h <= fr.h) {
          // Exact strip fit bonus
          const isExactWidth = Math.abs(fr.w - item.w) < 1;
          const isExactHeight = Math.abs(fr.h - item.h) < 1;
          const shortSideFit = Math.min(fr.w - item.w, fr.h - item.h);
          const areaFit = (fr.w * fr.h) - (item.w * item.h);
          
          let score = shortSideFit * 1000 + areaFit;
          if (isExactHeight || isExactWidth) score -= 5000000; // Prioritize continuing existing guillotine strip

          if (score < bestScore) {
            bestScore = score;
            bestRectIndex = i;
            bestRotated = false;
          }
        }

        // 2. Rotated Orientation (if grain allows)
        if (item.allowRotation && item.h <= fr.w && item.w <= fr.h) {
          const isExactWidth = Math.abs(fr.w - item.h) < 1;
          const isExactHeight = Math.abs(fr.h - item.w) < 1;
          const shortSideFit = Math.min(fr.w - item.h, fr.h - item.w);
          const areaFit = (fr.w * fr.h) - (item.h * item.w);
          
          let score = shortSideFit * 1000 + areaFit;
          if (isExactHeight || isExactWidth) score -= 5000000;

          if (score < bestScore) {
            bestScore = score;
            bestRectIndex = i;
            bestRotated = true;
          }
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

        // Perform Guillotine Split
        splitGuillotineRect(board.freeRects, bestRectIndex, pw, ph);

        board.usedArea += (pw * ph);
        board.wastePercentage = 100 - ((board.usedArea / board.totalArea) * 100);
        return true;
      }

      return false;
    };

    // Process all items
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
        tryPlaceItem(newBoard, item);
        boards.push(newBoard);
      }
    }

    return boards;
  };

  // 2. Multi-Heuristic Tournament: Test multiple industrial panel-saw sorting & guillotine strategies
  const candidateSorts: { name: string; sortFn: (a: ItemToPlace, b: ItemToPlace) => number }[] = [
    {
      name: 'AreaDesc',
      sortFn: (a, b) => (b.w * b.h) - (a.w * a.h) || Math.max(b.w, b.h) - Math.max(a.w, a.h)
    },
    {
      name: 'LongestSideDesc',
      sortFn: (a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h) || (b.w * b.h) - (a.w * a.h)
    },
    {
      name: 'StripWidthCluster',
      // Cluster parts with identical strip widths (e.g. 564mm, 490mm, 120mm, 100mm)
      sortFn: (a, b) => {
        const minA = Math.min(a.w, a.h);
        const minB = Math.min(b.w, b.h);
        if (minB !== minA) return minB - minA;
        return (b.w * b.h) - (a.w * a.h);
      }
    },
    {
      name: 'HeightDescThenWidth',
      sortFn: (a, b) => b.h - a.h || b.w - a.w
    },
    {
      name: 'WidthDescThenHeight',
      sortFn: (a, b) => b.w - a.w || b.h - a.h
    }
  ];

  const candidateSplitRules: SplitRule[] = ['ShorterAxis', 'HorizontalFirst', 'VerticalFirst', 'MinArea'];

  let bestBoards: BoardResult[] | null = null;
  let minBoardsCount = Infinity;
  let minWaste = Infinity;

  // Run tournament across industrial guillotine strategies
  for (const sortStrategy of candidateSorts) {
    const sortedItems = [...baseItems].sort(sortStrategy.sortFn);

    for (const splitRule of candidateSplitRules) {
      const result = runGuillotineSimulation(sortedItems, splitRule);
      const totalWaste = result.reduce((acc, b) => acc + b.wastePercentage, 0) / (result.length || 1);

      if (
        result.length < minBoardsCount || 
        (result.length === minBoardsCount && totalWaste < minWaste)
      ) {
        bestBoards = result;
        minBoardsCount = result.length;
        minWaste = totalWaste;
      }
    }
  }

  return bestBoards || [];
}
