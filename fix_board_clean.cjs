const fs = require('fs');
const file = 'src/components/Board.tsx';
let code = fs.readFileSync(file, 'utf8');

const correctCode = `import { useRef, useState, useEffect } from 'react';
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
      loader.setCrossOrigin('anonymous');
      loader.load(textureUrl, (tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        
        const img = tex.image;
        const imgAspect = img && img.width > 0 ? (img.height / img.width) : 1;
        
        // Define physical size represented by the texture width (e.g. 120cm)
        const realWidthCm = 120;
        const realHeightCm = realWidthCm * imgAspect;
        
        // args[0] = width, args[1] = height, args[2] = depth
        // Decide which faces to map based on proportions (Front face is usually X and Y)
        let mapWidth = args[0];
        let mapHeight = args[1];
        
        // If it's a shelf (depth is greater than height), map X and Z
        if (args[2] > args[1] && args[0] > args[1]) {
           mapWidth = args[0];
           mapHeight = args[2];
        }
        
        // If it's a side wall (depth is greater than width), map Z and Y
        if (args[2] > args[0] && args[1] > args[0]) {
           mapWidth = args[2];
           mapHeight = args[1];
        }

        tex.repeat.set(mapWidth / realWidthCm, mapHeight / realHeightCm);
        
        if (materialType === 'hpl' && mapWidth > mapHeight) {
           tex.rotation = Math.PI / 2;
        }

        tex.needsUpdate = true;
        setTexture(tex);
      });
    } else {
      setTexture(null);
    }
  }, [textureUrl, materialType, args[0], args[1], args[2]]);

  const storeColor = useStore((state) => state.structureColor);
  const isTransparentGlobal = useStore((state) => state.isTransparent);
  
  const finalColor = color || storeColor;
  const isTransp = transparent || isTransparentGlobal;
  const currentOpacity = isTransparentGlobal ? 0.3 : (opacity !== undefined ? opacity : 1);

  return (
    <mesh position={position} castShadow={!isTransp} receiveShadow={!isTransp}>
      <boxGeometry args={args} />
      <meshStandardMaterial 
        key={texture ? texture.uuid : 'no-tex'}
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
`;

fs.writeFileSync(file, correctCode);
