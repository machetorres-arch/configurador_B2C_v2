const fs = require('fs');
const file = 'src/components/Board.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  `import { useRef } from 'react';`,
  `import { useRef, useState, useEffect } from 'react';`
);

code = code.replace(
  `const [texture, setTexture] = require('react').useState<THREE.Texture | null>(null);`,
  `const [texture, setTexture] = useState<THREE.Texture | null>(null);`
);

code = code.replace(
  `require('react').useEffect(() => {`,
  `useEffect(() => {`
);

fs.writeFileSync(file, code);

const file2 = 'src/components/Closet.tsx';
let code2 = fs.readFileSync(file2, 'utf8');

code2 = code2.replace(/color=\{structureColor\}/g, `color={color}`);

fs.writeFileSync(file2, code2);
