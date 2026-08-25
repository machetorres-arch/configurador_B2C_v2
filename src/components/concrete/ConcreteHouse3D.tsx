import React, { useMemo } from 'react';
import * as THREE from 'three';
import {
  useConcreteHouseStore,
  ConcreteWallTarget,
} from '../../store/concreteHouseStore';
import { ConcreteWall3D } from './ConcreteWall3D';
import { getConcreteTextures } from '../../utils/concreteTextures';

export function ConcreteHouse3D() {
  const {
    dimensions,
    wallThicknessMm,
    meshType,
    foundationType,
    slabType,
    renderMode,
    openings,
    interiorWalls,
    showRebarMesh,
    showEdgeReinforcement,
    showOpeningReinforcement,
    showSpacers,
    showRoof,
    showFoundation,
    showFormworkTieHoles,
    showPergola,
    pergolaWidthCm,
    pergolaLengthCm,
    pergolaHeightCm,
    showBarbecueCounter,
    hasCentralPatio,
    centralPatioOffsetCm,
    centralPatioLengthCm,
    selectedWall,
    setSelectedWall,
    setSelectedOpeningId,
  } = useConcreteHouseStore();

  const {
    width: widthCm,
    length: lengthCm,
    wallHeight: wallHeightCm,
    levels,
    overhangCm,
    roofRidgeHeightCm = 175,
    roofType = 'dos_aguas_hormigon',
  } = dimensions;
  const wallThicknessCm = wallThicknessMm / 10;

  // Filtrar vanos por muro
  const frontOpenings = useMemo(() => openings.filter((o) => o.wall === 'front'), [openings]);
  const backOpenings = useMemo(() => openings.filter((o) => o.wall === 'back'), [openings]);
  const leftOpenings = useMemo(() => openings.filter((o) => o.wall === 'left'), [openings]);
  const rightOpenings = useMemo(() => openings.filter((o) => o.wall === 'right'), [openings]);

  // Materiales de Fundación, Losa y Techo
  const concreteMat = useMemo(() => {
    if (renderMode === 'xray') {
      return new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        roughness: 0.3,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      });
    }
    if (renderMode === 'formwork') {
      return new THREE.MeshStandardMaterial({
        color: '#ca8a04',
        roughness: 0.5,
      });
    }

    const { slabTexture, slabBumpMap, slabRoughnessMap } = getConcreteTextures();
    const map = slabTexture.clone();
    const bump = slabBumpMap.clone();
    const rough = slabRoughnessMap.clone();

    const repX = Math.max(1, widthCm / 200);
    const repZ = Math.max(1, lengthCm / 200);
    map.repeat.set(repX, repZ);
    bump.repeat.set(repX, repZ);
    rough.repeat.set(repX, repZ);
    map.needsUpdate = true;
    bump.needsUpdate = true;
    rough.needsUpdate = true;

    return new THREE.MeshStandardMaterial({
      map,
      bumpMap: bump,
      bumpScale: 0.05,
      roughnessMap: rough,
      roughness: 0.85,
      metalness: 0.03,
      color: '#edf0f4',
    });
  }, [renderMode, widthCm, lengthCm]);

  const ceilingConcreteMat = useMemo(() => {
    if (renderMode === 'xray') {
      return new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        roughness: 0.3,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      });
    }
    if (renderMode === 'formwork') {
      return new THREE.MeshStandardMaterial({
        color: '#ca8a04',
        roughness: 0.5,
      });
    }

    const { ceilingTexture, wallBumpMap } = getConcreteTextures();
    const map = ceilingTexture.clone();
    const bump = wallBumpMap.clone();

    const repX = Math.max(1, widthCm / 240);
    const repZ = Math.max(1, lengthCm / 240);
    map.repeat.set(repX, repZ);
    bump.repeat.set(repX, repZ);
    map.needsUpdate = true;
    bump.needsUpdate = true;

    return new THREE.MeshStandardMaterial({
      map,
      bumpMap: bump,
      bumpScale: 0.04,
      roughness: 0.88,
      metalness: 0.02,
      color: '#f1f3f7',
    });
  }, [renderMode, widthCm, lengthCm]);

  const leanConcreteMat = useMemo(() => {
    const { leanConcreteTexture } = getConcreteTextures();
    return new THREE.MeshStandardMaterial({
      map: leanConcreteTexture,
      roughness: 0.95,
      metalness: 0.02,
      color: '#e4e7eb',
    });
  }, []);

  const steelStructureMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1e2024',
        roughness: 0.35,
        metalness: 0.7,
      }),
    []
  );

  const timberSlatMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#a07855', // Madera tratada / lapacho / pino impregnado
        roughness: 0.7,
        metalness: 0.05,
      }),
    []
  );

  const barbecueBrickMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#b45309', // Ladrillo refractario
        roughness: 0.85,
      }),
    []
  );

  const roofMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#27272a',
        roughness: 0.5,
      }),
    []
  );

  const rebarFoundationMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#3b82f6',
        metalness: 0.85,
        roughness: 0.3,
      }),
    []
  );

  // Geometría del hastial triangular (Gable) para dos aguas
  const gableGeometry = useMemo(() => {
    const halfW = widthCm / 2;
    const ridgeH = roofRidgeHeightCm;
    const shape = new THREE.Shape();
    shape.moveTo(-halfW, 0);
    shape.lineTo(halfW, 0);
    shape.lineTo(0, ridgeH);
    shape.closePath();

    const extrudeSettings = {
      depth: wallThicknessCm,
      bevelEnabled: false,
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [widthCm, roofRidgeHeightCm, wallThicknessCm]);

  // Cálculo de pendiente y dimensiones de la losa inclinada
  const { roofAngle, roofSlopeLength } = useMemo(() => {
    const halfW = widthCm / 2 + overhangCm;
    const ridgeH = roofRidgeHeightCm;
    const slopeLen = Math.sqrt(halfW * halfW + ridgeH * ridgeH);
    const angle = Math.atan2(ridgeH, halfW);
    return { roofAngle: angle, roofSlopeLength: slopeLen };
  }, [widthCm, overhangCm, roofRidgeHeightCm]);

  return (
    <group position={[0, 0, 0]}>
      {/* 1. FUNDACIONES */}
      {showFoundation && renderMode !== 'rebar_only' && (
        <group position={[0, 0, 0]}>
          {foundationType === 'losa_fundacion_suples' ? (
            <group>
              {/* Losa de Fundación e=15cm */}
              <mesh position={[0, -7.5, 0]} material={concreteMat} receiveShadow>
                <boxGeometry args={[widthCm, 15, lengthCm]} />
              </mesh>

              {/* Viga de borde perimetral */}
              <mesh position={[0, -20, 0]} material={concreteMat}>
                <boxGeometry args={[widthCm + 20, 15, lengthCm + 20]} />
              </mesh>

              {/* Emplantillado e=5cm */}
              <mesh position={[0, -30, 0]} material={leanConcreteMat} receiveShadow>
                <boxGeometry args={[widthCm + 40, 5, lengthCm + 40]} />
              </mesh>

              {/* Losa de Terraza para Pérgola si está activa */}
              {showPergola && (
                <mesh
                  position={[widthCm / 2 + pergolaWidthCm / 2, -5, -lengthCm / 2 + pergolaLengthCm / 2 + 100]}
                  material={concreteMat}
                  receiveShadow
                >
                  <boxGeometry args={[pergolaWidthCm, 10, pergolaLengthCm + 40]} />
                </mesh>
              )}
            </group>
          ) : (
            <group>
              {/* Radier interior e=10cm */}
              <mesh position={[0, -5, 0]} material={concreteMat} receiveShadow>
                <boxGeometry args={[widthCm - wallThicknessCm * 2, 10, lengthCm - wallThicknessCm * 2]} />
              </mesh>

              {/* Cimiento corrido perimetral */}
              <mesh position={[0, -35, lengthCm / 2 - 20]} material={concreteMat}>
                <boxGeometry args={[widthCm, 60, 40]} />
              </mesh>
              <mesh position={[0, -35, -lengthCm / 2 + 20]} material={concreteMat}>
                <boxGeometry args={[widthCm, 60, 40]} />
              </mesh>
              <mesh position={[-widthCm / 2 + 20, -35, 0]} material={concreteMat}>
                <boxGeometry args={[40, 60, lengthCm - 80]} />
              </mesh>
              <mesh position={[widthCm / 2 - 20, -35, 0]} material={concreteMat}>
                <boxGeometry args={[40, 60, lengthCm - 80]} />
              </mesh>

              {/* Emplantillado 5cm */}
              <mesh position={[0, -67.5, 0]} material={leanConcreteMat} receiveShadow>
                <boxGeometry args={[widthCm + 20, 5, lengthCm + 20]} />
              </mesh>
            </group>
          )}
        </group>
      )}

      {/* Armadura 3D en Fundación en modo Rayos X */}
      {(renderMode === 'xray' || renderMode === 'rebar_only') && showFoundation && (
        <group position={[0, -10, 0]}>
          {Array.from({ length: Math.floor(widthCm / 25) }).map((_, i) => (
            <mesh key={`rebar-found-x-${i}`} position={[-widthCm / 2 + (i + 1) * 25, 0, 0]} material={rebarFoundationMat}>
              <boxGeometry args={[0.8, 0.8, lengthCm - 10]} />
            </mesh>
          ))}
          {Array.from({ length: Math.floor(lengthCm / 25) }).map((_, i) => (
            <mesh key={`rebar-found-z-${i}`} position={[0, 0.8, -lengthCm / 2 + (i + 1) * 25]} material={rebarFoundationMat}>
              <boxGeometry args={[widthCm - 10, 0.8, 0.8]} />
            </mesh>
          ))}
        </group>
      )}

      {/* 2. MUROS DE HORMIGÓN ARMADO (Nivel 1) */}
      <group position={[0, 0, 0]}>
        {/* Front Wall (Z = +length/2) */}
        <group position={[0, 0, lengthCm / 2 - wallThicknessCm / 2]}>
          <ConcreteWall3D
            wallTarget="front"
            wallLengthCm={widthCm}
            wallHeightCm={wallHeightCm}
            wallThicknessMm={wallThicknessMm}
            meshType={meshType}
            renderMode={renderMode}
            openings={frontOpenings}
            showRebarMesh={showRebarMesh}
            showEdgeReinforcement={showEdgeReinforcement}
            showOpeningReinforcement={showOpeningReinforcement}
            showSpacers={showSpacers}
            showFormworkTieHoles={showFormworkTieHoles}
            isSelected={selectedWall === 'front'}
            onSelectWall={() => setSelectedWall('front')}
            onSelectOpening={setSelectedOpeningId}
          />
          {/* Marquesina / Visera de acceso principal */}
          {renderMode !== 'rebar_only' && (
            <group position={[120 / 2 + 20 - widthCm / 2, 245, wallThicknessCm / 2 + 50]}>
              <mesh material={steelStructureMat}>
                <boxGeometry args={[180, 8, 100]} />
              </mesh>
              {/* Tensores metálicos */}
              <mesh position={[-80, 30, -40]} rotation={[0.6, 0, 0]} material={steelStructureMat}>
                <cylinderGeometry args={[0.6, 0.6, 70, 8]} />
              </mesh>
              <mesh position={[80, 30, -40]} rotation={[0.6, 0, 0]} material={steelStructureMat}>
                <cylinderGeometry args={[0.6, 0.6, 70, 8]} />
              </mesh>
            </group>
          )}
        </group>

        {/* Back Wall (Z = -length/2) */}
        <group position={[0, 0, -lengthCm / 2 + wallThicknessCm / 2]} rotation={[0, Math.PI, 0]}>
          <ConcreteWall3D
            wallTarget="back"
            wallLengthCm={widthCm}
            wallHeightCm={wallHeightCm}
            wallThicknessMm={wallThicknessMm}
            meshType={meshType}
            renderMode={renderMode}
            openings={backOpenings}
            showRebarMesh={showRebarMesh}
            showEdgeReinforcement={showEdgeReinforcement}
            showOpeningReinforcement={showOpeningReinforcement}
            showSpacers={showSpacers}
            showFormworkTieHoles={showFormworkTieHoles}
            isSelected={selectedWall === 'back'}
            onSelectWall={() => setSelectedWall('back')}
            onSelectOpening={setSelectedOpeningId}
          />
        </group>

        {/* Left Wall (X = -width/2) */}
        <group position={[-widthCm / 2 + wallThicknessCm / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <ConcreteWall3D
            wallTarget="left"
            wallLengthCm={lengthCm - wallThicknessCm * 2}
            wallHeightCm={wallHeightCm}
            wallThicknessMm={wallThicknessMm}
            meshType={meshType}
            renderMode={renderMode}
            openings={leftOpenings}
            showRebarMesh={showRebarMesh}
            showEdgeReinforcement={showEdgeReinforcement}
            showOpeningReinforcement={showOpeningReinforcement}
            showSpacers={showSpacers}
            showFormworkTieHoles={showFormworkTieHoles}
            isSelected={selectedWall === 'left'}
            onSelectWall={() => setSelectedWall('left')}
            onSelectOpening={setSelectedOpeningId}
          />
        </group>

        {/* Right Wall (X = +width/2) */}
        <group position={[widthCm / 2 - wallThicknessCm / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <ConcreteWall3D
            wallTarget="right"
            wallLengthCm={lengthCm - wallThicknessCm * 2}
            wallHeightCm={wallHeightCm}
            wallThicknessMm={wallThicknessMm}
            meshType={meshType}
            renderMode={renderMode}
            openings={rightOpenings}
            showRebarMesh={showRebarMesh}
            showEdgeReinforcement={showEdgeReinforcement}
            showOpeningReinforcement={showOpeningReinforcement}
            showSpacers={showSpacers}
            showFormworkTieHoles={showFormworkTieHoles}
            isSelected={selectedWall === 'right'}
            onSelectWall={() => setSelectedWall('right')}
            onSelectOpening={setSelectedOpeningId}
          />
        </group>

        {/* Muros Interiores de Hormigón Armado */}
        {renderMode !== 'rebar_only' &&
          interiorWalls.map((iw) => {
            const zPos = iw.startZ - lengthCm / 2;
            const wThickness = iw.thicknessMm / 10;
            return (
              <mesh key={iw.id} position={[0, wallHeightCm / 2, zPos]} material={ceilingConcreteMat} castShadow>
                <boxGeometry args={[widthCm - wallThicknessCm * 2, wallHeightCm, wThickness]} />
              </mesh>
            );
          })}
      </group>

      {/* 3. PÉRGOLA EXTERIOR & ASADOR / QUINCHO (Casa TT) */}
      {showPergola && renderMode !== 'rebar_only' && (
        <group position={[widthCm / 2, 0, -lengthCm / 2 + 100]}>
          {/* Columnas Metálicas de la Pérgola */}
          {[0, pergolaLengthCm / 2, pergolaLengthCm].map((zOffset, idx) => (
            <mesh
              key={`pergola-col-${idx}`}
              position={[pergolaWidthCm, pergolaHeightCm / 2, zOffset]}
              material={steelStructureMat}
              castShadow
            >
              <boxGeometry args={[12, pergolaHeightCm, 12]} />
            </mesh>
          ))}

          {/* Viga Longitudinal Principal */}
          <mesh
            position={[pergolaWidthCm, pergolaHeightCm, pergolaLengthCm / 2]}
            material={steelStructureMat}
            castShadow
          >
            <boxGeometry args={[14, 20, pergolaLengthCm + 30]} />
          </mesh>

          {/* Viga de Anclaje al Muro de Hormigón */}
          <mesh
            position={[0, pergolaHeightCm, pergolaLengthCm / 2]}
            material={steelStructureMat}
          >
            <boxGeometry args={[8, 16, pergolaLengthCm]} />
          </mesh>

          {/* Tirantes Transversales */}
          {Array.from({ length: 9 }).map((_, i) => (
            <mesh
              key={`pergola-beam-${i}`}
              position={[pergolaWidthCm / 2, pergolaHeightCm + 8, (i * pergolaLengthCm) / 8]}
              material={steelStructureMat}
              castShadow
            >
              <boxGeometry args={[pergolaWidthCm + 20, 10, 8]} />
            </mesh>
          ))}

          {/* Listones de Sombra de Madera (Louvers) */}
          {Array.from({ length: 28 }).map((_, i) => (
            <mesh
              key={`pergola-slat-${i}`}
              position={[pergolaWidthCm / 2, pergolaHeightCm + 15, (i * pergolaLengthCm) / 27]}
              material={timberSlatMat}
              castShadow
            >
              <boxGeometry args={[pergolaWidthCm, 4, 3]} />
            </mesh>
          ))}

          {/* Mueble / Asador y Mesada de Hormigón Exterior */}
          {showBarbecueCounter && (
            <group position={[pergolaWidthCm - 45, 0, pergolaLengthCm - 160]}>
              {/* Mesada de hormigón visto */}
              <mesh position={[0, 45, 0]} material={concreteMat} castShadow receiveShadow>
                <boxGeometry args={[80, 90, 320]} />
              </mesh>
              {/* Nicho de fuego con ladrillo refractario */}
              <mesh position={[5, 100, 60]} material={barbecueBrickMat} castShadow>
                <boxGeometry args={[70, 40, 120]} />
              </mesh>
              {/* Campana y Chimenea metálica negra */}
              <mesh position={[5, 140, 60]} material={steelStructureMat} castShadow>
                <boxGeometry args={[74, 50, 124]} />
              </mesh>
              <mesh position={[5, 200, 60]} material={steelStructureMat}>
                <cylinderGeometry args={[14, 14, 80, 16]} />
              </mesh>
            </group>
          )}
        </group>
      )}

      {/* 4. CUBIERTA SUPERIOR & HASTIALES (Monolítica a Dos Aguas o Losa Plana) */}
      {showRoof && renderMode !== 'rebar_only' && (
        <group position={[0, wallHeightCm * levels, 0]}>
          {slabType === 'dos_aguas_hormigon' || roofType === 'dos_aguas_hormigon' ? (
            <group>
              {/* Hastial Frontal Triangular */}
              <mesh
                position={[0, 0, lengthCm / 2 - wallThicknessCm]}
                geometry={gableGeometry}
                material={ceilingConcreteMat}
                castShadow
              />

              {/* Hastial Posterior Triangular */}
              <mesh
                position={[0, 0, -lengthCm / 2]}
                geometry={gableGeometry}
                material={ceilingConcreteMat}
                castShadow
              />

              {/* Si hay patio central, dividimos el techo en 2 pabellones con corte al centro */}
              {hasCentralPatio ? (
                <group>
                  {/* Pabellón 1 (Social & Acceso): Z desde -length/2 hasta -length/2 + centralPatioOffset */}
                  {(() => {
                    const pav1Len = centralPatioOffsetCm;
                    const pav1CenterZ = -lengthCm / 2 + pav1Len / 2;
                    const halfW = widthCm / 2 + overhangCm;
                    const halfSlopeX = (halfW / 2);

                    return (
                      <group position={[0, 0, pav1CenterZ]}>
                        {/* Faldón Izquierdo */}
                        <mesh
                          position={[-halfSlopeX, roofRidgeHeightCm / 2, 0]}
                          rotation={[0, 0, roofAngle]}
                          material={ceilingConcreteMat}
                          castShadow
                        >
                          <boxGeometry args={[roofSlopeLength, 15, pav1Len]} />
                        </mesh>

                        {/* Faldón Derecho */}
                        <mesh
                          position={[halfSlopeX, roofRidgeHeightCm / 2, 0]}
                          rotation={[0, 0, -roofAngle]}
                          material={ceilingConcreteMat}
                          castShadow
                        >
                          <boxGeometry args={[roofSlopeLength, 15, pav1Len]} />
                        </mesh>
                      </group>
                    );
                  })()}

                  {/* Pabellón 2 (Privado / Dormitorios): Z desde -length/2 + patioEnd hasta +length/2 */}
                  {(() => {
                    const patioEnd = centralPatioOffsetCm + centralPatioLengthCm;
                    const pav2Len = lengthCm - patioEnd;
                    const pav2CenterZ = -lengthCm / 2 + patioEnd + pav2Len / 2;
                    const halfW = widthCm / 2 + overhangCm;
                    const halfSlopeX = (halfW / 2);

                    return (
                      <group position={[0, 0, pav2CenterZ]}>
                        {/* Faldón Izquierdo con Lucarna */}
                        <mesh
                          position={[-halfSlopeX, roofRidgeHeightCm / 2, 0]}
                          rotation={[0, 0, roofAngle]}
                          material={ceilingConcreteMat}
                          castShadow
                        >
                          <boxGeometry args={[roofSlopeLength, 15, pav2Len]} />
                        </mesh>

                        {/* Faldón Derecho */}
                        <mesh
                          position={[halfSlopeX, roofRidgeHeightCm / 2, 0]}
                          rotation={[0, 0, -roofAngle]}
                          material={ceilingConcreteMat}
                          castShadow
                        >
                          <boxGeometry args={[roofSlopeLength, 15, pav2Len]} />
                        </mesh>

                        {/* Lucarna / Claraboya cenital de hormigón en cubierta */}
                        <mesh
                          position={[-halfSlopeX * 0.7, roofRidgeHeightCm * 0.75 + 10, pav2Len * 0.3]}
                          material={steelStructureMat}
                        >
                          <boxGeometry args={[90, 20, 110]} />
                        </mesh>
                      </group>
                    );
                  })()}
                </group>
              ) : (
                /* Cubierta continua sin patio */
                <group>
                  {/* Faldón Izquierdo */}
                  <mesh
                    position={[-(widthCm / 2 + overhangCm) / 2, roofRidgeHeightCm / 2, 0]}
                    rotation={[0, 0, roofAngle]}
                    material={ceilingConcreteMat}
                    castShadow
                  >
                    <boxGeometry args={[roofSlopeLength, 15, lengthCm + overhangCm * 2]} />
                  </mesh>

                  {/* Faldón Derecho */}
                  <mesh
                    position={[(widthCm / 2 + overhangCm) / 2, roofRidgeHeightCm / 2, 0]}
                    rotation={[0, 0, -roofAngle]}
                    material={ceilingConcreteMat}
                    castShadow
                  >
                    <boxGeometry args={[roofSlopeLength, 15, lengthCm + overhangCm * 2]} />
                  </mesh>
                </group>
              )}
            </group>
          ) : slabType.startsWith('losa_hormigon') ? (
            <mesh position={[0, 6, 0]} material={ceilingConcreteMat} castShadow>
              <boxGeometry args={[widthCm + overhangCm * 2, 12, lengthCm + overhangCm * 2]} />
            </mesh>
          ) : (
            <group>
              {/* Cadena de coronación perimetral */}
              <mesh position={[0, 10, lengthCm / 2 - wallThicknessCm / 2]} material={concreteMat}>
                <boxGeometry args={[widthCm, 20, wallThicknessCm]} />
              </mesh>
              <mesh position={[0, 10, -lengthCm / 2 + wallThicknessCm / 2]} material={concreteMat}>
                <boxGeometry args={[widthCm, 20, wallThicknessCm]} />
              </mesh>
              {/* Techo Liviano */}
              <mesh position={[0, 25, 0]} material={roofMat} castShadow>
                <boxGeometry args={[widthCm + overhangCm * 2, 8, lengthCm + overhangCm * 2]} />
              </mesh>
            </group>
          )}
        </group>
      )}
    </group>
  );
}
