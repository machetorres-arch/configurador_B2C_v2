const fs = require('fs');
const file = 'src/components/Closet.tsx';
let code = fs.readFileSync(file, 'utf8');

// Insert a helper function near the top of the component
code = code.replace(
  `  const baseOffset = showSocle ? 10 : showLegs ? 10 : 0;`,
  `  const baseOffset = showSocle ? 10 : showLegs ? 10 : 0;

  const getTextureProps = (c: string, mat: 'melamina' | 'hpl') => {
    if (c.startsWith('#')) return { color: c };
    return { color: '#ffffff', textureUrl: \`/textures/\${c}\`, materialType: mat };
  };
  
  const structureProps = getTextureProps(color, state.structureMaterial);
  const doorProps = getTextureProps(doorColor, state.doorMaterial);
  const drawerFrontProps = getTextureProps(state.drawerFrontColor, state.drawerFrontMaterial);
  const drawerInnerProps = getTextureProps(state.drawerInnerColor, state.drawerInnerMaterial);
  const shelfProps = getTextureProps(state.shelfColor, state.shelfMaterial);
  const backProps = getTextureProps(backColor, state.structureMaterial); // Back wall uses structure material usually
`
);

// We need to replace all `<Board ... color={color} />` with `<Board ... {...structureProps} />`
// Wait, regex might be tricky. Let's do it with replaceAll but carefully.
code = code.replace(/color=\{color\}/g, `{...structureProps}`);
code = code.replace(/color=\{doorColor\}/g, `{...doorProps}`);
code = code.replace(/color=\{backColor\}/g, `{...backProps}`);
code = code.replace(/color=\{state\.shelfColor\}/g, `{...shelfProps}`);
code = code.replace(/color=\{state\.drawerFrontColor\}/g, `{...drawerFrontProps}`);
code = code.replace(/color=\{state\.drawerInnerColor\}/g, `{...drawerInnerProps}`);

fs.writeFileSync(file, code);
