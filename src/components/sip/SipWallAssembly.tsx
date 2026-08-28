import React, { useMemo } from 'react';
import * as THREE from 'three';
import { SipOpening, WallTarget, ExteriorCladding } from '../../store/sipHouseStore';
import { SipIndividualPanel } from './SipIndividualPanel';
import { TimberPiece } from './TimberPiece';
import { SipWallCladdingAssembly } from './SipWallCladdingAssembly';
import { SipInteractiveOpening } from './SipInteractiveOpening';

interface SipWallAssemblyProps {
  wallId: WallTarget;
  wallLength: number;         // Largo total del muro en metros (ej. 6.0m o 4.0m)
  wallHeight: number;         // Altura del muro en metros (ej. 2.6m)
  wallThickness?: number;     // Espesor total SIP (ej. 0.114m)
  openings: SipOpening[];     // Lista de vanos asignados a este muro
  layerWallsSip: boolean;     // Mostrar paneles SIP
  layerTimberStructure: boolean; // Mostrar estructura de madera
  layerCladding: boolean;     // Revestimiento exterior
  claddingType?: ExteriorCladding;
  layerWindowsDoors: boolean; // Mostrar puertas y ventanas
  isExploded?: boolean;
  explodedProgress?: number;
  explodedOffset?: [number, number, number];
  materials: {
    osbSip: THREE.Material;
    epsCore: THREE.Material;
    osbEdge: THREE.Material;
    timberStructural: THREE.Material;
    timberStructuralVertical?: THREE.Material;
    timberStructuralHorizontal?: THREE.Material;
    timberEndGrain?: THREE.Material;
    timberPine: THREE.Material;
    cladding?: THREE.Material;
    glassWindow: THREE.Material;
    pvcFrameBlack: THREE.Material;
    pvcFrameWood: THREE.Material;
    aluminumRpt: THREE.Material;
    doorLenga: THREE.Material;
    doorHardware: THREE.Material;
    arratiaCladding?: THREE.Material;
    zincalumBlack?: THREE.Material;
    timberCladding?: THREE.Material;
    fiberCement?: THREE.Material;
    tyvekMembrane?: THREE.Material;
    flashingBlack?: THREE.Material;
  };
}

interface CalculatedOpening extends SipOpening {
  wM: number;
  hM: number;
  sillM: number;
  offsetM: number;
  xStart: number;
  xEnd: number;
  yHead: number;
}

interface WallSegment {
  type: 'solid' | 'opening';
  xStart: number;
  xEnd: number;
  width: number;
  opening?: CalculatedOpening;
}

export function SipWallAssembly({
  wallId,
  wallLength,
  wallHeight,
  wallThickness = 0.114,
  openings,
  layerWallsSip,
  layerTimberStructure,
  layerCladding,
  claddingType,
  layerWindowsDoors,
  isExploded = false,
  explodedProgress = 0,
  explodedOffset = [0, 0, 0],
  materials,
}: SipWallAssemblyProps) {
  const timberWidth = Math.max(0.045, wallThickness - 0.022);  // Ancho escuadría según espesor de panel SIP
  const timberThick = 0.041;  // 41 mm espesor escuadría (2" nominal calibrada)

  // 1. Filtrar, ordenar y validar geométricamente los vanos para este muro
  const wallOpenings = useMemo(() => {
    const rawOps = openings.filter((op) => op.assignedWall === wallId);
    const sorted = [...rawOps].sort((a, b) => (a.offsetAlongWall || 0) - (b.offsetAlongWall || 0));

    const validated: CalculatedOpening[] = [];
    let minAllowedX = 0.18; // 18 cm margen desde la esquina para pies derechos
    const rightMargin = 0.18;

    for (const op of sorted) {
      let w = Math.max(0.35, op.width / 100);
      let sill = Math.max(0, op.sillHeight / 100);
      let h = Math.max(0.35, op.height / 100);

      // Limitar altura vertical
      if (h + sill > wallHeight - 0.15) {
        if (op.type === 'door') {
          sill = 0;
          h = Math.max(0.35, wallHeight - 0.15);
        } else {
          h = Math.max(0.35, wallHeight - sill - 0.15);
        }
      }

      // Evitar sobreposición con el vano anterior
      let offset = Math.max(minAllowedX, (op.offsetAlongWall || 50) / 100);

      // Comprobar que no exceda el muro
      if (offset + w > wallLength - rightMargin) {
        const maxOffset = wallLength - rightMargin - w;
        if (maxOffset >= minAllowedX) {
          offset = maxOffset;
        } else {
          offset = minAllowedX;
          w = Math.max(0.35, wallLength - rightMargin - minAllowedX);
        }
      }

      if (w >= 0.3 && offset + w <= wallLength - 0.05) {
        validated.push({
          ...op,
          wM: w,
          hM: h,
          sillM: sill,
          offsetM: offset,
          xStart: offset,
          xEnd: offset + w,
          yHead: sill + h,
        });
        minAllowedX = offset + w + 0.18; // Dejar al menos 18 cm de separación para dobles jambas
      }
    }

    return validated;
  }, [openings, wallId, wallLength, wallHeight]);

  // 2. Segmentar el muro horizontalmente en zonas sólidas y zonas con vanos
  const segments: WallSegment[] = useMemo(() => {
    const segs: WallSegment[] = [];
    let currentX = 0;

    for (const op of wallOpenings) {
      if (op.xStart > currentX + 0.05) {
        segs.push({
          type: 'solid',
          xStart: currentX,
          xEnd: op.xStart,
          width: op.xStart - currentX,
        });
      }
      segs.push({
        type: 'opening',
        xStart: op.xStart,
        xEnd: op.xEnd,
        width: op.wM,
        opening: op,
      });
      currentX = op.xEnd;
    }

    if (currentX < wallLength - 0.05) {
      segs.push({
        type: 'solid',
        xStart: currentX,
        xEnd: wallLength,
        width: wallLength - currentX,
      });
    }

    if (segs.length === 0) {
      segs.push({
        type: 'solid',
        xStart: 0,
        xEnd: wallLength,
        width: wallLength,
      });
    }

    return segs;
  }, [wallOpenings, wallLength]);

  // 3. Subdividir zonas sólidas en paneles SIP estándar (máximo 1.22m)
  const solidSubPanels = useMemo(() => {
    const subPanels: Array<{
      segIndex: number;
      panelIndex: number;
      globalIndex: number;
      xCenter: number;
      width: number;
    }> = [];

    let gIdx = 0;
    segments.forEach((seg, segIdx) => {
      if (seg.type === 'solid') {
        const count = Math.max(1, Math.ceil(seg.width / 1.22));
        const step = seg.width / count;
        for (let i = 0; i < count; i++) {
          const pLeft = seg.xStart + i * step;
          subPanels.push({
            segIndex: segIdx,
            panelIndex: i,
            globalIndex: gIdx++,
            xCenter: pLeft + step / 2 - wallLength / 2,
            width: step,
          });
        }
      }
    });

    return subPanels;
  }, [segments, wallLength]);

  const totalSolidPanels = solidSubPanels.length;
  const MAX_PANEL_H = 2.44; // Largo máximo comercial estándar de panel SIP (2.44 m / 244 cm)
  const hasVerticalSplit = wallHeight > MAX_PANEL_H;
  const bottomPanelH = hasVerticalSplit ? MAX_PANEL_H : wallHeight;
  const topPanelH = hasVerticalSplit ? wallHeight - MAX_PANEL_H : 0;

  return (
    <group position={explodedOffset}>
      {/* ========================================================================= */}
      {/* A. ESTRUCTURA DE MADERA INTEGRAL (TIMBER STUD FRAMING SEGÚN IMAGEN 1 Y 2) */}
      {/* ========================================================================= */}
      {(layerTimberStructure || !layerWallsSip || isExploded) && (
        <group>
          {/* A.1 Solera Inferior de Montaje (Sole Plate) - Se interrumpe en puertas a nivel de piso */}
          {segments.map((seg, idx) => {
            const isDoorAtFloor = seg.type === 'opening' && seg.opening?.sillM === 0;
            if (isDoorAtFloor) {
              return (
                <TimberPiece
                  key={`sole-door-sub-${idx}`}
                  args={[seg.width, timberThick / 2, timberWidth]}
                  position={[seg.xStart + seg.width / 2 - wallLength / 2, timberThick / 4, 0]}
                  orientation="horizontal"
                  materials={materials}
                  isExploded={isExploded}
                  explodedProgress={explodedProgress}
                />
              );
            }
            return (
              <TimberPiece
                key={`sole-seg-${idx}`}
                args={[seg.width, timberThick, timberWidth]}
                position={[seg.xStart + seg.width / 2 - wallLength / 2, timberThick / 2, 0]}
                orientation="horizontal"
                materials={materials}
                isExploded={isExploded}
                explodedProgress={explodedProgress}
              />
            );
          })}

          {/* A.2 Solera / Spline de Empalme Horizontal Intermedio a H=2.44m (Norma Constructiva SIP) */}
          {hasVerticalSplit && (
            <group>
              {segments.map((seg, idx) => (
                <TimberPiece
                  key={`horiz-spline-seg-${idx}`}
                  args={[seg.width, timberThick, timberWidth]}
                  position={[
                    seg.xStart + seg.width / 2 - wallLength / 2,
                    MAX_PANEL_H + (isExploded ? explodedProgress * 0.12 : 0),
                    0,
                  ]}
                  orientation="horizontal"
                  materials={materials}
                  isExploded={isExploded}
                  explodedProgress={explodedProgress}
                />
              ))}
            </group>
          )}

          {/* A.3 Solera Superior Encajada (Top Plate) */}
          <TimberPiece
            args={[wallLength, timberThick, timberWidth]}
            position={[0, wallHeight - timberThick / 2 + (isExploded ? explodedProgress * 0.1 : 0), 0]}
            orientation="horizontal"
            materials={materials}
            isExploded={isExploded}
            explodedProgress={explodedProgress}
          />

          {/* A.4 Doble Solera de Amarre / Cap Plate Superior (Con desfase de traslape 1.22m) */}
          <TimberPiece
            args={[wallLength, timberThick, timberWidth]}
            position={[0, wallHeight + timberThick / 2 + (isExploded ? explodedProgress * 0.2 : 0), 0]}
            orientation="horizontal"
            materials={materials}
            staggerOffset={1.22}
            isExploded={isExploded}
            explodedProgress={explodedProgress}
          />

          {/* A.5 Pies Derechos de Esquina (Corner Studs) */}
          <TimberPiece
            args={[timberThick, wallHeight - 2 * timberThick, timberWidth]}
            position={[-wallLength / 2 + timberThick / 2 - (isExploded ? explodedProgress * 0.15 : 0), wallHeight / 2, 0]}
            orientation="vertical"
            materials={materials}
          />
          <TimberPiece
            args={[timberThick, wallHeight - 2 * timberThick, timberWidth]}
            position={[wallLength / 2 - timberThick / 2 + (isExploded ? explodedProgress * 0.15 : 0), wallHeight / 2, 0]}
            orientation="vertical"
            materials={materials}
          />

          {/* A.6 Pies Derechos Intermedios / Splines en Paneles Sólidos */}
          {solidSubPanels.map((sp, idx) => {
            const posX = sp.xCenter + sp.width / 2;
            if (Math.abs(posX - wallLength / 2) > 0.08 && Math.abs(posX - (-wallLength / 2)) > 0.08) {
              const spreadX = isExploded ? (sp.globalIndex - (totalSolidPanels - 1) / 2) * (explodedProgress * 0.12) : 0;
              return (
                <TimberPiece
                  key={`spline-stud-${idx}`}
                  args={[timberThick, wallHeight - 2 * timberThick, timberWidth]}
                  position={[posX + spreadX, wallHeight / 2, 0]}
                  orientation="vertical"
                  materials={materials}
                />
              );
            }
            return null;
          })}

          {/* A.7 Enmarcado Estructural de Vanos: Jambas, Dintel, Solera de Antepecho y Puntales */}
          {wallOpenings.map((op, idx) => {
            const opXCenter = op.offsetM + op.wM / 2 - wallLength / 2;
            const sillH = op.sillM;
            const headH = op.yHead;
            const topH = Math.max(0, wallHeight - headH - timberThick);

            return (
              <group key={`timber-framing-op-${idx}`}>
                {/* Jamba Izquierda */}
                <TimberPiece
                  args={[timberThick, wallHeight - 2 * timberThick, timberWidth]}
                  position={[op.offsetM - timberThick / 2 - wallLength / 2, wallHeight / 2, 0]}
                  orientation="vertical"
                  materials={materials}
                />

                {/* Jamba Derecha */}
                <TimberPiece
                  args={[timberThick, wallHeight - 2 * timberThick, timberWidth]}
                  position={[op.offsetM + op.wM + timberThick / 2 - wallLength / 2, wallHeight / 2, 0]}
                  orientation="vertical"
                  materials={materials}
                />

                {/* Dintel Horizontal de Madera (Header Beam) */}
                <TimberPiece
                  args={[op.wM + 2 * timberThick, timberThick * 2, timberWidth]}
                  position={[opXCenter, headH + timberThick / 2 + (isExploded ? explodedProgress * 0.08 : 0), 0]}
                  orientation="horizontal"
                  materials={materials}
                />

                {/* Puntal de Dintel Superior si el espacio es suficiente */}
                {topH > 0.25 && (
                  <TimberPiece
                    args={[timberThick, topH, timberWidth]}
                    position={[opXCenter, headH + timberThick + topH / 2 + (isExploded ? explodedProgress * 0.12 : 0), 0]}
                    orientation="vertical"
                    materials={materials}
                  />
                )}

                {/* Solera de Antepecho y Puntales Inferiores */}
                {sillH > 0.05 && (
                  <>
                    <TimberPiece
                      args={[op.wM + 2 * timberThick, timberThick, timberWidth]}
                      position={[opXCenter, sillH - timberThick / 2 - (isExploded ? explodedProgress * 0.05 : 0), 0]}
                      orientation="horizontal"
                      materials={materials}
                    />
                    <TimberPiece
                      args={[timberThick, sillH - timberThick, timberWidth]}
                      position={[opXCenter, sillH / 2 - (isExploded ? explodedProgress * 0.05 : 0), 0]}
                      orientation="vertical"
                      materials={materials}
                    />
                  </>
                )}
              </group>
            );
          })}
        </group>
      )}

      {/* ========================================================================= */}
      {/* B. PANELES SIP RECORTADOS E INTEGRADOS ALREDEDOR DE LOS VANOS (IMAGEN 2)  */}
      {/* ========================================================================= */}
      {layerWallsSip && (
        <group>
          {/* B.1 Paneles SIP en Zonas Sólidas (Modulados a máx 2.44m + Sobrepanel superior si H > 2.44m) */}
          {solidSubPanels.map((sp, idx) => {
            const spreadX = isExploded ? (sp.globalIndex - (totalSolidPanels - 1) / 2) * (explodedProgress * 0.38) : 0;
            const staggerZ = isExploded ? (idx % 2 === 0 ? 0.08 : -0.08) * explodedProgress : 0;

            return (
              <group key={`solid-sip-p-${idx}`}>
                {/* Panel Base Inferior (<= 2.44m de altura) */}
                <group position={[sp.xCenter + spreadX, bottomPanelH / 2, staggerZ]}>
                  <SipIndividualPanel
                    width={sp.width}
                    height={bottomPanelH}
                    totalThickness={wallThickness}
                    recess={0.035}
                    osbMaterial={materials.osbSip}
                    epsMaterial={materials.epsCore}
                    osbEdgeMaterial={materials.osbEdge}
                    claddingMaterial={materials.cladding}
                    useCladdingOnFront={layerCladding}
                    tag={`${wallId.toUpperCase()}-S${idx + 1}${hasVerticalSplit ? '-INF' : ''}`}
                    isExploded={isExploded}
                  />
                </group>

                {/* Sobre-Panel / Remate Superior según norma SIP si la altura del muro excede 2.44m */}
                {hasVerticalSplit && topPanelH > 0.02 && (
                  <group
                    position={[
                      sp.xCenter + spreadX,
                      bottomPanelH + topPanelH / 2 + (isExploded ? explodedProgress * 0.22 : 0),
                      staggerZ,
                    ]}
                  >
                    <SipIndividualPanel
                      width={sp.width}
                      height={topPanelH}
                      totalThickness={wallThickness}
                      recess={0.035}
                      osbMaterial={materials.osbSip}
                      epsMaterial={materials.epsCore}
                      osbEdgeMaterial={materials.osbEdge}
                      claddingMaterial={materials.cladding}
                      useCladdingOnFront={layerCladding}
                      tag={`${wallId.toUpperCase()}-S${idx + 1}-SUP`}
                      isExploded={isExploded}
                    />
                  </group>
                )}
              </group>
            );
          })}

          {/* B.2 Paneles SIP Recortados en Zonas de Vanos: Dintel SIP y Antepecho SIP */}
          {wallOpenings.map((op, idx) => {
            const opXCenter = op.offsetM + op.wM / 2 - wallLength / 2;
            const sillH = op.sillM;
            const headH = op.yHead;
            const topH = Math.max(0.01, wallHeight - headH - timberThick);

            const dintelSpreadY = isExploded ? explodedProgress * 0.22 : 0;
            const dintelSpreadZ = isExploded ? explodedProgress * 0.12 : 0;
            const antepechoSpreadY = isExploded ? -explodedProgress * 0.14 : 0;
            const antepechoSpreadZ = isExploded ? explodedProgress * 0.12 : 0;

            return (
              <group key={`opening-sip-cutouts-${idx}`}>
                {/* Dintel SIP (Panel superior sobre el vano) */}
                {topH > 0.08 && (
                  <group position={[opXCenter, headH + timberThick + topH / 2 + dintelSpreadY, dintelSpreadZ]}>
                    <SipIndividualPanel
                      width={op.wM}
                      height={topH}
                      totalThickness={wallThickness}
                      recess={0.035}
                      osbMaterial={materials.osbSip}
                      epsMaterial={materials.epsCore}
                      osbEdgeMaterial={materials.osbEdge}
                      claddingMaterial={materials.cladding}
                      useCladdingOnFront={layerCladding}
                      tag={`${wallId.toUpperCase()}-DINTEL-${idx + 1}`}
                      isExploded={isExploded}
                    />
                  </group>
                )}

                {/* Antepecho SIP (Panel inferior bajo la ventana) */}
                {sillH > 0.08 && (
                  <group position={[opXCenter, sillH / 2 + antepechoSpreadY, antepechoSpreadZ]}>
                    <SipIndividualPanel
                      width={op.wM}
                      height={sillH}
                      totalThickness={wallThickness}
                      recess={0.035}
                      osbMaterial={materials.osbSip}
                      epsMaterial={materials.epsCore}
                      osbEdgeMaterial={materials.osbEdge}
                      claddingMaterial={materials.cladding}
                      useCladdingOnFront={layerCladding}
                      tag={`${wallId.toUpperCase()}-ANTEPECHO-${idx + 1}`}
                      isExploded={isExploded}
                    />
                  </group>
                )}
              </group>
            );
          })}
        </group>
      )}

      {/* ========================================================================= */}
      {/* C. CARPINTERÍA DE VENTANAS Y PUERTAS ENCAJADAS DENTRO DEL RECORTE DEL MURO */}
      {/* ========================================================================= */}
      {layerWindowsDoors && (
        <group>
          {wallOpenings.map((op, idx) => (
            <SipInteractiveOpening
              key={`installed-opening-${op.id || idx}`}
              opening={op}
              wallId={wallId}
              wallLength={wallLength}
              wallHeight={wallHeight}
              wallThickness={wallThickness}
              isExploded={isExploded}
              explodedProgress={explodedProgress}
              materials={{
                glassWindow: materials.glassWindow,
                pvcFrameBlack: materials.pvcFrameBlack,
                pvcFrameWood: materials.pvcFrameWood,
                aluminumRpt: materials.aluminumRpt,
                doorLenga: materials.doorLenga,
                doorHardware: materials.doorHardware,
              }}
            />
          ))}
        </group>
      )}

      {/* ========================================================================= */}
      {/* D. CAPA DE REVESTIMIENTO EXTERIOR & ENVOLVENTE VENTILADA (DESPIECE BIM)   */}
      {/* ========================================================================= */}
      {layerCladding && claddingType && claddingType !== 'panel_sip_visto' && (
        <SipWallCladdingAssembly
          wallId={wallId}
          wallLength={wallLength}
          wallHeight={wallHeight}
          wallThickness={wallThickness}
          openings={openings}
          claddingType={claddingType}
          materials={materials}
          isExploded={isExploded}
          explodedProgress={explodedProgress}
        />
      )}
    </group>
  );
}
