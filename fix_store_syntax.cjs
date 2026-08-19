const fs = require('fs');
let code = fs.readFileSync('src/store.ts', 'utf-8');
code = code.replace(/\\\`/g, '`');
code = code.replace(/\\\$/g, '$');
fs.writeFileSync('src/store.ts', code);
