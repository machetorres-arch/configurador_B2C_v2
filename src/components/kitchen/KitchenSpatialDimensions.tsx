import React, { useMemo } from 'react';
import { useKitchenStore, CabinetType, ArchitecturalElement } from '../../store/kitchenStore';
import { useStore } from '../../store';
import { DimensionCota } from '../DimensionCota';

interface Flank {
  cabId: string;
  point: [number, number]; // [x, z]
  direction: [number, number]; // unit vector outward [dx, dz]
  yElevation: number;
  isTerminal: boolean;
}

// Ray-line segment intersection in 2D (X-Z plane)
function raySegmentIntersection(
  origin: [number, number],
  dir: [number, number],
  segStart: [number, number],
  segEnd: [number, number]
): { distance: number; point: [number, number] } | null {
  const [ox, oz] = origin;
  const [dx, dz] = dir;
  const [x1, z1] = segStart;
  const [x2, z2] = segEnd;

  const wx = x2 - x1;
  const wz = z2 - z1;

  const det = dx * wz - dz * wx;
  if (Math.abs(det) < 1e-4) return null; // Parallel

  const qx = x1 - ox;
  const qz = z1 - oz;

  const t = (qx * wz - qz * wx) / det;
  const s = (qx * dz - qz * dx) / det;

  if (t > 1.5 && s >= -0.02 && s <= 1.02) {
    return {
      distance: t,
      point: [ox + t * dx, oz + t * dz],
    };
  }
  return null;
}

export function KitchenSpatialDimensions() {
  const showDimensions = useStore((s) => s.showDimensions);
  const dimensionLevel = useStore((s) => s.dimensionLevel);

  const cabinets = useKitchenStore((s) => s.cabinets);
  const walls = useKitchenStore((s) => s.walls);
  const roomConfig = useKitchenStore((s) => s.roomConfig);
  const architecturalElements = useKitchenStore((s) => s.architecturalElements);
  const toolMode = useKitchenStore((s) => s.toolMode);

  const isEnabled = showDimensions && dimensionLevel >= 6 && !toolMode.startsWith('place_') && toolMode !== 'draw_wall';

  // 1. Gather all room wall segments (centerlines in X-Z)
  const wallSegments = useMemo(() => {
    const segs: Array<{ start: [number, number]; end: [number, number] }> = [];
    if (walls && walls.length > 0) {
      walls.forEach((w) => segs.push({ start: w.start, end: w.end }));
    } else if (roomConfig?.vertices && roomConfig.vertices.length >= 3) {
      const v = roomConfig.vertices;
      for (let i = 0; i < v.length; i++) {
        const next = (i + 1) % v.length;
        segs.push({ start: [v[i].x, v[i].y], end: [v[next].x, v[next].y] });
      }
    }
    return segs;
  }, [walls, roomConfig]);

  // 2. Identify all terminal cabinets ("últimos muebles" de cada corrida o módulos aislados)
  const terminalFlanks = useMemo(() => {
    const flanks: Flank[] = [];

    const getCabinetCorners = (cab: CabinetType) => {
      const rot = cab.rotation || 0;
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      const halfW = cab.width / 2;
      const leftPt: [number, number] = [
        cab.position[0] - halfW * cos,
        cab.position[2] - halfW * sin,
      ];
      const rightPt: [number, number] = [
        cab.position[0] + halfW * cos,
        cab.position[2] + halfW * sin,
      ];
      const leftDir: [number, number] = [-cos, -sin];
      const rightDir: [number, number] = [cos, sin];
      return { leftPt, rightPt, leftDir, rightDir };
    };

    const dist = (p1: [number, number], p2: [number, number]) =>
      Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);

    for (const cab of cabinets) {
      const { leftPt, rightPt, leftDir, rightDir } = getCabinetCorners(cab);
      const yElev = cab.type === 'wall' ? cab.position[1] : 45;

      let hasLeftNeighbor = false;
      let hasRightNeighbor = false;

      for (const other of cabinets) {
        if (other.id === cab.id) continue;
        const isWall1 = cab.type === 'wall';
        const isWall2 = other.type === 'wall';
        if (isWall1 !== isWall2) continue;

        const otherCorners = getCabinetCorners(other);

        if (
          dist(leftPt, otherCorners.rightPt) < 8 ||
          dist(leftPt, otherCorners.leftPt) < 8
        ) {
          hasLeftNeighbor = true;
        }
        if (
          dist(rightPt, otherCorners.leftPt) < 8 ||
          dist(rightPt, otherCorners.rightPt) < 8
        ) {
          hasRightNeighbor = true;
        }
      }

      if (!hasLeftNeighbor) {
        flanks.push({
          cabId: cab.id,
          point: leftPt,
          direction: leftDir,
          yElevation: yElev,
          isTerminal: true,
        });
      }
      if (!hasRightNeighbor) {
        flanks.push({
          cabId: cab.id,
          point: rightPt,
          direction: rightDir,
          yElevation: yElev,
          isTerminal: true,
        });
      }
    }

    return flanks;
  }, [cabinets]);

  // 3. Calculate spatial distance from terminal flanks to walls
  const wallDimensions = useMemo(() => {
    const results: Array<{
      id: string;
      start: [number, number, number];
      end: [number, number, number];
      label: string;
    }> = [];

    for (const flank of terminalFlanks) {
      let closestHit: { distance: number; point: [number, number] } | null = null;

      for (const seg of wallSegments) {
        const hit = raySegmentIntersection(flank.point, flank.direction, seg.start, seg.end);
        if (hit) {
          if (!closestHit || hit.distance < closestHit.distance) {
            closestHit = hit;
          }
        }
      }

      // Filter: only show if space to wall is between 2cm and 350cm (carpenters/fitters need clearance)
      if (closestHit && closestHit.distance >= 2 && closestHit.distance <= 350) {
        const d = closestHit.distance;
        results.push({
          id: `wall-dim-${flank.cabId}-${flank.point[0].toFixed(0)}-${flank.point[1].toFixed(0)}`,
          start: [flank.point[0], flank.yElevation, flank.point[1]],
          end: [closestHit.point[0], flank.yElevation, closestHit.point[1]],
          label: `${d.toFixed(1)} cm a Muro`,
        });
      }
    }

    return results;
  }, [terminalFlanks, wallSegments]);

  // 4. Calculate spatial distance from island cabinets to base/tall cabinets
  const islandToBaseDimensions = useMemo(() => {
    const results: Array<{
      id: string;
      start: [number, number, number];
      end: [number, number, number];
      label: string;
    }> = [];

    const islands = cabinets.filter((c) => c.type === 'island');
    const bases = cabinets.filter((c) => c.type === 'base' || c.type === 'tall');

    if (islands.length === 0 || bases.length === 0) return results;

    const getCabinetBox2D = (cab: CabinetType) => {
      const rot = cab.rotation || 0;
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      const hw = cab.width / 2;
      const hd = cab.depth / 2;
      const [cx, , cz] = cab.position;

      // 4 corners of cabinet
      const corners: Array<[number, number]> = [
        [cx - hw * cos + hd * sin, cz - hw * sin - hd * cos],
        [cx + hw * cos + hd * sin, cz + hw * sin - hd * cos],
        [cx + hw * cos - hd * sin, cz + hw * sin + hd * cos],
        [cx - hw * cos - hd * sin, cz - hw * sin + hd * cos],
      ];
      return { cx, cz, hw, hd, corners };
    };

    // Find the closest island-base pair
    let minPair: {
      islandPt: [number, number];
      basePt: [number, number];
      distance: number;
    } | null = null;

    for (const isl of islands) {
      const islBox = getCabinetBox2D(isl);
      for (const base of bases) {
        const baseBox = getCabinetBox2D(base);

        // Check corner-to-corner or center-to-edge
        for (const p1 of islBox.corners) {
          for (const p2 of baseBox.corners) {
            const d = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
            if (!minPair || d < minPair.distance) {
              minPair = { islandPt: p1, basePt: p2, distance: d };
            }
          }
        }

        // Also check perpendicular projection between cabinet centers
        const dCenters = Math.hypot(islBox.cx - baseBox.cx, islBox.cz - baseBox.cz);
        const approxClearance = dCenters - islBox.hd - baseBox.hd;
        if (approxClearance > 15 && (!minPair || approxClearance < minPair.distance)) {
          // Mid-vector
          const uX = (baseBox.cx - islBox.cx) / dCenters;
          const uZ = (baseBox.cz - islBox.cz) / dCenters;
          const pIsl: [number, number] = [islBox.cx + uX * islBox.hd, islBox.cz + uZ * islBox.hd];
          const pBase: [number, number] = [baseBox.cx - uX * baseBox.hd, baseBox.cz - uZ * baseBox.hd];
          minPair = { islandPt: pIsl, basePt: pBase, distance: approxClearance };
        }
      }
    }

    if (minPair && minPair.distance >= 15 && minPair.distance <= 350) {
      results.push({
        id: 'island-base-clearance',
        start: [minPair.islandPt[0], 75, minPair.islandPt[1]],
        end: [minPair.basePt[0], 75, minPair.basePt[1]],
        label: `Pasillo Isla-Base: ${minPair.distance.toFixed(1)} cm`,
      });
    }

    return results;
  }, [cabinets]);

  // 5. Calculate distance from cabinets to pillars (el.type === 'pillar')
  const pillarDimensions = useMemo(() => {
    const results: Array<{
      id: string;
      start: [number, number, number];
      end: [number, number, number];
      label: string;
    }> = [];

    const pillars = architecturalElements.filter((el) => el.type === 'pillar');
    if (pillars.length === 0 || cabinets.length === 0) return results;

    for (const pillar of pillars) {
      const pX = pillar.position[0];
      const pZ = pillar.position[2];

      let closestCab: {
        cabPt: [number, number];
        pillarPt: [number, number];
        dist: number;
        y: number;
      } | null = null;

      for (const cab of cabinets) {
        const [cx, cy, cz] = cab.position;
        const d = Math.hypot(cx - pX, cz - pZ);
        const clearance = Math.max(0, d - cab.width / 2 - (pillar.width || 20) / 2);

        if (clearance >= 2 && clearance <= 280) {
          if (!closestCab || clearance < closestCab.dist) {
            const uX = (pX - cx) / (d || 1);
            const uZ = (pZ - cz) / (d || 1);
            const cabPt: [number, number] = [cx + uX * (cab.width / 2), cz + uZ * (cab.depth / 2)];
            const pilPt: [number, number] = [pX - uX * ((pillar.width || 20) / 2), pZ - uZ * ((pillar.depth || 20) / 2)];
            closestCab = {
              cabPt,
              pillarPt: pilPt,
              dist: clearance,
              y: cab.type === 'wall' ? cy : 45,
            };
          }
        }
      }

      if (closestCab) {
        results.push({
          id: `pillar-dim-${pillar.id}`,
          start: [closestCab.cabPt[0], closestCab.y, closestCab.cabPt[1]],
          end: [closestCab.pillarPt[0], closestCab.y, closestCab.pillarPt[1]],
          label: `Pilar: ${closestCab.dist.toFixed(1)} cm`,
        });
      }
    }

    return results;
  }, [architecturalElements, cabinets]);

  // 6. Calculate distance from cabinets to openings (doors & windows)
  const openingDimensions = useMemo(() => {
    const results: Array<{
      id: string;
      start: [number, number, number];
      end: [number, number, number];
      label: string;
    }> = [];

    const openings = architecturalElements.filter((el) => el.type === 'door' || el.type === 'window');
    if (openings.length === 0 || cabinets.length === 0) return results;

    for (const op of openings) {
      const oX = op.position[0];
      const oZ = op.position[2];
      const rot = op.rotation || 0;
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      const hw = op.width / 2;

      // Left and right jambs
      const jambLeft: [number, number] = [oX - hw * cos, oZ - hw * sin];
      const jambRight: [number, number] = [oX + hw * cos, oZ + hw * sin];

      for (const jamb of [jambLeft, jambRight]) {
        let closestCab: {
          cabPt: [number, number];
          dist: number;
          y: number;
        } | null = null;

        for (const cab of cabinets) {
          const [cx, cy, cz] = cab.position;
          const d = Math.hypot(cx - jamb[0], cz - jamb[1]);
          const clearance = Math.max(0, d - cab.width / 2);

          if (clearance >= 2 && clearance <= 250) {
            if (!closestCab || clearance < closestCab.dist) {
              const uX = (jamb[0] - cx) / (d || 1);
              const uZ = (jamb[1] - cz) / (d || 1);
              const cabPt: [number, number] = [cx + uX * (cab.width / 2), cz + uZ * (cab.depth / 2)];
              closestCab = {
                cabPt,
                dist: clearance,
                y: cab.type === 'wall' ? cy : 45,
              };
            }
          }
        }

        if (closestCab) {
          const labelPrefix = op.type === 'door' ? 'Puerta' : 'Ventana';
          results.push({
            id: `opening-dim-${op.id}-${jamb[0].toFixed(0)}`,
            start: [closestCab.cabPt[0], closestCab.y, closestCab.cabPt[1]],
            end: [jamb[0], closestCab.y, jamb[1]],
            label: `${labelPrefix}: ${closestCab.dist.toFixed(1)} cm`,
          });
        }
      }
    }

    return results;
  }, [architecturalElements, cabinets]);

  if (!isEnabled) return null;

  return (
    <group name="kitchenSpatialDimensionsGroup" renderOrder={999}>
      {/* 1. Medidas a muros desde extremos de corridas */}
      {wallDimensions.map((dim) => (
        <DimensionCota
          key={dim.id}
          start={dim.start}
          end={dim.end}
          label={dim.label}
          color="#f59e0b" // Amber / Gold architectural cota
          fontSize={5.2}
          lineWidth={2.0}
        />
      ))}

      {/* 2. Pasillo de circulación entre Isla y Muebles Base */}
      {islandToBaseDimensions.map((dim) => (
        <DimensionCota
          key={dim.id}
          start={dim.start}
          end={dim.end}
          label={dim.label}
          color="#0284c7" // Sky blue CAD clearance
          fontSize={5.8}
          lineWidth={2.4}
        />
      ))}

      {/* 3. Medidas libres a Pilares */}
      {pillarDimensions.map((dim) => (
        <DimensionCota
          key={dim.id}
          start={dim.start}
          end={dim.end}
          label={dim.label}
          color="#a855f7" // Purple
          fontSize={5.2}
          lineWidth={1.8}
        />
      ))}

      {/* 4. Medidas libres a Puertas y Ventanas */}
      {openingDimensions.map((dim) => (
        <DimensionCota
          key={dim.id}
          start={dim.start}
          end={dim.end}
          label={dim.label}
          color="#10b981" // Emerald
          fontSize={5.2}
          lineWidth={1.8}
        />
      ))}
    </group>
  );
}
