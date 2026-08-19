const fs = require('fs');
const file = 'src/components/Board.tsx';
let code = fs.readFileSync(file, 'utf8');

const logic = `
        const img = tex.image;
        const imgAspect = img ? (img.height / img.width) : 1;
        
        // Define how many cm the width of the image represents in real life
        const textureRealWidthCm = materialType === 'hpl' ? 120 : 100;
        const textureRealHeightCm = textureRealWidthCm * imgAspect;
        
        tex.repeat.set(args[0] / textureRealWidthCm, args[1] / textureRealHeightCm);
`;

code = code.replace(
  /if \(materialType === 'melamina'\) \{[\s\S]*?\} else if \(materialType === 'hpl'\) \{[\s\S]*?\}/,
  logic
);

fs.writeFileSync(file, code);
