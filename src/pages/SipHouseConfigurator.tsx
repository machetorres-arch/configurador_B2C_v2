import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Download,
  Eye,
  Layers,
  Sparkles,
  Maximize2,
  Edit2,
  Trash2,
  Plus,
  Check,
  RotateCcw,
  Home,
  Zap,
  Droplets,
  Flame,
  FileSpreadsheet,
  SlidersHorizontal,
  Paintbrush,
  Ruler,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  LayoutGrid,
  DoorClosed,
  Compass,
  Repeat,
  FlipHorizontal,
  FlipVertical,
  CheckCircle,
  Sparkle
} from 'lucide-react';
import {
  useSipHouseStore,
  WallTarget,
  FoundationType,
  ExteriorCladding,
  RoofCladding,
  InteriorCeiling,
  FlooringType,
  SipCoreType,
  SipWallThickness,
  SipRoofThickness,
  SipFloorThickness,
  SIP_CORE_SPECS,
  InteriorLayoutPreset,
  BedroomPlacementStrategy,
  getWallLengthCm,
  getInteriorZones,
  getAvailablePresetsForDimensions,
  LAYOUT_PRESETS_CATALOG
} from '../store/sipHouseStore';
import { calculateSipHouseQuantities, exportSipHouseToExcel } from '../utils/sipExcelGenerator';
import { SipScene } from '../components/sip/SipScene';
import { SipBlueprint } from '../components/sip/SipBlueprint';

export function SipHouseConfigurator({ onNavigate }: { onNavigate: (route: 'home') => void }) {
  const state = useSipHouseStore();
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [activeTab, setActiveTab] = useState<'dimensions' | 'layout' | 'openings' | 'materials' | 'mep' | 'layers' | 'bom'>('dimensions');

  // Asegurar que inicie limpio en el modelo base rectangular armado
  useEffect(() => {
    useSipHouseStore.getState().resetToDefaultTemplate();
  }, []);

  // Formulario para nuevo vano
  const [newOpeningType, setNewOpeningType] = useState<'door' | 'window'>('window');
  const [newOpeningWall, setNewOpeningWall] = useState<WallTarget>('front');
  const [newOpeningWidth, setNewOpeningWidth] = useState(120);
  const [newOpeningHeight, setNewOpeningHeight] = useState(120);
  const [newOpeningSill, setNewOpeningSill] = useState(90);
  const [newOpeningOffset, setNewOpeningOffset] = useState(60);
  const [newOpeningFrame, setNewOpeningFrame] = useState<'pvc_negro' | 'pvc_folio_madera' | 'aluminio_rtt' | 'madera_lenga'>('pvc_negro');
  const [newOpeningGlazing, setNewOpeningGlazing] = useState<'termopanel_dvp' | 'simple_vidrio'>('termopanel_dvp');

  // Estado de edición interactiva de vano existente
  const [editingOpeningId, setEditingOpeningId] = useState<string | null>(null);

  const metrics = calculateSipHouseQuantities(
    state.dimensions,
    state.foundationType,
    state.exteriorCladding,
    state.roofCladding,
    state.interiorCeiling,
    state.flooringType,
    state.openings,
    state.mepNetwork,
    state.coreType,
    state.wallThicknessMm,
    state.roofThicknessMm,
    state.floorThicknessMm,
    state.interiorWalls
  );

  const handleExportExcel = () => {
    exportSipHouseToExcel(
      state.dimensions,
      state.foundationType,
      state.exteriorCladding,
      state.roofCladding,
      state.interiorCeiling,
      state.flooringType,
      state.openings,
      state.mepNetwork,
      state.coreType,
      state.wallThicknessMm,
      state.roofThicknessMm,
      state.floorThicknessMm,
      state.interiorWalls
    );
  };

  const handleAddOpening = () => {
    const isDoor = newOpeningType === 'door';
    const code = `${isDoor ? 'P' : 'V'}${state.openings.length + 1}`;
    state.addOpening({
      type: newOpeningType,
      code,
      name: `${isDoor ? 'Puerta' : 'Ventana'} ${code} (${newOpeningWidth}x${newOpeningHeight})`,
      assignedWall: newOpeningWall,
      width: newOpeningWidth,
      height: newOpeningHeight,
      sillHeight: isDoor ? 0 : newOpeningSill,
      offsetAlongWall: newOpeningOffset,
      glazingType: newOpeningGlazing,
      frameMaterial: newOpeningFrame,
    });
  };

  const applyPreset = (preset: {
    type: 'door' | 'window';
    name: string;
    width: number;
    height: number;
    sill: number;
    frame: 'pvc_negro' | 'pvc_folio_madera' | 'aluminio_rtt' | 'madera_lenga';
    glazing: 'termopanel_dvp' | 'simple_vidrio';
  }) => {
    setNewOpeningType(preset.type);
    setNewOpeningWidth(preset.width);
    setNewOpeningHeight(preset.height);
    setNewOpeningSill(preset.sill);
    setNewOpeningFrame(preset.frame);
    setNewOpeningGlazing(preset.glazing);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* HEADER TÉCNICO SUPERIOR */}
      <header className="h-14 bg-slate-900/90 border-b border-white/10 px-4 flex items-center justify-between shrink-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Volver a Suite</span>
          </button>

          <div className="h-5 w-px bg-white/10" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Home size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wide">Cabaña Modular Panel SIP</span>
                <span className="text-[10px] bg-sky-500/20 text-sky-400 font-mono font-bold px-1.5 py-0.5 rounded border border-sky-500/30">
                  PROSIP BIM 2 AGUAS
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Modelo Base Rectangular Paramétrico | {metrics.totalFloorM2} m²</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Switch 3D / 2D */}
          <div className="bg-slate-950 p-1 rounded-xl border border-white/10 flex items-center">
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                viewMode === '3d'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Modelo 3D
            </button>
            <button
              onClick={() => setViewMode('2d')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                viewMode === '2d'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Plano 2D SVG
            </button>
          </div>

          {/* Botón Cotas / Dimensiones */}
          <button
            onClick={() => state.toggleDimensions()}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all border ${
              state.showDimensions
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-md shadow-sky-500/20 ring-1 ring-sky-500/30'
                : 'bg-slate-950 text-slate-400 border-white/10 hover:text-white hover:bg-white/5'
            }`}
            title="Activar / Desactivar cotas arquitectónicas paramétricas"
          >
            <Ruler size={15} className={state.showDimensions ? 'text-sky-400' : 'text-slate-400'} />
            <span className="hidden sm:inline">
              Cotas: {state.showDimensions ? `L${state.dimensionDetailLevel}` : 'OFF'}
            </span>
          </button>

          {/* Botón Transparentar */}
          <button
            onClick={() => state.toggleTransparent()}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all border ${
              state.isTransparent
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-md shadow-sky-500/20 ring-1 ring-sky-500/30'
                : 'bg-slate-950 text-slate-400 border-white/10 hover:text-white hover:bg-white/5'
            }`}
            title="Transparentar estructura y envolvente para visualizar maderas, vanos y armaduras de metal"
          >
            <Eye size={15} className={state.isTransparent ? 'text-sky-400 animate-pulse' : 'text-slate-400'} />
            <span className="hidden sm:inline">{state.isTransparent ? 'Transparente: ON' : 'Transparentar'}</span>
          </button>

          <button
            onClick={() => state.resetToDefaultTemplate()}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            title="Restablecer plantilla rectangular por defecto"
          >
            <RotateCcw size={16} />
          </button>

          {/* Exportar Excel */}
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
          >
            <FileSpreadsheet size={15} />
            <span className="hidden md:inline">Cubicación BoM (.xlsx)</span>
          </button>
        </div>
      </header>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ÁREA DE VISUALIZACIÓN (3D / 2D) */}
        <main className="flex-1 relative h-full w-full overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950">
          {viewMode === '3d' ? (
            <>
              <SipScene />

              {/* Control Flotante de Despiece Explosionado */}
              <div className="absolute bottom-5 left-5 z-20 bg-slate-900/90 border border-white/10 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md flex items-center gap-3 w-72">
                <Layers size={18} className="text-sky-400 shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                    <span>Despiece Explosionado</span>
                    <span className="text-sky-400 font-mono">
                      {Math.round(state.explodedProgress * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={state.explodedProgress}
                    onChange={(e) => state.setExplodedProgress(parseFloat(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>
              </div>

              {/* Indicadores Flotantes de Métricas Rápidas */}
              <div className="absolute top-5 left-5 z-20 flex gap-2">
                <div className="bg-slate-900/80 border border-white/10 px-3 py-1.5 rounded-xl text-xs backdrop-blur-md">
                  <span className="text-slate-400 block text-[10px]">Superficie Piso</span>
                  <span className="font-mono font-bold text-sky-400 text-sm">{metrics.totalFloorM2} m²</span>
                </div>
                <div className="bg-slate-900/80 border border-white/10 px-3 py-1.5 rounded-xl text-xs backdrop-blur-md">
                  <span className="text-slate-400 block text-[10px]">Envolvente SIP</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">{metrics.extWallAreaM2} m²</span>
                </div>
                <div className="bg-slate-900/80 border border-white/10 px-3 py-1.5 rounded-xl text-xs backdrop-blur-md">
                  <span className="text-slate-400 block text-[10px]">Cubierta 2 Aguas</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">{metrics.totalRoofAreaM2} m²</span>
                </div>
              </div>

              {/* Botón Flotante Transparentar en Viewport 3D */}
              <div className="absolute top-5 right-5 z-20 flex items-center gap-2">
                <button
                  onClick={() => state.toggleTransparent()}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 backdrop-blur-md transition-all border shadow-xl ${
                    state.isTransparent
                      ? 'bg-sky-500/30 border-sky-400 text-sky-200 shadow-sky-500/30 ring-1 ring-sky-400'
                      : 'bg-slate-900/80 border-white/10 text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Transparentar paneles SIP y hormigón para visualizar estructuras internas de metal y madera"
                >
                  <Eye size={16} className={state.isTransparent ? 'text-sky-400 animate-pulse' : 'text-slate-400'} />
                  <span>{state.isTransparent ? 'Modo Transparente: ON' : 'Transparentar Modelo'}</span>
                </button>
              </div>
            </>
          ) : (
            <SipBlueprint />
          )}

          {/* CONTROL FLOTANTE DE COTAS Y SCROLL DE INTENSIDADES (Visible en 3D y 2D) */}
          <div
            className="absolute bottom-5 right-5 z-20 bg-slate-900/95 border border-sky-500/30 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl flex flex-col gap-2.5 w-80 text-white select-none transition-all"
            onWheel={(e) => {
              // Rueda de ratón / Scroll interactivo para ir agregando o quitando cotas progresivamente
              e.stopPropagation();
              if (e.deltaY < 0) {
                // Scroll hacia arriba: Aumentar cotas
                if (!state.showDimensions) {
                  state.setShowDimensions(true);
                } else if (state.dimensionDetailLevel < 4) {
                  state.setDimensionDetailLevel(state.dimensionDetailLevel + 1);
                }
              } else if (e.deltaY > 0) {
                // Scroll hacia abajo: Disminuir cotas
                if (state.dimensionDetailLevel > 1) {
                  state.setDimensionDetailLevel(state.dimensionDetailLevel - 1);
                } else if (state.showDimensions) {
                  state.setShowDimensions(false);
                }
              }
            }}
          >
            {/* Header del Control de Cotas */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`p-1.5 rounded-lg transition-all ${
                    state.showDimensions
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sm shadow-sky-500/20'
                      : 'bg-slate-800 text-slate-500 border border-white/5'
                  }`}
                >
                  <Ruler size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <span>Cotas & Dimensiones</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold transition-all ${
                        state.showDimensions
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {state.showDimensions ? `Nivel ${state.dimensionDetailLevel}/4` : 'APAGADAS'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Scroll 🖱️ o desliza para graduar densidad
                  </div>
                </div>
              </div>

              {/* Botón Toggle On/Off */}
              <button
                onClick={() => state.toggleDimensions()}
                className={`px-3 py-1 text-xs font-bold rounded-xl transition-all border shadow-md ${
                  state.showDimensions
                    ? 'bg-sky-500 text-white border-sky-400 shadow-sky-500/20'
                    : 'bg-slate-800 text-slate-400 border-white/10 hover:text-white hover:bg-slate-700'
                }`}
                title="Activar / Desactivar cotas"
              >
                {state.showDimensions ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Slider / Scroll de Intensidad de Cotas */}
            <div className="space-y-1.5 pt-1.5 border-t border-white/10">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-slate-400">Densidad de Cotas:</span>
                <span className="text-sky-400 font-bold truncate max-w-[170px] text-right">
                  {!state.showDimensions
                    ? '0 · Sin Cotas'
                    : state.dimensionDetailLevel === 1
                    ? '1 · Generales (Perímetro/Alturas)'
                    : state.dimensionDetailLevel === 2
                    ? '2 · + Ejes & Recintos'
                    : state.dimensionDetailLevel === 3
                    ? '3 · + Vanos (Ptas/Vtas)'
                    : '4 · + Despiece BIM SIP'}
                </span>
              </div>

              {/* Rango de Intensidad */}
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="1"
                  value={state.showDimensions ? state.dimensionDetailLevel : 1}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!state.showDimensions) state.setShowDimensions(true);
                    state.setDimensionDetailLevel(val);
                  }}
                  className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              {/* Botones de Pasos de Intensidad Rápida */}
              <div className="grid grid-cols-4 gap-1 pt-1">
                {[
                  { lvl: 1, label: 'L1: Base', desc: 'Perímetro exterior y alturas' },
                  { lvl: 2, label: 'L2: Ejes', desc: 'Ejes de tabiques y áreas de recintos' },
                  { lvl: 3, label: 'L3: Vanos', desc: 'Offsets y dimensiones de puertas y ventanas' },
                  { lvl: 4, label: 'L4: BIM', desc: 'Modulación de paneles SIP 1.22m y splines' },
                ].map((item) => {
                  const isSelected = state.showDimensions && state.dimensionDetailLevel === item.lvl;
                  return (
                    <button
                      key={item.lvl}
                      onClick={() => {
                        state.setShowDimensions(true);
                        state.setDimensionDetailLevel(item.lvl);
                      }}
                      title={item.desc}
                      className={`py-1 px-1 rounded-lg text-[10px] font-mono font-semibold transition-all border text-center ${
                        isSelected
                          ? 'bg-sky-500/30 border-sky-400 text-sky-200 shadow-sm shadow-sky-500/20 ring-1 ring-sky-500/30 font-bold'
                          : 'bg-slate-800/80 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </main>

        {/* SIDEBAR DE CONFIGURACIÓN PARAMÉTRICA */}
        <aside className="w-80 sm:w-96 bg-slate-900/95 border-l border-white/10 flex flex-col h-full z-20 backdrop-blur-xl shrink-0">
          {/* Navegación por Pestañas */}
          <div className="flex border-b border-white/10 p-2 gap-1 overflow-x-auto shrink-0 bg-slate-950/40">
            <button
              onClick={() => setActiveTab('dimensions')}
              className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
                activeTab === 'dimensions'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>Dimensiones</span>
            </button>
            <button
              onClick={() => setActiveTab('layout')}
              className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
                activeTab === 'layout'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutGrid size={13} />
              <span>Distribución</span>
            </button>
            <button
              onClick={() => setActiveTab('openings')}
              className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
                activeTab === 'openings'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles size={13} />
              <span>Vanos</span>
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
                activeTab === 'materials'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Paintbrush size={13} />
              <span>EETT</span>
            </button>
            <button
              onClick={() => setActiveTab('mep')}
              className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
                activeTab === 'mep'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Zap size={13} />
              <span>MEP</span>
            </button>
            <button
              onClick={() => setActiveTab('layers')}
              className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
                activeTab === 'layers'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers size={13} />
              <span>Capas</span>
            </button>
            <button
              onClick={() => setActiveTab('bom')}
              className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
                activeTab === 'bom'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileSpreadsheet size={13} />
              <span>BoM</span>
            </button>
          </div>

          {/* CONTENIDO DEL PANEL ACTIVO */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 1. TAB DIMENSIONES */}
            {activeTab === 'dimensions' && (
              <div className="space-y-4">
                <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-3 text-xs text-sky-200 leading-relaxed">
                  Ajusta los parámetros geométricos del volumen base rectangular. Los muros cierran perfectamente y el techo a 2 aguas se modula en paneles SIP 210 mm.
                </div>

                <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 space-y-3">
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">
                    Dimensiones en Planta
                  </span>
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Largo (Eje Z):</span>
                      <span className="font-mono font-bold text-sky-400">
                        {state.dimensions.length} cm ({(state.dimensions.length / 100).toFixed(2)} m)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="300"
                      max="1600"
                      step="20"
                      value={state.dimensions.length}
                      onChange={(e) => state.setDimension('length', parseFloat(e.target.value))}
                      className="w-full accent-sky-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Ancho Crujía (Eje X):</span>
                      <span className="font-mono font-bold text-sky-400">
                        {state.dimensions.width} cm ({(state.dimensions.width / 100).toFixed(2)} m)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="240"
                      max="800"
                      step="20"
                      value={state.dimensions.width}
                      onChange={(e) => state.setDimension('width', parseFloat(e.target.value))}
                      className="w-full accent-sky-500"
                    />
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 space-y-3">
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">
                    Alturas y Techo a 2 Aguas
                  </span>
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Altura al Alero (Muros):</span>
                      <span className="font-mono font-bold text-sky-400">{state.dimensions.eaveHeight} cm</span>
                    </div>
                    <input
                      type="range"
                      min="220"
                      max="340"
                      step="5"
                      value={state.dimensions.eaveHeight}
                      onChange={(e) => state.setDimension('eaveHeight', parseFloat(e.target.value))}
                      className="w-full accent-sky-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Altura a Cumbrera:</span>
                      <span className="font-mono font-bold text-sky-400">{state.dimensions.ridgeHeight} cm</span>
                    </div>
                    <input
                      type="range"
                      min={state.dimensions.eaveHeight + 30}
                      max="550"
                      step="10"
                      value={state.dimensions.ridgeHeight}
                      onChange={(e) => state.setDimension('ridgeHeight', parseFloat(e.target.value))}
                      className="w-full accent-sky-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Alero de Cubierta:</span>
                      <span className="font-mono font-bold text-sky-400">{state.dimensions.overhang || 25} cm</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      step="5"
                      value={state.dimensions.overhang || 25}
                      onChange={(e) => state.setDimension('overhang', parseFloat(e.target.value))}
                      className="w-full accent-sky-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB DISTRIBUCIÓN & TABIQUERÍA INTERIOR */}
            {activeTab === 'layout' && (
              <div className="space-y-4">
                {/* Desbloqueo Dinámico de Tipologías por m² */}
                <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">
                        Tipologías Disponibles
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Desbloqueadas para {((state.dimensions.width * state.dimensions.length) / 10000).toFixed(1)} m² ({state.dimensions.width / 100}m × {state.dimensions.length / 100}m)
                      </span>
                    </div>
                    <span className="text-[10px] font-mono bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-sky-400" />
                      {getAvailablePresetsForDimensions(state.dimensions).length} activas
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
                    {LAYOUT_PRESETS_CATALOG.map((preset) => {
                      const isSelected = state.layoutPreset === preset.id;
                      const currentM2 = (state.dimensions.width * state.dimensions.length) / 10000;
                      const isUnlocked = currentM2 >= preset.minM2 * 0.88;

                      return (
                        <button
                          key={preset.id}
                          disabled={!isUnlocked}
                          onClick={() => state.setLayoutPreset(preset.id as InteriorLayoutPreset)}
                          className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 relative overflow-hidden ${
                            isSelected
                              ? 'bg-sky-500/20 border-sky-400 text-white shadow-lg shadow-sky-500/10 ring-1 ring-sky-400/50'
                              : isUnlocked
                              ? 'bg-slate-950/60 border-white/5 text-slate-300 hover:border-white/20 hover:bg-white/5'
                              : 'bg-slate-950/20 border-white/5 text-slate-600 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <span className="text-xl shrink-0 mt-0.5">{preset.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <div className={`font-bold text-xs ${isSelected ? 'text-white' : isUnlocked ? 'text-slate-200' : 'text-slate-500'}`}>
                                {preset.title}
                              </div>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${
                                  isSelected
                                    ? 'bg-sky-400 text-slate-950'
                                    : isUnlocked
                                    ? 'bg-white/10 text-slate-400'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}
                              >
                                {isUnlocked ? preset.badge : `Min ${preset.minM2}m²`}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                              {preset.desc}
                            </div>
                            {isUnlocked && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {preset.features.map((feat, idx) => (
                                  <span key={idx} className="text-[9px] bg-sky-950/60 text-sky-300/80 px-1.5 py-0.5 rounded border border-sky-800/40">
                                    {feat}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Estrategia de Emplazamiento de Dormitorios */}
                {state.layoutPreset !== 'open_loft' && (
                  <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">
                        Estrategia de Emplazamiento
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {state.presetParams.placementStrategy === 'rear' ? 'Fondo (Clásica)' : state.presetParams.placementStrategy === 'split_wings' ? 'Extremos Opuestos' : 'Costado Lateral'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'rear', title: 'Al Fondo', desc: 'Día al frente / Noche atrás', icon: '⬇️' },
                        { id: 'split_wings', title: 'Extremos', desc: 'Suites en alas opuestas', icon: '↔️' },
                        { id: 'side', title: 'Costado', desc: 'Banda lateral continua', icon: '➡️' },
                      ].map((strat) => {
                        const isCurrent = (state.presetParams.placementStrategy || 'rear') === strat.id;
                        return (
                          <button
                            key={strat.id}
                            onClick={() => state.setPresetParams({ placementStrategy: strat.id as BedroomPlacementStrategy })}
                            className={`p-2.5 rounded-lg border text-center transition-all ${
                              isCurrent
                                ? 'bg-sky-500/20 border-sky-400 text-white shadow ring-1 ring-sky-400/40'
                                : 'bg-slate-950/60 border-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200'
                            }`}
                          >
                            <div className="text-base mb-0.5">{strat.icon}</div>
                            <div className="font-bold text-[11px] text-white">{strat.title}</div>
                            <div className="text-[9px] text-slate-400 mt-0.5">{strat.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Espejado / Orientación Solar del Terreno */}
                {state.layoutPreset !== 'open_loft' && (
                  <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">
                        Orientación y Luz Solar
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Invertir dormitorios y baños
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => state.setPresetParams({ mirrorX: !state.presetParams.mirrorX })}
                        className={`p-2.5 rounded-lg border flex items-center justify-center gap-2 text-xs transition-all ${
                          state.presetParams.mirrorX
                            ? 'bg-sky-500/20 border-sky-400 text-white shadow'
                            : 'bg-slate-950/60 border-white/5 text-slate-300 hover:border-white/20'
                        }`}
                      >
                        <FlipHorizontal className="w-4 h-4 text-sky-400" />
                        <span className="font-bold">Invertir Eje X (Izq/Der)</span>
                      </button>

                      <button
                        onClick={() => state.setPresetParams({ mirrorZ: !state.presetParams.mirrorZ })}
                        className={`p-2.5 rounded-lg border flex items-center justify-center gap-2 text-xs transition-all ${
                          state.presetParams.mirrorZ
                            ? 'bg-sky-500/20 border-sky-400 text-white shadow'
                            : 'bg-slate-950/60 border-white/5 text-slate-300 hover:border-white/20'
                        }`}
                      >
                        <FlipVertical className="w-4 h-4 text-sky-400" />
                        <span className="font-bold">Invertir Eje Z (Frente/Fondo)</span>
                      </button>
                    </div>

                    <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-950/40 border border-white/5 cursor-pointer hover:border-white/15">
                      <input
                        type="checkbox"
                        checked={state.presetParams.separateKitchen || false}
                        onChange={(e) => state.setPresetParams({ separateKitchen: e.target.checked })}
                        className="rounded accent-sky-500 w-4 h-4"
                      />
                      <div>
                        <span className="text-xs font-bold text-white block">Tabique Divisorio para Cocina Cerrada</span>
                        <span className="text-[10px] text-slate-400 block">Añade muro y puerta corredera pocket para aislar olores</span>
                      </div>
                    </label>
                  </div>
                )}

                {/* Zonas y Recintos Calculados */}
                {state.layoutPreset !== 'open_loft' && (
                  <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 space-y-3">
                    <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">
                      Recintos Interiores ({getInteriorZones(state.layoutPreset, state.dimensions, state.presetParams).length})
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {getInteriorZones(state.layoutPreset, state.dimensions, state.presetParams).map((zone) => (
                        <div
                          key={zone.id}
                          className="p-2.5 rounded-lg border bg-slate-950/60"
                          style={{ borderColor: `${zone.color}40` }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: zone.color }} />
                            <span className="font-bold text-white text-[11px] truncate">{zone.name}</span>
                          </div>
                          <div className="mt-1 flex items-baseline justify-between font-mono">
                            <span className="text-[10px] text-slate-400">Área Útil</span>
                            <span className="font-bold text-xs" style={{ color: zone.color }}>
                              {zone.areaM2.toFixed(1)} m²
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ajustes Paramétricos de Distribución */}
                {state.layoutPreset !== 'open_loft' && (
                  <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 space-y-3">
                    <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">
                      Ajuste Fino de Tabiques
                    </span>
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>Profundidad Zona Dormitorios:</span>
                        <span className="font-mono font-bold text-sky-400">
                          {state.presetParams.bedroomDepthPercent}% ({(state.dimensions.length * (state.presetParams.bedroomDepthPercent / 100) / 100).toFixed(2)} m)
                        </span>
                      </div>
                      <input
                        type="range"
                        min="30"
                        max="65"
                        step="1"
                        value={state.presetParams.bedroomDepthPercent}
                        onChange={(e) => state.setPresetParams({ bedroomDepthPercent: parseFloat(e.target.value) })}
                        className="w-full accent-sky-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>Ancho de Baño:</span>
                        <span className="font-mono font-bold text-sky-400">
                          {state.presetParams.bathWidthPercent}% ({(state.dimensions.width * (state.presetParams.bathWidthPercent / 100) / 100).toFixed(2)} m)
                        </span>
                      </div>
                      <input
                        type="range"
                        min="25"
                        max="50"
                        step="1"
                        value={state.presetParams.bathWidthPercent}
                        onChange={(e) => state.setPresetParams({ bathWidthPercent: parseFloat(e.target.value) })}
                        className="w-full accent-sky-500"
                      />
                    </div>
                    {state.layoutPreset === '2bed_1bath' && (
                      <div>
                        <div className="flex justify-between text-xs text-slate-300 mb-1">
                          <span>Proporción Dormitorio 1 / 2:</span>
                          <span className="font-mono font-bold text-sky-400">
                            {state.presetParams.secondaryBedWidthPercent}% / {100 - state.presetParams.secondaryBedWidthPercent}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="35"
                          max="65"
                          step="1"
                          value={state.presetParams.secondaryBedWidthPercent}
                          onChange={(e) => state.setPresetParams({ secondaryBedWidthPercent: parseFloat(e.target.value) })}
                          className="w-full accent-sky-500"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Muros Interiores Detalle */}
                <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Muros y Tabiques ({state.interiorWalls.filter(w => w.visible).length})
                    </span>
                  </div>

                  <div className="space-y-2">
                    {state.interiorWalls.length === 0 ? (
                      <div className="text-xs text-slate-500 text-center py-3 bg-slate-950/40 rounded-lg">
                        No hay tabiquería interior activa (Espacio Loft).
                      </div>
                    ) : (
                      state.interiorWalls.map((wall) => {
                        const lengthCm = Math.round(
                          Math.hypot(wall.endX - wall.startX, wall.endZ - wall.startZ)
                        );
                        return (
                          <div
                            key={wall.id}
                            className={`p-2.5 rounded-lg border text-xs transition-all ${
                              wall.visible
                                ? 'bg-slate-950/80 border-white/10'
                                : 'bg-slate-950/30 border-white/5 opacity-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-bold text-white">{wall.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  L: {(lengthCm / 100).toFixed(2)}m | SIP {wall.thicknessMm}mm |{' '}
                                  {wall.openings.length} {wall.openings.length === 1 ? 'puerta' : 'puertas'}
                                </div>
                              </div>
                              <button
                                onClick={() => state.toggleInteriorWall(wall.id)}
                                className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                                  wall.visible
                                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                    : 'bg-white/5 text-slate-500 border border-white/5'
                                }`}
                              >
                                {wall.visible ? 'Visible' : 'Oculto'}
                              </button>
                            </div>

                            {wall.openings.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                                {wall.openings.map((op) => (
                                  <div
                                    key={op.id}
                                    className="flex items-center justify-between text-[10px] bg-white/5 px-2 py-1 rounded text-slate-300 font-mono"
                                  >
                                    <span className="text-amber-400">
                                      🚪 Puerta {op.width}x{op.height} cm (Offset: {op.offsetAlongWall} cm)
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. TAB GESTIÓN DE VANOS */}
            {activeTab === 'openings' && (
              <div className="space-y-4">
                {/* Resumen de Vanos */}
                <div className="bg-white/5 border border-white/5 rounded-xl p-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-950/60 p-2 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Total Vanos</span>
                    <span className="font-mono font-bold text-sky-400 text-sm">{state.openings.length} un</span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Ventanas</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {state.openings.filter((o) => o.type === 'window').length} un
                    </span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Superficie</span>
                    <span className="font-mono font-bold text-amber-400 text-sm">
                      {(
                        state.openings.reduce((acc, o) => acc + (o.width * o.height) / 10000, 0)
                      ).toFixed(1)}{' '}
                      m²
                    </span>
                  </div>
                </div>

                {/* Lista de Vanos con Modo Edición */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Vanos Configurados ({state.openings.length})
                    </span>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {state.openings.length === 0 ? (
                      <div className="text-xs text-slate-500 text-center py-4 bg-white/5 rounded-xl">
                        No hay vanos en los muros. Agrega uno abajo.
                      </div>
                    ) : (
                      state.openings.map((op) => {
                        const isEditing = editingOpeningId === op.id;
                        return (
                          <div
                            key={op.id}
                            className={`p-3 rounded-xl border transition-all ${
                              isEditing
                                ? 'bg-sky-950/40 border-sky-500/50 shadow-md shadow-sky-500/10'
                                : 'bg-white/5 border-white/5 hover:border-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${
                                    op.type === 'door'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                  }`}
                                >
                                  {op.code}
                                </span>
                                <div>
                                  <div className="font-bold text-white leading-tight">{op.name}</div>
                                  <div className="text-[10px] text-slate-400">
                                    {op.width}x{op.height} cm | Antepecho: {op.sillHeight} cm | Offset: {op.offsetAlongWall || 50} cm
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setEditingOpeningId(isEditing ? null : op.id)}
                                  className={`p-1.5 rounded-lg transition-all ${
                                    isEditing
                                      ? 'bg-sky-500 text-white'
                                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                                  }`}
                                  title={isEditing ? 'Cerrar edición' : 'Editar vano'}
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => {
                                    if (editingOpeningId === op.id) setEditingOpeningId(null);
                                    state.removeOpening(op.id);
                                  }}
                                  className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all"
                                  title="Eliminar vano"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>

                            {/* Panel Desplegable de Edición Inmediata */}
                            {isEditing && (() => {
                              const wallLen = getWallLengthCm(op.assignedWall, state.dimensions);
                              const maxH = Math.max(40, state.dimensions.eaveHeight - (op.type === 'door' ? 0 : op.sillHeight) - 15);
                              const maxW = Math.max(40, wallLen - 40);
                              const maxSill = Math.max(0, state.dimensions.eaveHeight - op.height - 15);
                              const maxPos = Math.max(20, wallLen - op.width - 20);

                              return (
                                <div className="mt-3 pt-3 border-t border-white/10 space-y-2.5 text-xs">
                                  <div>
                                    <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                                      <span>Muro Asignado:</span>
                                      <span className="text-[10px] text-slate-400 font-mono">Largo: {wallLen} cm</span>
                                    </div>
                                    <select
                                      value={op.assignedWall}
                                      onChange={(e) =>
                                        state.updateOpening(op.id, { assignedWall: e.target.value as any })
                                      }
                                      className="w-full bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                                    >
                                      <option value="front">Muro Frontal (+Z)</option>
                                      <option value="back">Muro Trasero (-Z)</option>
                                      <option value="left">Muro Lateral Izquierdo (-X)</option>
                                      <option value="right">Muro Lateral Derecho (+X)</option>
                                    </select>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                                        <span>Ancho:</span>
                                        <span className="font-mono text-sky-400 font-bold">{op.width} cm</span>
                                      </div>
                                      <input
                                        type="range"
                                        min="40"
                                        max={maxW}
                                        step="5"
                                        value={op.width}
                                        onChange={(e) =>
                                          state.updateOpening(op.id, { width: parseInt(e.target.value) || 40 })
                                        }
                                        className="w-full accent-sky-500"
                                      />
                                    </div>
                                    <div>
                                      <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                                        <span>Alto:</span>
                                        <span className="font-mono text-sky-400 font-bold">{op.height} cm</span>
                                      </div>
                                      <input
                                        type="range"
                                        min="40"
                                        max={maxH}
                                        step="5"
                                        value={op.height}
                                        onChange={(e) =>
                                          state.updateOpening(op.id, { height: parseInt(e.target.value) || 40 })
                                        }
                                        className="w-full accent-sky-500"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                                        <span>Antepecho:</span>
                                        <span className="font-mono text-sky-400 font-bold">{op.sillHeight} cm</span>
                                      </div>
                                      <input
                                        type="range"
                                        min="0"
                                        max={maxSill}
                                        step="5"
                                        disabled={op.type === 'door'}
                                        value={op.sillHeight}
                                        onChange={(e) =>
                                          state.updateOpening(op.id, { sillHeight: parseInt(e.target.value) || 0 })
                                        }
                                        className="w-full accent-sky-500 disabled:opacity-30"
                                      />
                                    </div>
                                    <div>
                                      <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                                        <span>Posición en Muro:</span>
                                        <span className="font-mono text-sky-400 font-bold">
                                          {op.offsetAlongWall || 20} cm
                                        </span>
                                      </div>
                                      <input
                                        type="range"
                                        min="20"
                                        max={maxPos}
                                        step="5"
                                        value={op.offsetAlongWall || 20}
                                        onChange={(e) =>
                                          state.updateOpening(op.id, {
                                            offsetAlongWall: parseInt(e.target.value) || 20,
                                          })
                                        }
                                        className="w-full accent-sky-500"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] text-slate-400 block mb-1">Marco</label>
                                      <select
                                        value={op.frameMaterial || 'pvc_negro'}
                                        onChange={(e) =>
                                          state.updateOpening(op.id, { frameMaterial: e.target.value as any })
                                        }
                                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                                      >
                                        <option value="pvc_negro">PVC Negro</option>
                                        <option value="pvc_folio_madera">PVC Madera</option>
                                        <option value="aluminio_rtt">Aluminio RPT</option>
                                        <option value="madera_lenga">Madera Lenga</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-slate-400 block mb-1">Vidriado</label>
                                      <select
                                        value={op.glazingType || 'termopanel_dvp'}
                                        onChange={(e) =>
                                          state.updateOpening(op.id, { glazingType: e.target.value as any })
                                        }
                                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                                      >
                                        <option value="termopanel_dvp">Termopanel DVP</option>
                                        <option value="simple_vidrio">Simple Vidrio 5mm</option>
                                      </select>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => setEditingOpeningId(null)}
                                    className="w-full py-1.5 bg-sky-600/80 hover:bg-sky-600 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1"
                                  >
                                    <Check size={13} />
                                    <span>Listo / Guardar Ajustes</span>
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Formulario Agregar Vano con Presets */}
                <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1">
                      <Plus size={14} />
                      Insertar Nuevo Vano
                    </span>
                  </div>

                  {/* Presets Rápidos */}
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1.5 font-semibold">
                      Plantillas Rápidas:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          applyPreset({
                            type: 'window',
                            name: 'Ventana Termopanel 120x120',
                            width: 120,
                            height: 120,
                            sill: 90,
                            frame: 'pvc_negro',
                            glazing: 'termopanel_dvp',
                          })
                        }
                        className="px-2 py-1 bg-slate-900/80 hover:bg-sky-600 border border-white/10 rounded-lg text-[10px] text-slate-200 transition-all"
                      >
                        🪟 DVP 120x120
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          applyPreset({
                            type: 'window',
                            name: 'Ventana Corredera 200x200',
                            width: 200,
                            height: 200,
                            sill: 40,
                            frame: 'pvc_negro',
                            glazing: 'termopanel_dvp',
                          })
                        }
                        className="px-2 py-1 bg-slate-900/80 hover:bg-sky-600 border border-white/10 rounded-lg text-[10px] text-slate-200 transition-all"
                      >
                        🪟 Corredera 200x200
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          applyPreset({
                            type: 'door',
                            name: 'Puerta Principal Lenga 90x204',
                            width: 90,
                            height: 204,
                            sill: 0,
                            frame: 'madera_lenga',
                            glazing: 'simple_vidrio',
                          })
                        }
                        className="px-2 py-1 bg-slate-900/80 hover:bg-amber-600 border border-white/10 rounded-lg text-[10px] text-slate-200 transition-all"
                      >
                        🚪 Puerta Lenga 90x204
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          applyPreset({
                            type: 'window',
                            name: 'Ventana Baño Proyectante 60x60',
                            width: 60,
                            height: 60,
                            sill: 150,
                            frame: 'pvc_negro',
                            glazing: 'termopanel_dvp',
                          })
                        }
                        className="px-2 py-1 bg-slate-900/80 hover:bg-sky-600 border border-white/10 rounded-lg text-[10px] text-slate-200 transition-all"
                      >
                        🪟 Baño 60x60
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Tipo</label>
                      <select
                        value={newOpeningType}
                        onChange={(e) => {
                          const val = e.target.value as 'door' | 'window';
                          setNewOpeningType(val);
                          if (val === 'door') setNewOpeningSill(0);
                        }}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                      >
                        <option value="window">Ventana</option>
                        <option value="door">Puerta</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Muro Asignado</label>
                      <select
                        value={newOpeningWall}
                        onChange={(e) => setNewOpeningWall(e.target.value as any)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                      >
                        <option value="front">Muro Frontal (+Z)</option>
                        <option value="back">Muro Trasero (-Z)</option>
                        <option value="left">Muro Lateral Izquierdo (-X)</option>
                        <option value="right">Muro Lateral Derecho (+X)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Ancho (cm)</label>
                      <input
                        type="number"
                        value={newOpeningWidth}
                        onChange={(e) => setNewOpeningWidth(parseInt(e.target.value) || 40)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Alto (cm)</label>
                      <input
                        type="number"
                        value={newOpeningHeight}
                        onChange={(e) => setNewOpeningHeight(parseInt(e.target.value) || 40)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Antepecho</label>
                      <input
                        type="number"
                        disabled={newOpeningType === 'door'}
                        value={newOpeningType === 'door' ? 0 : newOpeningSill}
                        onChange={(e) => setNewOpeningSill(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs text-white disabled:opacity-40"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Offset (cm)</label>
                      <input
                        type="number"
                        value={newOpeningOffset}
                        onChange={(e) => setNewOpeningOffset(parseInt(e.target.value) || 10)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Marco</label>
                      <select
                        value={newOpeningFrame}
                        onChange={(e) => setNewOpeningFrame(e.target.value as any)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                      >
                        <option value="pvc_negro">PVC Negro</option>
                        <option value="pvc_folio_madera">PVC Madera</option>
                        <option value="aluminio_rtt">Aluminio RPT</option>
                        <option value="madera_lenga">Madera Lenga</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Vidriado</label>
                      <select
                        value={newOpeningGlazing}
                        onChange={(e) => setNewOpeningGlazing(e.target.value as any)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                      >
                        <option value="termopanel_dvp">DVP</option>
                        <option value="simple_vidrio">Simple</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleAddOpening}
                    className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-600/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus size={15} />
                    <span>Insertar Vano en Muro SIP</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3. TAB EETT Y MATERIALES */}
            {activeTab === 'materials' && (
              <div className="space-y-4">
                {/* Panel de Configuración Técnica de Paneles SIP */}
                <div className="bg-sky-950/40 border border-sky-500/30 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck size={15} />
                      Configuración Técnica SIP & EETT
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-sky-500/20 text-sky-300 rounded font-bold">
                      NTA NER-1038 / LP
                    </span>
                  </div>

                  {/* Núcleo Aislante */}
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Tipo de Núcleo Aislante:</label>
                    <select
                      value={state.coreType}
                      onChange={(e) => state.setCoreType(e.target.value as SipCoreType)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-white"
                    >
                      <option value="eps_15kg">EPS Estándar (15 kg/m³ - R-3.8/in)</option>
                      <option value="neopor_18kg">Neopor® Grafito (18 kg/m³ - R-4.7/in, +20% R-Value)</option>
                      <option value="xps_25kg">XPS Extruido (25 kg/m³ - R-5.0/in, Impermeable)</option>
                      <option value="pur_pir_40kg">PUR/PIR Celda Cerrada (40 kg/m³ - R-5.7/in, Máxima Aislación)</option>
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                      {SIP_CORE_SPECS[state.coreType]?.description}
                    </p>
                  </div>

                  {/* Espesores de Paneles */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-300 block mb-1">Muros Ext.</label>
                      <select
                        value={state.wallThicknessMm}
                        onChange={(e) => state.setWallThicknessMm(parseInt(e.target.value) as SipWallThickness)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                      >
                        <option value={75}>75 mm</option>
                        <option value={90}>90 mm</option>
                        <option value={114}>114 mm</option>
                        <option value={162}>162 mm</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-300 block mb-1">Cubierta Techo</label>
                      <select
                        value={state.roofThicknessMm}
                        onChange={(e) => state.setRoofThicknessMm(parseInt(e.target.value) as SipRoofThickness)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                      >
                        <option value={114}>114 mm</option>
                        <option value={162}>162 mm</option>
                        <option value={210}>210 mm</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-300 block mb-1">Losa Piso</label>
                      <select
                        value={state.floorThicknessMm}
                        onChange={(e) => state.setFloorThicknessMm(parseInt(e.target.value) as SipFloorThickness)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                      >
                        <option value={90}>90 mm</option>
                        <option value={114}>114 mm</option>
                        <option value={162}>162 mm</option>
                        <option value={210}>210 mm</option>
                      </select>
                    </div>
                  </div>

                  {/* Resumen de Eficiencia Térmica */}
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Transmitancia Térmica Muros (K):</span>
                      <span className="font-mono text-sky-400 font-bold">{metrics.coreSpec.thermalK_Wm2K_114mm} W/m²K</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">R-Value Cubierta Techo:</span>
                      <span className="font-mono text-amber-400 font-bold">
                        R-{Math.round(metrics.coreSpec.rValuePerInch * (state.roofThicknessMm / 25.4))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tablillas Unión (Splines OSB 11.1mm):</span>
                      <span className="font-mono text-emerald-400 font-bold">{metrics.totalSurfaceSplinesOSB} tiras</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tornillos Fijación CRS 6x1 1/4":</span>
                      <span className="font-mono text-slate-200 font-bold">{metrics.tornillosCRSQty} unidades</span>
                    </div>
                  </div>
                </div>

                {/* Matriz de Criterios Constructivos & Reglas de Montaje */}
                <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 space-y-2.5">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    Criterios de Montaje & Reglas SIP
                  </span>
                  <div className="space-y-1.5 text-[11px] text-slate-300">
                    <div className="flex items-start gap-2 bg-slate-900/60 p-2 rounded-lg border border-white/5">
                      <span className="text-emerald-400 font-bold shrink-0">✓</span>
                      <div>
                        <strong className="text-white">Vanos a Esquinas (≥ 30 cm):</strong> El vano se ubica a mínimo 30 cm de la esquina para garantizar solidez estructural.
                      </div>
                    </div>
                    <div className="flex items-start gap-2 bg-slate-900/60 p-2 rounded-lg border border-white/5">
                      <span className="text-emerald-400 font-bold shrink-0">✓</span>
                      <div>
                        <strong className="text-white">Luz Máxima de Ventana (≤ 2.44 m):</strong> Vanos estándar sin viga compuesta no exceden 2.44m con dintel SIP ≥ 30 cm.
                      </div>
                    </div>
                    <div className="flex items-start gap-2 bg-slate-900/60 p-2 rounded-lg border border-white/5">
                      <span className="text-emerald-400 font-bold shrink-0">✓</span>
                      <div>
                        <strong className="text-white">Traslape Solera Superior (≥ 30 cm):</strong> Doble solera de amarre desfasada ≥ 30 cm respecto a uniones verticales.
                      </div>
                    </div>
                    <div className="flex items-start gap-2 bg-slate-900/60 p-2 rounded-lg border border-white/5">
                      <span className="text-emerald-400 font-bold shrink-0">✓</span>
                      <div>
                        <strong className="text-white">Tolerancia de Dilatación:</strong> Se respetan 3 a 4 mm de dilatación en empalmes perimetrales.
                      </div>
                    </div>
                    <div className="flex items-start gap-2 bg-slate-900/60 p-2 rounded-lg border border-white/5">
                      <span className="text-emerald-400 font-bold shrink-0">✓</span>
                      <div>
                        <strong className="text-white">Hermeticidad Blower Door:</strong> Sellos de poliuretano continuo en todas las almas EPS (&lt; 1.0 ACH50).
                      </div>
                    </div>
                    <div className="flex items-start gap-2 bg-slate-900/60 p-2 rounded-lg border border-white/5">
                      <span className="text-emerald-400 font-bold shrink-0">✓</span>
                      <div>
                        <strong className="text-white">Regla MEP Estricta:</strong> Prohibición de ranurar tableros OSB; canalización por perforaciones internas del alma EPS.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                      Fundaciones & Estructura Base
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-sky-500/20 text-sky-300 rounded font-bold">
                      NCh 1198 / EETT
                    </span>
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1.5">Tipo de Fundación:</label>
                    <select
                      value={state.foundationType}
                      onChange={(e) => state.setFoundationType(e.target.value as FoundationType)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2 text-xs text-white"
                    >
                      <option value="pilotes_madera">Pilotes Pino Impregnado CCA 5x5" + Vigas Maestras</option>
                      <option value="radier_sobrecimiento">Radier sobre Cimientos y Sobrecimientos Continuos (Suelos Firmes, elev. 20-40cm)</option>
                      <option value="platea_fundacion">Platea de Cimentación / Losa Flotante Armada (Suelos Blandos e=15-20cm)</option>
                    </select>

                    {/* Resumen dinámico de cubicación de fundaciones */}
                    <div className="mt-2.5 p-2 bg-slate-900/90 rounded-lg border border-white/5 space-y-1 text-[11px] font-mono">
                      {state.foundationType === 'pilotes_madera' ? (
                        <>
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-400">Total Pilotes Pino CCA 5x5":</span>
                            <span className="text-amber-400 font-bold">
                              {metrics.pilaresFundacionCount} unid. ({metrics.axesCountX} ejes en X × {metrics.pilesCountZ} apoyos en Z)
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-400">Vigas Maestras 2x8" (3.20m):</span>
                            <span className="text-sky-400 font-bold">{metrics.vigasMaestras32Count ?? metrics.vigasMaestras40Count} tiras ({metrics.vigasMaestras2x8LinM} m. lin.)</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-400">Dados Hormigón G20 (45x45x50):</span>
                            <span className="text-emerald-400 font-bold">{metrics.hormigonG20M3} m³</span>
                          </div>
                        </>
                      ) : state.foundationType === 'radier_sobrecimiento' ? (
                        <>
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-400">Hormigón H-20 Cimientos/Sobrecimiento:</span>
                            <span className="text-amber-400 font-bold">{metrics.hormigonG20M3} m³</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-400">Malla Electrosoldada C-139:</span>
                            <span className="text-sky-400 font-bold">{metrics.mallaAcmaPlanchas} planchas</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-400">Pernos Anclaje 1/2" x 5 1/2":</span>
                            <span className="text-emerald-400 font-bold">{metrics.pernosAnclaje12Qty} unidades</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-400">Hormigón H-25 Platea Armada:</span>
                            <span className="text-amber-400 font-bold">{metrics.hormigonG20M3} m³</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-400">Doble Malla C-139 (Sup/Inf):</span>
                            <span className="text-sky-400 font-bold">{metrics.mallaAcmaPlanchas} planchas</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-400">Espárragos Químicos Anclaje:</span>
                            <span className="text-emerald-400 font-bold">{metrics.pernosAnclaje12Qty} unidades</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 space-y-3">
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">
                    Envolvente y Fachadas
                  </span>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1.5">Revestimiento Exterior:</label>
                    <select
                      value={state.exteriorCladding}
                      onChange={(e) => state.setExteriorCladding(e.target.value as ExteriorCladding)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2 text-xs text-white"
                    >
                      <option value="panel_sip_visto">Panel SIP OSB Visto (Fabricación Cruda)</option>
                      <option value="zincalum_negro">Zincalum Negro Mate Continuo</option>
                      <option value="madera_tinglada">Madera Tinglada Pino Termotratado</option>
                      <option value="fibrocemento_gris">Fibrocemento Gris Grafito</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1.5">Cubierta de Techo:</label>
                    <select
                      value={state.roofCladding}
                      onChange={(e) => state.setRoofCladding(e.target.value as RoofCladding)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2 text-xs text-white"
                    >
                      <option value="panel_sip_visto">Panel SIP 210 mm Visto</option>
                      <option value="zinc_ca8_negro">Planchas Zinc CA-8 Negro Carbón</option>
                      <option value="teja_asfaltica_negra">Teja Asfáltica Negra</option>
                    </select>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 space-y-3">
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">
                    Terminaciones Interiores
                  </span>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1.5">Cielo Interior:</label>
                    <select
                      value={state.interiorCeiling}
                      onChange={(e) => state.setInteriorCeiling(e.target.value as InteriorCeiling)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2 text-xs text-white"
                    >
                      <option value="entablado_pino">Entablado Pino Finger-Joint</option>
                      <option value="yeso_carton_blanco">Yeso-Cartón Volcanita ST Blanco</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1.5">Pavimento:</label>
                    <select
                      value={state.flooringType}
                      onChange={(e) => state.setFlooringType(e.target.value as FlooringType)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2 text-xs text-white"
                    >
                      <option value="vinilico_spc">Piso Vinílico SPC Madera Roble</option>
                      <option value="porcelanato">Porcelanato 60x60 Gris Claro</option>
                      <option value="radier_pulido">Radier Hormigón Pulido</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 4. TAB REDES MEP */}
            {activeTab === 'mep' && (
              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 space-y-3">
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap size={14} className="text-amber-400" />
                    Red Eléctrica & Tablero TDA
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Ductos Conduit PVC</span>
                      <span className="font-mono font-bold text-amber-400">
                        {state.mepNetwork.electricalConduitLinM} m. lin.
                      </span>
                    </div>
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Capacidad TDA</span>
                      <span className="font-mono font-bold text-amber-400">
                        {state.mepNetwork.tdaPanelCapacityAmps} A
                      </span>
                    </div>
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Enchufes Dobles</span>
                      <span className="font-mono font-bold text-white">
                        {state.mepNetwork.electricalOutletsQty} un
                      </span>
                    </div>
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Puntos Iluminación</span>
                      <span className="font-mono font-bold text-white">
                        {state.mepNetwork.lightingPointsQty} un
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 space-y-3">
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Droplets size={14} className="text-blue-400" />
                    Red Sanitaria & Agua
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Agua Fría (PPR 20mm)</span>
                      <span className="font-mono font-bold text-blue-400">
                        {state.mepNetwork.waterColdPprLinM} m. lin.
                      </span>
                    </div>
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Agua Caliente (PEX)</span>
                      <span className="font-mono font-bold text-red-400">
                        {state.mepNetwork.waterHotPexLinM} m. lin.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 space-y-3">
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Flame size={14} className="text-amber-500" />
                    Red de Gas GLP
                  </span>
                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5 text-xs">
                    <span className="text-[10px] text-slate-400 block">Tubería Cobre Tipo L</span>
                    <span className="font-mono font-bold text-amber-500">
                      {state.mepNetwork.gasCopperLinM} m. lin. | {state.mepNetwork.gasTerminalPoints} Puntos
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 5. TAB CAPAS BIM */}
            {activeTab === 'layers' && (
              <div className="space-y-2">
                {/* Control de Cotas Paramétricas y Densidad */}
                <div className="bg-slate-950/60 rounded-xl p-3 border border-sky-500/20 mb-3 bg-gradient-to-r from-sky-950/20 to-transparent">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                        <Ruler size={14} className={state.showDimensions ? 'text-sky-400' : 'text-slate-400'} />
                        Cotas Arquitectónicas BIM
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Gradúa la cantidad y detalle de cotas en pantalla
                      </p>
                    </div>
                    <button
                      onClick={() => state.toggleDimensions()}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 ${
                        state.showDimensions
                          ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/20'
                          : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                      }`}
                    >
                      {state.showDimensions ? 'Activadas' : 'Desactivadas'}
                    </button>
                  </div>

                  {state.showDimensions && (
                    <div className="pt-2 border-t border-white/5 space-y-1.5">
                      <div className="flex justify-between text-[10px] font-mono text-slate-300">
                        <span>Intensidad:</span>
                        <span className="text-sky-400 font-bold">Nivel {state.dimensionDetailLevel}/4</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="4"
                        step="1"
                        value={state.dimensionDetailLevel}
                        onChange={(e) => state.setDimensionDetailLevel(parseInt(e.target.value, 10))}
                        className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                      />
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { lvl: 1, label: 'L1 Base' },
                          { lvl: 2, label: 'L2 Ejes' },
                          { lvl: 3, label: 'L3 Vanos' },
                          { lvl: 4, label: 'L4 BIM' },
                        ].map((b) => (
                          <button
                            key={b.lvl}
                            onClick={() => state.setDimensionDetailLevel(b.lvl)}
                            className={`py-1 text-[9px] font-mono rounded border transition-all ${
                              state.dimensionDetailLevel === b.lvl
                                ? 'bg-sky-500/30 border-sky-400 text-sky-200 font-bold'
                                : 'bg-slate-900 border-white/5 text-slate-400'
                            }`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Control Radiografía X-Ray / Transparentar */}
                <div className="bg-slate-950/60 rounded-xl p-3 border border-sky-500/20 mb-3 bg-gradient-to-r from-sky-950/20 to-transparent">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                        <Eye size={14} className={state.isTransparent ? 'text-sky-400 animate-pulse' : 'text-slate-400'} />
                        Modo Transparente (Rayos X)
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Permite ver maderas interiores y armaduras de metal en cimientos
                      </p>
                    </div>
                    <button
                      onClick={() => state.toggleTransparent()}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 ${
                        state.isTransparent
                          ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/20'
                          : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                      }`}
                    >
                      {state.isTransparent ? 'Activado' : 'Activar'}
                    </button>
                  </div>
                </div>

                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Visibilidad de Elementos BIM
                </span>
                {[
                  { key: 'layerFoundations', label: 'Fundaciones (Pilotes / Radier G20)', icon: '🏗️' },
                  { key: 'layerFloorSip', label: 'Losa de Piso SIP 162 mm', icon: '🪵' },
                  { key: 'layerWallsSip', label: 'Muros Perimetrales SIP 114 mm', icon: '🧱' },
                  { key: 'layerInteriorWalls', label: 'Tabiquería Interior SIP 90 mm', icon: '🚪' },
                  { key: 'layerTimberStructure', label: 'Estructuración y Vigas de Madera', icon: '🌲' },
                  { key: 'layerRoofSip', label: 'Techumbre Panel SIP 210 mm', icon: '🏠' },
                  { key: 'layerCladding', label: 'Revestimientos y Terminaciones EETT', icon: '🎨' },
                  { key: 'layerWindowsDoors', label: 'Vanos (Puertas y Ventanas)', icon: '🪟' },
                  { key: 'layerElectricalMep', label: 'Red Eléctrica (Conduit PVC)', icon: '⚡' },
                  { key: 'layerSanitaryMep', label: 'Red Sanitaria (PPR / PEX)', icon: '💧' },
                  { key: 'layerGasMep', label: 'Red de Gas (Cobre)', icon: '🔥' },
                ].map((l) => (
                  <button
                    key={l.key}
                    onClick={() => state.toggleLayer(l.key as any)}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      (state as any)[l.key]
                        ? 'bg-sky-500/15 border-sky-500/30 text-white'
                        : 'bg-white/5 border-white/5 text-slate-500'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{l.icon}</span>
                      <span>{l.label}</span>
                    </span>
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border ${
                        (state as any)[l.key]
                          ? 'bg-sky-500 border-sky-400 text-white'
                          : 'border-white/20 bg-transparent'
                      }`}
                    >
                      {(state as any)[l.key] && <Check size={12} />}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* 6. TAB CUBICACIÓN Y BOM COMERCIAL */}
            {activeTab === 'bom' && (
              <div className="space-y-3">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-200">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <FileSpreadsheet size={14} />
                    Despiece y Escuadrías Comerciales
                  </div>
                  <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                    Maderas calculadas por piezas comerciales estándar (3.20m y 4.00m) considerando 8% de despunte y traslapes estructurales.
                  </p>
                </div>

                <div className="space-y-2">
                  {metrics.items.map((item, idx) => (
                    <div
                      key={`bom-item-${idx}`}
                      className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs space-y-1 hover:border-white/20 transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-white leading-tight">{item.item}</span>
                        <span className="text-sky-400 font-mono font-bold whitespace-nowrap ml-2">
                          $ {item.totalClp.toLocaleString('es-CL')}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 leading-snug">{item.descripcion}</div>
                      <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-white/5 mt-1">
                        <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-slate-300">
                          {item.cantidad} {item.unidad}
                        </span>
                        <span>{item.proveedor}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* FOOTER DEL SIDEBAR CON RESUMEN PRESUPUESTARIO */}
          <div className="p-4 border-t border-white/10 bg-slate-950/60 shrink-0">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
              <span>Presupuesto Estimado (Obra + EETT):</span>
            </div>
            <div className="text-xl font-black text-sky-400 font-mono">
              $ {metrics.totalPresupuestoClp.toLocaleString('es-CL')} CLP
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Valores netos calculados según lista de materiales PROSIP
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
