import React, { useState, useRef, useMemo } from 'react';
import {
  RoomVertex,
  WallSegmentData,
  analyzeRoomWalls,
  calculatePolygonArea,
  calculatePolygonPerimeter,
  distanceBetween,
  moveWallSegmentOrthogonal,
  moveVertexOrthogonal,
} from '../../utils/roomGeometry';
import { InteriorWall, InteriorZone, RoofStyle } from '../../store/sipHouseStore';

export type SipSnapMode = 'sip_122' | 'sip_61' | 'fine_10' | 'fine_5';

interface SipHousePlannerCanvasProps {
  vertices: RoomVertex[];
  wallThicknessCm: number; // en cm (ej. 11.4 cm)
  wallHeightCm: number;
  roofStyle: RoofStyle;
  snapMode: SipSnapMode;
  orthoMode?: boolean;
  isFreehandMode?: boolean;
  onVerticesChange: (newVertices: RoomVertex[]) => void;
  selectedVertexIndex: number | null;
  onSelectVertexIndex: (index: number | null) => void;
  onFinishDrawing?: () => void;
  interiorWalls?: InteriorWall[];
  zones?: InteriorZone[];
}

export function SipHousePlannerCanvas({
  vertices,
  wallThicknessCm,
  roofStyle,
  snapMode,
  orthoMode = true,
  isFreehandMode = false,
  onVerticesChange,
  selectedVertexIndex,
  onSelectVertexIndex,
  onFinishDrawing,
  interiorWalls = [],
  zones = [],
}: SipHousePlannerCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null);
  const [draggingWallIndex, setDraggingWallIndex] = useState<number | null>(null);
  const [hoveredWallIndex, setHoveredWallIndex] = useState<number | null>(null);
  const [freehandHoverPos, setFreehandHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [activeGuideLines, setActiveGuideLines] = useState<{ x?: number; y?: number } | null>(null);

  const viewBoxSize = 1000;
  const padding = 130;

  // Snap value calculator (cm)
  const snapStepCm = useMemo(() => {
    switch (snapMode) {
      case 'sip_122':
        return 122; // Ancho estándar de panel SIP en Chile / internacional
      case 'sip_61':
        return 61; // Medio panel SIP
      case 'fine_10':
        return 10;
      case 'fine_5':
      default:
        return 5;
    }
  }, [snapMode]);

  // Límites geométricos para auto-centrar y escalar el SVG
  const bounds = useMemo(() => {
    const pts = [...vertices];
    if (pts.length === 0) {
      return { minX: -450, maxX: 450, minY: -350, maxY: 350, width: 900, height: 700 };
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    pts.forEach((v) => {
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
    });

    if (isFreehandMode) {
      // Margen amplio y estable durante el trazado
      minX -= 150;
      maxX += 150;
      minY -= 150;
      maxY += 150;
    }

    const width = Math.max(500, maxX - minX);
    const height = Math.max(400, maxY - minY);
    return { minX, maxX, minY, maxY, width, height };
  }, [vertices, isFreehandMode]);

  // Escala para mapear de coordenadas en cm a coordenadas del SVG
  const scale = useMemo(() => {
    const availableW = viewBoxSize - padding * 2;
    const availableH = viewBoxSize - padding * 2;
    const sX = availableW / (bounds.width + wallThicknessCm * 2 + 100);
    const sY = availableH / (bounds.height + wallThicknessCm * 2 + 100);
    return Math.min(sX, sY, 0.95);
  }, [bounds, wallThicknessCm]);

  const centerOffset = useMemo(() => {
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    return {
      x: viewBoxSize / 2 - cx * scale,
      y: viewBoxSize / 2 - cy * scale,
    };
  }, [bounds, scale]);

  // Convertir coordenada de cm a punto en SVG
  const toSvgPoint = (pt: { x: number; y: number }) => ({
    x: pt.x * scale + centerOffset.x,
    y: pt.y * scale + centerOffset.y,
  });

  // Convertir coordenada de evento del mouse a cm (medidas libres en modo dibujo)
  const toCmCoords = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const clickSvgX = ((e.clientX - rect.left) / rect.width) * viewBoxSize;
    const clickSvgY = ((e.clientY - rect.top) / rect.height) * viewBoxSize;

    const cmX = (clickSvgX - centerOffset.x) / scale;
    const cmY = (clickSvgY - centerOffset.y) / scale;

    // En modo diseño libre desde cero: medidas continuas y libres en cm (sin forzar módulos SIP)
    const effectiveStep = isFreehandMode ? 1 : snapStepCm;

    return {
      x: Math.round(cmX / effectiveStep) * effectiveStep,
      y: Math.round(cmY / effectiveStep) * effectiveStep,
    };
  };

  // Bloqueo ortogonal estricto a 90° para dibujo desde cero (medida libre)
  const getOrthogonalDrawingPos = (rawCmPos: { x: number; y: number }) => {
    if (vertices.length === 0) {
      return rawCmPos;
    }
    const lastV = vertices[vertices.length - 1];
    const dx = rawCmPos.x - lastV.x;
    const dy = rawCmPos.y - lastV.y;

    // Solo horizontal o vertical respecto al último vértice colocado (medidas libres en cm)
    if (Math.abs(dx) >= Math.abs(dy)) {
      return { x: Math.round(rawCmPos.x), y: Math.round(lastV.y) };
    } else {
      return { x: Math.round(lastV.x), y: Math.round(rawCmPos.y) };
    }
  };

  // Manejadores de arrastre de vértice
  const handleVertexMouseDown = (index: number, e: React.MouseEvent) => {
    if (isFreehandMode) return;
    e.stopPropagation();
    setDraggingVertexIndex(index);
    onSelectVertexIndex(index);
  };

  // Manejador de arrastre de muro completo (Edge dragging a 90°)
  const handleWallMouseDown = (index: number, e: React.MouseEvent) => {
    if (isFreehandMode) return;
    e.stopPropagation();
    setDraggingWallIndex(index);
    onSelectVertexIndex(index);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingWallIndex !== null) {
      const cmPos = toCmCoords(e);
      const updated = moveWallSegmentOrthogonal(vertices, draggingWallIndex, cmPos, snapStepCm);
      onVerticesChange(updated);
      setActiveGuideLines({ x: cmPos.x, y: cmPos.y });
    } else if (draggingVertexIndex !== null) {
      const cmPos = toCmCoords(e);
      let updated: RoomVertex[];

      if (orthoMode && vertices.length >= 3) {
        // En modo ORTHO, mueve el vértice ajustando los vecinos a 90° automáticamente
        updated = moveVertexOrthogonal(vertices, draggingVertexIndex, cmPos, snapStepCm);
      } else {
        // Movimiento libre con snap
        updated = [...vertices];
        updated[draggingVertexIndex] = {
          ...updated[draggingVertexIndex],
          x: cmPos.x,
          y: cmPos.y,
        };
      }

      onVerticesChange(updated);
      const curV = updated[draggingVertexIndex];
      if (curV) {
        setActiveGuideLines({ x: curV.x, y: curV.y });
      }
    } else if (isFreehandMode) {
      const rawCmPos = toCmCoords(e);
      const orthoPos = getOrthogonalDrawingPos(rawCmPos);
      setFreehandHoverPos(orthoPos);
      setActiveGuideLines({ x: orthoPos.x, y: orthoPos.y });
    }
  };

  const handleMouseUp = () => {
    setDraggingVertexIndex(null);
    setDraggingWallIndex(null);
    setActiveGuideLines(null);
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isFreehandMode) return;
    const rawCmPos = toCmCoords(e);

    if (vertices.length === 0) {
      // Colocar primer vértice de inicio libre
      const newVertex: RoomVertex = {
        id: 'v_sip_1',
        x: rawCmPos.x,
        y: rawCmPos.y,
      };
      onVerticesChange([newVertex]);
      onSelectVertexIndex(0);
      return;
    }

    const firstV = vertices[0];
    const lastV = vertices[vertices.length - 1];

    // Detectar si el usuario hizo clic intencionalmente sobre el nodo inicial (círculo verde) para cerrar la casa
    if (vertices.length >= 3 && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const clickSvgX = ((e.clientX - rect.left) / rect.width) * viewBoxSize;
      const clickSvgY = ((e.clientY - rect.top) / rect.height) * viewBoxSize;
      const pFirstSvg = toSvgPoint(firstV);
      const svgDist = Math.hypot(clickSvgX - pFirstSvg.x, clickSvgY - pFirstSvg.y);
      const cmDist = Math.hypot(rawCmPos.x - firstV.x, rawCmPos.y - firstV.y);

      if (svgDist < 36 || cmDist < 35) {
        // Cerrar el polígono de la casa
        let closing = [...vertices];
        // Si el último vértice no comparte exactamente X ni Y con el primero, insertar esquina intermedia a 90°
        if (Math.abs(lastV.x - firstV.x) > 1 && Math.abs(lastV.y - firstV.y) > 1) {
          closing.push({
            id: `v_sip_close_${Date.now()}`,
            x: lastV.x,
            y: firstV.y,
          });
        }
        onVerticesChange(closing);
        onFinishDrawing?.();
        return;
      }
    }

    // Continuar agregando esquinas libres a 90° (punto 2, 3, 4, 5, 6, 7, 8...)
    const orthoPos = getOrthogonalDrawingPos(rawCmPos);
    const segLen = Math.hypot(orthoPos.x - lastV.x, orthoPos.y - lastV.y);
    if (segLen < 20) return; // Evitar micro-clics dobles

    const newVertex: RoomVertex = {
      id: `v_sip_${Date.now()}_${vertices.length + 1}`,
      x: orthoPos.x,
      y: orthoPos.y,
    };
    onVerticesChange([...vertices, newVertex]);
    onSelectVertexIndex(vertices.length);
  };

  // Segmentos de muro abiertos (durante dibujo libre) o cerrados (cuando está completo)
  const wallSegments = useMemo(() => {
    if (isFreehandMode) {
      if (vertices.length < 2) return [];
      // Generar solo la cadena de muros abierta (N vértices -> N-1 muros)
      const segs: WallSegmentData[] = [];
      for (let i = 0; i < vertices.length - 1; i++) {
        const start = vertices[i];
        const end = vertices[i + 1];
        segs.push({
          index: i,
          label: String.fromCharCode(65 + i),
          start,
          end,
          length: Math.round(distanceBetween(start, end) * 10) / 10,
          angleWithNext: 90,
        });
      }
      return segs;
    }
    return analyzeRoomWalls(vertices);
  }, [vertices, isFreehandMode]);

  const areaM2 = useMemo(() => calculatePolygonArea(vertices), [vertices]);
  const perimeterM = useMemo(() => calculatePolygonPerimeter(vertices), [vertices]);

  // Centro geométrico del polígono
  const polyCenter = useMemo(() => {
    if (vertices.length === 0) return { x: viewBoxSize / 2, y: viewBoxSize / 2 };
    let sumX = 0;
    let sumY = 0;
    vertices.forEach((v) => {
      const svgP = toSvgPoint(v);
      sumX += svgP.x;
      sumY += svgP.y;
    });
    return {
      x: sumX / vertices.length,
      y: sumY / vertices.length,
    };
  }, [vertices, scale, centerOffset]);

  // Path SVG para el piso / base de la casa SIP
  const polygonPath = useMemo(() => {
    if (vertices.length < 3 || isFreehandMode) return '';
    return (
      vertices
        .map((v, i) => {
          const p = toSvgPoint(v);
          return `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
        })
        .join(' ') + ' Z'
    );
  }, [vertices, scale, centerOffset, isFreehandMode]);

  return (
    <div className="relative w-full h-full bg-[#F4F4F5] select-none overflow-hidden flex items-center justify-center">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        className="w-full h-full max-h-[85vh] cursor-default"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
      >
        <defs>
          <pattern id="sip-grid-sub" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E4E4E7" strokeWidth="0.75" />
          </pattern>
          <pattern id="sip-grid-main" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="url(#sip-grid-sub)" />
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#D4D4D8" strokeWidth="1.2" />
          </pattern>

          {/* Flechas de cota azul arquitectónico */}
          <marker id="sip-arrow-start" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 8 1 L 2 5 L 8 9" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
          <marker id="sip-arrow-end" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 2 1 L 8 5 L 2 9" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </marker>

          {/* Textura de paneles SIP / Madera OSB */}
          <pattern id="sip-panel-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="#FEF3C7" />
            <path d="M 0 20 L 40 20 M 20 0 L 20 40" stroke="#FDE68A" strokeWidth="0.8" strokeDasharray="2 2" />
          </pattern>
        </defs>

        {/* Fondo con rejilla arquitectónica */}
        <rect width={viewBoxSize} height={viewBoxSize} fill="url(#sip-grid-main)" />

        {/* Líneas Guía Magnéticas Activas */}
        {activeGuideLines && (
          <g className="pointer-events-none">
            {activeGuideLines.x !== undefined && (
              <line
                x1={toSvgPoint({ x: activeGuideLines.x, y: bounds.minY - 200 }).x}
                y1={0}
                x2={toSvgPoint({ x: activeGuideLines.x, y: bounds.minY - 200 }).x}
                y2={viewBoxSize}
                stroke="#0EA5E9"
                strokeWidth="1.2"
                strokeDasharray="4 3"
              />
            )}
            {activeGuideLines.y !== undefined && (
              <line
                x1={0}
                y1={toSvgPoint({ x: bounds.minX - 200, y: activeGuideLines.y }).y}
                x2={viewBoxSize}
                y2={toSvgPoint({ x: bounds.minX - 200, y: activeGuideLines.y }).y}
                stroke="#0EA5E9"
                strokeWidth="1.2"
                strokeDasharray="4 3"
              />
            )}
          </g>
        )}

        {/* Piso interior / losa de la casa SIP */}
        {!isFreehandMode && vertices.length >= 3 && (
          <path d={polygonPath} fill="#FFFFFF" stroke="none" fillOpacity={0.96} />
        )}

        {/* Recintos / Zonas interiores identificadas */}
        {!isFreehandMode && zones.map((zone) => {
          const pMin = toSvgPoint({ x: zone.bounds.minX, y: zone.bounds.minZ });
          const pMax = toSvgPoint({ x: zone.bounds.maxX, y: zone.bounds.maxZ });
          const w = Math.abs(pMax.x - pMin.x);
          const h = Math.abs(pMax.y - pMin.y);
          const x = Math.min(pMin.x, pMax.x);
          const y = Math.min(pMin.y, pMax.y);

          return (
            <g key={zone.id} className="pointer-events-none">
              <rect
                x={x + 4}
                y={y + 4}
                width={Math.max(0, w - 8)}
                height={Math.max(0, h - 8)}
                fill={zone.color}
                fillOpacity={0.12}
                stroke={zone.color}
                strokeWidth={1}
                strokeDasharray="4 3"
                rx={4}
              />
              <text
                x={x + w / 2}
                y={y + h / 2 - 6}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#1E293B"
                fontSize="12"
                fontWeight="800"
                fontFamily="system-ui, sans-serif"
              >
                {zone.name}
              </text>
              <text
                x={x + w / 2}
                y={y + h / 2 + 10}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#64748B"
                fontSize="10"
                fontWeight="600"
                fontFamily="system-ui, monospace"
              >
                {zone.areaM2.toFixed(1)} m²
              </text>
            </g>
          );
        })}

        {/* Tabiques Interiores SIP (Muros interiores) */}
        {interiorWalls.map((wall) => {
          if (!wall.visible) return null;
          const p1 = toSvgPoint({ x: wall.startX, y: wall.startZ });
          const p2 = toSvgPoint({ x: wall.endX, y: wall.endZ });
          const tSvg = Math.max(5, (wall.thicknessMm / 10) * scale);

          return (
            <g key={wall.id} className="pointer-events-none">
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="#64748B"
                strokeWidth={tSvg}
                strokeLinecap="square"
              />
              {/* Núcleo EPS interior */}
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="#E2E8F0"
                strokeWidth={Math.max(2, tSvg - 2.5)}
                strokeLinecap="square"
              />
            </g>
          );
        })}

        {/* 1. Muros Perimetrales Dobles con Grosor Real SIP + Soporte de Arrastre Directo (Edge Dragging) */}
        {wallSegments.map((seg) => {
          const p1 = toSvgPoint(seg.start);
          const p2 = toSvgPoint(seg.end);
          const thicknessSvg = Math.max(12, wallThicknessCm * scale);

          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.hypot(dx, dy);
          if (len === 0) return null;

          const nx = -dy / len;
          const ny = dx / len;
          const wHalf = thicknessSvg / 2;

          const cornerA = { x: p1.x + nx * wHalf, y: p1.y + ny * wHalf };
          const cornerB = { x: p2.x + nx * wHalf, y: p2.y + ny * wHalf };
          const cornerC = { x: p2.x - nx * wHalf, y: p2.y - ny * wHalf };
          const cornerD = { x: p1.x - nx * wHalf, y: p1.y - ny * wHalf };

          const wallPath = `M ${cornerA.x} ${cornerA.y} L ${cornerB.x} ${cornerB.y} L ${cornerC.x} ${cornerC.y} L ${cornerD.x} ${cornerD.y} Z`;

          const isHorizontal = Math.abs(dx) >= Math.abs(dy);
          const isHovered = hoveredWallIndex === seg.index;
          const isDraggingThis = draggingWallIndex === seg.index;

          // Modulación SIP a lo largo del muro (líneas de unión de paneles cada 1.22m)
          const panelsCount = Math.floor(seg.length / 122);
          const panelJoinLines = [];
          for (let pIdx = 1; pIdx <= panelsCount; pIdx++) {
            const ratio = (pIdx * 122) / seg.length;
            if (ratio < 0.95) {
              const jX1 = p1.x + dx * ratio + nx * wHalf;
              const jY1 = p1.y + dy * ratio + ny * wHalf;
              const jX2 = p1.x + dx * ratio - nx * wHalf;
              const jY2 = p1.y + dy * ratio - ny * wHalf;
              panelJoinLines.push({ x1: jX1, y1: jY1, x2: jX2, y2: jY2, id: `join_${seg.index}_${pIdx}` });
            }
          }

          const midWallX = (p1.x + p2.x) / 2;
          const midWallY = (p1.y + p2.y) / 2;

          return (
            <g
              key={`wall_sip_${seg.index}`}
              className={`cursor-${isHorizontal ? 'ns' : 'ew'}-resize group`}
              onMouseEnter={() => setHoveredWallIndex(seg.index)}
              onMouseLeave={() => setHoveredWallIndex(null)}
              onMouseDown={(e) => handleWallMouseDown(seg.index, e)}
            >
              {/* Estructura del Panel SIP (Relleno OSB/EPS) */}
              <path
                d={wallPath}
                fill={isDraggingThis ? '#FEF08A' : isHovered ? '#FEF9C3' : '#F8FAFC'}
                stroke={isDraggingThis ? '#EA580C' : isHovered ? '#2563EB' : '#1E293B'}
                strokeWidth={isHovered || isDraggingThis ? '3' : '2.4'}
                strokeLinejoin="round"
                className="transition-colors duration-100"
              />
              <path d={wallPath} fill="url(#sip-panel-pattern)" fillOpacity={0.35} />

              {/* Juntas de unión de paneles SIP cada 1.22 m */}
              {panelJoinLines.map((j) => (
                <line
                  key={j.id}
                  x1={j.x1}
                  y1={j.y1}
                  x2={j.x2}
                  y2={j.y2}
                  stroke="#0284C7"
                  strokeWidth="1.2"
                  strokeDasharray="2 1.5"
                />
              ))}

              {/* Indicador de arrastre de muro en hover */}
              {(isHovered || isDraggingThis) && (
                <g transform={`translate(${midWallX}, ${midWallY})`}>
                  <circle r="14" fill="#2563EB" fillOpacity="0.9" />
                  {isHorizontal ? (
                    <>
                      <polygon points="0,-8 -4,-3 4,-3" fill="#FFFFFF" />
                      <polygon points="0,8 -4,3 4,3" fill="#FFFFFF" />
                      <line x1="0" y1="-5" x2="0" y2="5" stroke="#FFFFFF" strokeWidth="1.5" />
                    </>
                  ) : (
                    <>
                      <polygon points="-8,0 -3,-4 -3,4" fill="#FFFFFF" />
                      <polygon points="8,0 3,-4 3,4" fill="#FFFFFF" />
                      <line x1="-5" y1="0" x2="5" y2="0" stroke="#FFFFFF" strokeWidth="1.5" />
                    </>
                  )}
                </g>
              )}
            </g>
          );
        })}

        {/* 2. Líneas de Cota Exteriores en Azul */}
        {wallSegments.map((seg) => {
          const p1 = toSvgPoint(seg.start);
          const p2 = toSvgPoint(seg.end);
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.hypot(dx, dy);
          if (len === 0) return null;

          const nx = -dy / len;
          const ny = dx / len;

          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          const toCenterX = polyCenter.x - midX;
          const toCenterY = polyCenter.y - midY;
          const dot = nx * toCenterX + ny * toCenterY;
          const outFactor = dot > 0 ? -1 : 1;

          const cotaOffset = (wallThicknessCm * scale) / 2 + 36;
          const c1 = { x: p1.x + nx * outFactor * cotaOffset, y: p1.y + ny * outFactor * cotaOffset };
          const c2 = { x: p2.x + nx * outFactor * cotaOffset, y: p2.y + ny * outFactor * cotaOffset };

          const ext1Start = { x: p1.x + nx * outFactor * 6, y: p1.y + ny * outFactor * 6 };
          const ext1End = { x: p1.x + nx * outFactor * (cotaOffset + 8), y: p1.y + ny * outFactor * (cotaOffset + 8) };

          const ext2Start = { x: p2.x + nx * outFactor * 6, y: p2.y + ny * outFactor * 6 };
          const ext2End = { x: p2.x + nx * outFactor * (cotaOffset + 8), y: p2.y + ny * outFactor * (cotaOffset + 8) };

          const labelDist = cotaOffset + 28;
          const labelPos = { x: midX + nx * outFactor * labelDist, y: midY + ny * outFactor * labelDist };
          const textPos = { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 };

          let textAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
          if (textAngle > 90 || textAngle < -90) textAngle += 180;

          // Cálculo de modulación de paneles SIP (ej. 7.2 paneles SIP)
          const sipPanels = (seg.length / 122).toFixed(1);

          return (
            <g key={`cota_sip_${seg.index}`} className="pointer-events-none">
              {/* Líneas testigo */}
              <line x1={ext1Start.x} y1={ext1Start.y} x2={ext1End.x} y2={ext1End.y} stroke="#2563EB" strokeWidth="1.2" strokeOpacity={0.8} />
              <line x1={ext2Start.x} y1={ext2Start.y} x2={ext2End.x} y2={ext2End.y} stroke="#2563EB" strokeWidth="1.2" strokeOpacity={0.8} />

              {/* Línea principal con flechas */}
              <line
                x1={c1.x}
                y1={c1.y}
                x2={c2.x}
                y2={c2.y}
                stroke="#2563EB"
                strokeWidth="1.6"
                markerStart="url(#sip-arrow-start)"
                markerEnd="url(#sip-arrow-end)"
              />

              {/* Letra identificadora de la pared (A, B, C...) */}
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#18181B"
                fontSize="22"
                fontWeight="900"
                fontFamily="system-ui, sans-serif"
              >
                {seg.label}
              </text>

              {/* Valor numérico de cota (ej. 880.0 cm / 7.2 Paneles) */}
              <g transform={`translate(${textPos.x}, ${textPos.y}) rotate(${textAngle})`}>
                <rect x="-42" y="-12" width="84" height="24" fill="#FFFFFF" rx="4" fillOpacity={0.95} stroke="#DBEAFE" strokeWidth="1" />
                <text
                  x="0"
                  y="-2"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#2563EB"
                  fontSize="12"
                  fontWeight="800"
                  fontFamily="system-ui, monospace"
                >
                  {seg.length.toFixed(1)} cm
                </text>
                <text
                  x="0"
                  y="7"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#059669"
                  fontSize="8.5"
                  fontWeight="700"
                  fontFamily="system-ui, sans-serif"
                >
                  {sipPanels} Paneles SIP
                </text>
              </g>
            </g>
          );
        })}

        {/* 3. Arcos de Ángulo en cada Vértice */}
        {!isFreehandMode && wallSegments.map((seg) => {
          const currentP = toSvgPoint(seg.end);
          const prevIndex = (seg.index + vertices.length) % vertices.length;
          const nextIndex = (seg.index + 2) % vertices.length;
          const prevP = toSvgPoint(vertices[seg.index]);
          const nextP = toSvgPoint(vertices[nextIndex]);

          const v1 = { x: prevP.x - currentP.x, y: prevP.y - currentP.y };
          const v2 = { x: nextP.x - currentP.x, y: nextP.y - currentP.y };

          const a1 = Math.atan2(v1.y, v1.x);
          const a2 = Math.atan2(v2.y, v2.x);

          const r = 24;
          const arcStartX = currentP.x + Math.cos(a1) * r;
          const arcStartY = currentP.y + Math.sin(a1) * r;
          const arcEndX = currentP.x + Math.cos(a2) * r;
          const arcEndY = currentP.y + Math.sin(a2) * r;

          let midAngle = (a1 + a2) / 2;
          if (Math.abs(a2 - a1) > Math.PI) midAngle += Math.PI;
          const labelR = r + 14;
          const angleLabelX = currentP.x + Math.cos(midAngle) * labelR;
          const angleLabelY = currentP.y + Math.sin(midAngle) * labelR;

          const is90Deg = seg.angleWithNext === 90 || seg.angleWithNext === 270;

          return (
            <g key={`angle_arc_sip_${seg.index}`} className="pointer-events-none">
              <path
                d={`M ${arcStartX} ${arcStartY} A ${r} ${r} 0 0 1 ${arcEndX} ${arcEndY}`}
                fill="none"
                stroke={is90Deg ? '#0D9488' : '#EA580C'}
                strokeWidth="1.4"
                strokeDasharray="2.5 1.5"
              />
              <text
                x={angleLabelX}
                y={angleLabelY}
                textAnchor="middle"
                dominantBaseline="central"
                fill={is90Deg ? '#0D9488' : '#EA580C'}
                fontSize="11"
                fontWeight="800"
                fontFamily="system-ui, sans-serif"
              >
                {seg.angleWithNext}°
              </text>
            </g>
          );
        })}

        {/* 4. Display Central de Superficie Útil y Perímetro */}
        {!isFreehandMode && vertices.length >= 3 && (
          <g transform={`translate(${polyCenter.x}, ${polyCenter.y})`} className="pointer-events-none">
            <rect x="-105" y="-36" width="210" height="72" fill="#FFFFFF" rx="8" fillOpacity={0.9} stroke="#E2E8F0" strokeWidth="1.5" />
            <text
              x="0"
              y="-6"
              textAnchor="middle"
              dominantBaseline="central"
              fill="#2563EB"
              fontSize="32"
              fontWeight="900"
              fontFamily="system-ui, sans-serif"
              letterSpacing="-0.5px"
            >
              {areaM2.toFixed(2)} m²
            </text>
            <text
              x="0"
              y="18"
              textAnchor="middle"
              dominantBaseline="central"
              fill="#64748B"
              fontSize="11"
              fontWeight="700"
              fontFamily="system-ui, sans-serif"
            >
              Perímetro: {perimeterM.toFixed(2)} m | SIP {roofStyle === 'gable_valley' ? '2 Aguas' : roofStyle === 'single_shed' ? '1 Agua' : 'Plano'}
            </text>
          </g>
        )}

        {/* 5. Nodos Interactivos de Vértice con Flechas Direccionales Verdes */}
        {vertices.map((v, i) => {
          const pt = toSvgPoint(v);
          const isSelected = selectedVertexIndex === i;
          const isDragging = draggingVertexIndex === i;

          return (
            <g
              key={v.id}
              transform={`translate(${pt.x}, ${pt.y})`}
              className="cursor-move group"
              onMouseDown={(e) => handleVertexMouseDown(i, e)}
            >
              <circle
                r={isSelected || isDragging ? 26 : 20}
                fill="#0D9488"
                fillOpacity={isSelected || isDragging ? 0.45 : 0.2}
                className="transition-all duration-150"
              />
              <circle
                r={isDragging ? 12 : 10}
                fill="#0D9488"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                className="shadow-md transition-all duration-150"
              />

              {/* 4 Flechas direccionales triangulares */}
              <polygon points="0,-18 -4,-13 4,-13" fill="none" stroke="#0D9488" strokeWidth="1.6" />
              <polygon points="0,18 -4,13 4,13" fill="none" stroke="#0D9488" strokeWidth="1.6" />
              <polygon points="-18,0 -13,-4 -13,4" fill="none" stroke="#0D9488" strokeWidth="1.6" />
              <polygon points="18,0 13,-4 13,4" fill="none" stroke="#0D9488" strokeWidth="1.6" />
            </g>
          );
        })}

        {/* 6. Modo Diseño Libre / Dibuja Segmento a Segmento Ortogonal a 90° */}
        {vertices.length === 0 && isFreehandMode && (
          <g transform={`translate(${viewBoxSize / 2}, ${viewBoxSize / 2})`} className="pointer-events-none">
            <rect
              x="-180"
              y="-45"
              width="360"
              height="90"
              rx="14"
              fill="#FFFFFF"
              fillOpacity={0.97}
              stroke="#EA580C"
              strokeWidth="2.5"
              strokeDasharray="5 3"
              className="shadow-xl"
            />
            <text
              x="0"
              y="-12"
              textAnchor="middle"
              dominantBaseline="central"
              fill="#C2410C"
              fontSize="16"
              fontWeight="900"
              fontFamily="system-ui, sans-serif"
            >
              📐 TRAZADO ORTOGONAL A 90°
            </text>
            <text
              x="0"
              y="16"
              textAnchor="middle"
              dominantBaseline="central"
              fill="#475569"
              fontSize="12.5"
              fontWeight="700"
              fontFamily="system-ui, sans-serif"
            >
              Haz clic en cualquier punto para fijar la primera esquina
            </text>
          </g>
        )}

        {isFreehandMode && freehandHoverPos && vertices.length > 0 && (() => {
          const lastV = vertices[vertices.length - 1];
          const dist = Math.round(distanceBetween(lastV, freehandHoverPos));
          const panels = (dist / 122).toFixed(1);
          const p1 = toSvgPoint(lastV);
          const p2 = toSvgPoint(freehandHoverPos);
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;

          return (
            <g className="pointer-events-none">
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="#EA580C"
                strokeWidth="4"
                strokeDasharray="6 4"
              />
              <circle
                cx={p2.x}
                cy={p2.y}
                r="9"
                fill="#EA580C"
                stroke="#FFFFFF"
                strokeWidth="2.5"
              />
              {/* Badge informativo de longitud ortogonal en tiempo real */}
              <g transform={`translate(${midX}, ${midY - 22})`}>
                <rect
                  x="-65"
                  y="-13"
                  width="130"
                  height="26"
                  rx="6"
                  fill="#0F172A"
                  stroke="#EA580C"
                  strokeWidth="1.5"
                />
                <text
                  x="0"
                  y="0"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#F8FAFC"
                  fontSize="11"
                  fontWeight="800"
                  fontFamily="system-ui, monospace"
                >
                  {dist} cm • {panels} SIP
                </text>
              </g>
            </g>
          );
        })()}

        {/* Indicador visual de cierre de polígono */}
        {vertices.length >= 3 && isFreehandMode && (
          <g
            transform={`translate(${toSvgPoint(vertices[0]).x}, ${toSvgPoint(vertices[0]).y})`}
            className="pointer-events-none"
          >
            <circle r="32" fill="#22C55E" fillOpacity="0.3" className="animate-pulse" />
            <circle r="14" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2.5" />
            <g transform="translate(0, -32)">
              <rect x="-60" y="-12" width="120" height="24" rx="6" fill="#15803D" stroke="#FFFFFF" strokeWidth="1" />
              <text
                x="0"
                y="0"
                textAnchor="middle"
                dominantBaseline="central"
                fill="#FFFFFF"
                fontSize="10"
                fontWeight="900"
                fontFamily="system-ui, sans-serif"
              >
                🎯 Clic para CERRAR
              </text>
            </g>
          </g>
        )}
      </svg>

      {/* Barra de Guía Inferior */}
      <div className="absolute bottom-3 right-4 bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm px-3.5 py-1.5 rounded-md text-[11px] text-slate-700 flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
          💡 <strong>Arrastra muros</strong> o <strong>puntos verdes</strong> para ajustar dimensiones a 90°
        </span>
        <span className="text-slate-300">|</span>
        <span className="font-semibold text-blue-600">
          Snap: {snapMode === 'sip_122' ? 'Panel SIP (1.22 m)' : snapMode === 'sip_61' ? 'Medio Panel (0.61 m)' : snapMode === 'fine_10' ? '10 cm' : '5 cm'}
        </span>
      </div>
    </div>
  );
}
