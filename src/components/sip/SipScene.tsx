import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, ContactShadows, Sky, PerspectiveCamera } from '@react-three/drei';
import { SipHouse3D } from './SipHouse3D';
import { useSipHouseStore } from '../../store/sipHouseStore';

export function SipScene() {
  const { explodedProgress, isDraggingOpening } = useSipHouseStore();

  return (
    <div className="w-full h-full relative bg-slate-900 overflow-hidden select-none">
      <Canvas shadows gl={{ antialias: true, alpha: false }}>
        <PerspectiveCamera makeDefault position={[18, 12, 18]} fov={45} />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={4}
          maxDistance={60}
          maxPolarAngle={Math.PI / 2 - 0.02}
          target={[0, 2, 0]}
          enabled={!isDraggingOpening}
        />

        <ambientLight intensity={0.65} />
        <directionalLight
          position={[25, 35, 20]}
          intensity={1.4}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={80}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
          shadow-bias={-0.0001}
        />
        <directionalLight position={[-20, 15, -15]} intensity={0.4} />
        <hemisphereLight args={['#e0f2fe', '#334155', 0.5]} />

        <Sky
          distance={450000}
          sunPosition={[25, 35, 20]}
          inclination={0.6}
          azimuth={0.25}
          turbidity={6}
          rayleigh={0.8}
        />

        <Suspense fallback={null}>
          <SipHouse3D />
        </Suspense>

        <ContactShadows
          position={[0, -0.65, 0]}
          opacity={0.7}
          scale={50}
          blur={1.8}
          far={10}
          resolution={1024}
          color="#000000"
        />

        <Grid
          position={[0, -0.66, 0]}
          args={[60, 60]}
          cellSize={1}
          cellThickness={0.8}
          cellColor="#475569"
          sectionSize={5}
          sectionThickness={1.5}
          sectionColor="#0284c7"
          fadeDistance={45}
          fadeStrength={1.2}
        />
      </Canvas>

      {explodedProgress > 0 && (
        <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md border border-sky-500/30 rounded-xl px-4 py-2.5 shadow-xl flex items-center gap-3 pointer-events-none">
          <div className="w-3 h-3 rounded-full bg-sky-500 animate-pulse" />
          <div>
            <div className="text-xs font-bold text-white uppercase tracking-wider">
              Modo Montaje / Despiece Activo
            </div>
            <div className="text-[11px] text-slate-400">
              Desplazamiento estructural: {Math.round(explodedProgress * 100)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
