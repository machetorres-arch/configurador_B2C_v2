const fs = require('fs');
const file = 'src/components/Closet.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /(<Board[^>]+key={`drawer-front-\${mod\.id}-\${d}`}[^>]+)\{\.\.\.doorProps\}/g;
code = code.replace(regex, "$1{...drawerFrontProps}");

fs.writeFileSync(file, code);
