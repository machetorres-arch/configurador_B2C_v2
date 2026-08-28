import React from 'react';
import { useSipHouseStore, getInteriorZones } from '../../store/sipHouseStore';
import { calculateSipHouseQuantities } from '../../utils/sipExcelGenerator';

export function SipBlueprint() {
  const state = useSipHouseStore();
  const {
    dimensions: dim,
    openings,
    interiorWalls,
    layoutPreset,
    presetParams,
    coreType,
    wallThicknessMm,
    roofThicknessMm,
    floorThicknessMm,
  } = state;

  const metrics = calculateSipHouseQuantities(
    dim,
    state.foundationType,
    state.exteriorCladding,
    state.roofCladding,
    state.interiorCeiling,
    state.flooringType,
    state.openings,
    state.mepNetwork,
    coreType,
    wallThicknessMm,
    roofThicknessMm,
    floorThicknessMm,
    interiorWalls
  );

  const isLShape = dim.shape === 'l_shape';
  const lengthCm = dim.length;
  const widthCm = dim.width;
  const wingWidthCm = isLShape ? (dim.wingWidth || 360) : 0;
  const wingLengthCm = isLShape ? (dim.wingLength || 420) : 0;

  const totalSpanX_cm = isLShape ? widthCm + wingWidthCm : widthCm;
  const totalSpanZ_cm = lengthCm;

  const scale = Math.min(0.65, Math.max(0.38, 540 / Math.max(totalSpanX_cm, totalSpanZ_cm)));

  const margin = 140;
  const svgW = totalSpanX_cm * scale + margin * 2;
  const svgH = totalSpanZ_cm * scale + margin * 2;

  const startX = margin;
  const startY = margin;

  const toSvgX = (houseXCm: number) => startX + (houseXCm + widthCm / 2) * scale;
  const toSvgY = (houseZCm: number) => startY + (houseZCm + lengthCm / 2) * scale;

  const zones = getInteriorZones(layoutPreset, dim, presetParams);

  // Puntos del contorno perimetral exterior
  const slabPath = isLShape
    ? `M ${toSvgX(-widthCm / 2)} ${toSvgY(-lengthCm / 2)} ` +
      `L ${toSvgX(widthCm / 2)} ${toSvgY(-lengthCm / 2)} ` +
      `L ${toSvgX(widthCm / 2)} ${toSvgY(lengthCm / 2 - wingLengthCm)} ` +
      `L ${toSvgX(widthCm / 2 + wingWidthCm)} ${toSvgY(lengthCm / 2 - wingLengthCm)} ` +
      `L ${toSvgX(widthCm / 2 + wingWidthCm)} ${toSvgY(lengthCm / 2)} ` +
      `L ${toSvgX(-widthCm / 2)} ${toSvgY(lengthCm / 2)} Z`
    : `M ${toSvgX(-widthCm / 2)} ${toSvgY(-lengthCm / 2)} ` +
      `L ${toSvgX(widthCm / 2)} ${toSvgY(-lengthCm / 2)} ` +
      `L ${toSvgX(widthCm / 2)} ${toSvgY(lengthCm / 2)} ` +
      `L ${toSvgX(-widthCm / 2)} ${toSvgY(lengthCm / 2)} Z`;

  return (
    <div className="w-full h-full bg-slate-950 p-6 overflow-auto flex flex-col items-center justify-start text-white">
      <div className="w-full max-w-5xl bg-slate-900/90 border border-white/10 rounded-2xl p-5 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest bg-sky-500/20 text-sky-400 font-bold px-2.5 py-1 rounded-md">
              Lámina 01 - PROSIP BIM
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {isLShape ? 'Tipología Planta en L' : 'Tipología Rectangular'} | Escala Paramétrica
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            {isLShape ? 'Planta de Arquitectura Casa en L SIP' : 'Planta de Arquitectura Cabaña SIP'}
          </h2>
          <p className="text-xs text-slate-400">
            {isLShape
              ? `Crujía Principal: ${(widthCm / 100).toFixed(2)}m x ${(lengthCm / 100).toFixed(2)}m | Ala Lateral: ${(wingWidthCm / 100).toFixed(2)}m x ${(wingLengthCm / 100).toFixed(2)}m | Cubierta ${dim.roofStyle === 'gable_valley' ? '2 Aguas con Limahoya' : dim.roofStyle === 'single_shed' ? '1 Agua' : 'Plana'}`
              : `Dimensiones: ${(widthCm / 100).toFixed(2)}m (Ancho) x ${(lengthCm / 100).toFixed(2)}m (Largo) | Cubierta ${dim.roofStyle === 'single_shed' ? '1 Agua' : dim.roofStyle === 'flat' ? 'Plana' : '2 Aguas'}`}
          </p>
        </div>

        <div className="flex items-center gap-6 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-white/5">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Superficie Útil</div>
            <div className="text-lg font-black text-sky-400 font-mono">{metrics.totalFloorM2} m²</div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Placas SIP Totales</div>
            <div className="text-lg font-black text-amber-400 font-mono">
              {metrics.floorSipCount + metrics.wallExtSip114Count + metrics.wallIntSip90Count + metrics.roofSip210Count} Plns
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-sky-500/20 rounded-2xl p-6 shadow-2xl overflow-auto max-w-5xl w-full flex justify-center">
        <svg width={svgW} height={svgH} className="font-mono select-none">
          <defs>
            <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
            </pattern>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
            </marker>
          </defs>

          <rect width={svgW} height={svgH} fill="url(#gridPattern)" />

          {/* Símbolo Norte Arquitectónico */}
          <g transform={`translate(${svgW - 70}, 65)`}>
            <circle cx="0" cy="0" r="22" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
            <path d="M 0 -18 L 6 8 L 0 4 L -6 8 Z" fill="#38bdf8" />
            <path d="M 0 -18 L 0 4 L -6 8 Z" fill="#0284c7" />
            <text x="0" y="-24" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">
              N
            </text>
          </g>

          {/* Símbolo N.P.T. */}
          <g transform={`translate(${toSvgX(-widthCm / 2) + 40}, ${toSvgY(lengthCm / 2) - 25})`}>
            <circle cx="0" cy="0" r="8" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
            <path d="M -8 0 L 8 0 M 0 -8 L 0 8" stroke="#f59e0b" strokeWidth="1" />
            <path d="M 0 0 L 8 0 A 8 8 0 0 1 0 8 Z" fill="#f59e0b" />
            <path d="M 0 0 L -8 0 A 8 8 0 0 1 0 -8 Z" fill="#f59e0b" />
            <text x="14" y="4" fill="#f59e0b" fontSize="9" fontWeight="bold">
              N.P.T. +0.20
            </text>
          </g>

          {/* Planta y Elementos Estructurales */}
          <g>
            {/* Losa Base SIP (Polígono Exacto Rectangular o en L) */}
            <path d={slabPath} fill="#0f172a" stroke="#38bdf8" strokeWidth="3.5" />

            {/* Modulación de Losa SIP (1.22 x 2.44m) */}
            <g opacity="0.25">
              {/* Líneas de modulación en Crujía Principal */}
              {Array.from({ length: Math.ceil(widthCm / 122) }).map((_, i) => {
                const x = toSvgX(-widthCm / 2 + (i + 1) * 122);
                if (x >= toSvgX(widthCm / 2)) return null;
                return (
                  <line
                    key={`floor-mod-main-x-${i}`}
                    x1={x}
                    y1={toSvgY(-lengthCm / 2)}
                    x2={x}
                    y2={toSvgY(lengthCm / 2)}
                    stroke="#38bdf8"
                    strokeWidth="0.75"
                    strokeDasharray="4 4"
                  />
                );
              })}
              {/* Líneas de modulación en Ala Lateral */}
              {isLShape &&
                Array.from({ length: Math.ceil(wingWidthCm / 122) }).map((_, i) => {
                  const x = toSvgX(widthCm / 2 + (i + 1) * 122);
                  if (x >= toSvgX(widthCm / 2 + wingWidthCm)) return null;
                  return (
                    <line
                      key={`floor-mod-wing-x-${i}`}
                      x1={x}
                      y1={toSvgY(lengthCm / 2 - wingLengthCm)}
                      x2={x}
                      y2={toSvgY(lengthCm / 2)}
                      stroke="#38bdf8"
                      strokeWidth="0.75"
                      strokeDasharray="4 4"
                    />
                  );
                })}
            </g>

            {/* Viga Dintel Estructural de Encuentro en L (en X = widthCm / 2) */}
            {isLShape && (
              <g>
                <line
                  x1={toSvgX(widthCm / 2)}
                  y1={toSvgY(lengthCm / 2 - wingLengthCm)}
                  x2={toSvgX(widthCm / 2)}
                  y2={toSvgY(lengthCm / 2)}
                  stroke="#f59e0b"
                  strokeWidth="3.5"
                  strokeDasharray="6 3"
                />
                {/* Pilares en extremos de vano de encuentro */}
                <rect
                  x={toSvgX(widthCm / 2) - 4}
                  y={toSvgY(lengthCm / 2 - wingLengthCm) - 4}
                  width="8"
                  height="8"
                  fill="#f59e0b"
                />
                <rect
                  x={toSvgX(widthCm / 2) - 4}
                  y={toSvgY(lengthCm / 2) - 4}
                  width="8"
                  height="8"
                  fill="#f59e0b"
                />
                <text
                  x={toSvgX(widthCm / 2) - 10}
                  y={toSvgY(lengthCm / 2 - wingLengthCm / 2)}
                  fill="#f59e0b"
                  fontSize="8"
                  fontWeight="bold"
                  textAnchor="middle"
                  transform={`rotate(-90 ${toSvgX(widthCm / 2) - 10} ${toSvgY(lengthCm / 2 - wingLengthCm / 2)})`}
                >
                  VIGA DINTEL ENCUENTRO 2x8"
                </text>
              </g>
            )}

            {/* Zonas Interiores (Recintos) */}
            {zones.map((zone) => {
              const zx = toSvgX(zone.bounds.minX);
              const zy = toSvgY(zone.bounds.minZ);
              const zw = (zone.bounds.maxX - zone.bounds.minX) * scale;
              const zh = (zone.bounds.maxZ - zone.bounds.minZ) * scale;

              if (zw <= 10 || zh <= 10) return null;

              return (
                <g key={zone.id}>
                  <rect
                    x={zx + 2}
                    y={zy + 2}
                    width={zw - 4}
                    height={zh - 4}
                    fill={zone.color}
                    fillOpacity="0.12"
                    stroke={zone.color}
                    strokeWidth="1"
                    strokeDasharray="4 2"
                    rx="4"
                  />
                  <text
                    x={zx + zw / 2}
                    y={zy + zh / 2 - 8}
                    fill="#f8fafc"
                    fontSize={Math.max(9, Math.min(13, zw / 16))}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {zone.name.toUpperCase()}
                  </text>
                  <text
                    x={zx + zw / 2}
                    y={zy + zh / 2 + 10}
                    fill={zone.color}
                    fontSize={Math.max(8, Math.min(11, zw / 20))}
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {zone.areaM2.toFixed(1)} m²
                  </text>
                </g>
              );
            })}

            {/* Muros Interiores SIP */}
            {interiorWalls &&
              interiorWalls.map((wall) => {
                if (!wall.visible) return null;
                const wx1 = toSvgX(wall.startX);
                const wy1 = toSvgY(wall.startZ);
                const wx2 = toSvgX(wall.endX);
                const wy2 = toSvgY(wall.endZ);

                const wallW = (wall.thicknessMm || 90) * 0.1 * scale;

                const dx = wx2 - wx1;
                const dy = wy2 - wy1;
                const wallLenSvg = Math.hypot(dx, dy);
                const angle = Math.atan2(dy, dx);

                return (
                  <g key={wall.id}>
                    {/* Línea de Muro SIP Interior */}
                    <line
                      x1={wx1}
                      y1={wy1}
                      x2={wx2}
                      y2={wy2}
                      stroke="#e2e8f0"
                      strokeWidth={Math.max(4, wallW)}
                      strokeLinecap="square"
                    />

                    {/* Aperturas / Puertas en el Muro Interior */}
                    {wall.openings &&
                      wall.openings.map((op) => {
                        const doorW_svg = (op.width || 80) * scale;
                        const doorOffset_svg = (op.offsetAlongWall || 40) * scale;

                        const tDoorCenter = (doorOffset_svg + doorW_svg / 2) / wallLenSvg;
                        const doorCenterX = wx1 + dx * tDoorCenter;
                        const doorCenterY = wy1 + dy * tDoorCenter;

                        const tDoor1 = doorOffset_svg / wallLenSvg;
                        const tDoor2 = (doorOffset_svg + doorW_svg) / wallLenSvg;
                        const dx1 = wx1 + dx * tDoor1;
                        const dy1 = wy1 + dy * tDoor1;
                        const dx2 = wx1 + dx * tDoor2;
                        const dy2 = wy1 + dy * tDoor2;

                        return (
                          <g key={op.id}>
                            {/* Borrado de muro en el vano */}
                            <line
                              x1={dx1}
                              y1={dy1}
                              x2={dx2}
                              y2={dy2}
                              stroke="#0f172a"
                              strokeWidth={Math.max(5, wallW + 2)}
                            />
                            {/* Línea de hoja de puerta */}
                            <line
                              x1={dx1}
                              y1={dy1}
                              x2={dx1 - Math.sin(angle) * doorW_svg * 0.8}
                              y2={dy1 + Math.cos(angle) * doorW_svg * 0.8}
                              stroke="#f59e0b"
                              strokeWidth="2.5"
                            />
                            {/* Arco de apertura */}
                            <path
                              d={`M ${dx2} ${dy2} A ${doorW_svg} ${doorW_svg} 0 0 1 ${dx1 - Math.sin(angle) * doorW_svg * 0.8} ${dy1 + Math.cos(angle) * doorW_svg * 0.8}`}
                              fill="none"
                              stroke="#f59e0b"
                              strokeWidth="1"
                              strokeDasharray="2 2"
                            />
                            <text
                              x={doorCenterX}
                              y={doorCenterY - 4}
                              fill="#f59e0b"
                              fontSize="9"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              P-Int ({op.width}x{op.height})
                            </text>
                          </g>
                        );
                      })}
                  </g>
                );
              })}

            {/* Eje de Cumbrera Principal */}
            <line
              x1={toSvgX(0)}
              y1={toSvgY(-lengthCm / 2) - 15}
              x2={toSvgX(0)}
              y2={toSvgY(lengthCm / 2) + 15}
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="6 3"
            />
            <text
              x={toSvgX(0)}
              y={toSvgY(-lengthCm / 2) - 20}
              fill="#f59e0b"
              fontSize="10"
              fontWeight="bold"
              textAnchor="middle"
            >
              EJE CUMBRERA PRINCIPAL (H={dim.ridgeHeight}cm)
            </text>

            {/* Eje de Cumbrera Ala Lateral y Limahoya (en L-Shape) */}
            {isLShape && (
              <g>
                {/* Eje Cumbrera Ala */}
                <line
                  x1={toSvgX(0)}
                  y1={toSvgY(lengthCm / 2 - wingLengthCm / 2)}
                  x2={toSvgX(widthCm / 2 + wingWidthCm) + 15}
                  y2={toSvgY(lengthCm / 2 - wingLengthCm / 2)}
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="6 3"
                />
                <text
                  x={toSvgX(widthCm / 2 + wingWidthCm) + 20}
                  y={toSvgY(lengthCm / 2 - wingLengthCm / 2) + 3}
                  fill="#f59e0b"
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="start"
                >
                  EJE CUMBRERA ALA
                </text>

                {/* Limahoya (Valle de Encuentro Techos a 45°) */}
                <line
                  x1={toSvgX(widthCm / 2)}
                  y1={toSvgY(lengthCm / 2 - wingLengthCm)}
                  x2={toSvgX(0)}
                  y2={toSvgY(lengthCm / 2 - wingLengthCm / 2)}
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
                <text
                  x={(toSvgX(widthCm / 2) + toSvgX(0)) / 2 + 10}
                  y={(toSvgY(lengthCm / 2 - wingLengthCm) + toSvgY(lengthCm / 2 - wingLengthCm / 2)) / 2 - 8}
                  fill="#38bdf8"
                  fontSize="8"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  LIMAHOYA 45°
                </text>
              </g>
            )}

            {/* Vanos Exteriores sobre Muros Perimetrales */}
            {openings.map((op) => {
              const offSvg = (op.offsetAlongWall || 50) * scale;
              const wSvg = op.width * scale;

              // 1. Muro Frontal Principal
              if (op.assignedWall === 'front') {
                const x1 = toSvgX(-widthCm / 2 + op.offsetAlongWall);
                const y = toSvgY(lengthCm / 2);
                return (
                  <g key={op.id}>
                    <line x1={x1} y1={y} x2={x1 + wSvg} y2={y} stroke={op.type === 'door' ? '#f59e0b' : '#38bdf8'} strokeWidth="6" />
                    <text x={x1 + wSvg / 2} y={y + 18} fill={op.type === 'door' ? '#f59e0b' : '#38bdf8'} fontSize="10" textAnchor="middle">
                      {op.code} ({op.width}x{op.height})
                    </text>
                  </g>
                );
              }

              // 2. Muro Frontal de Ala
              if (op.assignedWall === 'wing_front') {
                const x1 = toSvgX(widthCm / 2 + op.offsetAlongWall);
                const y = toSvgY(lengthCm / 2);
                return (
                  <g key={op.id}>
                    <line x1={x1} y1={y} x2={x1 + wSvg} y2={y} stroke={op.type === 'door' ? '#f59e0b' : '#38bdf8'} strokeWidth="6" />
                    <text x={x1 + wSvg / 2} y={y + 18} fill={op.type === 'door' ? '#f59e0b' : '#38bdf8'} fontSize="10" textAnchor="middle">
                      {op.code} ({op.width}x{op.height})
                    </text>
                  </g>
                );
              }

              // 3. Muro Posterior (Back)
              if (op.assignedWall === 'back') {
                const x1 = toSvgX(-widthCm / 2 + op.offsetAlongWall);
                const y = toSvgY(-lengthCm / 2);
                return (
                  <g key={op.id}>
                    <line x1={x1} y1={y} x2={x1 + wSvg} y2={y} stroke={op.type === 'door' ? '#f59e0b' : '#38bdf8'} strokeWidth="6" />
                    <text x={x1 + wSvg / 2} y={y - 10} fill={op.type === 'door' ? '#f59e0b' : '#38bdf8'} fontSize="10" textAnchor="middle">
                      {op.code} ({op.width}x{op.height})
                    </text>
                  </g>
                );
              }

              // 4. Muro Lateral Izquierdo (Left)
              if (op.assignedWall === 'left') {
                const x = toSvgX(-widthCm / 2);
                const y1 = toSvgY(-lengthCm / 2 + op.offsetAlongWall);
                return (
                  <g key={op.id}>
                    <line x1={x} y1={y1} x2={x} y2={y1 + wSvg} stroke={op.type === 'door' ? '#f59e0b' : '#38bdf8'} strokeWidth="6" />
                    <text x={x - 12} y={y1 + wSvg / 2} fill={op.type === 'door' ? '#f59e0b' : '#38bdf8'} fontSize="10" textAnchor="end" alignmentBaseline="middle">
                      {op.code}
                    </text>
                  </g>
                );
              }

              // 5. Muro Lateral Derecho Principal (Right)
              if (op.assignedWall === 'right') {
                const x = toSvgX(widthCm / 2);
                const y1 = toSvgY(-lengthCm / 2 + op.offsetAlongWall);
                return (
                  <g key={op.id}>
                    <line x1={x} y1={y1} x2={x} y2={y1 + wSvg} stroke={op.type === 'door' ? '#f59e0b' : '#38bdf8'} strokeWidth="6" />
                    <text x={x + 12} y={y1 + wSvg / 2} fill={op.type === 'door' ? '#f59e0b' : '#38bdf8'} fontSize="10" textAnchor="start" alignmentBaseline="middle">
                      {op.code}
                    </text>
                  </g>
                );
              }

              // 6. Muro Lateral Exterior de Ala (wing_side)
              if (op.assignedWall === 'wing_side') {
                const x = toSvgX(widthCm / 2 + wingWidthCm);
                const y1 = toSvgY(lengthCm / 2 - wingLengthCm + op.offsetAlongWall);
                return (
                  <g key={op.id}>
                    <line x1={x} y1={y1} x2={x} y2={y1 + wSvg} stroke={op.type === 'door' ? '#f59e0b' : '#38bdf8'} strokeWidth="6" />
                    <text x={x + 12} y={y1 + wSvg / 2} fill={op.type === 'door' ? '#f59e0b' : '#38bdf8'} fontSize="10" textAnchor="start" alignmentBaseline="middle">
                      {op.code}
                    </text>
                  </g>
                );
              }

              // 7. Muro Interior / Patio de Ala (wing_inner o wing_back)
              if (op.assignedWall === 'wing_inner' || op.assignedWall === 'wing_back') {
                const x1 = toSvgX(widthCm / 2 + op.offsetAlongWall);
                const y = toSvgY(lengthCm / 2 - wingLengthCm);
                return (
                  <g key={op.id}>
                    <line x1={x1} y1={y} x2={x1 + wSvg} y2={y} stroke={op.type === 'door' ? '#f59e0b' : '#38bdf8'} strokeWidth="6" />
                    <text x={x1 + wSvg / 2} y={y - 10} fill={op.type === 'door' ? '#f59e0b' : '#38bdf8'} fontSize="10" textAnchor="middle">
                      {op.code} ({op.width}x{op.height})
                    </text>
                  </g>
                );
              }

              return null;
            })}
          </g>

          {/* ========================================================= */}
          {/* COTAS ARQUITECTÓNICAS PARAMÉTRICAS 2D POR NIVELES BIM     */}
          {/* ========================================================= */}
          {state.showDimensions && (
            <g>
              {/* --- NIVEL 1: COTAS GENERALES EXTERIORES --- */}
              {state.dimensionDetailLevel >= 1 && (
                <g>
                  {/* Cota Superior Crujía Principal (Ancho W1) */}
                  <line
                    x1={toSvgX(-widthCm / 2)}
                    y1={toSvgY(-lengthCm / 2) - 60}
                    x2={toSvgX(widthCm / 2)}
                    y2={toSvgY(-lengthCm / 2) - 60}
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                  />
                  <line
                    x1={toSvgX(-widthCm / 2) - 5}
                    y1={toSvgY(-lengthCm / 2) - 55}
                    x2={toSvgX(-widthCm / 2) + 5}
                    y2={toSvgY(-lengthCm / 2) - 65}
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                  />
                  <line
                    x1={toSvgX(widthCm / 2) - 5}
                    y1={toSvgY(-lengthCm / 2) - 55}
                    x2={toSvgX(widthCm / 2) + 5}
                    y2={toSvgY(-lengthCm / 2) - 65}
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                  />
                  <line
                    x1={toSvgX(-widthCm / 2)}
                    y1={toSvgY(-lengthCm / 2) - 65}
                    x2={toSvgX(-widthCm / 2)}
                    y2={toSvgY(-lengthCm / 2)}
                    stroke="#38bdf8"
                    strokeWidth="0.75"
                    strokeDasharray="3 3"
                    opacity="0.6"
                  />
                  <line
                    x1={toSvgX(widthCm / 2)}
                    y1={toSvgY(-lengthCm / 2) - 65}
                    x2={toSvgX(widthCm / 2)}
                    y2={toSvgY(-lengthCm / 2)}
                    stroke="#38bdf8"
                    strokeWidth="0.75"
                    strokeDasharray="3 3"
                    opacity="0.6"
                  />
                  <text
                    x={toSvgX(0)}
                    y={toSvgY(-lengthCm / 2) - 66}
                    fill="#38bdf8"
                    fontSize="12"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {widthCm} cm {isLShape ? '(Crujía)' : ''}
                  </text>

                  {/* Cota Superior Extensión Ala / Patio (en L-Shape) */}
                  {isLShape && (
                    <g>
                      <line
                        x1={toSvgX(widthCm / 2)}
                        y1={toSvgY(-lengthCm / 2) - 60}
                        x2={toSvgX(widthCm / 2 + wingWidthCm)}
                        y2={toSvgY(-lengthCm / 2) - 60}
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                      />
                      <line
                        x1={toSvgX(widthCm / 2 + wingWidthCm) - 5}
                        y1={toSvgY(-lengthCm / 2) - 55}
                        x2={toSvgX(widthCm / 2 + wingWidthCm) + 5}
                        y2={toSvgY(-lengthCm / 2) - 65}
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                      />
                      <line
                        x1={toSvgX(widthCm / 2 + wingWidthCm)}
                        y1={toSvgY(-lengthCm / 2) - 65}
                        x2={toSvgX(widthCm / 2 + wingWidthCm)}
                        y2={toSvgY(lengthCm / 2 - wingLengthCm)}
                        stroke="#f59e0b"
                        strokeWidth="0.75"
                        strokeDasharray="3 3"
                        opacity="0.6"
                      />
                      <text
                        x={toSvgX(widthCm / 2 + wingWidthCm / 2)}
                        y={toSvgY(-lengthCm / 2) - 66}
                        fill="#f59e0b"
                        fontSize="12"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {wingWidthCm} cm (Ala W2)
                      </text>
                    </g>
                  )}

                  {/* Cota Lateral Izquierda Total (Largo L1) */}
                  <line
                    x1={toSvgX(-widthCm / 2) - 60}
                    y1={toSvgY(-lengthCm / 2)}
                    x2={toSvgX(-widthCm / 2) - 60}
                    y2={toSvgY(lengthCm / 2)}
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                  />
                  <line
                    x1={toSvgX(-widthCm / 2) - 65}
                    y1={toSvgY(-lengthCm / 2) - 5}
                    x2={toSvgX(-widthCm / 2) - 55}
                    y2={toSvgY(-lengthCm / 2) + 5}
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                  />
                  <line
                    x1={toSvgX(-widthCm / 2) - 65}
                    y1={toSvgY(lengthCm / 2) - 5}
                    x2={toSvgX(-widthCm / 2) - 55}
                    y2={toSvgY(lengthCm / 2) + 5}
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                  />
                  <line
                    x1={toSvgX(-widthCm / 2) - 65}
                    y1={toSvgY(-lengthCm / 2)}
                    x2={toSvgX(-widthCm / 2)}
                    y2={toSvgY(-lengthCm / 2)}
                    stroke="#38bdf8"
                    strokeWidth="0.75"
                    strokeDasharray="3 3"
                    opacity="0.6"
                  />
                  <line
                    x1={toSvgX(-widthCm / 2) - 65}
                    y1={toSvgY(lengthCm / 2)}
                    x2={toSvgX(-widthCm / 2)}
                    y2={toSvgY(lengthCm / 2)}
                    stroke="#38bdf8"
                    strokeWidth="0.75"
                    strokeDasharray="3 3"
                    opacity="0.6"
                  />
                  <g transform={`rotate(-90 ${toSvgX(-widthCm / 2) - 60} ${toSvgY(0)})`}>
                    <text
                      x={toSvgX(-widthCm / 2) - 60}
                      y={toSvgY(0) - 6}
                      fill="#38bdf8"
                      fontSize="12"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {lengthCm} cm {isLShape ? '(Largo L1)' : ''}
                    </text>
                  </g>

                  {/* Cotas Laterales Derechas en L-Shape (Patio + Ala) */}
                  {isLShape ? (
                    <g>
                      {/* Cota Patio (Largo L1 - L2) */}
                      <line
                        x1={toSvgX(widthCm / 2 + wingWidthCm) + 60}
                        y1={toSvgY(-lengthCm / 2)}
                        x2={toSvgX(widthCm / 2 + wingWidthCm) + 60}
                        y2={toSvgY(lengthCm / 2 - wingLengthCm)}
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                      />
                      <line
                        x1={toSvgX(widthCm / 2 + wingWidthCm) + 55}
                        y1={toSvgY(-lengthCm / 2) - 5}
                        x2={toSvgX(widthCm / 2 + wingWidthCm) + 65}
                        y2={toSvgY(-lengthCm / 2) + 5}
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                      />
                      <line
                        x1={toSvgX(widthCm / 2 + wingWidthCm) + 55}
                        y1={toSvgY(lengthCm / 2 - wingLengthCm) - 5}
                        x2={toSvgX(widthCm / 2 + wingWidthCm) + 65}
                        y2={toSvgY(lengthCm / 2 - wingLengthCm) + 5}
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                      />
                      <line
                        x1={toSvgX(widthCm / 2)}
                        y1={toSvgY(-lengthCm / 2)}
                        x2={toSvgX(widthCm / 2 + wingWidthCm) + 65}
                        y2={toSvgY(-lengthCm / 2)}
                        stroke="#94a3b8"
                        strokeWidth="0.75"
                        strokeDasharray="3 3"
                        opacity="0.6"
                      />
                      <line
                        x1={toSvgX(widthCm / 2 + wingWidthCm)}
                        y1={toSvgY(lengthCm / 2 - wingLengthCm)}
                        x2={toSvgX(widthCm / 2 + wingWidthCm) + 65}
                        y2={toSvgY(lengthCm / 2 - wingLengthCm)}
                        stroke="#94a3b8"
                        strokeWidth="0.75"
                        strokeDasharray="3 3"
                        opacity="0.6"
                      />
                      <g
                        transform={`rotate(90 ${toSvgX(widthCm / 2 + wingWidthCm) + 60} ${toSvgY(-lengthCm / 2 + (lengthCm - wingLengthCm) / 2)})`}
                      >
                        <text
                          x={toSvgX(widthCm / 2 + wingWidthCm) + 60}
                          y={toSvgY(-lengthCm / 2 + (lengthCm - wingLengthCm) / 2) - 6}
                          fill="#94a3b8"
                          fontSize="11"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {lengthCm - wingLengthCm} cm (Patio)
                        </text>
                      </g>

                      {/* Cota Ala Lateral (Largo L2) */}
                      <line
                        x1={toSvgX(widthCm / 2 + wingWidthCm) + 60}
                        y1={toSvgY(lengthCm / 2 - wingLengthCm)}
                        x2={toSvgX(widthCm / 2 + wingWidthCm) + 60}
                        y2={toSvgY(lengthCm / 2)}
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                      />
                      <line
                        x1={toSvgX(widthCm / 2 + wingWidthCm) + 55}
                        y1={toSvgY(lengthCm / 2) - 5}
                        x2={toSvgX(widthCm / 2 + wingWidthCm) + 65}
                        y2={toSvgY(lengthCm / 2) + 5}
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                      />
                      <line
                        x1={toSvgX(widthCm / 2 + wingWidthCm)}
                        y1={toSvgY(lengthCm / 2)}
                        x2={toSvgX(widthCm / 2 + wingWidthCm) + 65}
                        y2={toSvgY(lengthCm / 2)}
                        stroke="#f59e0b"
                        strokeWidth="0.75"
                        strokeDasharray="3 3"
                        opacity="0.6"
                      />
                      <g
                        transform={`rotate(90 ${toSvgX(widthCm / 2 + wingWidthCm) + 60} ${toSvgY(lengthCm / 2 - wingLengthCm / 2)})`}
                      >
                        <text
                          x={toSvgX(widthCm / 2 + wingWidthCm) + 60}
                          y={toSvgY(lengthCm / 2 - wingLengthCm / 2) - 6}
                          fill="#f59e0b"
                          fontSize="11"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {wingLengthCm} cm (Ala L2)
                        </text>
                      </g>
                    </g>
                  ) : null}

                  {/* Cota Inferior Total Frontal */}
                  <line
                    x1={toSvgX(-widthCm / 2)}
                    y1={toSvgY(lengthCm / 2) + 60}
                    x2={toSvgX(isLShape ? widthCm / 2 + wingWidthCm : widthCm / 2)}
                    y2={toSvgY(lengthCm / 2) + 60}
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                  />
                  <line
                    x1={toSvgX(-widthCm / 2) - 5}
                    y1={toSvgY(lengthCm / 2) + 55}
                    x2={toSvgX(-widthCm / 2) + 5}
                    y2={toSvgY(lengthCm / 2) + 65}
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                  />
                  <line
                    x1={toSvgX(isLShape ? widthCm / 2 + wingWidthCm : widthCm / 2) - 5}
                    y1={toSvgY(lengthCm / 2) + 55}
                    x2={toSvgX(isLShape ? widthCm / 2 + wingWidthCm : widthCm / 2) + 5}
                    y2={toSvgY(lengthCm / 2) + 65}
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                  />
                  <line
                    x1={toSvgX(-widthCm / 2)}
                    y1={toSvgY(lengthCm / 2)}
                    x2={toSvgX(-widthCm / 2)}
                    y2={toSvgY(lengthCm / 2) + 65}
                    stroke="#38bdf8"
                    strokeWidth="0.75"
                    strokeDasharray="3 3"
                    opacity="0.6"
                  />
                  <line
                    x1={toSvgX(isLShape ? widthCm / 2 + wingWidthCm : widthCm / 2)}
                    y1={toSvgY(lengthCm / 2)}
                    x2={toSvgX(isLShape ? widthCm / 2 + wingWidthCm : widthCm / 2)}
                    y2={toSvgY(lengthCm / 2) + 65}
                    stroke="#38bdf8"
                    strokeWidth="0.75"
                    strokeDasharray="3 3"
                    opacity="0.6"
                  />
                  <text
                    x={(toSvgX(-widthCm / 2) + toSvgX(isLShape ? widthCm / 2 + wingWidthCm : widthCm / 2)) / 2}
                    y={toSvgY(lengthCm / 2) + 76}
                    fill="#38bdf8"
                    fontSize="12"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {totalSpanX_cm} cm {isLShape ? `(${widthCm} + ${wingWidthCm} cm Frontal Total)` : ''}
                  </text>
                </g>
              )}

              {/* --- NIVEL 2: COTAS DE EJES Y RECINTOS INTERIORES --- */}
              {state.dimensionDetailLevel >= 2 && (
                <g>
                  {zones.map((zone) => {
                    const zx = toSvgX(zone.bounds.minX);
                    const zy = toSvgY(zone.bounds.minZ);
                    const zw = (zone.bounds.maxX - zone.bounds.minX) * scale;
                    const zh = (zone.bounds.maxZ - zone.bounds.minZ) * scale;
                    const zwCm = zone.bounds.maxX - zone.bounds.minX;

                    if (zw <= 30 || zh <= 30) return null;

                    return (
                      <g key={`cota-zone-${zone.id}`}>
                        <line
                          x1={zx + 10}
                          y1={zy + zh - 14}
                          x2={zx + zw - 10}
                          y2={zy + zh - 14}
                          stroke={zone.color}
                          strokeWidth="1"
                          strokeDasharray="2 2"
                        />
                        <text
                          x={zx + zw / 2}
                          y={zy + zh - 18}
                          fill={zone.color}
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {(zwCm / 100).toFixed(2)}m
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}

              {/* --- NIVEL 3: CADENA DE COTAS A VANOS (Puertas y Ventanas) --- */}
              {state.dimensionDetailLevel >= 3 && (
                <g>
                  {/* Cadena en Muro Frontal (Inferior) */}
                  {(() => {
                    const frontOps = openings
                      .filter((o) => o.assignedWall === 'front' || o.assignedWall === 'wing_front')
                      .sort((a, b) => {
                        const xA = a.assignedWall === 'wing_front' ? widthCm + a.offsetAlongWall : a.offsetAlongWall;
                        const xB = b.assignedWall === 'wing_front' ? widthCm + b.offsetAlongWall : b.offsetAlongWall;
                        return xA - xB;
                      });

                    if (frontOps.length === 0) return null;
                    let lastX = 0;
                    return (
                      <g>
                        {frontOps.map((op, idx) => {
                          const opGlobalStart =
                            op.assignedWall === 'wing_front' ? widthCm + op.offsetAlongWall : op.offsetAlongWall;
                          const opGlobalEnd = opGlobalStart + op.width;
                          const span1 = opGlobalStart - lastX;
                          const spanOp = op.width;

                          const svgX1 = toSvgX(-widthCm / 2 + lastX);
                          const svgX2 = toSvgX(-widthCm / 2 + opGlobalStart);
                          const svgX3 = toSvgX(-widthCm / 2 + opGlobalEnd);
                          const yCota = toSvgY(lengthCm / 2) + 35;

                          const elements = [];
                          if (span1 > 5) {
                            elements.push(
                              <g key={`f-span-${idx}`}>
                                <line x1={svgX1} y1={yCota} x2={svgX2} y2={yCota} stroke="#f59e0b" strokeWidth="1" />
                                <line x1={svgX1 - 3} y1={yCota - 3} x2={svgX1 + 3} y2={yCota + 3} stroke="#f59e0b" strokeWidth="1" />
                                <text x={(svgX1 + svgX2) / 2} y={yCota - 4} fill="#f59e0b" fontSize="9" textAnchor="middle">
                                  {span1}
                                </text>
                              </g>
                            );
                          }
                          elements.push(
                            <g key={`f-op-${idx}`}>
                              <line x1={svgX2} y1={yCota} x2={svgX3} y2={yCota} stroke="#38bdf8" strokeWidth="1.5" />
                              <line x1={svgX2 - 3} y1={yCota - 3} x2={svgX2 + 3} y2={yCota + 3} stroke="#38bdf8" strokeWidth="1.5" />
                              <line x1={svgX3 - 3} y1={yCota - 3} x2={svgX3 + 3} y2={yCota + 3} stroke="#38bdf8" strokeWidth="1.5" />
                              <text
                                x={(svgX2 + svgX3) / 2}
                                y={yCota - 4}
                                fill="#38bdf8"
                                fontSize="9"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                {spanOp}
                              </text>
                            </g>
                          );
                          lastX = opGlobalEnd;
                          if (idx === frontOps.length - 1 && totalSpanX_cm - opGlobalEnd > 5) {
                            const svgX4 = toSvgX(-widthCm / 2 + totalSpanX_cm);
                            elements.push(
                              <g key="f-last-span">
                                <line x1={svgX3} y1={yCota} x2={svgX4} y2={yCota} stroke="#f59e0b" strokeWidth="1" />
                                <line x1={svgX4 - 3} y1={yCota - 3} x2={svgX4 + 3} y2={yCota + 3} stroke="#f59e0b" strokeWidth="1" />
                                <text x={(svgX3 + svgX4) / 2} y={yCota - 4} fill="#f59e0b" fontSize="9" textAnchor="middle">
                                  {totalSpanX_cm - opGlobalEnd}
                                </text>
                              </g>
                            );
                          }
                          return elements;
                        })}
                      </g>
                    );
                  })()}
                </g>
              )}

              {/* --- NIVEL 4: CADENA DE MODULACIÓN PANELES SIP (122 cm) --- */}
              {state.dimensionDetailLevel >= 4 && (
                <g>
                  {(() => {
                    const countX = Math.max(1, Math.ceil(widthCm / 122));
                    const stepCm = widthCm / countX;
                    const yMod = toSvgY(-lengthCm / 2) - 25;
                    return (
                      <g>
                        {Array.from({ length: countX }).map((_, idx) => {
                          const x1 = toSvgX(-widthCm / 2 + idx * stepCm);
                          const x2 = toSvgX(-widthCm / 2 + (idx + 1) * stepCm);
                          return (
                            <g key={`mod-sip-x-${idx}`}>
                              <line
                                x1={x1}
                                y1={yMod}
                                x2={x2}
                                y2={yMod}
                                stroke="#10b981"
                                strokeWidth="1"
                                strokeDasharray="3 2"
                              />
                              <line x1={x1} y1={yMod - 4} x2={x1} y2={yMod + 4} stroke="#10b981" strokeWidth="1" />
                              <line x1={x2} y1={yMod - 4} x2={x2} y2={yMod + 4} stroke="#10b981" strokeWidth="1" />
                              <text
                                x={(x1 + x2) / 2}
                                y={yMod - 4}
                                fill="#34d399"
                                fontSize="8"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                P{idx + 1}: {Math.round(stepCm)}cm
                              </text>
                            </g>
                          );
                        })}
                      </g>
                    );
                  })()}
                </g>
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Cuadro de Especificaciones Técnicas y Criterios Constructivos SIP */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider">EETT Envolvente SIP</h3>
            <span className="text-[11px] font-mono px-2 py-0.5 bg-sky-500/20 text-sky-300 rounded">
              {metrics.coreSpec.name}
            </span>
          </div>
          <div className="space-y-2 text-xs text-slate-300 font-mono">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Espesor Muros:</span>
              <span className="text-white font-bold">
                {state.wallThicknessMm} mm (K = {metrics.coreSpec.thermalK_Wm2K_114mm} W/m²K)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Espesor Cubierta:</span>
              <span className="text-white font-bold">
                {state.roofThicknessMm} mm (R-
                {Math.round(metrics.coreSpec.rValuePerInch * (state.roofThicknessMm / 25.4))})
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Espesor Losa Piso:</span>
              <span className="text-white font-bold">{state.floorThicknessMm} mm</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Fundación:</span>
              <span className="text-sky-300 font-bold text-right text-[10px]">
                {state.foundationType === 'pilotes_madera'
                  ? `${metrics.pilaresFundacionCount} Pilotes CCA (${metrics.axesCountX} ejes x ${metrics.pilesCountZ} apoyos) + ${metrics.vigasMaestras32Count ?? metrics.vigasMaestras40Count} Vigas 2x8"`
                  : state.foundationType === 'radier_sobrecimiento' || state.foundationType === 'radier_hormigon'
                  ? `Radier G20 (${metrics.hormigonG20M3} m³) + ${metrics.pernosAnclaje12Qty} Pernos 1/2"`
                  : `Platea Armada (${metrics.hormigonG20M3} m³ H-25) + ${metrics.mallaAcmaPlanchas} Mallas`}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Tablillas Unión (Splines):</span>
              <span className="text-amber-400 font-bold">{metrics.totalSurfaceSplinesOSB} tiras OSB 11.1mm</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Comportamiento al Fuego:</span>
              <span className="text-emerald-400 font-bold text-right text-[10px]">{metrics.coreSpec.fireRating}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Criterios de Montaje & Compliance</h3>
            <span className="text-[11px] font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded">
              LP / NER-1038
            </span>
          </div>
          <ul className="space-y-2 text-[11px] text-slate-300">
            <li className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>
                Distancia mínima vano a esquina: <strong className="text-white">≥ 30 cm</strong> (Norma LP/Foard)
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>
                Luz máxima estándar vanos: <strong className="text-white">≤ 2.44 m</strong> (Dintel SIP ≥ 30 cm)
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>
                Traslape solera superior: <strong className="text-white">≥ 30 cm</strong> de desfase respecto a uniones
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>
                Fijación OSB: <strong className="text-white">Tornillos CRS 6x1 1/4" cada 15 cm</strong> a 1 cm del borde
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>
                Hermeticidad: <strong className="text-white">Sello poliuretano continuo</strong> (Blower Door &lt; 1 ACH50)
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>
                Instalaciones MEP: <strong className="text-white">Canalización interna EPS</strong> (sin cortes en tableros)
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
