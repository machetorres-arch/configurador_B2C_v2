const fs = require('fs');
const file = 'src/components/Closet.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace doorProps with drawerFrontProps for drawers
code = code.replace(
  "{...doorProps} /* drawer-front */",
  "{...drawerFrontProps}"
);

// Replace structureProps with shelfProps for maletero
code = code.replace(
  /parts\.push\(<Board key={\`shelf-top-\${mod\.id}\`} position={\[modCenterX, maleteroY, shelfZ\]} args={\[innerW, thickness, shelfDepth\]} \{\.\.\.structureProps\} \/>\);/g,
  "parts.push(<Board key={`shelf-top-${mod.id}`} position={[modCenterX, maleteroY, shelfZ]} args={[innerW, thickness, shelfDepth]} {...shelfProps} />);"
);

// Replace structureProps with shelfProps for bottom shelf
code = code.replace(
  /parts\.push\(<Board key={\`shelf-bottom-\${mod\.id}\`} position={\[modCenterX, bottomShelfY, shelfZ\]} args={\[innerW, thickness, shelfDepth\]} \{\.\.\.structureProps\} \/>\);/g,
  "parts.push(<Board key={`shelf-bottom-${mod.id}`} position={[modCenterX, bottomShelfY, shelfZ]} args={[innerW, thickness, shelfDepth]} {...shelfProps} />);"
);

// Replace structureProps with shelfProps for intermediate shelves
code = code.replace(
  /<Board key={\`shelf-\${mod\.id}-\${i}\`} position={\[innerCenterX, shelfY, shelfZ\]} args={\[innerW, thickness, shelfDepth\]} \{\.\.\.structureProps\} \/>/g,
  "<Board key={`shelf-${mod.id}-${i}`} position={[innerCenterX, shelfY, shelfZ]} args={[innerW, thickness, shelfDepth]} {...shelfProps} />"
);

// Replace inner drawer materials
code = code.replace(
  /<Board key={\`drawer-L-\${mod\.id}-\${d}\`}.*?\{\.\.\.structureProps\} \/>/g,
  (match) => match.replace("{...structureProps}", "{...drawerInnerProps}")
);
code = code.replace(
  /<Board key={\`drawer-R-\${mod\.id}-\${d}\`}.*?\{\.\.\.structureProps\} \/>/g,
  (match) => match.replace("{...structureProps}", "{...drawerInnerProps}")
);
code = code.replace(
  /<Board key={\`drawer-B-\${mod\.id}-\${d}\`}.*?\{\.\.\.structureProps\} \/>/g,
  (match) => match.replace("{...structureProps}", "{...drawerInnerProps}")
);
code = code.replace(
  /<Board key={\`drawer-F-\${mod\.id}-\${d}\`}.*?\{\.\.\.structureProps\} \/>/g,
  (match) => match.replace("{...structureProps}", "{...drawerInnerProps}")
);

fs.writeFileSync(file, code);
