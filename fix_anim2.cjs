const fs = require('fs');
const file = 'src/components/Closet.tsx';
let code = fs.readFileSync(file, 'utf8');

// I'll just find the function AnimatedDoor and replace it up to the curly brace.
const search = `function AnimatedDoor({ 
  position, 
  doorW, 
  doorHeight, 
  thickness, 
  
  color, textureUrl, materialType, isRightHinge 
}: {
  position: [number, number, number],
  doorW: number,
  doorHeight: number,
  thickness: number,
  color: string,
  textureUrl?: string,
  materialType?: 'melamina' | 'hpl',
  color, textureUrl, materialType, isRightHinge: boolean
}) {`;

const replace = `function AnimatedDoor({ 
  position, 
  doorW, 
  doorHeight, 
  thickness, 
  color, 
  textureUrl, 
  materialType, 
  isRightHinge 
}: {
  position: [number, number, number],
  doorW: number,
  doorHeight: number,
  thickness: number,
  color: string,
  textureUrl?: string,
  materialType?: 'melamina' | 'hpl',
  isRightHinge: boolean
}) {`;

// But wait, the sed command also corrupted other isRightHinge usages.
code = code.replace(/color, textureUrl, materialType, isRightHinge/g, 'isRightHinge');

// Then carefully replace the exact parts
code = code.replace(
  `  isRightHinge
}: {`,
  `  color, textureUrl, materialType, isRightHinge
}: {`
);

fs.writeFileSync(file, code);
