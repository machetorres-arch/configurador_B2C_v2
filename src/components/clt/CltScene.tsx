import React, { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Center, ContactShadows } from '@react-three/drei';
import { CltHouse3D } from './CltHouse3D';
import { useCltHouseStore } from '../../store/cltHouseStore';

export function CltScene() {
  const { widthM, lengthM, renderStyle } = useCltHouseStore();
  const controlsRef = useRef<any>(null);

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  return (
    <div className="relative w-full h-full bg-[#0D0F12] select-none overflow-hidden">
      <Canvas
        camera={{ position: [widthM * 1.5, lengthM * 1.2, widthM * 1.6], fov: 45 }}
        shadows
        className="w-full h-full"
      >
        <color attach="background" args={[renderStyle === 'architectural' ? '#0F172A' : '#0B0D10']} />

        <ambientLight intensity={0.7} />
        <directionalLight
          position={[15, 25, 15]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0001}
        />
        <directionalLight position={[-15, 10, -10]} intensity={0.4} />

        <Suspense fallback={null}>
          <Center top>
            <CltHouse3D />
          </Center>

          {/* Sombra de contacto suave */}
          <ContactShadows
            position={[0, -0.01, 0]}
            opacity={0.65}
            scale={Math.max(widthM, lengthM) * 3}
            blur={1.8}
            far={10}
          />

          {/* Grilla técnica métrica */}
          <Grid
            position={[0, -0.02, 0]}
            args={[40, 40]}
            cellSize={1}
            cellThickness={0.8}
            cellColor="#334155"
            sectionSize={5}
            sectionThickness={1.5}
            sectionColor="#64748B"
            fadeDistance={35}
            fadeStrength={1.5}
          />
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          makeDefault
          minDistance={2}
          maxDistance={80}
          maxPolarAngle={Math.PI / 2 + 0.05} // Permitir ver desde ras de suelo
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>

      {/* Controles flotantes en el viewport 3D */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs text-slate-300 shadow-xl">
        <span className="font-semibold text-orange-400">Rotar:</span> Clic Izq
        <span className="text-slate-600">|</span>
        <span className="font-semibold text-orange-400">Pan:</span> Clic Der
        <span className="text-slate-600">|</span>
        <span className="font-semibold text-orange-400">Zoom:</span> Scroll
      </div>
    </div>
  );
}
