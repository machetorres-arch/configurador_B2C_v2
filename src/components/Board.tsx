import { useRef, useState, useEffect } from 'react';
import { useStore } from '../store';
import { DoubleSide } from 'three';
import { Edges, useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface BoardProps {
  textureUrl?: string;
  materialType?: 'melamina' | 'hpl';
  position: [number, number, number];
  args: [number, number, number];
  color?: string;
  transparent?: boolean;
  opacity?: number;
}

export function Board({ position, args, color, textureUrl, materialType, transparent, opacity }: BoardProps) {


  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (textureUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(textureUrl, (tex) => {
        tex.wrapS = THREE.MirroredRepeatWrapping;
        tex.wrapT = THREE.MirroredRepeatWrapping;
        
        if (materialType === 'melamina') {
          tex.repeat.set(args[0] / 100, args[2] / 100); 
        } else if (materialType === 'hpl') {
          tex.repeat.set(args[0] / 200, args[2] / 200);
          if (args[0] > args[2]) {
            tex.rotation = Math.PI / 2;
          } else {
            tex.rotation = 0;
          }
        }
        tex.needsUpdate = true;
        setTexture(tex);
      });
    } else {
      setTexture(null);
    }
  }, [textureUrl, materialType, args[0], args[2]]);

  const storeColor = useStore((state) => state.structureColor);
  const isTransparentGlobal = useStore((state) => state.isTransparent);
  const finalColor = color || storeColor;

  const isTransp = transparent || isTransparentGlobal;
  const currentOpacity = isTransparentGlobal ? 0.3 : (opacity !== undefined ? opacity : 1);

  return (
    <mesh position={position} castShadow={!isTransp} receiveShadow={!isTransp}>
      <boxGeometry args={args} />
      <meshStandardMaterial 
        color={texture ? '#ffffff' : finalColor} 
        map={texture}
        side={DoubleSide}
        transparent={isTransp}
        opacity={currentOpacity}
        roughness={0.8}
        depthWrite={!isTransp}
      />
      {isTransparentGlobal && <Edges scale={1} threshold={15} color="#555555" />}
    </mesh>
  );
}
