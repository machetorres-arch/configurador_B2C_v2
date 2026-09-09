import React from 'react';
import { useKitchenStore, ArchitecturalElement } from '../../store/kitchenStore';
import { Edges } from '@react-three/drei';

export function ArchitecturalElementsRenderer() {
  const { architecturalElements, activeArchElementId, setActiveArchElement, setDraggingArchElementId, wallColor } = useKitchenStore();

  // Elements with wallId are rendered inside Wall components
  const standaloneElements = architecturalElements?.filter(el => !el.wallId) || [];

  if (standaloneElements.length === 0) return null;

  return (
    <group name="architecturalElementsGroup">
      {standaloneElements.map((el) => {
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
              <group name="archRealDoor">
                {/* Marco Gris Oscuro */}
                <mesh castShadow receiveShadow position={[0, 0, 0]}>
                  <boxGeometry args={[el.width, el.height, depth]} />
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
                    <mesh position={[0, 0, 0]}>
                      <cylinderGeometry args={[1.2, 1.2, 0.6, 16]} />
                      <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.8} />
                    </mesh>
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

            {/* Anillo o Indicador de Selección sutil */}
            {isSelected && (
              <mesh position={[0, -el.height / 2 + 1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[Math.max(el.width, depth) / 2 + 3, Math.max(el.width, depth) / 2 + 6, 32]} />
                <meshBasicMaterial color="#0284c7" side={2} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
