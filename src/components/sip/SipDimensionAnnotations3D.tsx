import React, { useMemo, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSipHouseStore } from '../../store/sipHouseStore';

interface VolumeCotaProps {
  start: [number, number, number];
  end: [number, number, number];
  label: string;
  dimensionValue: string;
  color?: string;
  extensionStart?: [number, number, number];
  extensionEnd?: [number, number, number];
  badgeBg?: string;
}

/**
 * Cota 3D arquitectónica robusta y de alta visibilidad para volúmenes espaciales.
 * Utiliza geometrías Three nativas para líneas/terminales y badges Html para garantizar
 * legibilidad perfecta sin problemas de fuentes WebGL ni errores de hooks.
 */
function VolumeCota3D({
  start,
  end,
  label,
  dimensionValue,
  color = '#38bdf8',
  extensionStart,
  extensionEnd,
  badgeBg = 'rgba(15, 23, 42, 0.92)',
}: VolumeCotaProps) {
  if (!start || !end) return null;

  const pt1 = useMemo(() => new THREE.Vector3(...start), [start]);
  const pt2 = useMemo(() => new THREE.Vector3(...end), [end]);
  const mid = useMemo(() => new THREE.Vector3().addVectors(pt1, pt2).multiplyScalar(0.5), [pt1, pt2]);

  const length = useMemo(() => pt1.distanceTo(pt2), [pt1, pt2]);

  const orientation = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(pt2, pt1);
    if (dir.lengthSq() < 0.0001) return new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const orient = new THREE.Quaternion();
    orient.setFromUnitVectors(up, dir.normalize());
    return orient;
  }, [pt1, pt2]);

  // Líneas de proyección
  const ext1 = useMemo(() => {
    if (!extensionStart) return null;
    const pExt = new THREE.Vector3(...extensionStart);
    const pMid = new THREE.Vector3().addVectors(pExt, pt1).multiplyScalar(0.5);
    const dist = pExt.distanceTo(pt1);
    const dir = new THREE.Vector3().subVectors(pt1, pExt);
    const orient = new THREE.Quaternion();
    if (dist > 0.01) orient.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return { mid: pMid, length: dist, orient };
  }, [extensionStart, pt1]);

  const ext2 = useMemo(() => {
    if (!extensionEnd) return null;
    const pExt = new THREE.Vector3(...extensionEnd);
    const pMid = new THREE.Vector3().addVectors(pExt, pt2).multiplyScalar(0.5);
    const dist = pExt.distanceTo(pt2);
    const dir = new THREE.Vector3().subVectors(pt2, pExt);
    const orient = new THREE.Quaternion();
    if (dist > 0.01) orient.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return { mid: pMid, length: dist, orient };
  }, [extensionEnd, pt2]);

  if (length <= 0.05) return null;

  return (
    <group renderOrder={9999}>
      {/* Barra de cota principal */}
      <mesh position={mid} quaternion={orientation}>
        <cylinderGeometry args={[0.018, 0.018, length, 12]} />
        <meshBasicMaterial color={color} depthTest={false} transparent opacity={0.95} />
      </mesh>

      {/* Terminales en extremos (Esferas) */}
      <mesh position={pt1}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshBasicMaterial color={color} depthTest={false} />
      </mesh>
      <mesh position={pt2}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshBasicMaterial color={color} depthTest={false} />
      </mesh>

      {/* Línea auxiliar de proyección 1 */}
      {ext1 && ext1.length > 0.02 && (
        <mesh position={ext1.mid} quaternion={ext1.orient}>
          <cylinderGeometry args={[0.008, 0.008, ext1.length, 6]} />
          <meshBasicMaterial color={color} depthTest={false} transparent opacity={0.5} />
        </mesh>
      )}

      {/* Línea auxiliar de proyección 2 */}
      {ext2 && ext2.length > 0.02 && (
        <mesh position={ext2.mid} quaternion={ext2.orient}>
          <cylinderGeometry args={[0.008, 0.008, ext2.length, 6]} />
          <meshBasicMaterial color={color} depthTest={false} transparent opacity={0.5} />
        </mesh>
      )}

      {/* Badge HTML con información de medida nítida y reactiva */}
      <Html
        position={[mid.x, mid.y, mid.z]}
        center
        distanceFactor={18}
        className="pointer-events-none select-none"
      >
        <div
          style={{ backgroundColor: badgeBg }}
          className="flex flex-col items-center justify-center px-3 py-1.5 rounded-xl border border-sky-400/40 shadow-2xl backdrop-blur-md whitespace-nowrap transform -translate-y-1/2 transition-transform"
        >
          <span className="text-[11px] font-bold text-slate-300 tracking-wider uppercase leading-none mb-1">
            {label}
          </span>
          <span
            style={{ color }}
            className="text-base font-black tracking-tight leading-none drop-shadow-md"
          >
            {dimensionValue}
          </span>
        </div>
      </Html>
    </group>
  );
}

export function SipDimensionAnnotations3D() {
  const {
    dimensions: dim,
    floorThicknessMm,
    showDimensions,
    explodedProgress,
  } = useSipHouseStore();

  const signXRef = useRef<1 | -1>(1);
  const signZRef = useRef<1 | -1>(1);
  const [signs, setSigns] = useState<{ signX: 1 | -1; signZ: 1 | -1 }>({ signX: 1, signZ: 1 });

  useFrame(({ camera }) => {
    const curX = signXRef.current;
    const curZ = signZRef.current;
    let newX = curX;
    let newZ = curZ;

    if (curX === 1 && camera.position.x < -0.1) newX = -1;
    else if (curX === -1 && camera.position.x > 0.1) newX = 1;

    if (curZ === 1 && camera.position.z < -0.1) newZ = -1;
    else if (curZ === -1 && camera.position.z > 0.1) newZ = 1;

    if (newX !== curX || newZ !== curZ) {
      signXRef.current = newX;
      signZRef.current = newZ;
      setSigns({ signX: newX, signZ: newZ });
    }
  });

  if (!showDimensions) {
    return null;
  }

  const { signX, signZ } = signs;

  // Dimensiones en metros
  const lengthM = dim.length / 100;
  const widthM = dim.width / 100;
  const eaveHM = dim.eaveHeight / 100;
  const ridgeHM = dim.ridgeHeight / 100;
  const floorThickM = (floorThicknessMm || 162) / 1000;

  const isLShape = dim.shape === 'l_shape';
  const wingWidthM = isLShape ? (dim.wingWidth || 360) / 100 : 0;
  const wingLengthM = isLShape ? (dim.wingLength || 420) / 100 : 0;

  // Offset vertical si está explosionado
  const expY = explodedProgress * 0.4;
  const offsetD = 0.65;

  const cotaZ = signZ * (lengthM / 2 + offsetD);
  const wallZ = signZ * (lengthM / 2);
  const cotaX = signX * (widthM / 2 + offsetD);
  const wallX = signX * (widthM / 2);

  return (
    <group position={[0, expY, 0]}>
      {/* ========================================================================= */}
      {/* VOLUMEN PRINCIPAL: ANCHO, LARGO Y ALTURAS (ALERO Y CUMBRERA)              */}
      {/* ========================================================================= */}

      {/* 1. ANCHO NAVE PRINCIPAL (Eje X) */}
      <VolumeCota3D
        start={[-widthM / 2, 0.05, cotaZ]}
        end={[widthM / 2, 0.05, cotaZ]}
        extensionStart={[-widthM / 2, 0.05, wallZ]}
        extensionEnd={[widthM / 2, 0.05, wallZ]}
        label={isLShape ? 'Ancho Nave Principal' : 'Ancho Total'}
        dimensionValue={`${(dim.width / 100).toFixed(2)} m · ${dim.width} cm`}
        color="#38bdf8"
      />

      {/* 2. LARGO NAVE PRINCIPAL (Eje Z) */}
      <VolumeCota3D
        start={[cotaX, 0.05, -lengthM / 2]}
        end={[cotaX, 0.05, lengthM / 2]}
        extensionStart={[wallX, 0.05, -lengthM / 2]}
        extensionEnd={[wallX, 0.05, lengthM / 2]}
        label={isLShape ? 'Largo Nave Principal' : 'Largo Total'}
        dimensionValue={`${(dim.length / 100).toFixed(2)} m · ${dim.length} cm`}
        color="#38bdf8"
      />

      {/* 3. ALTO ALERO MURO (Eje Y) */}
      <VolumeCota3D
        start={[cotaX, floorThickM, cotaZ]}
        end={[cotaX, floorThickM + eaveHM, cotaZ]}
        extensionStart={[wallX, floorThickM, wallZ]}
        extensionEnd={[wallX, floorThickM + eaveHM, wallZ]}
        label="Alto Alero Muro"
        dimensionValue={`${(dim.eaveHeight / 100).toFixed(2)} m · ${dim.eaveHeight} cm`}
        color="#0ea5e9"
      />

      {/* 4. ALTO CUMBRERA TOTAL (Eje Y) */}
      {dim.roofStyle !== 'flat' ? (
        <VolumeCota3D
          start={[0, 0, cotaZ]}
          end={[0, floorThickM + ridgeHM, cotaZ]}
          extensionStart={[0, 0, wallZ]}
          extensionEnd={[0, floorThickM + ridgeHM, wallZ]}
          label="Alto Cumbrera Total"
          dimensionValue={`${(dim.ridgeHeight / 100).toFixed(2)} m · ${dim.ridgeHeight} cm`}
          color="#f59e0b"
          badgeBg="rgba(30, 27, 75, 0.95)"
        />
      ) : (
        <VolumeCota3D
          start={[0, 0, cotaZ]}
          end={[0, floorThickM + eaveHM, cotaZ]}
          extensionStart={[0, 0, wallZ]}
          extensionEnd={[0, floorThickM + eaveHM, wallZ]}
          label="Alto Total Techo Plano"
          dimensionValue={`${(dim.eaveHeight / 100).toFixed(2)} m · ${dim.eaveHeight} cm`}
          color="#0ea5e9"
        />
      )}

      {/* ========================================================================= */}
      {/* VOLUMEN ALA LATERAL (SI TIPOLOGÍA EN L)                                  */}
      {/* ========================================================================= */}
      {isLShape && (
        <group>
          {/* 5. ANCHO ALA LATERAL (Eje X) */}
          <VolumeCota3D
            start={[widthM / 2, 0.05, cotaZ]}
            end={[widthM / 2 + wingWidthM, 0.05, cotaZ]}
            extensionStart={[widthM / 2, 0.05, wallZ]}
            extensionEnd={[widthM / 2 + wingWidthM, 0.05, wallZ]}
            label="Ancho Ala Lateral"
            dimensionValue={`${wingWidthM.toFixed(2)} m · ${dim.wingWidth || 360} cm`}
            color="#c084fc"
          />

          {/* 6. LARGO ALA LATERAL (Eje Z) */}
          <VolumeCota3D
            start={[widthM / 2 + wingWidthM + offsetD, 0.05, lengthM / 2 - wingLengthM]}
            end={[widthM / 2 + wingWidthM + offsetD, 0.05, lengthM / 2]}
            extensionStart={[widthM / 2 + wingWidthM, 0.05, lengthM / 2 - wingLengthM]}
            extensionEnd={[widthM / 2 + wingWidthM, 0.05, lengthM / 2]}
            label="Largo Ala Lateral"
            dimensionValue={`${wingLengthM.toFixed(2)} m · ${dim.wingLength || 420} cm`}
            color="#c084fc"
          />

          {/* 7. ANCHO TOTAL COMBINADO (Eje X) */}
          <VolumeCota3D
            start={[-widthM / 2, 0.05, cotaZ + (signZ >= 0 ? 0.75 : -0.75)]}
            end={[widthM / 2 + wingWidthM, 0.05, cotaZ + (signZ >= 0 ? 0.75 : -0.75)]}
            extensionStart={[-widthM / 2, 0.05, cotaZ]}
            extensionEnd={[widthM / 2 + wingWidthM, 0.05, cotaZ]}
            label="Ancho Total Envolvente L"
            dimensionValue={`${((dim.width + (dim.wingWidth || 360)) / 100).toFixed(2)} m · ${dim.width + (dim.wingWidth || 360)} cm`}
            color="#34d399"
          />
        </group>
      )}
    </group>
  );
}
