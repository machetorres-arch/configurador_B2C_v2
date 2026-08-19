const fs = require('fs');
const file = 'src/components/Closet.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "return { color: '#ffffff', textureUrl: c.startsWith('http') ? c : `/textures/${c}`, materialType: mat };",
  "return { color: '#ffffff', textureUrl: (c.startsWith('http') || c.startsWith('data:')) ? c : `/textures/${c}`, materialType: mat };"
);

fs.writeFileSync(file, code);
