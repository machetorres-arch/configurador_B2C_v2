const fs = require('fs');
const file = 'src/components/Board.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  `import { Edges } from '@react-three/drei';`,
  `import { Edges, useTexture } from '@react-three/drei';\nimport * as THREE from 'three';`
);

code = code.replace(
  `interface BoardProps {`,
  `interface BoardProps {\n  textureUrl?: string;\n  materialType?: 'melamina' | 'hpl';`
);

code = code.replace(
  `export function Board({ position, args, color, transparent, opacity }: BoardProps) {`,
  `export function Board({ position, args, color, textureUrl, materialType, transparent, opacity }: BoardProps) {`
);

// Add texture loader logic inside the component
const textureLogic = `
  const isTransparentGlobal = useStore((state) => state.isTransparent);
  const finalColor = color || storeColor;
  const isTransp = transparent || isTransparentGlobal;
  const currentOpacity = isTransparentGlobal ? 0.3 : (opacity !== undefined ? opacity : 1);

  // If a texture is provided, load it
  const texture = textureUrl ? useTexture(textureUrl) : null;
  if (texture) {
    texture.wrapS = THREE.MirroredRepeatWrapping;
    texture.wrapT = THREE.MirroredRepeatWrapping;
    
    if (materialType === 'melamina') {
      // Anti-mosaic logic for Melamina: mirror repeat and scale
      texture.repeat.set(args[0] / 100, args[2] / 100); 
    } else if (materialType === 'hpl') {
      // Continuous grain logic for HPL: adjust rotation or scale based on board dimensions
      texture.repeat.set(args[0] / 200, args[2] / 200);
      if (args[0] > args[2]) {
        texture.rotation = Math.PI / 2;
      } else {
        texture.rotation = 0;
      }
    }
    // Update matrix after changing repeat/rotation
    texture.needsUpdate = true;
  }
`;

code = code.replace(
  `  const isTransparentGlobal = useStore((state) => state.isTransparent);
  const finalColor = color || storeColor;
  const isTransp = transparent || isTransparentGlobal;
  const currentOpacity = isTransparentGlobal ? 0.3 : (opacity !== undefined ? opacity : 1);`,
  textureLogic
);

code = code.replace(
  `<meshStandardMaterial 
        color={finalColor} 
        side={DoubleSide}
        transparent={isTransp}
        opacity={currentOpacity}
        roughness={0.8}
        depthWrite={!isTransp}
      />`,
  `<meshStandardMaterial 
        color={texture ? '#ffffff' : finalColor} 
        map={texture}
        side={DoubleSide}
        transparent={isTransp}
        opacity={currentOpacity}
        roughness={0.8}
        depthWrite={!isTransp}
      />`
);

fs.writeFileSync(file, code);
