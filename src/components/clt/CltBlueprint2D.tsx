import React, { useState, useRef } from 'react';
import {
  useCltHouseStore,
  CltWallSegment,
  GltBeamItem,
  CltOpening,
  CLT_SPECS_CATALOG,
} from '../../store/cltHouseStore';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Ruler,
  Eye,
  DoorClosed,
  Plus,
  Trash2,
} from 'lucide-react';

export function CltBlueprint2D() {
  const {
    widthM,
    lengthM,
    numStories,
    storyHeightM,
    wallCltType,
    slabCltType,
    walls,
    beams,
    openings,
    activeStoryLevel,
    setActiveStoryLevel,
    addOpening,
    removeOpening,
    projectName,
  } = useCltHouseStore();

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);

  // Dimensiones del canvas SVG
  const svgWidth = 800;
  const svgHeight = 600;

  // Escala en píxeles por metro
  const maxDim = Math.max(widthM, lengthM, 8);
  const scale = (400 / maxDim) * zoom;

  const originX = svgWidth / 2 - (widthM * scale) / 2 + pan.x;
  const originY = svgHeight / 2 - (lengthM * scale) / 2 + pan.y;

  // Muros del piso activo
  const activeWalls = walls.filter((w) => w.storyLevel === activeStoryLevel);
  const activeBeams = beams.filter((b) => b.storyLevel === activeStoryLevel);
  const activeOpenings = openings.filter((op) => op.storyLevel === activeStoryLevel);

  const wallSpec = CLT_SPECS_CATALOG[wallCltType];

  return (
    <div className="relative w-full h-full bg-[#0A0D12] select-none flex flex-col">
      {/* Barra superior de herramientas 2D */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-zinc-900/90 border-b border-white/10 text-xs text-slate-300 gap-3 z-10">
        <div className="flex items-center gap-2">
          <span className="font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
            <Ruler size={14} /> Plano Estructural 2D
          </span>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5">
            {Array.from({ length: numStories }).map((_, idx) => {
              const floorNum = idx + 1;
              return (
                <button
                  key={`floor_btn_${floorNum}`}
                  onClick={() => setActiveStoryLevel(floorNum)}
                  className={`px-3 py-1 rounded-md font-bold text-xs transition-all cursor-pointer ${
                    activeStoryLevel === floorNum
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Piso {floorNum}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-slate-300 rounded-lg cursor-pointer"
            title="Aumentar Zoom"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-slate-300 rounded-lg cursor-pointer"
            title="Disminuir Zoom"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-slate-300 rounded-lg cursor-pointer"
            title="Centrar Vista"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Viewport SVG Interactivo */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        <svg
          className="w-full h-full cursor-crosshair"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        >
          {/* Grilla milimétrica técnica de fondo */}
          <defs>
            <pattern id="grid_minor" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1E293B" strokeWidth="0.5" />
            </pattern>
            <pattern id="grid_major" width="100" height="100" patternUnits="userSpaceOnUse">
              <rect width="100" height="100" fill="url(#grid_minor)" />
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#334155" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid_major)" />

          {/* Gráfico Estructural */}
          <g>
            {/* Losa o Radier de Fondo */}
            <rect
              x={originX - 10}
              y={originY - 10}
              width={widthM * scale + 20}
              height={lengthM * scale + 20}
              fill="#111827"
              stroke="#374151"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />

            {/* Muros CLT Activos */}
            {activeWalls.map((wall) => {
              const x1 = originX + wall.startX * scale;
              const y1 = originY + wall.startY * scale;
              const x2 = originX + wall.endX * scale;
              const y2 = originY + wall.endY * scale;

              const dx = x2 - x1;
              const dy = y2 - y1;
              const len = Math.sqrt(dx * dx + dy * dy);
              const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

              const isSelected = selectedWallId === wall.id;
              const wallThicknessPx = Math.max(6, (wall.thicknessMm / 1000) * scale * 2.5);

              // Vanos de este muro
              const wallOps = activeOpenings.filter((o) => o.wallId === wall.id);

              return (
                <g
                  key={wall.id}
                  onClick={() => setSelectedWallId(wall.id)}
                  className="cursor-pointer group"
                >
                  {/* Cuerpo del Muro CLT con relleno tramado */}
                  <g transform={`translate(${x1}, ${y1}) rotate(${angleDeg})`}>
                    <rect
                      x={0}
                      y={-wallThicknessPx / 2}
                      width={len}
                      height={wallThicknessPx}
                      fill={wall.isInterior ? '#D97706' : '#EA580C'}
                      stroke={isSelected ? '#FBBF24' : '#C2410C'}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      className="transition-all hover:fill-orange-400"
                    />

                    {/* Segmentación visual de paneles si es multi-panel */}
                    {wall.segmentCount > 1 &&
                      Array.from({ length: wall.segmentCount - 1 }).map((_, sIdx) => {
                        const segX = (len / wall.segmentCount) * (sIdx + 1);
                        return (
                          <line
                            key={`seg_line_${sIdx}`}
                            x1={segX}
                            y1={-wallThicknessPx / 2}
                            x2={segX}
                            y2={wallThicknessPx / 2}
                            stroke="#451A03"
                            strokeWidth="2"
                            strokeDasharray="2 1"
                          />
                        );
                      })}

                    {/* Vanos de Puertas / Ventanas en 2D */}
                    {wallOps.map((op) => {
                      const opXPx = (op.offsetFromStartCm / 100) * scale;
                      const opWPx = (op.widthCm / 100) * scale;

                      return (
                        <g key={op.id}>
                          <rect
                            x={opXPx}
                            y={-wallThicknessPx / 2 - 2}
                            width={opWPx}
                            height={wallThicknessPx + 4}
                            fill="#0284C7"
                            stroke="#38BDF8"
                            strokeWidth="1.5"
                          />
                          <text
                            x={opXPx + opWPx / 2}
                            y={-wallThicknessPx / 2 - 6}
                            fill="#38BDF8"
                            fontSize="9"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {op.type === 'door' ? 'P' : 'V'} ({op.widthCm}x{op.heightCm})
                          </text>
                        </g>
                      );
                    })}

                    {/* Simbología de Hold-downs en esquinas (Triángulos naranjas) */}
                    <polygon
                      points={`6,${-wallThicknessPx / 2 - 4} 14,${-wallThicknessPx / 2} 6,${wallThicknessPx / 2 + 4}`}
                      fill="#F97316"
                      stroke="#FFFFFF"
                      strokeWidth="0.8"
                    />
                    <polygon
                      points={`${len - 6},${-wallThicknessPx / 2 - 4} ${len - 14},${-wallThicknessPx / 2} ${len - 6},${wallThicknessPx / 2 + 4}`}
                      fill="#F97316"
                      stroke="#FFFFFF"
                      strokeWidth="0.8"
                    />
                  </g>

                  {/* Etiqueta del eje / pier */}
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 12}
                    fill="#FDBA74"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="select-none"
                  >
                    {wall.code} (L={wall.lengthM.toFixed(2)}m)
                  </text>
                </g>
              );
            })}

            {/* Vigas GLT Activas */}
            {activeBeams.map((beam) => {
              const bx1 = originX + beam.startX * scale;
              const by1 = originY + beam.startY * scale;
              const bx2 = originX + beam.endX * scale;
              const by2 = originY + beam.endY * scale;

              return (
                <g key={beam.id}>
                  <line
                    x1={bx1}
                    y1={by1}
                    x2={bx2}
                    y2={by2}
                    stroke="#F59E0B"
                    strokeWidth="4"
                    strokeDasharray="6 3"
                  />
                  <text
                    x={(bx1 + bx2) / 2}
                    y={(by1 + by2) / 2 + 14}
                    fill="#FCD34D"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {beam.name} ({beam.section})
                  </text>
                </g>
              );
            })}

            {/* Cotas Generales Exteriores */}
            {/* Cota Superior (Ancho) */}
            <g transform={`translate(${originX}, ${originY - 35})`}>
              <line x1={0} y1={0} x2={widthM * scale} y2={0} stroke="#94A3B8" strokeWidth="1" />
              <line x1={0} y1={-5} x2={0} y2={5} stroke="#94A3B8" strokeWidth="1.5" />
              <line x1={widthM * scale} y1={-5} x2={widthM * scale} y2={5} stroke="#94A3B8" strokeWidth="1.5" />
              <text
                x={(widthM * scale) / 2}
                y={-6}
                fill="#CBD5E1"
                fontSize="11"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                {Math.round(widthM * 1000)} mm
              </text>
            </g>

            {/* Cota Izquierda (Largo) */}
            <g transform={`translate(${originX - 35}, ${originY})`}>
              <line x1={0} y1={0} x2={0} y2={lengthM * scale} stroke="#94A3B8" strokeWidth="1" />
              <line x1={-5} y1={0} x2={5} y2={0} stroke="#94A3B8" strokeWidth="1.5" />
              <line x1={-5} y1={lengthM * scale} x2={5} y2={lengthM * scale} stroke="#94A3B8" strokeWidth="1.5" />
              <text
                x={-8}
                y={(lengthM * scale) / 2}
                fill="#CBD5E1"
                fontSize="11"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
                transform={`rotate(-90, -8, ${(lengthM * scale) / 2})`}
              >
                {Math.round(lengthM * 1000)} mm
              </text>
            </g>
          </g>

          {/* Viñeta Técnica Formal en la esquina inferior derecha */}
          <g transform={`translate(${svgWidth - 260}, ${svgHeight - 110})`}>
            <rect
              width="250"
              height="100"
              fill="#0F172A"
              stroke="#EA580C"
              strokeWidth="1.5"
              rx="4"
            />
            <text x="12" y="20" fill="#F97316" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
              ARQUIFY • PLANO ESTRUCTURAL CLT
            </text>
            <text x="12" y="38" fill="#E2E8F0" fontSize="9" fontFamily="sans-serif">
              PROYECTO: {projectName.slice(0, 24)}
            </text>
            <text x="12" y="54" fill="#94A3B8" fontSize="8.5" fontFamily="sans-serif">
              NIVEL: Piso {activeStoryLevel} de {numStories} | H={storyHeightM}m
            </text>
            <text x="12" y="70" fill="#94A3B8" fontSize="8.5" fontFamily="sans-serif">
              SISTEMA: Muros {wallSpec.name} ({wallSpec.totalThicknessMm}mm)
            </text>
            <text x="12" y="86" fill="#EA580C" fontSize="8" fontWeight="bold" fontFamily="monospace">
              NORMATIVA: NCh433 • NCh1198 • NIUFORM
            </text>
          </g>
        </svg>
      </div>

      {/* Leyenda Técnica Flotante */}
      <div className="absolute bottom-4 left-4 bg-zinc-900/90 backdrop-blur-md p-3 rounded-xl border border-white/10 text-xs text-slate-300 shadow-xl flex flex-col gap-1.5 z-10">
        <div className="font-bold text-orange-400 text-[11px] uppercase tracking-wider mb-1">
          Simbología Técnica CLT / GLT
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-2 bg-orange-600 rounded-sm border border-orange-400" />
          <span>Muro Perimetral CLT (Cortante)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-2 bg-amber-600 rounded-sm border border-amber-400" />
          <span>Tabique / Muro Interior CLT</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-1 border-t-2 border-dashed border-amber-400" />
          <span>Viga / Pilar GLT (MLE 24h)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-sky-500 rounded-sm" />
          <span>Vano de Ventana / Puerta</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-orange-500 rotate-45" />
          <span>Hold-down (Anclaje Vuelco HHDQ)</span>
        </div>
      </div>
    </div>
  );
}
