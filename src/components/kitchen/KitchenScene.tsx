import React, { useState, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Edges, OrthographicCamera, PerspectiveCamera, OrbitControls, Environment, Grid, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useKitchenStore } from '../../store/kitchenStore';
import { Wall } from './Wall';
import { Cabinet } from './Cabinet';
import { KitchenSocle } from './KitchenSocle';
import { KitchenRunDimensions } from './KitchenRunDimensions';
import { RoomFloorAndDimensions } from './RoomFloorAndDimensions';
import { resolvePlacement } from '../../utils/kitchenCollision';

function SceneContent() {
  const { viewMode, toolMode, walls, cabinets, addWall, drawingStart, setDrawingStart, addCabinet, setToolMode, setActiveCabinet, roomConfig } = useKitchenStore();
  const [currentMousePos, setCurrentMousePos] = useState<[number, number] | null>(null);
  const [ghostCabinet, setGhostCabinet] = useState<{pos: [number,number,number], rot: number, isColliding?: boolean} | null>(null);
  const { camera, raycaster, pointer, scene } = useThree();

  const is2D = viewMode === '2d';

  useFrame(() => {
    if (toolMode === 'draw_wall' && drawingStart) {
      raycaster.setFromCamera(pointer, camera);
      const ground = scene.getObjectByName('groundPlane');
      if (ground) {
        const intersects = raycaster.intersectObject(ground);
        if (intersects.length > 0) {
          const x = Math.round(intersects[0].point.x / 10) * 10;
          const z = Math.round(intersects[0].point.z / 10) * 10;
          setCurrentMousePos([x, z]);
        }
      }
    } else if (toolMode.startsWith('place_') || toolMode === 'move_active') {
      raycaster.setFromCamera(pointer, camera);
      const ground = scene.getObjectByName('groundPlane');
      if (ground) {
        const intersects = raycaster.intersectObject(ground);
        if (intersects.length > 0) {
          const rawX = Math.round(intersects[0].point.x / 5) * 5;
          const rawZ = Math.round(intersects[0].point.z / 5) * 5;
          
          let cabWidth = 60;
          let cabDepth = 60;
          let cabHeight = 80;
          let cabType = 'base';
          let cabRot = 0;
          const activeCabId = useKitchenStore.getState().activeCabinetId;
          
          if (toolMode === 'move_active') {
             const activeCab = cabinets.find(c => c.id === activeCabId) || null;
             if (activeCab) {
                cabWidth = activeCab.width;
                cabDepth = activeCab.depth;
                cabHeight = activeCab.height;
                cabType = activeCab.type;
                cabRot = activeCab.rotation || 0;
             }
          } else {
             const isBase = toolMode.startsWith('place_base_');
             const isTall = toolMode.startsWith('place_tall_') || toolMode === 'place_tall';
             if (isBase) {
                cabType = 'base';
                const cabVariant = toolMode.replace('place_base_', '');
                if (cabVariant === 'spice_rack') cabWidth = 15;
                if (cabVariant === '2_doors' || cabVariant === '2_pot_drawers') cabWidth = 80;
                if (cabVariant === 'corner_blind') cabWidth = 100;
             } else if (isTall) {
                cabType = 'tall';
                cabHeight = 215;
                if (toolMode === 'place_tall_2_doors') cabWidth = 80;
                else cabWidth = 60;
             } else if (toolMode === 'place_wall') {
                cabType = 'wall';
                cabHeight = 60;
                cabWidth = 80;
                cabDepth = 35;
             } else if (toolMode === 'place_island') {
                cabType = 'island';
                cabHeight = 80;
                cabWidth = 90;
                cabDepth = 80;
             } else if (toolMode === 'place_deco_stove') {
                cabType = 'decoration';
                cabWidth = 90;
                cabHeight = 90;
                cabDepth = 60;
             } else if (toolMode === 'place_deco_fridge') {
                cabType = 'decoration';
                cabWidth = 91;
                cabHeight = 177;
                cabDepth = 67;
             } else if (toolMode === 'place_deco_plant') {
                cabType = 'decoration';
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
            preferredRot: cabRot,
            cabinets,
            ignoreId: toolMode === 'move_active' ? activeCabId : null,
            walls,
            roomVertices: roomConfig?.vertices,
          });

          setGhostCabinet({ pos: result.position, rot: result.rotation, isColliding: result.isColliding });
        }
      }
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
      const isWall = toolMode === 'place_wall';
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
         cabVariant = '2_doors';
         cabHeight = 60;
         cabWidth = 80;
         cabDepth = 35;
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
      } else if (toolMode === 'place_deco_plant') {
         cabType = 'decoration';
         cabVariant = 'deco_plant';
         cabWidth = 40;
         cabHeight = 95;
         cabDepth = 40;
      }

      const newId = crypto.randomUUID();
      addCabinet({
         id: newId,
         type: cabType,
         variant: cabVariant,
         width: cabWidth,
         height: cabHeight,
         depth: cabDepth,
         position: ghostCabinet.pos,
         rotation: ghostCabinet.rot,
         color: '#f8fafc'
      });
      setActiveCabinet(newId);
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
      <ambientLight intensity={0.6} />
      <directionalLight position={[100, 200, 150]} castShadow intensity={1.2} shadow-mapSize={[2048, 2048]} />
      <Environment preset="city" />

      {is2D ? (
        <OrthographicCamera makeDefault position={[0, 1000, 0]} rotation={[-Math.PI/2, 0, 0]} zoom={2.5} near={0.1} far={2000} />
      ) : (
        <PerspectiveCamera makeDefault position={[300, 300, 400]} fov={45} />
      )}
      
      <OrbitControls 
        enableRotate={!is2D} 
        minPolarAngle={0} 
        maxPolarAngle={is2D ? 0 : Math.PI / 2 - 0.05} 
        target={[0, 0, 0]}
      />

      <group name="kitchenGroup">
        {/* Ground Plane */}
        <mesh name="groundPlane" rotation={[-Math.PI/2, 0, 0]} position={[0, -0.1, 0]} receiveShadow onPointerDown={handlePointerDown}>
          <planeGeometry args={[2000, 2000]} />
          <meshStandardMaterial color="#222" roughness={0.8} />
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
           } else if (toolMode === 'place_deco_plant') {
              previewW = 40;
              previewH = 95;
              previewD = 40;
           }

           return (
             <mesh position={ghostCabinet.pos} rotation={[0, ghostCabinet.rot, 0]}>
                <boxGeometry args={[previewW, previewH, previewD]} />
                <meshStandardMaterial color={ghostCabinet.isColliding ? '#ef4444' : '#f97316'} transparent opacity={0.45} />
                <Edges scale={1.0} color={ghostCabinet.isColliding ? '#ef4444' : '#f97316'} />
             </mesh>
           );
        })()}
      </group>
    </>
  )
}

export function KitchenScene() {
  return (
    <Canvas shadows>
      <SceneContent />
    </Canvas>
  )
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
