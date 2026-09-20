import React from 'react';
import { useKitchenStore, ArchitecturalElement } from '../../store/kitchenStore';
import { Edges, Line } from '@react-three/drei';
import { ArchitecturalDoor } from './ArchitecturalDoor';

export function ArchitecturalElementsRenderer() {
  const { architecturalElements, activeArchElementId, setActiveArchElement, setDraggingArchElementId, wallColor, toolMode, viewMode } = useKitchenStore();

  // Elements with wallId are rendered inside Wall components
  const standaloneElements = architecturalElements?.filter(el => !el.wallId) || [];

  if (standaloneElements.length === 0) return null;

  return (
    <group name="architecturalElementsGroup">
      {standaloneElements.map((el) => {
        if (toolMode === 'move_active' && el.id === activeArchElementId) return null;
        const isSelected = el.id === activeArchElementId;
        const [x, , z] = el.position;
        const y = el.elevation + el.height / 2;
        const rot = el.rotation || 0;
        const depth = el.depth || 16; // Wall thickness match

        return (
          <group
            key={el.id}
            position={[x, y, z]}
            rotation={[0, rot, 0]}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
                e.nativeEvent.stopImmediatePropagation();
              }
              setActiveArchElement(el.id);
              setDraggingArchElementId(el.id);
            }}
            onClick={(e) => {
              e.stopPropagation();
              setActiveArchElement(el.id);
            }}
          >
            {el.type === 'door' && (
              <ArchitecturalDoor
                width={el.width}
                height={el.height}
                depth={depth}
                isSelected={isSelected}
                viewMode={viewMode}
              />
            )}

            {el.type === 'window' && (
              <group name="archRealWindow">
                {/* Marco Perimetral de PVC Blanco (4 Perfiles Huecos) */}
                {/* Perfil Superior */}
                <mesh position={[0, (el.height - 4.5) / 2, 0]} castShadow receiveShadow>
                  <boxGeometry args={[el.width, 4.5, depth]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.05} />
                  <Edges scale={1} threshold={15} color={isSelected ? '#0284c7' : '#cbd5e1'} />
                </mesh>
                {/* Perfil Inferior */}
                <mesh position={[0, -(el.height - 4.5) / 2, 0]} castShadow receiveShadow>
                  <boxGeometry args={[el.width, 4.5, depth]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.05} />
                  <Edges scale={1} threshold={15} color={isSelected ? '#0284c7' : '#cbd5e1'} />
                </mesh>
                {/* Perfil Izquierdo */}
                <mesh position={[-(el.width - 4.5) / 2, 0, 0]} castShadow receiveShadow>
                  <boxGeometry args={[4.5, el.height - 9, depth]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.05} />
                  <Edges scale={1} threshold={15} color={isSelected ? '#0284c7' : '#cbd5e1'} />
                </mesh>
                {/* Perfil Derecho */}
                <mesh position={[(el.width - 4.5) / 2, 0, 0]} castShadow receiveShadow>
                  <boxGeometry args={[4.5, el.height - 9, depth]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.05} />
                  <Edges scale={1} threshold={15} color={isSelected ? '#0284c7' : '#cbd5e1'} />
                </mesh>

                {/* Travesaño / Perfil central de corrediza */}
                <mesh position={[0, 0, 0]} castShadow receiveShadow>
                  <boxGeometry args={[3.5, el.height - 9, depth - 2]} />
                  <meshStandardMaterial color="#f1f5f9" roughness={0.2} metalness={0.1} />
                </mesh>

                {/* Hoja Izquierda con Vidrio Transparente Cristalino */}
                <group position={[-el.width / 4 + 2, 0, 1]}>
                  <mesh castShadow receiveShadow>
                    <boxGeometry args={[el.width / 2 - 6, el.height - 11, 1.2]} />
                    <meshStandardMaterial color="#bae6fd" transparent={true} opacity={0.22} roughness={0.02} metalness={0.95} />
                  </mesh>
                </group>

                {/* Hoja Derecha con Vidrio Transparente Cristalino */}
                <group position={[el.width / 4 - 2, 0, -1]}>
                  <mesh castShadow receiveShadow>
                    <boxGeometry args={[el.width / 2 - 6, el.height - 11, 1.2]} />
                    <meshStandardMaterial color="#bae6fd" transparent={true} opacity={0.22} roughness={0.02} metalness={0.95} />
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
                {viewMode === "2d" && (
                  <group renderOrder={1005} position={[0, el.height / 2 + 2, 0]}>
                    <Line points={[[-el.width / 2, 0, -depth / 4], [el.width / 2, 0, -depth / 4]]} color="#0284c7" lineWidth={2} depthTest={false} material-toneMapped={false} />
                    <Line points={[[-el.width / 2, 0, depth / 4], [el.width / 2, 0, depth / 4]]} color="#0284c7" lineWidth={2} depthTest={false} material-toneMapped={false} />
                  </group>
                )}
              </group>
            )}

            {el.type === 'pillar' && (
              <group name="archRealPillar">
                <mesh castShadow receiveShadow position={[0, 0, 0]}>
                  <boxGeometry args={[el.width, el.height, depth]} />
                  <meshStandardMaterial
                    color={wallColor || '#cbd5e1'}
                    roughness={0.7}
                    metalness={0.05}
                  />
                  <Edges scale={1} threshold={15} color={isSelected ? '#0284c7' : '#64748b'} />
                </mesh>
              </group>
            )}

            {/* Indicador de Selección rectangular sutil */ }
            {isSelected && (
              <group position={[0, -el.height / 2 + 0.5, 0]}>
                <mesh position={[0, 0, (depth + 1.6) / 2]}>
                  <boxGeometry args={[el.width + 2, 0.4, 0.8]} />
                  <meshBasicMaterial color="#0284c7" />
                </mesh>
                <mesh position={[0, 0, -(depth + 1.6) / 2]}>
                  <boxGeometry args={[el.width + 2, 0.4, 0.8]} />
                  <meshBasicMaterial color="#0284c7" />
                </mesh>
                <mesh position={[-(el.width + 1.6) / 2, 0, 0]}>
                  <boxGeometry args={[0.8, 0.4, depth + 0.8]} />
                  <meshBasicMaterial color="#0284c7" />
                </mesh>
                <mesh position={[(el.width + 1.6) / 2, 0, 0]}>
                  <boxGeometry args={[0.8, 0.4, depth + 0.8]} />
                  <meshBasicMaterial color="#0284c7" />
                </mesh>
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}
