import React, { useState, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Edges, OrthographicCamera, PerspectiveCamera, OrbitControls, Environment, Grid, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useKitchenStore } from '../../store/kitchenStore';
import { useStore } from '../../store';
import { Wall } from './Wall';
import { Cabinet } from './Cabinet';
import { KitchenSocle } from './KitchenSocle';
import { KitchenRunDimensions } from './KitchenRunDimensions';
import { RoomFloorAndDimensions } from './RoomFloorAndDimensions';
import { resolvePlacement } from '../../utils/kitchenCollision';

function SceneContent() {
  const { viewMode, toolMode, walls, cabinets, addWall, drawingStart, setDrawingStart, addCabinet, setToolMode, setActiveCabinet, roomConfig, activeCabinetId } = useKitchenStore();
  const [currentMousePos, setCurrentMousePos] = useState<[number, number] | null>(null);
  const [ghostCabinet, setGhostCabinet] = useState<{pos: [number,number,number], rot: number, isColliding?: boolean} | null>(null);
  const { camera, raycaster, pointer, scene } = useThree();

  const is2D = viewMode === '2d';
  const groundPlaneMath = React.useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const intersectPoint = React.useMemo(() => new THREE.Vector3(), []);

  // Al activar la herramienta "Mover", situar de inmediato el ghost y la flecha sobre el mueble activo
  useEffect(() => {
    if (toolMode === 'move_active' && activeCabinetId) {
      const activeCab = useKitchenStore.getState().cabinets.find(c => c.id === activeCabinetId);
      if (activeCab) {
        setGhostCabinet({
          pos: [activeCab.position[0], activeCab.position[1], activeCab.position[2]],
          rot: activeCab.rotation || 0,
          isColliding: false,
        });
      }
    }
  }, [toolMode, activeCabinetId]);

  useFrame(() => {
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.ray.intersectPlane(groundPlaneMath, intersectPoint);
    if (!hit) return;

    if (toolMode === 'draw_wall' && drawingStart) {
      const x = Math.round(intersectPoint.x / 10) * 10;
      const z = Math.round(intersectPoint.z / 10) * 10;
      setCurrentMousePos([x, z]);
    } else if (toolMode.startsWith('place_') || toolMode === 'move_active') {
      const rawX = Math.round(intersectPoint.x * 2) / 2;
      const rawZ = Math.round(intersectPoint.z * 2) / 2;
      
      let cabWidth = 60;
      let cabDepth = 60;
      let cabHeight = 80;
      let cabType = 'base';
      let cabVariant = '1_door';
      let cabRot = 0;
      let customY: number | undefined = undefined;
      const activeCabId = useKitchenStore.getState().activeCabinetId;
      
      if (toolMode === 'move_active') {
         const activeCab = cabinets.find(c => c.id === activeCabId) || null;
         if (activeCab) {
            cabWidth = activeCab.width;
            cabDepth = activeCab.depth;
            cabHeight = activeCab.height;
            cabType = activeCab.type;
            cabVariant = activeCab.variant || '1_door';
            cabRot = activeCab.rotation || 0;
            customY = activeCab.position[1];
         }
      } else {
         const isBase = toolMode.startsWith('place_base_');
         const isTall = toolMode.startsWith('place_tall_') || toolMode === 'place_tall';
         const isWall = toolMode.startsWith('place_wall_') || toolMode === 'place_wall';
         if (isBase) {
            cabType = 'base';
            const v = toolMode.replace('place_base_', '');
            cabVariant = v;
            if (v === 'spice_rack') cabWidth = 15;
            if (v === '2_doors' || v === '2_pot_drawers') cabWidth = 80;
            if (v === 'corner_blind') cabWidth = 100;
         } else if (isTall) {
            cabType = 'tall';
            cabHeight = 215;
            if (toolMode === 'place_tall_2_doors') cabWidth = 80;
            else cabWidth = 60;
         } else if (isWall) {
            cabType = 'wall';
            cabDepth = 35;
            if (toolMode === 'place_wall_1_door') {
               cabVariant = '1_door';
               cabWidth = 60;
               cabHeight = 70;
            } else if (toolMode === 'place_wall_2_doors' || toolMode === 'place_wall') {
               cabVariant = '2_doors';
               cabWidth = 80;
               cabHeight = 70;
            } else if (toolMode === 'place_wall_lift_up') {
               cabVariant = 'wall_lift_up';
               cabWidth = 80;
               cabHeight = 40;
            } else if (toolMode === 'place_wall_lift_up_double') {
               cabVariant = 'wall_lift_up_double';
               cabWidth = 80;
               cabHeight = 70;
            } else if (toolMode === 'place_wall_microwave_niche') {
               cabVariant = 'wall_microwave_niche';
               cabWidth = 60;
               cabHeight = 80;
               cabDepth = 38;
            } else if (toolMode === 'place_wall_open') {
               cabVariant = 'wall_open';
               cabWidth = 60;
               cabHeight = 70;
            }
         } else if (toolMode === 'place_island') {
            cabType = 'island';
            cabHeight = 80;
            cabWidth = 90;
            cabDepth = 80;
         } else if (toolMode === 'place_deco_stove') {
            cabType = 'decoration';
            cabVariant = 'deco_stove';
            cabWidth = 90;
            cabHeight = 90;
            cabDepth = 60;
         } else if (toolMode === 'place_deco_fridge') {
            cabType = 'decoration';
            cabVariant = 'deco_fridge';
            cabWidth = 91;
            cabHeight = 177;
            cabDepth = 67;
         } else if (toolMode === 'place_deco_hood') {
            cabType = 'decoration';
            cabVariant = 'deco_hood';
            cabWidth = 89.8;
            cabHeight = 70;
            cabDepth = 50;
         } else if (toolMode === 'place_deco_plant') {
            cabType = 'decoration';
            cabVariant = 'deco_plant';
            cabWidth = 40;
            cabHeight = 95;
            cabDepth = 40;
         }
      }

      const result = resolvePlacement({
        mouseX: rawX,
        mouseZ: rawZ,
        cabWidth,
        cabHeight,
        cabDepth,
        cabType,
        variant: cabVariant,
        customY,
        preferredRot: cabRot,
        cabinets,
        ignoreId: toolMode === 'move_active' ? activeCabId : null,
        walls,
        roomVertices: roomConfig?.vertices,
      });

      setGhostCabinet({ pos: result.position, rot: result.rotation, isColliding: result.isColliding });
    }
  });

  const handlePointerDown = (e: any) => {
    if (toolMode === 'select') {
      setActiveCabinet(null);
      return;
    }
    e.stopPropagation();

    if (toolMode === 'draw_wall') {
      const pt = currentMousePos || [e.point.x, e.point.z];
      if (!drawingStart) {
        setDrawingStart(pt);
      } else {
        addWall({
          id: crypto.randomUUID(),
          start: drawingStart,
          end: pt,
          thickness: 15,
          height: 240
        });
        setDrawingStart(pt); 
      }
    } else if (toolMode === 'move_active' && ghostCabinet) {
        const activeCabId = useKitchenStore.getState().activeCabinetId;
        if (activeCabId) {
           useKitchenStore.getState().updateCabinet(activeCabId, {
             position: ghostCabinet.pos,
             rotation: ghostCabinet.rot,
           });
        }
        setToolMode('select');
    } else if (toolMode.startsWith('place_') && ghostCabinet) {
      const isBase = toolMode.startsWith('place_base_');
      const isTall = toolMode.startsWith('place_tall_') || toolMode === 'place_tall';
      const isWall = toolMode.startsWith('place_wall_') || toolMode === 'place_wall';
      const isIsland = toolMode === 'place_island';
      
      let cabType: 'base' | 'wall' | 'tall' | 'island' | 'decoration' = 'base';
      let cabVariant = '1_door';
      let cabWidth = 60;
      let cabHeight = 80;
      let cabDepth = 60;

      if (isBase) {
         cabType = 'base';
         cabVariant = toolMode.replace('place_base_', '');
         if (cabVariant === 'spice_rack') cabWidth = 15;
         if (cabVariant === '2_doors' || cabVariant === '2_pot_drawers') cabWidth = 80;
         if (cabVariant === 'corner_blind') {
            cabWidth = 100;
            cabVariant = 'corner_blind_right';
         }
      } else if (isTall) {
         cabType = 'tall';
         cabHeight = 215;
         cabDepth = 60;
         if (toolMode === 'place_tall_1_door' || toolMode === 'place_tall') {
            cabVariant = 'tall_1_door';
            cabWidth = 60;
         } else if (toolMode === 'place_tall_split_2_doors') {
            cabVariant = 'tall_split_2_doors';
            cabWidth = 60;
         } else if (toolMode === 'place_tall_oven_micro') {
            cabVariant = 'tall_oven_micro';
            cabWidth = 60;
         } else if (toolMode === 'place_tall_microwave_niche') {
            cabVariant = 'tall_microwave_niche';
            cabWidth = 60;
         } else if (toolMode === 'place_tall_open') {
            cabVariant = 'tall_open';
            cabWidth = 60;
         } else if (toolMode === 'place_tall_2_doors') {
            cabVariant = 'tall_2_doors';
            cabWidth = 80;
         }
      } else if (isWall) {
         cabType = 'wall';
         cabDepth = 35;
         if (toolMode === 'place_wall_1_door') {
            cabVariant = '1_door';
            cabWidth = 60;
            cabHeight = 70;
         } else if (toolMode === 'place_wall_2_doors' || toolMode === 'place_wall') {
            cabVariant = '2_doors';
            cabWidth = 80;
            cabHeight = 70;
         } else if (toolMode === 'place_wall_lift_up') {
            cabVariant = 'wall_lift_up';
            cabWidth = 80;
            cabHeight = 40;
         } else if (toolMode === 'place_wall_lift_up_double') {
            cabVariant = 'wall_lift_up_double';
            cabWidth = 80;
            cabHeight = 70;
         } else if (toolMode === 'place_wall_microwave_niche') {
            cabVariant = 'wall_microwave_niche';
            cabWidth = 60;
            cabHeight = 80;
            cabDepth = 38;
         } else if (toolMode === 'place_wall_open') {
            cabVariant = 'wall_open';
            cabWidth = 60;
            cabHeight = 70;
         }
      } else if (isIsland) {
         cabType = 'island';
         cabVariant = '2_pot_drawers';
         cabHeight = 80;
         cabWidth = 90;
         cabDepth = 80;
      } else if (toolMode === 'place_deco_stove') {
         cabType = 'decoration';
         cabVariant = 'deco_stove';
         cabWidth = 90;
         cabHeight = 90;
         cabDepth = 60;
      } else if (toolMode === 'place_deco_fridge') {
         cabType = 'decoration';
         cabVariant = 'deco_fridge';
         cabWidth = 91;
         cabHeight = 177;
         cabDepth = 67;
      } else if (toolMode === 'place_deco_hood') {
         cabType = 'decoration';
         cabVariant = 'deco_hood';
         cabWidth = 89.8;
         cabHeight = 70;
         cabDepth = 50;
      } else if (toolMode === 'place_deco_plant') {
         cabType = 'decoration';
         cabVariant = 'deco_plant';
         cabWidth = 40;
         cabHeight = 95;
         cabDepth = 40;
      }

      const newId = crypto.randomUUID();
      const gState = useStore.getState();
      addCabinet({
         id: newId,
         type: cabType,
         variant: cabVariant,
         width: cabWidth,
         height: cabHeight,
         depth: cabDepth,
         position: ghostCabinet.pos,
         rotation: ghostCabinet.rot,
         color: '#f8fafc',
         structureColor: gState.structureColor || '#f8fafc',
         doorColor: gState.doorColor || '#f8fafc',
         drawerFrontColor: gState.drawerFrontColor || gState.doorColor || '#f8fafc',
         drawerInnerColor: gState.drawerInnerColor || '#f8fafc',
         shelfColor: gState.shelfColor || '#f8fafc',
         backColor: gState.backColor || '#f8fafc',
         socleColor: gState.socleColor || '#111',
         structureMaterial: gState.structureMaterial,
         doorMaterial: gState.doorMaterial,
         drawerFrontMaterial: gState.drawerFrontMaterial,
         drawerInnerMaterial: gState.drawerInnerMaterial,
         shelfMaterial: gState.shelfMaterial,
         socleMaterial: gState.socleMaterial,
      });
      const isDeco = cabType === 'decoration' || cabVariant.startsWith('deco_');
      if (!isDeco) {
        setActiveCabinet(newId);
      } else {
        setActiveCabinet(null);
      }
      setToolMode('select');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
         setDrawingStart(null);
         setToolMode('select');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setDrawingStart, setToolMode]);

  return (
    <>
      <color attach="background" args={['#1a1a1a']} />
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[200, 350, 250]}
        castShadow
        intensity={1.1}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
        shadow-normalBias={0.04}
        shadow-camera-near={10}
        shadow-camera-far={1500}
        shadow-camera-left={-500}
        shadow-camera-right={500}
        shadow-camera-top={500}
        shadow-camera-bottom={-500}
      />
      <Environment preset="city" />

      {is2D ? (
        <OrthographicCamera makeDefault position={[0, 1000, 0]} rotation={[-Math.PI/2, 0, 0]} zoom={2.5} near={1} far={3000} />
      ) : (
        <PerspectiveCamera makeDefault position={[300, 300, 400]} fov={45} near={1} far={3000} />
      )}
      
      <OrbitControls 
        enableRotate={!is2D} 
        minPolarAngle={0} 
        maxPolarAngle={is2D ? 0 : Math.PI / 2 - 0.05} 
        target={[0, 0, 0]}
      />

      <group name="kitchenGroup">
        {/* Ground Plane (fondo exterior separado verticalmente para evitar z-fighting) */}
        <mesh name="groundPlane" rotation={[-Math.PI/2, 0, 0]} position={[0, -1, 0]} receiveShadow onPointerDown={handlePointerDown}>
          <planeGeometry args={[3000, 3000]} />
          <meshStandardMaterial color="#1e2022" roughness={0.9} />
        </mesh>
        
        {is2D && (
          <Grid position={[0, 0.1, 0]} args={[2000, 2000]} infiniteGrid fadeDistance={1500} sectionColor="#666" cellColor="#333" />
        )}

        <RoomFloorAndDimensions />
        {walls.map(wall => <Wall key={wall.id} {...wall} />)}
        {cabinets.map(cab => {
          if (toolMode === 'move_active' && cab.id === useKitchenStore.getState().activeCabinetId) return null;
          return <Cabinet key={cab.id} {...cab} />;
        })}
        <KitchenSocle />
        <KitchenRunDimensions />

        {/* Drawing Preview */}
        {toolMode === 'draw_wall' && drawingStart && currentMousePos && (
          <WallPreview start={drawingStart} end={currentMousePos} thickness={15} height={240} />
        )}

        {/* Cabinet Preview */}
        {(toolMode.startsWith('place_') || toolMode === 'move_active') && ghostCabinet && !is2D && (() => {
           let previewW = 60;
           let previewH = 80;
           let previewD = 60;
           const activeCab = useKitchenStore.getState().cabinets.find(c => c.id === useKitchenStore.getState().activeCabinetId);
           if (toolMode === 'move_active' && activeCab) {
              previewW = activeCab.width;
              previewH = activeCab.height;
              previewD = activeCab.depth;
           } else if (toolMode.startsWith('place_base_')) {
              const v = toolMode.replace('place_base_', '');
              if (v === 'spice_rack') previewW = 15;
              if (v === '2_doors' || v === '2_pot_drawers') previewW = 80;
              if (v === 'corner_blind') previewW = 100;
           } else if (toolMode.startsWith('place_tall_') || toolMode === 'place_tall') {
              previewH = 215;
              if (toolMode === 'place_tall_2_doors') previewW = 80;
              else previewW = 60;
           } else if (toolMode === 'place_wall') {
              previewH = 60;
              previewW = 80;
              previewD = 35;
           } else if (toolMode === 'place_island') {
              previewH = 80;
              previewW = 90;
              previewD = 80;
           } else if (toolMode === 'place_deco_stove') {
              previewW = 90;
              previewH = 90;
              previewD = 60;
           } else if (toolMode === 'place_deco_fridge') {
              previewW = 91;
              previewH = 177;
              previewD = 67;
           } else if (toolMode === 'place_deco_hood') {
              previewW = 89.8;
              previewH = 70;
              previewD = 50;
           } else if (toolMode === 'place_deco_plant') {
              previewW = 40;
              previewH = 95;
              previewD = 40;
           }

           return (
             <group position={ghostCabinet.pos} rotation={[0, ghostCabinet.rot, 0]}>
               <mesh>
                 <boxGeometry args={[previewW, previewH, previewD]} />
                 <meshStandardMaterial color={ghostCabinet.isColliding ? '#ef4444' : '#f97316'} transparent opacity={0.45} />
                 <Edges scale={1.0} color={ghostCabinet.isColliding ? '#ef4444' : '#f97316'} />
               </mesh>
               {toolMode === 'move_active' && (
                 <MoveArrowGizmo height={previewH} width={previewW} depth={previewD} isColliding={ghostCabinet.isColliding} />
               )}
             </group>
           );
        })()}
      </group>
    </>
  )
}

export function KitchenScene() {
  return (
    <Canvas 
      shadows={{ type: THREE.PCFSoftShadowMap }}
      gl={{ 
        antialias: true, 
        powerPreference: 'high-performance',
      }}
    >
      <SceneContent />
    </Canvas>
  )
}

function MoveArrowGizmo({ height, width, depth, isColliding }: { height: number; width: number; depth: number; isColliding?: boolean }) {
  const groupRef = React.useRef<THREE.Group>(null);
  const color = isColliding ? '#ef4444' : '#f97316';
  const glowColor = isColliding ? '#fca5a5' : '#fed7aa';

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.position.y = height / 2 + 18 + Math.sin(t * 5) * 2.5;
  });

  const arrowArm = Math.max(25, Math.min(45, width * 0.4));

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Flechas cardinales en el piso/base del mueble indicando traslación */}
      <group position={[0, -height / 2 + 0.5, 0]}>
        {/* Eje X (Izquierda / Derecha) */}
        <Line points={[[-arrowArm, 0, 0], [arrowArm, 0, 0]]} color={color} lineWidth={3} depthTest={false} renderOrder={1001} />
        <mesh position={[arrowArm, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[2.5, 5, 8]} />
          <meshBasicMaterial color={color} depthTest={false} />
        </mesh>
        <mesh position={[-arrowArm, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[2.5, 5, 8]} />
          <meshBasicMaterial color={color} depthTest={false} />
        </mesh>

        {/* Eje Z (Adelante / Atrás) */}
        <Line points={[[0, 0, -arrowArm], [0, 0, arrowArm]]} color={color} lineWidth={3} depthTest={false} renderOrder={1001} />
        <mesh position={[0, 0, arrowArm]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[2.5, 5, 8]} />
          <meshBasicMaterial color={color} depthTest={false} />
        </mesh>
        <mesh position={[0, 0, -arrowArm]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[2.5, 5, 8]} />
          <meshBasicMaterial color={color} depthTest={false} />
        </mesh>
      </group>

      {/* 2. Flecha / Cursor 3D vertical descendente situada directamente sobre el mueble */}
      <group ref={groupRef} position={[0, height / 2 + 18, 0]}>
        {/* Fuste cilíndrico de la flecha */}
        <mesh position={[0, 6, 0]}>
          <cylinderGeometry args={[1.2, 1.2, 12, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} roughness={0.2} metalness={0.8} />
        </mesh>
        {/* Punta cónica de la flecha apuntando hacia abajo al mueble */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[4.5, 9, 24]} />
          <meshStandardMaterial color={color} emissive={glowColor} emissiveIntensity={0.8} roughness={0.2} metalness={0.8} />
        </mesh>

        {/* Anillo de enfoque / halo luminoso */}
        <mesh position={[0, 12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[5, 0.6, 12, 24]} />
          <meshBasicMaterial color={color} />
        </mesh>

        {/* Rótulo 3D flotante */}
        <group position={[0, 16, 0]}>
          <Text
            fontSize={6.5}
            color={color}
            anchorX="center"
            anchorY="bottom"
            font="bold"
            material-depthTest={false}
            material-toneMapped={false}
            renderOrder={1002}
          >
            {isColliding ? '⚠️ POSICIÓN BLOQUEADA' : '✛ MOVER ELEMENTO'}
          </Text>
          <Text
            position={[0, -4.5, 0]}
            fontSize={4}
            color="#ffffff"
            anchorX="center"
            anchorY="bottom"
            material-depthTest={false}
            material-toneMapped={false}
            renderOrder={1002}
          >
            Clic en muro o piso para fijar
          </Text>
        </group>
      </group>
    </group>
  );
}

function WallPreview({start, end, thickness, height}: any) {
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
  const cx = (start[0] + end[0]) / 2;
  const cz = (start[1] + end[1]) / 2;
  const rotY = Math.atan2(start[0] - end[0], start[1] - end[1]);

  return (
    <group position={[cx, height/2, cz]} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[thickness, height, length]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.5} />
      </mesh>
      <group position={[0, height / 2 + 10, 0]} renderOrder={999}>
        <Line points={[[0, 0, -length / 2], [0, 0, length / 2]]} color="#3b82f6" lineWidth={2} depthTest={false} renderOrder={999} />
        <Line points={[[-3, 0, -length / 2], [3, 0, -length / 2]]} color="#3b82f6" lineWidth={2} depthTest={false} renderOrder={999} />
        <Line points={[[-3, 0, length / 2], [3, 0, length / 2]]} color="#3b82f6" lineWidth={2} depthTest={false} renderOrder={999} />
        <Text position={[0, 4, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={7} color="#3b82f6" anchorX="center" anchorY="bottom" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{Math.round(length)} cm</Text>
      </group>
    </group>
  );
}
