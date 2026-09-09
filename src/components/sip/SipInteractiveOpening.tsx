import React, { useState, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import {
  SipOpening,
  WallTarget,
  useSipHouseStore,
  getWallLengthCm,
} from '../../store/sipHouseStore';

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
    dimensions,
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

  // Manejador de Arrastre Global Continuo por el Contorno Perimetral de la Casa
  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setSelectedOpeningId(opening.id);
      setIsDraggingOpening(true);
      setIsDragging(true);

      const startClientX = e.nativeEvent.clientX;
      const startClientY = e.nativeEvent.clientY;
      const startOffset = opening.offsetAlongWall || 50;

      const perimeterCycle: WallTarget[] = ['front', 'right', 'back', 'left'];

      const onPointerMoveWindow = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startClientX;
        const dy = moveEvent.clientY - startClientY;

        // Sensibilidad calibrada y ágil (1px = ~1.8cm para respuesta inmediata y fluida)
        // La dirección del offset del muro aumenta de izquierda a derecha.
        // Adaptamos según la orientación de la cara del muro y la perspectiva de la cámara 3D:
        const SPEED = 1.8;
        let deltaCm = 0;

        if (wallId === 'front') {
          // Vista frontal / isométrica: mover mouse a la derecha (+dx) aumenta el offset (+deltaCm)
          deltaCm = Math.round(dx * SPEED);
        } else if (wallId === 'back') {
          // Vista trasera: mover mouse a la derecha (+dx) en pantalla corresponde a ir hacia la derecha visual
          deltaCm = Math.round(dx * SPEED);
        } else if (wallId === 'left') {
          // Muro lateral izquierdo: en vista isométrica, respuesta ágil combinada
          deltaCm = Math.round((dx - dy * 0.5) * SPEED);
        } else if (wallId === 'right' || wallId.startsWith('wing')) {
          // Muro lateral derecho: en vista isométrica, respuesta ágil combinada
          deltaCm = Math.round((dx + dy * 0.5) * SPEED);
        } else {
          deltaCm = Math.round(dx * SPEED);
        }

        const minCm = 25; // 25cm margen mínimo de esquina SIP
        const maxCm = Math.max(minCm, Math.round((wallLength - wM - 0.25) * 100));

        let nextOffset = startOffset + deltaCm;

        // Transición continua al muro contiguo si se sobrepasan los extremos
        if (nextOffset > maxCm + 25) {
          const currentIdx = perimeterCycle.indexOf(wallId);
          if (currentIdx !== -1) {
            const nextWall = perimeterCycle[(currentIdx + 1) % perimeterCycle.length];
            updateOpening(opening.id, {
              assignedWall: nextWall,
              offsetAlongWall: 30,
            });
            return;
          }
        } else if (nextOffset < minCm - 25) {
          const currentIdx = perimeterCycle.indexOf(wallId);
          if (currentIdx !== -1) {
            const prevWall = perimeterCycle[(currentIdx - 1 + perimeterCycle.length) % perimeterCycle.length];
            const targetLen = getWallLengthCm(prevWall, dimensions);
            const newOff = Math.max(25, Math.round(targetLen - opening.width - 30));
            updateOpening(opening.id, {
              assignedWall: prevWall,
              offsetAlongWall: newOff,
            });
            return;
          }
        }

        nextOffset = Math.max(minCm, Math.min(maxCm, nextOffset));

        // Snapping inteligente a retícula modular cada 5cm
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
    [
      opening.id,
      opening.width,
      opening.offsetAlongWall,
      wallId,
      wallLength,
      wM,
      dimensions,
      setIsDraggingOpening,
      setSelectedOpeningId,
      updateOpening,
    ]
  );

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      setSelectedOpeningId(opening.id);
    },
    [opening.id, setSelectedOpeningId]
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
      {/* 1. INDICADOR DE SELECCIÓN Y BORDE LUMINOSO EN EL MODELO 3D                */}
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
