import React, { useRef, useState, useMemo } from 'react';
import { CabinetType, useKitchenStore, getCabinetLabel } from '../../store/kitchenStore';
import { useStore } from '../../store';
import { Edges, Line, Text, Billboard } from '@react-three/drei';
import { Board } from '../Board';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { getNominalSlideLength } from '../../utils/manufacturing';
import { getProvelcarX175Geometry, getProvelcarX176Geometry } from '../../utils/kitchenGola3D';
import { StoveFDVUnique90 } from './decoration/StoveFDVUnique90';
import { FridgeFDVSignatureSBS } from './decoration/FridgeFDVSignatureSBS';
import { PlantDecoration } from './decoration/PlantDecoration';

export function AssemblyJoint({
  position, 
  length, 
  axis, 
  pointing, 
  thickness,
  count = 2,
  overrideAssemblyType = undefined,
  edgeOffset = 5
}: {
  position: [number, number, number],
  length: number,
  axis: 'x' | 'y' | 'z',
  pointing: 'right' | 'left' | 'up' | 'down',
  thickness: number,
  count?: number,
  overrideAssemblyType?: 'spax' | 'minifix',
  edgeOffset?: number
}) {
  const isTransparent = useStore((state) => state.isTransparent);
  const globalAssemblyType = useStore((state) => state.assemblyType);
  const assemblyType = overrideAssemblyType || globalAssemblyType;
  if (!isTransparent) return null;

  const points = [];
  const start = -length / 2 + edgeOffset; 
  const end = length / 2 - edgeOffset;
  const step = count > 1 ? (end - start) / (count - 1) : 0;
  for (let i = 0; i < count; i++) {
    points.push(count === 1 ? 0 : start + i * step);
  }

  let rot: [number, number, number] = [0, 0, 0];
  if (pointing === 'left') rot = [0, Math.PI, 0];
  if (pointing === 'up') rot = [0, 0, Math.PI/2];
  if (pointing === 'down') rot = [0, 0, -Math.PI/2];

  return (
    <group position={position}>
      {points.map((p, i) => {
        const pPos: [number, number, number] = 
          axis === 'x' ? [p, 0, 0] : 
          axis === 'y' ? [0, p, 0] : 
          [0, 0, p];
          
        return (
          <group key={i} position={pPos} rotation={rot}>
            {assemblyType === 'spax' ? (
              <group>
                <mesh position={[-thickness, 0, 0]} rotation={[0, 0, -Math.PI/2]}>
                  <cylinderGeometry args={[0.4, 0.4, 0.1, 12]} />
                  <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.5} />
                </mesh>
                <mesh position={[-thickness/2 + 1.25, 0, 0]} rotation={[0, 0, -Math.PI/2]}>
                  <cylinderGeometry args={[0.15, 0.05, thickness + 2.5, 8]} />
                  <meshStandardMaterial color="#555555" metalness={0.8} roughness={0.5} />
                </mesh>
              </group>
            ) : (
              <group>
                {/* Perno Minifix Acero Zincado */}
                <mesh position={[-thickness/2 + 0.75, 0, 0]} rotation={[0, 0, -Math.PI/2]}>
                  <cylinderGeometry args={[0.25, 0.25, thickness + 1.5, 8]} />
                  <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.5} />
                </mesh>
                {/* Caja Excéntrica 15mm Zamak */}
                <mesh position={[1.7, -thickness/2 + 0.25, 0]}>
                  <cylinderGeometry args={[0.75, 0.75, 0.5, 16]} />
                  <meshStandardMaterial color="#aaaaaa" metalness={0.5} roughness={0.5} />
                </mesh>
                {/* Tarugo de Madera Estriada 8x30 */}
                <mesh position={[0.5, 0, 2.5]} rotation={[0, 0, -Math.PI/2]}>
                   <cylinderGeometry args={[0.4, 0.4, 3, 8]} />
                   <meshStandardMaterial color="#d4a373" roughness={0.9} />
                </mesh>
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}

export function AnimatedDrawer({ children, openZOffset, forceOpen, onClickAction }: { children: React.ReactNode, openZOffset: number, forceOpen?: boolean, onClickAction?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const groupRef = useRef<THREE.Group>(null);

  React.useEffect(() => {
    if (forceOpen !== undefined) setIsOpen(forceOpen);
  }, [forceOpen]);
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      const targetZ = isOpen ? openZOffset : 0;
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, delta * 4);
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (onClickAction) {
      onClickAction();
    } else {
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <group 
      ref={groupRef}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {children}
    </group>
  );
}

export function AnimatedDoor({
  doorW,
  doorH,
  thickness,
  position,
  isRightHinge = false,
  colorProps,
  forceOpen,
  onClickAction,
  globalPosition,
}: {
  doorW: number;
  doorH: number;
  thickness: number;
  position: [number, number, number];
  isRightHinge?: boolean;
  colorProps: any;
  forceOpen?: boolean;
  onClickAction?: () => void;
  globalPosition?: [number, number, number];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const groupRef = useRef<THREE.Group>(null);

  React.useEffect(() => {
    if (forceOpen !== undefined) setIsOpen(forceOpen);
  }, [forceOpen]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      const targetRotation = isOpen ? (isRightHinge ? Math.PI * 0.55 : -Math.PI * 0.55) : 0;
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotation, delta * 4);
    }
  });

  const hingeXOffset = isRightHinge ? doorW / 2 : -doorW / 2;
  const hingeDir = isRightHinge ? -1 : 1;

  const hingeYs = doorH > 180
    ? [-doorH / 2 + 10, -doorH / 6, doorH / 6, doorH / 2 - 10]
    : (doorH > 140
      ? [-doorH / 2 + 12, 0, doorH / 2 - 12]
      : [-doorH / 2 + 10, doorH / 2 - 10]);

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (onClickAction) {
      onClickAction();
    } else {
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <group
      position={[position[0] + hingeXOffset, position[1], position[2] - thickness / 2]}
      ref={groupRef}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Front Door Board */}
      <Board
        position={[-hingeXOffset, 0, thickness / 2]}
        args={[doorW, doorH, thickness]}
        {...colorProps}
        isFrontPanel={true}
        globalPosition={globalPosition}
      />

      {/* Bisagras de Cazoleta (Euro Hinges 35mm) */}
      {hingeYs.map((y, idx) => (
        <group key={`hinge-${idx}`} position={[0, y, 0]}>
          {/* Base plate on side panel */}
          <mesh position={[hingeDir * 1.0, 0, -1.2]}>
            <boxGeometry args={[1.5, 2.5, 0.6]} />
            <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Hinge arm */}
          <mesh position={[hingeDir * 1.6, 0, -0.4]}>
            <boxGeometry args={[2.8, 1.2, 0.4]} />
            <meshStandardMaterial color="#aaaaaa" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* 35mm cup on door inner face */}
          <mesh position={[hingeDir * 1.8, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1.75, 1.75, 0.3, 16]} />
            <meshStandardMaterial color="#cccccc" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function AnimatedLiftUpDoor({
  doorW,
  doorH,
  thickness,
  position,
  colorProps,
  forceOpen,
  onClickAction,
  globalPosition,
  innerDepth = 30,
}: {
  doorW: number;
  doorH: number;
  thickness: number;
  position: [number, number, number];
  colorProps: any;
  forceOpen?: boolean;
  onClickAction?: () => void;
  globalPosition?: [number, number, number];
  innerDepth?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const groupRef = useRef<THREE.Group>(null);

  React.useEffect(() => {
    if (forceOpen !== undefined) setIsOpen(forceOpen);
  }, [forceOpen]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      const targetRotation = isOpen ? -Math.PI * 0.45 : 0;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotation, delta * 4);
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (onClickAction) {
      onClickAction();
    } else {
      setIsOpen((prev) => !prev);
    }
  };

  const topHingeY = doorH / 2;

  return (
    <group
      position={[position[0], position[1] + topHingeY, position[2] - thickness / 2]}
      ref={groupRef}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Front Door Board */}
      <Board
        position={[0, -topHingeY, thickness / 2]}
        args={[doorW, doorH, thickness]}
        {...colorProps}
        isFrontPanel={true}
        globalPosition={globalPosition}
      />

      {/* Bisagras Superiores / Herrajes Elevadores Aventos / Pistones a Gas */}
      {[-doorW / 2 + 5, doorW / 2 - 5].map((x, idx) => (
        <group key={`top-hinge-${idx}`} position={[x, 0, 0]}>
          {/* Base de fijación superior */}
          <mesh position={[0, -0.6, -1.2]}>
            <boxGeometry args={[1.8, 1.2, 1.6]} />
            <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Brazo elevador cilíndrico / pistón */}
          <mesh position={[0, -doorH * 0.35, -0.6]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.35, 0.35, doorH * 0.55, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, -doorH * 0.2, -0.4]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.22, doorH * 0.35, 12]} />
            <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function HoodFDVConic90({ width = 89.8, height = 70, depth = 50 }: { width?: number; height?: number; depth?: number }) {
  // Dimensiones según Ficha Técnica FDV New Conic 90 780M3H (SAP 16309):
  // Ancho 898mm (89.8cm), Fondo 500mm (50.0cm), Alto Cuerpo Piramidal 275mm (27.5cm)
  // Labio perimetral inferior 40mm (4.0cm), Chimenea Telescópica 219mm x 182mm (21.9 x 18.2 cm)
  const bodyW = width;
  const bodyD = depth;
  const bodyH = 27.5;
  const lipH = 4.0;
  const chimneyW = 21.9;
  const chimneyD = 18.2;
  const chimneyH = Math.max(18, height - bodyH);

  const topW = chimneyW + 1.6;
  const topD = chimneyD + 1.4;

  // Geometría paramétrica del cuerpo cónico / piramidal truncado exacto
  const pyramidGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();

    const v = {
      bl_bot: [-bodyW / 2, lipH, -bodyD / 2],
      br_bot: [bodyW / 2, lipH, -bodyD / 2],
      fr_bot: [bodyW / 2, lipH, bodyD / 2],
      fl_bot: [-bodyW / 2, lipH, bodyD / 2],
      bl_top: [-topW / 2, bodyH, -bodyD / 2],
      br_top: [topW / 2, bodyH, -bodyD / 2],
      fr_top: [topW / 2, bodyH, -bodyD / 2 + topD],
      fl_top: [-topW / 2, bodyH, -bodyD / 2 + topD],
    };

    const positions: number[] = [];

    // Función auxiliar para agregar cuadrilátero con normales precisas
    const addQuad = (p1: number[], p2: number[], p3: number[], p4: number[]) => {
      positions.push(...p1, ...p2, ...p3);
      positions.push(...p1, ...p3, ...p4);
    };

    // 1. Cara Frontal Inclinada hacia atrás
    addQuad(v.fl_bot, v.fr_bot, v.fr_top, v.fl_top);
    // 2. Cara Lateral Derecha Inclinada hacia el centro
    addQuad(v.fr_bot, v.br_bot, v.br_top, v.fr_top);
    // 3. Cara Posterior Vertical (apoyada contra la pared)
    addQuad(v.br_bot, v.bl_bot, v.bl_top, v.br_top);
    // 4. Cara Lateral Izquierda Inclinada hacia el centro
    addQuad(v.bl_bot, v.fl_bot, v.fl_top, v.bl_top);
    // 5. Cubierta Superior que abraza la base de la chimenea
    addQuad(v.bl_top, v.fl_top, v.fr_top, v.br_top);

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.computeVertexNormals();
    return geom;
  }, [bodyW, bodyD, bodyH, lipH, topW, topD]);

  return (
    <group position={[0, -height / 2, 0]}>
      {/* 1. Labio inferior perimetral (Frente vertical de acero inoxidable de 4cm) */}
      <mesh position={[0, lipH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[bodyW, lipH, bodyD]} />
        <meshStandardMaterial color="#d4d8dc" metalness={0.88} roughness={0.22} />
      </mesh>

      {/* Bisel inferior decorativo */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[bodyW + 0.2, 0.2, bodyD + 0.2]} />
        <meshStandardMaterial color="#b0b5bc" metalness={0.92} roughness={0.18} />
      </mesh>

      {/* 2. Cuerpo Piramidal de Acero Inoxidable (Tronco de pirámide continuo) */}
      <mesh geometry={pyramidGeometry} castShadow receiveShadow>
        <meshStandardMaterial color="#d4d8dc" metalness={0.88} roughness={0.22} />
      </mesh>

      {/* 3. Panel de Control Frontal (Pulsadores / Touch Soft-Touch y display) */}
      <group position={[0, lipH / 2, bodyD / 2 + 0.05]}>
        <mesh>
          <planeGeometry args={[bodyW * 0.42, lipH * 0.65]} />
          <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.8} />
        </mesh>

        {/* Marca FDV sutil */}
        <Text
          position={[-bodyW * 0.14, 0, 0.02]}
          fontSize={1.1}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
        >
          FDV
        </Text>

        {/* Botones de control (Luz, V1, V2, V3, Power) */}
        {[-3.6, -1.8, 0, 1.8, 3.6].map((x, i) => (
          <group key={`btn-${i}`} position={[x + 4.5, 0, 0.02]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.38, 0.38, 0.1, 16]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0, 0.06]}>
              <circleGeometry args={[0.22, 16]} />
              <meshStandardMaterial
                color={i === 2 ? '#38bdf8' : '#ffffff'}
                emissive={i === 2 ? '#0284c7' : '#475569'}
                emissiveIntensity={i === 2 ? 0.9 : 0.3}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* 4. Base Inferior: Filtros de Aluminio Multicapa Modulares con pestillos */}
      {[-bodyW / 3 + 3, 0, bodyW / 3 - 3].map((x, idx) => (
        <group key={`filter-${idx}`} position={[x, 0.1, 0]}>
          {/* Marco perimetral del filtro */}
          <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[bodyW / 3.4, bodyD - 5]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.3} />
          </mesh>
          {/* Malla multicapa de aluminio */}
          <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[bodyW / 3.65, bodyD - 7]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.4} />
          </mesh>
          {/* Pestillo ergonómico de liberación rápida */}
          <mesh position={[0, -0.1, -bodyD / 2 + 6]}>
            <boxGeometry args={[3.2, 0.4, 1.6]} />
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.25} />
          </mesh>
        </group>
      ))}

      {/* 5. Iluminación LED Inferior (2 x LED 2W Spots cálidos) */}
      {[-bodyW / 3 + 2, bodyW / 3 - 2].map((x, idx) => (
        <group key={`led-${idx}`} position={[x, -0.1, -bodyD / 2 + 4.5]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1.5, 1.5, 0.3, 20]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.9} roughness={0.15} />
          </mesh>
          <mesh position={[0, -0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.15, 20]} />
            <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.95} />
          </mesh>
        </group>
      ))}

      {/* 6. Chimenea Telescópica de Acero Inoxidable (Tramo inferior + tramo superior extensible) */}
      <group position={[0, bodyH, -bodyD / 2 + chimneyD / 2]}>
        {/* Tramo inferior de chimenea */}
        <mesh position={[0, (chimneyH * 0.55) / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[chimneyW, chimneyH * 0.55, chimneyD]} />
          <meshStandardMaterial color="#d4d8dc" metalness={0.88} roughness={0.22} />
        </mesh>

        {/* Tramo superior telescópico deslizable */}
        <mesh position={[0, chimneyH * 0.5 + (chimneyH * 0.5) / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[chimneyW - 0.2, chimneyH * 0.5, chimneyD - 0.1]} />
          <meshStandardMaterial color="#d4d8dc" metalness={0.88} roughness={0.22} />
        </mesh>

        {/* Junta / Collarín decorativo entre tramos */}
        <mesh position={[0, chimneyH * 0.52, 0]}>
          <boxGeometry args={[chimneyW + 0.4, 1.2, chimneyD + 0.3]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.92} roughness={0.18} />
        </mesh>

        {/* Rejillas de ventilación lateral y frontal superiores */}
        <mesh position={[0, chimneyH - 3.5, chimneyD / 2 + 0.05]}>
          <planeGeometry args={[chimneyW * 0.72, 2.8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
        <mesh position={[-chimneyW / 2 - 0.05, chimneyH - 3.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[chimneyD * 0.6, 2.8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
        <mesh position={[chimneyW / 2 + 0.05, chimneyH - 3.5, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[chimneyD * 0.6, 2.8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

export function BuiltInOven({ width, height, depth }: { width: number; height: number; depth: number }) {
  return (
    <group position={[0, 0, depth / 2]}>
      {/* Horno Carcasa Interior Insertable */}
      <mesh position={[0, 0, -depth / 2 + 1]}>
        <boxGeometry args={[width - 1.0, height - 1.0, depth - 2]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
      </mesh>

      {/* Marco Exterior Inox Frontal */}
      <mesh position={[0, 0, 0.4]}>
        <boxGeometry args={[width, height, 1.2]} />
        <meshStandardMaterial color="#b5bac1" metalness={0.88} roughness={0.18} />
      </mesh>

      {/* Cristal Frontal Templado Negro */}
      <mesh position={[0, -height * 0.12, 0.9]}>
        <boxGeometry args={[width - 3.5, height * 0.65, 0.3]} />
        <meshStandardMaterial color="#080808" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Visor de Cristal Interior con Parrilla */}
      <mesh position={[0, -height * 0.12, 0.92]}>
        <boxGeometry args={[width - 8, height * 0.45, 0.2]} />
        <meshStandardMaterial color="#1c1917" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, -height * 0.14, 0.93]}>
        <boxGeometry args={[width - 12, 1.2, 0.2]} />
        <meshStandardMaterial color="#cccccc" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* Panel Superior Digital de Control */}
      <mesh position={[0, height / 2 - (height * 0.22) / 2 - 1.0, 0.9]}>
        <boxGeometry args={[width - 3.5, height * 0.20, 0.3]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Pantalla Display LED Naranja / Reloj */}
      <mesh position={[0, height / 2 - (height * 0.22) / 2 - 1.0, 1.1]}>
        <boxGeometry args={[14, 4, 0.1]} />
        <meshStandardMaterial color="#050505" metalness={0.9} roughness={0.2} />
      </mesh>
      <Text position={[0, height / 2 - (height * 0.22) / 2 - 1.0, 1.18]} fontSize={2.2} color="#f97316" anchorX="center" anchorY="middle">
        200°C 45m
      </Text>

      {/* Diales Giratorios Metálicos */}
      <mesh position={[-width / 2 + 6, height / 2 - (height * 0.22) / 2 - 1.0, 1.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.0, 2.0, 1.0, 24]} />
        <meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[width / 2 - 6, height / 2 - (height * 0.22) / 2 - 1.0, 1.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.0, 2.0, 1.0, 24]} />
        <meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Tirador Frontal Horizontal Inox */}
      <mesh position={[0, height / 2 - height * 0.28, 2.8]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.7, 0.7, width - 8, 16]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.92} roughness={0.15} />
      </mesh>
      <mesh position={[-width / 2 + 6, height / 2 - height * 0.28, 1.8]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 1.8, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[width / 2 - 6, height / 2 - height * 0.28, 1.8]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 1.8, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.2} />
      </mesh>
    </group>
  );
}

export function BuiltInMicrowave({ width, height, depth }: { width: number; height: number; depth: number }) {
  return (
    <group position={[0, 0, depth / 2]}>
      {/* Cuerpo Inserción */}
      <mesh position={[0, 0, -depth / 2 + 1]}>
        <boxGeometry args={[width - 1.0, height - 1.0, depth - 2]} />
        <meshStandardMaterial color="#18181b" roughness={0.7} />
      </mesh>

      {/* Marco Trim Kit Inox Frontal */}
      <mesh position={[0, 0, 0.4]}>
        <boxGeometry args={[width, height, 1.0]} />
        <meshStandardMaterial color="#b5bac1" metalness={0.88} roughness={0.18} />
      </mesh>

      {/* Puerta de Cristal Oscuro */}
      <mesh position={[-width * 0.12, 0, 0.9]}>
        <boxGeometry args={[width * 0.68, height - 3.5, 0.3]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.92} roughness={0.1} />
      </mesh>

      {/* Panel Táctil Lateral */}
      <mesh position={[width / 2 - (width * 0.22) / 2 - 1.2, 0, 0.9]}>
        <boxGeometry args={[width * 0.20, height - 3.5, 0.3]} />
        <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Display LED Microondas */}
      <mesh position={[width / 2 - (width * 0.22) / 2 - 1.2, height / 2 - 5, 1.1]}>
        <boxGeometry args={[8, 3.2, 0.1]} />
        <meshStandardMaterial color="#000000" metalness={0.9} roughness={0.2} />
      </mesh>
      <Text position={[width / 2 - (width * 0.22) / 2 - 1.2, height / 2 - 5, 1.18]} fontSize={1.8} color="#38bdf8" anchorX="center" anchorY="middle">
        12:00
      </Text>

      {/* Botón Pulsador de Apertura */}
      <mesh position={[width / 2 - (width * 0.22) / 2 - 1.2, -height / 2 + 4.5, 1.2]}>
        <boxGeometry args={[7, 3, 0.4]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.2} />
      </mesh>
    </group>
  );
}

export function PortableMicrowave({ width, height, depth }: { width: number; height: number; depth: number }) {
  const mwWidth = Math.min(48, width - 4);
  const mwHeight = 28;
  const mwDepth = 36;
  return (
    <group position={[0, mwHeight / 2 + 0.6, 0]}>
      {/* 4 Patitas de Goma Antideslizantes */}
      {[-mwWidth / 2 + 3, mwWidth / 2 - 3].map((px) =>
        [-mwDepth / 2 + 3, mwDepth / 2 - 3].map((pz) => (
          <mesh key={`foot-${px}-${pz}`} position={[px, -mwHeight / 2 - 0.3, pz]}>
            <cylinderGeometry args={[1.0, 1.0, 0.6, 12]} />
            <meshStandardMaterial color="#18181b" roughness={0.9} />
          </mesh>
        ))
      )}

      {/* Chasis Principal Metálico de Sobremesa */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[mwWidth, mwHeight, mwDepth]} />
        <meshStandardMaterial color="#27272a" metalness={0.65} roughness={0.35} />
      </mesh>

      {/* Rejilla de Ventilación Lateral */}
      <mesh position={[-mwWidth / 2 - 0.1, 2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[12, 18]} />
        <meshStandardMaterial color="#18181b" roughness={0.8} />
      </mesh>

      {/* Marco Frontal */}
      <mesh position={[0, 0, mwDepth / 2 + 0.2]}>
        <boxGeometry args={[mwWidth - 0.8, mwHeight - 0.8, 0.6]} />
        <meshStandardMaterial color="#3f3f46" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Ventana de Cristal Templado de Puerta */}
      <mesh position={[-mwWidth * 0.14, 0, mwDepth / 2 + 0.6]}>
        <boxGeometry args={[mwWidth * 0.64, mwHeight - 4, 0.3]} />
        <meshStandardMaterial color="#09090b" metalness={0.95} roughness={0.08} />
      </mesh>

      {/* Plato Giratorio Interior visible */}
      <mesh position={[-mwWidth * 0.14, -mwHeight / 2 + 3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[10, 10, 0.4, 24]} />
        <meshStandardMaterial color="#e4e4e7" transparent opacity={0.6} roughness={0.2} />
      </mesh>

      {/* Tirador Vertical de la Puerta */}
      <mesh position={[-mwWidth * 0.14 + (mwWidth * 0.64) / 2 - 2, 0, mwDepth / 2 + 1.8]}>
        <cylinderGeometry args={[0.4, 0.4, mwHeight - 10, 12]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Panel de Control Lateral Derecho */}
      <mesh position={[mwWidth / 2 - (mwWidth * 0.24) / 2 - 1.2, 0, mwDepth / 2 + 0.6]}>
        <boxGeometry args={[mwWidth * 0.22, mwHeight - 4, 0.3]} />
        <meshStandardMaterial color="#18181b" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Display LED */}
      <mesh position={[mwWidth / 2 - (mwWidth * 0.24) / 2 - 1.2, mwHeight / 2 - 4.5, mwDepth / 2 + 0.8]}>
        <boxGeometry args={[6.5, 2.8, 0.1]} />
        <meshStandardMaterial color="#000000" metalness={0.9} roughness={0.2} />
      </mesh>
      <Text position={[mwWidth / 2 - (mwWidth * 0.24) / 2 - 1.2, mwHeight / 2 - 4.5, mwDepth / 2 + 0.9]} fontSize={1.5} color="#22c55e" anchorX="center" anchorY="middle">
        02:00
      </Text>

      {/* Dial Giratorio Cromado */}
      <mesh position={[mwWidth / 2 - (mwWidth * 0.24) / 2 - 1.2, -1, mwDepth / 2 + 1.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.8, 1.8, 0.8, 20]} />
        <meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Botones de Inicio / Parada */}
      <mesh position={[mwWidth / 2 - (mwWidth * 0.24) / 2 - 1.2, -mwHeight / 2 + 5, mwDepth / 2 + 0.8]}>
        <boxGeometry args={[5.5, 2.0, 0.2]} />
        <meshStandardMaterial color="#ef4444" metalness={0.4} roughness={0.4} />
      </mesh>
    </group>
  );
}

interface CabinetProps extends CabinetType {
  index?: number;
}

export function Cabinet({ id, type, variant, width, height, depth, position, rotation, color, structureColor, doorColor, drawerFrontColor, drawerInnerColor, shelfColor, backColor, socleColor, structureMaterial, doorMaterial, drawerFrontMaterial, drawerInnerMaterial, shelfMaterial, backMaterial, socleMaterial, grainDirection, grainElements, hplBalancer, isOpen, openElements, index }: CabinetProps) {
   const cStructure = structureColor || color || '#f8fafc';
   const cDoors = doorColor || color || '#f8fafc';
   const cDrawers = drawerFrontColor || doorColor || color || '#f8fafc';
   const cInner = drawerInnerColor || color || '#f8fafc';
   const cBack = backColor || color || '#f8fafc';
   const cSocle = socleColor || '#111';

   const { activeCabinetId, setActiveCabinet, setDraggingCabinetId, setToolMode, showSocle, cabinets, viewMode, golaSystem, countertopConfig, qstoneCatalog } = useKitchenStore();
   const cabinetIndex = typeof index === 'number' ? index : cabinets.findIndex((c) => c.id === id);
   const isBaseOrIsland = type === 'base' || type === 'island';
   const isGolaActive = (golaSystem === 'aluminum' || golaSystem === 'black') && isBaseOrIsland;
   const golaColor = golaSystem === 'black' ? '#18181b' : '#d1d5db';
   const golaMetalness = golaSystem === 'black' ? 0.85 : 0.92;
   const golaRoughness = golaSystem === 'black' ? 0.35 : 0.20;

   // Cálculo paramétrico de regrueso y holgura de faldón de cubierta
   const activeProduct = countertopConfig?.enabled && isBaseOrIsland
      ? (qstoneCatalog?.find((p) => p.id === countertopConfig.selectedProductId) || qstoneCatalog?.[0])
      : null;
   const stoneThicknessCm = (activeProduct?.thicknessMm || 20) / 10;
   const rawRegruesoCm = (countertopConfig?.enabled && isBaseOrIsland) ? (countertopConfig.regruesoCm || 0) : 0;
   const regruesoDeduct = isGolaActive
      ? Math.max(0, rawRegruesoCm - 3.5)
      : (rawRegruesoCm > 0 ? (Math.max(0, rawRegruesoCm - stoneThicknessCm) + (rawRegruesoCm > stoneThicknessCm ? 0.3 : 0)) : 0);
   const showDimensions = useStore((s) => s.showDimensions);
   const dimensionLevel = useStore((s) => s.dimensionLevel);
   const isActive = activeCabinetId === id;
   const is2D = viewMode === '2d';

   const isElementOpen = (key: string) => {
      return openElements?.[key] ?? isOpen ?? false;
   };

   // Criterio Planimétrico BIM: Detección de extremos libres de fila / batería
   const safeRot = Number(rotation) || 0;
   const safePos: [number, number, number] = [
      Number(position?.[0]) || 0,
      Number(position?.[1]) || 0,
      Number(position?.[2]) || 0,
   ];
   const cos = Math.cos(safeRot);
   const sin = Math.sin(safeRot);

   const leftFlankWorld: [number, number] = [
      safePos[0] + (-width / 2) * cos,
      safePos[2] - (-width / 2) * sin,
   ];
   const rightFlankWorld: [number, number] = [
      safePos[0] + (width / 2) * cos,
      safePos[2] - (width / 2) * sin,
   ];

   const isFloorCabinet = type !== 'wall';

   const leftNeighbor = cabinets.find((c) => {
      if (c.id === id) return false;
      const cIsFloor = c.type !== 'wall';
      if (isFloorCabinet !== cIsFloor) return false; // distinto nivel (piso vs aéreo)
      const cSafeRot = Number(c.rotation) || 0;
      const cCos = Math.cos(cSafeRot);
      const cSin = Math.sin(cSafeRot);
      const cPos = c.position || [0, 0, 0];
      const cRight: [number, number] = [
         cPos[0] + (c.width / 2) * cCos,
         cPos[2] - (c.width / 2) * cSin,
      ];
      const cLeft: [number, number] = [
         cPos[0] + (-c.width / 2) * cCos,
         cPos[2] - (-c.width / 2) * cSin,
      ];
      const d1 = Math.hypot(leftFlankWorld[0] - cRight[0], leftFlankWorld[1] - cRight[1]);
      const d2 = Math.hypot(leftFlankWorld[0] - cLeft[0], leftFlankWorld[1] - cLeft[1]);
      const dCorner = Math.hypot(leftFlankWorld[0] - cPos[0], leftFlankWorld[1] - cPos[2]);
      return d1 < 5 || d2 < 5 || dCorner < (c.width / 2 + 5);
   });

   const rightNeighbor = cabinets.find((c) => {
      if (c.id === id) return false;
      const cIsFloor = c.type !== 'wall';
      if (isFloorCabinet !== cIsFloor) return false;
      const cSafeRot = Number(c.rotation) || 0;
      const cCos = Math.cos(cSafeRot);
      const cSin = Math.sin(cSafeRot);
      const cPos = c.position || [0, 0, 0];
      const cLeft: [number, number] = [
         cPos[0] + (-c.width / 2) * cCos,
         cPos[2] - (-c.width / 2) * cSin,
      ];
      const cRight: [number, number] = [
         cPos[0] + (c.width / 2) * cCos,
         cPos[2] - (c.width / 2) * cSin,
      ];
      const d1 = Math.hypot(rightFlankWorld[0] - cLeft[0], rightFlankWorld[1] - cLeft[1]);
      const d2 = Math.hypot(rightFlankWorld[0] - cRight[0], rightFlankWorld[1] - cRight[1]);
      const dCorner = Math.hypot(rightFlankWorld[0] - cPos[0], rightFlankWorld[1] - cPos[2]);
      return d1 < 5 || d2 < 5 || dCorner < (c.width / 2 + 5);
   });

   const hasNeighborLeft = Boolean(leftNeighbor);
   const hasNeighborRight = Boolean(rightNeighbor);

   // Cota de alto: Se dibuja únicamente en el extremo izquierdo libre, o en el extremo derecho si el izquierdo está tapado, o cuando está seleccionado
   const showHeightDimension = (!leftNeighbor) || isActive || (leftNeighbor && height > leftNeighbor.height + 5);

   // Cota de profundidad: Se dibuja únicamente en el extremo exterior libre derecho (o cuando está seleccionado)
   const showDepthDimension = (!rightNeighbor) || isActive;

   const getPieceGrain = (key: string) => {
      return grainElements?.[key] ?? grainDirection ?? 'vertical';
   };

   const parseColor = (val: string, mat?: 'melamina' | 'hpl', grainKey?: string) => {
      const isTex = !val.startsWith('#');
      return {
         color: isTex ? '#ffffff' : val,
         textureUrl: isTex ? val : undefined,
         materialType: mat,
         grainDirection: grainKey ? getPieceGrain(grainKey) : grainDirection,
         hplBalancerOverride: hplBalancer
      };
   };

   const thickness = 1.5;

   // Riel Gola Continuo (Provelcar 300cm):
   // Pasa continuo a lo ancho completo del gabinete (-width/2 a +width/2) alojándose perfectamente
   // en los rebajes CNC de los laterales sin interrupciones ni desfaces visuales.
   const golaSpan = width;
   const golaCenterX = 0;

   const isBaseOrTall = type === 'base' || type === 'tall' || type === 'island';
   const legsHeight = isBaseOrTall ? 10 : 0;
   const cabH = height - legsHeight;
   const innerW = width - (thickness * 2);
   const gap = 0.3; // 3mm de cantería
   const frontZ = depth/2 + thickness/2;

   const renderParametricBody = () => {
      // 1. Renderizado de Elementos de Decoración & Electrodomésticos Especializados
      if (type === 'decoration' || variant === 'deco_stove' || variant === 'deco_fridge' || variant === 'deco_hood' || variant === 'deco_plant') {
         if (variant === 'deco_stove') {
            return <StoveFDVUnique90 width={width} height={height} depth={depth} />;
         }
         if (variant === 'deco_fridge') {
            return <FridgeFDVSignatureSBS width={width} height={height} depth={depth} />;
         }
         if (variant === 'deco_hood') {
            return <HoodFDVConic90 width={width} height={height} depth={depth} />;
         }
         if (variant === 'deco_plant') {
            return <PlantDecoration width={width} height={height} depth={depth} />;
         }
      }

      const renderFronts = () => {
         if (variant === 'open') return null;

         let effectiveVariant = variant;
         if (!effectiveVariant) {
            effectiveVariant = width > 60 ? '2_doors' : '1_door';
         }
         
          const renderUndermountDrawer = (keyPrefix: string, yPos: number, drawerH: number, colorProps: any, drawerKey = 'drawer-0') => {
            const innerDepthMm = (depth - 1.5) * 10;
            const nominalLength = getNominalSlideLength(innerDepthMm) / 10; // cm
            const drawerBoxLength = nominalLength - 1.0; // SKL = NL - 10mm
            
            const drawerBoxZCenter = depth/2 - drawerBoxLength/2;
            const slideZCenter = depth/2 - nominalLength/2;
            
            // SKW = LW - 49mm (PDF spec)
            const skw = innerW - 4.9; 
            const sideHeight = Math.max(10, drawerH - 3);
            const yBoxCenter = yPos;
            const yBoxBottom = yBoxCenter - sideHeight/2;
            const yBottomPanel = yBoxBottom + 1.2;
            
            return (
               <group key={keyPrefix}>
                  {/* Fixed Undermount Slides (Attached to Cabinet) */}
                  <mesh position={[-innerW/2 + 1.225, yBoxBottom + 0.6, slideZCenter]}>
                     <boxGeometry args={[2.45, 1.2, nominalLength]} />
                     <meshStandardMaterial color="#999999" metalness={0.8} roughness={0.2} />
                  </mesh>
                  <mesh position={[innerW/2 - 1.225, yBoxBottom + 0.6, slideZCenter]}>
                     <boxGeometry args={[2.45, 1.2, nominalLength]} />
                     <meshStandardMaterial color="#999999" metalness={0.8} roughness={0.2} />
                  </mesh>

                  <AnimatedDrawer openZOffset={drawerBoxLength - 3} forceOpen={isElementOpen(drawerKey)}>
                     {/* Drawer Front */}
                     <Board position={[0, yBoxCenter, frontZ]} args={[width - gap*2, drawerH, thickness]} {...colorProps} isFrontPanel={true} globalPosition={[position[0] + 0, position[1] + yBoxCenter, position[2] + frontZ]} />
                     
                     {/* Drawer Box (Sides, Back) */}
                     <Board position={[-skw/2 + thickness/2, yBoxCenter, drawerBoxZCenter]} args={[thickness, sideHeight, drawerBoxLength]} {...parseColor(cInner, drawerInnerMaterial)} />
                     <Board position={[skw/2 - thickness/2, yBoxCenter, drawerBoxZCenter]} args={[thickness, sideHeight, drawerBoxLength]} {...parseColor(cInner, drawerInnerMaterial)} />
                     <Board position={[0, yBoxCenter + 0.6, drawerBoxZCenter - drawerBoxLength/2 + thickness/2]} args={[skw - thickness*2, sideHeight - 1.2, thickness]} {...parseColor(cInner, drawerInnerMaterial)} />
                     <Board position={[0, yBottomPanel + 0.15, drawerBoxZCenter]} args={[skw - thickness*2, 0.3, drawerBoxLength - thickness*2]} color="#dddddd" />
                     
                     {/* Uniones del Cajón a la Trasera */}
                     <AssemblyJoint position={[-skw/2 + thickness, yBoxCenter, drawerBoxZCenter - drawerBoxLength/2 + thickness]} length={sideHeight} axis="y" pointing="right" thickness={thickness} count={1} overrideAssemblyType={useStore.getState().drawerAssemblyType} />
                     <AssemblyJoint position={[skw/2 - thickness, yBoxCenter, drawerBoxZCenter - drawerBoxLength/2 + thickness]} length={sideHeight} axis="y" pointing="left" thickness={thickness} count={1} overrideAssemblyType={useStore.getState().drawerAssemblyType} />

                     {/* Movable Undermount Slides */}
                     <mesh position={[-skw/2 + thickness + 1.0, yBoxBottom + 0.6, drawerBoxZCenter]}>
                        <boxGeometry args={[2.0, 1.2, drawerBoxLength]} />
                        <meshStandardMaterial color="#cccccc" metalness={0.7} roughness={0.3} />
                     </mesh>
                     <mesh position={[skw/2 - thickness - 1.0, yBoxBottom + 0.6, drawerBoxZCenter]}>
                        <boxGeometry args={[2.0, 1.2, drawerBoxLength]} />
                        <meshStandardMaterial color="#cccccc" metalness={0.7} roughness={0.3} />
                     </mesh>
                  </AnimatedDrawer>
               </group>
            );
         };
         
         const renderShelfWithJoints = (yPos: number, keySuffix: string | number) => (
            <group key={`shelf-${keySuffix}`}>
               <Board position={[0, yPos, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial, 'shelf')} />
               <AssemblyJoint position={[-innerW/2, yPos, 0]} length={depth - 2} axis="z" pointing="right" thickness={thickness} count={2} />
               <AssemblyJoint position={[innerW/2, yPos, 0]} length={depth - 2} axis="z" pointing="left" thickness={thickness} count={2} />
            </group>
         );

         const renderGolaL = () => (
            <group key="gola-l-profile">
               {/* Perfil Gola Superior Tipo J Provelcar x175 Oficial */}
               <mesh 
                  geometry={getProvelcarX175Geometry(golaSpan)} 
                  position={[-golaSpan / 2, legsHeight + cabH, depth / 2]} 
                  rotation={[0, Math.PI / 2, 0]}
                  castShadow
               >
                  <meshStandardMaterial color={golaColor} metalness={golaMetalness} roughness={golaRoughness} side={THREE.DoubleSide} />
               </mesh>
            </group>
         );

         const renderGolaC = (yPos: number) => (
            <group key={`gola-c-profile-${yPos}`}>
               {/* Perfil Gola Intermedio Tipo C / U Provelcar x176 Oficial */}
               <mesh 
                  geometry={getProvelcarX176Geometry(golaSpan)} 
                  position={[-golaSpan / 2, yPos, depth / 2]} 
                  rotation={[0, Math.PI / 2, 0]}
                  castShadow
               >
                  <meshStandardMaterial color={golaColor} metalness={golaMetalness} roughness={golaRoughness} side={THREE.DoubleSide} />
               </mesh>
            </group>
         );
         
         if (effectiveVariant === '1_door' || effectiveVariant === 'tall_1_door') {
            const doorW = width - gap*2;
            const topDeduct = isGolaActive ? 3.5 : (isBaseOrIsland ? regruesoDeduct : 0);
            const doorH = Math.max(10, cabH - topDeduct - gap*2);
            const doorY = isGolaActive ? (legsHeight + (cabH - topDeduct)/2) : (legsHeight + gap + doorH/2);
            return (
               <>
                  {isGolaActive && renderGolaL()}
                  <AnimatedDoor
                     position={[0, doorY, frontZ]}
                     doorW={doorW}
                     doorH={doorH}
                     thickness={thickness}
                     isRightHinge={false}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-0')}
                     forceOpen={isElementOpen('door-0')}
                     globalPosition={[position[0], position[1] + doorY, position[2] + frontZ]}
                  />
                  {/* Repisas Interiores */}
                  {type === 'tall' ? (
                     <>
                        {renderShelfWithJoints(legsHeight + cabH * 0.20, 't1')}
                        {renderShelfWithJoints(legsHeight + cabH * 0.40, 't2')}
                        {renderShelfWithJoints(legsHeight + cabH * 0.60, 't3')}
                        {renderShelfWithJoints(legsHeight + cabH * 0.80, 't4')}
                     </>
                  ) : (
                     renderShelfWithJoints(legsHeight + cabH/2, 'b1')
                  )}
               </>
            );
         }

         if (effectiveVariant === 'tall_split_2_doors') {
            const baseH = 70;
            const lowerDoorH = baseH - gap*2;
            const upperDoorH = (cabH - baseH) - gap*2;
            const lowerY = legsHeight + gap + lowerDoorH/2;
            const upperY = legsHeight + baseH + gap + upperDoorH/2;
            return (
               <>
                  <AnimatedDoor
                     position={[0, lowerY, frontZ]}
                     doorW={width - gap*2}
                     doorH={lowerDoorH}
                     thickness={thickness}
                     isRightHinge={false}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-lower')}
                     forceOpen={isElementOpen('door-lower')}
                     globalPosition={[position[0], position[1] + lowerY, position[2] + frontZ]}
                  />
                  {renderShelfWithJoints(legsHeight + baseH, 'div')}
                  {renderShelfWithJoints(legsHeight + baseH / 2, 'low')}
                  <AnimatedDoor
                     position={[0, upperY, frontZ]}
                     doorW={width - gap*2}
                     doorH={upperDoorH}
                     thickness={thickness}
                     isRightHinge={false}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-upper')}
                     forceOpen={isElementOpen('door-upper')}
                     globalPosition={[position[0], position[1] + upperY, position[2] + frontZ]}
                  />
                  {renderShelfWithJoints(legsHeight + baseH + (cabH - baseH) * 0.25, 'u1')}
                  {renderShelfWithJoints(legsHeight + baseH + (cabH - baseH) * 0.50, 'u2')}
                  {renderShelfWithJoints(legsHeight + baseH + (cabH - baseH) * 0.75, 'u3')}
               </>
            );
         }

         if (effectiveVariant === 'tall_oven_micro') {
            const baseH = 70;
            const ovenH = 60;
            const microH = 38;
            const topH = Math.max(10, cabH - (baseH + ovenH + microH));
            const lowerDoorH = baseH - gap*2;
            const topDoorH = topH - gap*2;
            const lowerY = legsHeight + gap + lowerDoorH/2;
            const ovenY = legsHeight + baseH + ovenH/2;
            const microY = legsHeight + baseH + ovenH + microH/2;
            const topY = legsHeight + baseH + ovenH + microH + gap + topDoorH/2;
            return (
               <>
                  <AnimatedDoor
                     position={[0, lowerY, frontZ]}
                     doorW={width - gap*2}
                     doorH={lowerDoorH}
                     thickness={thickness}
                     isRightHinge={false}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-lower')}
                     forceOpen={isElementOpen('door-lower')}
                     globalPosition={[position[0], position[1] + lowerY, position[2] + frontZ]}
                  />
                  <Board position={[0, legsHeight + baseH / 2, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  <Board position={[0, legsHeight + baseH, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  <group position={[0, ovenY, 0]}>
                     <BuiltInOven width={innerW + 1.4} height={ovenH - 0.6} depth={depth - 4} />
                  </group>
                  <Board position={[0, legsHeight + baseH + ovenH, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  <group position={[0, microY, 0]}>
                     <BuiltInMicrowave width={innerW + 1.4} height={microH - 0.6} depth={depth - 4} />
                  </group>
                  <Board position={[0, legsHeight + baseH + ovenH + microH, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  {topDoorH > 10 && (
                     <AnimatedDoor
                        position={[0, topY, frontZ]}
                        doorW={width - gap*2}
                        doorH={topDoorH}
                        thickness={thickness}
                        isRightHinge={false}
                        colorProps={parseColor(cDoors, doorMaterial, 'door-top')}
                        forceOpen={isElementOpen('door-top')}
                        globalPosition={[position[0], position[1] + topY, position[2] + frontZ]}
                     />
                  )}
                  {topDoorH > 35 && (
                     <Board position={[0, legsHeight + baseH + ovenH + microH + topH/2, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  )}
               </>
            );
         }

         if (effectiveVariant === 'tall_microwave_niche') {
            const baseH = 70;
            const nicheH = 45;
            const topH = Math.max(10, cabH - (baseH + nicheH));
            const lowerDoorH = baseH - gap*2;
            const topDoorH = topH - gap*2;
            const lowerY = legsHeight + gap + lowerDoorH/2;
            const nicheShelfY = legsHeight + baseH;
            const topY = legsHeight + baseH + nicheH + gap + topDoorH/2;
            return (
               <>
                  <AnimatedDoor
                     position={[0, lowerY, frontZ]}
                     doorW={width - gap*2}
                     doorH={lowerDoorH}
                     thickness={thickness}
                     isRightHinge={false}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-lower')}
                     forceOpen={isElementOpen('door-lower')}
                     globalPosition={[position[0], position[1] + lowerY, position[2] + frontZ]}
                  />
                  <Board position={[0, legsHeight + baseH / 2, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  <Board position={[0, nicheShelfY, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  <group position={[0, nicheShelfY + thickness/2, 0]}>
                     <PortableMicrowave width={innerW} height={nicheH} depth={depth - 4} />
                  </group>
                  <Board position={[0, legsHeight + baseH + nicheH, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  {topDoorH > 10 && (
                     <AnimatedDoor
                        position={[0, topY, frontZ]}
                        doorW={width - gap*2}
                        doorH={topDoorH}
                        thickness={thickness}
                        isRightHinge={false}
                        colorProps={parseColor(cDoors, doorMaterial, 'door-top')}
                        forceOpen={isElementOpen('door-top')}
                        globalPosition={[position[0], position[1] + topY, position[2] + frontZ]}
                     />
                  )}
                  <Board position={[0, legsHeight + baseH + nicheH + topH * 0.33, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  <Board position={[0, legsHeight + baseH + nicheH + topH * 0.66, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
               </>
            );
         }

         if (effectiveVariant === 'tall_open' || (type === 'tall' && (effectiveVariant === 'open' || !effectiveVariant))) {
            return (
               <>
                  <Board position={[0, legsHeight + cabH * 0.17, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  <Board position={[0, legsHeight + cabH * 0.34, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  <Board position={[0, legsHeight + cabH * 0.51, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  <Board position={[0, legsHeight + cabH * 0.68, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  <Board position={[0, legsHeight + cabH * 0.85, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
               </>
            );
         }

         if (effectiveVariant === 'spice_rack') {
            const slideLength = depth - 5;
            const topDeduct = isGolaActive ? 3.5 : (isBaseOrIsland ? regruesoDeduct : 0);
            const doorH = Math.max(10, cabH - topDeduct - gap * 2);
            const doorY = isGolaActive ? (legsHeight + (cabH - topDeduct)/2) : (legsHeight + gap + doorH / 2);
            return (
               <>
                  {isGolaActive && renderGolaL()}
                  <AnimatedDrawer openZOffset={slideLength - 8} forceOpen={isElementOpen('drawer-0')}>
                     <Board position={[0, doorY, frontZ]} args={[width - gap * 2, doorH, thickness]} {...parseColor(cDoors, doorMaterial, 'drawer-0')} isFrontPanel={true} globalPosition={[position[0], position[1] + doorY, position[2] + frontZ]} />
                     {/* Cestas metálicas de especiero extraíble */}
                     <mesh position={[0, legsHeight + 8, 0]}>
                        <boxGeometry args={[Math.max(4, width - 4), 1.5, depth - 8]} />
                        <meshStandardMaterial color="#cccccc" metalness={0.8} roughness={0.2} />
                     </mesh>
                     <mesh position={[0, legsHeight + cabH / 2, 0]}>
                        <boxGeometry args={[Math.max(4, width - 4), 1.5, depth - 8]} />
                        <meshStandardMaterial color="#cccccc" metalness={0.8} roughness={0.2} />
                     </mesh>
                     {/* Postes cromados */}
                     <mesh position={[-width / 2 + 2.5, legsHeight + cabH / 2, -depth / 2 + 5]}>
                        <cylinderGeometry args={[0.3, 0.3, cabH - 12, 8]} />
                        <meshStandardMaterial color="#cccccc" metalness={0.9} roughness={0.1} />
                     </mesh>
                     <mesh position={[width / 2 - 2.5, legsHeight + cabH / 2, -depth / 2 + 5]}>
                        <cylinderGeometry args={[0.3, 0.3, cabH - 12, 8]} />
                        <meshStandardMaterial color="#cccccc" metalness={0.9} roughness={0.1} />
                     </mesh>
                  </AnimatedDrawer>
               </>
            );
         }
         
         if (effectiveVariant === '2_doors' || effectiveVariant === 'tall_2_doors') {
            const doorW = (width - gap*3) / 2;
            const topDeduct = isGolaActive ? 3.5 : (isBaseOrIsland ? regruesoDeduct : 0);
            const doorH = Math.max(10, cabH - topDeduct - gap*2);
            const doorY = isGolaActive ? (legsHeight + (cabH - topDeduct)/2) : (legsHeight + gap + doorH/2);
            const leftDoorX = -width/2 + gap + doorW/2;
            const rightDoorX = width/2 - gap - doorW/2;
            return (
               <>
                  {isGolaActive && renderGolaL()}
                  <AnimatedDoor
                     key="door-left"
                     position={[leftDoorX, doorY, frontZ]}
                     doorW={doorW}
                     doorH={doorH}
                     thickness={thickness}
                     isRightHinge={false}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-0')}
                     forceOpen={isElementOpen('door-0')}
                     globalPosition={[position[0] + leftDoorX, position[1] + doorY, position[2] + frontZ]}
                  />
                  <AnimatedDoor
                     key="door-right"
                     position={[rightDoorX, doorY, frontZ]}
                     doorW={doorW}
                     doorH={doorH}
                     thickness={thickness}
                     isRightHinge={true}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-1')}
                     forceOpen={isElementOpen('door-1')}
                     globalPosition={[position[0] + rightDoorX, position[1] + doorY, position[2] + frontZ]}
                  />
                  {/* Repisas Interiores */}
                  {type === 'tall' ? (
                     <>
                        {renderShelfWithJoints(legsHeight + cabH * 0.20, '2dt1')}
                        {renderShelfWithJoints(legsHeight + cabH * 0.40, '2dt2')}
                        {renderShelfWithJoints(legsHeight + cabH * 0.60, '2dt3')}
                        {renderShelfWithJoints(legsHeight + cabH * 0.80, '2dt4')}
                     </>
                  ) : (
                     renderShelfWithJoints(legsHeight + cabH/2, '2db1')
                  )}
               </>
            );
         }
         
         if (effectiveVariant === '1_door_1_drawer') {
            if (isGolaActive) {
               const golaRegruesoDeduct = Math.max(0, rawRegruesoCm - 3.5);
               const drawerH = Math.max(8, 14.5 - golaRegruesoDeduct);
               const yBoxCenter = legsHeight + cabH - 3.5 - drawerH / 2;
               const yGolaC = legsHeight + cabH - 3.5 - drawerH - 2.0;
               const doorH = Math.max(15, cabH - 3.5 - drawerH - 4.0 - gap * 3);
               const yDoorCenter = legsHeight + gap + doorH / 2;
               return (
                  <>
                     {renderGolaL()}
                     {renderGolaC(yGolaC)}
                     <AnimatedDoor
                        position={[0, yDoorCenter, frontZ]}
                        doorW={width - gap*2}
                        doorH={doorH}
                        thickness={thickness}
                        isRightHinge={false}
                        colorProps={parseColor(cDoors, doorMaterial, 'door-0')}
                        forceOpen={isElementOpen('door-0')}
                        globalPosition={[position[0], position[1] + yDoorCenter, position[2] + frontZ]}
                     />
                     <Board position={[0, yGolaC, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                     {doorH > 40 && (
                        <Board position={[0, legsHeight + gap + doorH / 2, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                     )}
                     {renderUndermountDrawer('d1', yBoxCenter, drawerH, parseColor(cDrawers, drawerFrontMaterial, 'drawer-0'), 'drawer-0')}
                  </>
               );
            }
            const deduct = isBaseOrIsland ? regruesoDeduct : 0;
            const drawerH = Math.max(8, 15 - deduct);
            const doorH = cabH - 15 - gap*3;
            const yBoxCenter = legsHeight + gap*2 + doorH + drawerH/2;
            const yDoorCenter = legsHeight + gap + doorH/2;
            return (
               <>
                  <AnimatedDoor
                     position={[0, yDoorCenter, frontZ]}
                     doorW={width - gap*2}
                     doorH={doorH}
                     thickness={thickness}
                     isRightHinge={false}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-0')}
                     forceOpen={isElementOpen('door-0')}
                     globalPosition={[position[0], position[1] + yDoorCenter, position[2] + frontZ]}
                  />
                  {/* Divisor fijo bajo el cajón */}
                  <Board position={[0, legsHeight + gap + doorH + gap, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  {doorH > 40 && (
                     <Board position={[0, legsHeight + gap + doorH / 2, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  )}
                  {renderUndermountDrawer('d1', yBoxCenter, drawerH, parseColor(cDrawers, drawerFrontMaterial, 'drawer-0'), 'drawer-0')}
               </>
            );
         }
         
         if (effectiveVariant === '4_drawers') {
            if (isGolaActive) {
               const golaRegruesoDeduct = Math.max(0, rawRegruesoCm - 3.5);
               const availH = Math.max(20, cabH - 3.5 - 4.0 - gap * 5 - golaRegruesoDeduct);
               const drawerH = availH / 4;
               const yGolaC = legsHeight + gap + (drawerH + gap) * 2 + 2.0;
               return (
                  <>
                     {renderGolaL()}
                     {renderGolaC(yGolaC)}
                     {[0,1,2,3].map(i => {
                       const yBoxCenter = legsHeight + gap + drawerH/2 + i*(drawerH + gap) + (i >= 2 ? 4.0 : 0);
                       return renderUndermountDrawer('d' + i, yBoxCenter, drawerH, parseColor(cDrawers, drawerFrontMaterial, `drawer-${i}`), `drawer-${i}`);
                     })}
                  </>
               );
            }
            const deduct = isBaseOrIsland ? regruesoDeduct : 0;
            const baseDrawerH = (cabH - gap*5) / 4;
            const topDrawerH = Math.max(8, baseDrawerH - deduct);
            return (
               <>
                  {[0,1,2,3].map(i => {
                    const currentH = i === 3 ? topDrawerH : baseDrawerH;
                    const yBoxCenter = i === 3
                      ? legsHeight + gap + 3*(baseDrawerH + gap) + topDrawerH/2
                      : legsHeight + gap + baseDrawerH/2 + i*(baseDrawerH + gap);
                    return renderUndermountDrawer('d' + i, yBoxCenter, currentH, parseColor(cDrawers, drawerFrontMaterial, `drawer-${i}`), `drawer-${i}`);
                  })}
               </>
            );
         }
         
         if (effectiveVariant === '2_pot_drawers') {
            if (isGolaActive) {
               const golaRegruesoDeduct = Math.max(0, rawRegruesoCm - 3.5);
               const availH = Math.max(20, cabH - 3.5 - 4.0 - gap * 3 - golaRegruesoDeduct);
               const drawerH = availH / 2;
               const yLower = legsHeight + gap + drawerH / 2;
               const yGolaC = legsHeight + gap + drawerH + 2.0;
               const yUpper = legsHeight + gap + drawerH + 4.0 + gap + drawerH / 2;
               return (
                  <>
                     {renderGolaL()}
                     {renderGolaC(yGolaC)}
                     {renderUndermountDrawer('p0', yLower, drawerH, parseColor(cDrawers, drawerFrontMaterial, 'drawer-0'), 'drawer-0')}
                     {renderUndermountDrawer('p1', yUpper, drawerH, parseColor(cDrawers, drawerFrontMaterial, 'drawer-1'), 'drawer-1')}
                  </>
               );
            }
            const deduct = isBaseOrIsland ? regruesoDeduct : 0;
            const baseH = (cabH - gap*3) / 2;
            const lowerH = baseH;
            const upperH = Math.max(10, baseH - deduct);
            const yLower = legsHeight + gap + lowerH / 2;
            const yUpper = legsHeight + gap + lowerH + gap + upperH / 2;
            return (
               <>
                  {renderUndermountDrawer('p0', yLower, lowerH, parseColor(cDrawers, drawerFrontMaterial, 'drawer-0'), 'drawer-0')}
                  {renderUndermountDrawer('p1', yUpper, upperH, parseColor(cDrawers, drawerFrontMaterial, 'drawer-1'), 'drawer-1')}
               </>
            );
         }

         if (effectiveVariant === 'corner_blind_right' || effectiveVariant === 'corner_blind_left' || effectiveVariant === 'corner_blind') {
            const isRight = effectiveVariant !== 'corner_blind_left';
            const blindW = Math.max(35, width / 2);
            const doorW = width - blindW - gap * 2;
            const topDeduct = isGolaActive ? 3.5 : (isBaseOrIsland ? regruesoDeduct : 0);
            const doorH = Math.max(10, cabH - topDeduct - gap * 2);
            const doorY = isGolaActive ? (legsHeight + (cabH - topDeduct)/2) : (legsHeight + gap + doorH / 2);
            
            const blindX = isRight ? (width / 2 - blindW / 2) : (-width / 2 + blindW / 2);
            const postX = isRight ? (width / 2 - blindW + thickness / 2) : (-width / 2 + blindW - thickness / 2);
            const doorX = isRight ? (-width / 2 + gap + doorW / 2) : (width / 2 - gap - doorW / 2);
            
            return (
               <>
                  {isGolaActive && renderGolaL()}
                  {/* Panel Ciego Frontal Fijo (Mismo decorativo de paredes/estructura) */}
                  <Board
                     position={[blindX, doorY, frontZ]}
                     args={[blindW, doorH, thickness]}
                     {...parseColor(cStructure, structureMaterial, 'blind')}
                     isFrontPanel={false}
                     globalPosition={[position[0] + blindX, position[1] + doorY, position[2] + frontZ]}
                  />

                  {/* Poste / Regleta Vertical de Amarre Interior */}
                  <Board
                     position={[postX, legsHeight + cabH / 2, isGolaActive ? depth / 2 - 2.8 - 5 : depth / 2 - 5]}
                     args={[thickness, cabH, 10]}
                     {...parseColor(cStructure, structureMaterial)}
                  />

                  {/* Puerta Frontal Batiente Abrible con Bisagras de Cazoleta en el lado exterior */}
                  <AnimatedDoor
                     position={[doorX, doorY, frontZ]}
                     doorW={doorW}
                     doorH={doorH}
                     thickness={thickness}
                     isRightHinge={!isRight}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-0')}
                     forceOpen={isElementOpen('door-0')}
                     globalPosition={[position[0] + doorX, position[1] + doorY, position[2] + frontZ]}
                  />

                  {/* Repisa Interior Transversal */}
                  <Board
                     position={[0, legsHeight + cabH / 2, 0]}
                     args={[innerW, thickness, depth - 4]}
                     {...parseColor(shelfColor || cStructure, shelfMaterial)}
                  />
               </>
            );
         }

         if (effectiveVariant === 'wall_corner_blind_right' || effectiveVariant === 'wall_corner_blind_left' || effectiveVariant === 'wall_corner_blind') {
            const isRight = effectiveVariant !== 'wall_corner_blind_left';
            const stripW = 5.5; // 55 mm según detalle técnico del PDF
            const doorW = width - stripW - gap * 3;
            const doorH = cabH - gap * 2;
            const doorY = legsHeight + gap + doorH / 2;

            const stripX = isRight ? (width / 2 - stripW / 2 - gap) : (-width / 2 + stripW / 2 + gap);
            const returnX = isRight ? (width / 2 - stripW + thickness / 2) : (-width / 2 + stripW - thickness / 2);
            const doorX = isRight ? (-width / 2 + gap + doorW / 2) : (width / 2 - gap - doorW / 2);

            return (
               <>
                  {/* Tapa Esquinero Frontal (Regleta exterior de esquina) */}
                  <Board
                     position={[stripX, doorY, frontZ]}
                     args={[stripW, doorH, thickness]}
                     {...parseColor(cStructure, structureMaterial, 'corner_strip')}
                     isFrontPanel={false}
                     globalPosition={[position[0] + stripX, position[1] + doorY, position[2] + frontZ]}
                  />

                  {/* Regleta Retorno / Pieza de Unión L Interior según lámina técnica PDF */}
                  <Board
                     position={[returnX, doorY, frontZ - stripW / 2 - thickness / 2]}
                     args={[thickness, doorH, stripW]}
                     {...parseColor(cStructure, structureMaterial, 'corner_return')}
                     isFrontPanel={false}
                  />

                  {/* Puerta Batiente con bisagras en el extremo exterior opuesto */}
                  <AnimatedDoor
                     position={[doorX, doorY, frontZ]}
                     doorW={doorW}
                     doorH={doorH}
                     thickness={thickness}
                     isRightHinge={!isRight}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-0')}
                     forceOpen={isElementOpen('door-0')}
                     globalPosition={[position[0] + doorX, position[1] + doorY, position[2] + frontZ]}
                  />

                  {/* Repisa Interior Regulable a media altura */}
                  <Board
                     position={[0, legsHeight + cabH / 2, 0]}
                     args={[innerW, thickness, depth - 4]}
                     {...parseColor(shelfColor || cStructure, shelfMaterial)}
                  />
               </>
            );
         }

         if (effectiveVariant === 'wine_rack' || effectiveVariant === 'base_wine_rack' || effectiveVariant === 'wall_wine_rack' || effectiveVariant === 'tall_wine_rack' || effectiveVariant === 'island_wine_rack') {
            // Opción A: Fabricación a disco (escuadradora/panelera) con frente enrasado a plomo con puertas/cajones
            const frontPlaneZ = depth / 2 + thickness;
            const usefulDepth = Math.min(depth - 2, 32); // Fondo útil para botellas estándar 32cm
            const falseBackZ = frontPlaneZ - usefulDepth - thickness / 2;
            const cellsZ = frontPlaneZ - usefulDepth / 2;

            // Cálculo paramétrico de columnas: Mínimo 10.5 cm libres por botella, máximo 5 corridas
            const minClearance = 10.5;
            const maxColsPossible = Math.floor((innerW + thickness) / (minClearance + thickness));
            const cols = Math.min(5, Math.max(1, maxColsPossible));
            const colWidth = (innerW - (cols - 1) * thickness) / cols;

            // Filas según altura del mueble (~12.5 cm por corrida de botella)
            const availableH = cabH - thickness * 2;
            const rows = Math.max(2, Math.floor(availableH / 12.5));
            const rowHeight = (availableH - (rows - 1) * thickness) / rows;

            const bottles: { x: number; y: number; key: string }[] = [];
            for (let c = 0; c < cols; c++) {
               const bX = -innerW / 2 + c * (colWidth + thickness) + colWidth / 2;
               for (let r = 0; r < rows; r++) {
                  const bY = legsHeight + thickness + r * (rowHeight + thickness) + rowHeight / 2;
                  bottles.push({ x: bX, y: bY, key: `bot-${c}-${r}` });
               }
            }

            return (
               <>
                  {/* Fondo Falso Vertical Estructural a 32cm útiles del frente */}
                  <Board
                     position={[0, legsHeight + cabH / 2, falseBackZ]}
                     args={[innerW, cabH - thickness * 2, thickness]}
                     {...parseColor(cStructure, structureMaterial, 'false_back')}
                  />

                  {/* Divisores Verticales de Celdas (entre columnas) */}
                  {cols > 1 && Array.from({ length: cols - 1 }).map((_, i) => {
                     const divX = -innerW / 2 + (i + 1) * (colWidth + thickness) - thickness / 2;
                     return (
                        <Board
                           key={`wine-vdiv-${i}`}
                           position={[divX, legsHeight + cabH / 2, cellsZ]}
                           args={[thickness, cabH - thickness * 2, usefulDepth]}
                           {...parseColor(shelfColor || cStructure, shelfMaterial)}
                        />
                     );
                  })}

                  {/* Repisas Horizontales de Celdas (entre filas) */}
                  {rows > 1 && Array.from({ length: rows - 1 }).map((_, j) => {
                     const divY = legsHeight + thickness + (j + 1) * (rowHeight + thickness) - thickness / 2;
                     return (
                        <Board
                           key={`wine-hdiv-${j}`}
                           position={[0, divY, cellsZ]}
                           args={[innerW, thickness, usefulDepth]}
                           {...parseColor(shelfColor || cStructure, shelfMaterial)}
                        />
                     );
                  })}

                  {/* Botellas de Vino 3D en los nichos */}
                  {bottles.map(b => (
                     <group key={b.key} position={[b.x, b.y, cellsZ]} rotation={[Math.PI / 2, 0, 0]}>
                        {/* Cuerpo de botella cilíndrica */}
                        <mesh position={[0, 0, 0]}>
                           <cylinderGeometry args={[3.6, 3.6, 17, 14]} />
                           <meshStandardMaterial color="#1a2f1a" roughness={0.2} metalness={0.15} />
                        </mesh>
                        {/* Hombro cónico */}
                        <mesh position={[0, 10, 0]}>
                           <cylinderGeometry args={[1.5, 3.6, 3, 14]} />
                           <meshStandardMaterial color="#1a2f1a" roughness={0.2} metalness={0.15} />
                        </mesh>
                        {/* Cuello */}
                        <mesh position={[0, 13.5, 0]}>
                           <cylinderGeometry args={[1.35, 1.35, 4, 14]} />
                           <meshStandardMaterial color="#1a2f1a" roughness={0.2} metalness={0.15} />
                        </mesh>
                        {/* Cápsula de botella burdeos */}
                        <mesh position={[0, 14.8, 0]}>
                           <cylinderGeometry args={[1.4, 1.4, 2.4, 14]} />
                           <meshStandardMaterial color="#7f1d1d" roughness={0.3} metalness={0.7} />
                        </mesh>
                     </group>
                  ))}
               </>
            );
         }

         if (effectiveVariant === 'wall_lift_up') {
            const doorW = width - gap * 2;
            const doorH = cabH - gap * 2;
            return (
               <>
                  <AnimatedLiftUpDoor
                     position={[0, legsHeight + cabH / 2, frontZ]}
                     doorW={doorW}
                     doorH={doorH}
                     thickness={thickness}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-lift')}
                     forceOpen={isElementOpen('door-lift')}
                     globalPosition={[position[0], position[1] + legsHeight + cabH / 2, position[2] + frontZ]}
                     innerDepth={depth - 2}
                  />
                  {cabH > 50 && renderShelfWithJoints(legsHeight + cabH / 2, 'wlu1')}
               </>
            );
         }

         if (effectiveVariant === 'wall_lift_up_double') {
            const sectionH = (cabH - gap * 3) / 2;
            const lowerDoorH = sectionH;
            const upperDoorH = sectionH;
            const lowerY = legsHeight + gap + lowerDoorH / 2;
            const upperY = legsHeight + gap + lowerDoorH + gap + upperDoorH / 2;
            return (
               <>
                  <AnimatedLiftUpDoor
                     key="lift-lower"
                     position={[0, lowerY, frontZ]}
                     doorW={width - gap * 2}
                     doorH={lowerDoorH}
                     thickness={thickness}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-lower')}
                     forceOpen={isElementOpen('door-lower')}
                     globalPosition={[position[0], position[1] + lowerY, position[2] + frontZ]}
                     innerDepth={depth - 2}
                  />
                  {/* Divisor horizontal fijo */}
                  {renderShelfWithJoints(legsHeight + lowerDoorH + gap * 1.5, 'wlud_div')}
                  <AnimatedLiftUpDoor
                     key="lift-upper"
                     position={[0, upperY, frontZ]}
                     doorW={width - gap * 2}
                     doorH={upperDoorH}
                     thickness={thickness}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-upper')}
                     forceOpen={isElementOpen('door-upper')}
                     globalPosition={[position[0], position[1] + upperY, position[2] + frontZ]}
                     innerDepth={depth - 2}
                  />
               </>
            );
         }

         if (effectiveVariant === 'wall_microwave_niche') {
            const nicheH = 38;
            const topH = Math.max(20, cabH - nicheH - gap * 2);
            const topDoorH = topH - gap * 2;
            const topY = legsHeight + nicheH + gap + topDoorH / 2;
            return (
               <>
                  {/* Divisor repisa sobre el nicho */}
                  {renderShelfWithJoints(legsHeight + nicheH, 'wmn_div')}
                  {/* Microondas portátil de sobremesa en el nicho inferior */}
                  <group position={[0, legsHeight + 2, 0]}>
                     <PortableMicrowave width={width - 4} height={nicheH - 4} depth={depth - 3} />
                  </group>
                  {/* Puerta superior elevable */}
                  <AnimatedLiftUpDoor
                     position={[0, topY, frontZ]}
                     doorW={width - gap * 2}
                     doorH={topDoorH}
                     thickness={thickness}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-top')}
                     forceOpen={isElementOpen('door-top')}
                     globalPosition={[position[0], position[1] + topY, position[2] + frontZ]}
                     innerDepth={depth - 2}
                  />
                  {topH > 45 && renderShelfWithJoints(legsHeight + nicheH + topH / 2, 'wmn_top_shelf')}
               </>
            );
         }

         if (effectiveVariant === 'wall_open' || (type === 'wall' && (effectiveVariant === 'open' || !effectiveVariant))) {
            return (
               <>
                  {renderShelfWithJoints(legsHeight + cabH * 0.33, 'wo1')}
                  {renderShelfWithJoints(legsHeight + cabH * 0.66, 'wo2')}
               </>
            );
         }
         return null;
      };

      return (
         <group position={[0, -height/2, 0]}>
            {isBaseOrTall && (
               <>
                  <mesh position={[-width/2 + 3, legsHeight/2, depth/2 - 5]} castShadow>
                     <cylinderGeometry args={[1.5, 1.5, legsHeight]} />
                     <meshStandardMaterial color="#111" roughness={0.8} />
                  </mesh>
                  <mesh position={[width/2 - 3, legsHeight/2, depth/2 - 5]} castShadow>
                     <cylinderGeometry args={[1.5, 1.5, legsHeight]} />
                     <meshStandardMaterial color="#111" roughness={0.8} />
                  </mesh>
                  <mesh position={[-width/2 + 3, legsHeight/2, -depth/2 + 5]} castShadow>
                     <cylinderGeometry args={[1.5, 1.5, legsHeight]} />
                     <meshStandardMaterial color="#111" roughness={0.8} />
                  </mesh>
                  <mesh position={[width/2 - 3, legsHeight/2, -depth/2 + 5]} castShadow>
                     <cylinderGeometry args={[1.5, 1.5, legsHeight]} />
                     <meshStandardMaterial color="#111" roughness={0.8} />
                  </mesh>
                  {/* Pata central si el ancho es mayor a 60cm */}
                  {width > 60 && (
                     <mesh position={[0, legsHeight/2, 0]} castShadow>
                        <cylinderGeometry args={[1.5, 1.5, legsHeight]} />
                        <meshStandardMaterial color="#111" roughness={0.8} />
                     </mesh>
                  )}
               </>
            )}
            
            {/* Renderizado de Laterales con Rebaje CNC para paso continuo de Riel Gola */}
            {(() => {
               const isWineRack = variant?.includes('wine_rack') || variant === 'base_wine_rack' || variant === 'wall_wine_rack' || variant === 'tall_wine_rack' || variant === 'island_wine_rack';
               const renderLateral = (isLeft: boolean) => {
                  const xPos = isLeft ? -width/2 + thickness/2 : width/2 - thickness/2;
                  const key = isLeft ? 'left' : 'right';

                  // Opción A: Botellero con laterales prolongados a escuadra (corte a disco) para enrasar a plomo con puertas/cajones contiguos
                  if (isWineRack) {
                     const wineDepth = depth + thickness;
                     const wineZ = thickness / 2;
                     return (
                        <Board 
                           key={`lat-${key}`}
                           position={[xPos, legsHeight + cabH/2, wineZ]} 
                           args={[thickness, cabH, wineDepth]} 
                           {...parseColor(cStructure, structureMaterial, key)} 
                        />
                     );
                  }

                  // Si Gola no está activo, el lateral se mantiene cerrado y completo al ras
                  if (!isGolaActive) {
                     return (
                        <Board 
                           key={`lat-${key}`}
                           position={[xPos, legsHeight + cabH/2, 0]} 
                           args={[thickness, cabH, depth]} 
                           {...parseColor(cStructure, structureMaterial, key)} 
                        />
                     );
                  }

                  // Lateral con Gola activo: Destaje CNC para paso continuo del riel Gola L (y Gola C si aplica)
                  const notchDepth = 2.8;
                  const notchLHeight = 5.8;
                  const backDepth = depth - notchDepth;
                  const zBack = -depth/2 + backDepth/2;
                  const zFront = depth/2 - notchDepth/2;

                  let effVariant = variant;
                  if (!effVariant) {
                     effVariant = width > 60 ? '2_doors' : '1_door';
                  }
                  const myHasGolaC = effVariant === '1_door_1_drawer' || effVariant === '2_pot_drawers' || effVariant === '4_drawers';
                  const neighbor = isLeft ? leftNeighbor : rightNeighbor;
                  const neighborVariant = neighbor?.variant;
                  const neighborHasGolaC = neighborVariant === '1_door_1_drawer' || neighborVariant === '2_pot_drawers' || neighborVariant === '4_drawers';
                  const hasGolaC = myHasGolaC || (Boolean(neighbor) && neighborHasGolaC);

                  const effGolaCVariant = myHasGolaC ? effVariant : (neighborVariant || effVariant);
                  let yGolaC = 0;
                  if (effGolaCVariant === '1_door_1_drawer') {
                     const drawerH = 14.5;
                     yGolaC = legsHeight + cabH - 3.5 - drawerH - 2.0;
                  } else if (effGolaCVariant === '2_pot_drawers') {
                     const availH = Math.max(20, cabH - 3.5 - 4.0 - gap * 3);
                     const drawerH = availH / 2;
                     yGolaC = legsHeight + gap + drawerH + 2.0;
                  } else if (effGolaCVariant === '4_drawers') {
                     const availH = Math.max(20, cabH - 3.5 - 4.0 - gap * 5);
                     const drawerH = availH / 4;
                     yGolaC = legsHeight + gap + (drawerH + gap) * 2 + 2.0;
                  }

                  const notchCHeight = 6.8;

                  return (
                     <group key={`lateral-${key}`}>
                        {/* Cuerpo trasero completo a toda la altura */}
                        <Board 
                           position={[xPos, legsHeight + cabH/2, zBack]} 
                           args={[thickness, cabH, backDepth]} 
                           {...parseColor(cStructure, structureMaterial, key)} 
                        />

                        {/* Cuerpo frontal con rebajes CNC para paso libre y continuo del perfil Gola */}
                        {!hasGolaC ? (
                           <Board 
                              position={[xPos, legsHeight + (cabH - notchLHeight)/2, zFront]} 
                              args={[thickness, cabH - notchLHeight, notchDepth]} 
                              {...parseColor(cStructure, structureMaterial, key)} 
                           />
                        ) : (
                           (() => {
                              const yCBottom = yGolaC - notchCHeight/2;
                              const yCTop = yGolaC + notchCHeight/2;
                              const yLBottom = legsHeight + cabH - notchLHeight;
                              const lowerH = Math.max(2, yCBottom - legsHeight);
                              const middleH = Math.max(2, yLBottom - yCTop);
                              return (
                                 <>
                                    <Board 
                                       position={[xPos, legsHeight + lowerH/2, zFront]} 
                                       args={[thickness, lowerH, notchDepth]} 
                                       {...parseColor(cStructure, structureMaterial, key)} 
                                    />
                                    <Board 
                                       position={[xPos, yCTop + middleH/2, zFront]} 
                                       args={[thickness, middleH, notchDepth]} 
                                       {...parseColor(cStructure, structureMaterial, key)} 
                                    />
                                 </>
                              );
                           })()
                        )}
                     </group>
                  );
               };

               return (
                  <>
                     {renderLateral(true)}
                     {renderLateral(false)}
                  </>
               );
            })()}
            {(() => {
               const isWineRack = variant?.includes('wine_rack') || variant === 'base_wine_rack' || variant === 'wall_wine_rack' || variant === 'tall_wine_rack' || variant === 'island_wine_rack';
               const botDepth = isWineRack ? depth + thickness : depth;
               const botZ = isWineRack ? thickness / 2 : 0;
               return (
                  <>
                     <Board position={[0, legsHeight + thickness/2, botZ]} args={[innerW, thickness, botDepth]} {...parseColor(cStructure, structureMaterial, 'bottom')} />
                     <Board position={[0, legsHeight + cabH/2, -depth/2 + thickness/2]} args={[innerW, cabH - thickness*2, thickness]} {...parseColor(cBack, backMaterial, 'back')} />
                     
                     {/* Uniones estructurales de Base a Laterales */}
                     <AssemblyJoint position={[-innerW/2, legsHeight + thickness/2, botZ]} length={botDepth} axis="z" pointing="right" thickness={thickness} count={2} />
                     <AssemblyJoint position={[innerW/2, legsHeight + thickness/2, botZ]} length={botDepth} axis="z" pointing="left" thickness={thickness} count={2} />
                  </>
               );
            })()}
            {type === 'base' || type === 'island' ? (
               <>
                  {(() => {
                     const isWineRack = variant?.includes('wine_rack') || variant === 'base_wine_rack' || variant === 'wall_wine_rack' || variant === 'tall_wine_rack' || variant === 'island_wine_rack';
                     const frontRailZ = isWineRack ? depth/2 + thickness - 5 : (isGolaActive ? depth/2 - 2.8 - 5 : depth/2 - 5);
                     return (
                        <>
                           <Board 
                              position={[0, height - thickness/2, frontRailZ]} 
                              args={[innerW, thickness, 10]} 
                              {...parseColor(cStructure, structureMaterial, 'top')} 
                           />
                           <Board position={[0, height - 5, -depth/2 + thickness * 1.5]} args={[innerW, 10, thickness]} {...parseColor(cStructure, structureMaterial, 'top')} />
                           {/* Amarres frontales y traseros a laterales */}
                           <AssemblyJoint 
                              position={[-innerW/2, height - thickness/2, frontRailZ]} 
                              length={10} axis="z" pointing="right" thickness={thickness} count={1} 
                           />
                           <AssemblyJoint 
                              position={[innerW/2, height - thickness/2, frontRailZ]} 
                              length={10} axis="z" pointing="left" thickness={thickness} count={1} 
                           />
                        </>
                     );
                  })()}
                  <AssemblyJoint position={[-innerW/2, height - 5, -depth/2 + thickness * 1.5]} length={10} axis="y" pointing="right" thickness={thickness} count={1} />
                  <AssemblyJoint position={[innerW/2, height - 5, -depth/2 + thickness * 1.5]} length={10} axis="y" pointing="left" thickness={thickness} count={1} />
               </>
            ) : (
               <>
                  <Board position={[0, height - thickness/2, 0]} args={[innerW, thickness, depth]} {...parseColor(cStructure, structureMaterial, 'top')} />
                  {/* Techo a laterales */}
                  <AssemblyJoint position={[-innerW/2, height - thickness/2, 0]} length={depth} axis="z" pointing="right" thickness={thickness} count={2} />
                  <AssemblyJoint position={[innerW/2, height - thickness/2, 0]} length={depth} axis="z" pointing="left" thickness={thickness} count={2} />
               </>
            )}
            {renderFronts()}
         </group>
      );
   };

   // Renderizado de cotas con el mismo criterio exacto de Closets
   const renderDimensions = () => {
      if (!showDimensions) return null;

      const isCornerBlind = variant?.startsWith('corner_blind') || variant === 'corner_blind' || variant?.startsWith('wall_corner_blind');
      const isWineRack = variant?.includes('wine_rack');
      const doorCount = variant === '2_doors' ? 2 : (variant === '1_door' || variant === 'spice_rack' || isCornerBlind ? 1 : 0);
      const doorW = doorCount === 2 
         ? (width - gap*3) / 2 
         : (variant?.startsWith('wall_corner_blind')
            ? (width - 5.5 - gap*3)
            : (isCornerBlind ? (width - Math.max(35, width/2) - gap*2) : (width - gap*2)));
      const doorH = variant === '1_door_1_drawer' ? cabH - 15 - gap*3 : cabH - gap*2;

      return (
         <group renderOrder={999}>
            {/* --- NIVEL 1 / GLOBAL: Ancho, Alto, Profundidad y Rótulo de Piso --- */}
            {/* Ancho Total (Top Tier) */}
            <group position={[0, height / 2 + 7, depth / 2]}>
               <Line points={[[-width / 2, 0, 0], [width / 2, 0, 0]]} color="#f97316" lineWidth={2} depthTest={false} renderOrder={999} />
               <Line points={[[-width / 2, -2.5, 0], [-width / 2, 2.5, 0]]} color="#f97316" lineWidth={2} depthTest={false} renderOrder={999} />
               <Line points={[[width / 2, -2.5, 0], [width / 2, 2.5, 0]]} color="#f97316" lineWidth={2} depthTest={false} renderOrder={999} />
               <Text position={[0, 4, 0]} fontSize={7} color="#f97316" anchorX="center" anchorY="bottom" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{Number(width.toFixed(1))} cm</Text>
            </group>

            {/* Alto Total (Left Tier) - Solo en extremo libre izquierdo o cuando está seleccionado */}
            {showHeightDimension && (
               <group position={[-width / 2 - 10, 0, depth / 2]}>
                  <Line points={[[0, -height / 2, 0], [0, height / 2, 0]]} color="#f97316" lineWidth={2} depthTest={false} renderOrder={999} />
                  <Line points={[[-2.5, -height / 2, 0], [2.5, -height / 2, 0]]} color="#f97316" lineWidth={2} depthTest={false} renderOrder={999} />
                  <Line points={[[-2.5, height / 2, 0], [2.5, height / 2, 0]]} color="#f97316" lineWidth={2} depthTest={false} renderOrder={999} />
                  <Text position={[-4, 0, 0]} rotation={[0, 0, Math.PI/2]} fontSize={7} color="#f97316" anchorX="center" anchorY="bottom" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{Number(height.toFixed(1))} cm</Text>
               </group>
            )}

            {/* Profundidad Total (Right Tier) - Solo en extremo libre derecho o cuando está seleccionado */}
            {showDepthDimension && (
               <group position={[width / 2 + 10, -height / 2 + 2, 0]}>
                  <Line points={[[0, 0, -depth / 2], [0, 0, depth / 2]]} color="#f97316" lineWidth={2} depthTest={false} renderOrder={999} />
                  <Line points={[[-2.5, 0, -depth / 2], [2.5, 0, -depth / 2]]} color="#f97316" lineWidth={2} depthTest={false} renderOrder={999} />
                  <Line points={[[-2.5, 0, depth / 2], [2.5, 0, depth / 2]]} color="#f97316" lineWidth={2} depthTest={false} renderOrder={999} />
                  <Text position={[3, 4, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={7} color="#f97316" anchorX="center" anchorY="bottom" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{Number(depth.toFixed(1))} cm</Text>
               </group>
            )}

            {/* Rótulo en el piso - Se muestra cuando está seleccionado o en vista 2D o si es módulo aislado */}
            {(isActive || is2D || (!leftNeighbor && !rightNeighbor)) && (
               <Text 
                  position={[0, -height / 2 + 0.1, depth / 2 + 16]} 
                  rotation={[-Math.PI / 2, 0, 0]}
                  fontSize={6.5} 
                  color="#f97316" 
                  anchorX="center" 
                  anchorY="bottom"
                  outlineWidth={0.5}
                  outlineColor="#000000"
                  material-depthTest={false}
                  material-toneMapped={false}
                  renderOrder={1000}
               >
                  {variant === 'deco_stove' ? 'COCINA FDV 90' :
                   variant === 'deco_fridge' ? 'REFRIGERADOR SBS' :
                   variant === 'deco_plant' ? 'PLANTA INTERIOR' :
                   variant?.startsWith('wall_corner_blind') ? 'AÉREO ESQUINERO' :
                   variant?.includes('wine_rack') ? 'BOTELLERO' :
                   (variant ? variant.replace(/_/g, ' ').toUpperCase() : type.toUpperCase())}
               </Text>
            )}

            {/* Si es elemento de decoración o electrodoméstico fijo, omitir cotas de carpintería interna */}
            {type === 'decoration' || variant === 'deco_stove' || variant === 'deco_fridge' || variant === 'deco_plant' ? null : (
               <>
                  {/* --- NIVEL >= 2: Cotas de Módulo (Azul) --- */}
                  {dimensionLevel >= 2 && (
               <group position={[0, -height / 2 + (legsHeight > 0 ? legsHeight / 2 : 1.5), depth / 2 + 8]}>
                  <Line points={[[-width / 2, 0, 0], [width / 2, 0, 0]]} color="#3b82f6" lineWidth={1.5} depthTest={false} renderOrder={999} />
                  <Line points={[[-width / 2, -1.5, 0], [-width / 2, 1.5, 0]]} color="#3b82f6" lineWidth={1.5} depthTest={false} renderOrder={999} />
                  <Line points={[[width / 2, -1.5, 0], [width / 2, 1.5, 0]]} color="#3b82f6" lineWidth={1.5} depthTest={false} renderOrder={999} />
                  <Text position={[0, 2, 0]} fontSize={5} color="#3b82f6" anchorX="center" anchorY="bottom" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{Number(width.toFixed(1))} cm</Text>
               </group>
            )}

            {/* --- NIVEL >= 3: Cotas de Puertas (Rosado) --- */}
            {dimensionLevel >= 3 && (doorCount > 0 || variant === '1_door_1_drawer') && (
               <>
                  {isCornerBlind ? (
                     (() => {
                        const isRight = variant !== 'corner_blind_left';
                        const blindW = Math.max(35, width / 2);
                        const cDoorW = width - blindW - gap * 2;
                        const blindX = isRight ? (width / 2 - blindW / 2) : (-width / 2 + blindW / 2);
                        const doorX = isRight ? (-width / 2 + gap + cDoorW / 2) : (width / 2 - gap - cDoorW / 2);
                        return (
                           <>
                              {/* Cota Puerta */}
                              <group position={[doorX, -height/2 + legsHeight + cabH/2 + doorH/2 + 5, frontZ + 2]}>
                                 <Line points={[[-cDoorW / 2, 0, 0], [cDoorW / 2, 0, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                                 <Line points={[[-cDoorW / 2, -2, 0], [-cDoorW / 2, 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                                 <Line points={[[cDoorW / 2, -2, 0], [cDoorW / 2, 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                                 <Text position={[0, 3, 0]} fontSize={4.5} color="#ec4899" anchorX="center" anchorY="bottom" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>Pta {cDoorW.toFixed(1)}</Text>
                              </group>
                              {/* Cota Panel Ciego */}
                              <group position={[blindX, -height/2 + legsHeight + cabH/2 + doorH/2 + 5, frontZ + 2]}>
                                 <Line points={[[-blindW / 2, 0, 0], [blindW / 2, 0, 0]]} color="#94a3b8" lineWidth={1.5} depthTest={false} renderOrder={999} />
                                 <Line points={[[-blindW / 2, -2, 0], [-blindW / 2, 2, 0]]} color="#94a3b8" lineWidth={1.5} depthTest={false} renderOrder={999} />
                                 <Line points={[[blindW / 2, -2, 0], [blindW / 2, 2, 0]]} color="#94a3b8" lineWidth={1.5} depthTest={false} renderOrder={999} />
                                 <Text position={[0, 3, 0]} fontSize={4.5} color="#94a3b8" anchorX="center" anchorY="bottom" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>Ciego {blindW.toFixed(1)}</Text>
                              </group>
                           </>
                        );
                     })()
                  ) : doorCount === 2 ? (
                     <>
                        {/* Puerta Izquierda */}
                        <group position={[-width/4, -height/2 + legsHeight + cabH/2 + doorH/2 + 5, frontZ + 2]}>
                           <Line points={[[-doorW / 2, 0, 0], [doorW / 2, 0, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                           <Line points={[[-doorW / 2, -2, 0], [-doorW / 2, 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                           <Line points={[[doorW / 2, -2, 0], [doorW / 2, 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                           <Text position={[0, 3, 0]} fontSize={4.5} color="#ec4899" anchorX="center" anchorY="bottom" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{doorW.toFixed(1)}</Text>
                        </group>
                        {/* Puerta Derecha */}
                        <group position={[width/4, -height/2 + legsHeight + cabH/2 + doorH/2 + 5, frontZ + 2]}>
                           <Line points={[[-doorW / 2, 0, 0], [doorW / 2, 0, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                           <Line points={[[-doorW / 2, -2, 0], [-doorW / 2, 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                           <Line points={[[doorW / 2, -2, 0], [doorW / 2, 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                           <Text position={[0, 3, 0]} fontSize={4.5} color="#ec4899" anchorX="center" anchorY="bottom" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{doorW.toFixed(1)}</Text>
                        </group>
                        {/* Alto de Puerta */}
                        {(!leftNeighbor || isActive) && (
                           <group position={[-width / 2 - 5, -height / 2 + legsHeight + cabH/2, frontZ + 2]}>
                              <Line points={[[0, -doorH / 2, 0], [0, doorH / 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                              <Line points={[[-2, -doorH / 2, 0], [2, -doorH / 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                              <Line points={[[-2, doorH / 2, 0], [2, doorH / 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                              <Text position={[-3, 0, 0]} rotation={[0, 0, Math.PI/2]} fontSize={4.5} color="#ec4899" anchorX="center" anchorY="bottom" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{doorH.toFixed(1)}</Text>
                           </group>
                        )}
                     </>
                  ) : (
                     <>
                        {/* Ancho Puerta Simple */}
                        <group position={[0, -height/2 + legsHeight + (variant === '1_door_1_drawer' ? gap + doorH/2 : cabH/2) + doorH/2 + 5, frontZ + 2]}>
                           <Line points={[[-doorW / 2, 0, 0], [doorW / 2, 0, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                           <Line points={[[-doorW / 2, -2, 0], [-doorW / 2, 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                           <Line points={[[doorW / 2, -2, 0], [doorW / 2, 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                           <Text position={[0, 3, 0]} fontSize={4.5} color="#ec4899" anchorX="center" anchorY="bottom" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{doorW.toFixed(1)}</Text>
                        </group>
                        {/* Alto Puerta Simple */}
                        {(!leftNeighbor || isActive) && (
                           <group position={[-width / 2 - 5, -height / 2 + legsHeight + (variant === '1_door_1_drawer' ? gap + doorH/2 : cabH/2), frontZ + 2]}>
                              <Line points={[[0, -doorH / 2, 0], [0, doorH / 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                              <Line points={[[-2, -doorH / 2, 0], [2, -doorH / 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                              <Line points={[[-2, doorH / 2, 0], [2, doorH / 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                              <Text position={[-3, 0, 0]} rotation={[0, 0, Math.PI/2]} fontSize={4.5} color="#ec4899" anchorX="center" anchorY="bottom" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{doorH.toFixed(1)}</Text>
                           </group>
                        )}
                     </>
                  )}
               </>
            )}

            {/* --- NIVEL >= 4: Cotas de Cajones (Verde) --- */}
            {dimensionLevel >= 4 && (!rightNeighbor || isActive) && (
               <>
                  {variant === '1_door_1_drawer' && (
                     <group position={[width / 2 + 5, -height / 2 + legsHeight + gap*2 + (cabH - 15 - gap*3) + 7.5, frontZ + 2]}>
                        <Line points={[[0, -7.5, 0], [0, 7.5, 0]]} color="#10b981" lineWidth={1.5} depthTest={false} renderOrder={999} />
                        <Line points={[[-2, -7.5, 0], [2, -7.5, 0]]} color="#10b981" lineWidth={1.5} depthTest={false} renderOrder={999} />
                        <Line points={[[-2, 7.5, 0], [2, 7.5, 0]]} color="#10b981" lineWidth={1.5} depthTest={false} renderOrder={999} />
                        <Text position={[3, 0, 0]} fontSize={4.5} color="#10b981" anchorX="left" anchorY="middle" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>15.0</Text>
                     </group>
                  )}
                  {variant === '4_drawers' && (() => {
                     const dH = (cabH - gap*5) / 4;
                     return (
                        <>
                           {[0, 1, 2, 3].map((i) => {
                              const yC = -height / 2 + legsHeight + gap + dH/2 + i*(dH + gap);
                              return (
                                 <group key={`dim-dr-${i}`} position={[width / 2 + 5, yC, frontZ + 2]}>
                                    <Line points={[[0, -dH/2, 0], [0, dH/2, 0]]} color="#10b981" lineWidth={1.5} depthTest={false} renderOrder={999} />
                                    <Line points={[[-2, -dH/2, 0], [2, -dH/2, 0]]} color="#10b981" lineWidth={1.5} depthTest={false} renderOrder={999} />
                                    <Line points={[[-2, dH/2, 0], [2, dH/2, 0]]} color="#10b981" lineWidth={1.5} depthTest={false} renderOrder={999} />
                                    <Text position={[3, 0, 0]} fontSize={4.5} color="#10b981" anchorX="left" anchorY="middle" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{dH.toFixed(1)}</Text>
                                 </group>
                              );
                           })}
                        </>
                     );
                  })()}
                  {variant === '2_pot_drawers' && (() => {
                     const dH = (cabH - gap*3) / 2;
                     return (
                        <>
                           {[0, 1].map((i) => {
                              const yC = -height / 2 + legsHeight + gap + dH/2 + i*(dH + gap);
                              return (
                                 <group key={`dim-pot-${i}`} position={[width / 2 + 5, yC, frontZ + 2]}>
                                    <Line points={[[0, -dH/2, 0], [0, dH/2, 0]]} color="#10b981" lineWidth={1.5} depthTest={false} renderOrder={999} />
                                    <Line points={[[-2, -dH/2, 0], [2, -dH/2, 0]]} color="#10b981" lineWidth={1.5} depthTest={false} renderOrder={999} />
                                    <Line points={[[-2, dH/2, 0], [2, dH/2, 0]]} color="#10b981" lineWidth={1.5} depthTest={false} renderOrder={999} />
                                    <Text position={[3, 0, 0]} fontSize={4.5} color="#10b981" anchorX="left" anchorY="middle" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{dH.toFixed(1)}</Text>
                                 </group>
                              );
                           })}
                        </>
                     );
                  })()}
               </>
            )}

            {/* --- NIVEL >= 4: Cotas de Interiores / Repisas (Morado) --- */}
            {dimensionLevel >= 4 && (
               <group position={[0, -height / 2 + legsHeight + cabH / 2, frontZ + 2]}>
                  <Line points={[[0, -cabH / 4, 0], [0, cabH / 4, 0]]} color="#8b5cf6" lineWidth={1} depthTest={false} renderOrder={999} />
                  <Text position={[3, 0, 0]} fontSize={4} color="#8b5cf6" anchorX="left" anchorY="middle" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{(cabH / 2).toFixed(1)}</Text>
               </group>
            )}

            {/* --- NIVEL >= 5: Identificación BIM de Módulos (N° y Nombre idéntico al Menú de Escena) --- */}
            {dimensionLevel >= 5 && cabinetIndex >= 0 && (
               <group position={[0, height / 2 + 10, 0]} renderOrder={1000}>
                  {/* Línea conectora hacia la cubierta / cuerpo del mueble */}
                  <Line points={[[0, 0, 0], [0, -8, 0]]} color={isActive ? "#f97316" : "#38bdf8"} lineWidth={1.6} dashed dashScale={1} depthTest={false} renderOrder={999} />

                  {/* Badge Flotante con Orientación Billboard hacia la Cámara */}
                  <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
                     {(() => {
                        const cabLabel = getCabinetLabel({ type, variant, width, height, depth }, cabinetIndex);
                        const fullText = `MOD ${cabinetIndex + 1} • ${cabLabel}`;
                        const badgeW = Math.max(30, fullText.length * 2.3 + 8);
                        return (
                           <group>
                              {/* Placa de fondo de alto contraste */}
                              <mesh position={[0, 0, -0.05]} renderOrder={999}>
                                 <planeGeometry args={[badgeW, 9]} />
                                 <meshBasicMaterial color={isActive ? "#0f172a" : "#1e293b"} transparent opacity={0.92} depthTest={false} />
                              </mesh>

                              {/* Borde perimetral técnico */}
                              <Line
                                 points={[
                                    [-badgeW / 2, -4.5, 0], [badgeW / 2, -4.5, 0],
                                    [badgeW / 2, 4.5, 0], [-badgeW / 2, 4.5, 0],
                                    [-badgeW / 2, -4.5, 0]
                                 ]}
                                 color={isActive ? "#f97316" : "#0284c7"}
                                 lineWidth={1.8}
                                 depthTest={false}
                                 renderOrder={1000}
                              />

                              {/* Texto Identificador Exacto del Menú de Escena */}
                              <Text
                                 position={[0, 0, 0.05]}
                                 fontSize={4.6}
                                 color={isActive ? "#fb923c" : "#f8fafc"}
                                 anchorX="center"
                                 anchorY="middle"
                                 fontWeight="bold"
                                 outlineWidth={0.4}
                                 outlineColor="#000000"
                                 material-depthTest={false}
                                 material-toneMapped={false}
                                 renderOrder={1001}
                              >
                                 {fullText}
                              </Text>
                           </group>
                        );
                     })()}
                  </Billboard>
               </group>
            )}
            </>
            )}
         </group>
      );
   };

   const isDecoration = type === 'decoration' || variant?.startsWith('deco_');

   return (
     <group
       position={safePos}
       rotation={[0, safeRot, 0]}
       onPointerDown={(e) => {
          const currentTool = useKitchenStore.getState().toolMode;
          if (currentTool.startsWith('place_') || currentTool === 'move_active') {
            return;
          }
          e.stopPropagation();
          setActiveCabinet(id);
          setToolMode('move_active');
        }}
     >
       {renderParametricBody()}
       {isActive && (
         <mesh>
           <boxGeometry args={[width + 2, height + 2, depth + 2]} />
           <meshBasicMaterial transparent opacity={0} depthWrite={false} />
           <Edges scale={1.0} color={isDecoration ? "#38bdf8" : "#f97316"} threshold={15} />
         </mesh>
       )}
       {renderDimensions()}
     </group>
   );
}
