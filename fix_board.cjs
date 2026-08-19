const fs = require('fs');
const file = 'src/components/Board.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "tex.repeat.set(args[0] / 100, args[2] / 100);",
  "tex.repeat.set(args[0] / 100, args[1] / 100);"
);

code = code.replace(
  "tex.repeat.set(args[0] / 200, args[2] / 200);",
  "tex.repeat.set(args[0] / 200, args[1] / 200);"
);

code = code.replace(
  "[textureUrl, materialType, args[0], args[2]]",
  "[textureUrl, materialType, args[0], args[1]]"
);

fs.writeFileSync(file, code);
