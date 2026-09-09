import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { WallType, useKitchenStore } from '../../store/kitchenStore';
import { useStore } from '../../store';
import { Edges, Line, Text } from '@react-three/drei';
import { getWallInwardNormal } from '../../utils/kitchenCollision';

export function Wall({ id, start, end, thickness, height }: WallType & { id?: string }) {
   const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
   const cx = (start[0] + end[0]) / 2;
   const cz = (start[1] + end[1]) / 2;
   const rotY = Math.atan2(start[0] - end[0], start[1] - end[1]);
   const showDimensions = useStore((s) => s.showDimensions);
   const wallColor = useKitchenStore((s) => s.wallColor) || '#E2E8F0';
   const viewMode = useKitchenStore((s) => s.viewMode);
   const roomConfig = useKitchenStore((s) => s.roomConfig);
   const architecturalElements = useKitchenStore((s) => s.architecturalElements);
   const activeArchElementId = useKitchenStore((s) => s.activeArchElementId);
   const setActiveArchElement = useKitchenStore((s) => s.setActiveArchElement);
   const setDraggingArchElementId = useKitchenStore((s) => s.setDraggingArchElementId);

   const groupRef = useRef<THREE.Group>(null);

   const wallElements = useMemo(() => {
      return architecturalElements.filter(el => {
         if (id && el.wallId === id) return true;
         const dist = Math.hypot(el.position[0] - cx, el.position[2] - cz);
         return !el.wallId && dist < length / 2 + 30;
      });
   }, [architecturalElements, id, cx, cz, length]);

   // Vector normal hacia el interior de la habitación
   const inwardNormal = useMemo(() => {
      const poly = roomConfig?.vertices?.map(v => [v.x, v.y] as [number, number]) || [];
      return getWallInwardNormal(start[0], start[1], end[0], end[1], poly);
   }, [start, end, roomConfig]);

   // Ocultación dinámica inteligente (Camera Occlusion / Cutaway Wall)
   useFrame(({ camera }) => {
      if (!groupRef.current) return;
      
      if (viewMode === '2d') {
         groupRef.current.visible = true;
         return;
      }

      const camX = camera.position.x;
      const camZ = camera.position.z;
      const vCamX = camX - cx;
      const vCamZ = camZ - cz;

      const dot = vCamX * inwardNormal[0] + vCamZ * inwardNormal[1];
      groupRef.current.visible = dot > -5;
   });

   return (
     <group ref={groupRef} name="wallGroup" position={[cx, height/2, cz]} rotation={[0, rotY, 0]}>
       {wallElements.length === 0 ? (
         <mesh name="wall" castShadow receiveShadow>
           <boxGeometry args={[thickness, height, length]} />
           <meshStandardMaterial color={wallColor} roughness={0.85} metalness={0.05} />
           <Edges scale={1} threshold={15} color="#94a3b8" />
         </mesh>
       ) : (
         <group name="segmentedWall">
           {(() => {
             const el = wallElements[0];
             const elWidth = el.width;
             const elHeight = el.height;
             const elElev = el.elevation || 0;
             const offset = el.offset || 0;

             const wStart = offset - elWidth / 2;
             const wEnd = offset + elWidth / 2;

             const leftLen = (wStart) - (-length / 2);
             const rightLen = (length / 2) - (wEnd);

             const leftCenterZ = -length / 2 + leftLen / 2;
             const rightCenterZ = wEnd + rightLen / 2;

             return (
               <>
                 {leftLen > 0.1 && (
                   <mesh position={[0, 0, leftCenterZ]} castShadow receiveShadow>
                     <boxGeometry args={[thickness, height, leftLen]} />
                     <meshStandardMaterial color={wallColor} roughness={0.85} metalness={0.05} />
                     <Edges scale={1} threshold={15} color="#94a3b8" />
                   </mesh>
                 )}
                 {rightLen > 0.1 && (
                   <mesh position={[0, 0, rightCenterZ]} castShadow receiveShadow>
                     <boxGeometry args={[thickness, height, rightLen]} />
                     <meshStandardMaterial color={wallColor} roughness={0.85} metalness={0.05} />
                     <Edges scale={1} threshold={15} color="#94a3b8" />
                   </mesh>
                 )}
                 {el.type === 'window' && elElev > 0 && (
                   <mesh position={[0, -height / 2 + elElev / 2, offset]} castShadow receiveShadow>
                     <boxGeometry args={[thickness, elElev, elWidth]} />
                     <meshStandardMaterial color={wallColor} roughness={0.85} metalness={0.05} />
                     <Edges scale={1} threshold={15} color="#94a3b8" />
                   </mesh>
                 )}
                 {(height - (elElev + elHeight)) > 0.1 && (
                   <mesh position={[0, height / 2 - (height - (elElev + elHeight)) / 2, offset]} castShadow receiveShadow>
                     <boxGeometry args={[thickness, height - (elElev + elHeight), elWidth]} />
                     <meshStandardMaterial color={wallColor} roughness={0.85} metalness={0.05} />
                     <Edges scale={1} threshold={15} color="#94a3b8" />
                   </mesh>
                 )}
               </>
             );
           })()}
         </group>
       )}

       {wallElements.map((el) => {
         const isSelected = el.id === activeArchElementId;
         const yLocal = el.elevation + el.height / 2 - height / 2;
         const zLocal = el.offset !== undefined ? el.offset : 0;
         const elDepth = el.type === 'pillar' ? (el.depth ?? thickness) : thickness;
         const inwardSign = (-(end[1] - start[1]) * inwardNormal[0] + (end[0] - start[0]) * inwardNormal[1]) >= 0 ? 1 : -1;
         const pillarZ = el.type === 'pillar' ? (inwardSign * (elDepth - thickness) / 2) : 0;

         return (
           <group
             key={el.id}
             position={[0, yLocal, zLocal]}
             rotation={[0, Math.PI / 2, 0]}
             onClick={(e) => {
               e.stopPropagation();
               setActiveArchElement(el.id);
             }}
             onPointerDown={(e) => {
               e.stopPropagation();
               if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
                 e.nativeEvent.stopImmediatePropagation();
               }
               setActiveArchElement(el.id);
               setDraggingArchElementId(el.id);
             }}
           >
             {el.type === 'door' && (
               <group name="archRealDoor">
                 {/* Marco Gris Oscuro */}
                 <mesh castShadow receiveShadow position={[0, 0, 0]}>
                   <boxGeometry args={[el.width, el.height, elDepth]} />
                   <meshStandardMaterial color="#475569" roughness={0.3} metalness={0.2} />
                   <Edges scale={1} threshold={15} color={isSelected ? '#0284c7' : '#334155'} />
                 </mesh>

                 {/* Hoja de Puerta Gris Moderna Minimalista */}
                 <group position={[0, 0, 0]}>
                   <mesh position={[0, 0, 0]} castShadow receiveShadow>
                     <boxGeometry args={[el.width - 6, el.height - 4, 3.8]} />
                     <meshStandardMaterial color="#64748b" roughness={0.4} metalness={0.1} />
                     <Edges scale={1} threshold={15} color="#475569" />
                   </mesh>

                   {/* Línea / Ranura Vertical Estilo Minimalista en el lado izquierdo */}
                   <mesh position={[-el.width * 0.25, 0, 2.05]}>
                     <boxGeometry args={[0.8, el.height - 10, 0.4]} />
                     <meshStandardMaterial color="#334155" roughness={0.5} />
                   </mesh>

                   {/* Manilla y Roseta Negra Moderna */}
                   <group position={[el.width / 2 - 12, -2, 2.3]}>
                     {/* Roseta redonda negra */}
                     <mesh position={[0, 0, 0]}>
                       <cylinderGeometry args={[1.2, 1.2, 0.6, 16]} />
                       <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.8} />
                     </mesh>
                     {/* Manilla horizontal negra */}
                     <mesh position={[-3, 0, 1.2]} rotation={[0, 0, Math.PI / 2]}>
                       <cylinderGeometry args={[0.5, 0.5, 4.5, 16]} />
                       <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.8} />
                     </mesh>
                   </group>

                   {/* Bisagras Negras en el lado derecho */}
                   <group position={[-el.width / 2 + 3, el.height * 0.3, 2]}>
                     <boxGeometry args={[1, 4, 0.5]} />
                     <meshStandardMaterial color="#1e293b" metalness={0.9} />
                   </group>
                   <group position={[-el.width / 2 + 3, -el.height * 0.3, 2]}>
                     <boxGeometry args={[1, 4, 0.5]} />
                     <meshStandardMaterial color="#1e293b" metalness={0.9} />
                   </group>
                 </group>
               </group>
             )}

             {el.type === 'window' && (
               <group name="archRealWindow">
                 {/* Marco Perimetral de PVC Blanco (4 Perfiles Huecos) */}
                 <mesh position={[0, (el.height - 4.5) / 2, 0]} castShadow receiveShadow>
                   <boxGeometry args={[el.width, 4.5, elDepth]} />
                   <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.05} />
                   <Edges scale={1} threshold={15} color={isSelected ? '#0284c7' : '#cbd5e1'} />
                 </mesh>
                 <mesh position={[0, -(el.height - 4.5) / 2, 0]} castShadow receiveShadow>
                   <boxGeometry args={[el.width, 4.5, elDepth]} />
                   <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.05} />
                   <Edges scale={1} threshold={15} color={isSelected ? '#0284c7' : '#cbd5e1'} />
                 </mesh>
                 <mesh position={[-(el.width - 4.5) / 2, 0, 0]} castShadow receiveShadow>
                   <boxGeometry args={[4.5, el.height - 9, elDepth]} />
                   <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.05} />
                   <Edges scale={1} threshold={15} color={isSelected ? '#0284c7' : '#cbd5e1'} />
                 </mesh>
                 <mesh position={[(el.width - 4.5) / 2, 0, 0]} castShadow receiveShadow>
                   <boxGeometry args={[4.5, el.height - 9, elDepth]} />
                   <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.05} />
                   <Edges scale={1} threshold={15} color={isSelected ? '#0284c7' : '#cbd5e1'} />
                 </mesh>

                 {/* Travesaño central */}
                 <mesh position={[0, 0, 0]} castShadow receiveShadow>
                   <boxGeometry args={[3.5, el.height - 9, elDepth - 2]} />
                   <meshStandardMaterial color="#f1f5f9" roughness={0.2} metalness={0.1} />
                 </mesh>

                 {/* Hoja Izquierda con Vidrio Transparente */}
                 <group position={[-el.width / 4 + 2, 0, 1]}>
                   <mesh castShadow receiveShadow>
                     <boxGeometry args={[el.width / 2 - 6, el.height - 11, 1.2]} />
                     <meshStandardMaterial color="#bae6fd" transparent={true} opacity={0.22} roughness={0.02} metalness={0.95} />
                   </mesh>
                 </group>

                 {/* Hoja Derecha con Vidrio Transparente */}
                 <group position={[el.width / 4 - 2, 0, -1]}>
                   <mesh castShadow receiveShadow>
                     <boxGeometry args={[el.width / 2 - 6, el.height - 11, 1.2]} />
                     <meshStandardMaterial color="#bae6fd" transparent={true} opacity={0.22} roughness={0.02} metalness={0.95} />
                   </mesh>
                 </group>

                 {/* Manilla */}
                 <group position={[-8, 0, elDepth / 2 - 0.5]}>
                   <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
                     <cylinderGeometry args={[0.4, 0.4, 4.5, 16]} />
                     <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.1} />
                   </mesh>
                 </group>
               </group>
             )}

             {el.type === 'pillar' && (
               <group name="archRealPillar">
                 <mesh castShadow receiveShadow position={[0, 0, pillarZ]}>
                   <boxGeometry args={[el.width, el.height, elDepth]} />
                   <meshStandardMaterial color={wallColor || '#cbd5e1'} roughness={0.7} metalness={0.05} />
                   <Edges scale={1} threshold={15} color={isSelected ? '#0284c7' : '#64748b'} />
                 </mesh>
               </group>
             )}

             {isSelected && (
               <mesh position={[0, -el.height / 2 + 1, pillarZ]} rotation={[-Math.PI / 2, 0, 0]}>
                 <ringGeometry args={[Math.max(el.width, elDepth) / 2 + 3, Math.max(el.width, elDepth) / 2 + 6, 32]} />
                 <meshBasicMaterial color="#0284c7" side={2} />
               </mesh>
             )}
           </group>
         );
       })}

       {showDimensions && (
         <group position={[0, height / 2 + 10, 0]} renderOrder={999}>
           <Line points={[[0, 0, -length / 2], [0, 0, length / 2]]} color="#f97316" lineWidth={2} depthTest={false} renderOrder={999} />
           <Line points={[[-3, 0, -length / 2], [3, 0, -length / 2]]} color="#f97316" lineWidth={2} depthTest={false} renderOrder={999} />
           <Line points={[[-3, 0, length / 2], [3, 0, length / 2]]} color="#f97316" lineWidth={2} depthTest={false} renderOrder={999} />
           <Text position={[0, 4, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={7} color="#f97316" anchorX="center" anchorY="bottom" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{Math.round(length)} cm</Text>
         </group>
       )}
     </group>
   );
}
