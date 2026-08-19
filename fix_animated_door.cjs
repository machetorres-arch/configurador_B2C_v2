const fs = require('fs');
const file = 'src/components/Closet.tsx';
let code = fs.readFileSync(file, 'utf8');

// Update AnimatedDoor interface
code = code.replace(
  `  color: string,
  isRightHinge: boolean
}) {`,
  `  color: string,
  textureUrl?: string,
  materialType?: 'melamina' | 'hpl',
  isRightHinge: boolean
}) {`
);

// Destructure the new props
code = code.replace(
  `  isRightHinge
}: {`,
  `  color,
  textureUrl,
  materialType,
  isRightHinge
}: {`
);

// Fix the Hanger which also had issues:
code = code.replace(
  `function Hanger({ position, innerW, color }: { position: [number, number, number], innerW: number, color: string }) {`,
  `function Hanger({ position, innerW, color, textureUrl, materialType }: { position: [number, number, number], innerW: number, color: string, textureUrl?: string, materialType?: 'melamina' | 'hpl' }) {`
);

code = code.replace(
  `<meshStandardMaterial color={color} roughness={1.0} />`,
  `<meshStandardMaterial color={color} roughness={1.0} />` // Wait, Hanger has no texture in meshStandardMaterial originally, it was just color. I reverted it earlier.
);

// Now update where AnimatedDoor is called:
code = code.replace(/<AnimatedDoor\s*\n\s*key=\{`door-L-\$\{mod\.id\}`\}\s*\n\s*position=\{\[-doorW \/ 2, yPos, frontZPos\]\}\s*\n\s*doorW=\{doorW\}\s*\n\s*doorHeight=\{doorHeight\}\s*\n\s*thickness=\{thickness\}\s*\n\s*\{...doorProps\}\s*\n\s*isRightHinge=\{false\}\s*\n\s*\/>/g, `<AnimatedDoor key={\`door-L-\${mod.id}\`} position={[-doorW / 2, yPos, frontZPos]} doorW={doorW} doorHeight={doorHeight} thickness={thickness} {...doorProps} isRightHinge={false} />`);
// I should just replace {...doorProps} inside AnimatedDoor, wait, I already replaced color={doorColor} with {...doorProps} in Closet.tsx. Let's see what is there right now.

fs.writeFileSync(file, code);
