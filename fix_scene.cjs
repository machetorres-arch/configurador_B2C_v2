const fs = require('fs');
let content = fs.readFileSync('src/components/Scene.tsx', 'utf8');

const replacement = `        {/* Room Back Wall */}
        <mesh position={[0, 400, -depth / 2 - 1]} receiveShadow>
          <planeGeometry args={[2000, 1000]} />
          <meshStandardMaterial color="#404040" roughness={0.9} />
        </mesh>
      </group>
      <OrbitControls 
        makeDefault 
        minPolarAngle={0} 
        maxPolarAngle={Math.PI / 2 - 0.05} 
        minAzimuthAngle={-Math.PI / 2 + 0.1}
        maxAzimuthAngle={Math.PI / 2 - 0.1}
      />
    </>
  );
}`;

content = content.replace(/<\/group>\s*<OrbitControls.*?\/>\s*<\/>\s*\);\s*\}/s, replacement);
fs.writeFileSync('src/components/Scene.tsx', content);
