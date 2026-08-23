import React, { useMemo } from 'react';
import * as THREE from 'three';
import { InteriorWall, InteriorWallOpening } from '../../store/sipHouseStore';
import { SipIndividualPanel } from './SipIndividualPanel';
import { TimberPiece } from './TimberPiece';

interface SipInteriorWallAssemblyProps {
  wall: InteriorWall;
  defaultHeightM: number;
  layerWallsSip: boolean;
  layerTimberStructure: boolean;
  layerWindowsDoors: boolean;
  layerCladding: boolean;
  isExploded: boolean;
  explodedProgress: number;
  materials: {
    osbSip: THREE.Material;
    osbEdge: THREE.Material;
    epsCore: THREE.Material;
    timberStructural: THREE.Material;
    timberStructuralVertical?: THREE.Material;
    timberStructuralHorizontal?: THREE.Material;
    timberPine?: THREE.Material;
    doorLenga?: THREE.Material;
    doorHardware?: THREE.Material;
    pvcFrameBlack?: THREE.Material;
  };
}

interface ModularSubPanel {
  panelIndex: number;
  globalIndex: number;
  xCenter: number;
  width: number;
}

function getWallSpanPanels(spanWidth: number, spanCenterX: number, maxStep = 1.22): ModularSubPanel[] {
  if (spanWidth <= 0.05) return [];
  const count = Math.max(1, Math.ceil(spanWidth / maxStep));
  const step = spanWidth / count;
  const panels: ModularSubPanel[] = [];
  for (let i = 0; i < count; i++) {
    const pLeft = -spanWidth / 2 + i * step;
    panels.push({
      panelIndex: i,
      globalIndex: i,
      xCenter: spanCenterX + (pLeft + step / 2),
      width: step,
    });
  }
  return panels;
}

export function SipInteriorWallAssembly({
  wall,
  defaultHeightM,
  layerWallsSip,
  layerTimberStructure,
  layerWindowsDoors,
  isExploded,
  explodedProgress,
  materials,
}: SipInteriorWallAssemblyProps) {
  if (!wall.visible) return null;

  const x1 = wall.startX / 100;
  const z1 = wall.startZ / 100;
  const x2 = wall.endX / 100;
  const z2 = wall.endZ / 100;

  const dx = x2 - x1;
  const dz = z2 - z1;
  const lengthM = Math.hypot(dx, dz);
  if (lengthM < 0.1) return null;

  // Ángulo respecto al eje X
  const angle = Math.atan2(dz, dx);
  const midX = (x1 + x2) / 2;
  const midZ = (z1 + z2) / 2;

  const wallHM = (wall.heightCm ? wall.heightCm / 100 : defaultHeightM);
  // Espesor técnico de tabique interior SIP (90 mm o 114 mm según especificación)
  const thickM = (wall.thicknessMm || 90) / 1000;
  const timberWM = Math.max(0.041, thickM - 0.022); // Ancho escuadría cepillada al alveolo (68mm para 90mm, 92mm para 114mm)
  const timberThickM = 0.041; // 41 mm solera (2" calibrada)

  const MAX_PANEL_H = 2.44; // Largo máximo estándar de panel SIP (2.44 m / 244 cm)
  const hasVerticalSplit = wallHM > MAX_PANEL_H;
  const bottomPanelH = hasVerticalSplit ? MAX_PANEL_H : wallHM;
  const topPanelH = hasVerticalSplit ? wallHM - MAX_PANEL_H : 0;

  // Apertura principal (si tiene)
  const opening = wall.openings && wall.openings.length > 0 ? wall.openings[0] : null;

  // Modulación en paneles estándar SIP <= 1.22 m para muros ciegos
  const solidPanels = useMemo(() => {
    if (opening) return [];
    return getWallSpanPanels(lengthM, 0, 1.22);
  }, [opening, lengthM]);

  return (
    <group
      position={[midX, isExploded ? explodedProgress * 0.4 : 0, midZ]}
      rotation={[0, -angle, 0]}
    >
      {/* Sistema de Muro Interior con Vano o Macizo */}
      {!opening ? (
        /* 1. Muro Interior Ciego / Macizo */
        <group>
          {/* Paneles SIP modulados en anchos estándar de 1.22 m max y altura max 2.44m */}
          {layerWallsSip && (
            <group>
              {solidPanels.map((sp, idx) => {
                const spreadX = isExploded ? (sp.panelIndex - (solidPanels.length - 1) / 2) * (explodedProgress * 0.35) : 0;
                const staggerZ = isExploded ? (idx % 2 === 0 ? 0.06 : -0.06) * explodedProgress : 0;

                return (
                  <group key={`int-solid-sip-${idx}`}>
                    {/* Panel Base Inferior (<= 2.44m) */}
                    <group position={[sp.xCenter + spreadX, bottomPanelH / 2, staggerZ]}>
                      <SipIndividualPanel
                        width={sp.width}
                        height={bottomPanelH}
                        totalThickness={thickM}
                        recess={0.035}
                        osbMaterial={materials.osbSip}
                        epsMaterial={materials.epsCore}
                        osbEdgeMaterial={materials.osbEdge}
                        tag={`${wall.name}-P${idx + 1}${hasVerticalSplit ? '-INF' : ''}`}
                        isExploded={isExploded}
                      />
                    </group>

                    {/* Sobre-panel de remate superior si H > 2.44m */}
                    {hasVerticalSplit && topPanelH > 0.02 && (
                      <group position={[sp.xCenter + spreadX, bottomPanelH + topPanelH / 2 + (isExploded ? explodedProgress * 0.2 : 0), staggerZ]}>
                        <SipIndividualPanel
                          width={sp.width}
                          height={topPanelH}
                          totalThickness={thickM}
                          recess={0.035}
                          osbMaterial={materials.osbSip}
                          epsMaterial={materials.epsCore}
                          osbEdgeMaterial={materials.osbEdge}
                          tag={`${wall.name}-P${idx + 1}-SUP`}
                          isExploded={isExploded}
                        />
                      </group>
                    )}
                  </group>
                );
              })}
            </group>
          )}

          {/* Maderas Estructurales: Soleras inferior/superior/intermedia, Pies Derechos y Splines */}
          {(layerTimberStructure || isExploded) && (
            <group>
              {/* Solera Inferior de Montaje (Sole Plate) */}
              <TimberPiece
                args={[lengthM, timberThickM, timberWM]}
                position={[0, timberThickM / 2, 0]}
                orientation="horizontal"
                materials={materials}
                isExploded={isExploded}
                explodedProgress={explodedProgress}
              />

              {/* Solera / Spline de Empalme Horizontal Intermedio a H=2.44m (Norma SIP) */}
              {hasVerticalSplit && (
                <TimberPiece
                  args={[lengthM, timberThickM, timberWM]}
                  position={[0, MAX_PANEL_H + (isExploded ? explodedProgress * 0.12 : 0), 0]}
                  orientation="horizontal"
                  materials={materials}
                  isExploded={isExploded}
                  explodedProgress={explodedProgress}
                />
              )}

              {/* Solera Superior Encajada (Top Plate) */}
              <TimberPiece
                args={[lengthM, timberThickM, timberWM]}
                position={[0, wallHM - timberThickM / 2 + (isExploded ? explodedProgress * 0.1 : 0), 0]}
                orientation="horizontal"
                materials={materials}
                isExploded={isExploded}
                explodedProgress={explodedProgress}
              />
              {/* Pie Derecho Izquierdo de Extremo */}
              <TimberPiece
                args={[timberThickM, wallHM - 2 * timberThickM, timberWM]}
                position={[-lengthM / 2 + timberThickM / 2, wallHM / 2, 0]}
                orientation="vertical"
                materials={materials}
              />
              {/* Pie Derecho Derecho de Extremo */}
              <TimberPiece
                args={[timberThickM, wallHM - 2 * timberThickM, timberWM]}
                position={[lengthM / 2 - timberThickM / 2, wallHM / 2, 0]}
                orientation="vertical"
                materials={materials}
              />
              {/* Pies derechos interiores / Splines de unión en cada junta de panel cada <= 1.22 m */}
              {solidPanels.length > 1 &&
                solidPanels.slice(0, -1).map((sp, idx) => {
                  const jointX = sp.xCenter + sp.width / 2;
                  const spreadX = isExploded ? (sp.panelIndex - (solidPanels.length - 1) / 2) * (explodedProgress * 0.35) : 0;
                  return (
                    <TimberPiece
                      key={`int-solid-spline-${idx}`}
                      args={[timberThickM, wallHM - 2 * timberThickM, timberWM]}
                      position={[jointX + spreadX, wallHM / 2, 0]}
                      orientation="vertical"
                      materials={materials}
                    />
                  );
                })}
            </group>
          )}
        </group>
      ) : (
        /* 2. Muro Interior con Vano de Puerta */
        (() => {
          const doorW = (opening.width || 80) / 100;
          const doorH = Math.min((opening.height || 200) / 100, wallHM - 0.25);
          const rawOffset = (opening.offsetAlongWall || 40) / 100;
          const doorOffset = Math.max(0.1, Math.min(lengthM - doorW - 0.1, rawOffset));

          const leftSpan = doorOffset;
          const rightSpan = Math.max(0.05, lengthM - (doorOffset + doorW));
          const headerH = Math.max(0.2, wallHM - doorH);

          const leftCenterX = -lengthM / 2 + leftSpan / 2;
          const doorCenterX = -lengthM / 2 + doorOffset + doorW / 2;
          const rightCenterX = -lengthM / 2 + doorOffset + doorW + rightSpan / 2;

          // Modulación de los tramos izquierdo y derecho si son mayores a 1.22 m
          const leftSubPanels = getWallSpanPanels(leftSpan, leftCenterX, 1.22);
          const rightSubPanels = getWallSpanPanels(rightSpan, rightCenterX, 1.22);

          return (
            <group>
              {/* Tramo Izquierdo del Muro */}
              {leftSpan > 0.05 && (
                <group>
                  {layerWallsSip && (
                    <group>
                      {leftSubPanels.map((lsp, lIdx) => {
                        const spreadX = isExploded ? (lsp.panelIndex - (leftSubPanels.length - 1) / 2) * (explodedProgress * 0.2) : 0;
                        return (
                          <group key={`int-left-p-${lIdx}`}>
                            <group position={[lsp.xCenter + spreadX, bottomPanelH / 2, 0]}>
                              <SipIndividualPanel
                                width={lsp.width}
                                height={bottomPanelH}
                                totalThickness={thickM}
                                recess={0.035}
                                osbMaterial={materials.osbSip}
                                epsMaterial={materials.epsCore}
                                osbEdgeMaterial={materials.osbEdge}
                                tag={`${wall.name}-L${lIdx + 1}${hasVerticalSplit ? '-INF' : ''}`}
                                isExploded={isExploded}
                              />
                            </group>
                            {hasVerticalSplit && topPanelH > 0.02 && (
                              <group position={[lsp.xCenter + spreadX, bottomPanelH + topPanelH / 2 + (isExploded ? explodedProgress * 0.2 : 0), 0]}>
                                <SipIndividualPanel
                                  width={lsp.width}
                                  height={topPanelH}
                                  totalThickness={thickM}
                                  recess={0.035}
                                  osbMaterial={materials.osbSip}
                                  epsMaterial={materials.epsCore}
                                  osbEdgeMaterial={materials.osbEdge}
                                  tag={`${wall.name}-L${lIdx + 1}-SUP`}
                                  isExploded={isExploded}
                                />
                              </group>
                            )}
                          </group>
                        );
                      })}
                    </group>
                  )}
                  {(layerTimberStructure || isExploded) && (
                    <group>
                      {/* Solera inferior del tramo izquierdo */}
                      <TimberPiece
                        args={[leftSpan, timberThickM, timberWM]}
                        position={[leftCenterX, timberThickM / 2, 0]}
                        orientation="horizontal"
                        materials={materials}
                      />
                      {/* Solera de empalme horizontal a H=2.44m */}
                      {hasVerticalSplit && (
                        <TimberPiece
                          args={[leftSpan, timberThickM, timberWM]}
                          position={[leftCenterX, MAX_PANEL_H + (isExploded ? explodedProgress * 0.12 : 0), 0]}
                          orientation="horizontal"
                          materials={materials}
                        />
                      )}
                      {/* Solera superior del tramo izquierdo */}
                      <TimberPiece
                        args={[leftSpan, timberThickM, timberWM]}
                        position={[leftCenterX, wallHM - timberThickM / 2, 0]}
                        orientation="horizontal"
                        materials={materials}
                      />
                      {/* Pie derecho de extremo izquierdo */}
                      <TimberPiece
                        args={[timberThickM, wallHM - 2 * timberThickM, timberWM]}
                        position={[-lengthM / 2 + timberThickM / 2, wallHM / 2, 0]}
                        orientation="vertical"
                        materials={materials}
                      />
                      {/* Jamba Doble de Puerta Izquierda */}
                      <TimberPiece
                        args={[timberThickM * 2, wallHM - 2 * timberThickM, timberWM]}
                        position={[-lengthM / 2 + leftSpan - timberThickM, wallHM / 2, 0]}
                        orientation="vertical"
                        materials={materials}
                      />
                      {/* Splines intermedios si el tramo supera 1.22 m */}
                      {leftSubPanels.length > 1 &&
                        leftSubPanels.slice(0, -1).map((lsp, idx) => (
                          <TimberPiece
                            key={`int-l-spline-${idx}`}
                            args={[timberThickM, wallHM - 2 * timberThickM, timberWM]}
                            position={[lsp.xCenter + lsp.width / 2, wallHM / 2, 0]}
                            orientation="vertical"
                            materials={materials}
                          />
                        ))}
                    </group>
                  )}
                </group>
              )}

              {/* Dintel Superior sobre el Vano */}
              <group position={[doorCenterX, 0, 0]}>
                {layerWallsSip && (
                  <group position={[0, doorH + headerH / 2 + (isExploded ? explodedProgress * 0.18 : 0), 0]}>
                    <SipIndividualPanel
                      width={doorW}
                      height={headerH}
                      totalThickness={thickM}
                      recess={0.035}
                      osbMaterial={materials.osbSip}
                      epsMaterial={materials.epsCore}
                      osbEdgeMaterial={materials.osbEdge}
                      tag={`${wall.name}-Dintel`}
                      isExploded={isExploded}
                    />
                  </group>
                )}
                {(layerTimberStructure || isExploded) && (
                  <group>
                    {/* Viga Dintel Portante sobre Puerta */}
                    <TimberPiece
                      args={[doorW + 0.08, timberThickM * 2, timberWM]}
                      position={[0, doorH + timberThickM + (isExploded ? explodedProgress * 0.1 : 0), 0]}
                      orientation="horizontal"
                      materials={materials}
                    />
                    {/* Solera Superior de Remate */}
                    <TimberPiece
                      args={[doorW, timberThickM, timberWM]}
                      position={[0, wallHM - timberThickM / 2 + (isExploded ? explodedProgress * 0.15 : 0), 0]}
                      orientation="horizontal"
                      materials={materials}
                    />
                  </group>
                )}

                {/* Hoja y Marco de Puerta Interior */}
                {layerWindowsDoors && (
                  <group position={[0, doorH / 2, 0]}>
                    {/* Marco de Puerta */}
                    <mesh material={materials.pvcFrameBlack || materials.timberStructural}>
                      <boxGeometry args={[doorW, doorH, thickM + 0.01]} />
                    </mesh>
                    {/* Hoja de Puerta Madera */}
                    <mesh position={[0, 0, 0]} material={materials.doorLenga || materials.timberPine}>
                      <boxGeometry args={[doorW - 0.08, doorH - 0.05, 0.04]} />
                    </mesh>
                    {/* Manilla / Picaporte */}
                    <group position={[doorW / 2 - 0.12, 0, 0.028]}>
                      <mesh material={materials.doorHardware}>
                        <boxGeometry args={[0.12, 0.03, 0.015]} />
                      </mesh>
                      <mesh position={[-0.04, 0, -0.015]} material={materials.doorHardware}>
                        <cylinderGeometry args={[0.012, 0.012, 0.03, 8]} />
                      </mesh>
                    </group>
                  </group>
                )}
              </group>

              {/* Tramo Derecho del Muro */}
              {rightSpan > 0.05 && (
                <group>
                  {layerWallsSip && (
                    <group>
                      {rightSubPanels.map((rsp, rIdx) => {
                        const spreadX = isExploded ? (rsp.panelIndex - (rightSubPanels.length - 1) / 2) * (explodedProgress * 0.2) : 0;
                        return (
                          <group key={`int-right-p-${rIdx}`}>
                            <group position={[rsp.xCenter + spreadX, bottomPanelH / 2, 0]}>
                              <SipIndividualPanel
                                width={rsp.width}
                                height={bottomPanelH}
                                totalThickness={thickM}
                                recess={0.035}
                                osbMaterial={materials.osbSip}
                                epsMaterial={materials.epsCore}
                                osbEdgeMaterial={materials.osbEdge}
                                tag={`${wall.name}-R${rIdx + 1}${hasVerticalSplit ? '-INF' : ''}`}
                                isExploded={isExploded}
                              />
                            </group>
                            {hasVerticalSplit && topPanelH > 0.02 && (
                              <group position={[rsp.xCenter + spreadX, bottomPanelH + topPanelH / 2 + (isExploded ? explodedProgress * 0.2 : 0), 0]}>
                                <SipIndividualPanel
                                  width={rsp.width}
                                  height={topPanelH}
                                  totalThickness={thickM}
                                  recess={0.035}
                                  osbMaterial={materials.osbSip}
                                  epsMaterial={materials.epsCore}
                                  osbEdgeMaterial={materials.osbEdge}
                                  tag={`${wall.name}-R${rIdx + 1}-SUP`}
                                  isExploded={isExploded}
                                />
                              </group>
                            )}
                          </group>
                        );
                      })}
                    </group>
                  )}
                  {(layerTimberStructure || isExploded) && (
                    <group>
                      {/* Solera inferior del tramo derecho */}
                      <TimberPiece
                        args={[rightSpan, timberThickM, timberWM]}
                        position={[rightCenterX, timberThickM / 2, 0]}
                        orientation="horizontal"
                        materials={materials}
                      />
                      {/* Solera de empalme horizontal a H=2.44m */}
                      {hasVerticalSplit && (
                        <TimberPiece
                          args={[rightSpan, timberThickM, timberWM]}
                          position={[rightCenterX, MAX_PANEL_H + (isExploded ? explodedProgress * 0.12 : 0), 0]}
                          orientation="horizontal"
                          materials={materials}
                        />
                      )}
                      {/* Solera superior del tramo derecho */}
                      <TimberPiece
                        args={[rightSpan, timberThickM, timberWM]}
                        position={[rightCenterX, wallHM - timberThickM / 2, 0]}
                        orientation="horizontal"
                        materials={materials}
                      />
                      {/* Jamba Doble de Puerta Derecha */}
                      <TimberPiece
                        args={[timberThickM * 2, wallHM - 2 * timberThickM, timberWM]}
                        position={[-lengthM / 2 + doorOffset + doorW + timberThickM, wallHM / 2, 0]}
                        orientation="vertical"
                        materials={materials}
                      />
                      {/* Pie derecho de extremo derecho */}
                      <TimberPiece
                        args={[timberThickM, wallHM - 2 * timberThickM, timberWM]}
                        position={[lengthM / 2 - timberThickM / 2, wallHM / 2, 0]}
                        orientation="vertical"
                        materials={materials}
                      />
                      {/* Splines intermedios si el tramo supera 1.22 m */}
                      {rightSubPanels.length > 1 &&
                        rightSubPanels.slice(0, -1).map((rsp, idx) => (
                          <TimberPiece
                            key={`int-r-spline-${idx}`}
                            args={[timberThickM, wallHM - 2 * timberThickM, timberWM]}
                            position={[rsp.xCenter + rsp.width / 2, wallHM / 2, 0]}
                            orientation="vertical"
                            materials={materials}
                          />
                        ))}
                    </group>
                  )}
                </group>
              )}
            </group>
          );
        })()
      )}
    </group>
  );
}
