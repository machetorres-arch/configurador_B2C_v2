const fs = require('fs');
const file = 'src/components/Board.tsx';
let code = fs.readFileSync(file, 'utf8');

// I will just rewrite the component body entirely
code = code.replace(
  `export function Board({ position, args, color, textureUrl, materialType, transparent, opacity }: BoardProps) {`,
  `export function Board({ position, args, color, textureUrl, materialType, transparent, opacity }: BoardProps) {
  const storeColor = useStore((state) => state.structureColor);
  const isTransparentGlobal = useStore((state) => state.isTransparent);
  const finalColor = color || storeColor;
  const isTransp = transparent || isTransparentGlobal;
  const currentOpacity = isTransparentGlobal ? 0.3 : (opacity !== undefined ? opacity : 1);

  let texture = null;
  try {
    if (textureUrl) {
      texture = useTexture(textureUrl);
      if (texture) {
        texture.wrapS = THREE.MirroredRepeatWrapping;
        texture.wrapT = THREE.MirroredRepeatWrapping;
        
        if (materialType === 'melamina') {
          texture.repeat.set(args[0] / 100, args[2] / 100); 
        } else if (materialType === 'hpl') {
          texture.repeat.set(args[0] / 200, args[2] / 200);
          if (args[0] > args[2]) {
            texture.rotation = Math.PI / 2;
          } else {
            texture.rotation = 0;
          }
        }
        texture.needsUpdate = true;
      }
    }
  } catch(e) {
    console.warn("Texture not loaded yet:", textureUrl);
  }
`
);

// Remove the old assignments that were left behind
code = code.replace(
  `  const storeColor = useStore((state) => state.structureColor);
  const isTransparentGlobal = useStore((state) => state.isTransparent);
  const finalColor = color || storeColor;
  const isTransp = transparent || isTransparentGlobal;
  const currentOpacity = isTransparentGlobal ? 0.3 : (opacity !== undefined ? opacity : 1);`,
  ``
);

fs.writeFileSync(file, code);
