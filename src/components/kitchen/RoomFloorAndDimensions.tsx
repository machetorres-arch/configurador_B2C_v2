import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useKitchenStore } from '../../store/kitchenStore';
import { analyzeRoomWalls, calculatePolygonArea } from '../../utils/roomGeometry';
import { FLOOR_TYPE_OPTIONS, generateFloorCanvasTexture } from '../../utils/kitchenMaterials';
import { Text, Line } from '@react-three/drei';

export function RoomFloorAndDimensions() {
  const { roomConfig, viewMode, floorType } = useKitchenStore();
  const vertices = roomConfig?.vertices || [];
  const is2D = viewMode === '2d';

  const currentFloorOption = useMemo(() => {
    return FLOOR_TYPE_OPTIONS.find((f) => f.id === floorType) || FLOOR_TYPE_OPTIONS[0];
  }, [floorType]);

  const floorTexture = useMemo(() => {
    try {
      return generateFloorCanvasTexture(floorType || 'porcelain_cement_light');
    } catch (e) {
      console.warn('Error loading floor texture', e);
      return null;
    }
  }, [floorType]);

  // Crear la geometría del piso poligonal de la cocina de forma segura
  const floorGeometry = useMemo(() => {
    if (!vertices || vertices.length < 3) return null;
    try {
      const shape = new THREE.Shape();
      // En ThreeJS rotado -90° en X, Y en 2D corresponde a Z en 3D
      shape.moveTo(vertices[0].x, -vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        shape.lineTo(vertices[i].x, -vertices[i].y);
      }
      shape.closePath();
      return new THREE.ShapeGeometry(shape);
    } catch (e) {
      console.warn('Error generating floor geometry', e);
      return null;
    }
  }, [vertices]);

  const wallSegments = useMemo(() => {
    if (!vertices || vertices.length < 3) return [];
    return analyzeRoomWalls(vertices);
  }, [vertices]);

  const areaM2 = useMemo(() => {
    if (!vertices || vertices.length < 3) return 0;
    return calculatePolygonArea(vertices);
  }, [vertices]);

  // Centro de la estancia para el texto del área
  const center = useMemo(() => {
    if (!vertices || vertices.length === 0) return [0, 0];
    let sumX = 0;
    let sumY = 0;
    vertices.forEach((v) => {
      sumX += v.x;
      sumY += v.y;
    });
    return [sumX / vertices.length, sumY / vertices.length];
  }, [vertices]);

  if (!vertices || vertices.length < 3 || !floorGeometry) return null;

  return (
    <group name="roomFloorGroup">
      {/* 1. Suelo arquitectónico de la cocina con textura y material seleccionado */}
      <mesh
        geometry={floorGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.05, 0]}
        receiveShadow
      >
        <meshStandardMaterial
          map={floorTexture || undefined}
          color={floorTexture ? '#ffffff' : currentFloorOption.primaryColor}
          roughness={currentFloorOption.roughness}
          metalness={currentFloorOption.metalness}
        />
      </mesh>

      {/* 2. Visualización 2D: Cotas perimetrales y superficie central */}
      {is2D && (
        <group position={[0, 1, 0]}>
          {/* Texto central de Superficie (Área m²) */}
          <group position={[center[0], 2, center[1]]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1000}>
            <Text
              fontSize={18}
              color="#2563eb"
              anchorX="center"
              anchorY="middle"
              renderOrder={1000}
            >
              {`${areaM2.toFixed(2)} m²`}
            </Text>
          </group>

          {/* Cotas exteriores y Letras A, B, C, D... de cada pared */}
          {wallSegments.map((seg) => {
            const p1 = [seg.start.x, seg.start.y];
            const p2 = [seg.end.x, seg.end.y];
            const dx = p2[0] - p1[0];
            const dz = p2[1] - p1[1];
            const len = Math.hypot(dx, dz);
            if (len === 0) return null;

            // Vector normal
            const nx = -dz / len;
            const nz = dx / len;

            // Factor hacia afuera
            const midX = (p1[0] + p2[0]) / 2;
            const midZ = (p1[1] + p2[1]) / 2;
            const toCenterX = center[0] - midX;
            const toCenterZ = center[1] - midZ;
            const dot = nx * toCenterX + nz * toCenterZ;
            const out = dot > 0 ? -1 : 1;

            const cotaDist = (roomConfig?.wallThickness || 20) / 2 + 28;
            const labelDist = cotaDist + 24;

            const c1: [number, number, number] = [p1[0] + nx * out * cotaDist, 2, p1[1] + nz * out * cotaDist];
            const c2: [number, number, number] = [p2[0] + nx * out * cotaDist, 2, p2[1] + nz * out * cotaDist];
            const labelPos: [number, number, number] = [midX + nx * out * labelDist, 2, midZ + nz * out * labelDist];
            const textPos: [number, number, number] = [(c1[0] + c2[0]) / 2, 2, (c1[2] + c2[2]) / 2];

            return (
              <group key={`dim_2d_${seg.index}`}>
                {/* Línea de cota */}
                <Line points={[c1, c2]} color="#2563eb" lineWidth={2} depthTest={false} renderOrder={999} />
                <Line
                  points={[
                    [p1[0] + nx * out * 4, 2, p1[1] + nz * out * 4],
                    [p1[0] + nx * out * (cotaDist + 6), 2, p1[1] + nz * out * (cotaDist + 6)],
                  ]}
                  color="#2563eb"
                  lineWidth={1.5}
                  depthTest={false}
                  renderOrder={999}
                />
                <Line
                  points={[
                    [p2[0] + nx * out * 4, 2, p2[1] + nz * out * 4],
                    [p2[0] + nx * out * (cotaDist + 6), 2, p2[1] + nz * out * (cotaDist + 6)],
                  ]}
                  color="#2563eb"
                  lineWidth={1.5}
                  depthTest={false}
                  renderOrder={999}
                />

                {/* Letra de pared (A, B, C...) */}
                <group position={labelPos} rotation={[-Math.PI / 2, 0, 0]}>
                  <Text
                    fontSize={14}
                    color="#0f172a"
                    anchorX="center"
                    anchorY="middle"
                    renderOrder={1000}
                  >
                    {seg.label}
                  </Text>
                </group>

                {/* Longitud numérica */}
                <group position={textPos} rotation={[-Math.PI / 2, 0, 0]}>
                  <Text
                    fontSize={9}
                    color="#2563eb"
                    anchorX="center"
                    anchorY="middle"
                    renderOrder={1000}
                  >
                    {`${seg.length.toFixed(1)} cm`}
                  </Text>
                </group>
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
}
