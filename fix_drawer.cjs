const fs = require('fs');
const file = 'src/components/Closet.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "args={[frontWidth, frontHeight, thickness]}\n             {...doorProps}\n           />",
  "args={[frontWidth, frontHeight, thickness]}\n             {...drawerFrontProps}\n           />"
);

fs.writeFileSync(file, code);
