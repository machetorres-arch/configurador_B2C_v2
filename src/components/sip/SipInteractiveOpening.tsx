import React, { useState, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { SipOpening, WallTarget, useSipHouseStore } from '../../store/sipHouseStore';

interface SipInteractiveOpeningProps {
  opening: SipOpening & {
    wM: number;
    hM: number;
    sillM: number;
    offsetM: number;
  };
  wallId: WallTarget;
  wallLength: number;
  wallHeight: number;
  wallThickness: number;
  isExploded?: boolean;
  explodedProgress?: number;
  materials: {
    glassWindow: THREE.Material;
    pvcFrameBlack: THREE.Material;
    pvcFrameWood: THREE.Material;
    aluminumRpt: THREE.Material;
    doorLenga: THREE.Material;
    doorHardware: THREE.Material;
  };
}

export function SipInteractiveOpening({
  opening,
  wallId,
  wallLength,
  wallHeight,
  wallThickness,
  isExploded = false,
  explodedProgress = 0,
  materials,
}: SipInteractiveOpeningProps) {
  const {
    selectedOpeningId,
    setSelectedOpeningId,
    setIsDraggingOpening,
    updateOpening,
    removeOpening,
  } = useSipHouseStore();

  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const isSelected = selectedOpeningId === opening.id;

  const wM = opening.wM;
  const hM = opening.hM;
  const sillM = opening.sillM;
  const offsetM = opening.offsetM;

  const opXCenter = offsetM + wM / 2 - wallLength / 2;
  const opYCenter = sillM + hM / 2;
  const carpentryZ = isExploded ? explodedProgress * 0.28 : 0;

  // Selección de Material para Marco
  const frameMat =
    opening.frameMaterial === 'madera_lenga'
      ? materials.doorLenga
      : opening.frameMaterial === 'pvc_folio_madera'
      ? materials.pvcFrameWood
      : opening.frameMaterial === 'aluminio_rtt'
      ? materials.aluminumRpt
      : materials.pvcFrameBlack;

  const profileThick = 0.045; // 45mm perfil de marco
  const frameDepth = wallThickness + 0.015;

  // Manejador de Arrastre Global Ultra-Robusto
  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setSelectedOpeningId(opening.id);
      setIsDraggingOpening(true);
      setIsDragging(true);

      const startClientX = e.nativeEvent.clientX;
      const startClientY = e.nativeEvent.clientY;
      const startOffset = opening.offsetAlongWall || 50;

      const onPointerMoveWindow = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startClientX;
        const dy = moveEvent.clientY - startClientY;

        // Sensibilidad calibrada: 1px = ~0.6cm
        let deltaCm = Math.round(dx * 0.6);

        // Inversión según cara de muro para que el arrastre siga el movimiento visual del mouse
        if (wallId === 'back') {
          deltaCm = -Math.round(dx * 0.6);
        } else if (wallId === 'left') {
          deltaCm = Math.round((dx - dy * 0.4) * 0.6);
        } else if (wallId === 'right' || wallId.startsWith('wing')) {
          deltaCm = Math.round((dx + dy * 0.4) * 0.6);
        }

        const minCm = 20;
        const maxCm = Math.max(minCm, Math.round((wallLength - wM - 0.2) * 100));

        let nextOffset = startOffset + deltaCm;
        nextOffset = Math.max(minCm, Math.min(maxCm, nextOffset));

        // Snapping inteligente cada 5cm
        const snapped = Math.round(nextOffset / 5) * 5;

        updateOpening(opening.id, { offsetAlongWall: snapped });
      };

      const onPointerUpWindow = () => {
        window.removeEventListener('pointermove', onPointerMoveWindow);
        window.removeEventListener('pointerup', onPointerUpWindow);
        setIsDragging(false);
        setIsDraggingOpening(false);
      };

      window.addEventListener('pointermove', onPointerMoveWindow);
      window.addEventListener('pointerup', onPointerUpWindow);
    },
    [opening.id, opening.offsetAlongWall, wallId, wallLength, wM, setIsDraggingOpening, setSelectedOpeningId, updateOpening]
  );

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      setSelectedOpeningId(opening.id);
    },
    [opening.id, setSelectedOpeningId]
  );

  const handleNudge = useCallback(
    (delta: number, e?: React.MouseEvent) => {
      e?.stopPropagation();
      const current = opening.offsetAlongWall || 50;
      const minCm = 20;
      const maxCm = Math.max(minCm, Math.round((wallLength - wM - 0.2) * 100));
      const next = Math.max(minCm, Math.min(maxCm, current + delta));
      updateOpening(opening.id, { offsetAlongWall: next });
    },
    [opening.id, opening.offsetAlongWall, wallLength, wM, updateOpening]
  );

  return (
    <group
      position={[opXCenter, opYCenter, carpentryZ]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'grab';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        if (!isDragging) document.body.style.cursor = 'default';
      }}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
    >
      {/* ========================================================================= */}
      {/* 1. INDICADOR DE SELECCIÓN, BORDE LUMINOSO Y BADGE 3D INTERACTIVO          */}
      {/* ========================================================================= */}
      {(isSelected || hovered || isDragging) && (
        <group>
          {/* Borde fluorescente de selección */}
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(wM + 0.02, hM + 0.02, wallThickness + 0.04)]} />
            <lineBasicMaterial
              color={isSelected ? '#38bdf8' : hovered ? '#f59e0b' : '#38bdf8'}
              linewidth={2}
            />
          </lineSegments>

          {/* Cartela Informativa / Badge 3D flotante con botones interactivos */}
          <Html
            position={[0, hM / 2 + 0.22, wallThickness / 2 + 0.08]}
            center
            distanceFactor={10}
            className="select-none z-30"
          >
            <div
              className={`px-3 py-2 rounded-2xl text-xs font-bold whitespace-nowrap shadow-2xl border flex items-center gap-2 backdrop-blur-xl transition-all ${
                isSelected
                  ? 'bg-slate-950/95 text-sky-200 border-sky-400/90 ring-2 ring-sky-500/40 scale-105'
                  : 'bg-slate-900/90 text-slate-200 border-white/25'
              }`}
            >
              <div className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing">
                <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-sky-400 animate-ping' : 'bg-amber-400'}`} />
                <span className="font-mono text-xs font-black tracking-wider text-white uppercase">
                  {opening.code}
                </span>
                <span className="text-slate-300 text-xs font-medium">
                  {Math.round(wM * 100)}×{Math.round(hM * 100)} cm
                </span>
              </div>

              {/* Botones de ajuste rápido en el muro */}
              <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl pointer-events-auto">
                <button
                  type="button"
                  onClick={(e) => handleNudge(-10, e)}
                  className="px-1.5 py-0.5 bg-white/10 hover:bg-sky-500 hover:text-white rounded-lg text-slate-200 font-mono text-[11px] transition-colors"
                  title="Mover 10cm hacia la izquierda"
                >
                  ◀ -10
                </button>
                <span className="text-[11px] text-sky-300 font-mono font-bold px-1">
                  {opening.offsetAlongWall || 50} cm
                </span>
                <button
                  type="button"
                  onClick={(e) => handleNudge(10, e)}
                  className="px-1.5 py-0.5 bg-white/10 hover:bg-sky-500 hover:text-white rounded-lg text-slate-200 font-mono text-[11px] transition-colors"
                  title="Mover 10cm hacia la derecha"
                >
                  +10 ▶
                </button>
              </div>

              {isDragging && (
                <span className="text-[11px] text-emerald-400 animate-pulse font-bold">
                  ↔ Arrastrando...
                </span>
              )}
            </div>
          </Html>
        </group>
      )}

      {/* ========================================================================= */}
      {/* 2. MARCO PERIMETRAL HUECO (4 PERFILES ESTRUCTURALES)                       */}
      {/* ========================================================================= */}
      <group>
        {/* Perfil Superior */}
        <mesh position={[0, (hM - profileThick) / 2, 0]} material={frameMat} castShadow receiveShadow>
          <boxGeometry args={[wM, profileThick, frameDepth]} />
        </mesh>
        {/* Perfil Inferior */}
        <mesh position={[0, -(hM - profileThick) / 2, 0]} material={frameMat} castShadow receiveShadow>
          <boxGeometry args={[wM, profileThick, frameDepth]} />
        </mesh>
        {/* Perfil Lateral Izquierdo */}
        <mesh
          position={[-(wM - profileThick) / 2, 0, 0]}
          material={frameMat}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[profileThick, Math.max(0.01, hM - 2 * profileThick), frameDepth]} />
        </mesh>
        {/* Perfil Lateral Derecho */}
        <mesh
          position={[(wM - profileThick) / 2, 0, 0]}
          material={frameMat}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[profileThick, Math.max(0.01, hM - 2 * profileThick), frameDepth]} />
        </mesh>
      </group>

      {/* ========================================================================= */}
      {/* 3. VENTANA ARQUITECTÓNICA TRASLÚCIDA TERMOPANEL (DVP)                     */}
      {/* ========================================================================= */}
      {opening.type === 'window' && (
        <group>
          {/* Vidrio Termopanel Central Traslúcido Cristalino */}
          <mesh position={[0, 0, 0]} material={materials.glassWindow}>
            <boxGeometry
              args={[
                Math.max(0.05, wM - 2 * profileThick - 0.005),
                Math.max(0.05, hM - 2 * profileThick - 0.005),
                0.012,
              ]}
            />
          </mesh>

          {/* Configuración según Ancho: Ventana Corredera de 2 Hojas o Proyectante */}
          {wM > 1.05 ? (
            <group>
              {/* Travesaño central vertical / perfil de cruce de hojas */}
              <mesh position={[0, 0, 0.006]} material={frameMat} castShadow receiveShadow>
                <boxGeometry args={[0.04, Math.max(0.05, hM - 2 * profileThick), 0.03]} />
              </mesh>
              {/* Tirador / Manilla central */}
              <mesh position={[0.02, 0, 0.024]} material={materials.doorHardware}>
                <boxGeometry args={[0.016, 0.14, 0.018]} />
              </mesh>
            </group>
          ) : (
            // Ventana Proyectante / Abatible
            <group>
              <mesh
                position={[0, -hM / 2 + profileThick + 0.04, 0.018]}
                material={materials.doorHardware}
              >
                <boxGeometry args={[0.11, 0.018, 0.025]} />
              </mesh>
            </group>
          )}

          {/* Botaguas / Vierteaguas exterior inferior */}
          <mesh
            position={[0, -hM / 2 - 0.012, wallThickness / 2 + 0.02]}
            material={frameMat}
            castShadow
          >
            <boxGeometry args={[wM + 0.06, 0.024, 0.05]} />
          </mesh>
        </group>
      )}

      {/* ========================================================================= */}
      {/* 4. PUERTA ARQUITECTÓNICA (MADERA MACIZA O VENTANAL CORREDERO TERRAZA)    */}
      {/* ========================================================================= */}
      {opening.type === 'door' && (
        <group>
          {wM > 1.35 ? (
            // Ventanal Corredero Terraza (2 Hojas Vidriadas Grandes)
            <group>
              {/* Vidrio Central Completo Traslúcido */}
              <mesh position={[0, 0, 0]} material={materials.glassWindow}>
                <boxGeometry
                  args={[
                    Math.max(0.05, wM - 2 * profileThick - 0.005),
                    Math.max(0.05, hM - 2 * profileThick - 0.005),
                    0.016,
                  ]}
                />
              </mesh>

              {/* Travesaño central vertical / Montante de encuentro */}
              <mesh position={[0, 0, 0]} material={frameMat} castShadow receiveShadow>
                <boxGeometry args={[0.05, Math.max(0.05, hM - 2 * profileThick), 0.035]} />
              </mesh>

              {/* Manillones de Acero Inoxidable */}
              <mesh position={[0.025, 0, 0.028]} material={materials.doorHardware}>
                <boxGeometry args={[0.02, 0.42, 0.025]} />
              </mesh>
              <mesh position={[0.025, 0, -0.028]} material={materials.doorHardware}>
                <boxGeometry args={[0.02, 0.42, 0.025]} />
              </mesh>
            </group>
          ) : (
            // Puerta Maciza Panelada de Acceso
            <group>
              {/* Hoja de Puerta */}
              <mesh
                position={[0, 0, 0]}
                material={opening.frameMaterial === 'madera_lenga' ? materials.doorLenga : frameMat}
                castShadow
              >
                <boxGeometry
                  args={[
                    Math.max(0.05, wM - 2 * profileThick - 0.01),
                    Math.max(0.05, hM - 2 * profileThick - 0.01),
                    0.042,
                  ]}
                />
              </mesh>

              {/* Buñas y relieves horizontales de estilo contemporáneo */}
              {[-0.5, -0.15, 0.2, 0.55].map((relY, rIdx) => (
                <mesh
                  key={`door-panel-groove-${rIdx}`}
                  position={[0, (hM - 0.1) * (relY / 2), 0.022]}
                  material={materials.doorHardware}
                >
                  <boxGeometry args={[Math.max(0.05, wM - 0.18), 0.006, 0.003]} />
                </mesh>
              ))}

              {/* Manilla Ergonómica Exterior */}
              <group position={[wM / 2 - profileThick - 0.08, 0, 0.025]}>
                <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.doorHardware}>
                  <cylinderGeometry args={[0.026, 0.026, 0.006, 16]} />
                </mesh>
                <mesh position={[0, 0, 0.018]} rotation={[Math.PI / 2, 0, 0]} material={materials.doorHardware}>
                  <cylinderGeometry args={[0.008, 0.008, 0.03, 12]} />
                </mesh>
                <mesh position={[-0.045, 0, 0.03]} rotation={[0, 0, Math.PI / 2]} material={materials.doorHardware}>
                  <cylinderGeometry args={[0.008, 0.008, 0.11, 12]} />
                </mesh>
                <mesh position={[0, -0.07, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.doorHardware}>
                  <cylinderGeometry args={[0.015, 0.015, 0.005, 12]} />
                </mesh>
              </group>

              {/* Manilla Ergonómica Interior */}
              <group position={[wM / 2 - profileThick - 0.08, 0, -0.025]}>
                <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.doorHardware}>
                  <cylinderGeometry args={[0.026, 0.026, 0.006, 16]} />
                </mesh>
                <mesh position={[0, 0, -0.018]} rotation={[Math.PI / 2, 0, 0]} material={materials.doorHardware}>
                  <cylinderGeometry args={[0.008, 0.008, 0.03, 12]} />
                </mesh>
                <mesh position={[-0.045, 0, -0.03]} rotation={[0, 0, Math.PI / 2]} material={materials.doorHardware}>
                  <cylinderGeometry args={[0.008, 0.008, 0.11, 12]} />
                </mesh>
                <mesh position={[0, -0.07, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.doorHardware}>
                  <cylinderGeometry args={[0.015, 0.015, 0.005, 12]} />
                </mesh>
              </group>
            </group>
          )}
        </group>
      )}
    </group>
  );
}
