import React, { useState } from 'react';
import {
  ArrowLeft,
  Download,
  Eye,
  Layers,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  SlidersHorizontal,
  Ruler,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  DoorClosed,
  Plus,
  Trash2,
  Maximize2,
  Boxes,
  Grid,
  Zap,
  Sparkles,
} from 'lucide-react';
import {
  useConcreteHouseStore,
  CONCRETE_PRESETS,
  WallThicknessMm,
  WallMeshType,
  ConcreteGrade,
  ConcreteSlump,
  ConcreteFoundationType,
  SlabType,
  RebarSteelQuality,
  ConcreteRenderMode,
  ConcreteWallTarget,
  FrameMaterialType,
  GlazingType,
} from '../store/concreteHouseStore';
import { calculateConcreteHouseBOM } from '../utils/concreteManufacturing';
import { exportConcreteHouseToExcel } from '../utils/concreteExcelGenerator';
import { exportConcreteHouseToPdf } from '../utils/concretePdfGenerator';
import { ConcreteScene } from '../components/concrete/ConcreteScene';
import { ConcreteBlueprint } from '../components/concrete/ConcreteBlueprint';
import { ConcreteFloorPlannerModal } from '../components/concrete/ConcreteFloorPlannerModal';

export function ConcreteHouseConfigurator({ onNavigate }: { onNavigate: (route: 'home') => void }) {
  const store = useConcreteHouseStore();
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [activeTab, setActiveTab] = useState<'systems' | 'geometry' | 'ich_standards' | 'openings' | 'layers' | 'bom'>('systems');

  // Formulario nuevo vano
  const [newOpType, setNewOpType] = useState<'door' | 'window'>('window');
  const [newOpName, setNewOpName] = useState('Ventana Dormitorio');
  const [newOpWall, setNewOpWall] = useState<ConcreteWallTarget>('front');
  const [newOpWidth, setNewOpWidth] = useState(140);
  const [newOpHeight, setNewOpHeight] = useState(120);
  const [newOpSill, setNewOpSill] = useState(90);
  const [newOpOffset, setNewOpOffset] = useState(100);
  const [newOpFrameMaterial, setNewOpFrameMaterial] = useState<FrameMaterialType>('pvc_negro');
  const [newOpGlazingType, setNewOpGlazingType] = useState<GlazingType>('termopanel_dvp');

  // Métricas de cubicación
  const metrics = calculateConcreteHouseBOM(
    store.dimensions,
    store.wallThicknessMm,
    store.meshType,
    store.concreteGrade,
    store.concreteSlump,
    store.foundationType,
    store.slabType,
    store.rebarSteelQuality,
    store.meshDiameterMm,
    store.openings,
    store.interiorWalls,
    store.wallSystemType,
    store.mezzanineSystemType,
    store.roofStructureType
  );

  const handleAddOpening = (e: React.FormEvent) => {
    e.preventDefault();
    store.addOpening({
      type: newOpType,
      name: newOpName,
      wall: newOpWall,
      width: Number(newOpWidth),
      height: Number(newOpHeight),
      sillHeight: newOpType === 'door' ? 0 : Number(newOpSill),
      offsetAlongWall: Number(newOpOffset),
      frameMaterial: newOpFrameMaterial,
      glazingType: newOpGlazingType,
      hasDiagonalRebar: true,
      lintelRebarDiameter: 12,
    });
  };

  const handleExportExcel = () => {
    exportConcreteHouseToExcel(
      store.dimensions,
      store.wallThicknessMm,
      store.meshType,
      store.concreteGrade,
      store.concreteSlump,
      store.foundationType,
      store.slabType,
      store.rebarSteelQuality,
      store.meshDiameterMm,
      store.openings,
      store.interiorWalls,
      store.wallSystemType,
      store.mezzanineSystemType,
      store.roofStructureType
    );
  };

  const handleExportPdf = () => {
    exportConcreteHouseToPdf(
      store.dimensions,
      store.wallThicknessMm,
      store.meshType,
      store.concreteGrade,
      store.concreteSlump,
      store.foundationType,
      store.slabType,
      store.rebarSteelQuality,
      store.meshDiameterMm,
      store.openings,
      store.interiorWalls,
      store.wallSystemType,
      store.mezzanineSystemType,
      store.roofStructureType
    );
  };

  // Ciclo del botón "Modo Rayos X / Transparentar"
  const handleCycleRenderMode = () => {
    const modes: ConcreteRenderMode[] = ['solid', 'xray', 'rebar_only', 'formwork'];
    const nextIdx = (modes.indexOf(store.renderMode) + 1) % modes.length;
    store.setRenderMode(modes[nextIdx]);
  };

  return (
    <div className="w-full h-screen bg-[#070a12] text-slate-200 flex flex-col overflow-hidden font-sans select-none">
      {/* 1. HEADER / BARRA SUPERIOR */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0">
        {/* Left: Volver y Título */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700 cursor-pointer"
            title="Volver a la Suite Principal"
          >
            <ArrowLeft size={18} />
          </button>

          <span className="font-bellota text-2xl font-bold lowercase text-orange-500 tracking-tight select-none">
            arquify
          </span>

          <div className="h-6 w-px bg-slate-800" />

          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
              <h1 className="text-base font-bold text-white tracking-wide uppercase">
                Casas de Hormigón Armado <span className="text-orange-400 font-extrabold text-xs px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20">ICH • NCh430</span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400">Manual de Detallamiento ICH • Malla Central & Doble Malla • Cubicación & Rayos X</p>
          </div>
        </div>

        {/* Center: Selector 3D / 2D y Botón Transparentar / Rayos X */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode('3d')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === '3d' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Boxes size={14} />
            3D BIM
          </button>
          <button
            onClick={() => setViewMode('2d')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === '2d' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Grid size={14} />
            Plano 2D
          </button>

          <div className="h-5 w-px bg-slate-800 mx-1"></div>

          {/* Botón Diseñador 2D de Planta & Recintos */}
          <button
            onClick={() => store.setFloorPlannerOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-md shadow-orange-500/20 transition-all cursor-pointer ring-1 ring-orange-400/40"
            title="Diseñar planta 2D personalizada: Casas en L, U, quinchos, terrazas y recintos interiores"
          >
            <Sparkles size={14} className="text-yellow-200 animate-pulse" />
            <span>Diseñador 2D Recintos</span>
          </button>

          <div className="h-5 w-px bg-slate-800 mx-1"></div>

          {/* Botón Destacado: Transparentar / Rayos X */}
          <button
            onClick={handleCycleRenderMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              store.renderMode === 'xray'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20 ring-1 ring-sky-300'
                : store.renderMode === 'rebar_only'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                : store.renderMode === 'formwork'
                ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-500/20'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="Cambia el modo de visualización: Sólido, Rayos X (Enfierradura visible), Solo Acero o Moldaje"
          >
            <Eye size={14} />
            <span>
              {store.renderMode === 'solid' && 'Transparentar / Rayos X'}
              {store.renderMode === 'xray' && 'Modo Rayos X (Activo)'}
              {store.renderMode === 'rebar_only' && 'Solo Enfierradura'}
              {store.renderMode === 'formwork' && 'Moldaje Industrial'}
            </span>
          </button>
        </div>

        {/* Right: Presets, Descargas y Reseteo */}
        <div className="flex items-center gap-2">
          {/* Presets */}
          <select
            onChange={(e) => store.loadPreset(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 rounded-lg px-2.5 py-1.5 outline-none hover:border-orange-500 focus:border-orange-500 cursor-pointer"
            defaultValue=""
          >
            <option value="" disabled>Cargar Plantilla ICH...</option>
            {CONCRETE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Exportar Excel */}
          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            title="Exportar Cubicación y Presupuesto en Formato Excel (.xlsx)"
          >
            <FileSpreadsheet size={14} />
            <span className="hidden sm:inline">Excel</span>
          </button>

          {/* Exportar PDF */}
          <button
            onClick={handleExportPdf}
            className="px-3 py-1.5 bg-sky-600/90 hover:bg-sky-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            title="Exportar Ficha Técnica y EETT en PDF"
          >
            <FileText size={14} />
            <span className="hidden sm:inline">PDF</span>
          </button>

          {/* Reset */}
          <button
            onClick={store.resetToDefault}
            className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/40 rounded-lg transition-all cursor-pointer"
            title="Restablecer a valores iniciales"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </header>

      {/* 2. ÁREA PRINCIPAL: VISOR (3D/2D) + SIDEBAR LATERAL */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* VIEWPORT PRINCIPAL */}
        <main className="flex-1 h-full relative overflow-hidden bg-slate-950 flex flex-col">
          {viewMode === '3d' ? <ConcreteScene /> : <ConcreteBlueprint />}

          {/* Chips flotantes de métricas en tiempo real */}
          <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2 pointer-events-none">
            <div className="bg-slate-900/85 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Hormigón:</span>
              <span className="text-xs font-bold text-sky-400">{metrics.totalConcreteM3.toFixed(1)} m³</span>
              <span className="text-[10px] text-slate-500">({metrics.mixerTruckLoads} mixers)</span>
            </div>
            <div className="bg-slate-900/85 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Moldaje:</span>
              <span className="text-xs font-bold text-yellow-400">{metrics.totalFormworkM2.toFixed(1)} m²</span>
            </div>
            <div className="bg-slate-900/85 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Enfierradura:</span>
              <span className="text-xs font-bold text-emerald-400">{metrics.totalSteelKg.toFixed(0)} kg</span>
              <span className="text-[10px] text-slate-500">({metrics.steelRatioKgM3.toFixed(1)} kg/m³)</span>
            </div>
            <div className="bg-slate-900/85 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Obra Gruesa:</span>
              <span className="text-xs font-bold text-orange-400">$ {(metrics.totalCostClp / 1000000).toFixed(2)} M CLP</span>
            </div>
          </div>

          {/* Barra Flotante de Inserción Rápida y Drag de Vanos */}
          {viewMode === '3d' && (
            <div className="absolute bottom-12 right-4 z-20 flex flex-col items-end gap-2">
              <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200 px-1.5 flex items-center gap-1.5">
                  <Sparkles size={15} className="text-orange-400" />
                  <span>Insertar:</span>
                </span>
                <button
                  onClick={() => {
                    const count = store.openings.filter((o) => o.type === 'door').length + 1;
                    store.addOpening({
                      type: 'door',
                      name: `Puerta Acceso P${count} (90x210)`,
                      wall: store.selectedWall || 'front',
                      width: 90,
                      height: 210,
                      sillHeight: 0,
                      offsetAlongWall: 60,
                      frameMaterial: 'pvc_negro',
                      glazingType: 'termopanel_dvp',
                      hasDiagonalRebar: true,
                      lintelRebarDiameter: 12,
                    });
                    setActiveTab('openings');
                  }}
                  className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="Añadir Puerta estándar 90x210 cm"
                >
                  <span>🚪 + Puerta (90x210)</span>
                </button>
                <button
                  onClick={() => {
                    const count = store.openings.filter((o) => o.type === 'window').length + 1;
                    store.addOpening({
                      type: 'window',
                      name: `Ventana V${count} (140x120)`,
                      wall: store.selectedWall || 'front',
                      width: 140,
                      height: 120,
                      sillHeight: 90,
                      offsetAlongWall: 180,
                      frameMaterial: 'pvc_negro',
                      glazingType: 'termopanel_dvp',
                      hasDiagonalRebar: true,
                      lintelRebarDiameter: 12,
                    });
                    setActiveTab('openings');
                  }}
                  className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="Añadir Ventana Termopanel 140x120 cm"
                >
                  <span>🪟 + Ventana (140x120)</span>
                </button>
                <button
                  onClick={() => {
                    const count = store.openings.length + 1;
                    store.addOpening({
                      type: 'door',
                      name: `Ventanal Terraza V${count} (200x215)`,
                      wall: store.selectedWall || 'front',
                      width: 200,
                      height: 215,
                      sillHeight: 0,
                      offsetAlongWall: 80,
                      frameMaterial: 'pvc_negro',
                      glazingType: 'termopanel_dvp',
                      hasDiagonalRebar: true,
                      lintelRebarDiameter: 16,
                    });
                    setActiveTab('openings');
                  }}
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="Añadir Ventanal Corredero Terraza 200x215 cm"
                >
                  <span>🪟 + Ventanal (200x215)</span>
                </button>
              </div>
              <div className="bg-slate-950/90 border border-white/10 px-3 py-1.5 rounded-xl text-xs text-slate-300 flex items-center gap-2 backdrop-blur-md shadow-lg">
                <span className="text-orange-400 font-bold">💡 Interacción 3D:</span>
                <span>Arrastra con el mouse sobre cualquier puerta o ventana para moverla dinámicamente con Drag & Drop a lo largo del muro.</span>
              </div>
            </div>
          )}

          {/* Banner informativo norma chilena en el pie del visor */}
          <div className="absolute bottom-3 left-4 right-4 z-20 pointer-events-none flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/70 backdrop-blur-md px-4 py-1.5 rounded-xl border border-slate-800/80">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-orange-400" />
              Detallamiento conforme a <strong>NCh430.Of2008 / D.S. N°60</strong> y recomendaciones del <strong>Manual ICH</strong>.
            </span>
            <span className="hidden md:inline text-slate-500 font-mono">
              Recubrimiento: {store.wallThicknessMm <= 100 ? '20 mm' : '25 mm'} • Gancho 135° en estribos
            </span>
          </div>
        </main>

        {/* SIDEBAR DE CONFIGURACIÓN PARAMÉTRICA */}
        <aside className="w-full lg:w-[420px] h-[45vh] lg:h-full bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col z-20 shadow-2xl shrink-0 overflow-hidden">
          {/* Navegación de Tabs del Sidebar */}
          <div className="flex border-b border-slate-800 bg-slate-950/60 shrink-0 overflow-x-auto p-1.5 gap-1">
            <button
              onClick={() => setActiveTab('systems')}
              className={`px-3 py-2 rounded-lg text-xs font-bold tracking-wider flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'systems' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Boxes size={14} />
              3 Pasos Estructurales
            </button>
            <button
              onClick={() => setActiveTab('geometry')}
              className={`px-3 py-2 rounded-lg text-xs font-bold tracking-wider flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'geometry' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Ruler size={14} />
              Dimensiones
            </button>
            <button
              onClick={() => setActiveTab('ich_standards')}
              className={`px-3 py-2 rounded-lg text-xs font-bold tracking-wider flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'ich_standards' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck size={14} />
              Norma & Hormigón
            </button>
            <button
              onClick={() => setActiveTab('openings')}
              className={`px-3 py-2 rounded-lg text-xs font-bold tracking-wider flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'openings' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              <DoorClosed size={14} />
              Vanos ({store.openings.length})
            </button>
            <button
              onClick={() => setActiveTab('layers')}
              className={`px-3 py-2 rounded-lg text-xs font-bold tracking-wider flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'layers' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers size={14} />
              Capas 3D
            </button>
            <button
              onClick={() => setActiveTab('bom')}
              className={`px-3 py-2 rounded-lg text-xs font-bold tracking-wider flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'bom' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet size={14} />
              Cubicación
            </button>
          </div>

          {/* Contenido Scrolleable de los Tabs */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-slate-300">
            {/* TAB 0: 3 PASOS ESTRUCTURALES */}
            {activeTab === 'systems' && (
              <div className="space-y-5">
                {/* Paso 1: Sistema de Muros */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      Paso 1
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">NCh430 / NCh2123</span>
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Sistema de Muros (La Base de la Casa)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Elige de qué material y sistema constructivo se levantarán las paredes portantes perimetrales e interiores:
                  </p>

                  <div className="space-y-2 pt-1">
                    {/* Opción 1: Hormigón Armado Total */}
                    <button
                      onClick={() => store.setWallSystemType('hormigon_armado_total')}
                      className={`w-full p-3 rounded-xl border transition-all text-left flex items-start gap-3 cursor-pointer ${
                        store.wallSystemType === 'hormigon_armado_total'
                          ? 'bg-orange-500/15 border-orange-500 text-white shadow-lg'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className={`mt-0.5 p-2 rounded-lg shrink-0 ${store.wallSystemType === 'hormigon_armado_total' ? 'bg-orange-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>
                        HA
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white">Hormigón Armado Total</span>
                          {store.wallSystemType === 'hormigon_armado_total' && (
                            <span className="text-[9px] uppercase font-bold text-orange-400 font-mono">Activo</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                          Muros completamente vaciados en hormigón con doble malla o malla central electrosoldada (NCh430/D.S. N°60). Ideal para diseños modernos, mediterráneos o muros vistos.
                        </p>
                      </div>
                    </button>

                    {/* Opción 2: Albañilería Confinada */}
                    <button
                      onClick={() => store.setWallSystemType('albanileria_confinada')}
                      className={`w-full p-3 rounded-xl border transition-all text-left flex items-start gap-3 cursor-pointer ${
                        store.wallSystemType === 'albanileria_confinada'
                          ? 'bg-orange-500/15 border-orange-500 text-white shadow-lg'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className={`mt-0.5 p-2 rounded-lg shrink-0 ${store.wallSystemType === 'albanileria_confinada' ? 'bg-orange-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>
                        AC
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white">Albañilería Confinada</span>
                          {store.wallSystemType === 'albanileria_confinada' && (
                            <span className="text-[9px] uppercase font-bold text-orange-400 font-mono">Activo</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                          Ladrillos cerámicos estructurales Princesa/Titan estructurados y confinados con pilares y cadenas de hormigón armado H20 (NCh2123/NCh1928). El sistema tradicional y térmico chileno.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Paso 2: Sistema de Entrepiso */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                      Paso 2
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {store.dimensions.levels > 1 ? 'Activo (2 Pisos)' : 'Requiere 2 Pisos'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Sistema de Entrepiso (Nivel Superior)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Define la estructura que separará y soportará los pisos si la vivienda tiene 2 plantas:
                  </p>

                  {store.dimensions.levels === 1 ? (
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-center space-y-2">
                      <p className="text-slate-400 text-xs">La vivienda está actualmente en 1 piso (planta única).</p>
                      <button
                        onClick={() => store.setDimensions({ levels: 2 })}
                        className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-500/40 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        + Activar 2° Piso para Habilitar Entrepiso
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      {/* Losa de Hormigón Armado */}
                      <button
                        onClick={() => store.setMezzanineSystemType('losa_hormigon_armado')}
                        className={`w-full p-3 rounded-xl border transition-all text-left flex items-start gap-3 cursor-pointer ${
                          store.mezzanineSystemType === 'losa_hormigon_armado'
                            ? 'bg-sky-500/15 border-sky-500 text-white shadow-lg'
                            : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className={`mt-0.5 p-2 rounded-lg shrink-0 ${store.mezzanineSystemType === 'losa_hormigon_armado' ? 'bg-sky-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>
                          LH
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-white">Losa de Hormigón Armado</span>
                            {store.mezzanineSystemType === 'losa_hormigon_armado' && (
                              <span className="text-[9px] uppercase font-bold text-sky-400 font-mono">Activo</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                            Losa monolítica e=12cm de alta inercia. Máxima aislación acústica al ruido de impacto y capacidad para muros o cargas pesadas superiores (NCh430).
                          </p>
                        </div>
                      </button>

                      {/* Entrepiso Liviano de Madera */}
                      <button
                        onClick={() => store.setMezzanineSystemType('entrepiso_madera_liviano')}
                        className={`w-full p-3 rounded-xl border transition-all text-left flex items-start gap-3 cursor-pointer ${
                          store.mezzanineSystemType === 'entrepiso_madera_liviano'
                            ? 'bg-sky-500/15 border-sky-500 text-white shadow-lg'
                            : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className={`mt-0.5 p-2 rounded-lg shrink-0 ${store.mezzanineSystemType === 'entrepiso_madera_liviano' ? 'bg-sky-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>
                          EM
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-white">Entrepiso Liviano de Madera</span>
                            {store.mezzanineSystemType === 'entrepiso_madera_liviano' && (
                              <span className="text-[9px] uppercase font-bold text-sky-400 font-mono">Activo</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                            Envigado con vigas de pino estructural C24 (3x8" @ 40cm) + placa OSB e=20mm y lana aislante (NCh1198). Estructura liviana, rápida y de menor costo.
                          </p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* Paso 3: Estructura de Techumbre */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Paso 3
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">NCh1198 / NCh430</span>
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Estructura de Techumbre (La Cubierta)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Selecciona cómo se cerrará la vivienda por arriba:
                  </p>

                  <div className="space-y-2 pt-1">
                    {/* Opción 1: Techumbre Liviana de Madera */}
                    <button
                      onClick={() => store.setRoofStructureType('techumbre_madera_liviana')}
                      className={`w-full p-3 rounded-xl border transition-all text-left flex items-start gap-3 cursor-pointer ${
                        store.roofStructureType === 'techumbre_madera_liviana'
                          ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className={`mt-0.5 p-2 rounded-lg shrink-0 ${store.roofStructureType === 'techumbre_madera_liviana' ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>
                        TL
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white">Techumbre Liviana de Madera</span>
                          {store.roofStructureType === 'techumbre_madera_liviana' && (
                            <span className="text-[9px] uppercase font-bold text-emerald-400 font-mono">Activo</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                          Cerchas y tijerales de madera pino C16 @ 90cm con costaneras y cubierta zinc-alum/teja (NCh1198). Ideal para techos con pendientes pronunciadas y evacuación pluvial.
                        </p>
                      </div>
                    </button>

                    {/* Opción 2: Losa Plana de Hormigón */}
                    <button
                      onClick={() => store.setRoofStructureType('losa_plana_hormigon')}
                      className={`w-full p-3 rounded-xl border transition-all text-left flex items-start gap-3 cursor-pointer ${
                        store.roofStructureType === 'losa_plana_hormigon'
                          ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className={`mt-0.5 p-2 rounded-lg shrink-0 ${store.roofStructureType === 'losa_plana_hormigon' ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>
                        LP
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white">Losa Plana de Hormigón Armado</span>
                          {store.roofStructureType === 'losa_plana_hormigon' && (
                            <span className="text-[9px] uppercase font-bold text-emerald-400 font-mono">Activo</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                          Losa horizontal e=12cm con pretil perimetral de hormigón. Permite terrazas transitables o azoteas en estilo mediterráneo moderno.
                        </p>
                      </div>
                    </button>

                    {/* Opción 3: Losa Dos Aguas Monolítica H.A. */}
                    <button
                      onClick={() => store.setRoofStructureType('dos_aguas_hormigon')}
                      className={`w-full p-3 rounded-xl border transition-all text-left flex items-start gap-3 cursor-pointer ${
                        store.roofStructureType === 'dos_aguas_hormigon'
                          ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className={`mt-0.5 p-2 rounded-lg shrink-0 ${store.roofStructureType === 'dos_aguas_hormigon' ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>
                        DA
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white">Losa Dos Aguas Monolítica H.A.</span>
                          {store.roofStructureType === 'dos_aguas_hormigon' && (
                            <span className="text-[9px] uppercase font-bold text-emerald-400 font-mono">Activo</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                          Losa inclinada de hormigón visto e=15cm y hastiales triangulares continuos (Estilo Casa TT).
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 1: GEOMETRÍA & DIMENSIONES */}
            {activeTab === 'geometry' && (
              <div className="space-y-5">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Ruler size={16} className="text-orange-400" />
                    Geometría de la Vivienda
                  </h3>

                  {/* Ancho Frontal */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-300">Ancho Frontal (Eje X)</span>
                      <span className="font-mono font-bold text-orange-400">{(store.dimensions.width / 100).toFixed(2)} m ({store.dimensions.width} cm)</span>
                    </div>
                    <input
                      type="range"
                      min={400}
                      max={1600}
                      step={20}
                      value={store.dimensions.width}
                      onChange={(e) => store.setDimensions({ width: Number(e.target.value) })}
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                  </div>

                  {/* Largo Lateral */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-300">Largo Lateral (Eje Z)</span>
                      <span className="font-mono font-bold text-orange-400">{(store.dimensions.length / 100).toFixed(2)} m ({store.dimensions.length} cm)</span>
                    </div>
                    <input
                      type="range"
                      min={400}
                      max={3500}
                      step={20}
                      value={store.dimensions.length}
                      onChange={(e) => store.setDimensions({ length: Number(e.target.value) })}
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                  </div>

                  {/* Altura de Muros */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-300">Altura Libre de Entrepiso</span>
                      <span className="font-mono font-bold text-sky-400">{(store.dimensions.wallHeight / 100).toFixed(2)} m</span>
                    </div>
                    <input
                      type="range"
                      min={230}
                      max={380}
                      step={5}
                      value={store.dimensions.wallHeight}
                      onChange={(e) => store.setDimensions({ wallHeight: Number(e.target.value) })}
                      className="w-full accent-sky-500 cursor-pointer"
                    />
                  </div>

                  {/* Tipo de Cubierta / Techumbre (Sincronizado con Paso 3) */}
                  <div className="pt-2">
                    <label className="block font-semibold text-slate-300 mb-2">Estructura de Techumbre / Cubierta:</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => store.setRoofStructureType('dos_aguas_hormigon')}
                        className={`py-2 px-2 rounded-lg font-bold text-xs border transition-all text-left cursor-pointer ${
                          store.roofStructureType === 'dos_aguas_hormigon'
                            ? 'bg-orange-500/20 text-orange-400 border-orange-500'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="font-bold text-[11px]">Dos Aguas H.A.</div>
                        <div className="text-[9px] text-slate-400">Inclinada H.A.</div>
                      </button>
                      <button
                        onClick={() => store.setRoofStructureType('losa_plana_hormigon')}
                        className={`py-2 px-2 rounded-lg font-bold text-xs border transition-all text-left cursor-pointer ${
                          store.roofStructureType === 'losa_plana_hormigon'
                            ? 'bg-orange-500/20 text-orange-400 border-orange-500'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="font-bold text-[11px]">Losa Plana</div>
                        <div className="text-[9px] text-slate-400">Plana e=12cm</div>
                      </button>
                      <button
                        onClick={() => store.setRoofStructureType('techumbre_madera_liviana')}
                        className={`py-2 px-2 rounded-lg font-bold text-xs border transition-all text-left cursor-pointer ${
                          store.roofStructureType === 'techumbre_madera_liviana'
                            ? 'bg-orange-500/20 text-orange-400 border-orange-500'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="font-bold text-[11px]">Cerchas Madera</div>
                        <div className="text-[9px] text-slate-400">Zinc / Tejas</div>
                      </button>
                    </div>
                  </div>

                  {(store.roofStructureType === 'dos_aguas_hormigon' || store.roofStructureType === 'techumbre_madera_liviana') && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-300">Altura de Cumbrera</span>
                        <span className="font-mono font-bold text-orange-400">{store.dimensions.roofRidgeHeightCm ?? 175} cm</span>
                      </div>
                      <input
                        type="range"
                        min={60}
                        max={250}
                        step={10}
                        value={store.dimensions.roofRidgeHeightCm ?? 175}
                        onChange={(e) => store.setDimensions({ roofRidgeHeightCm: Number(e.target.value) })}
                        className="w-full accent-orange-500 cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Cantidad de Niveles / Pisos */}
                  <div className="pt-2">
                    <label className="block font-semibold text-slate-300 mb-2">Número de Pisos:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => store.setDimensions({ levels: 1 })}
                        className={`py-2 rounded-lg font-bold uppercase text-xs border transition-all cursor-pointer ${
                          store.dimensions.levels === 1
                            ? 'bg-orange-500/20 text-orange-400 border-orange-500'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        1 Piso (Planta Única)
                      </button>
                      <button
                        onClick={() => store.setDimensions({ levels: 2 })}
                        className={`py-2 rounded-lg font-bold uppercase text-xs border transition-all cursor-pointer ${
                          store.dimensions.levels === 2
                            ? 'bg-orange-500/20 text-orange-400 border-orange-500'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        2 Pisos (+ Losa e=12cm)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Módulo Pérgola & Asador Exterior (Casa TT) */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                      Pérgola & Quincho Exterior
                    </h3>
                    <input
                      type="checkbox"
                      checked={store.showPergola}
                      onChange={(e) => store.setShowPergola(e.target.checked)}
                      className="w-4 h-4 accent-sky-500 cursor-pointer"
                    />
                  </div>

                  {store.showPergola && (
                    <div className="space-y-3 pt-1">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-300">Ancho Pérgola</span>
                          <span className="font-mono font-bold text-sky-400">{(store.pergolaWidthCm / 100).toFixed(2)} m</span>
                        </div>
                        <input
                          type="range"
                          min={200}
                          max={600}
                          step={20}
                          value={store.pergolaWidthCm}
                          onChange={(e) => store.setPergolaDimensions({ width: Number(e.target.value) })}
                          className="w-full accent-sky-500 cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-300">Largo Pérgola</span>
                          <span className="font-mono font-bold text-sky-400">{(store.pergolaLengthCm / 100).toFixed(2)} m</span>
                        </div>
                        <input
                          type="range"
                          min={400}
                          max={2000}
                          step={50}
                          value={store.pergolaLengthCm}
                          onChange={(e) => store.setPergolaDimensions({ length: Number(e.target.value) })}
                          className="w-full accent-sky-500 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-slate-300">Asador / Parrilla de Hormigón</span>
                        <input
                          type="checkbox"
                          checked={store.showBarbecueCounter}
                          onChange={(e) => store.setShowBarbecueCounter(e.target.checked)}
                          className="w-4 h-4 accent-orange-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Módulo Patio Central / Patio Tender */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      Patio Interior / Tender Central
                    </h3>
                    {store.dimensions.length >= 1200 && store.dimensions.width >= 450 && (
                      <input
                        type="checkbox"
                        checked={store.hasCentralPatio}
                        onChange={(e) => store.setHasCentralPatio(e.target.checked)}
                        className="w-4 h-4 accent-emerald-500 cursor-pointer"
                      />
                    )}
                  </div>

                  {store.dimensions.length >= 1200 && store.dimensions.width >= 450 ? (
                    store.hasCentralPatio ? (
                      <div className="space-y-3 pt-1">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-slate-300">Largo Patio Central</span>
                            <span className="font-mono font-bold text-emerald-400">{(store.centralPatioLengthCm / 100).toFixed(2)} m</span>
                          </div>
                          <input
                            type="range"
                            min={150}
                            max={Math.min(500, store.dimensions.length - 600)}
                            step={20}
                            value={store.centralPatioLengthCm}
                            onChange={(e) => store.setCentralPatioDimensions({ length: Number(e.target.value) })}
                            className="w-full accent-emerald-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        El diseño actual permite incorporar un patio interior para separar áreas sociales y privadas (como en Casa TT). Activa la casilla para integrarlo.
                      </p>
                    )
                  ) : (
                    <div className="p-2.5 bg-slate-900/70 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-2">
                      <p>
                        El patio interior requiere una vivienda de diseño longitudinal (largo ≥ 12.00 m y ancho ≥ 4.50 m) para estructurar pabellones vinculados.
                      </p>
                      <button
                        onClick={() => {
                          store.setDimensions({ length: 1400, width: Math.max(500, store.dimensions.width) });
                          store.setHasCentralPatio(true);
                        }}
                        className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded text-xs font-bold transition-all cursor-pointer"
                      >
                        + Habilitar Dimensiones para Patio (Largo 14.0m)
                      </button>
                    </div>
                  )}
                </div>

                {/* Resumen de Área */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Huella en Planta</span>
                    <span className="text-lg font-extrabold text-white font-mono">{metrics.footprintAreaM2.toFixed(1)} m²</span>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Superficie Total</span>
                    <span className="text-lg font-extrabold text-orange-400 font-mono">{metrics.totalBuiltAreaM2.toFixed(1)} m²</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: NORMA ICH & HORMIGÓN */}
            {activeTab === 'ich_standards' && (
              <div className="space-y-5">
                {/* Espesor de Muro */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center justify-between">
                    <span>Espesor de Muros Estructurales</span>
                    <span className="text-orange-400 font-mono">{store.wallThicknessMm} mm</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { t: 100, label: '100 mm (Fluido)', tag: 'Malla Central' },
                      { t: 120, label: '120 mm (Fluido)', tag: 'Doble Malla' },
                      { t: 150, label: '150 mm (Normal)', tag: 'Doble Malla' },
                      { t: 200, label: '200 mm (Carga)', tag: 'Doble Malla' },
                    ].map((opt) => (
                      <button
                        key={opt.t}
                        onClick={() => store.setWallThicknessMm(opt.t as WallThicknessMm)}
                        className={`p-2.5 rounded-lg text-left border transition-all cursor-pointer ${
                          store.wallThicknessMm === opt.t
                            ? 'bg-orange-500/20 border-orange-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="font-bold text-xs">{opt.label}</div>
                        <div className="text-[10px] text-slate-400">{opt.tag}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed italic">
                    *Según punto 21.1.1.7 (b) D.S. N°60: para viviendas de 1 y 2 pisos con R ≤ 4, e_mín = h/25 ≥ 100 mm. En 100mm se exige hormigón fluido (cono ≥ 18 cm).
                  </p>
                </div>

                {/* Disposición de Malla */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Disposición de Armadura en Muro</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => store.setMeshType('malla_central')}
                      className={`p-2.5 rounded-lg text-left border transition-all cursor-pointer ${
                        store.meshType === 'malla_central'
                          ? 'bg-sky-500/20 border-sky-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-xs">Malla Central</div>
                      <div className="text-[10px] text-slate-400">1 capa eje central (100mm)</div>
                    </button>
                    <button
                      onClick={() => store.setMeshType('malla_doble')}
                      className={`p-2.5 rounded-lg text-left border transition-all cursor-pointer ${
                        store.meshType === 'malla_doble'
                          ? 'bg-sky-500/20 border-sky-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-xs">Doble Malla</div>
                      <div className="text-[10px] text-slate-400">2 capas con trabas (≥120mm)</div>
                    </button>
                  </div>
                </div>

                {/* Grado de Hormigón & Cono */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Calidad de Hormigón (NCh170)</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Grado de Resistencia:</label>
                      <select
                        value={store.concreteGrade}
                        onChange={(e) => store.setConcreteGrade(e.target.value as ConcreteGrade)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                      >
                        <option value="G20_H25">G20 (H25) - 20 MPa / 250 kgf/cm² (Estándar Vivienda)</option>
                        <option value="G25_H30">G25 (H30) - 25 MPa / 300 kgf/cm² (Estructural Superior)</option>
                        <option value="G30_H35">G30 (H35) - 30 MPa / 350 kgf/cm² (Alta Resistencia)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Cono de Abrams (Asentamiento):</label>
                      <select
                        value={store.concreteSlump}
                        onChange={(e) => store.setConcreteSlump(e.target.value as ConcreteSlump)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                      >
                        <option value="fluido_18cm">Cono ≥ 18 cm (Hormigón Fluido Bombeable)</option>
                        <option value="normal_10cm">Cono 10 - 12 cm (Hormigón Tradicional)</option>
                        <option value="autocompactante">Hormigón Autocompactante (HAC)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Sistema de Fundación */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Sistema de Fundación (ICH Cap. II-III)</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => store.setFoundationType('losa_fundacion_suples')}
                      className={`w-full p-2.5 rounded-lg text-left border transition-all cursor-pointer ${
                        store.foundationType === 'losa_fundacion_suples'
                          ? 'bg-emerald-500/20 border-emerald-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-xs">Losa de Fundación con Suples</div>
                      <div className="text-[10px] text-slate-400">Losa e=12-15cm + viga borde con diente perimetral (ICH Lám. 17/29)</div>
                    </button>
                    <button
                      onClick={() => store.setFoundationType('cimiento_corrido_radier')}
                      className={`w-full p-2.5 rounded-lg text-left border transition-all cursor-pointer ${
                        store.foundationType === 'cimiento_corrido_radier'
                          ? 'bg-emerald-500/20 border-emerald-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-xs">Cimientos Corridos + Radier Interior</div>
                      <div className="text-[10px] text-slate-400">Cimiento 40x60cm + sobrecimiento + radier e=10cm (ICH Lám. 20/21)</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: VANOS & REFUERZOS SÍSMICOS */}
            {activeTab === 'openings' && (
              <div className="space-y-5">
                {/* Formulario Agregar Vano */}
                <form onSubmit={handleAddOpening} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Plus size={16} className="text-orange-400" />
                    Agregar Puerta / Ventana
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Tipo de Vano:</label>
                      <select
                        value={newOpType}
                        onChange={(e) => {
                          const t = e.target.value as 'door' | 'window';
                          setNewOpType(t);
                          if (t === 'door') {
                            setNewOpHeight(210);
                            setNewOpSill(0);
                            setNewOpWidth(90);
                            setNewOpName('Puerta Acceso');
                          } else {
                            setNewOpHeight(120);
                            setNewOpSill(90);
                            setNewOpWidth(140);
                            setNewOpName('Ventana Dormitorio');
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white"
                      >
                        <option value="window">Ventana</option>
                        <option value="door">Puerta</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Muro de Ubicación:</label>
                      <select
                        value={newOpWall}
                        onChange={(e) => setNewOpWall(e.target.value as ConcreteWallTarget)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white"
                      >
                        <option value="front">Frontal (Sur)</option>
                        <option value="back">Trasero (Norte)</option>
                        <option value="left">Izquierdo (Oeste)</option>
                        <option value="right">Derecho (Este)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Ancho (cm):</label>
                      <input
                        type="number"
                        min={50}
                        max={400}
                        value={newOpWidth}
                        onChange={(e) => setNewOpWidth(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Alto (cm):</label>
                      <input
                        type="number"
                        min={50}
                        max={260}
                        value={newOpHeight}
                        onChange={(e) => setNewOpHeight(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Antepecho:</label>
                      <input
                        type="number"
                        min={0}
                        max={180}
                        disabled={newOpType === 'door'}
                        value={newOpSill}
                        onChange={(e) => setNewOpSill(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white disabled:opacity-40"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Material de Marco:</label>
                      <select
                        value={newOpFrameMaterial}
                        onChange={(e) => setNewOpFrameMaterial(e.target.value as FrameMaterialType)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white"
                      >
                        <option value="pvc_negro">PVC Negro Mate</option>
                        <option value="pvc_blanco">PVC Blanco</option>
                        <option value="madera_roble">Madera Roble</option>
                        <option value="aluminio_mate">Aluminio Mate</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Tipo de Cristal:</label>
                      <select
                        value={newOpGlazingType}
                        onChange={(e) => setNewOpGlazingType(e.target.value as GlazingType)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white"
                      >
                        <option value="termopanel_dvp">Termopanel DVP</option>
                        <option value="vidrio_laminado_seguridad">Laminado Seguridad</option>
                        <option value="termopanel_control_solar">Control Solar Low-E</option>
                        <option value="vidrio_simple_templado">Templado Simple</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Offset desde extremo izquierdo (cm):</label>
                    <input
                      type="number"
                      min={20}
                      max={1200}
                      value={newOpOffset}
                      onChange={(e) => setNewOpOffset(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold uppercase rounded-lg transition-all shadow-md cursor-pointer"
                  >
                    + Insertar Vano & Armadura Sísmica
                  </button>
                </form>

                {/* Lista de Vanos Existentes */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Vanos Configurados ({store.openings.length})</h4>
                  {store.openings.map((op) => (
                    <div
                      key={op.id}
                      className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2 hover:border-slate-700 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span className="text-orange-400 font-mono text-[10px] uppercase px-1.5 py-0.5 bg-orange-500/10 rounded border border-orange-500/20">
                            {op.wall}
                          </span>
                          <span>{op.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {op.frameMaterial === 'pvc_blanco' ? 'PVC Blanco' : op.frameMaterial === 'madera_roble' ? 'Madera' : op.frameMaterial === 'aluminio_mate' ? 'Aluminio' : 'PVC Negro'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Dim: {op.width}x{op.height} cm • Antepecho: {op.sillHeight} cm • Offset: {op.offsetAlongWall} cm
                        </div>
                        <div className="text-[9px] text-emerald-400 font-mono">
                          ✓ Dintel 2Ø12 extendido 50cm + 4 diagonales 45° • Cristal {op.glazingType === 'vidrio_laminado_seguridad' ? 'Laminado' : op.glazingType === 'termopanel_control_solar' ? 'Solar Low-E' : op.glazingType === 'vidrio_simple_templado' ? 'Templado' : 'Termopanel DVP'}
                        </div>
                      </div>

                      <button
                        onClick={() => store.removeOpening(op.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                        title="Eliminar vano"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: CAPAS 3D & DETALLAMIENTO */}
            {activeTab === 'layers' && (
              <div className="space-y-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers size={16} className="text-orange-400" />
                    Capas & Visibilidad 3D
                  </h3>

                  {[
                    { label: 'Malla Electrosoldada AT56-50H', checked: store.showRebarMesh, toggle: store.toggleRebarMesh, desc: 'Cuadrícula 15x15cm en muro' },
                    { label: 'Barras Longitudinales & Trabas de Esquina', checked: store.showEdgeReinforcement, toggle: store.toggleEdgeReinforcement, desc: '4 Ø12 + Trabas Ø8@15 (ICH Lám. 22/34)' },
                    { label: 'Refuerzos Sísmicos en Vanos (45°)', checked: store.showOpeningReinforcement, toggle: store.toggleOpeningReinforcement, desc: 'Diagonales de control de fisuración' },
                    { label: 'Ruedas / Calugas Separadoras Plásticas', checked: store.showSpacers, toggle: store.toggleSpacers, desc: 'Centrado y recubrimiento 20-25mm' },
                    { label: 'Losa Superior / Cubierta', checked: store.showRoof, toggle: store.toggleRoof, desc: 'Losa armada o techumbre' },
                    { label: 'Fundaciones & Emplantillado', checked: store.showFoundation, toggle: store.toggleFoundation, desc: 'Radier / cimientos 3D' },
                    { label: 'Agujas / Pasamuros de Encofrado', checked: store.showFormworkTieHoles, toggle: store.toggleFormworkTieHoles, desc: 'Tapones cónicos de moldaje' },
                    { label: 'Cotas de Dimensión 3D', checked: store.showDimensions, toggle: store.toggleDimensions, desc: 'Anotaciones en metros' },
                  ].map((layer, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <div>
                        <div className="font-bold text-xs text-white">{layer.label}</div>
                        <div className="text-[10px] text-slate-400">{layer.desc}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={layer.checked}
                        onChange={layer.toggle}
                        className="w-4 h-4 accent-orange-500 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: CUBICACIÓN & LISTADO DE MATERIALES (BOM) */}
            {activeTab === 'bom' && (
              <div className="space-y-4">
                {/* Resumen Global */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Cubicación NCh430 / ICH</h3>
                    <span className="text-xs font-mono font-bold text-orange-400">
                      $ {metrics.totalCostClp.toLocaleString('es-CL')} CLP
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block">Hormigón Total:</span>
                      <span className="font-bold text-sky-400 text-xs">{metrics.totalConcreteM3.toFixed(2)} m³</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block">Moldaje Total:</span>
                      <span className="font-bold text-yellow-400 text-xs">{metrics.totalFormworkM2.toFixed(2)} m²</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block">Acero Total:</span>
                      <span className="font-bold text-emerald-400 text-xs">{metrics.totalSteelKg.toFixed(1)} kg</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block">Cuantía Media:</span>
                      <span className="font-bold text-orange-400 text-xs">{metrics.steelRatioKgM3.toFixed(1)} kg/m³</span>
                    </div>
                  </div>
                </div>

                {/* Listado de Partidas */}
                <div className="space-y-2">
                  {metrics.items.map((it) => (
                    <div key={it.id} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                            {it.category}
                          </span>
                          <h5 className="font-bold text-white text-xs mt-1">{it.name}</h5>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-white text-xs block">
                            $ {it.totalPriceClp.toLocaleString('es-CL')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {it.quantity} {it.unit} @ ${it.unitPriceClp.toLocaleString('es-CL')}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400">{it.spec}</p>
                      <div className="text-[9px] text-slate-500 font-mono">Ref: {it.normReference}</div>
                    </div>
                  ))}
                </div>

                {/* Botón Exportar */}
                <button
                  onClick={handleExportExcel}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet size={16} />
                  Exportar Memoria Completa a Excel (.xlsx)
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Modal Diseñador 2D de Planta & Recintos */}
      <ConcreteFloorPlannerModal
        isOpen={store.isFloorPlannerOpen}
        onClose={() => store.setFloorPlannerOpen(false)}
      />
    </div>
  );
}
