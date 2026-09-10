import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useKitchenStore, CabinetType } from '../../store/kitchenStore';
import { QSTONE_SINKS, FDV_COOKTOPS, SinkSpec } from '../../types/countertop';
import { detectContinuousCabinetRuns, ContinuousRunInfo } from '../../utils/countertopNesting';

// =========================================================================
// 3D MODEL: GRIFERÍA MONOMANDO DE ALTA GAMA (L-NECK MIXER FAUCET)
// =========================================================================
function DeckMixerFaucet3D({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base de fijación sobre cubierta */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[2.5, 2.7, 0.8, 32]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.96} roughness={0.16} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[2.0, 2.4, 0.4, 32]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.2} />
      </mesh>

      {/* Columna vertical principal */}
      <mesh position={[0, 9.5, 0]}>
        <cylinderGeometry args={[1.7, 1.7, 17, 32]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.18} />
      </mesh>

      {/* Caño horizontal en L hacia el centro de la poza */}
      <mesh position={[0, 18, 9]}>
        <cylinderGeometry args={[1.2, 1.2, 18, 24]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.18} />
      </mesh>

      {/* Codo de unión 90° */}
      <mesh position={[0, 18, 0]}>
        <sphereGeometry args={[1.6, 24, 24]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.18} />
      </mesh>

      {/* Puntera / Aireador direccionador de agua */}
      <mesh position={[0, 15.5, 17.5]}>
        <cylinderGeometry args={[1.1, 1.3, 4, 24]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.96} roughness={0.15} />
      </mesh>
      <mesh position={[0, 13.4, 17.5]}>
        <cylinderGeometry args={[1.0, 1.0, 0.3, 24]} />
        <meshStandardMaterial color="#64748b" metalness={0.4} roughness={0.7} />
      </mesh>

      {/* Manilla monomando lateral */}
      <group position={[2.2, 6.5, 0]} rotation={[0, 0, -0.25]}>
        <mesh position={[0.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[1.2, 1.2, 1.2, 24]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.2} />
        </mesh>
        <mesh position={[0.6, 3.5, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 7, 20]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.97} roughness={0.15} />
        </mesh>
      </group>
    </group>
  );
}

// =========================================================================
// 3D MODEL: CESTA Y VÁLVULA DE DESAGÜE Ø90mm CON RANURAS RADIALES
// =========================================================================
function DrainBasketStrainer3D({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Aro exterior cromado en el fondo */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.2, 5.8, 32]} />
        <meshStandardMaterial color="#f1f5f9" metalness={0.98} roughness={0.12} side={THREE.DoubleSide} />
      </mesh>

      {/* Copa de drenaje profunda */}
      <mesh position={[0, -0.8, 0]}>
        <cylinderGeometry args={[4.2, 3.6, 1.6, 32]} />
        <meshStandardMaterial color="#64748b" metalness={0.88} roughness={0.25} />
      </mesh>

      {/* Canastillo colador con fondo perforado */}
      <mesh position={[0, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.8, 32]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.92} roughness={0.2} />
      </mesh>

      {/* Ranuras oscuras radiales simuladas del colador */}
      {[0, 45, 90, 135].map((angle, idx) => (
        <mesh key={idx} position={[0, -0.38, 0]} rotation={[-Math.PI / 2, 0, (angle * Math.PI) / 180]}>
          <planeGeometry args={[0.4, 2.6]} />
          <meshBasicMaterial color="#1e293b" />
        </mesh>
      ))}

      {/* Perilla central cilíndrica para jalar el tapón */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 1.8, 20]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.98} roughness={0.12} />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <sphereGeometry args={[0.65, 16, 16]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.98} roughness={0.12} />
      </mesh>
    </group>
  );
}

// =========================================================================
// 3D MODEL: REBOSADERO VERTICAL (OVERFLOW SLOTS)
// =========================================================================
function OverflowSlots3D({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Placa posterior oscura */}
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[4.5, 2.2, 0.1]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </mesh>
      {/* 4 Ranuras verticales de acero inoxidable */}
      {[-1.5, -0.5, 0.5, 1.5].map((x, idx) => (
        <mesh key={idx} position={[x, 0, 0.05]}>
          <boxGeometry args={[0.35, 1.6, 0.1]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.92} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

// =========================================================================
// 3D MODEL: LAVAPLATOS BAJO CUBIERTA REALISTA (ALFA ONEC 3018)
// =========================================================================
function AlfaOnec3018Realistic({
  position,
  stoneThicknessCm,
}: {
  position: [number, number, number];
  stoneThicknessCm: number;
}) {
  const spec = QSTONE_SINKS.alfa_onec_3018!;
  const w = spec.cutoutWidthMm / 10; // 69.5 cm
  const d = spec.cutoutDepthMm / 10; // 40.0 cm
  const h = 22; // 22 cm profundidad de bacin
  const wallThick = 0.35; // 3.5mm acero

  return (
    <group position={position}>
      {/* Pestaña perimetral superior que se fija BAJO la piedra (undermount flange) */}
      <mesh position={[0, -stoneThicknessCm - 0.15, 0]}>
        <boxGeometry args={[w + 6, 0.3, d + 6]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.2} />
      </mesh>

      {/* CUBA PRINCIPAL PROFUNDA */}
      <group position={[0, -stoneThicknessCm - h / 2, 0]}>
        {/* Fondo metálico de la poza con leve declive */}
        <mesh position={[0, -h / 2 + wallThick / 2, 0]} receiveShadow>
          <boxGeometry args={[w, wallThick, d]} />
          <meshStandardMaterial
            color="#cbd5e1"
            metalness={0.94}
            roughness={0.22}
          />
        </mesh>

        {/* Líneas en cruz prensadas en el fondo ("X" drainage channels) */}
        {[-0.5, 0.5].map((side, i) => (
          <mesh
            key={i}
            position={[0, -h / 2 + wallThick + 0.04, 0]}
            rotation={[-Math.PI / 2, 0, Math.atan2(d, w) * side]}
          >
            <planeGeometry args={[Math.hypot(w, d) * 0.88, 0.12]} />
            <meshBasicMaterial color="#94a3b8" />
          </mesh>
        ))}

        {/* Pared trasera */}
        <mesh position={[0, 0, -d / 2 + wallThick / 2]}>
          <boxGeometry args={[w, h, wallThick]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.94} roughness={0.2} />
        </mesh>

        {/* Pared frontal */}
        <mesh position={[0, 0, d / 2 - wallThick / 2]}>
          <boxGeometry args={[w, h, wallThick]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.94} roughness={0.2} />
        </mesh>

        {/* Pared lateral izquierda */}
        <mesh position={[-w / 2 + wallThick / 2, 0, 0]}>
          <boxGeometry args={[wallThick, h, d]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.94} roughness={0.22} />
        </mesh>

        {/* Pared lateral derecha */}
        <mesh position={[w / 2 - wallThick / 2, 0, 0]}>
          <boxGeometry args={[wallThick, h, d]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.94} roughness={0.22} />
        </mesh>

        {/* Válvula y canastillo de desagüe en el fondo */}
        <DrainBasketStrainer3D position={[0, -h / 2 + wallThick + 0.05, -3]} />

        {/* Rebosadero vertical en la pared posterior */}
        <OverflowSlots3D position={[0, h / 2 - 4.5, -d / 2 + wallThick + 0.05]} />
      </group>

      {/* Grifería Monomando montada en la cubierta detrás de la poza */}
      <DeckMixerFaucet3D position={[0, 0, -d / 2 - 5]} />
    </group>
  );
}

// =========================================================================
// 3D MODEL: LAVAPLATOS BAJO CUBIERTA REALISTA (ALFA TWOC F5858A - 2 CUBAS)
// =========================================================================
function AlfaTwocF5858aRealistic({
  position,
  stoneThicknessCm,
}: {
  position: [number, number, number];
  stoneThicknessCm: number;
}) {
  const spec = QSTONE_SINKS.alfa_twoc_f5858a!;
  const w = spec.cutoutWidthMm / 10; // 73 cm
  const d = spec.cutoutDepthMm / 10; // 40 cm
  const h = 21;
  const bowlW = (w - 2.5) / 2; // ~35.2 cm por cuba
  const wallThick = 0.35;

  return (
    <group position={position}>
      {/* Pestaña perimetral superior */}
      <mesh position={[0, -stoneThicknessCm - 0.15, 0]}>
        <boxGeometry args={[w + 6, 0.3, d + 6]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.2} />
      </mesh>

      {/* Puente divisor central entre las dos cubas */}
      <mesh position={[0, -stoneThicknessCm - 1.5, 0]}>
        <boxGeometry args={[2.5, 3, d]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.18} />
      </mesh>

      {/* CUBA IZQUIERDA */}
      <group position={[-w / 2 + bowlW / 2, -stoneThicknessCm - h / 2, 0]}>
        <mesh position={[0, -h / 2 + wallThick / 2, 0]} receiveShadow>
          <boxGeometry args={[bowlW, wallThick, d]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.94} roughness={0.22} />
        </mesh>
        <mesh position={[0, 0, -d / 2 + wallThick / 2]}>
          <boxGeometry args={[bowlW, h, wallThick]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.94} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, d / 2 - wallThick / 2]}>
          <boxGeometry args={[bowlW, h, wallThick]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.94} roughness={0.2} />
        </mesh>
        <mesh position={[-bowlW / 2 + wallThick / 2, 0, 0]}>
          <boxGeometry args={[wallThick, h, d]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.94} roughness={0.22} />
        </mesh>
        <DrainBasketStrainer3D position={[0, -h / 2 + wallThick + 0.05, -2]} />
      </group>

      {/* CUBA DERECHA */}
      <group position={[w / 2 - bowlW / 2, -stoneThicknessCm - h / 2, 0]}>
        <mesh position={[0, -h / 2 + wallThick / 2, 0]} receiveShadow>
          <boxGeometry args={[bowlW, wallThick, d]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.94} roughness={0.22} />
        </mesh>
        <mesh position={[0, 0, -d / 2 + wallThick / 2]}>
          <boxGeometry args={[bowlW, h, wallThick]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.94} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, d / 2 - wallThick / 2]}>
          <boxGeometry args={[bowlW, h, wallThick]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.94} roughness={0.2} />
        </mesh>
        <mesh position={[bowlW / 2 - wallThick / 2, 0, 0]}>
          <boxGeometry args={[wallThick, h, d]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.94} roughness={0.22} />
        </mesh>
        <DrainBasketStrainer3D position={[0, -h / 2 + wallThick + 0.05, -2]} />
        <OverflowSlots3D position={[0, h / 2 - 4.5, -d / 2 + wallThick + 0.05]} />
      </group>

      {/* Grifería Monomando montada centralmente en la cubierta detrás de las dos pozas */}
      <DeckMixerFaucet3D position={[0, 0, -d / 2 - 5]} />
    </group>
  );
}

// =========================================================================
// 3D MODEL: ENCIMERAS A GAS FDV (SOBRECUBIERTA)
// =========================================================================
function FdvDesign60Model({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[58, 1.2, 50]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.88} roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.25, 0]}>
        <boxGeometry args={[57.2, 0.1, 49.2]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.15} />
      </mesh>
      {/* 4 Quemadores con parrillas */}
      <group position={[-15, 1.6, 12]}>
        <mesh>
          <cylinderGeometry args={[5.5, 6, 0.6, 32]} />
          <meshStandardMaterial color="#1e293b" metalness={0.2} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[2, 2, 0.8, 24]} />
          <meshStandardMaterial color="#eab308" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
      <group position={[-15, 1.6, -12]}>
        <mesh>
          <cylinderGeometry args={[4, 4.5, 0.6, 24]} />
          <meshStandardMaterial color="#1e293b" metalness={0.2} roughness={0.8} />
        </mesh>
      </group>
      <group position={[15, 1.6, -12]}>
        <mesh>
          <cylinderGeometry args={[4.8, 5.2, 0.6, 24]} />
          <meshStandardMaterial color="#1e293b" metalness={0.2} roughness={0.8} />
        </mesh>
      </group>
      <group position={[15, 1.6, 12]}>
        <mesh>
          <cylinderGeometry args={[3.2, 3.8, 0.6, 24]} />
          <meshStandardMaterial color="#1e293b" metalness={0.2} roughness={0.8} />
        </mesh>
      </group>
      {/* 4 Perillas de control */}
      {[-12, -4, 4, 12].map((x, idx) => (
        <mesh key={idx} position={[x, 1.5, 20]} rotation={[0.2, 0, 0]}>
          <cylinderGeometry args={[1.2, 1.2, 0.8, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

function FdvDesign90Model({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[86, 1.4, 50]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.88} roughness={0.2} />
      </mesh>
      {/* Quemador Wok central triple corona */}
      <group position={[0, 1.8, 0]}>
        <mesh>
          <cylinderGeometry args={[6.5, 7.5, 0.8, 32]} />
          <meshStandardMaterial color="#1e293b" metalness={0.2} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[2.5, 2.5, 1.0, 24]} />
          <meshStandardMaterial color="#eab308" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
      {/* 4 quemadores laterales */}
      <group position={[-28, 1.6, 12]}>
        <mesh>
          <cylinderGeometry args={[4.2, 4.8, 0.6, 24]} />
          <meshStandardMaterial color="#1e293b" metalness={0.2} roughness={0.8} />
        </mesh>
      </group>
      <group position={[-28, 1.6, -12]}>
        <mesh>
          <cylinderGeometry args={[4.8, 5.2, 0.6, 24]} />
          <meshStandardMaterial color="#1e293b" metalness={0.2} roughness={0.8} />
        </mesh>
      </group>
      <group position={[28, 1.6, 12]}>
        <mesh>
          <cylinderGeometry args={[3.2, 3.8, 0.6, 24]} />
          <meshStandardMaterial color="#1e293b" metalness={0.2} roughness={0.8} />
        </mesh>
      </group>
      <group position={[28, 1.6, -12]}>
        <mesh>
          <cylinderGeometry args={[4.2, 4.8, 0.6, 24]} />
          <meshStandardMaterial color="#1e293b" metalness={0.2} roughness={0.8} />
        </mesh>
      </group>
      {/* 5 Perillas frontales */}
      {[-16, -8, 0, 8, 16].map((x, idx) => (
        <mesh key={idx} position={[x, 1.6, 20]} rotation={[0.2, 0, 0]}>
          <cylinderGeometry args={[1.2, 1.2, 0.8, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

// =========================================================================
// COMPONENTE PRINCIPAL: KITCHEN COUNTERTOP 3D (CONTINUOUS SLABS & UNDERMOUNT SINK)
// =========================================================================
export function KitchenCountertop3D() {
  const { countertopConfig, qstoneCatalog, cabinets, walls } = useKitchenStore();

  const selectedProduct = useMemo(() => {
    return (
      qstoneCatalog.find((p) => p.id === countertopConfig.selectedProductId) ||
      qstoneCatalog[0]
    );
  }, [countertopConfig.selectedProductId, qstoneCatalog]);

  const stoneThicknessCm = selectedProduct.thicknessMm / 10; // 1.2, 1.8, 2.0 cm
  const regruesoCm = countertopConfig.regruesoCm; // 0 a 5 cm

  const stoneColor = selectedProduct.colorHex || '#F8FAFC';
  const roughness = selectedProduct.finish === 'Pulido Brillante' ? 0.08 : 0.25;
  const metalness = 0.04;

  // Agrupamiento geométrico en corridas continuas
  const continuousRuns = useMemo(() => {
    return detectContinuousCabinetRuns(cabinets, countertopConfig, walls);
  }, [cabinets, countertopConfig, walls]);

  if (!countertopConfig.enabled || continuousRuns.length === 0) {
    return null;
  }

  return (
    <group name="kitchen-qstone-countertops">
      {continuousRuns.map((run, runIndex) => {
        const isIsland = run.type === 'island';
        const rot = run.rotation;
        const totalRunLengthCm = run.totalLengthMm / 10;
        const depthCm = run.depthMm / 10;
        const cabTopY = run.heightMm / 10;
        const slabCenterY = cabTopY + stoneThicknessCm / 2;

        const frontOverhang = 2;
        const rearOverhang = isIsland ? countertopConfig.islandOverhangCm : 0;
        const localZShift = (frontOverhang - rearOverhang) / 2;

        // Verificar si la corrida contiene el lavaplatos o la encimera
        const sinkCabinet = run.cabinets.find(
          (c) => c.id === countertopConfig.sinkCabinetId
        );
        const cooktopCabinet = run.cabinets.find(
          (c) => c.id === countertopConfig.cooktopCabinetId
        );

        // Calcular posición relativa del lavaplatos dentro de la corrida
        let sinkRelX: number | null = null;
        let sinkSpec: SinkSpec | null = null;
        if (
          sinkCabinet &&
          countertopConfig.sinkModel &&
          countertopConfig.sinkModel !== 'none'
        ) {
          sinkSpec = QSTONE_SINKS[countertopConfig.sinkModel];
          // Calcular distancia desde el extremo izquierdo de la corrida hasta el centro del gabinete del lavaplatos
          let currentDist = 0;
          for (const cab of run.cabinets) {
            if (cab.id === sinkCabinet.id) {
              const centerDistFromLeft = currentDist + cab.width / 2;
              sinkRelX = -totalRunLengthCm / 2 + centerDistFromLeft;
              break;
            }
            currentDist += cab.width;
          }
        }

        // Posición relativa de la encimera dentro de la corrida
        let cooktopRelX: number | null = null;
        if (
          cooktopCabinet &&
          countertopConfig.cooktopModel &&
          countertopConfig.cooktopModel !== 'none'
        ) {
          let currentDist = 0;
          for (const cab of run.cabinets) {
            if (cab.id === cooktopCabinet.id) {
              const centerDistFromLeft = currentDist + cab.width / 2;
              cooktopRelX = -totalRunLengthCm / 2 + centerDistFromLeft;
              break;
            }
            currentDist += cab.width;
          }
        }

        // Renderizar los tramos de la corrida según segmentLengthsMm
        let currentSegStartCm = -totalRunLengthCm / 2;

        return (
          <group
            key={`run-${run.id}-${runIndex}`}
            position={[run.centerWorld[0], 0, run.centerWorld[2]]}
            rotation={[0, rot, 0]}
          >
            {run.segmentLengthsMm.map((segLenMm, segIdx) => {
              const segLenCm = segLenMm / 10;
              const extraCornerLeftCm = segIdx === 0 ? (run.cornerExtensionLeftMm || 0) / 10 : 0;
              const extraCornerRightCm =
                segIdx === run.segmentLengthsMm.length - 1
                  ? (run.cornerExtensionRightMm || 0) / 10
                  : 0;
              const totalSegSlabLenCm = segLenCm + extraCornerLeftCm + extraCornerRightCm;
              const segCornerShiftX = (extraCornerRightCm - extraCornerLeftCm) / 2;

              const segCenterRelX = currentSegStartCm + segLenCm / 2 + segCornerShiftX;
              const segLeft = currentSegStartCm - extraCornerLeftCm;
              const segRight = currentSegStartCm + segLenCm + extraCornerRightCm;
              currentSegStartCm += segLenCm;

              const isLastSeg = segIdx === run.segmentLengthsMm.length - 1;

              // Comprobar si el lavaplatos cae en este tramo
              const hasSinkInSeg =
                sinkRelX !== null &&
                sinkSpec !== null &&
                sinkRelX >= segLeft - 1 &&
                sinkRelX <= segRight + 1;

              const cutoutW = sinkSpec ? sinkSpec.cutoutWidthMm / 10 : 0;
              const cutoutD = sinkSpec ? sinkSpec.cutoutDepthMm / 10 : 0;

              return (
                <group key={`seg-${segIdx}`} position={[segCenterRelX, 0, 0]}>
                  {/* SI TIENE LAVAPLATOS: Generar la cubierta con HUECO REAL (Cutout) de 4 piezas sin colisiones ni z-fighting */}
                  {hasSinkInSeg && sinkSpec ? (
                    (() => {
                      const localSinkX = sinkRelX! - segCenterRelX;
                      const holeLeft = localSinkX - cutoutW / 2;
                      const holeRight = localSinkX + cutoutW / 2;
                      const holeBack = localZShift - cutoutD / 2;
                      const holeFront = localZShift + cutoutD / 2;

                      const leftPartW = Math.max(0, holeLeft - (-totalSegSlabLenCm / 2));
                      const rightPartW = Math.max(0, totalSegSlabLenCm / 2 - holeRight);
                      const rearPartD = Math.max(0, holeBack - (-depthCm / 2));
                      const frontPartD = Math.max(0, depthCm / 2 - holeFront);

                      return (
                        <group>
                          {/* Pieza izquierda de la cubierta */}
                          {leftPartW > 0.1 && (
                            <mesh
                              position={[
                                -totalSegSlabLenCm / 2 + leftPartW / 2,
                                slabCenterY,
                                localZShift,
                              ]}
                              castShadow
                              receiveShadow
                            >
                              <boxGeometry args={[leftPartW, stoneThicknessCm, depthCm]} />
                              <meshStandardMaterial
                                color={stoneColor}
                                roughness={roughness}
                                metalness={metalness}
                              />
                            </mesh>
                          )}

                          {/* Pieza derecha de la cubierta */}
                          {rightPartW > 0.1 && (
                            <mesh
                              position={[
                                totalSegSlabLenCm / 2 - rightPartW / 2,
                                slabCenterY,
                                localZShift,
                              ]}
                              castShadow
                              receiveShadow
                            >
                              <boxGeometry args={[rightPartW, stoneThicknessCm, depthCm]} />
                              <meshStandardMaterial
                                color={stoneColor}
                                roughness={roughness}
                                metalness={metalness}
                              />
                            </mesh>
                          )}

                          {/* Pieza trasera (puente donde se monta la grifería) */}
                          {rearPartD > 0.1 && (
                            <mesh
                              position={[
                                localSinkX,
                                slabCenterY,
                                -depthCm / 2 + rearPartD / 2,
                              ]}
                              castShadow
                              receiveShadow
                            >
                              <boxGeometry args={[cutoutW, stoneThicknessCm, rearPartD]} />
                              <meshStandardMaterial
                                color={stoneColor}
                                roughness={roughness}
                                metalness={metalness}
                              />
                            </mesh>
                          )}

                          {/* Pieza delantera (borde frontal de la cubierta frente al lavaplatos) */}
                          {frontPartD > 0.1 && (
                            <mesh
                              position={[
                                localSinkX,
                                slabCenterY,
                                depthCm / 2 - frontPartD / 2,
                              ]}
                              castShadow
                              receiveShadow
                            >
                              <boxGeometry args={[cutoutW, stoneThicknessCm, frontPartD]} />
                              <meshStandardMaterial
                                color={stoneColor}
                                roughness={roughness}
                                metalness={metalness}
                              />
                            </mesh>
                          )}

                          {/* MONTAJE BAJO CUBIERTA DEL LAVAPLATOS REALISTA */}
                          {countertopConfig.sinkModel === 'alfa_onec_3018' && (
                            <AlfaOnec3018Realistic
                              position={[localSinkX, cabTopY + stoneThicknessCm, localZShift]}
                              stoneThicknessCm={stoneThicknessCm}
                            />
                          )}
                          {countertopConfig.sinkModel === 'alfa_twoc_f5858a' && (
                            <AlfaTwocF5858aRealistic
                              position={[localSinkX, cabTopY + stoneThicknessCm, localZShift]}
                              stoneThicknessCm={stoneThicknessCm}
                            />
                          )}
                        </group>
                      );
                    })()
                  ) : (
                    /* SI NO TIENE LAVAPLATOS: Plancha corrida continua estándar cubriendo toda la superficie hasta el muro en esquinas */
                    <mesh position={[0, slabCenterY, localZShift]} castShadow receiveShadow>
                      <boxGeometry
                        args={[totalSegSlabLenCm - (isLastSeg ? 0 : 0.05), stoneThicknessCm, depthCm]}
                      />
                      <meshStandardMaterial
                        color={stoneColor}
                        roughness={roughness}
                        metalness={metalness}
                      />
                    </mesh>
                  )}

                  {/* Junta sutil a 90° si el tramo fue seccionado por criterio de transporte */}
                  {!isLastSeg && (
                    <mesh position={[totalSegSlabLenCm / 2, slabCenterY, localZShift]}>
                      <boxGeometry args={[0.06, stoneThicknessCm + 0.02, depthCm + 0.02]} />
                      <meshStandardMaterial color="#94a3b8" roughness={0.8} />
                    </mesh>
                  )}
                </group>
              );
            })}

            {/* ENCIMERA A GAS FDV (si cae en esta corrida) */}
            {cooktopRelX !== null && (
              <group position={[cooktopRelX, cabTopY + stoneThicknessCm, localZShift]}>
                {countertopConfig.cooktopModel === 'fdv_design_60' && (
                  <FdvDesign60Model position={[0, 0, 0]} />
                )}
                {countertopConfig.cooktopModel === 'fdv_design_90' && (
                  <FdvDesign90Model position={[0, 0, 0]} />
                )}
              </group>
            )}

            {/* Faldón Delantero / Regrueso Continuo (de 0 a 5 cm) */}
            {regruesoCm > 0 && (
              <mesh
                position={[
                  0,
                  cabTopY + stoneThicknessCm - regruesoCm / 2,
                  run.cabinets[0].depth / 2 + frontOverhang - stoneThicknessCm / 2,
                ]}
                castShadow
              >
                <boxGeometry args={[totalRunLengthCm, regruesoCm, stoneThicknessCm]} />
                <meshStandardMaterial
                  color={stoneColor}
                  roughness={roughness}
                  metalness={metalness}
                />
              </mesh>
            )}

            {/* Respaldo / Zócalo Posterior Continuo (solo en muebles base contra muro) */}
            {!isIsland && countertopConfig.backsplashMode !== 'none' && (() => {
              const extLeftCm = (run.cornerExtensionLeftMm || 0) / 10;
              const extRightCm = (run.cornerExtensionRightMm || 0) / 10;
              const bsLenCm = totalRunLengthCm + extLeftCm + extRightCm;
              const bsCenterShiftX = (extRightCm - extLeftCm) / 2;

              return (
                <mesh
                  position={[
                    bsCenterShiftX,
                    cabTopY +
                      stoneThicknessCm +
                      (countertopConfig.backsplashMode === 'standard_5cm' ? 2.5 : 27.5),
                    -run.cabinets[0].depth / 2 + stoneThicknessCm / 2,
                  ]}
                  castShadow
                >
                  <boxGeometry
                    args={[
                      bsLenCm,
                      countertopConfig.backsplashMode === 'standard_5cm' ? 5 : 55,
                      stoneThicknessCm,
                    ]}
                  />
                  <meshStandardMaterial
                    color={stoneColor}
                    roughness={roughness}
                    metalness={metalness}
                  />
                </mesh>
              );
            })()}

            {/* Remate Lateral Cascada (Waterfall) Izquierda - Solo si el extremo está libre (sin despensa ni esquina) */}
            {countertopConfig.waterfallLeft && run.canWaterfallLeft && (
              <mesh
                position={[
                  -totalRunLengthCm / 2 - stoneThicknessCm / 2,
                  (cabTopY + stoneThicknessCm) / 2,
                  localZShift,
                ]}
                castShadow
              >
                <boxGeometry
                  args={[stoneThicknessCm, cabTopY + stoneThicknessCm, depthCm]}
                />
                <meshStandardMaterial
                  color={stoneColor}
                  roughness={roughness}
                  metalness={metalness}
                />
              </mesh>
            )}

            {/* Remate Lateral Cascada (Waterfall) Derecha - Solo si el extremo está libre (sin despensa ni esquina) */}
            {countertopConfig.waterfallRight && run.canWaterfallRight && (
              <mesh
                position={[
                  totalRunLengthCm / 2 + stoneThicknessCm / 2,
                  (cabTopY + stoneThicknessCm) / 2,
                  localZShift,
                ]}
                castShadow
              >
                <boxGeometry
                  args={[stoneThicknessCm, cabTopY + stoneThicknessCm, depthCm]}
                />
                <meshStandardMaterial
                  color={stoneColor}
                  roughness={roughness}
                  metalness={metalness}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
