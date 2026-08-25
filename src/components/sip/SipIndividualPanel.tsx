import React, { useMemo } from 'react';
import * as THREE from 'three';

interface SipIndividualPanelProps {
  width: number;       // Ancho del panel en metros (ej. 1.22 m)
  height: number;      // Alto del panel en metros (ej. 2.44 m o 2.60 m)
  totalThickness?: number; // Espesor total (0.114 m muro, 0.162 m losa, 0.210 m techo)
  recess?: number;     // Rebaje de fábrica del EPS (por defecto 0.035 m / 35 mm)
  osbMaterial: THREE.Material;
  epsMaterial: THREE.Material;
  osbEdgeMaterial?: THREE.Material;
  claddingMaterial?: THREE.Material;
  useCladdingOnFront?: boolean;
  tag?: string;
  isExploded?: boolean;
  cutout?: {
    x: number; // offset desde centro del panel
    y: number; // offset desde centro del panel
    w: number;
    h: number;
  };
}

export function SipIndividualPanel({
  width,
  height,
  totalThickness = 0.114,
  recess = 0.035,
  osbMaterial,
  epsMaterial,
  osbEdgeMaterial,
  claddingMaterial,
  useCladdingOnFront = false,
  tag,
  isExploded = false,
  cutout,
}: SipIndividualPanelProps) {
  const osbThick = 0.0111; // 11.1 mm espesor tablero OSB estructural
  const epsThick = Math.max(0.04, totalThickness - 2 * osbThick);

  // Dimensiones del núcleo EPS considerando el rebaje perimetral para soleras y splines
  const actualRecessX = Math.min(recess, width * 0.45);
  const actualRecessY = Math.min(recess, height * 0.45);

  const epsW = Math.max(0.02, width - 2 * actualRecessX);
  const epsH = Math.max(0.02, height - 2 * actualRecessY);

  const frontMat = osbMaterial;
  const edgeMat = osbEdgeMaterial || osbMaterial;

  // Material de líneas de unión técnicas bien marcadas (seams/chamfers oscuros)
  const seamLineMat = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: '#382008',
      linewidth: 2,
      transparent: true,
      opacity: 0.85,
    });
  }, []);

  const seamLineMatFront = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: '#2a1805',
      linewidth: 2,
      transparent: true,
      opacity: 0.9,
    });
  }, []);

  // Geometría de bordes para la cara frontal y posterior
  const faceEdgesGeom = useMemo(() => {
    return new THREE.EdgesGeometry(new THREE.BoxGeometry(width, height, osbThick));
  }, [width, height, osbThick]);

  // Si no hay cutout, renderizamos el panel sándwich estándar
  if (!cutout) {
    return (
      <group>
        {/* 1. CARA EXTERIOR DE OSB */}
        <mesh position={[0, 0, epsThick / 2 + osbThick / 2]} material={frontMat} castShadow receiveShadow>
          <boxGeometry args={[width, height, osbThick]} />
        </mesh>
        {/* Línea de junta / bisel perimetral exterior bien marcada */}
        <lineSegments position={[0, 0, epsThick / 2 + osbThick / 2]} geometry={faceEdgesGeom} material={seamLineMatFront} />

        {/* 2. NÚCLEO CENTRAL DE EPS (Espuma blanca con rebaje perimetral de fábrica) */}
        <mesh position={[0, 0, 0]} material={epsMaterial} castShadow receiveShadow>
          <boxGeometry args={[epsW, epsH, epsThick]} />
        </mesh>

        {/* 3. CARA INTERIOR DE OSB */}
        <mesh position={[0, 0, -(epsThick / 2 + osbThick / 2)]} material={osbMaterial} castShadow receiveShadow>
          <boxGeometry args={[width, height, osbThick]} />
        </mesh>
        {/* Línea de junta interior bien marcada */}
        <lineSegments position={[0, 0, -(epsThick / 2 + osbThick / 2)]} geometry={faceEdgesGeom} material={seamLineMat} />

        {/* 4. LABIOS / CANTOS DE OSB CON SELLADOR ROJO/NARANJA (Top & Bottom) */}
        {/* Labio Superior */}
        <mesh position={[0, height / 2 - osbThick / 4, epsThick / 2 + osbThick / 2]} material={edgeMat}>
          <boxGeometry args={[width + 0.0005, osbThick / 2, osbThick + 0.0005]} />
        </mesh>
        <mesh position={[0, height / 2 - osbThick / 4, -(epsThick / 2 + osbThick / 2)]} material={edgeMat}>
          <boxGeometry args={[width + 0.0005, osbThick / 2, osbThick + 0.0005]} />
        </mesh>
        {/* Labio Inferior */}
        <mesh position={[0, -height / 2 + osbThick / 4, epsThick / 2 + osbThick / 2]} material={edgeMat}>
          <boxGeometry args={[width + 0.0005, osbThick / 2, osbThick + 0.0005]} />
        </mesh>
        <mesh position={[0, -height / 2 + osbThick / 4, -(epsThick / 2 + osbThick / 2)]} material={edgeMat}>
          <boxGeometry args={[width + 0.0005, osbThick / 2, osbThick + 0.0005]} />
        </mesh>

        {/* Líneas de borde de panel en despiece */}
        {isExploded && (
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(width, height, totalThickness)]} />
            <lineBasicMaterial color="#38bdf8" transparent opacity={0.45} />
          </lineSegments>
        )}
      </group>
    );
  }

  // Panel con vano / apertura recortada (dintel + antepecho + laterales)
  const leftW = Math.max(0.01, (cutout.x - cutout.w / 2) + width / 2);
  const rightW = Math.max(0.01, width / 2 - (cutout.x + cutout.w / 2));
  const bottomH = Math.max(0.01, (cutout.y - cutout.h / 2) + height / 2);
  const topH = Math.max(0.01, height / 2 - (cutout.y + cutout.h / 2));
  const cutW = cutout.w;

  return (
    <group>
      {/* Sección Izquierda */}
      {leftW > 0.02 && (
        <group position={[-width / 2 + leftW / 2, 0, 0]}>
          <mesh position={[0, 0, epsThick / 2 + osbThick / 2]} material={frontMat} castShadow receiveShadow>
            <boxGeometry args={[leftW, height, osbThick]} />
          </mesh>
          <lineSegments position={[0, 0, epsThick / 2 + osbThick / 2]}>
            <edgesGeometry args={[new THREE.BoxGeometry(leftW, height, osbThick)]} />
            <primitive object={seamLineMatFront} attach="material" />
          </lineSegments>
          <mesh position={[0, 0, 0]} material={epsMaterial} castShadow receiveShadow>
            <boxGeometry args={[Math.max(0.01, leftW - actualRecessX), epsH, epsThick]} />
          </mesh>
          <mesh position={[0, 0, -(epsThick / 2 + osbThick / 2)]} material={osbMaterial} castShadow receiveShadow>
            <boxGeometry args={[leftW, height, osbThick]} />
          </mesh>
          <lineSegments position={[0, 0, -(epsThick / 2 + osbThick / 2)]}>
            <edgesGeometry args={[new THREE.BoxGeometry(leftW, height, osbThick)]} />
            <primitive object={seamLineMat} attach="material" />
          </lineSegments>
        </group>
      )}

      {/* Sección Derecha */}
      {rightW > 0.02 && (
        <group position={[width / 2 - rightW / 2, 0, 0]}>
          <mesh position={[0, 0, epsThick / 2 + osbThick / 2]} material={frontMat} castShadow receiveShadow>
            <boxGeometry args={[rightW, height, osbThick]} />
          </mesh>
          <lineSegments position={[0, 0, epsThick / 2 + osbThick / 2]}>
            <edgesGeometry args={[new THREE.BoxGeometry(rightW, height, osbThick)]} />
            <primitive object={seamLineMatFront} attach="material" />
          </lineSegments>
          <mesh position={[0, 0, 0]} material={epsMaterial} castShadow receiveShadow>
            <boxGeometry args={[Math.max(0.01, rightW - actualRecessX), epsH, epsThick]} />
          </mesh>
          <mesh position={[0, 0, -(epsThick / 2 + osbThick / 2)]} material={osbMaterial} castShadow receiveShadow>
            <boxGeometry args={[rightW, height, osbThick]} />
          </mesh>
          <lineSegments position={[0, 0, -(epsThick / 2 + osbThick / 2)]}>
            <edgesGeometry args={[new THREE.BoxGeometry(rightW, height, osbThick)]} />
            <primitive object={seamLineMat} attach="material" />
          </lineSegments>
        </group>
      )}

      {/* Dintel Superior (Arriba del vano) */}
      {topH > 0.02 && (
        <group position={[cutout.x, height / 2 - topH / 2, 0]}>
          <mesh position={[0, 0, epsThick / 2 + osbThick / 2]} material={frontMat} castShadow receiveShadow>
            <boxGeometry args={[cutW, topH, osbThick]} />
          </mesh>
          <lineSegments position={[0, 0, epsThick / 2 + osbThick / 2]}>
            <edgesGeometry args={[new THREE.BoxGeometry(cutW, topH, osbThick)]} />
            <primitive object={seamLineMatFront} attach="material" />
          </lineSegments>
          <mesh position={[0, 0, 0]} material={epsMaterial} castShadow receiveShadow>
            <boxGeometry args={[cutW, Math.max(0.01, topH - actualRecessY), epsThick]} />
          </mesh>
          <mesh position={[0, 0, -(epsThick / 2 + osbThick / 2)]} material={osbMaterial} castShadow receiveShadow>
            <boxGeometry args={[cutW, topH, osbThick]} />
          </mesh>
          <lineSegments position={[0, 0, -(epsThick / 2 + osbThick / 2)]}>
            <edgesGeometry args={[new THREE.BoxGeometry(cutW, topH, osbThick)]} />
            <primitive object={seamLineMat} attach="material" />
          </lineSegments>
        </group>
      )}

      {/* Antepecho Inferior (Debajo del vano) */}
      {bottomH > 0.02 && (
        <group position={[cutout.x, -height / 2 + bottomH / 2, 0]}>
          <mesh position={[0, 0, epsThick / 2 + osbThick / 2]} material={frontMat} castShadow receiveShadow>
            <boxGeometry args={[cutW, bottomH, osbThick]} />
          </mesh>
          <lineSegments position={[0, 0, epsThick / 2 + osbThick / 2]}>
            <edgesGeometry args={[new THREE.BoxGeometry(cutW, bottomH, osbThick)]} />
            <primitive object={seamLineMatFront} attach="material" />
          </lineSegments>
          <mesh position={[0, 0, 0]} material={epsMaterial} castShadow receiveShadow>
            <boxGeometry args={[cutW, Math.max(0.01, bottomH - actualRecessY), epsThick]} />
          </mesh>
          <mesh position={[0, 0, -(epsThick / 2 + osbThick / 2)]} material={osbMaterial} castShadow receiveShadow>
            <boxGeometry args={[cutW, bottomH, osbThick]} />
          </mesh>
          <lineSegments position={[0, 0, -(epsThick / 2 + osbThick / 2)]}>
            <edgesGeometry args={[new THREE.BoxGeometry(cutW, bottomH, osbThick)]} />
            <primitive object={seamLineMat} attach="material" />
          </lineSegments>
        </group>
      )}
    </group>
  );
}
