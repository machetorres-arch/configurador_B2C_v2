const fs = require('fs');

// 1. App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf-8');
app = app.replace(/loadConfig/g, 'loadDesign');
app = app.replace(/state\.color/g, 'state.structureColor');
fs.writeFileSync('src/App.tsx', app);

// 2. Blueprint.tsx
let blueprint = fs.readFileSync('src/components/Blueprint.tsx', 'utf-8');
blueprint = blueprint.replace(/state\.color/g, 'state.structureColor');
fs.writeFileSync('src/components/Blueprint.tsx', blueprint);

// 3. Board.tsx
let board = fs.readFileSync('src/components/Board.tsx', 'utf-8');
board = board.replace(/state\.color/g, 'state.structureColor');
fs.writeFileSync('src/components/Board.tsx', board);

// 4. Closet.tsx
let closet = fs.readFileSync('src/components/Closet.tsx', 'utf-8');
closet = closet.replace(/state\.color/g, 'state.structureColor');
fs.writeFileSync('src/components/Closet.tsx', closet);

// 5. Configurator.tsx
let conf = fs.readFileSync('src/components/Configurator.tsx', 'utf-8');
conf = conf.replace(/state\.color/g, 'state.structureColor');
conf = conf.replace(/state\.setColor/g, 'state.setStructureColor');
fs.writeFileSync('src/components/Configurator.tsx', conf);

// 6. manufacturing.ts (ManufacturingData interface)
let manu = fs.readFileSync('src/utils/manufacturing.ts', 'utf-8');
manu = manu.replace(/color: string;/g, ''); // just remove color: string from ManufacturingData
fs.writeFileSync('src/utils/manufacturing.ts', manu);

