const fs = require('fs');
let code = fs.readFileSync('src/utils/manufacturing.ts', 'utf-8');
code = code.replace(/data\.edgeThickness/g, 'data.edgeBandingThickness');
fs.writeFileSync('src/utils/manufacturing.ts', code);
