import React, { useState } from 'react';
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  Sparkles,
  Home,
  Building2,
  TreePine,
  ShieldCheck,
  Flame,
  Thermometer,
  Activity,
  SlidersHorizontal,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Check,
  ChevronRight,
  Maximize2,
  Play,
} from 'lucide-react';
import {
  useCltHouseStore,
  CLT_SPECS_CATALOG,
  CltPanelType,
  ChileanThermalZone,
  ConstructionSystemVariant,
} from '../store/cltHouseStore';
import { calculateCltHouseQuantities } from '../utils/cltCalculations';
import { exportCltHouseToExcel } from '../utils/cltExcelGenerator';
import { exportCltHouseToPdf } from '../utils/cltPdfGenerator';
import { CltScene } from '../components/clt/CltScene';
import { CltBlueprint2D } from '../components/clt/CltBlueprint2D';
import { SaveProjectModal } from '../components/common/SaveProjectModal';

export function CltConfigurator({ onNavigate }: { onNavigate: (route: 'home') => void }) {
  const state = useCltHouseStore();
  const bom = calculateCltHouseQuantities(state);

  const [activeTab, setActiveTab] = useState<
    'templates' | 'geometry' | 'clt_specs' | 'openings' | 'connections' | 'thermal' | 'assembly' | 'bom'
  >('templates');

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  // Formulario de nuevo vano
  const [newOpeningType, setNewOpeningType] = useState<'window' | 'door'>('window');
  const [newOpeningWallId, setNewOpeningWallId] = useState<string>(state.walls[0]?.id || 'w_front_s1');
  const [newOpeningWidth, setNewOpeningWidth] = useState(140);
  const [newOpeningHeight, setNewOpeningHeight] = useState(120);
  const [newOpeningSill, setNewOpeningSill] = useState(90);
  const [newOpeningOffset, setNewOpeningOffset] = useState(80);

  const handleAddOpening = () => {
    state.addOpening({
      type: newOpeningType,
      wallId: newOpeningWallId,
      storyLevel: state.activeStoryLevel,
      widthCm: newOpeningWidth,
      heightCm: newOpeningHeight,
      sillHeightCm: newOpeningType === 'door' ? 0 : newOpeningSill,
      offsetFromStartCm: newOpeningOffset,
      openingMethod: 'cut_out',
      frameMaterial: 'pvc_antracita',
      glazing: 'termopanel_dvp',
    });
  };

  return (
    <div className="flex h-screen w-screen bg-[#07090D] text-slate-100 font-sans overflow-hidden select-none">
      {/* 1. BARRA LATERAL IZQUIERDA: CONTROLES PARAMÉTRICOS */}
      <aside className="w-[440px] flex flex-col h-full bg-zinc-950 border-r border-white/10 z-20 shadow-2xl">
        {/* Header con botón Volver y Logo */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onNavigate('home')}
              className="p-2 bg-zinc-800 hover:bg-orange-500 hover:text-white rounded-xl transition-all text-slate-300 cursor-pointer"
              title="Volver al Menú Principal"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bellota text-xl font-bold lowercase text-orange-500">arquify</span>
                <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] font-bold rounded uppercase tracking-wider border border-orange-500/30">
                  CLT & GLT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate max-w-[240px]">
                {state.projectName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsSaveModalOpen(true)}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-slate-200 rounded-xl transition-all cursor-pointer"
              title="Guardar Proyecto en Nube / Local"
            >
              <Save size={16} />
            </button>
          </div>
        </div>

        {/* Pestañas de navegación */}
        <div className="flex border-b border-white/10 bg-zinc-900/40 p-1.5 overflow-x-auto gap-1 scrollbar-none text-xs">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'templates'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Building2 size={13} /> Modelos
          </button>
          <button
            onClick={() => setActiveTab('geometry')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'geometry'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <SlidersHorizontal size={13} /> Geometría
          </button>
          <button
            onClick={() => setActiveTab('clt_specs')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'clt_specs'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <TreePine size={13} /> Madera
          </button>
          <button
            onClick={() => setActiveTab('openings')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'openings'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Vanos
          </button>
          <button
            onClick={() => setActiveTab('connections')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'connections'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldCheck size={13} /> Herrajes
          </button>
          <button
            onClick={() => setActiveTab('thermal')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'thermal'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Thermometer size={13} /> NCh853
          </button>
          <button
            onClick={() => setActiveTab('assembly')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'assembly'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Montaje
          </button>
          <button
            onClick={() => setActiveTab('bom')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'bom'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Costos & CO₂
          </button>
        </div>

        {/* Contenido scrolleable del panel */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm text-slate-300 scrollbar-thin scrollbar-thumb-zinc-800">
          {/* TAB 1: PLANTILLAS Y PROYECTOS PRECONFIGURADOS */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-orange-400">
                Casos de Estudio & Ejemplos Reales
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Selecciona uno de los proyectos preconfigurados extraídos directamente de la Guía Niuform y el Manual CIM UC - MINVU para visualizar o modificar paramétricamente.
              </p>

              {/* Preset 1: Módulo Niuform 2P */}
              <div
                onClick={() => state.loadPreset('casa_niuform_2p')}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  state.buildingType === 'casa_2p'
                    ? 'bg-orange-500/15 border-orange-500 ring-1 ring-orange-500/50'
                    : 'bg-zinc-900 border-white/10 hover:border-orange-500/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm">Módulo Capacitación Niuform (2 Pisos)</span>
                  <span className="px-2 py-0.5 bg-orange-500/20 text-orange-300 text-[10px] font-bold rounded">
                    Guía Pág. 30-32
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Edificación de 2 niveles (4.8 x 6.0 m) con muros en CLT 90s3, entrepiso en CLT 150s5, vigas maestras GLT y cubierta inclinada con alero.
                </p>
                <div className="flex items-center gap-3 text-[11px] font-mono text-orange-400">
                  <span>2 Pisos</span>
                  <span>•</span>
                  <span>57.6 m²</span>
                  <span>•</span>
                  <span>CLT 90mm + GLT</span>
                </div>
              </div>

              {/* Preset 2: Edificio DS49 MINVU 3P */}
              <div
                onClick={() => state.loadPreset('edificio_ds49_3p')}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  state.buildingType === 'edificio_3p'
                    ? 'bg-orange-500/15 border-orange-500 ring-1 ring-orange-500/50'
                    : 'bg-zinc-900 border-white/10 hover:border-orange-500/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm">Edificio Residencial DS49 (3 Pisos)</span>
                  <span className="px-2 py-0.5 bg-orange-500/20 text-orange-300 text-[10px] font-bold rounded">
                    CIM UC / MINVU
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Edificio de vivienda social DS49 (12.0 x 16.0 m) con 4 departamentos por planta, muros multi-panel segmentados, vigas GLT en núcleo y diseño elástico NCh433 (R=2).
                </p>
                <div className="flex items-center gap-3 text-[11px] font-mono text-orange-400">
                  <span>3 Pisos</span>
                  <span>•</span>
                  <span>576 m²</span>
                  <span>•</span>
                  <span>HHDQ14 + ABR255</span>
                </div>
              </div>

              {/* Preset 3: Casa Unifamiliar CLT & GLT 140m² */}
              <div
                onClick={() => state.loadPreset('casa_glt_clt_140')}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  state.buildingType === 'casa_140m2'
                    ? 'bg-orange-500/15 border-orange-500 ring-1 ring-orange-500/50'
                    : 'bg-zinc-900 border-white/10 hover:border-orange-500/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm">Casa Unifamiliar CLT + GLT (140 m²)</span>
                  <span className="px-2 py-0.5 bg-orange-500/20 text-orange-300 text-[10px] font-bold rounded">
                    Híbrido
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Pórticos de columnas y vigas GLT vistas en doble altura combinadas con muros de corte CLT en 100 mm y amplios ventanales termopanel.
                </p>
                <div className="flex items-center gap-3 text-[11px] font-mono text-orange-400">
                  <span>2 Pisos</span>
                  <span>•</span>
                  <span>140 m²</span>
                  <span>•</span>
                  <span>Madera Vista Interior</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GEOMETRÍA & PISOS */}
          {activeTab === 'geometry' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-orange-400">
                Dimensiones Principales
              </h3>

              <div className="space-y-3 bg-zinc-900/60 p-4 rounded-xl border border-white/5">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Ancho de Planta (Eje X)</span>
                    <span className="font-mono text-orange-400 font-bold">{state.widthM.toFixed(1)} m</span>
                  </div>
                  <input
                    type="range"
                    min="3.0"
                    max="20.0"
                    step="0.2"
                    value={state.widthM}
                    onChange={(e) => state.setDimensions(parseFloat(e.target.value), state.lengthM)}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Largo de Planta (Eje Y)</span>
                    <span className="font-mono text-orange-400 font-bold">{state.lengthM.toFixed(1)} m</span>
                  </div>
                  <input
                    type="range"
                    min="4.0"
                    max="25.0"
                    step="0.2"
                    value={state.lengthM}
                    onChange={(e) => state.setDimensions(state.widthM, parseFloat(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Altura Libre de Piso</span>
                    <span className="font-mono text-orange-400 font-bold">{state.storyHeightM.toFixed(2)} m</span>
                  </div>
                  <input
                    type="range"
                    min="2.2"
                    max="3.5"
                    step="0.1"
                    value={state.storyHeightM}
                    onChange={(e) => state.setDimensions(state.widthM, state.lengthM, parseFloat(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                </div>
              </div>

              <h3 className="text-xs font-bold uppercase tracking-widest text-orange-400 pt-2">
                Niveles y Pisos (Multinivel)
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((stories) => (
                  <button
                    key={`story_btn_${stories}`}
                    onClick={() => state.setNumStories(stories)}
                    className={`py-2 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                      state.numStories === stories
                        ? 'bg-orange-500 border-orange-400 text-white shadow-lg'
                        : 'bg-zinc-900 border-white/10 text-slate-300 hover:border-white/30'
                    }`}
                  >
                    {stories} {stories === 1 ? 'Piso' : 'Pisos'}
                  </button>
                ))}
              </div>

              <h3 className="text-xs font-bold uppercase tracking-widest text-orange-400 pt-2">
                Variante Estructural de Montaje
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => state.setConstructionVariant('plataforma')}
                  className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    state.constructionVariant === 'plataforma'
                      ? 'bg-orange-500/15 border-orange-500 text-white'
                      : 'bg-zinc-900 border-white/5 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="font-bold text-xs mb-0.5">CLT en Plataforma (Estándar Niuform)</div>
                  <div className="text-[11px] text-slate-400">Losas de entrepiso posadas sobre muros de corte. Ideal para 1 a 4 pisos.</div>
                </button>

                <button
                  onClick={() => state.setConstructionVariant('balloon')}
                  className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    state.constructionVariant === 'balloon'
                      ? 'bg-orange-500/15 border-orange-500 text-white'
                      : 'bg-zinc-900 border-white/5 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="font-bold text-xs mb-0.5">CLT en Balloon (Paneles Continuos)</div>
                  <div className="text-[11px] text-slate-400">Muros continuos hasta 13.5m con losas colgadas a caras. Disminuye aplastamiento.</div>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: ESPECIFICACIONES CLT & GLT */}
          {activeTab === 'clt_specs' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-orange-400">
                Catálogo de Paneles CLT Niuform (CMPC)
              </h3>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Panel para Muros de Corte y Tabiques</label>
                <select
                  value={state.wallCltType}
                  onChange={(e) => state.setWallCltType(e.target.value as CltPanelType)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="CLT 60s3">CLT 60s3 (3 capas x 20mm - 60mm total)</option>
                  <option value="CLT 80s3">CLT 80s3 (3 capas - 80mm total)</option>
                  <option value="CLT 90s3">CLT 90s3 (3 capas x 30mm - 90mm total) - Estándar</option>
                  <option value="CLT 100s3">CLT 100s3 (3 capas - 100mm total)</option>
                  <option value="CLT 120s3">CLT 120s3 (3 capas x 40mm - 120mm total)</option>
                  <option value="CLT 130s5">CLT 130s5 (5 capas x 26mm - 130mm total)</option>
                  <option value="CLT 150s5">CLT 150s5 (5 capas x 30mm - 150mm total)</option>
                  <option value="CLT 170s5">CLT 170s5 (5 capas x 34mm - 170mm total)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Panel para Losas de Entrepiso</label>
                <select
                  value={state.slabCltType}
                  onChange={(e) => state.setSlabCltType(e.target.value as CltPanelType)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="CLT 130s5">CLT 130s5 (5 capas - 130mm) - Luces hasta 3.2m</option>
                  <option value="CLT 150s5">CLT 150s5 (5 capas - 150mm) - Luces hasta 4.0m (Estándar)</option>
                  <option value="CLT 180s5">CLT 180s5 (5 capas - 180mm) - Luces hasta 5.2m</option>
                  <option value="CLT 210s7">CLT 210s7 (7 capas - 210mm) - Luces hasta 6.5m</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Panel para Cubierta / Techumbre</label>
                <select
                  value={state.roofCltType}
                  onChange={(e) => state.setRoofCltType(e.target.value as CltPanelType)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="CLT 90s3">CLT 90s3 (3 capas - 90mm)</option>
                  <option value="CLT 100s3">CLT 100s3 (3 capas - 100mm)</option>
                  <option value="CLT 130s5">CLT 130s5 (5 capas - 130mm)</option>
                </select>
              </div>

              {/* Ficha Mecánica del Panel de Muro Actual */}
              <div className="bg-zinc-900/80 p-4 rounded-xl border border-white/10 space-y-2">
                <div className="font-bold text-xs text-orange-400 flex items-center justify-between">
                  <span>Ficha Técnica {state.wallCltType}</span>
                  <span className="text-[10px] font-mono text-slate-400">Pino Radiata C24/C16</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Espesor Total:</span>{' '}
                    <span className="font-mono text-white font-semibold">
                      {CLT_SPECS_CATALOG[state.wallCltType].totalThicknessMm} mm
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Capas:</span>{' '}
                    <span className="font-mono text-white font-semibold">
                      {CLT_SPECS_CATALOG[state.wallCltType].layers} capas
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Peso Propio:</span>{' '}
                    <span className="font-mono text-white font-semibold">
                      {CLT_SPECS_CATALOG[state.wallCltType].weightKgM2} kg/m²
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Vel. Carboniz.:</span>{' '}
                    <span className="font-mono text-white font-semibold">0.64 mm/min</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: VANOS & ABERTURAS */}
          {activeTab === 'openings' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-orange-400">
                Añadir Puerta o Ventana
              </h3>

              <div className="bg-zinc-900/60 p-4 rounded-xl border border-white/5 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setNewOpeningType('window')}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      newOpeningType === 'window'
                        ? 'bg-orange-500 border-orange-400 text-white'
                        : 'bg-zinc-800 border-white/5 text-slate-400'
                    }`}
                  >
                    Ventana
                  </button>
                  <button
                    onClick={() => setNewOpeningType('door')}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      newOpeningType === 'door'
                        ? 'bg-orange-500 border-orange-400 text-white'
                        : 'bg-zinc-800 border-white/5 text-slate-400'
                    }`}
                  >
                    Puerta
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Ancho (cm)</label>
                    <input
                      type="number"
                      value={newOpeningWidth}
                      onChange={(e) => setNewOpeningWidth(parseInt(e.target.value) || 60)}
                      className="w-full bg-zinc-800 border border-white/10 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Alto (cm)</label>
                    <input
                      type="number"
                      value={newOpeningHeight}
                      onChange={(e) => setNewOpeningHeight(parseInt(e.target.value) || 60)}
                      className="w-full bg-zinc-800 border border-white/10 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                </div>

                {newOpeningType === 'window' && (
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Altura Antepecho (cm)</label>
                    <input
                      type="number"
                      value={newOpeningSill}
                      onChange={(e) => setNewOpeningSill(parseInt(e.target.value) || 0)}
                      className="w-full bg-zinc-800 border border-white/10 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Distancia desde el inicio (cm)</label>
                  <input
                    type="number"
                    value={newOpeningOffset}
                    onChange={(e) => setNewOpeningOffset(parseInt(e.target.value) || 0)}
                    className="w-full bg-zinc-800 border border-white/10 rounded-lg p-2 text-xs text-white"
                  />
                </div>

                <button
                  onClick={handleAddOpening}
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-orange-500/20"
                >
                  <Plus size={14} /> Añadir Vano al Piso {state.activeStoryLevel}
                </button>
              </div>

              {/* Listado de vanos actuales */}
              <h4 className="text-xs font-bold text-slate-300 pt-2">Vanos Existentes ({state.openings.length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {state.openings.map((op) => (
                  <div
                    key={op.id}
                    className="flex items-center justify-between p-2.5 bg-zinc-900 rounded-lg border border-white/5 text-xs"
                  >
                    <div>
                      <span className="font-bold text-orange-400">
                        {op.type === 'door' ? 'Puerta' : 'Ventana'}
                      </span>{' '}
                      ({op.widthCm}x{op.heightCm} cm) - Piso {op.storyLevel}
                    </div>
                    <button
                      onClick={() => state.removeOpening(op.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                      title="Eliminar Vano"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: CONEXIONES & HERRAJES SIMPSON / ROTHOBLAAS */}
          {activeTab === 'connections' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-orange-400">
                Conectores Sismorresistentes
              </h3>

              <div className="space-y-3">
                {/* Hold-downs */}
                <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">Hold-down (Anclaje Vuelco)</span>
                    <span className="text-[10px] font-mono text-orange-400 font-bold">
                      {bom.holdDownsTotal} unidades
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Simpson Strong-Tie <b>{bom.holdDownModel}</b> con varilla roscada 1" a sobrecimiento. Rigidez axial Kz = 9.523 a 13.528 kN/m.
                  </p>
                </div>

                {/* Ángulos de corte */}
                <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">Ángulos de Corte (Deslizamiento)</span>
                    <span className="text-[10px] font-mono text-orange-400 font-bold">
                      {bom.shearAnglesTotal} unidades
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Simpson Strong-Tie <b>{bom.shearAngleModel}</b> con tornillos CSA 5.0x50. Rigidez lateral Kx = 11.400 - 21.000 kN/m.
                  </p>
                </div>

                {/* Tornillería UMM */}
                <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">Tornillería Costuras Panel-Panel</span>
                    <span className="text-[10px] font-mono text-orange-400 font-bold">
                      {bom.structuralScrewsCount} tornillos
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Simpson Strong-Tie <b>SD9212 (3.3x64mm)</b> @ 50-100mm en lengüeta y <b>SDCP22700 (8x180mm)</b> en losa.
                  </p>
                </div>

                {/* Hermeticidad Flexi Band */}
                <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">Cinta Hermética Rothoblaas</span>
                    <span className="text-[10px] font-mono text-orange-400 font-bold">
                      {bom.flexiBandTapeM} m
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    <b>Flexi Band & Level Band</b> para estanqueidad al aire e impermeabilización perimetral de soleras.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: AISLACIÓN TÉRMICA & NCh853 */}
          {activeTab === 'thermal' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-orange-400">
                Aislación Térmica & Zonas NCh853
              </h3>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Zona Climática de Chile</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] as ChileanThermalZone[]).map((zone) => (
                    <button
                      key={`zone_${zone}`}
                      onClick={() => state.setThermalZone(zone)}
                      className={`py-1.5 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                        state.thermalConfig.selectedZone === zone
                          ? 'bg-orange-500 border-orange-400 text-white'
                          : 'bg-zinc-900 border-white/10 text-slate-300 hover:border-white/30'
                      }`}
                    >
                      Zona {zone}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Sistema de Revestimiento Exterior</label>
                <select
                  value={state.thermalConfig.claddingSystem}
                  onChange={(e) => state.setCladdingSystem(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="weber_eifs_60">Weber EIFS E=60mm (Estándar Zona A-D)</option>
                  <option value="weber_eifs_80">Weber EIFS E=80mm (Recomendado Zona E-G)</option>
                  <option value="weber_eifs_100">Weber EIFS E=100mm (Zona H-I / Passivhaus)</option>
                  <option value="volcanboard_madera_8">Volcanboard 8mm + Rastrel 2x3 + Aislanglass</option>
                  <option value="ventilada_madera">Fachada Ventilada Madera Pino Tratado MCA</option>
                </select>
              </div>

              {/* Resultado del valor U */}
              <div className={`p-4 rounded-xl border space-y-2 ${
                bom.thermalZoneCompliant ? 'bg-emerald-950/20 border-emerald-500/50' : 'bg-red-950/20 border-red-500/50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">Transmitancia Térmica U Muro</span>
                  <span className={`font-mono font-bold text-sm ${bom.thermalZoneCompliant ? 'text-emerald-400' : 'text-red-400'}`}>
                    {bom.uValueWall} W/m²K
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  {bom.thermalZoneCompliant ? (
                    <>
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                      <span>Cumple con la exigencia máxima para la Zona {state.thermalConfig.selectedZone} según NCh853.</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={14} className="text-red-400 shrink-0" />
                      <span>Excede el límite térmico. Se sugiere aumentar espesor EIFS a 80 o 100mm.</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: SECUENCIA DE MONTAJE (NIUFORM TIMBER SEQUENCE) */}
          {activeTab === 'assembly' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-orange-400">
                Simulación de Montaje en Obra
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Secuencia industrializada de izaje y fijación de paneles según protocolo de capacitación Niuform.
              </p>

              <div className="space-y-3">
                {[
                  { step: 0, title: 'Paso 0: Trazado de Ejes y Soleras sobre Radier' },
                  { step: 1, title: 'Paso 1: Montaje de Muros CLT 1er Nivel' },
                  { step: 2, title: 'Paso 2: Instalación de Vigas GLT y Losa Entrepiso' },
                  { step: 3, title: 'Paso 3: Montaje de Muros CLT 2do Nivel' },
                  { step: 4, title: 'Paso 4: Pisos Superiores y Dinteles Continuos' },
                  { step: 5, title: 'Paso 5: Montaje de Paneles de Techumbre' },
                  { step: 6, title: 'Paso 6: Conexiones Sismorresistentes y Hermeticidad' },
                ].map((item) => (
                  <button
                    key={`assembly_${item.step}`}
                    onClick={() => {
                      state.setRenderStyle('assembly_sequence');
                      state.setCurrentAssemblyStep(item.step);
                    }}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      state.renderStyle === 'assembly_sequence' && state.currentAssemblyStep === item.step
                        ? 'bg-orange-500 text-white font-bold border-orange-400 shadow-md'
                        : 'bg-zinc-900 border-white/5 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <span className="text-xs">{item.title}</span>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: CUBICACIÓN, CO2 & COSTOS */}
          {activeTab === 'bom' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-orange-400">
                Resumen de Cubicación & Huella CO₂
              </h3>

              {/* Tarjeta de Captura de Carbono */}
              <div className="bg-emerald-950/30 border border-emerald-500/40 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                    <TreePine size={14} /> CO₂ Secuestrado
                  </span>
                  <span className="font-mono text-emerald-400 font-bold text-sm">
                    {bom.co2CapturedTon} Ton CO₂ eq
                  </span>
                </div>
                <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                  La madera masiva de este proyecto almacena carbono atmosférico de por vida, equivalente a <b>~{Math.round(bom.co2CapturedTon * 45)} árboles</b>. Ahorra <b>{bom.co2AvoidedVsConcreteTon} Ton CO₂</b> frente al hormigón armado.
                </p>
              </div>

              {/* Desglose de Presupuesto */}
              <div className="bg-zinc-900/80 p-4 rounded-xl border border-white/10 space-y-2.5">
                <div className="text-xs font-bold text-white border-b border-white/10 pb-1.5">
                  Estimación Presupuestaria de Obra
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">CLT Mecanizado ({bom.totalCltVolumeM3} m³):</span>
                  <span className="font-mono font-semibold text-white">$ {bom.costCltClp.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Vigas & Pilares GLT ({bom.gltTotalVolumeM3} m³):</span>
                  <span className="font-mono font-semibold text-white">$ {bom.costGltClp.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Herrajes Simpson / Rothoblaas:</span>
                  <span className="font-mono font-semibold text-white">$ {bom.costHardwareClp.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Envolvente EIFS / Aislación:</span>
                  <span className="font-mono font-semibold text-white">$ {bom.costInsulationClp.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Montaje y Grúa:</span>
                  <span className="font-mono font-semibold text-white">$ {bom.costAssemblyClp.toLocaleString('es-CL')}</span>
                </div>

                <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-bold text-orange-400">
                  <span>TOTAL ESTIMADO:</span>
                  <span className="font-mono">$ {bom.totalEstimatedCostClp.toLocaleString('es-CL')} CLP</span>
                </div>
                <div className="text-right text-[11px] font-mono text-slate-400">
                  (aprox. $ {bom.totalEstimatedCostUsd.toLocaleString('en-US')} USD)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer de la Barra Lateral con Botones de Exportación */}
        <div className="p-4 border-t border-white/10 bg-zinc-900/80 flex items-center gap-2">
          <button
            onClick={() => exportCltHouseToExcel(state)}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
          >
            <FileSpreadsheet size={15} /> Excel BOM
          </button>
          <button
            onClick={() => exportCltHouseToPdf(state)}
            className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-orange-500/20"
          >
            <FileText size={15} /> Memoria PDF
          </button>
        </div>
      </aside>

      {/* 2. ÁREA CENTRAL: VISUALIZADOR 3D / 2D */}
      <main className="flex-1 flex flex-col h-full relative">
        {/* Header Superior del Viewport */}
        <header className="h-14 bg-zinc-950/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            {/* Toggle 3D / 2D */}
            <div className="flex items-center bg-black/60 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => state.setViewMode('3d')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  state.viewMode === '3d'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Vista 3D BIM
              </button>
              <button
                onClick={() => state.setViewMode('2d')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  state.viewMode === '2d'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Plano 2D CAD
              </button>
            </div>

            {/* Modos de Renderizado 3D */}
            {state.viewMode === '3d' && (
              <div className="hidden lg:flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  onClick={() => state.setRenderStyle('architectural')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    state.renderStyle === 'architectural'
                      ? 'bg-orange-500/20 text-orange-400 font-bold border border-orange-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Arquitectónico
                </button>
                <button
                  onClick={() => state.setRenderStyle('structural_xray')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    state.renderStyle === 'structural_xray'
                      ? 'bg-orange-500/20 text-orange-400 font-bold border border-orange-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Estructura CLT
                </button>
                <button
                  onClick={() => state.setRenderStyle('connectors')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    state.renderStyle === 'connectors'
                      ? 'bg-orange-500/20 text-orange-400 font-bold border border-orange-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Herrajes & Anclajes
                </button>
                <button
                  onClick={() => state.setRenderStyle('assembly_sequence')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    state.renderStyle === 'assembly_sequence'
                      ? 'bg-orange-500/20 text-orange-400 font-bold border border-orange-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Secuencia Montaje
                </button>
              </div>
            )}
          </div>

          {/* KPIs Principales en el Header */}
          <div className="flex items-center gap-6 text-xs">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Madera Masiva</span>
              <span className="font-mono font-bold text-orange-400">{bom.totalTimberVolumeM3} m³ ({bom.totalTimberWeightTon} Ton)</span>
            </div>
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Secuestro CO₂</span>
              <span className="font-mono font-bold text-emerald-400">{bom.co2CapturedTon} Ton CO₂ eq</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Deriva Sísmica (NCh433)</span>
              <span className={`font-mono font-bold ${bom.isSeismicSafe ? 'text-emerald-400' : 'text-red-400'}`}>
                {bom.interstoryDriftMm} mm / {bom.interstoryDriftLimitMm} mm
              </span>
            </div>
          </div>
        </header>

        {/* Viewport Principal (3D o 2D) */}
        <div className="flex-1 w-full h-full relative">
          {state.viewMode === '3d' ? <CltScene /> : <CltBlueprint2D />}
        </div>
      </main>

      {/* Modal Guardar Proyecto */}
      <SaveProjectModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        projectType="sip-house" // reutiliza modal común
        projectData={{
          name: state.projectName,
          description: `Proyecto en CLT & GLT de ${state.numStories} pisos (${(state.widthM * state.lengthM * state.numStories).toFixed(1)} m²)`,
          cltState: state,
        }}
      />
    </div>
  );
}
