import React, { useRef, useState } from 'react';
import { CabinetType, useKitchenStore } from '../../store/kitchenStore';
import { useStore } from '../../store';
import { Edges, Line, Text } from '@react-three/drei';
import { Board } from '../Board';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { getNominalSlideLength } from '../../utils/manufacturing';
import { StoveFDVUnique90 } from './decoration/StoveFDVUnique90';
import { FridgeFDVSignatureSBS } from './decoration/FridgeFDVSignatureSBS';
import { PlantDecoration } from './decoration/PlantDecoration';

export function AnimatedDrawer({ children, openZOffset, forceOpen, onClickAction }: { children: React.ReactNode, openZOffset: number, forceOpen?: boolean, onClickAction?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  
  useCursor(hovered);

  React.useEffect(() => {
    if (forceOpen !== undefined) setIsOpen(forceOpen);
  }, [forceOpen]);
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      const targetZ = isOpen ? openZOffset : 0;
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, delta * 3);
    }
  });

  const toggle = (e: any) => {
    e.stopPropagation();
    if (onClickAction) onClickAction();
    else setIsOpen(prev => !prev);
  };

  return (
    <group 
      ref={groupRef}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
      onPointerDown={toggle}
      onClick={toggle}
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
  const groupRef = useRef<THREE.Group>(null);

  useCursor(hovered);

  React.useEffect(() => {
    if (forceOpen !== undefined) setIsOpen(forceOpen);
  }, [forceOpen]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      const targetRotation = isOpen ? (isRightHinge ? Math.PI * 0.55 : -Math.PI * 0.55) : 0;
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotation, delta * 3.5);
    }
  });

  const hingeXOffset = isRightHinge ? doorW / 2 : -doorW / 2;
  const hingeDir = isRightHinge ? -1 : 1;

  const hingeYs = doorH > 180
    ? [-doorH / 2 + 10, -doorH / 6, doorH / 6, doorH / 2 - 10]
    : (doorH > 140
      ? [-doorH / 2 + 12, 0, doorH / 2 - 12]
      : [-doorH / 2 + 10, doorH / 2 - 10]);

  const toggle = (e: any) => {
    e.stopPropagation();
    if (onClickAction) onClickAction();
    else setIsOpen(prev => !prev);
  };

  return (
    <group
      position={[position[0] + hingeXOffset, position[1], position[2] - thickness / 2]}
      ref={groupRef}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
      onPointerDown={toggle}
      onClick={toggle}
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

export function Cabinet({ id, type, variant, width, height, depth, position, rotation, color, structureColor, doorColor, drawerFrontColor, drawerInnerColor, shelfColor, backColor, socleColor }: CabinetType) {
   const cStructure = structureColor || color || '#f8fafc';
   const cDoors = doorColor || color || '#f8fafc';
   const cDrawers = drawerFrontColor || doorColor || color || '#f8fafc';
   const cInner = drawerInnerColor || color || '#f8fafc';
   const cBack = backColor || color || '#f8fafc';
   const cSocle = socleColor || '#111';

   const { activeCabinetId, setActiveCabinet, showSocle, cabinets, viewMode } = useKitchenStore();
   const showDimensions = useStore((s) => s.showDimensions);
   const dimensionLevel = useStore((s) => s.dimensionLevel);
   const isActive = activeCabinetId === id;
   const is2D = viewMode === '2d';

   // Criterio Planimétrico BIM: Detección de extremos libres de fila / batería
   const cos = Math.cos(rotation || 0);
   const sin = Math.sin(rotation || 0);

   const leftFlankWorld: [number, number] = [
      position[0] + (-width / 2) * cos,
      position[2] + (-width / 2) * sin,
   ];
   const rightFlankWorld: [number, number] = [
      position[0] + (width / 2) * cos,
      position[2] + (width / 2) * sin,
   ];

   const isFloorCabinet = type !== 'wall';

   const leftNeighbor = cabinets.find((c) => {
      if (c.id === id) return false;
      const cIsFloor = c.type !== 'wall';
      if (isFloorCabinet !== cIsFloor) return false; // distinto nivel (piso vs aéreo)
      const cCos = Math.cos(c.rotation || 0);
      const cSin = Math.sin(c.rotation || 0);
      const cRight: [number, number] = [
         c.position[0] + (c.width / 2) * cCos,
         c.position[2] + (c.width / 2) * cSin,
      ];
      const cLeft: [number, number] = [
         c.position[0] + (-c.width / 2) * cCos,
         c.position[2] + (-c.width / 2) * cSin,
      ];
      const d1 = Math.hypot(leftFlankWorld[0] - cRight[0], leftFlankWorld[1] - cRight[1]);
      const d2 = Math.hypot(leftFlankWorld[0] - cLeft[0], leftFlankWorld[1] - cLeft[1]);
      return d1 < 5 || d2 < 5;
   });

   const rightNeighbor = cabinets.find((c) => {
      if (c.id === id) return false;
      const cIsFloor = c.type !== 'wall';
      if (isFloorCabinet !== cIsFloor) return false;
      const cCos = Math.cos(c.rotation || 0);
      const cSin = Math.sin(c.rotation || 0);
      const cLeft: [number, number] = [
         c.position[0] + (-c.width / 2) * cCos,
         c.position[2] + (-c.width / 2) * cSin,
      ];
      const cRight: [number, number] = [
         c.position[0] + (c.width / 2) * cCos,
         c.position[2] + (c.width / 2) * cSin,
      ];
      const d1 = Math.hypot(rightFlankWorld[0] - cLeft[0], rightFlankWorld[1] - cLeft[1]);
      const d2 = Math.hypot(rightFlankWorld[0] - cRight[0], rightFlankWorld[1] - cRight[1]);
      return d1 < 5 || d2 < 5;
   });

   // Cota de alto: Se dibuja únicamente en el extremo izquierdo libre, o en el extremo derecho si el izquierdo está tapado, o cuando está seleccionado
   const showHeightDimension = (!leftNeighbor) || isActive || (leftNeighbor && height > leftNeighbor.height + 5);

   // Cota de profundidad: Se dibuja únicamente en el extremo exterior libre derecho (o cuando está seleccionado)
   const showDepthDimension = (!rightNeighbor) || isActive;

   const parseColor = (val: string) => val.startsWith('#') ? { color: val } : { textureUrl: val, color: '#ffffff' };

   const thickness = 1.5;

   const isBaseOrTall = type === 'base' || type === 'tall' || type === 'island';
   const legsHeight = isBaseOrTall ? 10 : 0;
   const cabH = height - legsHeight;
   const innerW = width - (thickness * 2);
   const gap = 0.3; // 3mm de cantería
   const frontZ = depth/2 + thickness/2;

   const renderParametricBody = () => {
      // 1. Renderizado de Elementos de Decoración & Electrodomésticos Especializados
      if (type === 'decoration' || variant === 'deco_stove' || variant === 'deco_fridge' || variant === 'deco_plant') {
         if (variant === 'deco_stove') {
            return <StoveFDVUnique90 width={width} height={height} depth={depth} />;
         }
         if (variant === 'deco_fridge') {
            return <FridgeFDVSignatureSBS width={width} height={height} depth={depth} />;
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
         
         const renderUndermountDrawer = (keyPrefix: string, yPos: number, drawerH: number, colorProps: any) => {
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

                  <AnimatedDrawer openZOffset={drawerBoxLength - 3}>
                     {/* Drawer Front */}
                     <Board position={[0, yBoxCenter, frontZ]} args={[width - gap*2, drawerH, thickness]} {...colorProps} isFrontPanel={true} globalPosition={[position[0] + 0, position[1] + yBoxCenter, position[2] + frontZ]} />
                     
                     {/* Drawer Box (Sides, Back) */}
                     <Board position={[-skw/2 + thickness/2, yBoxCenter, drawerBoxZCenter]} args={[thickness, sideHeight, drawerBoxLength]} {...parseColor(cInner)} />
                     <Board position={[skw/2 - thickness/2, yBoxCenter, drawerBoxZCenter]} args={[thickness, sideHeight, drawerBoxLength]} {...parseColor(cInner)} />
                     <Board position={[0, yBoxCenter + 0.6, drawerBoxZCenter - drawerBoxLength/2 + thickness/2]} args={[skw - thickness*2, sideHeight - 1.2, thickness]} {...parseColor(cInner)} />
                     <Board position={[0, yBottomPanel + 0.15, drawerBoxZCenter]} args={[skw - thickness*2, 0.3, drawerBoxLength - thickness*2]} color="#dddddd" />
                     
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
         
         if (effectiveVariant === '1_door' || effectiveVariant === 'tall_1_door') {
            const doorW = width - gap*2;
            const doorH = cabH - gap*2;
            return (
               <>
                  <AnimatedDoor
                     position={[0, legsHeight + cabH/2, frontZ]}
                     doorW={doorW}
                     doorH={doorH}
                     thickness={thickness}
                     isRightHinge={false}
                     colorProps={parseColor(cDoors)}
                     globalPosition={[position[0], position[1] + legsHeight + cabH/2, position[2] + frontZ]}
                  />
                  {/* Repisas Interiores */}
                  {type === 'tall' ? (
                     <>
                        <Board position={[0, legsHeight + cabH * 0.20, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                        <Board position={[0, legsHeight + cabH * 0.40, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                        <Board position={[0, legsHeight + cabH * 0.60, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                        <Board position={[0, legsHeight + cabH * 0.80, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                     </>
                  ) : (
                     <Board position={[0, legsHeight + cabH/2, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
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
                     colorProps={parseColor(cDoors)}
                     globalPosition={[position[0], position[1] + lowerY, position[2] + frontZ]}
                  />
                  <Board position={[0, legsHeight + baseH, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                  <Board position={[0, legsHeight + baseH / 2, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                  <AnimatedDoor
                     position={[0, upperY, frontZ]}
                     doorW={width - gap*2}
                     doorH={upperDoorH}
                     thickness={thickness}
                     isRightHinge={false}
                     colorProps={parseColor(cDoors)}
                     globalPosition={[position[0], position[1] + upperY, position[2] + frontZ]}
                  />
                  <Board position={[0, legsHeight + baseH + (cabH - baseH) * 0.25, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                  <Board position={[0, legsHeight + baseH + (cabH - baseH) * 0.50, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                  <Board position={[0, legsHeight + baseH + (cabH - baseH) * 0.75, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
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
                     colorProps={parseColor(cDoors)}
                     globalPosition={[position[0], position[1] + lowerY, position[2] + frontZ]}
                  />
                  <Board position={[0, legsHeight + baseH / 2, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                  <Board position={[0, legsHeight + baseH, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                  <group position={[0, ovenY, 0]}>
                     <BuiltInOven width={innerW + 1.4} height={ovenH - 0.6} depth={depth - 4} />
                  </group>
                  <Board position={[0, legsHeight + baseH + ovenH, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                  <group position={[0, microY, 0]}>
                     <BuiltInMicrowave width={innerW + 1.4} height={microH - 0.6} depth={depth - 4} />
                  </group>
                  <Board position={[0, legsHeight + baseH + ovenH + microH, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                  {topDoorH > 10 && (
                     <AnimatedDoor
                        position={[0, topY, frontZ]}
                        doorW={width - gap*2}
                        doorH={topDoorH}
                        thickness={thickness}
                        isRightHinge={false}
                        colorProps={parseColor(cDoors)}
                        globalPosition={[position[0], position[1] + topY, position[2] + frontZ]}
                     />
                  )}
                  {topDoorH > 35 && (
                     <Board position={[0, legsHeight + baseH + ovenH + microH + topH/2, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
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
                     colorProps={parseColor(cDoors)}
                     globalPosition={[position[0], position[1] + lowerY, position[2] + frontZ]}
                  />
                  <Board position={[0, legsHeight + baseH / 2, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                  <Board position={[0, nicheShelfY, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                  <group position={[0, nicheShelfY + thickness/2, 0]}>
                     <PortableMicrowave width={innerW} height={nicheH} depth={depth - 4} />
                  </group>
                  <Board position={[0, legsHeight + baseH + nicheH, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                  {topDoorH > 10 && (
                     <AnimatedDoor
                        position={[0, topY, frontZ]}
                        doorW={width - gap*2}
                        doorH={topDoorH}
                        thickness={thickness}
                        isRightHinge={false}
                        colorProps={parseColor(cDoors)}
                        globalPosition={[position[0], position[1] + topY, position[2] + frontZ]}
                     />
                  )}
                  <Board position={[0, legsHeight + baseH + nicheH + topH * 0.33, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                  <Board position={[0, legsHeight + baseH + nicheH + topH * 0.66, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
               </>
            );
         }

         if (effectiveVariant === 'tall_open' || (type === 'tall' && (effectiveVariant === 'open' || !effectiveVariant))) {
            return (
               <>
                  <Board position={[0, legsHeight + cabH * 0.17, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                  <Board position={[0, legsHeight + cabH * 0.34, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                  <Board position={[0, legsHeight + cabH * 0.51, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                  <Board position={[0, legsHeight + cabH * 0.68, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                  <Board position={[0, legsHeight + cabH * 0.85, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
               </>
            );
         }

         if (effectiveVariant === 'spice_rack') {
            const slideLength = depth - 5;
            const doorH = cabH - gap * 2;
            return (
               <AnimatedDrawer openZOffset={slideLength - 8}>
                  <Board position={[0, legsHeight + cabH / 2, frontZ]} args={[width - gap * 2, doorH, thickness]} {...parseColor(cDoors)} isFrontPanel={true} globalPosition={[position[0], position[1] + legsHeight + cabH / 2, position[2] + frontZ]} />
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
            );
         }
         
         if (effectiveVariant === '2_doors' || effectiveVariant === 'tall_2_doors') {
            const doorW = (width - gap*3) / 2;
            const doorH = cabH - gap*2;
            const leftDoorX = -width/2 + gap + doorW/2;
            const rightDoorX = width/2 - gap - doorW/2;
            return (
               <>
                  <AnimatedDoor
                     key="door-left"
                     position={[leftDoorX, legsHeight + cabH/2, frontZ]}
                     doorW={doorW}
                     doorH={doorH}
                     thickness={thickness}
                     isRightHinge={false}
                     colorProps={parseColor(cDoors)}
                     globalPosition={[position[0] + leftDoorX, position[1] + legsHeight + cabH/2, position[2] + frontZ]}
                  />
                  <AnimatedDoor
                     key="door-right"
                     position={[rightDoorX, legsHeight + cabH/2, frontZ]}
                     doorW={doorW}
                     doorH={doorH}
                     thickness={thickness}
                     isRightHinge={true}
                     colorProps={parseColor(cDoors)}
                     globalPosition={[position[0] + rightDoorX, position[1] + legsHeight + cabH/2, position[2] + frontZ]}
                  />
                  {/* Repisas Interiores */}
                  {type === 'tall' ? (
                     <>
                        <Board position={[0, legsHeight + cabH * 0.20, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                        <Board position={[0, legsHeight + cabH * 0.40, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                        <Board position={[0, legsHeight + cabH * 0.60, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                        <Board position={[0, legsHeight + cabH * 0.80, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                     </>
                  ) : (
                     <Board position={[0, legsHeight + cabH/2, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                  )}
               </>
            );
         }
         
         if (effectiveVariant === '1_door_1_drawer') {
            const drawerH = 15;
            const doorH = cabH - drawerH - gap*3;
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
                     colorProps={parseColor(cDoors)}
                     globalPosition={[position[0], position[1] + yDoorCenter, position[2] + frontZ]}
                  />
                  {/* Divisor fijo bajo el cajón */}
                  <Board position={[0, legsHeight + gap + doorH + gap, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                  {doorH > 40 && (
                     <Board position={[0, legsHeight + gap + doorH / 2, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure)} />
                  )}
                  {renderUndermountDrawer('d1', yBoxCenter, drawerH, parseColor(cDrawers))}
               </>
            );
         }
         
         if (effectiveVariant === '4_drawers') {
            const drawerH = (cabH - gap*5) / 4;
            return (
               <>
                  {[0,1,2,3].map(i => {
                    const yBoxCenter = legsHeight + gap + drawerH/2 + i*(drawerH + gap);
                    return renderUndermountDrawer('d' + i, yBoxCenter, drawerH, parseColor(cDrawers));
                  })}
               </>
            );
         }
         
         if (effectiveVariant === '2_pot_drawers') {
            const drawerH = (cabH - gap*3) / 2;
            return (
               <>
                  {[0,1].map(i => {
                    const yBoxCenter = legsHeight + gap + drawerH/2 + i*(drawerH + gap);
                    return renderUndermountDrawer('p' + i, yBoxCenter, drawerH, parseColor(cDrawers));
                  })}
               </>
            );
         }

         if (effectiveVariant === 'corner_blind_right' || effectiveVariant === 'corner_blind_left' || effectiveVariant === 'corner_blind') {
            const isRight = effectiveVariant !== 'corner_blind_left';
            const blindW = Math.max(35, width / 2);
            const doorW = width - blindW - gap * 2;
            const doorH = cabH - gap * 2;
            
            const blindX = isRight ? (width / 2 - blindW / 2) : (-width / 2 + blindW / 2);
            const postX = isRight ? (width / 2 - blindW + thickness / 2) : (-width / 2 + blindW - thickness / 2);
            const doorX = isRight ? (-width / 2 + gap + doorW / 2) : (width / 2 - gap - doorW / 2);
            
            return (
               <>
                  {/* Panel Ciego Frontal Fijo (Mismo decorativo de paredes/estructura) */}
                  <Board
                     position={[blindX, legsHeight + cabH / 2, frontZ]}
                     args={[blindW, doorH, thickness]}
                     {...parseColor(cStructure)}
                     isFrontPanel={false}
                     globalPosition={[position[0] + blindX, position[1] + legsHeight + cabH / 2, position[2] + frontZ]}
                  />

                  {/* Poste / Regleta Vertical de Amarre Interior */}
                  <Board
                     position={[postX, legsHeight + cabH / 2, depth / 2 - 5]}
                     args={[thickness, cabH, 10]}
                     {...parseColor(cStructure)}
                  />

                  {/* Puerta Frontal Batiente Abrible con Bisagras de Cazoleta en el lado exterior */}
                  <AnimatedDoor
                     position={[doorX, legsHeight + cabH / 2, frontZ]}
                     doorW={doorW}
                     doorH={doorH}
                     thickness={thickness}
                     isRightHinge={!isRight}
                     colorProps={parseColor(cDoors)}
                     globalPosition={[position[0] + doorX, position[1] + legsHeight + cabH / 2, position[2] + frontZ]}
                  />

                  {/* Repisa Interior Transversal */}
                  <Board
                     position={[0, legsHeight + cabH / 2, 0]}
                     args={[innerW, thickness, depth - 4]}
                     {...parseColor(shelfColor || cStructure)}
                  />
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
            
            <Board position={[-width/2 + thickness/2, legsHeight + cabH/2, 0]} args={[thickness, cabH, depth]} {...parseColor(cStructure)} />
            <Board position={[width/2 - thickness/2, legsHeight + cabH/2, 0]} args={[thickness, cabH, depth]} {...parseColor(cStructure)} />
            <Board position={[0, legsHeight + thickness/2, 0]} args={[innerW, thickness, depth]} {...parseColor(cStructure)} />
            <Board position={[0, legsHeight + cabH/2, -depth/2 + thickness/2]} args={[innerW, cabH - thickness*2, thickness]} {...parseColor(cBack)} />
            
            {type === 'base' || type === 'island' ? (
               <>
                  <Board position={[0, height - thickness/2, depth/2 - 5]} args={[innerW, thickness, 10]} {...parseColor(cStructure)} />
                  <Board position={[0, height - 5, -depth/2 + thickness * 1.5]} args={[innerW, 10, thickness]} {...parseColor(cStructure)} />
               </>
            ) : (
               <Board position={[0, height - thickness/2, 0]} args={[innerW, thickness, depth]} {...parseColor(cStructure)} />
            )}
            {renderFronts()}
         </group>
      );
   };

   // Renderizado de cotas con el mismo criterio exacto de Closets
   const renderDimensions = () => {
      if (!showDimensions) return null;

      const isCornerBlind = variant?.startsWith('corner_blind') || variant === 'corner_blind';
      const doorCount = variant === '2_doors' ? 2 : (variant === '1_door' || variant === 'spice_rack' || isCornerBlind ? 1 : 0);
      const doorW = doorCount === 2 ? (width - gap*3) / 2 : (isCornerBlind ? (width - Math.max(35, width/2) - gap*2) : (width - gap*2));
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

            {/* --- NIVEL >= 5: Cotas de Interiores / Repisas (Morado) --- */}
            {dimensionLevel >= 5 && (
               <group position={[0, -height / 2 + legsHeight + cabH / 2, frontZ + 2]}>
                  <Line points={[[0, -cabH / 4, 0], [0, cabH / 4, 0]]} color="#8b5cf6" lineWidth={1} depthTest={false} renderOrder={999} />
                  <Text position={[3, 0, 0]} fontSize={4} color="#8b5cf6" anchorX="left" anchorY="middle" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{(cabH / 2).toFixed(1)}</Text>
               </group>
            )}
            </>
            )}
         </group>
      );
   };

   return (
     <group position={position} rotation={[0, rotation, 0]} onPointerDown={(e) => { e.stopPropagation(); setActiveCabinet(id); }}>
       {renderParametricBody()}
       {isActive && (
         <mesh>
           <boxGeometry args={[width + 2, height + 2, depth + 2]} />
           <meshBasicMaterial transparent opacity={0} depthWrite={false} />
           <Edges scale={1.0} color="#f97316" threshold={15} />
         </mesh>
       )}
       {renderDimensions()}
     </group>
   );
}
