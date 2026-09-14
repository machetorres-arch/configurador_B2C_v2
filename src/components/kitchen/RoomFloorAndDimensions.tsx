import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useKitchenStore } from '../../store/kitchenStore';
import { analyzeRoomWalls, calculatePolygonArea } from '../../utils/roomGeometry';
import { FLOOR_TYPE_OPTIONS, generateFloorCanvasTexture } from '../../utils/kitchenMaterials';
import { getWallInwardNormal } from '../../utils/kitchenCollision';
import { Text, Line } from '@react-three/drei';

export function RoomFloorAndDimensions({ onPointerDown }: { onPointerDown?: (e: any) => void }) {
  const { roomConfig, viewMode, floorType } = useKitchenStore();
  const vertices = useMemo(() => {
    if (roomConfig?.vertices && roomConfig.vertices.length >= 3) {
      return roomConfig.vertices;
    }
    return [
      { id: 'v1', x: -250, y: -200 },
      { id: 'v2', x: 250, y: -200 },
      { id: 'v3', x: 250, y: 200 },
      { id: 'v4', x: -250, y: 200 },
    ];
  }, [roomConfig?.vertices]);
  const is2D = viewMode === '2d';

  const currentFloorOption = useMemo(() => {
    return FLOOR_TYPE_OPTIONS.find((f) => f.id === floorType) || FLOOR_TYPE_OPTIONS[0];
  }, [floorType]);

  const floorTexture = useMemo(() => {
    try {
      return generateFloorCanvasTexture(floorType || 'ceramic_white_60x60');
    } catch (e) {
      console.warn('Error loading floor texture', e);
      return null;
    }
  }, [floorType]);

  // Crear la geometría del piso poligonal de la cocina con mapeo UV métrico para baldosas reales
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
      const geom = new THREE.ShapeGeometry(shape);

      // Calcular coordenadas UV métricas exactas: cada unidad = 60 cm (baldosa 60x60 cm)
      const posAttr = geom.attributes.position;
      const uvs = new Float32Array(posAttr.count * 2);
      const tileSizeCm = 60;
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        uvs[i * 2] = x / tileSizeCm;
        uvs[i * 2 + 1] = y / tileSizeCm;
      }
      geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      geom.computeVertexNormals();
      return geom;
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
        onPointerDown={(e) => {
          if (onPointerDown) {
            onPointerDown(e);
          } else {
            const state = useKitchenStore.getState();
            if (state.toolMode === 'select') {
              state.setActiveCabinet(null);
              state.setActiveArchElement(null);
            }
          }
        }}
      >
        <meshStandardMaterial
          map={floorTexture || undefined}
          color={floorTexture ? '#ffffff' : currentFloorOption.primaryColor}
          roughness={currentFloorOption.roughness}
          metalness={currentFloorOption.metalness}
          polygonOffset={true}
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
          depthWrite={true}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Visualización 2D: Cotas perimetrales y superficie central */}
      {is2D && (
        <group position={[0, 1, 0]}>
          {/* Texto central de Superficie (Área m²) */}
          <group position={[center[0], 2, center[1]]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1000}>
            <Text
              fontSize={22}
              color="#38bdf8"
              anchorX="center"
              anchorY="middle"
              material-toneMapped={false}
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

            const poly = vertices.map((v) => [v.x, v.y] as [number, number]);
            const [inwardX, inwardZ] = getWallInwardNormal(p1[0], p1[1], p2[0], p2[1], poly);
            const outX = -inwardX;
            const outZ = -inwardZ;

            const midX = (p1[0] + p2[0]) / 2;
            const midZ = (p1[1] + p2[1]) / 2;

            const cotaDist = (roomConfig?.wallThickness || 20) / 2 + 32;
            const labelDist = cotaDist + 28;

            const c1: [number, number, number] = [p1[0] + outX * cotaDist, 2, p1[1] + outZ * cotaDist];
            const c2: [number, number, number] = [p2[0] + outX * cotaDist, 2, p2[1] + outZ * cotaDist];
            const labelPos: [number, number, number] = [midX + outX * labelDist, 2, midZ + outZ * labelDist];
            const textPos: [number, number, number] = [(c1[0] + c2[0]) / 2, 2, (c1[2] + c2[2]) / 2];

            return (
              <group key={`dim_2d_${seg.index}`}>
                {/* Línea de cota principal */}
                <Line points={[c1, c2]} color="#f97316" lineWidth={2.5} depthTest={false} renderOrder={999} material-toneMapped={false} />
                <Line
                  points={[
                    [p1[0] + outX * 4, 2, p1[1] + outZ * 4],
                    [p1[0] + outX * (cotaDist + 8), 2, p1[1] + outZ * (cotaDist + 8)],
                  ]}
                  color="#f97316"
                  lineWidth={2}
                  depthTest={false}
                  renderOrder={999}
                  material-toneMapped={false}
                />
                <Line
                  points={[
                    [p2[0] + outX * 4, 2, p2[1] + outZ * 4],
                    [p2[0] + outX * (cotaDist + 8), 2, p2[1] + outZ * (cotaDist + 8)],
                  ]}
                  color="#f97316"
                  lineWidth={2}
                  depthTest={false}
                  renderOrder={999}
                  material-toneMapped={false}
                />

                {/* Letra de pared (A, B, C...) en alto contraste */}
                <group position={labelPos} rotation={[-Math.PI / 2, 0, 0]}>
                  <Text
                    fontSize={16}
                    color="#ffffff"
                    anchorX="center"
                    anchorY="middle"
                    material-toneMapped={false}
                    renderOrder={1000}
                  >
                    {seg.label}
                  </Text>
                </group>

                {/* Longitud numérica en color brillante */}
                <group position={textPos} rotation={[-Math.PI / 2, 0, 0]}>
                  <Text
                    fontSize={12}
                    color="#38bdf8"
                    anchorX="center"
                    anchorY="middle"
                    material-toneMapped={false}
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
