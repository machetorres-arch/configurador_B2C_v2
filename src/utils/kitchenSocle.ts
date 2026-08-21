import { CabinetType } from '../store/kitchenStore';

export interface SocleWorldPiece {
  id: string;
  length: number; // in cm
  center: [number, number, number];
  rotation: number;
}

export interface SocleWorldJoint {
  id: string;
  position: [number, number, number];
  rotation: number;
}

export interface SocleLateralReturn {
  id: string;
  position: [number, number, number];
  rotation: number;
  depth: number;
  isRight: boolean;
}

export interface SocleCorner {
  id: string;
  position: [number, number, number];
  rotation: number;
  isRight: boolean;
}

export interface ProcessedSocleSystem {
  pieces: SocleWorldPiece[];
  straightJoints: SocleWorldJoint[];
  laterals: SocleLateralReturn[];
  corners: SocleCorner[];
  socleColor: string;
}

export function calculateSocleSystem(cabinets: CabinetType[]): ProcessedSocleSystem {
  const baseCabinets = cabinets.filter(
    (c) => c.type === 'base' || c.type === 'island' || c.type === 'tall'
  );

  if (baseCabinets.length === 0) {
    return { pieces: [], straightJoints: [], laterals: [], corners: [], socleColor: '#d1d5db' };
  }

  const socleColor = baseCabinets[0]?.socleColor || '#d1d5db';
  const legsHeight = 10;
  const socleY = legsHeight / 2;

  const getFlanks = (cab: CabinetType) => {
    const rot = cab.rotation || 0;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    // Unit vector along width (left -> right)
    const uX: [number, number] = [cos, sin];
    // Unit vector forward (depth axis towards front)
    const uZ: [number, number] = [-sin, cos];

    const left: [number, number] = [
      cab.position[0] - (cab.width / 2) * uX[0],
      cab.position[2] - (cab.width / 2) * uX[1],
    ];
    const right: [number, number] = [
      cab.position[0] + (cab.width / 2) * uX[0],
      cab.position[2] + (cab.width / 2) * uX[1],
    ];
    return { left, right, uX, uZ, rot };
  };

  const dist = (p1: [number, number], p2: [number, number]) =>
    Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);

  const visited = new Set<string>();
  const pieces: SocleWorldPiece[] = [];
  const straightJoints: SocleWorldJoint[] = [];
  const laterals: SocleLateralReturn[] = [];
  const corners: SocleCorner[] = [];

  for (const cab of baseCabinets) {
    if (visited.has(cab.id)) continue;

    // Collect collinear, touching cluster
    const component: CabinetType[] = [];
    const queue: CabinetType[] = [cab];
    visited.add(cab.id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);

      const curFlanks = getFlanks(current);

      for (const other of baseCabinets) {
        if (visited.has(other.id)) continue;
        if (Math.abs(other.position[1] - current.position[1]) > 30) continue;

        const rotDiff = Math.abs((other.rotation || 0) - (current.rotation || 0)) % Math.PI;
        if (rotDiff > 0.1 && Math.abs(rotDiff - Math.PI) > 0.1) continue;

        const otherFlanks = getFlanks(other);
        const isTouching =
          dist(curFlanks.right, otherFlanks.left) < 6 ||
          dist(curFlanks.left, otherFlanks.right) < 6 ||
          dist(curFlanks.right, otherFlanks.right) < 6 ||
          dist(curFlanks.left, otherFlanks.left) < 6;

        if (isTouching) {
          visited.add(other.id);
          queue.push(other);
        }
      }
    }

    // Reference orientation from first cabinet
    const baseRot = component[0].rotation || 0;
    const cos = Math.cos(baseRot);
    const sin = Math.sin(baseRot);
    const uX: [number, number] = [cos, sin];
    const uZ: [number, number] = [-sin, cos];

    // Sort along run direction vector (leftmost to rightmost)
    component.sort((a, b) => {
      const projA = a.position[0] * uX[0] + a.position[2] * uX[1];
      const projB = b.position[0] * uX[0] + b.position[2] * uX[1];
      return projA - projB;
    });

    const maxDepth = Math.max(...component.map((c) => c.depth));
    const frontOffsetZ = maxDepth / 2 - 2;

    // Build Continuous Strips (Max commercial length = 300 cm / 3000 mm)
    const strips: CabinetType[][] = [];
    let currentStrip: CabinetType[] = [];
    let currentStripWidth = 0;

    for (let i = 0; i < component.length; i++) {
      const c = component[i];
      if (currentStrip.length > 0 && currentStripWidth + c.width > 300) {
        strips.push(currentStrip);
        currentStrip = [c];
        currentStripWidth = c.width;
      } else {
        currentStrip.push(c);
        currentStripWidth += c.width;
      }
    }
    if (currentStrip.length > 0) {
      strips.push(currentStrip);
    }

    // Generate 3D piece for each continuous strip
    for (let s = 0; s < strips.length; s++) {
      const stripCabs = strips[s];
      const stripTotalWidth = stripCabs.reduce((acc, c) => acc + c.width, 0);

      const firstInStrip = stripCabs[0];
      const lastInStrip = stripCabs[stripCabs.length - 1];

      // Physical start point (left edge of first cabinet in strip)
      const pStart: [number, number] = [
        firstInStrip.position[0] - (firstInStrip.width / 2) * uX[0],
        firstInStrip.position[2] - (firstInStrip.width / 2) * uX[1],
      ];

      // Physical end point (right edge of last cabinet in strip)
      const pEnd: [number, number] = [
        lastInStrip.position[0] + (lastInStrip.width / 2) * uX[0],
        lastInStrip.position[2] + (lastInStrip.width / 2) * uX[1],
      ];

      // Center of this continuous strip
      const stripCenterX = (pStart[0] + pEnd[0]) / 2 + frontOffsetZ * uZ[0];
      const stripCenterZ = (pStart[1] + pEnd[1]) / 2 + frontOffsetZ * uZ[1];

      pieces.push({
        id: `socle-piece-${stripCabs.map((c) => c.id).join('-')}`,
        length: stripTotalWidth,
        center: [stripCenterX, socleY, stripCenterZ],
        rotation: baseRot,
      });

      // If not the last strip, add 1 Straight 180° H-Joint profile right at the junction
      if (s < strips.length - 1) {
        const jointX = pEnd[0] + frontOffsetZ * uZ[0];
        const jointZ = pEnd[1] + frontOffsetZ * uZ[1];
        straightJoints.push({
          id: `socle-joint-${lastInStrip.id}`,
          position: [jointX, socleY, jointZ],
          rotation: baseRot,
        });
      }
    }

    // Left lateral return & 90° corner on the leftmost cabinet
    const leftmostCab = component[0];
    const leftX = leftmostCab.position[0] - (leftmostCab.width / 2) * uX[0];
    const leftZ = leftmostCab.position[2] - (leftmostCab.width / 2) * uX[1];

    // Left lateral center (-1.0 in local cabinet depth, i.e. middle of side)
    const latLeftX = leftX + 0.6 * uX[0] - 1.0 * uZ[0];
    const latLeftZ = leftZ + 0.6 * uX[1] - 1.0 * uZ[1];
    laterals.push({
      id: `socle-lat-left-${leftmostCab.id}`,
      position: [latLeftX, socleY, latLeftZ],
      rotation: baseRot,
      depth: maxDepth - 4,
      isRight: false,
    });

    // 90° Corner Connector at Front-Left
    const cornLeftX = leftX + 0.6 * uX[0] + frontOffsetZ * uZ[0];
    const cornLeftZ = leftZ + 0.6 * uX[1] + frontOffsetZ * uZ[1];
    corners.push({
      id: `socle-corn-left-${leftmostCab.id}`,
      position: [cornLeftX, socleY, cornLeftZ],
      rotation: baseRot,
      isRight: false,
    });

    // Right lateral return & 90° corner on the rightmost cabinet
    const rightmostCab = component[component.length - 1];
    const rightX = rightmostCab.position[0] + (rightmostCab.width / 2) * uX[0];
    const rightZ = rightmostCab.position[2] + (rightmostCab.width / 2) * uX[1];

    // Right lateral center
    const latRightX = rightX - 0.6 * uX[0] - 1.0 * uZ[0];
    const latRightZ = rightZ - 0.6 * uX[1] - 1.0 * uZ[1];
    laterals.push({
      id: `socle-lat-right-${rightmostCab.id}`,
      position: [latRightX, socleY, latRightZ],
      rotation: baseRot,
      depth: maxDepth - 4,
      isRight: true,
    });

    // 90° Corner Connector at Front-Right
    const cornRightX = rightX - 0.6 * uX[0] + frontOffsetZ * uZ[0];
    const cornRightZ = rightZ - 0.6 * uX[1] + frontOffsetZ * uZ[1];
    corners.push({
      id: `socle-corn-right-${rightmostCab.id}`,
      position: [cornRightX, socleY, cornRightZ],
      rotation: baseRot,
      isRight: true,
    });
  }

  return { pieces, straightJoints, laterals, corners, socleColor };
}
