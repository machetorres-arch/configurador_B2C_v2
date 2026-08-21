import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { WallType, useKitchenStore } from '../../store/kitchenStore';
import { useStore } from '../../store';
import { Edges, Line, Text } from '@react-three/drei';

export function Wall({ start, end, thickness, height }: WallType) {
   const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
   const cx = (start[0] + end[0]) / 2;
   const cz = (start[1] + end[1]) / 2;
   const rotY = Math.atan2(start[0] - end[0], start[1] - end[1]);
   const showDimensions = useStore((s) => s.showDimensions);
   const wallColor = useKitchenStore((s) => s.wallColor) || '#E2E8F0';
   const viewMode = useKitchenStore((s) => s.viewMode);
   const roomConfig = useKitchenStore((s) => s.roomConfig);

   const groupRef = useRef<THREE.Group>(null);

   // Calcular centro de la estancia para orientar la normal interior
   const roomCenter = useMemo(() => {
      if (roomConfig?.vertices && roomConfig.vertices.length >= 3) {
         const sum = roomConfig.vertices.reduce((acc, v) => [acc[0] + v.x, acc[1] + v.y], [0, 0]);
         return [sum[0] / roomConfig.vertices.length, sum[1] / roomConfig.vertices.length] as [number, number];
      }
      return [0, 0] as [number, number];
   }, [roomConfig]);

   // Vector normal hacia el interior de la habitación
   const inwardNormal = useMemo(() => {
      const dx = end[0] - start[0];
      const dz = end[1] - start[1];
      const toCenterX = roomCenter[0] - cx;
      const toCenterZ = roomCenter[1] - cz;
      let nX = -dz;
      let nZ = dx;
      if (nX * toCenterX + nZ * toCenterZ < 0) {
         nX = -nX;
         nZ = -nZ;
      }
      const len = Math.hypot(nX, nZ);
      if (len > 0.0001) {
         return [nX / len, nZ / len] as [number, number];
      }
      return [0, 1] as [number, number];
   }, [start, end, cx, cz, roomCenter]);

   // Ocultación dinámica inteligente (Camera Occlusion / Cutaway Wall)
   useFrame(({ camera }) => {
      if (!groupRef.current) return;
      
      if (viewMode === '2d') {
         groupRef.current.visible = true;
         return;
      }

      // Posición de la cámara en el plano horizontal
      const camX = camera.position.x;
      const camZ = camera.position.z;
      const vCamX = camX - cx;
      const vCamZ = camZ - cz;

      // Producto escalar entre vector cámara-muro y la normal interior del muro
      // Si dot < 0, la cámara está por fuera y el muro tapa los muebles -> Ocultar muro
      // Si dot >= 0, la cámara ve la cara interior del muro (fondo de escena) -> Mostrar muro
      const dot = vCamX * inwardNormal[0] + vCamZ * inwardNormal[1];
      groupRef.current.visible = dot > -5;
   });

   return (
     <group ref={groupRef} name="wallGroup" position={[cx, height/2, cz]} rotation={[0, rotY, 0]}>
       <mesh name="wall" castShadow receiveShadow>
         <boxGeometry args={[thickness, height, length]} />
         <meshStandardMaterial color={wallColor} roughness={0.85} metalness={0.05} />
         <Edges scale={1} threshold={15} color="#94a3b8" />
       </mesh>
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
