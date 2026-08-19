const fs = require('fs');
const file = 'src/components/Board.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "const loader = new THREE.TextureLoader();",
  "const loader = new THREE.TextureLoader();\n      loader.setCrossOrigin('anonymous');"
);

fs.writeFileSync(file, code);
