const fs = require('fs');
const file = 'src/components/Board.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "<meshStandardMaterial",
  "<meshStandardMaterial key={texture ? texture.uuid : 'no-tex'}"
);

fs.writeFileSync(file, code);
