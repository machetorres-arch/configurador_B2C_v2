const fs = require('fs');
const file = 'src/components/Closet.tsx';
let code = fs.readFileSync(file, 'utf8');

// The line in AnimatedDoor currently says:
// <Board position={[-hingeXOffset, 0, 0]} args={[doorW, doorHeight, thickness]} {...structureProps} />
// we need to change it to:
// <Board position={[-hingeXOffset, 0, 0]} args={[doorW, doorHeight, thickness]} color={color} textureUrl={textureUrl} materialType={materialType} />

code = code.replace(
  `<Board position={[-hingeXOffset, 0, 0]} args={[doorW, doorHeight, thickness]} {...structureProps} />`,
  `<Board position={[-hingeXOffset, 0, 0]} args={[doorW, doorHeight, thickness]} color={color} textureUrl={textureUrl} materialType={materialType} />`
);

fs.writeFileSync(file, code);
