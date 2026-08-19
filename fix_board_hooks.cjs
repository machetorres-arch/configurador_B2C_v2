const fs = require('fs');
const file = 'src/components/Board.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  `  let texture = null;
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
  }`,
  `  const [texture, setTexture] = require('react').useState<THREE.Texture | null>(null);

  require('react').useEffect(() => {
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
  }, [textureUrl, materialType, args[0], args[2]]);`
);

fs.writeFileSync(file, code);
