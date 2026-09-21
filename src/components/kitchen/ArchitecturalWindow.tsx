import React from 'react';
import * as THREE from 'three';
import { Edges, Line } from '@react-three/drei';

interface ArchitecturalWindowProps {
  width: number;
  height: number;
  depth: number;
  isSelected?: boolean;
  viewMode?: '2d' | '3d';
}

export function ArchitecturalWindow({
  width,
  height,
  depth,
  isSelected = false,
  viewMode = '3d',
}: ArchitecturalWindowProps) {
  const frameThick = 4.5;
  const glassW = Math.max(10, width / 2 - 6);
  const glassH = Math.max(10, height - 11);

  return (
    <group name="archRealWindow">
      {/* Marco Perimetral de PVC Blanco (4 Perfiles Huecos) */}
      {/* Perfil Superior */}
      <mesh position={[0, (height - frameThick) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, frameThick, depth]} />
        <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.05} side={THREE.DoubleSide} />
        <Edges scale={1} threshold={15} color={isSelected ? '#0284c7' : '#cbd5e1'} />
      </mesh>

      {/* Perfil Inferior */}
      <mesh position={[0, -(height - frameThick) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, frameThick, depth]} />
        <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.05} side={THREE.DoubleSide} />
        <Edges scale={1} threshold={15} color={isSelected ? '#0284c7' : '#cbd5e1'} />
      </mesh>

      {/* Perfil Izquierdo */}
      <mesh position={[-(width - frameThick) / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[frameThick, height - 2 * frameThick, depth]} />
        <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.05} side={THREE.DoubleSide} />
        <Edges scale={1} threshold={15} color={isSelected ? '#0284c7' : '#cbd5e1'} />
      </mesh>

      {/* Perfil Derecho */}
      <mesh position={[(width - frameThick) / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[frameThick, height - 2 * frameThick, depth]} />
        <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.05} side={THREE.DoubleSide} />
        <Edges scale={1} threshold={15} color={isSelected ? '#0284c7' : '#cbd5e1'} />
      </mesh>

      {/* Travesaño / Perfil central de corrediza */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.5, height - 2 * frameThick, depth - 2]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.2} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>

      {/* Hoja Izquierda con Vidrio Transparente Cristalino */}
      <group position={[-width / 4 + 2, 0, 1]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[glassW, glassH, 1.2]} />
          <meshStandardMaterial color="#bae6fd" transparent={true} opacity={0.22} roughness={0.02} metalness={0.95} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Hoja Derecha con Vidrio Transparente Cristalino */}
      <group position={[width / 4 - 2, 0, -1]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[glassW, glassH, 1.2]} />
          <meshStandardMaterial color="#bae6fd" transparent={true} opacity={0.22} roughness={0.02} metalness={0.95} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Manilla metálica de ventana corrediza */}
      <group position={[-8, 0, depth / 2 - 0.5]}>
        <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.4, 0.4, 4.5, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.1} />
        </mesh>
      </group>

      {/* 2D Architectural Window Double Line */}
      {viewMode === '2d' && (
        <group renderOrder={1005} position={[0, height / 2 + 2, 0]}>
          <Line
            points={[[-width / 2, 0, -depth / 4], [width / 2, 0, -depth / 4]]}
            color="#0284c7"
            lineWidth={2}
            depthTest={false}
            material-toneMapped={false}
          />
          <Line
            points={[[-width / 2, 0, depth / 4], [width / 2, 0, depth / 4]]}
            color="#0284c7"
            lineWidth={2}
            depthTest={false}
            material-toneMapped={false}
          />
        </group>
      )}
    </group>
  );
}
