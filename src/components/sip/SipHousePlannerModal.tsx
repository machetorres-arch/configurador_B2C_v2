import React, { useState, useEffect, useMemo } from 'react';
import {
  useSipHouseStore,
  SipWallThickness,
  RoofStyle,
  InteriorLayoutPreset,
  PresetParams,
  generateInteriorWallsForPreset,
  SipHouseDimensions,
} from '../../store/sipHouseStore';
import {
  RoomVertex,
  getWallLabel,
  distanceBetween,
  analyzeRoomWalls,
  calculatePolygonArea,
  calculatePolygonPerimeter,
  centerVertices,
  orthogonalizePolygon,
  adjustWallLengthOrthogonal,
} from '../../utils/roomGeometry';
import { SipHousePlannerCanvas, SipSnapMode } from './SipHousePlannerCanvas';
import {
  Square,
  PenTool,
  CornerDownRight,
  ArrowRight,
  X,
  RotateCcw,
  Plus,
  Minus,
  Trash2,
  Check,
  Maximize2,
  Layers,
  ArrowLeft,
  Sparkles,
  Home,
  ShieldCheck,
  Grid,
  Sliders,
  Compass,
  Wand2,
  Lock,
} from 'lucide-react';

export type SipHouseShapeType =
  | 'rectangular'
  | 'l_shape'
  | 'u_shape'
  | 'compact_24'
  | 'social_60'
  | 'freeform';

interface ShapeCardOption {
  type: SipHouseShapeType;
  title: string;
  badge?: string;
  description: string;
  renderIcon: () => React.ReactNode;
}

export function SipHousePlannerModal() {
  const {
    isSipPlannerOpen,
    setSipPlannerOpen,
    dimensions,
    wallThicknessMm,
    layoutPreset,
    presetParams,
    applyCustom2DPlan,
  } = useSipHouseStore();

  const [step, setStep] = useState<'select_type' | 'edit_dimensions' | 'roof_openings'>('select_type');
  const [selectedShape, setSelectedShape] = useState<SipHouseShapeType>('social_60');
  
  // Vértices del contorno en cm
  const [vertices, setVertices] = useState<RoomVertex[]>(() => [
    { id: 'v1', x: -440, y: -340 },
    { id: 'v2', x: 440, y: -340 },
    { id: 'v3', x: 440, y: 340 },
    { id: 'v4', x: -440, y: 340 },
  ]);

  const [wallHeight, setWallHeight] = useState<number>(260); // cm al alero
  const [ridgeHeight, setRidgeHeight] = useState<number>(360); // cm cumbrera
  const [wallThickness, setWallThickness] = useState<SipWallThickness>(114);
  const [roofStyle, setRoofStyle] = useState<RoofStyle>('gable_valley');
  const [overhang, setOverhang] = useState<number>(30); // cm
  const [activeLayoutPreset, setActiveLayoutPreset] = useState<InteriorLayoutPreset>(layoutPreset || 'open_loft');
  const [snapMode, setSnapMode] = useState<SipSnapMode>('sip_122');
  const [orthoMode, setOrthoMode] = useState<boolean>(true);
  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number | null>(null);
  const [isFreehandDrawing, setIsFreehandDrawing] = useState(false);

  // Sincronizar estado inicial al abrir
  useEffect(() => {
    if (isSipPlannerOpen) {
      setWallHeight(dimensions.eaveHeight || 260);
      setRidgeHeight(dimensions.ridgeHeight || 360);
      setWallThickness(wallThicknessMm || 114);
      setRoofStyle(dimensions.roofStyle || 'gable_valley');
      setOverhang(dimensions.overhang || 30);
      setActiveLayoutPreset(layoutPreset || 'open_loft');

      if (dimensions.shape === 'l_shape') {
        setSelectedShape('l_shape');
        const w1 = dimensions.width / 2;
        const l1 = dimensions.length / 2;
        const w2 = dimensions.wingWidth;
        const l2 = dimensions.wingLength;
        setVertices([
          { id: 'v1', x: -l1, y: -w1 },
          { id: 'v2', x: l1 - l2, y: -w1 },
          { id: 'v3', x: l1 - l2, y: w1 - w2 },
          { id: 'v4', x: l1, y: w1 - w2 },
          { id: 'v5', x: l1, y: w1 },
          { id: 'v6', x: -l1, y: w1 },
        ]);
      } else {
        const halfL = (dimensions.length || 880) / 2;
        const halfW = (dimensions.width || 680) / 2;
        setVertices([
          { id: 'v1', x: -halfL, y: -halfW },
          { id: 'v2', x: halfL, y: -halfW },
          { id: 'v3', x: halfL, y: halfW },
          { id: 'v4', x: -halfL, y: halfW },
        ]);
      }
    }
  }, [isSipPlannerOpen, dimensions, wallThicknessMm, layoutPreset]);

  // Generación de presets de vértices para SIP
  const handleSelectShape = (type: SipHouseShapeType) => {
    setSelectedShape(type);
    setIsFreehandDrawing(type === 'freeform');

    switch (type) {
      case 'social_60': {
        // 8.80 m x 6.80 m (Vivienda Social D.S.49 / 60 m²)
        setVertices([
          { id: 'v1', x: -440, y: -340 },
          { id: 'v2', x: 440, y: -340 },
          { id: 'v3', x: 440, y: 340 },
          { id: 'v4', x: -440, y: 340 },
        ]);
        setActiveLayoutPreset('open_loft');
        setRoofStyle('gable_valley');
        break;
      }
      case 'compact_24': {
        // 6.00 m x 4.00 m (Cabaña 24 m²)
        setVertices([
          { id: 'v1', x: -300, y: -200 },
          { id: 'v2', x: 300, y: -200 },
          { id: 'v3', x: 300, y: 200 },
          { id: 'v4', x: -300, y: 200 },
        ]);
        setActiveLayoutPreset('open_loft');
        setRoofStyle('single_shed');
        break;
      }
      case 'rectangular': {
        // 7.32 m x 4.88 m (Múltiplos exactos de 1.22 m: 6x4 paneles)
        setVertices([
          { id: 'v1', x: -366, y: -244 },
          { id: 'v2', x: 366, y: -244 },
          { id: 'v3', x: 366, y: 244 },
          { id: 'v4', x: -366, y: 244 },
        ]);
        setActiveLayoutPreset('open_loft');
        setRoofStyle('gable_valley');
        break;
      }
      case 'l_shape': {
        // Casa en L con ala lateral
        setVertices([
          { id: 'v1', x: -450, y: -300 },
          { id: 'v2', x: 150, y: -300 },
          { id: 'v3', x: 150, y: 0 },
          { id: 'v4', x: 450, y: 0 },
          { id: 'v5', x: 450, y: 300 },
          { id: 'v6', x: -450, y: 300 },
        ]);
        setActiveLayoutPreset('open_loft');
        setRoofStyle('gable_valley');
        break;
      }
      case 'u_shape': {
        // Casa en U con patio central
        setVertices([
          { id: 'v1', x: -450, y: -350 },
          { id: 'v2', x: 450, y: -350 },
          { id: 'v3', x: 450, y: 350 },
          { id: 'v4', x: 200, y: 350 },
          { id: 'v5', x: 200, y: 50 },
          { id: 'v6', x: -200, y: 50 },
          { id: 'v7', x: -200, y: 350 },
          { id: 'v8', x: -450, y: 350 },
        ]);
        setActiveLayoutPreset('open_loft');
        setRoofStyle('gable_valley');
        break;
      }
      case 'freeform': {
        // Iniciar dibujo desde cero con lienzo limpio
        setVertices([]);
        setActiveLayoutPreset('open_loft');
        setIsFreehandDrawing(true);
        setSelectedVertexIndex(null);
        break;
      }
    }

    setStep('edit_dimensions');
  };

  // Iniciar dibujo desde cero en blanco
  const handleStartDrawFromScratch = () => {
    setSelectedShape('freeform');
    setVertices([]);
    setIsFreehandDrawing(true);
    setSelectedVertexIndex(null);
  };

  // Finalizar y cerrar dibujo ortogonal a 90° con medidas libres exactas
  const handleFinishFreehandDrawing = () => {
    if (vertices.length < 3) return;
    const first = vertices[0];
    const last = vertices[vertices.length - 1];
    let updated = [...vertices];

    // Si el último no coincide ortogonalmente con el primero, añadir esquina a 90° para cierre estanco
    if (Math.abs(last.x - first.x) > 2 && Math.abs(last.y - first.y) > 2) {
      updated.push({
        id: `v_sip_close_${Date.now()}`,
        x: last.x,
        y: first.y,
      });
    }

    // Conservar las medidas libres dibujadas por el usuario centradas en el lienzo
    setVertices(centerVertices(updated));
    setIsFreehandDrawing(false);
    setSelectedVertexIndex(0);
  };

  // Deshacer el último vértice colocado durante el dibujo
  const handleUndoLastVertex = () => {
    if (vertices.length > 0) {
      setVertices(vertices.slice(0, -1));
    }
  };

  // Modificar longitud de pared numéricamente
  const handleWallLengthChange = (segmentIndex: number, newLength: number) => {
    if (newLength <= 50 || isNaN(newLength)) return;
    const step = snapMode === 'sip_61' ? 61 : snapMode === 'sip_122' ? 122 : 10;

    if (orthoMode) {
      const updated = adjustWallLengthOrthogonal(vertices, segmentIndex, newLength, step);
      setVertices(updated);
    } else {
      const n = vertices.length;
      const p1 = vertices[segmentIndex];
      const p2 = vertices[(segmentIndex + 1) % n];

      const currentLen = distanceBetween(p1, p2);
      if (currentLen === 0) return;

      const ratio = newLength / currentLen;
      const dx = (p2.x - p1.x) * ratio;
      const dy = (p2.y - p1.y) * ratio;

      const updated = vertices.map((v, i) => {
        if (i === (segmentIndex + 1) % n) {
          return { ...v, x: Math.round((p1.x + dx) * 10) / 10, y: Math.round((p1.y + dy) * 10) / 10 };
        }
        return v;
      });

      setVertices(updated);
    }
  };

  // Snap a módulo SIP 1.22 m para todos los vértices
  const handleSnapAllToSipModule = () => {
    const updated = vertices.map((v) => ({
      ...v,
      x: Math.round(v.x / 122) * 122,
      y: Math.round(v.y / 122) * 122,
    }));
    setVertices(centerVertices(updated));
  };

  // Enderezar polígono a ángulos de 90° y modular a paneles SIP
  const handleOrthogonalize = () => {
    const step = snapMode === 'sip_61' ? 61 : 122;
    setVertices(orthogonalizePolygon(vertices, step));
  };

  // Ajustar longitud de pared rápidamente en pasos de 1 panel (+1.22m) o 1/2 panel (+0.61m)
  const handleAdjustWallPanels = (segmentIndex: number, deltaStepCount: number) => {
    const seg = wallSegments[segmentIndex];
    if (!seg) return;
    const step = snapMode === 'sip_61' ? 61 : 122;
    const currentLen = seg.length;
    const newLen = Math.max(step, Math.round((currentLen + deltaStepCount * step) / step) * step);
    handleWallLengthChange(segmentIndex, newLen);
  };

  // Añadir un nuevo vértice
  const handleAddVertex = () => {
    const index = selectedVertexIndex !== null ? selectedVertexIndex : 0;
    const n = vertices.length;
    const p1 = vertices[index];
    const p2 = vertices[(index + 1) % n];

    const midVertex: RoomVertex = {
      id: `v_sip_${Date.now()}`,
      x: Math.round((p1.x + p2.x) / 2),
      y: Math.round((p1.y + p2.y) / 2),
    };

    const newVertices = [...vertices];
    newVertices.splice(index + 1, 0, midVertex);
    setVertices(newVertices);
    setSelectedVertexIndex(index + 1);
  };

  // Eliminar vértice seleccionado
  const handleDeleteVertex = () => {
    if (vertices.length <= 3 || selectedVertexIndex === null) return;
    const updated = vertices.filter((_, i) => i !== selectedVertexIndex);
    setVertices(updated);
    setSelectedVertexIndex(null);
  };

  // Centrar y normalizar polígono
  const handleCenter = () => {
    setVertices(centerVertices(vertices));
  };

  // Descomposición geométrica
  const wallSegments = useMemo(() => analyzeRoomWalls(vertices), [vertices]);
  const areaM2 = useMemo(() => calculatePolygonArea(vertices), [vertices]);
  const perimeterM = useMemo(() => calculatePolygonPerimeter(vertices), [vertices]);

  // Cálculo de caja envolvente / dimensiones resultantes
  const computedDimensions: SipHouseDimensions = useMemo(() => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    vertices.forEach((v) => {
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
    });

    const length = Math.round(Math.max(200, maxX - minX));
    const width = Math.round(Math.max(200, maxY - minY));

    const isL = selectedShape === 'l_shape' || vertices.length === 6;
    const isCustom = selectedShape === 'freeform' || (vertices.length !== 4 && vertices.length !== 6);

    return {
      length,
      width,
      eaveHeight: wallHeight,
      ridgeHeight: roofStyle === 'flat' ? wallHeight + 30 : Math.max(wallHeight + 60, ridgeHeight),
      overhang,
      shape: isCustom ? 'custom_polygon' : (isL ? 'l_shape' : 'rectangular'),
      wingLength: isL ? Math.round(length * 0.45) : 420,
      wingWidth: isL ? Math.round(width * 0.5) : 360,
      wingCorner: 'front_right',
      roofStyle,
      customVertices: vertices.length >= 3 ? vertices : undefined,
    };
  }, [vertices, selectedShape, wallHeight, ridgeHeight, overhang, roofStyle]);

  // Muros interiores preliminares
  const previewInteriorWalls = useMemo(() => {
    return generateInteriorWallsForPreset(
      activeLayoutPreset,
      computedDimensions,
      presetParams,
      wallThickness
    );
  }, [activeLayoutPreset, computedDimensions, presetParams, wallThickness]);

  // Aplicar al estado 3D de la casa SIP (BIM)
  const handleApplyTo3D = () => {
    applyCustom2DPlan({
      dimensions: computedDimensions,
      wallThicknessMm: wallThickness,
      layoutPreset: activeLayoutPreset,
      presetParams,
      interiorWalls: previewInteriorWalls,
      templateId: selectedShape === 'social_60' ? 'social_60m2' : selectedShape === 'compact_24' ? 'cabana_24m2' : null,
    });
    setSipPlannerOpen(false);
  };

  const shapeOptions: ShapeCardOption[] = [
    {
      type: 'social_60',
      title: 'Vivienda Social 60 m²',
      badge: 'D.S.49 / 3D 1B',
      description: 'Prototipo social optimizado 8.80 × 6.80 m con 3 dormitorios, baño, cocina y logia',
      renderIcon: () => (
        <div className="w-28 h-28 relative flex items-center justify-center bg-white/50 rounded-lg border-2 border-emerald-500 shadow-sm">
          <svg viewBox="0 0 100 100" className="w-24 h-24 stroke-emerald-700 fill-emerald-100/40" strokeWidth="5" strokeLinejoin="round">
            <rect x="15" y="20" width="70" height="60" rx="2" />
            <line x1="55" y1="20" x2="55" y2="80" strokeDasharray="3 2" />
            <line x1="15" y1="50" x2="55" y2="50" strokeDasharray="3 2" />
          </svg>
        </div>
      ),
    },
    {
      type: 'rectangular',
      title: 'Rectangular Modular SIP',
      badge: 'Módulo 1.22 m',
      description: 'Habitación estándar con 4 paredes ortogonales (A, B, C, D) moduladas a paneles SIP',
      renderIcon: () => (
        <div className="w-28 h-28 border-4 border-slate-700 rounded-lg flex items-center justify-center bg-white/50 shadow-sm">
          <span className="text-[11px] font-mono text-slate-700 font-extrabold">90° / SIP 1.22m</span>
        </div>
      ),
    },
    {
      type: 'l_shape',
      title: 'Forma en L (6 Paredes)',
      badge: '90°/270°',
      description: 'Distribución en esquina con ala lateral de dormitorios o terraza cubierta',
      renderIcon: () => (
        <div className="w-28 h-28 relative flex items-center justify-center bg-white/50 rounded-lg">
          <svg viewBox="0 0 100 100" className="w-24 h-24 stroke-slate-700 fill-slate-200/50" strokeWidth="5" strokeLinejoin="round">
            <polygon points="15,15 50,15 50,50 85,50 85,85 15,85" />
          </svg>
        </div>
      ),
    },
    {
      type: 'compact_24',
      title: 'Cabaña Compacta 24 m²',
      badge: '1D / Loft',
      description: 'Geometría compacta 6.00 × 4.00 m ideal para hospedaje o segunda vivienda',
      renderIcon: () => (
        <div className="w-28 h-28 relative flex items-center justify-center bg-white/50 rounded-lg border border-amber-400">
          <Home size={42} className="text-amber-600" />
        </div>
      ),
    },
    {
      type: 'u_shape',
      title: 'Forma en U / Patio Central',
      badge: '8 Paredes',
      description: 'Distribución envolvente con 3 alas y patio/quincho central integrado',
      renderIcon: () => (
        <div className="w-28 h-28 relative flex items-center justify-center bg-white/50 rounded-lg">
          <svg viewBox="0 0 100 100" className="w-24 h-24 stroke-slate-700 fill-slate-200/50" strokeWidth="5" strokeLinejoin="round">
            <polygon points="15,15 85,15 85,85 60,85 60,45 40,45 40,85 15,85" />
          </svg>
        </div>
      ),
    },
    {
      type: 'freeform',
      title: 'Dibujar desde Cero (Plano 90°)',
      badge: 'Lienzo en Blanco',
      description: 'Inicia con un plano limpio y traza muros rectos a 90° paso a paso modulados a paneles SIP',
      renderIcon: () => (
        <div className="w-28 h-28 relative flex items-center justify-center bg-white/50 rounded-lg border-2 border-dashed border-orange-500 shadow-sm">
          <div className="absolute top-2 left-2 w-14 h-14 border-t-4 border-l-4 border-orange-500"></div>
          <PenTool size={36} className="text-orange-500 transform -rotate-45" />
        </div>
      ),
    },
  ];

  if (!isSipPlannerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-fadeIn">
      <div className="w-full max-w-7xl h-[92vh] bg-[#FFFFFF] text-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/20">
        
        {/* ========================================================================= */}
        {/* CABECERA TÉCNICA (Franja Amarilla Profesional - Identidad Imagen 1 y 2)    */}
        {/* ========================================================================= */}
        <header className="bg-[#FACC15] text-black px-6 py-3.5 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            {step !== 'select_type' && (
              <button
                onClick={() => setStep(step === 'roof_openings' ? 'edit_dimensions' : 'select_type')}
                className="p-1.5 hover:bg-black/10 rounded-md transition-colors flex items-center gap-1 text-xs font-black uppercase tracking-wider cursor-pointer"
                title="Volver al paso anterior"
              >
                <ArrowLeft size={16} />
                <span>{step === 'roof_openings' ? 'Planos 2D' : 'Tipos'}</span>
              </button>
            )}
            <div className="h-5 w-px bg-black/20 mx-1"></div>
            <h1 className="text-lg md:text-xl font-extrabold tracking-tight uppercase flex items-center gap-2">
              <Home size={20} className="text-slate-900" />
              <span>Plano & Geometría SIP</span>
              <span className="text-xs bg-black text-[#FACC15] px-2.5 py-0.5 rounded-full font-mono font-bold">
                {step === 'select_type'
                  ? 'Paso 1: Geometría'
                  : step === 'edit_dimensions'
                  ? 'Paso 2: Planos 2D Cotas y Muros'
                  : 'Paso 3: Techumbre & Vanos'}
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {step === 'edit_dimensions' && (
              <button
                onClick={() => setStep('roof_openings')}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-[#FACC15] font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-md flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>Paso 3: Techo & Vanos</span>
                <ArrowRight size={16} />
              </button>
            )}

            {step === 'roof_openings' && (
              <button
                onClick={handleApplyTo3D}
                className="px-5 py-2 bg-black hover:bg-zinc-800 text-[#FACC15] font-black text-sm uppercase tracking-wider rounded-lg shadow-xl flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 cursor-pointer ring-2 ring-black/20"
                title="Generar la casa SIP 3D completa en el visor BIM"
              >
                <Sparkles size={18} />
                <span>Aplicar a Casa 3D (BIM)</span>
                <ArrowRight size={18} />
              </button>
            )}

            <button
              onClick={() => setSipPlannerOpen(false)}
              className="p-2 hover:bg-black/10 rounded-lg transition-colors text-black cursor-pointer"
              title="Cerrar sin guardar cambios"
            >
              <X size={22} />
            </button>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* PASO 1: SELECTOR DE TIPOLOGÍA Y GEOMETRÍA BASE (Estilo Imagen 2)          */}
        {/* ========================================================================= */}
        {step === 'select_type' ? (
          <div className="flex-1 p-6 md:p-8 bg-[#F4F4F5] overflow-y-auto custom-scrollbar flex flex-col justify-center">
            <div className="max-w-5xl mx-auto w-full">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">
                  Selecciona la Geometría de la Casa Panel SIP
                </h2>
                <p className="text-slate-600 text-sm mt-1 max-w-2xl mx-auto">
                  Elige una plantilla base o parte de un diseño libre para definir muros perimetrales, tabiques interiores, cotas milimétricas y modulación a paneles SIP (1.22 m).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {shapeOptions.map((opt) => {
                  const isSelected = selectedShape === opt.type;
                  return (
                    <div
                      key={opt.type}
                      onClick={() => handleSelectShape(opt.type)}
                      className={`group relative bg-[#E4E4E7] hover:bg-[#D4D4D8] border-2 transition-all duration-200 rounded-2xl p-5 cursor-pointer flex flex-col items-center justify-between shadow-sm hover:shadow-md ${
                        isSelected ? 'border-orange-500 ring-2 ring-orange-500/30 bg-white' : 'border-transparent hover:border-slate-400'
                      }`}
                    >
                      {opt.badge && (
                        <div className="absolute top-3 right-3 bg-[#FACC15] text-black text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                          <CornerDownRight size={10} />
                          <span>{opt.badge}</span>
                        </div>
                      )}

                      <div className="py-4 flex items-center justify-center transform group-hover:scale-105 transition-transform duration-200">
                        {opt.renderIcon()}
                      </div>

                      <div className="w-full text-center mt-2 border-t border-slate-300 pt-3">
                        <h3 className="font-black text-base text-slate-900 uppercase tracking-wide">
                          {opt.title}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                          {opt.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => setStep('edit_dimensions')}
                  className="px-8 py-3 bg-slate-900 hover:bg-black text-white font-bold text-sm uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Continuar con Geometría Actual ({computedDimensions.length / 100}m × {computedDimensions.width / 100}m)</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        ) : step === 'edit_dimensions' ? (
          /* ========================================================================= */
          /* PASO 2: EDITOR TÉCNICO INTERACTIVO DE PLANOS (Estilo Imagen 1)            */
          /* ========================================================================= */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#F4F4F5]">
            
            {/* PANEL LATERAL IZQUIERDO */}
            <aside className="w-full md:w-80 lg:w-96 bg-[#E4E4E7] border-r border-slate-300 p-5 flex flex-col overflow-y-auto custom-scrollbar shrink-0 shadow-inner">
              
              {/* Botón Principal para Dibujar desde Cero o Modo Dibujo Activo */}
              {isFreehandDrawing || vertices.length < 3 ? (
                <div className="bg-orange-500/10 border-2 border-orange-500 rounded-xl p-3.5 mb-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs font-black text-orange-900 uppercase">
                      <PenTool size={16} className="text-orange-600 animate-pulse" />
                      <span>Modo Dibujo a 90°</span>
                    </div>
                    <span className="text-[10px] bg-orange-600 text-white font-mono font-bold px-2 py-0.5 rounded-full">
                      {vertices.length} {vertices.length === 1 ? 'nodo' : 'nodos'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 mb-3 font-medium leading-relaxed bg-white/80 p-2 rounded-lg border border-orange-200">
                    {vertices.length === 0 && '1. Haz clic en cualquier punto del lienzo para fijar la primera esquina.'}
                    {vertices.length === 1 && '2. Mueve el cursor a 90° (horizontal/vertical) y haz clic para fijar la 1ª pared.'}
                    {vertices.length === 2 && '3. Continúa colocando paredes ortogonales a 90°.'}
                    {vertices.length >= 3 && '4. Haz clic en el nodo inicial verde o en "Cerrar Casa" para completar el plano.'}
                  </p>

                  <div className="space-y-1.5">
                    {vertices.length >= 3 && (
                      <button
                        onClick={handleFinishFreehandDrawing}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all uppercase tracking-wider"
                      >
                        <Check size={16} />
                        <span>Cerrar y Completar Casa</span>
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={handleUndoLastVertex}
                        disabled={vertices.length === 0}
                        className={`py-1.5 px-2 border rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                          vertices.length > 0
                            ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 cursor-pointer shadow-xs'
                            : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                        }`}
                      >
                        <RotateCcw size={12} />
                        <span>Deshacer</span>
                      </button>

                      <button
                        onClick={handleStartDrawFromScratch}
                        className="py-1.5 px-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                      >
                        <Trash2 size={12} />
                        <span>Limpiar</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleSelectShape('rectangular')}
                      className="w-full py-1 text-[11px] text-slate-600 hover:text-slate-900 underline text-center cursor-pointer pt-1"
                    >
                      Cancelar y usar rectángulo base
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-3">
                  <button
                    onClick={handleStartDrawFromScratch}
                    className="w-full py-2 px-3 bg-white hover:bg-orange-50 border-2 border-dashed border-orange-400 text-orange-700 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all group"
                  >
                    <PenTool size={15} className="text-orange-500 group-hover:scale-110 transition-transform" />
                    <span>Dibujar Casa desde Cero (Plano en Blanco)</span>
                  </button>
                </div>
              )}

              {/* Encabezado de Columnas */}
              {vertices.length >= 3 && !isFreehandDrawing && (
                <>
                  <div className="grid grid-cols-12 gap-2 pb-2 border-b border-slate-300 mb-2 text-[11px] uppercase tracking-wider font-extrabold text-slate-600">
                    <div className="col-span-2">Pared</div>
                    <div className="col-span-6 text-center">Longitud (cm) / Paneles</div>
                    <div className="col-span-4 text-right">Ángulo (°)</div>
                  </div>

                  {/* Lista de Filas de Paredes A, B, C, D... */}
                  <div className="flex flex-col gap-1.5 mb-4 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                    {wallSegments.map((seg) => {
                      const isSelected = selectedVertexIndex === seg.index;
                      const panels = (seg.length / 122).toFixed(1);
                      return (
                        <div
                          key={seg.label}
                          onClick={() => setSelectedVertexIndex(seg.index)}
                          className={`grid grid-cols-12 gap-1.5 items-center p-2 rounded-xl transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white border-2 border-orange-500 shadow-sm'
                              : 'bg-[#F4F4F5] border border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          {/* Letra de la pared */}
                          <div className="col-span-2 font-extrabold text-base text-slate-900 flex items-center gap-1">
                            <span className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-mono font-bold">
                              {seg.label}
                            </span>
                          </div>

                          {/* Input de Longitud (cm) con botones rápidos de +/- Panel */}
                          <div className="col-span-6 flex flex-col">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAdjustWallPanels(seg.index, -1);
                                }}
                                title="Restar 1 Panel SIP (1.22 m)"
                                className="w-5 h-6 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 rounded text-slate-700 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                              >
                                <Minus size={11} />
                              </button>
                              <input
                                type="number"
                                min="50"
                                max="3000"
                                step="10"
                                value={Math.round(seg.length)}
                                onChange={(e) => handleWallLengthChange(seg.index, Number(e.target.value))}
                                className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-center text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAdjustWallPanels(seg.index, 1);
                                }}
                                title="Sumar 1 Panel SIP (1.22 m)"
                                className="w-5 h-6 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 rounded text-slate-700 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                              >
                                <Plus size={11} />
                              </button>
                            </div>
                            <div className="text-[9px] text-center text-emerald-700 font-semibold mt-0.5">
                              {panels} pan. SIP
                            </div>
                          </div>

                          {/* Ángulo en grados */}
                          <div className="col-span-4 text-right">
                            <span className={`inline-block border rounded-lg px-2 py-1 text-xs font-mono font-bold ${
                              seg.angleWithNext === 90 || seg.angleWithNext === 270
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-orange-50 text-orange-700 border-orange-300'
                            }`}>
                              {seg.angleWithNext}°
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Altura y Espesor de Muro SIP */}
              <div className="bg-[#F4F4F5] p-3 rounded-xl border border-slate-300 mb-3 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-700 uppercase">Altura de Muros:</span>
                  <div className="flex gap-1">
                    {[244, 260, 280].map((h) => (
                      <button
                        key={h}
                        onClick={() => setWallHeight(h)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold cursor-pointer ${
                          wallHeight === h
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {h} cm
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-700 uppercase">Espesor Muro SIP:</span>
                  <div className="flex gap-1">
                    {([90, 114, 162] as SipWallThickness[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setWallThickness(t)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold cursor-pointer ${
                          wallThickness === t
                            ? 'bg-orange-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {t} mm
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modulación, Modo ORTHO y Enderezar a 90° */}
              <div className="bg-[#F4F4F5] p-3 rounded-xl border border-slate-300 mb-3 space-y-2">
                <div className="text-[11px] font-extrabold text-slate-700 uppercase flex items-center justify-between">
                  <span>Control de Geometría SIP:</span>
                  <button
                    onClick={() => setOrthoMode(!orthoMode)}
                    className={`text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                      orthoMode
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    <Lock size={10} />
                    <span>ORTHO 90°: {orthoMode ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                {vertices.length >= 3 && (
                  <button
                    onClick={handleOrthogonalize}
                    className="w-full py-1.5 px-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all"
                  >
                    <Wand2 size={13} />
                    <span>Enderezar a 90° & Modular SIP</span>
                  </button>
                )}

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {[
                    { id: 'sip_122', label: 'Panel SIP (1.22m)' },
                    { id: 'sip_61', label: '1/2 Panel (0.61m)' },
                    { id: 'fine_10', label: '10 cm' },
                    { id: 'fine_5', label: '5 cm' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSnapMode(m.id as SipSnapMode)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold text-center cursor-pointer border ${
                        snapMode === m.id
                          ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recintos y Tabiquería Interior */}
              <div className="bg-[#F4F4F5] p-3 rounded-xl border border-slate-300 mb-3">
                <span className="text-[11px] font-extrabold text-slate-700 uppercase block mb-1.5">
                  Distribución Interior SIP:
                </span>
                <select
                  value={activeLayoutPreset}
                  onChange={(e) => setActiveLayoutPreset(e.target.value as InteriorLayoutPreset)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="open_loft">Planta Libre (Sin Muros Interiores)</option>
                  <option value="social_60m2">Vivienda Social D.S.49 (3D 1B + Logia)</option>
                  <option value="1bed_1bath">1 Dormitorio / 1 Baño</option>
                  <option value="2bed_1bath">2 Dormitorios / 1 Baño</option>
                  <option value="3bed_1bath">3 Dormitorios / 1 Baño</option>
                  <option value="3bed_2bath">3 Dormitorios / 2 Baños</option>
                </select>
              </div>

              {/* Display de Superficie y Perímetro */}
              {vertices.length >= 3 && (
                <div className="bg-white p-3 rounded-xl border-2 border-blue-500/30 mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-extrabold text-slate-500">Superficie Útil</div>
                    <div className="text-xl font-black text-blue-600 font-mono">{areaM2.toFixed(2)} m²</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-extrabold text-slate-500">Perímetro Exterior</div>
                    <div className="text-sm font-bold text-slate-700 font-mono">{perimeterM.toFixed(2)} m</div>
                  </div>
                </div>
              )}

              {/* Botones de Operaciones con Vértices */}
              {vertices.length >= 3 && (
                <div className="space-y-1.5 mt-auto">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={handleAddVertex}
                      className="px-2.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm"
                    >
                      <Plus size={14} className="text-emerald-600" />
                      <span>Añadir Vértice</span>
                    </button>
                    <button
                      onClick={handleDeleteVertex}
                      disabled={vertices.length <= 3 || selectedVertexIndex === null}
                      className={`px-2.5 py-2 border rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                        vertices.length > 3 && selectedVertexIndex !== null
                          ? 'bg-white hover:bg-red-50 text-red-600 border-red-200 cursor-pointer shadow-sm'
                          : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                      }`}
                    >
                      <Trash2 size={14} />
                      <span>Eliminar</span>
                    </button>
                  </div>

                  <button
                    onClick={handleCenter}
                    className="w-full px-2.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw size={14} />
                    <span>Centrar en el Plano</span>
                  </button>
                </div>
              )}
            </aside>

            {/* LIENZO SVG 2D */}
            <main className="flex-1 relative overflow-hidden bg-[#F4F4F5] flex flex-col">
              {/* Barra Flotante Superior de Guía de Trazado a 90° */}
              {isFreehandDrawing && (
                <div className="absolute top-3 left-4 right-4 z-20 bg-slate-900/90 backdrop-blur-md text-white px-4 py-2.5 rounded-xl shadow-lg border border-orange-500/50 flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping"></span>
                    <span className="text-orange-400 font-extrabold uppercase">Modo Dibujo 90°:</span>
                    <span className="text-slate-200">
                      {vertices.length === 0 && 'Haz clic en el plano para iniciar la primera pared.'}
                      {vertices.length === 1 && 'Mueve el cursor en ángulo recto (90°) y haz clic para fijar la pared.'}
                      {vertices.length === 2 && 'Coloca la siguiente pared ortogonal a 90°.'}
                      {vertices.length >= 3 && 'Haz clic en el círculo verde inicial o en "Cerrar Casa" para finalizar.'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {vertices.length >= 3 && (
                      <button
                        onClick={handleFinishFreehandDrawing}
                        className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase rounded-lg shadow-sm flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Check size={14} />
                        <span>Cerrar Casa</span>
                      </button>
                    )}
                    <button
                      onClick={handleUndoLastVertex}
                      disabled={vertices.length === 0}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg border border-slate-700 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw size={12} />
                      <span>Deshacer</span>
                    </button>
                  </div>
                </div>
              )}

              <SipHousePlannerCanvas
                vertices={vertices}
                wallThicknessCm={wallThickness / 10}
                wallHeightCm={wallHeight}
                roofStyle={roofStyle}
                snapMode={snapMode}
                orthoMode={orthoMode}
                isFreehandMode={isFreehandDrawing}
                onVerticesChange={setVertices}
                selectedVertexIndex={selectedVertexIndex}
                onSelectVertexIndex={setSelectedVertexIndex}
                onFinishDrawing={handleFinishFreehandDrawing}
                interiorWalls={previewInteriorWalls}
              />
            </main>
          </div>
        ) : (
          /* ========================================================================= */
          /* PASO 3: CONFIGURACIÓN DE TECHUMBRE & VANOS                                 */
          /* ========================================================================= */
          <div className="flex-1 p-6 md:p-8 bg-[#F4F4F5] overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">
                  Paso 3: Configurar Tipo de Techumbre & Vanos
                </h2>
                <p className="text-slate-600 text-sm mt-1">
                  Selecciona la tipología de cubierta SIP (1 Agua, 2 Aguas o Plano) y revisa la modulación antes de traspasar al modelo 3D.
                </p>
              </div>

              {/* Selector de Techumbre */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                  {
                    id: 'gable_valley' as RoofStyle,
                    title: 'Techo a 2 Aguas (Gable)',
                    badge: 'Cumbrera Central',
                    desc: 'Dos faldones inclinados en panel SIP con cumbrera ventilada y tímpanos triangulares.',
                    icon: (
                      <svg viewBox="0 0 100 60" className="w-20 h-12 stroke-slate-800 fill-amber-100/60" strokeWidth="4">
                        <polygon points="10,45 50,15 90,45" />
                        <line x1="50" y1="15" x2="50" y2="45" strokeDasharray="2 2" />
                      </svg>
                    ),
                  },
                  {
                    id: 'single_shed' as RoofStyle,
                    title: 'Techo a 1 Agua (Mono-pitch)',
                    badge: 'Inclinación Continua',
                    desc: 'Un solo plano inclinado SIP de alta pendiente, ideal para captación solar y estilo contemporáneo.',
                    icon: (
                      <svg viewBox="0 0 100 60" className="w-20 h-12 stroke-slate-800 fill-amber-100/60" strokeWidth="4">
                        <polygon points="10,15 90,45 90,50 10,50" />
                      </svg>
                    ),
                  },
                  {
                    id: 'flat' as RoofStyle,
                    title: 'Techo Plano / Oculto',
                    badge: 'Parapeto SIP 3%',
                    desc: 'Cubierta horizontal con pendiente técnica interna de 3% y parapetos perimetrales en panel SIP.',
                    icon: (
                      <svg viewBox="0 0 100 60" className="w-20 h-12 stroke-slate-800 fill-amber-100/60" strokeWidth="4">
                        <rect x="10" y="30" width="80" height="12" rx="1" />
                        <line x1="10" y1="22" x2="10" y2="42" strokeWidth="4" />
                        <line x1="90" y1="22" x2="90" y2="42" strokeWidth="4" />
                      </svg>
                    ),
                  },
                ].map((r) => {
                  const isSelected = roofStyle === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setRoofStyle(r.id)}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-orange-500 bg-white ring-2 ring-orange-500/20 shadow-md'
                          : 'border-slate-300 bg-slate-200/60 hover:bg-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase bg-[#FACC15] text-black px-2 py-0.5 rounded-full">
                          {r.badge}
                        </span>
                        {isSelected && <Check size={18} className="text-orange-600" />}
                      </div>

                      <div className="py-2 flex items-center justify-center">{r.icon}</div>

                      <div className="mt-3">
                        <h4 className="font-extrabold text-sm text-slate-900 uppercase">{r.title}</h4>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{r.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Parámetros de Techumbre */}
              <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm mb-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1.5">
                    Altura de Cumbrera (cm):
                  </label>
                  <input
                    type="number"
                    min={wallHeight + 30}
                    max={600}
                    step="10"
                    value={ridgeHeight}
                    onChange={(e) => setRidgeHeight(Number(e.target.value))}
                    disabled={roofStyle === 'flat'}
                    className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Pendiente calculada: {Math.round(((ridgeHeight - wallHeight) / (computedDimensions.width / 2)) * 100)}%
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1.5">
                    Alero Perimetral (cm):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    value={overhang}
                    onChange={(e) => setOverhang(Number(e.target.value))}
                    className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Vuelo de techumbre PROSIP</span>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1.5">
                    Espesor Panel Techo:
                  </label>
                  <div className="flex gap-2">
                    {[162, 210].map((t) => (
                      <button
                        key={t}
                        type="button"
                        className="flex-1 py-2 px-3 rounded-xl font-mono font-bold text-xs bg-slate-900 text-white"
                      >
                        {t} mm
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">
                    Aislación térmica R-100 Zona Sur
                  </span>
                </div>
              </div>

              {/* Botón de Acción Final */}
              <div className="flex justify-center">
                <button
                  onClick={handleApplyTo3D}
                  className="px-10 py-4 bg-black hover:bg-zinc-800 text-[#FACC15] font-black text-base uppercase tracking-wider rounded-2xl shadow-2xl flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-[#FACC15]/40"
                >
                  <Sparkles size={22} />
                  <span>Traspasar a Casa SIP 3D (Generar Modelo BIM)</span>
                  <ArrowRight size={22} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
