import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useCltHouseStore, CltWallSegment, GltBeamItem, CltOpening, CLT_SPECS_CATALOG } from '../../store/cltHouseStore';
import {
  getPineWoodTexture,
  getCltEdgeTexture,
  getGalvanizedSteelTexture,
  getConcreteFoundationTexture,
  getEifsStuccoTexture,
} from '../../utils/cltTextures';

export function CltHouse3D() {
  const {
    widthM,
    lengthM,
    numStories,
    storyHeightM,
    slabThicknessMm,
    roofPitchDeg,
    overhangLengthCm,
    wallCltType,
    slabCltType,
    roofCltType,
    walls,
    beams,
    openings,
    renderStyle,
    currentAssemblyStep,
    showRoof,
    showUpperFloors,
    activeStoryLevel,
    showDimensions3D,
    showPiersLabels,
    thermalConfig,
  } = useCltHouseStore();

  // Texturas
  const woodTexture = useMemo(() => getPineWoodTexture(), []);
  const edgeTexture = useMemo(() => getCltEdgeTexture(), []);
  const steelTexture = useMemo(() => getGalvanizedSteelTexture(), []);
  const concreteTexture = useMemo(() => getConcreteFoundationTexture(), []);
  const eifsTexture = useMemo(() => getEifsStuccoTexture(), []);

  // Materiales según estilo de visualización
  const wallMaterial = useMemo(() => {
    if (renderStyle === 'structural_xray') {
      return new THREE.MeshStandardMaterial({
        color: '#D4A373',
        roughness: 0.6,
        transparent: true,
        opacity: 0.75,
        wireframe: false,
      });
    }
    if (renderStyle === 'connectors') {
      return new THREE.MeshStandardMaterial({
        color: '#E5D0BA',
        roughness: 0.8,
        transparent: true,
        opacity: 0.35,
      });
    }
    // Architectural
    return new THREE.MeshStandardMaterial({
      map: thermalConfig.claddingSystem.startsWith('weber') ? eifsTexture : woodTexture,
      roughness: 0.7,
      metalness: 0.05,
    });
  }, [renderStyle, thermalConfig.claddingSystem, woodTexture, eifsTexture]);

  const woodInteriorMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.5,
      metalness: 0.02,
    });
  }, [woodTexture]);

  const cltEdgeMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: edgeTexture,
      roughness: 0.8,
      metalness: 0.05,
    });
  }, [edgeTexture]);

  const gltBeamMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: woodTexture,
      color: '#D69E68',
      roughness: 0.4,
      metalness: 0.05,
    });
  }, [woodTexture]);

  const steelHardwareMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: steelTexture,
      color: renderStyle === 'connectors' ? '#F97316' : '#94A3B8',
      roughness: 0.3,
      metalness: 0.8,
    });
  }, [renderStyle, steelTexture]);

  const slabMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.6,
      color: '#F0D5BA',
    });
  }, [woodTexture]);

  const foundationMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: concreteTexture,
      roughness: 0.9,
      color: '#9E9E9E',
    });
  }, [concreteTexture]);

  const slabThicknessM = slabThicknessMm / 1000;
  const wallSpec = CLT_SPECS_CATALOG[wallCltType];
  const wallThicknessM = wallSpec.totalThicknessMm / 1000;

  // Filtrado según secuencia de montaje (si está activo el modo assembly_sequence)
  // Step 0: Radier y ejes
  // Step 1: Muros 1er nivel
  // Step 2: Losa entrepiso 1
  // Step 3: Muros 2do nivel
  // Step 4: Losa/Muros pisos superiores
  // Step 5: Techumbre CLT
  // Step 6: Conectores y Sellos completos
  const isStepActive = (requiredStep: number) => {
    if (renderStyle !== 'assembly_sequence') return true;
    return currentAssemblyStep >= requiredStep;
  };

  return (
    <group position={[-widthM / 2, 0, -lengthM / 2]}>
      {/* 1. RADIER / FUNDACIÓN DE HORMIGÓN ARMADO */}
      <mesh position={[widthM / 2, -0.15, lengthM / 2]} receiveShadow castShadow>
        <boxGeometry args={[widthM + 0.4, 0.3, lengthM + 0.4]} />
        <primitive object={foundationMaterial} attach="material" />
      </mesh>

      {/* Solera de Nivelación Perimetral tratada MCA NCh819 */}
      <mesh position={[widthM / 2, 0.025, lengthM / 2]}>
        <boxGeometry args={[widthM + 0.04, 0.05, lengthM + 0.04]} />
        <meshStandardMaterial color="#A3704C" roughness={0.7} />
      </mesh>

      {/* 2. MUROS CLT POR PISO */}
      {walls.map((wall) => {
        // Filtrar piso activo si se solicita ocultar pisos superiores
        if (!showUpperFloors && wall.storyLevel > activeStoryLevel) return null;
        
        // Filtro por paso de montaje
        if (wall.storyLevel === 1 && !isStepActive(1)) return null;
        if (wall.storyLevel === 2 && !isStepActive(3)) return null;
        if (wall.storyLevel >= 3 && !isStepActive(4)) return null;

        const floorElevation = (wall.storyLevel - 1) * (storyHeightM + slabThicknessM);
        const wallCenterY = floorElevation + wall.heightM / 2;

        const dx = wall.endX - wall.startX;
        const dy = wall.endY - wall.startY;
        const wallLength = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        const centerX = (wall.startX + wall.endX) / 2;
        const centerZ = (wall.startY + wall.endY) / 2;

        // Vanos asociados a este muro y piso
        const wallOpenings = openings.filter(
          (op) => op.wallId === wall.id && op.storyLevel === wall.storyLevel
        );

        return (
          <group key={wall.id} position={[centerX, wallCenterY, centerZ]} rotation={[0, -angle, 0]}>
            {/* Panel de Muro CLT */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[wallLength, wall.heightM, wallThicknessM]} />
              <primitive object={wall.isInterior ? woodInteriorMaterial : wallMaterial} attach="material" />
            </mesh>

            {/* Canto del panel CLT visto arriba y abajo */}
            <mesh position={[0, wall.heightM / 2 - 0.001, 0]}>
              <boxGeometry args={[wallLength, 0.002, wallThicknessM]} />
              <primitive object={cltEdgeMaterial} attach="material" />
            </mesh>

            {/* Simulación visual de vanos de puertas y ventanas */}
            {wallOpenings.map((op) => {
              const opW = op.widthCm / 100;
              const opH = op.heightCm / 100;
              const sillH = op.sillHeightCm / 100;
              const opX = -wallLength / 2 + op.offsetFromStartCm / 100 + opW / 2;
              const opY = -wall.heightM / 2 + sillH + opH / 2;

              return (
                <group key={op.id} position={[opX, opY, 0]}>
                  {/* Marco del vano */}
                  <mesh>
                    <boxGeometry args={[opW, opH, wallThicknessM + 0.04]} />
                    <meshStandardMaterial
                      color={op.frameMaterial === 'pvc_antracita' ? '#262626' : op.frameMaterial === 'aluminio_rtt' ? '#4A4A4A' : '#C28B53'}
                      roughness={0.4}
                    />
                  </mesh>

                  {/* Vidrio / Acristalamiento DVP */}
                  <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[opW - 0.1, opH - 0.1, 0.02]} />
                    <meshPhysicalMaterial
                      color="#93C5FD"
                      transparent
                      opacity={0.35}
                      roughness={0.1}
                      transmission={0.9}
                      thickness={0.05}
                    />
                  </mesh>

                  {/* Dintel / Refuerzo si es abertura recortada o segmentada */}
                  <mesh position={[0, opH / 2 + 0.06, 0]}>
                    <boxGeometry args={[opW + 0.15, 0.12, wallThicknessM + 0.01]} />
                    <meshStandardMaterial color="#B07D4F" roughness={0.7} />
                  </mesh>
                </group>
              );
            })}

            {/* Conectores Estructurales 3D (Hold-downs y Ángulos de corte) */}
            {(renderStyle === 'connectors' || renderStyle === 'structural_xray' || (renderStyle === 'assembly_sequence' && currentAssemblyStep >= 6)) && (
              <group position={[0, -wall.heightM / 2, 0]}>
                {/* Hold-down Esquina Izquierda */}
                <group position={[-wallLength / 2 + 0.15, 0.18, wallThicknessM / 2 + 0.01]}>
                  <mesh castShadow>
                    <boxGeometry args={[0.08, 0.35, 0.015]} />
                    <primitive object={steelHardwareMaterial} attach="material" />
                  </mesh>
                  {/* Perno / Arandela */}
                  <mesh position={[0, -0.12, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.016, 0.016, 0.02, 12]} />
                    <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
                  </mesh>
                </group>

                {/* Hold-down Esquina Derecha */}
                <group position={[wallLength / 2 - 0.15, 0.18, wallThicknessM / 2 + 0.01]}>
                  <mesh castShadow>
                    <boxGeometry args={[0.08, 0.35, 0.015]} />
                    <primitive object={steelHardwareMaterial} attach="material" />
                  </mesh>
                  <mesh position={[0, -0.12, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.016, 0.016, 0.02, 12]} />
                    <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
                  </mesh>
                </group>

                {/* Ángulos de corte intermedios ABR255 / E20/3 */}
                {Array.from({ length: Math.max(1, wall.shearAngleCount) }).map((_, idx) => {
                  const xPos = -wallLength / 2 + (wallLength / (wall.shearAngleCount + 1)) * (idx + 1);
                  return (
                    <group key={`angle_${idx}`} position={[xPos, 0.08, wallThicknessM / 2 + 0.01]}>
                      <mesh castShadow>
                        <boxGeometry args={[0.09, 0.12, 0.01]} />
                        <primitive object={steelHardwareMaterial} attach="material" />
                      </mesh>
                    </group>
                  );
                })}
              </group>
            )}

            {/* Etiquetas de Muro / Pier Label */}
            {showPiersLabels && (
              <Html position={[0, 0.2, wallThicknessM / 2 + 0.05]} center distanceFactor={14}>
                <div className="bg-black/80 backdrop-blur-md px-2 py-0.5 rounded border border-orange-500/80 text-[10px] font-mono font-bold text-orange-400 whitespace-nowrap select-none shadow-lg pointer-events-none">
                  {wall.code} ({wall.cltType})
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* 3. LOSAS DE ENTREPISO CLT (Niveles superiores) */}
      {Array.from({ length: numStories - 1 }).map((_, idx) => {
        const floorIndex = idx + 1; // Piso 2, 3, etc.
        if (!showUpperFloors && floorIndex > activeStoryLevel) return null;
        if (!isStepActive(2 + idx * 2)) return null;

        const elevationY = floorIndex * storyHeightM + (floorIndex - 1) * slabThicknessM + slabThicknessM / 2;

        return (
          <group key={`slab_story_${floorIndex}`} position={[widthM / 2, elevationY, lengthM / 2]}>
            {/* Losa sólida de CLT */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[widthM, slabThicknessM, lengthM]} />
              <primitive object={slabMaterial} attach="material" />
            </mesh>

            {/* Canto de losa con capas cruzadas */}
            <mesh position={[0, 0, lengthM / 2 + 0.001]}>
              <boxGeometry args={[widthM, slabThicknessM, 0.002]} />
              <primitive object={cltEdgeMaterial} attach="material" />
            </mesh>
            <mesh position={[widthM / 2 + 0.001, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <boxGeometry args={[lengthM, slabThicknessM, 0.002]} />
              <primitive object={cltEdgeMaterial} attach="material" />
            </mesh>
          </group>
        );
      })}

      {/* 4. VIGAS Y COLUMNAS GLT (Madera Laminada Encolada MLE 24h) */}
      {beams.map((b) => {
        if (!showUpperFloors && b.storyLevel > activeStoryLevel) return null;
        if (!isStepActive(1)) return null;

        const bW = b.widthMm / 1000;
        const bH = b.heightMm / 1000;

        if (b.isColumn) {
          return (
            <group key={b.id} position={[b.startX, b.elevationZ + b.lengthM / 2, b.startY]}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[bW, b.lengthM, bH]} />
                <primitive object={gltBeamMaterial} attach="material" />
              </mesh>
              {/* Base metálica pilar */}
              <mesh position={[0, -b.lengthM / 2 + 0.04, 0]}>
                <boxGeometry args={[bW + 0.02, 0.08, bH + 0.02]} />
                <primitive object={steelHardwareMaterial} attach="material" />
              </mesh>
            </group>
          );
        }

        const dx = b.endX - b.startX;
        const dy = b.endY - b.startY;
        const beamLength = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const midX = (b.startX + b.endX) / 2;
        const midZ = (b.startY + b.endY) / 2;

        return (
          <group
            key={b.id}
            position={[midX, b.elevationZ + bH / 2, midZ]}
            rotation={[0, -angle, 0]}
          >
            <mesh castShadow receiveShadow>
              <boxGeometry args={[beamLength, bH, bW]} />
              <primitive object={gltBeamMaterial} attach="material" />
            </mesh>
            {/* Placas de anclaje de extremo Titan Plate */}
            <mesh position={[-beamLength / 2 + 0.05, 0, 0]}>
              <boxGeometry args={[0.02, bH * 0.8, bW + 0.01]} />
              <primitive object={steelHardwareMaterial} attach="material" />
            </mesh>
            <mesh position={[beamLength / 2 - 0.05, 0, 0]}>
              <boxGeometry args={[0.02, bH * 0.8, bW + 0.01]} />
              <primitive object={steelHardwareMaterial} attach="material" />
            </mesh>
          </group>
        );
      })}

      {/* 5. TECHUMBRE CLT CON PENDIENTE Y ALEROS */}
      {showRoof && isStepActive(5) && (
        <group
          position={[
            widthM / 2,
            numStories * (storyHeightM + slabThicknessM) + 0.15,
            lengthM / 2,
          ]}
        >
          {/* Pendiente a un agua o dos aguas según preset */}
          <group rotation={[(roofPitchDeg * Math.PI) / 180, 0, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry
                args={[
                  widthM + (overhangLengthCm * 2) / 100,
                  0.12, // 120mm CLT Techumbre
                  lengthM + (overhangLengthCm * 2) / 100,
                ]}
              />
              <meshStandardMaterial
                map={renderStyle === 'architectural' ? eifsTexture : woodTexture}
                color={renderStyle === 'architectural' ? '#1E293B' : '#E0B58D'}
                roughness={0.5}
              />
            </mesh>

            {/* Canto techumbre CLT */}
            <mesh position={[0, 0, (lengthM + (overhangLengthCm * 2) / 100) / 2 + 0.001]}>
              <boxGeometry args={[widthM + (overhangLengthCm * 2) / 100, 0.12, 0.002]} />
              <primitive object={cltEdgeMaterial} attach="material" />
            </mesh>
          </group>
        </group>
      )}

      {/* 6. COTAS 3D Y DIMENSIONES */}
      {showDimensions3D && (
        <group>
          {/* Cota Ancho Frontal */}
          <group position={[widthM / 2, 0.1, -0.4]}>
            <Html center distanceFactor={15}>
              <div className="bg-black/90 text-orange-400 font-mono text-[11px] font-bold px-2 py-0.5 rounded border border-orange-500/50 shadow-md whitespace-nowrap">
                ↔ Ancho: {widthM.toFixed(2)} m
              </div>
            </Html>
          </group>

          {/* Cota Largo Lateral */}
          <group position={[-0.4, 0.1, lengthM / 2]}>
            <Html center distanceFactor={15}>
              <div className="bg-black/90 text-orange-400 font-mono text-[11px] font-bold px-2 py-0.5 rounded border border-orange-500/50 shadow-md whitespace-nowrap">
                ↕ Largo: {lengthM.toFixed(2)} m
              </div>
            </Html>
          </group>

          {/* Cota Altura Total */}
          <group position={[-0.4, (numStories * storyHeightM) / 2, -0.4]}>
            <Html center distanceFactor={15}>
              <div className="bg-black/90 text-sky-400 font-mono text-[11px] font-bold px-2 py-0.5 rounded border border-sky-500/50 shadow-md whitespace-nowrap">
                ↕ Altura: {(numStories * storyHeightM + (numStories - 1) * slabThicknessM).toFixed(2)} m ({numStories} Pisos)
              </div>
            </Html>
          </group>
        </group>
      )}
    </group>
  );
}
