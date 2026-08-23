import React from 'react';
import { useSipHouseStore, getInteriorZones } from '../../store/sipHouseStore';
import { calculateSipHouseQuantities } from '../../utils/sipExcelGenerator';

export function SipBlueprint() {
  const state = useSipHouseStore();
  const { dimensions: dim, openings, interiorWalls, layoutPreset, presetParams, coreType, wallThicknessMm, roofThicknessMm, floorThicknessMm } = state;
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

  const lengthCm = dim.length;
  const widthCm = dim.width;

  const scale = 0.65;
  const svgW = widthCm * scale + 240;
  const svgH = lengthCm * scale + 240;

  const startX = 120;
  const startY = 120;
  const planSvgW = widthCm * scale;
  const planSvgH = lengthCm * scale;

  const zones = getInteriorZones(layoutPreset, dim, presetParams);

  return (
    <div className="w-full h-full bg-slate-950 p-6 overflow-auto flex flex-col items-center justify-start text-white">
      <div className="w-full max-w-4xl bg-slate-900/90 border border-white/10 rounded-2xl p-5 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest bg-sky-500/20 text-sky-400 font-bold px-2.5 py-1 rounded-md">
              Lámina 01 - PROSIP BIM
            </span>
            <span className="text-xs text-slate-400 font-mono">Escala Paramétrica 1:50</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">Planta de Arquitectura Cabaña SIP</h2>
          <p className="text-xs text-slate-400">
            Dimensiones: {(widthCm / 100).toFixed(2)}m (Ancho) x {(lengthCm / 100).toFixed(2)}m (Largo) | Cubierta a 2 Aguas
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

      <div className="bg-slate-900 border border-sky-500/20 rounded-2xl p-6 shadow-2xl overflow-auto max-w-4xl w-full flex justify-center">
        <svg width={svgW} height={svgH} className="font-mono select-none">
          <defs>
            <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
            </pattern>
          </defs>

          <rect width={svgW} height={svgH} fill="url(#gridPattern)" />

          {/* Planta Rectangular Principal */}
          <g>
            {/* Losa Base */}
            <rect
              x={startX}
              y={startY}
              width={planSvgW}
              height={planSvgH}
              fill="#0f172a"
              stroke="#38bdf8"
              strokeWidth="3"
            />

            {/* Zonas Interiores (Dormitorios, Baño, Living/Cocina) */}
            {zones.map((zone) => {
              const zx = startX + (zone.bounds.minX + widthCm / 2) * scale;
              const zy = startY + (zone.bounds.minZ + lengthCm / 2) * scale;
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
                const wx1 = startX + (wall.startX + widthCm / 2) * scale;
                const wy1 = startY + (wall.startZ + lengthCm / 2) * scale;
                const wx2 = startX + (wall.endX + widthCm / 2) * scale;
                const wy2 = startY + (wall.endZ + lengthCm / 2) * scale;

                const wallW = (wall.thicknessMm || 90) * 0.1 * scale; // grosor en px SVG

                const dx = wx2 - wx1;
                const dy = wy2 - wy1;
                const wallLenSvg = Math.hypot(dx, dy);
                const angle = Math.atan2(dy, dx);

                return (
                  <g key={wall.id}>
                    {/* Línea de Muro SIP */}
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

                        // Posición de la puerta a lo largo del segmento
                        const tDoorCenter = (doorOffset_svg + doorW_svg / 2) / wallLenSvg;
                        const doorCenterX = wx1 + dx * tDoorCenter;
                        const doorCenterY = wy1 + dy * tDoorCenter;

                        // Hueco en el muro
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

            {/* Eje de Cumbrera Central */}
            <line
              x1={startX + planSvgW / 2}
              y1={startY - 15}
              x2={startX + planSvgW / 2}
              y2={startY + planSvgH + 15}
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="6 3"
            />
            <text
              x={startX + planSvgW / 2}
              y={startY - 20}
              fill="#f59e0b"
              fontSize="10"
              fontWeight="bold"
              textAnchor="middle"
            >
              EJE CUMBRERA (H={dim.ridgeHeight}cm)
            </text>

            {/* Representación de Vanos sobre los Muros */}
            {openings.map((op) => {
              const offSvg = (op.offsetAlongWall || 50) * scale;
              const wSvg = op.width * scale;

              if (op.assignedWall === 'front') {
                return (
                  <g key={op.id}>
                    <line
                      x1={startX + offSvg}
                      y1={startY + planSvgH}
                      x2={startX + offSvg + wSvg}
                      y2={startY + planSvgH}
                      stroke={op.type === 'door' ? '#f59e0b' : '#38bdf8'}
                      strokeWidth="6"
                    />
                    <text
                      x={startX + offSvg + wSvg / 2}
                      y={startY + planSvgH + 18}
                      fill={op.type === 'door' ? '#f59e0b' : '#38bdf8'}
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {op.code} ({op.width}x{op.height})
                    </text>
                  </g>
                );
              }
              if (op.assignedWall === 'back') {
                return (
                  <g key={op.id}>
                    <line
                      x1={startX + offSvg}
                      y1={startY}
                      x2={startX + offSvg + wSvg}
                      y2={startY}
                      stroke={op.type === 'door' ? '#f59e0b' : '#38bdf8'}
                      strokeWidth="6"
                    />
                    <text
                      x={startX + offSvg + wSvg / 2}
                      y={startY - 10}
                      fill={op.type === 'door' ? '#f59e0b' : '#38bdf8'}
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {op.code} ({op.width}x{op.height})
                    </text>
                  </g>
                );
              }
              if (op.assignedWall === 'left') {
                return (
                  <g key={op.id}>
                    <line
                      x1={startX}
                      y1={startY + offSvg}
                      x2={startX}
                      y2={startY + offSvg + wSvg}
                      stroke={op.type === 'door' ? '#f59e0b' : '#38bdf8'}
                      strokeWidth="6"
                    />
                    <text
                      x={startX - 12}
                      y={startY + offSvg + wSvg / 2}
                      fill={op.type === 'door' ? '#f59e0b' : '#38bdf8'}
                      fontSize="10"
                      textAnchor="end"
                      alignmentBaseline="middle"
                    >
                      {op.code}
                    </text>
                  </g>
                );
              }
              if (op.assignedWall === 'right') {
                return (
                  <g key={op.id}>
                    <line
                      x1={startX + planSvgW}
                      y1={startY + offSvg}
                      x2={startX + planSvgW}
                      y2={startY + offSvg + wSvg}
                      stroke={op.type === 'door' ? '#f59e0b' : '#38bdf8'}
                      strokeWidth="6"
                    />
                    <text
                      x={startX + planSvgW + 12}
                      y={startY + offSvg + wSvg / 2}
                      fill={op.type === 'door' ? '#f59e0b' : '#38bdf8'}
                      fontSize="10"
                      textAnchor="start"
                      alignmentBaseline="middle"
                    >
                      {op.code}
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
              {/* --- NIVEL 1: COTAS GENERALES EXTERIORES (Ancho y Largo) --- */}
              {state.dimensionDetailLevel >= 1 && (
                <g>
                  {/* Cota Superior Total (Ancho) */}
                  <line x1={startX} y1={startY - 60} x2={startX + planSvgW} y2={startY - 60} stroke="#38bdf8" strokeWidth="1.5" />
                  {/* Ticks extremos a 45° */}
                  <line x1={startX - 5} y1={startY - 55} x2={startX + 5} y2={startY - 65} stroke="#38bdf8" strokeWidth="1.5" />
                  <line x1={startX + planSvgW - 5} y1={startY - 55} x2={startX + planSvgW + 5} y2={startY - 65} stroke="#38bdf8" strokeWidth="1.5" />
                  {/* Líneas de referencia/extensión */}
                  <line x1={startX} y1={startY - 65} x2={startX} y2={startY} stroke="#38bdf8" strokeWidth="0.75" strokeDasharray="3 3" opacity="0.6" />
                  <line x1={startX + planSvgW} y1={startY - 65} x2={startX + planSvgW} y2={startY} stroke="#38bdf8" strokeWidth="0.75" strokeDasharray="3 3" opacity="0.6" />
                  <text x={startX + planSvgW / 2} y={startY - 66} fill="#38bdf8" fontSize="12" fontWeight="bold" textAnchor="middle">
                    {widthCm} cm
                  </text>

                  {/* Cota Lateral Izquierda Total (Largo) */}
                  <line x1={startX - 60} y1={startY} x2={startX - 60} y2={startY + planSvgH} stroke="#38bdf8" strokeWidth="1.5" />
                  {/* Ticks extremos a 45° */}
                  <line x1={startX - 65} y1={startY - 5} x2={startX - 55} y2={startY + 5} stroke="#38bdf8" strokeWidth="1.5" />
                  <line x1={startX - 65} y1={startY + planSvgH - 5} x2={startX - 55} y2={startY + planSvgH + 5} stroke="#38bdf8" strokeWidth="1.5" />
                  {/* Líneas de referencia */}
                  <line x1={startX - 65} y1={startY} x2={startX} y2={startY} stroke="#38bdf8" strokeWidth="0.75" strokeDasharray="3 3" opacity="0.6" />
                  <line x1={startX - 65} y1={startY + planSvgH} x2={startX} y2={startY + planSvgH} stroke="#38bdf8" strokeWidth="0.75" strokeDasharray="3 3" opacity="0.6" />
                  <g transform={`rotate(-90 ${startX - 60} ${startY + planSvgH / 2})`}>
                    <text
                      x={startX - 60}
                      y={startY + planSvgH / 2 - 6}
                      fill="#38bdf8"
                      fontSize="12"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {lengthCm} cm
                    </text>
                  </g>
                </g>
              )}

              {/* --- NIVEL 2: COTAS DE EJES Y RECINTOS INTERIORES --- */}
              {state.dimensionDetailLevel >= 2 && (
                <g>
                  {zones.map((zone) => {
                    const zx = startX + (zone.bounds.minX + widthCm / 2) * scale;
                    const zy = startY + (zone.bounds.minZ + lengthCm / 2) * scale;
                    const zw = (zone.bounds.maxX - zone.bounds.minX) * scale;
                    const zh = (zone.bounds.maxZ - zone.bounds.minZ) * scale;
                    const zwCm = zone.bounds.maxX - zone.bounds.minX;
                    const zhCm = zone.bounds.maxZ - zone.bounds.minZ;

                    if (zw <= 30 || zh <= 30) return null;

                    return (
                      <g key={`cota-zone-${zone.id}`}>
                        {/* Cota horizontal interna */}
                        <line x1={zx + 10} y1={zy + zh - 14} x2={zx + zw - 10} y2={zy + zh - 14} stroke={zone.color} strokeWidth="1" strokeDasharray="2 2" />
                        <text x={zx + zw / 2} y={zy + zh - 18} fill={zone.color} fontSize="9" fontWeight="bold" textAnchor="middle">
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
                    const frontOps = openings.filter((o) => o.assignedWall === 'front').sort((a, b) => a.offsetAlongWall - b.offsetAlongWall);
                    if (frontOps.length === 0) return null;
                    let lastX = 0;
                    return (
                      <g>
                        {frontOps.map((op, idx) => {
                          const opStart = op.offsetAlongWall;
                          const opEnd = op.offsetAlongWall + op.width;
                          const span1 = opStart - lastX;
                          const spanOp = op.width;

                          const svgX1 = startX + lastX * scale;
                          const svgX2 = startX + opStart * scale;
                          const svgX3 = startX + opEnd * scale;
                          const yCota = startY + planSvgH + 40;

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
                              <text x={(svgX2 + svgX3) / 2} y={yCota - 4} fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle">
                                {spanOp}
                              </text>
                            </g>
                          );
                          lastX = opEnd;
                          if (idx === frontOps.length - 1 && widthCm - opEnd > 5) {
                            const svgX4 = startX + widthCm * scale;
                            elements.push(
                              <g key="f-last-span">
                                <line x1={svgX3} y1={yCota} x2={svgX4} y2={yCota} stroke="#f59e0b" strokeWidth="1" />
                                <line x1={svgX4 - 3} y1={yCota - 3} x2={svgX4 + 3} y2={yCota + 3} stroke="#f59e0b" strokeWidth="1" />
                                <text x={(svgX3 + svgX4) / 2} y={yCota - 4} fill="#f59e0b" fontSize="9" textAnchor="middle">
                                  {widthCm - opEnd}
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
                    const countX = Math.max(1, Math.ceil((widthCm / 100) / 1.22));
                    const stepCm = widthCm / countX;
                    const yMod = startY - 25;
                    return (
                      <g>
                        {Array.from({ length: countX }).map((_, idx) => {
                          const x1 = startX + idx * stepCm * scale;
                          const x2 = startX + (idx + 1) * stepCm * scale;
                          return (
                            <g key={`mod-sip-x-${idx}`}>
                              <line x1={x1} y1={yMod} x2={x2} y2={yMod} stroke="#10b981" strokeWidth="1" strokeDasharray="3 2" />
                              <line x1={x1} y1={yMod - 4} x2={x1} y2={yMod + 4} stroke="#10b981" strokeWidth="1" />
                              <line x1={x2} y1={yMod - 4} x2={x2} y2={yMod + 4} stroke="#10b981" strokeWidth="1" />
                              <text x={(x1 + x2) / 2} y={yMod - 4} fill="#34d399" fontSize="8" fontWeight="bold" textAnchor="middle">
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
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
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
              <span className="text-white font-bold">{state.wallThicknessMm} mm (K = {metrics.coreSpec.thermalK_Wm2K_114mm} W/m²K)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Espesor Cubierta:</span>
              <span className="text-white font-bold">{state.roofThicknessMm} mm (R-{Math.round(metrics.coreSpec.rValuePerInch * (state.roofThicknessMm / 25.4))})</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Espesor Losa Piso:</span>
              <span className="text-white font-bold">{state.floorThicknessMm} mm</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Fundación:</span>
              <span className="text-sky-300 font-bold text-right text-[10px]">
                {state.foundationType === 'pilotes_madera'
                  ? `${metrics.pilaresFundacionCount} Pilotes CCA (${metrics.axesCountX} ejes x ${metrics.pilesCountZ} apoyos) + ${metrics.vigasMaestras40Count} Vigas 2x8"`
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
              <span>Distancia mínima vano a esquina: <strong className="text-white">≥ 30 cm</strong> (Norma LP/Foard)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Luz máxima estándar vanos: <strong className="text-white">≤ 2.44 m</strong> (Dintel SIP ≥ 30 cm)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Traslape solera superior: <strong className="text-white">≥ 30 cm</strong> de desfase respecto a uniones</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Fijación OSB: <strong className="text-white">Tornillos CRS 6x1 1/4" cada 15 cm</strong> a 1 cm del borde</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Hermeticidad: <strong className="text-white">Sello poliuretano continuo</strong> (Blower Door &lt; 1 ACH50)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Instalaciones MEP: <strong className="text-white">Canalización interna EPS</strong> (sin cortes en tableros)</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
