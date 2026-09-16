import React, { useState, useEffect } from 'react';
import { useKitchenStore, CabinetType, getCabinetLabel } from '../store/kitchenStore';
import { useStore } from '../store';
import { TexturesSection } from '../components/TexturesSection';
import { KitchenBlueprint } from '../components/KitchenBlueprint';
import { exportKitchenToExcel } from '../utils/kitchenExcelGenerator';
import { exportKitchenLabelsPDF } from '../utils/kitchenLabelsPdfGenerator';
import { FileSpreadsheet, FileText, RotateCcw, QrCode, Loader2 } from 'lucide-react';
import { KitchenScene } from '../components/kitchen/KitchenScene';
import { RoomPlannerModal } from '../components/kitchen/RoomPlannerModal';
import { ResetConfirmModal } from '../components/kitchen/ResetConfirmModal';
import { RoomFinishesSection } from '../components/kitchen/RoomFinishesSection';
import { IslandBackPanelConfigSection } from '../components/kitchen/IslandBackPanelConfigSection';
import { KitchenModuleContextMenu } from '../components/kitchen/KitchenModuleContextMenu';
import { SaveProjectModal } from '../components/common/SaveProjectModal';
import { CountertopConfigModal } from '../components/kitchen/CountertopConfigModal';
import { GolaRegruesoIncompatibilityModal } from '../components/kitchen/GolaRegruesoIncompatibilityModal';
import { KitchenB2BQuoteModal } from '../components/kitchen/KitchenB2BQuoteModal';
import { calculatePolygonArea } from '../utils/roomGeometry';
import { KitchenMepPanel } from '../components/kitchen/KitchenMepPanel';
import { detectMepClashes } from '../utils/mepClashDetection';
import { ArrowLeft, Box, Square, Move3D, PenTool, LayoutGrid, Trash2, RotateCw, Flame, Refrigerator, Flower2, Info, Sparkles, Maximize2, Layers, Palette, ListOrdered, Save, Columns, Sliders, Sun, Moon, Wine, Wrench, DollarSign } from 'lucide-react';

const sectionTitle = "text-xs uppercase tracking-wider text-orange-400 font-bold mb-3 mt-4 first:mt-0";
const labelClass = "text-xs uppercase tracking-wider text-slate-300 font-semibold";
const btnClass = "w-full py-2 px-3 bg-white/5 border border-white/10 rounded-lg text-center cursor-pointer hover:border-orange-500/50 hover:bg-white/10 transition-colors text-xs font-medium text-slate-300";
const activeBtnClass = "w-full py-2 px-3 bg-orange-500/20 border border-orange-500 rounded-lg text-center cursor-pointer text-orange-400 transition-colors text-xs font-bold shadow-[0_0_10px_rgba(249,115,22,0.15)]";

export const DIMENSION_LEVEL_DATA: Record<number, { title: string; desc: string }> = {
  1: { title: '1. Cotas Generales', desc: 'Largo total de corrida, alto y prof.' },
  2: { title: '2. Módulos', desc: 'Ancho individual de cada cuerpo' },
  3: { title: '3. Frentes', desc: 'Puertas y frentes ciegos' },
  4: { title: '4. Cajoneras e Interiores', desc: 'Alturas de cajones y repisas' },
  5: { title: '5. Identificación Módulos', desc: 'N° y nombre de muebles (MOD • Nombre)' },
  6: { title: '6. Medidas Espaciales', desc: 'Muros, vanos, pilares y paso Isla-Base' },
};

const ToggleBtn = ({ active, onClick, label, isLight }: { active: boolean, onClick: () => void, label: string, isLight?: boolean }) => (
  <button 
    onClick={onClick} 
    className={
      active 
        ? isLight
          ? "w-full py-2 px-3 bg-orange-500 text-black border border-orange-600 rounded-lg text-center cursor-pointer transition-colors text-xs font-bold shadow-sm"
          : activeBtnClass 
        : isLight 
          ? "w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-center cursor-pointer hover:border-orange-500 hover:bg-slate-50 transition-colors text-xs font-bold text-slate-800 shadow-sm"
          : btnClass
    }
  >
    {label}
  </button>
);

const SliderControl = ({ label, value, min, max, step = 1, unit = "", onChange, isLight }: { label: string, value: number, min: number, max: number, step?: number, unit?: string, onChange: (val: number) => void, isLight?: boolean }) => (
  <div className="flex flex-col gap-1.5 mb-3">
    <div className={`flex justify-between items-center text-xs tracking-wider ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>
      <span className={isLight ? "font-bold text-slate-900" : "font-semibold"}>{label}</span>
      <span className={`font-mono font-bold text-xs ${isLight ? 'text-orange-600' : 'text-orange-500'}`}>{value}{unit}</span>
    </div>
    <input 
      type="range" 
      min={min} 
      max={max} 
      step={step}
      value={value || 0} 
      onChange={(e) => onChange(Number(e.target.value))}
      className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400 transition-all ${
        isLight ? 'bg-slate-300' : 'bg-white/10'
      }`}
    />
  </div>
);

export function KitchenConfigurator({ onNavigate }: { onNavigate: () => void }) {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('arquify_kitchen_theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('arquify_kitchen_theme', nextTheme);
    } catch {
      // ignore
    }
  };

  const isLight = theme === 'light';

  const { viewMode, setViewMode, toolMode, setToolMode, cabinets, activeCabinetId, updateCabinet, removeCabinet, setActiveCabinet, applyGlobalTexture, showSocle, setShowSocle, roomConfig, setRoomPlannerOpen, architecturalElements, activeArchElementId, addArchitecturalElement, updateArchitecturalElement, removeArchitecturalElement, setActiveArchElement, golaSystem, setGolaSystem, countertopConfig, setCountertopConfig, qstoneCatalog, islandBackConfig, setIslandBackConfig, mepPoints } = useKitchenStore();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isCountertopModalOpen, setIsCountertopModalOpen] = useState(false);
  const [isB2BQuoteOpen, setIsB2BQuoteOpen] = useState(false);
  const [isExportingLabels, setIsExportingLabels] = useState(false);
  const [leftTab, setLeftTab] = useState<'modules' | 'placed' | 'decorations'>('modules');
  const [rightTab, setRightTab] = useState<'module' | 'materials' | 'engineering' | 'mep'>('module');
  const [showIndividualMaterial, setShowIndividualMaterial] = useState(false);
  const globalState = useStore();
  const currentAreaM2 = calculatePolygonArea(roomConfig?.vertices || []);
  const activeArchElement = architecturalElements.find(el => el.id === activeArchElementId);

  const mepClashes = React.useMemo(() => {
    return detectMepClashes(mepPoints, cabinets, countertopConfig);
  }, [mepPoints, cabinets, countertopConfig]);

  const handleExportLabels = async () => {
    setIsExportingLabels(true);
    try {
      await exportKitchenLabelsPDF(cabinets, globalState);
    } catch (err) {
      console.error('Error al exportar etiquetas', err);
      alert('Error al generar las etiquetas de producción.');
    } finally {
      setIsExportingLabels(false);
    }
  };

  // Requisito: Cuando se carguen los muebles, las cotas deben iniciar apagadas
  useEffect(() => {
    useStore.setState({ showDimensions: false });
  }, []);

  // Auto-switch right tab to 'module' when an item is selected
  useEffect(() => {
    if (activeCabinetId || activeArchElementId) {
      setRightTab('module');
    }
  }, [activeCabinetId, activeArchElementId]);

  // Keyboard shortcut listener: Delete or Backspace to delete individual active cabinet or arch element
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeCabinetId) {
        e.preventDefault();
        removeCabinet(activeCabinetId);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && activeArchElementId) {
        e.preventDefault();
        removeArchitecturalElement(activeArchElementId);
      } else if (e.key === 'Escape') {
        setActiveCabinet(null);
        setActiveArchElement(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCabinetId, activeArchElementId, removeCabinet, removeArchitecturalElement, setActiveCabinet, setActiveArchElement]);

  const handleTextureSelect = (url: string, mat: string) => {
    // Protección estricta: Piedras y cuarzos Qstone aplican ÚNICAMENTE a cubiertas
    const isStone =
      mat === 'cuarzo' ||
      mat === 'sinterizado' ||
      mat === 'granito' ||
      mat === 'marmol' ||
      qstoneCatalog.some((p) => p.textureUrl === url || p.id === url || (p.colorHex === url && !url.startsWith('#')));

    if (isStone) {
      const matchedProd =
        qstoneCatalog.find((p) => p.textureUrl === url || p.id === url) || qstoneCatalog[0];
      if (matchedProd) {
        setCountertopConfig({ selectedProductId: matchedProd.id, enabled: true });
      }
      return;
    }

    if (!activeCabinetId) return;
    const part = globalState.targetPart;
    if (part === 'all') {
      updateCabinet(activeCabinetId, {
        structureColor: url, structureMaterial: mat as any,
        doorColor: url, doorMaterial: mat as any,
        drawerFrontColor: url, drawerFrontMaterial: mat as any,
        drawerInnerColor: url, drawerInnerMaterial: mat as any,
        shelfColor: url, shelfMaterial: mat as any,
        backColor: url, backMaterial: mat as any,
        socleColor: url, socleMaterial: mat as any,
      });
    } else if (part === 'structure') updateCabinet(activeCabinetId, { structureColor: url, structureMaterial: mat as any });
    else if (part === 'doors') updateCabinet(activeCabinetId, { doorColor: url, doorMaterial: mat as any });
    else if (part === 'drawerFronts') updateCabinet(activeCabinetId, { drawerFrontColor: url, drawerFrontMaterial: mat as any });
    else if (part === 'drawerInner') updateCabinet(activeCabinetId, { drawerInnerColor: url, drawerInnerMaterial: mat as any });
    else if (part === 'shelves') updateCabinet(activeCabinetId, { shelfColor: url, shelfMaterial: mat as any });
    else if (part === 'back') updateCabinet(activeCabinetId, { backColor: url, backMaterial: mat as any });
    else if (part === 'socle') updateCabinet(activeCabinetId, { socleColor: url, socleMaterial: mat as any });
  };

  const handleGlobalTextureSelect = (url: string, mat: string) => {
    // Protección estricta: Piedras y cuarzos Qstone aplican ÚNICAMENTE a cubiertas
    const isStone =
      mat === 'cuarzo' ||
      mat === 'sinterizado' ||
      mat === 'granito' ||
      mat === 'marmol' ||
      qstoneCatalog.some((p) => p.textureUrl === url || p.id === url || (p.colorHex === url && !url.startsWith('#')));

    if (isStone) {
      const matchedProd =
        qstoneCatalog.find((p) => p.textureUrl === url || p.id === url) || qstoneCatalog[0];
      if (matchedProd) {
        setCountertopConfig({ selectedProductId: matchedProd.id, enabled: true });
      }
      return;
    }

    const part = globalState.targetPart;
    if (part === 'islandBack') {
      setIslandBackConfig({
        enabled: true,
        materialType: 'decorative',
        decorativeColor: url,
        decorativeMaterial: mat as any,
      });
      return;
    }
    applyGlobalTexture(part, url, mat as any);
    if (part === 'structure' || part === 'all') {
      globalState.setStructureColor(url);
      globalState.setStructureMaterial(mat as any);
    }
    if (part === 'doors' || part === 'all') {
      globalState.setDoorColor(url);
      globalState.setDoorMaterial(mat as any);
    }
    if (part === 'drawerFronts' || part === 'all') {
      globalState.setDrawerFrontColor(url);
      globalState.setDrawerFrontMaterial(mat as any);
    }
    if (part === 'drawerInner' || part === 'all') {
      globalState.setDrawerInnerColor(url);
      globalState.setDrawerInnerMaterial(mat as any);
    }
    if (part === 'shelves' || part === 'all') {
      globalState.setShelfColor(url);
      globalState.setShelfMaterial(mat as any);
    }
    if (part === 'back' || part === 'all') {
      globalState.setBackColor(url);
    }
    if (part === 'socle' || part === 'all') {
      globalState.setSocleColor(url);
      globalState.setSocleMaterial(mat as any);
    }
  };

  const activeCabinet = cabinets.find(c => c.id === activeCabinetId);

  return (
    <div className={`flex flex-col h-screen w-screen font-sans overflow-hidden transition-colors ${isLight ? 'bg-[#f8fafc] text-slate-800' : 'bg-[#0A0A0A] text-slate-200'}`}>
      {/* Planos de Fabricación y Despiece CAD/CAM */}
      <KitchenBlueprint />

      {/* Modal de Configuración y Dibujo de Estancia */}
      <RoomPlannerModal />

      {/* Modal de Confirmación para Reiniciar y Partir de Cero */}
      <ResetConfirmModal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} />

      <nav className={`flex items-center justify-between px-6 py-3.5 border-b backdrop-blur-md z-20 transition-colors ${
        isLight ? 'border-slate-200 bg-white/90 shadow-sm' : 'border-white/10 bg-black/60'
      }`}>
        <div className="flex items-center gap-4">
          <button 
            onClick={onNavigate} 
            className={`p-2 rounded-lg transition-colors border ${
              isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
            }`} 
            title="Volver al Inicio"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <span className="font-bellota text-2xl font-bold lowercase text-orange-500 tracking-tight select-none">arquify</span>
            <span className={`text-xs uppercase tracking-widest border-l pl-3 hidden sm:inline ${
              isLight ? 'text-slate-400 border-slate-200' : 'text-slate-500 border-white/10'
            }`}>Cocinas</span>
          </div>
        </div>

        {/* Acceso directo a Área de Cocina, Vistas y Reinicio */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRoomPlannerOpen(true)}
            className={`flex items-center gap-2 px-3.5 py-1.5 border rounded-lg transition-all text-xs font-bold uppercase tracking-wider shadow-sm group ${
              isLight
                ? 'bg-orange-50 hover:bg-orange-100 border-orange-200 hover:border-orange-400 text-orange-600 hover:text-orange-700'
                : 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30 hover:border-orange-500 text-orange-400 hover:text-orange-300'
            }`}
          >
            <Maximize2 size={14} className="text-orange-500 group-hover:scale-110 transition-transform" />
            <span>Área de cocina: <span className={`font-mono underline decoration-orange-500/50 underline-offset-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>{roomConfig.type === 'rectangular' ? 'Rectangular' : roomConfig.type === 'l_shape' ? 'Forma L' : roomConfig.type === 'five_corners' ? '5 Esquinas' : roomConfig.type === 'u_shape' ? 'Forma U' : 'Diseño Libre'}</span> ({currentAreaM2.toFixed(2)} m²)</span>
          </button>

          <div className={`flex p-1 rounded-lg border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-black/50 border-white/10'}`}>
            <button
              onClick={() => setViewMode('2d')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${viewMode === '2d' ? 'bg-orange-500 text-black' : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
            >
              Plano 2D
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${viewMode === '3d' ? 'bg-orange-500 text-black' : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
            >
              Vista 3D
            </button>
          </div>

          {/* Botón selector de Modo Claro / Oscuro */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-amber-400 hover:text-amber-300'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 hover:text-slate-900 shadow-sm'
            }`}
            title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          >
            {theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-slate-700" />}
            <span className="hidden md:inline">{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>

          <button
            onClick={() => setIsB2BQuoteOpen(true)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 border rounded-lg transition-all text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer ${
              isLight
                ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-400 hover:text-amber-300'
            }`}
            title="Cotización Comercial Dual (Costo Fábrica B2B vs Venta Cliente Final)"
          >
            <DollarSign size={14} className="text-amber-500" />
            <span>Cotización B2B</span>
          </button>

          <button
            onClick={() => setIsSaveModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-all text-xs font-bold uppercase tracking-wider shadow-md shadow-orange-600/20 cursor-pointer"
            title="Guardar diseño actual en el Backoffice"
          >
            <Save size={14} />
            <span>Guardar Proyecto</span>
          </button>

          <button
            onClick={() => setIsResetModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500 text-red-400 hover:text-red-300 rounded-lg transition-all text-xs font-bold uppercase tracking-wider"
            title="Borrar todo y partir de cero"
          >
            <RotateCcw size={14} />
            <span>Partir de Cero</span>
          </button>
        </div>
      </nav>
      <main className="flex flex-1 overflow-hidden relative">
         <div className={`w-72 shrink-0 border-r flex flex-col z-10 transition-colors shadow-2xl ${isLight ? 'bg-white border-slate-200 shadow-slate-200' : 'bg-zinc-900 border-white/10'}`}>
            <div className={`p-4 border-b ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
               <h3 className={`text-[10px] uppercase tracking-widest font-bold mb-3 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Herramientas</h3>
               <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setRoomPlannerOpen(true)}
                    className="flex items-center gap-3 p-3 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all bg-[#FACC15] text-black hover:bg-[#eab308] shadow-[0_0_15px_rgba(250,204,21,0.25)]"
                  >
                    <Layers size={16} />
                    <div className="flex flex-col text-left">
                      <span>Área de Cocina</span>
                      <span className="text-[9px] text-zinc-800 font-normal font-mono">{currentAreaM2.toFixed(2)} m² • Muros y Cotas</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setIsCountertopModalOpen(true)}
                    className={`flex items-center gap-3 p-3 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all border cursor-pointer ${
                      countertopConfig.enabled
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                        : isLight
                          ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200 shadow-sm'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <Sparkles size={16} className="text-amber-400 shrink-0" />
                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-1.5">
                        <span>Cubiertas Qstone</span>
                        {countertopConfig.enabled && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        )}
                      </div>
                      <span className="text-[9px] font-normal text-slate-400 font-mono">
                        {countertopConfig.enabled
                          ? `${qstoneCatalog.find(p => p.id === countertopConfig.selectedProductId)?.materialType === 'sinterizado' ? 'Sinterizado 12mm' : 'Cuarzo'} • Faldón ${countertopConfig.regruesoCm}cm`
                          : 'Cuarzos & Sinterizados • Nesting'}
                      </span>
                    </div>
                  </button>

                  <ToolButton isLight={isLight} active={toolMode === 'select'} onClick={() => setToolMode('select')} icon={<Move3D size={16}/>} label="Seleccionar" />
                  <ToolButton isLight={isLight} active={toolMode === 'draw_wall'} onClick={() => { setToolMode('draw_wall'); setViewMode('2d'); }} icon={<PenTool size={16}/>} label="Dibujar Tramo Muro" />
               </div>
            </div>

            {/* Pestañas Catálogo Módulos / En Escena / Acabados */}
            <div className={`grid grid-cols-3 border-b p-2 gap-1.5 transition-colors ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-black/50'}`}>
              <button
                onClick={() => setLeftTab('modules')}
                className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  leftTab === 'modules'
                    ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.25)]'
                    : isLight
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Box size={13} />
                <span>Módulos</span>
              </button>
              <button
                onClick={() => setLeftTab('placed')}
                className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  leftTab === 'placed'
                    ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.25)]'
                    : isLight
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <ListOrdered size={13} />
                <span>Escena</span>
              </button>
              <button
                onClick={() => setLeftTab('decorations')}
                className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  leftTab === 'decorations'
                    ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.25)]'
                    : isLight
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Palette size={13} />
                <span>Acabados</span>
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
               {leftTab === 'modules' ? (
                 <div className="flex flex-col gap-2">
                    <h3 className={`text-xs uppercase tracking-wider font-bold mb-2 ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>Bases</h3>
                    <div className="flex flex-col gap-1 mb-4">
                       <ToolButton isLight={isLight} active={toolMode === 'place_base_1_door'} onClick={() => { setToolMode('place_base_1_door'); setViewMode('3d'); }} icon={<Box size={14}/>} label="1 Puerta" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_base_1_door_1_drawer'} onClick={() => { setToolMode('place_base_1_door_1_drawer'); setViewMode('3d'); }} icon={<Box size={14}/>} label="1 Pta + 1 Cajón" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_base_2_doors'} onClick={() => { setToolMode('place_base_2_doors'); setViewMode('3d'); }} icon={<Box size={14}/>} label="2 Puertas" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_base_4_drawers'} onClick={() => { setToolMode('place_base_4_drawers'); setViewMode('3d'); }} icon={<Box size={14}/>} label="4 Cajones" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_base_2_pot_drawers'} onClick={() => { setToolMode('place_base_2_pot_drawers'); setViewMode('3d'); }} icon={<Box size={14}/>} label="2 Olleros" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_base_sink_u_drawer'} onClick={() => { setToolMode('place_base_sink_u_drawer'); setViewMode('3d'); }} icon={<Box size={14}/>} label="Fregadero Cajón en U" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_base_spice_rack'} onClick={() => { setToolMode('place_base_spice_rack'); setViewMode('3d'); }} icon={<Box size={14}/>} label="Especiero" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_base_wine_rack'} onClick={() => { setToolMode('place_base_wine_rack'); setViewMode('3d'); }} icon={<Wine size={14}/>} label="Botellero Base" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_base_corner_blind'} onClick={() => { setToolMode('place_base_corner_blind'); setViewMode('3d'); }} icon={<Box size={14}/>} label="Esquinero Ciego" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_base_corner_l'} onClick={() => { setToolMode('place_base_corner_l'); setViewMode('3d'); }} icon={<Box size={14}/>} label="Esquinero en L (90x90)" />
                    </div>
                    
                    <h3 className={`text-xs uppercase tracking-wider font-bold mb-2 ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>Torres & Despensas</h3>
                    <div className="flex flex-col gap-1 mb-4">
                       <ToolButton isLight={isLight} active={toolMode === 'place_tall_1_door'} onClick={() => { setToolMode('place_tall_1_door'); setViewMode('3d'); }} icon={<LayoutGrid size={14}/>} label="1 Pta Larga (Repisas)" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_tall_split_2_doors'} onClick={() => { setToolMode('place_tall_split_2_doors'); setViewMode('3d'); }} icon={<LayoutGrid size={14}/>} label="2 Ptas (Línea Base + Alta)" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_tall_oven_micro'} onClick={() => { setToolMode('place_tall_oven_micro'); setViewMode('3d'); }} icon={<LayoutGrid size={14}/>} label="Torre Horno + Micro Empotrado" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_tall_oven_vent'} onClick={() => { setToolMode('place_tall_oven_vent'); setViewMode('3d'); }} icon={<LayoutGrid size={14}/>} label="Torre Hornos Vent. Técnica" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_tall_inner_drawers'} onClick={() => { setToolMode('place_tall_inner_drawers'); setViewMode('3d'); }} icon={<LayoutGrid size={14}/>} label="Despensa Cajones Interiores" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_tall_microwave_niche'} onClick={() => { setToolMode('place_tall_microwave_niche'); setViewMode('3d'); }} icon={<LayoutGrid size={14}/>} label="Nicho Micro Portátil" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_tall_open'} onClick={() => { setToolMode('place_tall_open'); setViewMode('3d'); }} icon={<LayoutGrid size={14}/>} label="Repisas a la Vista" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_tall_wine_rack'} onClick={() => { setToolMode('place_tall_wine_rack'); setViewMode('3d'); }} icon={<Wine size={14}/>} label="Botellero Despensa" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_tall_2_doors'} onClick={() => { setToolMode('place_tall_2_doors'); setViewMode('3d'); }} icon={<LayoutGrid size={14}/>} label="Despensa 2 Puertas" />
                    </div>

                    <h3 className={`text-xs uppercase tracking-wider font-bold mb-2 ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>Murales & Aéreos</h3>
                    <div className="flex flex-col gap-1 mb-4">
                       <ToolButton isLight={isLight} active={toolMode === 'place_wall_1_door'} onClick={() => { setToolMode('place_wall_1_door'); setViewMode('3d'); }} icon={<Square size={14}/>} label="1. Aéreo 1 Puerta" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_wall_2_doors'} onClick={() => { setToolMode('place_wall_2_doors'); setViewMode('3d'); }} icon={<Square size={14}/>} label="2. Aéreo 2 Puertas" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_wall_lift_up'} onClick={() => { setToolMode('place_wall_lift_up'); setViewMode('3d'); }} icon={<Square size={14}/>} label="3. Pta Elevable Aventos" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_wall_lift_up_double'} onClick={() => { setToolMode('place_wall_lift_up_double'); setViewMode('3d'); }} icon={<Square size={14}/>} label="4. Doble Pta Elevable" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_wall_microwave_niche'} onClick={() => { setToolMode('place_wall_microwave_niche'); setViewMode('3d'); }} icon={<Square size={14}/>} label="5. Nicho Micro + Pta Sup" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_wall_open'} onClick={() => { setToolMode('place_wall_open'); setViewMode('3d'); }} icon={<Square size={14}/>} label="6. Repisas a la Vista" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_wall_corner_blind'} onClick={() => { setToolMode('place_wall_corner_blind'); setViewMode('3d'); }} icon={<Square size={14}/>} label="7. Aéreo Esquinero Ciego" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_wall_wine_rack'} onClick={() => { setToolMode('place_wall_wine_rack'); setViewMode('3d'); }} icon={<Wine size={14}/>} label="8. Botellero Aéreo" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_island_wine_rack'} onClick={() => { setToolMode('place_island_wine_rack'); setViewMode('3d'); }} icon={<Wine size={14}/>} label="Botellero Isla" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_island'} onClick={() => { setToolMode('place_island'); setViewMode('3d'); }} icon={<Box size={14}/>} label="Isla Libre" />
                    </div>

                    <h3 className={`text-xs uppercase tracking-wider font-bold mb-2 ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>Decoración & Equipamiento</h3>
                    <div className="flex flex-col gap-1 mb-4">
                       <ToolButton isLight={isLight} active={toolMode === 'place_deco_stove'} onClick={() => { setToolMode('place_deco_stove'); setViewMode('3d'); }} icon={<Flame size={14}/>} label="1. Cocina FDV 90" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_deco_fridge'} onClick={() => { setToolMode('place_deco_fridge'); setViewMode('3d'); }} icon={<Refrigerator size={14}/>} label="2. Refrigerador SBS" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_deco_hood'} onClick={() => { setToolMode('place_deco_hood'); setViewMode('3d'); }} icon={<Sparkles size={14}/>} label="3. Campana FDV Conic 90" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_deco_plant'} onClick={() => { setToolMode('place_deco_plant'); setViewMode('3d'); }} icon={<Flower2 size={14}/>} label="4. Planta Interior" />
                    </div>

                    <h3 className={`text-xs uppercase tracking-wider font-bold mb-2 ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>Elementos Arquitectónicos</h3>
                    <div className="flex flex-col gap-1 mb-4">
                       <ToolButton isLight={isLight} active={toolMode === 'place_arch_door'} onClick={() => { setToolMode('place_arch_door'); setViewMode('3d'); }} icon={<Columns size={14}/>} label="Puerta" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_arch_window'} onClick={() => { setToolMode('place_arch_window'); setViewMode('3d'); }} icon={<Square size={14}/>} label="Ventana" />
                       <ToolButton isLight={isLight} active={toolMode === 'place_arch_pillar'} onClick={() => { setToolMode('place_arch_pillar'); setViewMode('3d'); }} icon={<Maximize2 size={14}/>} label="Pilar / Muro Corto" />
                    </div>
                 </div>
               ) : leftTab === 'placed' ? (
                 <div className="flex flex-col gap-3">
                   <div className="flex items-center justify-between">
                     <div className={`text-[10px] uppercase font-bold tracking-widest ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                       Módulos en Escena ({cabinets.length})
                     </div>
                     {cabinets.length > 0 && (
                       <span className={`text-[9px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>Clic para editar o borrar</span>
                     )}
                   </div>

                   {cabinets.length === 0 ? (
                     <div className={`p-5 rounded-xl border text-center flex flex-col items-center gap-2.5 mt-2 ${
                       isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
                     }`}>
                       <Box size={24} className={isLight ? "text-slate-400" : "text-zinc-500"} />
                       <p className={`text-xs font-medium ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>No hay muebles cargados en la escena</p>
                       <button
                         onClick={() => setLeftTab('modules')}
                         className="mt-1 px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-orange-500/40 transition-colors cursor-pointer"
                       >
                         Ver Catálogo de Módulos
                       </button>
                     </div>
                   ) : (
                     <div className="flex flex-col gap-2">
                       {cabinets.map((cab, idx) => {
                         const isSelected = cab.id === activeCabinetId;
                         const label = getCabinetLabel(cab, idx);
                         return (
                           <div
                             key={cab.id}
                             onClick={() => setActiveCabinet(cab.id)}
                             className={`p-3 rounded-xl border transition-all cursor-pointer group flex flex-col gap-2 ${
                               isSelected
                                 ? isLight
                                   ? 'bg-orange-50 border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.25)]'
                                   : 'bg-orange-500/15 border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.25)]'
                                 : isLight
                                   ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                                   : 'bg-[#18181b] border-white/10 hover:border-white/20 hover:bg-[#202024]'
                             }`}
                           >
                             <div className="flex items-center justify-between gap-2">
                               <div className="flex items-center gap-2 min-w-0">
                                 <span className={`shrink-0 px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold ${
                                   isLight
                                     ? isSelected
                                       ? 'bg-orange-500 text-black border-orange-600'
                                       : 'bg-slate-100 border-slate-300 text-slate-700'
                                     : 'bg-black/50 border-white/10 text-orange-400'
                                 }`}>
                                   MOD {idx + 1}
                                 </span>
                                 <span className={`text-xs font-bold truncate ${
                                   isSelected
                                     ? isLight ? 'text-slate-900 font-extrabold' : 'text-white'
                                     : isLight ? 'text-slate-700 group-hover:text-slate-950' : 'text-zinc-200 group-hover:text-white'
                                 }`}>
                                   {label}
                                 </span>
                               </div>
                               <div className="flex items-center gap-1 shrink-0">
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     const currentRot = cab.rotation || 0;
                                     const nextRot = (currentRot + Math.PI / 2) % (Math.PI * 2);
                                     updateCabinet(cab.id, { rotation: nextRot });
                                   }}
                                   title="Girar 90°"
                                   className={`p-1 rounded transition-colors ${
                                     isLight
                                       ? 'text-slate-400 hover:text-cyan-600 hover:bg-slate-100'
                                       : 'text-zinc-400 hover:text-cyan-400 hover:bg-white/5'
                                   }`}
                                 >
                                   <RotateCw size={13} />
                                 </button>
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     removeCabinet(cab.id);
                                   }}
                                   title="Eliminar este mueble"
                                   className={`p-1 rounded transition-colors ${
                                     isLight
                                       ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                       : 'text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10'
                                   }`}
                                 >
                                   <Trash2 size={13} />
                                 </button>
                               </div>
                             </div>

                             <div className={`flex items-center justify-between text-[10px] font-mono pt-1 border-t ${
                               isLight ? 'border-slate-200 text-slate-500' : 'border-white/5 text-zinc-400'
                             }`}>
                               <span>{cab.width} × {cab.height} × {cab.depth} cm</span>
                               <span className={`text-[9px] uppercase font-sans tracking-wider ${
                                 isLight ? 'text-slate-500' : 'text-zinc-500'
                               }`}>
                                 {cab.type === 'base' ? 'Base' : cab.type === 'tall' ? 'Torre' : cab.type === 'wall' ? 'Aéreo' : cab.type === 'island' ? 'Isla' : 'Equipamiento'}
                               </span>
                             </div>
                           </div>
                         );
                       })}
                     </div>
                   )}
                 </div>
               ) : (
                 <div className="flex flex-col gap-3">
                    <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                       <div className="flex items-center gap-1.5 text-orange-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                          <Palette size={12} />
                          <span>Decorativos Globales</span>
                       </div>
                       <p className="text-[10px] text-slate-300 leading-relaxed">
                          Al seleccionar un decorativo aquí, se actualizarán <strong>todos los muebles de la cocina</strong> automáticamente.
                       </p>
                    </div>

                    <TexturesSection 
                      onSelectTexture={handleGlobalTextureSelect}
                      title="Decorativos de Cocina"
                      badgeText="Toda la Cocina"
                      isLight={isLight}
                    />
                 </div>
               )}
            </div>
         </div>
         <div className={`flex-1 min-w-0 relative transition-colors ${isLight ? 'bg-[#e2e8f0]' : 'bg-[#111]'}`}>
            <KitchenScene theme={theme} />
            <KitchenModuleContextMenu isLight={isLight} />
            {toolMode === 'draw_wall' && (
              <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 backdrop-blur-md px-6 py-3 rounded-full border text-xs font-semibold pointer-events-none uppercase tracking-wider ${
                isLight ? 'bg-white/90 border-slate-300 text-slate-800 shadow-lg' : 'bg-black/80 border-white/10 text-slate-300'
              }`}>
                Haz clic en la grilla para iniciar un muro. Pulsa ESC para cancelar.
              </div>
            )}
            {toolMode.startsWith('place_') && (
              <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 backdrop-blur-md px-6 py-3 rounded-full border text-xs font-semibold pointer-events-none uppercase tracking-wider ${
                isLight ? 'bg-orange-100/90 border-orange-300 text-orange-950 shadow-lg' : 'bg-orange-500/20 border-orange-500/50 text-blue-200'
              }`}>
                Mueve el cursor sobre un muro para imantar. Clic para posicionar.
              </div>
            )}
         </div>
      
    <aside className={`relative z-20 w-96 shrink-0 backdrop-blur-xl border-l h-full flex flex-col pointer-events-auto transition-colors shadow-2xl ${
      isLight ? 'bg-white/95 border-slate-200 shadow-slate-200 text-slate-800' : 'bg-black/70 border-white/10 text-slate-200'
    }`}>
      {/* Selector de Pestañas Superior */}
      <div className={`grid grid-cols-4 border-b p-1.5 gap-1 shrink-0 transition-colors ${
        isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-black/60'
      }`}>
        <button
          onClick={() => setRightTab('module')}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            rightTab === 'module'
              ? 'bg-orange-500 text-black shadow-[0_0_12px_rgba(249,115,22,0.25)]'
              : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Box size={14} />
          <span>Módulo</span>
        </button>
        <button
          onClick={() => setRightTab('materials')}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            rightTab === 'materials'
              ? 'bg-orange-500 text-black shadow-[0_0_12px_rgba(249,115,22,0.25)]'
              : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Palette size={14} />
          <span>Acabados</span>
        </button>
        <button
          onClick={() => setRightTab('engineering')}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            rightTab === 'engineering'
              ? 'bg-orange-500 text-black shadow-[0_0_12px_rgba(249,115,22,0.25)]'
              : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sliders size={14} />
          <span>Herrajes</span>
        </button>
        <button
          onClick={() => setRightTab('mep')}
          className={`relative flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            rightTab === 'mep'
              ? 'bg-cyan-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.35)]'
              : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title="Trazado MEP & Interferencias"
        >
          <Wrench size={14} />
          <span>MEP</span>
          {mepClashes.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[9px] font-black flex items-center justify-center border border-white animate-pulse">
              {mepClashes.length}
            </span>
          )}
        </button>
      </div>

      {/* Contenido Scrollable según Pestaña */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        {rightTab === 'module' && (
          <div>
            {activeArchElementId && activeArchElement ? (
              <div className="mb-4">
                <h2 className={isLight ? "text-xs uppercase tracking-wider text-orange-600 font-bold mb-3 mt-4 first:mt-0" : sectionTitle}>Propiedades Arquitectónicas</h2>
                <div className={`p-4 rounded-xl flex flex-col gap-3 ${
                  isLight ? 'bg-slate-50 border border-slate-200 shadow-sm' : 'bg-white/5 border border-white/10 shadow-inner'
                }`}>
                  <div className={`flex justify-between items-center border-b pb-2.5 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                    <h3 className={`text-xs uppercase tracking-wider font-bold truncate pr-2 ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>
                      {activeArchElement.name}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setToolMode('move_active');
                          setViewMode('3d');
                        }}
                        className="text-xs text-amber-500 hover:text-amber-600 flex items-center gap-1 font-semibold cursor-pointer"
                        title="Mover elemento"
                      >
                        <Move3D size={13} />
                        <span>Mover</span>
                      </button>
                      <button
                        onClick={() => {
                          const currentRot = activeArchElement.rotation || 0;
                          const nextRot = (currentRot + Math.PI / 2) % (Math.PI * 2);
                          updateArchitecturalElement(activeArchElement.id, { rotation: nextRot });
                        }}
                        className="text-xs text-cyan-500 hover:text-cyan-600 flex items-center gap-1 font-semibold cursor-pointer"
                        title="Girar 90°"
                      >
                        <RotateCw size={13} />
                        <span>Girar</span>
                      </button>
                      <button
                        onClick={() => setActiveArchElement(null)}
                        className={`text-xs flex items-center gap-1 font-semibold cursor-pointer ${isLight ? 'text-slate-500 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
                        title="Deseleccionar"
                      >
                        <span>Soltar</span>
                      </button>
                      <button
                        onClick={() => removeArchitecturalElement(activeArchElement.id)}
                        className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-semibold cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 size={13} />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>

                  <div className={`grid ${activeArchElement.type === 'pillar' ? 'grid-cols-3' : 'grid-cols-2'} gap-2 p-2.5 rounded-lg border text-center ${isLight ? 'bg-slate-100 border-slate-300' : 'bg-black/40 border-white/10'}`}>
                    <div>
                      <div className={`text-[10px] uppercase tracking-wider font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Ancho</div>
                      <div className={`font-mono text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{activeArchElement.width} cm</div>
                    </div>
                    <div>
                      <div className={`text-[10px] uppercase tracking-wider font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Alto</div>
                      <div className={`font-mono text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{activeArchElement.height} cm</div>
                    </div>
                    {activeArchElement.type === 'pillar' && (
                      <div>
                        <div className={`text-[10px] uppercase tracking-wider font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Prof.</div>
                        <div className={`font-mono text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{activeArchElement.depth || 30} cm</div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <SliderControl
                      isLight={isLight}
                      label="Ancho (cm)"
                      value={activeArchElement.width}
                      min={30}
                      max={300}
                      step={5}
                      onChange={(val) => updateArchitecturalElement(activeArchElement.id, { width: val })}
                    />
                    <SliderControl
                      isLight={isLight}
                      label="Alto (cm)"
                      value={activeArchElement.height}
                      min={30}
                      max={300}
                      step={5}
                      onChange={(val) => updateArchitecturalElement(activeArchElement.id, { height: val })}
                    />

                    {/* Ajuste milimétrico de posición en el muro */}
                    <SliderControl
                      isLight={isLight}
                      label="Posición en Muro (Desplazamiento cm)"
                      value={Math.round(activeArchElement.offset || 0)}
                      min={-250}
                      max={250}
                      step={1}
                      onChange={(val) => updateArchitecturalElement(activeArchElement.id, { offset: val })}
                    />

                    {activeArchElement.type === 'window' && (
                      <SliderControl
                        isLight={isLight}
                        label="Altura en Muro / Antepecho (cm)"
                        value={activeArchElement.elevation}
                        min={0}
                        max={180}
                        step={5}
                        onChange={(val) => updateArchitecturalElement(activeArchElement.id, { elevation: val })}
                      />
                    )}

                    {activeArchElement.type === 'pillar' && (
                      <SliderControl
                        isLight={isLight}
                        label="Largo / Profundidad (cm)"
                        value={activeArchElement.depth || 30}
                        min={10}
                        max={150}
                        step={5}
                        onChange={(val) => updateArchitecturalElement(activeArchElement.id, { depth: val })}
                      />
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => {
                          setToolMode('move_active');
                          setViewMode('3d');
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                      >
                        <Move3D size={14} />
                        Reubicar / Mover
                      </button>
                      <button
                        onClick={() => setActiveArchElement(null)}
                        className={`px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer border ${
                          isLight
                            ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        Deseleccionar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeCabinetId && activeCabinet ? (
              (activeCabinet.type === 'decoration' || activeCabinet.variant?.startsWith('deco_')) ? (
                <div className="mb-4">
                  <h2 className={isLight ? "text-xs uppercase tracking-wider text-orange-600 font-bold mb-3 mt-4 first:mt-0" : sectionTitle}>Equipamiento Seleccionado</h2>
                  <div className={`p-4 rounded-xl flex flex-col gap-3 ${
                    isLight ? 'bg-slate-50 border border-slate-200 shadow-sm' : 'bg-white/5 border border-white/10 shadow-inner'
                  }`}>
                    <div className={`flex justify-between items-center border-b pb-2.5 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                      <h3 className={`text-xs uppercase tracking-wider font-bold truncate pr-2 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`}>
                        {activeCabinet.variant === 'deco_hood' ? 'Campana FDV New Conic 90'
                          : activeCabinet.variant === 'deco_stove' ? 'Cocina FDV FS Unique 90'
                          : activeCabinet.variant === 'deco_fridge' ? 'Refrigerador FDV SBS'
                          : activeCabinet.variant === 'deco_plant' ? 'Planta Decorativa'
                          : 'Equipamiento Cocina'}
                      </h3>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            const currentRot = activeCabinet.rotation || 0;
                            const nextRot = (currentRot + Math.PI / 2) % (Math.PI * 2);
                            updateCabinet(activeCabinet.id, { rotation: nextRot });
                          }}
                          className="text-xs text-cyan-500 hover:text-cyan-600 flex items-center gap-1 font-semibold cursor-pointer"
                          title="Girar 90°"
                        >
                          <RotateCw size={13} />
                          <span>Girar</span>
                        </button>
                        <button
                          onClick={() => {
                            setToolMode('move_active');
                            setViewMode('3d');
                          }}
                          className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          <Move3D size={13} />
                          <span>Mover</span>
                        </button>
                        <button
                          onClick={() => removeCabinet(activeCabinet.id)}
                          className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-semibold cursor-pointer"
                          title="Eliminar Equipamiento"
                        >
                          <Trash2 size={13} />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>

                    <div className={`grid grid-cols-3 gap-2 p-2.5 rounded-lg border text-center ${isLight ? 'bg-slate-100 border-slate-300' : 'bg-black/40 border-white/10'}`}>
                      <div>
                        <div className={`text-xs uppercase tracking-wider font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Ancho</div>
                        <div className={`font-mono text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{activeCabinet.width} cm</div>
                      </div>
                      <div>
                        <div className={`text-xs uppercase tracking-wider font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Alto</div>
                        <div className={`font-mono text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{activeCabinet.height} cm</div>
                      </div>
                      <div>
                        <div className={`text-xs uppercase tracking-wider font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Fondo</div>
                        <div className={`font-mono text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{activeCabinet.depth} cm</div>
                      </div>
                    </div>

                    {activeCabinet.variant === 'deco_hood' && (
                      <div className={`flex flex-col gap-2 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                        <SliderControl
                          isLight={isLight}
                          label="Elevación Base Campana (desde Piso)"
                          value={Math.round(activeCabinet.position[1] - activeCabinet.height / 2)}
                          min={120}
                          max={170}
                          step={2}
                          unit="cm"
                          onChange={(newBottom) => {
                            updateCabinet(activeCabinet.id, {
                              position: [activeCabinet.position[0], newBottom + activeCabinet.height / 2, activeCabinet.position[2]]
                            });
                          }}
                        />
                      </div>
                    )}

                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => {
                          setToolMode('move_active');
                          setViewMode('3d');
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-orange-500 hover:bg-orange-600 text-black font-bold rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer"
                      >
                        <Move3D size={14} />
                        Reubicar / Mover
                      </button>
                      <button
                        onClick={() => removeCabinet(activeCabinet.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs uppercase font-bold tracking-wider transition-all cursor-pointer border ${
                          isLight
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 shadow-sm'
                            : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        <Trash2 size={14} />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <h2 className={isLight ? "text-xs uppercase tracking-wider text-orange-600 font-bold mb-3 mt-4 first:mt-0" : sectionTitle}>Módulo Seleccionado</h2>
                  <div className={`p-4 rounded-xl flex flex-col gap-3 ${
                    isLight ? 'bg-slate-50 border border-slate-200 shadow-sm' : 'bg-white/5 border border-white/10 shadow-inner'
                  }`}>
                    <div className={`flex justify-between items-center border-b pb-2.5 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                      <h3 className={`text-xs uppercase tracking-wider font-bold truncate pr-2 ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>
                        {activeCabinet.variant?.startsWith('corner_blind') 
                          ? 'Esquinero Ciego' 
                          : activeCabinet.variant === 'tall_1_door' ? 'Despensa 1 Puerta Larga'
                          : activeCabinet.variant === 'tall_split_2_doors' ? 'Despensa 2 Puertas (Línea Base)'
                          : activeCabinet.variant === 'tall_oven_micro' ? 'Torre Horno + Micro Empotrado'
                          : activeCabinet.variant === 'tall_microwave_niche' ? 'Torre Nicho Micro Portátil'
                          : activeCabinet.variant === 'tall_open' ? 'Despensa Abierta (Repisas)'
                          : activeCabinet.variant === 'tall_2_doors' ? 'Despensa 2 Puertas Batientes'
                          : activeCabinet.variant === 'wall_1_door' ? 'Mueble Aéreo 1 Puerta'
                          : activeCabinet.variant === 'wall_2_doors' ? 'Mueble Aéreo 2 Puertas'
                          : activeCabinet.variant === 'wall_lift_up' ? 'Aéreo Puerta Elevable Aventos'
                          : activeCabinet.variant === 'wall_lift_up_double' ? 'Aéreo Doble Puerta Elevable'
                          : activeCabinet.variant === 'wall_microwave_niche' ? 'Aéreo Nicho Micro + Puerta'
                          : activeCabinet.variant === 'wall_open' ? 'Aéreo Repisas a la Vista'
                          : (activeCabinet.variant || activeCabinet.type)}
                      </h3>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            const currentRot = activeCabinet.rotation || 0;
                            const nextRot = (currentRot + Math.PI / 2) % (Math.PI * 2);
                            updateCabinet(activeCabinet.id, { rotation: nextRot });
                          }}
                          className="text-xs text-cyan-500 hover:text-cyan-600 flex items-center gap-1 font-semibold cursor-pointer"
                          title="Girar 90°"
                        >
                          <RotateCw size={13} />
                          <span>Girar</span>
                        </button>
                        <button
                          onClick={() => { setToolMode('move_active'); setViewMode('3d'); }}
                          className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          <Move3D size={13} />
                          <span>Mover</span>
                        </button>
                        <button
                          onClick={() => removeCabinet(activeCabinet.id)}
                          className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-semibold cursor-pointer"
                          title="Eliminar Módulo (Supr)"
                        >
                          <Trash2 size={13} />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>

                    {activeCabinet.type === 'tall' && (
                      <div className={`flex flex-col gap-2 p-2.5 rounded-lg border ${isLight ? 'bg-slate-100/90 border-slate-300' : 'bg-black/40 border-white/10'}`}>
                        <label className={isLight ? "text-xs uppercase tracking-wider text-slate-800 font-bold" : labelClass}>Variante de Torre / Despensa</label>
                        <div className="grid grid-cols-2 gap-1.5 mt-1">
                          {[
                            { id: 'tall_1_door', label: '1 Pta Larga' },
                            { id: 'tall_split_2_doors', label: '2 Ptas Línea Base' },
                            { id: 'tall_oven_micro', label: 'Horno + Micro' },
                            { id: 'tall_microwave_niche', label: 'Nicho Micro' },
                            { id: 'tall_open', label: 'Repisas Vistas' },
                            { id: 'tall_2_doors', label: '2 Puertas' },
                          ].map(t => (
                            <button
                              key={t.id}
                              onClick={() => updateCabinet(activeCabinet.id, { variant: t.id })}
                              className={`py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                isLight
                                  ? ((activeCabinet.variant === t.id || (!activeCabinet.variant && t.id === 'tall_1_door'))
                                      ? 'bg-orange-500 text-black shadow-sm'
                                      : 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500 hover:text-black shadow-sm')
                                  : ((activeCabinet.variant === t.id || (!activeCabinet.variant && t.id === 'tall_1_door'))
                                      ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.2)]'
                                      : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50')
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeCabinet.type === 'wall' && (
                      <div className={`flex flex-col gap-2 p-2.5 rounded-lg border ${isLight ? 'bg-slate-100/90 border-slate-300' : 'bg-black/40 border-white/10'}`}>
                        <label className={isLight ? "text-xs uppercase tracking-wider text-slate-800 font-bold" : labelClass}>Variante de Mueble Aéreo</label>
                        <div className="grid grid-cols-2 gap-1.5 mt-1">
                          {[
                            { id: 'wall_1_door', label: '1 Puerta' },
                            { id: 'wall_2_doors', label: '2 Puertas' },
                            { id: 'wall_lift_up', label: 'Pta Elevable' },
                            { id: 'wall_lift_up_double', label: 'Doble Elevable' },
                            { id: 'wall_microwave_niche', label: 'Nicho Micro' },
                            { id: 'wall_open', label: 'Repisas Vistas' },
                          ].map(t => (
                            <button
                              key={t.id}
                              onClick={() => updateCabinet(activeCabinet.id, { variant: t.id })}
                              className={`py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                isLight
                                  ? ((activeCabinet.variant === t.id || (!activeCabinet.variant && t.id === 'wall_1_door'))
                                      ? 'bg-orange-500 text-black shadow-sm'
                                      : 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500 hover:text-black shadow-sm')
                                  : ((activeCabinet.variant === t.id || (!activeCabinet.variant && t.id === 'wall_1_door'))
                                      ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.2)]'
                                      : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50')
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {(activeCabinet.variant?.startsWith('corner_blind') || activeCabinet.variant === 'corner_blind' || activeCabinet.variant?.startsWith('wall_corner_blind')) && (
                      <div className={`flex flex-col gap-2 p-2.5 rounded-lg border ${isLight ? 'bg-slate-100/90 border-slate-300' : 'bg-black/40 border-white/10'}`}>
                        <label className={isLight ? "text-xs uppercase tracking-wider text-slate-800 font-bold" : labelClass}>Mano / Orientación Esquinero</label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <button
                            onClick={() => updateCabinet(activeCabinet.id, { 
                              variant: activeCabinet.type === 'wall' ? 'wall_corner_blind_right' : 'corner_blind_right' 
                            })}
                            className={`py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                              isLight
                                ? ((!activeCabinet.variant.endsWith('_left'))
                                    ? 'bg-orange-500 text-black shadow-sm'
                                    : 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500 hover:text-black shadow-sm')
                                : ((!activeCabinet.variant.endsWith('_left'))
                                    ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.2)]'
                                    : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50')
                            }`}
                          >
                            Derecho (Ciego Der)
                          </button>
                          <button
                            onClick={() => updateCabinet(activeCabinet.id, { 
                              variant: activeCabinet.type === 'wall' ? 'wall_corner_blind_left' : 'corner_blind_left' 
                            })}
                            className={`py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                              isLight
                                ? ((activeCabinet.variant.endsWith('_left'))
                                    ? 'bg-orange-500 text-black shadow-sm'
                                    : 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500 hover:text-black shadow-sm')
                                : ((activeCabinet.variant.endsWith('_left'))
                                    ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.2)]'
                                    : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50')
                            }`}
                          >
                            Izquierdo (Ciego Izq)
                          </button>
                        </div>
                      </div>
                    )}

                    {activeCabinet.type === 'wall' && (
                      <div className={`p-2.5 rounded-lg border ${isLight ? 'bg-slate-100/90 border-slate-300' : 'bg-black/40 border-white/10'}`}>
                        <SliderControl 
                          isLight={isLight}
                          label="Elevación en Muro (Cota Inferior)" 
                          value={Math.round(activeCabinet.position[1] - activeCabinet.height / 2)} 
                          min={110} 
                          max={180} 
                          step={2} 
                          unit="cm" 
                          onChange={(newBottom) => {
                            updateCabinet(activeCabinet.id, {
                              position: [activeCabinet.position[0], newBottom + activeCabinet.height / 2, activeCabinet.position[2]]
                            });
                          }} 
                        />
                      </div>
                    )}

                    {activeCabinet.variant?.includes('wine_rack') && (() => {
                      const innerW = activeCabinet.width - 3.6;
                      const cols = Math.min(5, Math.max(1, Math.floor((innerW + 1.8) / (10.5 + 1.8))));
                      const colW = (innerW - (cols - 1) * 1.8) / cols;
                      return (
                        <div className={`p-2.5 rounded-lg border text-xs ${isLight ? 'bg-orange-50 border-orange-200 text-orange-950' : 'bg-orange-950/20 border-orange-500/30 text-orange-200'}`}>
                          <div className="font-bold mb-1 flex items-center justify-between">
                            <span>Distribución Botellero:</span>
                            <span className="text-orange-500 font-extrabold">{cols} {cols === 1 ? 'Corrida' : 'Corridas'} (Máx 5)</span>
                          </div>
                          <div className="text-[11px] opacity-90 leading-relaxed">
                            • Ancho libre por celda: <span className="font-mono font-bold">{colW.toFixed(1)} cm</span> (Mín. 10.5 cm)<br/>
                            • Fondo Falso Estándar: <span className="font-mono font-bold">32.0 cm</span> útiles (cámara técnica posterior)
                          </div>
                        </div>
                      );
                    })()}

                    {activeCabinet.variant?.startsWith('wall_corner_blind') && (
                      <div className={`p-2.5 rounded-lg border text-xs ${isLight ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-white/5 border-white/10 text-slate-300'}`}>
                        <div className="font-bold mb-1">Aéreo Esquinero Ciego (Lámina Técnica):</div>
                        <div className="text-[11px] opacity-90 leading-relaxed">
                          • Tapa esquinero frontal: <span className="font-mono font-bold">55 mm</span><br/>
                          • Regleta interior en L: <span className="font-mono font-bold">55 mm</span><br/>
                          • Puerta batiente con bisagras en lateral opuesto
                        </div>
                      </div>
                    )}
                    
                    <SliderControl 
                      isLight={isLight} 
                      label="Ancho del Módulo" 
                      value={activeCabinet.width} 
                      min={
                        activeCabinet.variant === "spice_rack" ? 15 : 
                        activeCabinet.variant?.includes('wine_rack') ? 15 :
                        activeCabinet.variant?.startsWith('wall_corner_blind') ? 60 :
                        (activeCabinet.variant?.startsWith('corner_blind') ? 80 : 30)
                      } 
                      max={
                        activeCabinet.variant?.includes('wine_rack') ? 65 :
                        activeCabinet.variant?.startsWith('wall_corner_blind') ? 100 :
                        (activeCabinet.variant?.startsWith('corner_blind') ? 130 : 120)
                      } 
                      step={5} 
                      unit="cm" 
                      onChange={(v) => updateCabinet(activeCabinet.id, { width: v })} 
                    />
                    <SliderControl isLight={isLight} label="Alto Total" value={activeCabinet.height} min={activeCabinet.type === 'tall' ? 140 : (activeCabinet.type === 'base' ? 70 : 30)} max={activeCabinet.type === 'tall' ? 240 : (activeCabinet.type === 'wall' ? 120 : 100)} step={5} unit="cm" onChange={(v) => updateCabinet(activeCabinet.id, { height: v })} />
                    <SliderControl isLight={isLight} label="Profundidad" value={activeCabinet.depth} min={25} max={80} step={5} unit="cm" onChange={(v) => updateCabinet(activeCabinet.id, { depth: v })} />

                    {/* Botón para eliminar este módulo individual */}
                    <button
                      onClick={() => removeCabinet(activeCabinet.id)}
                      className={`mt-2 w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs uppercase font-bold tracking-wider transition-all cursor-pointer border ${
                        isLight
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 shadow-sm'
                          : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      <Trash2 size={14} />
                      Eliminar Módulo (Supr)
                    </button>

                    {/* Opción para personalizar el acabado exclusivo de este módulo */}
                    <div className={`mt-3 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                      <button
                        onClick={() => setShowIndividualMaterial(!showIndividualMaterial)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs uppercase font-bold tracking-wider transition-colors border cursor-pointer ${
                          isLight
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 shadow-sm'
                            : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Palette size={14} className={isLight ? 'text-orange-600' : 'text-orange-400'} />
                          <span className={isLight ? 'text-slate-900 font-bold' : ''}>Acabado Exclusivo de este Módulo</span>
                        </div>
                        <span className={`text-xs font-bold ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>{showIndividualMaterial ? 'Ocultar' : 'Personalizar'}</span>
                      </button>
                      {showIndividualMaterial && (
                        <div className="mt-3">
                          <TexturesSection 
                            onSelectTexture={handleTextureSelect}
                            title="Acabado Exclusivo de este Módulo"
                            badgeText="Solo Módulo Seleccionado"
                            isLight={isLight}
                          />
                        </div>
                      )}
                    </div>

                    {/* Acceso directo a Revestimiento Trasero de Isla */}
                    {activeCabinet.type === 'island' && (
                      <div className={`mt-3 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Layers size={14} className={isLight ? 'text-orange-600' : 'text-orange-400'} />
                            <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
                              Trasera Continua Isla
                            </span>
                          </div>
                          <button
                            onClick={() => setRightTab('materials')}
                            className="text-[11px] font-bold text-orange-500 hover:text-orange-600 cursor-pointer underline"
                          >
                            Configurar
                          </button>
                        </div>
                        <div className={`p-2 rounded-lg text-[11px] leading-relaxed border ${
                          isLight ? 'bg-slate-100/80 border-slate-200 text-slate-600' : 'bg-white/5 border-white/10 text-slate-300'
                        }`}>
                          {islandBackConfig.enabled ? (
                            <span>
                              Estado: <strong className="text-emerald-500">Activo</strong> ({islandBackConfig.materialType === 'countertop' ? 'Piedra de Cubierta a piso' : `Decorativo ${islandBackConfig.heightMode === 'to_floor' ? 'a piso' : 'con zócalo'}`}).
                            </span>
                          ) : (
                            <span>
                              Estado: <strong className="text-slate-400">Inactivo</strong>. Puedes forrar la parte trasera completa de la isla con decorativo o piedra de cubierta.
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="flex flex-col gap-4">
                <div className={`p-4 rounded-xl flex items-start gap-3 border ${
                  isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-white/5 border-white/10'
                }`}>
                  <Info size={18} className={`${isLight ? 'text-orange-600' : 'text-orange-400'} shrink-0 mt-0.5`} />
                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>Sin Módulo Seleccionado</h4>
                    <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600 font-medium' : 'text-slate-300'}`}>
                      Haz clic en cualquier mueble en el visor 3D para ajustar sus dimensiones, variantes o rotación particular.
                    </p>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-white/5 border-white/10'
                }`}>
                  <h3 className={`text-xs uppercase tracking-wider font-bold mb-3 ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>Visualización de Escena</h3>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <ToggleBtn isLight={isLight} active={globalState.showDimensions} onClick={globalState.toggleDimensions} label="Mostrar Cotas" />
                      {globalState.showDimensions && (
                        <div className="mt-2 flex flex-col gap-1.5 p-2 rounded-lg bg-black/20 border border-white/5">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className={isLight ? "text-slate-700" : "text-slate-200"}>
                              {DIMENSION_LEVEL_DATA[globalState.dimensionLevel]?.title || `Nivel ${globalState.dimensionLevel}`}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-mono font-bold border border-orange-500/30">
                              {globalState.dimensionLevel}/6
                            </span>
                          </div>
                          <input 
                            type="range" 
                            min={1} 
                            max={6} 
                            step={1}
                            value={globalState.dimensionLevel} 
                            onChange={(e) => globalState.setDimensionLevel(Number(e.target.value))}
                            className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400 transition-all ${
                              isLight ? 'bg-slate-300' : 'bg-white/10'
                            }`}
                            title="Nivel de Detalle de Cotas"
                          />
                          <p className={`text-[10px] leading-snug ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            {DIMENSION_LEVEL_DATA[globalState.dimensionLevel]?.desc}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <ToggleBtn isLight={isLight} active={globalState.isTransparent} onClick={globalState.toggleTransparent} label="Transparente" />
                      <ToggleBtn isLight={isLight} active={showSocle} onClick={() => setShowSocle(!showSocle)} label="Zócalo" />
                    </div>
                    <div className={`flex flex-col gap-1.5 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                      <label className={isLight ? "text-xs uppercase tracking-wider text-slate-700 font-bold" : labelClass}>Sistema Riel Gola (Provelcar)</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => setGolaSystem('none')}
                          className={`py-1.5 px-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                            golaSystem === 'none'
                              ? 'bg-orange-500 text-black shadow-sm'
                              : isLight
                                ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500'
                                : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                          }`}
                        >
                          Sin Gola
                        </button>
                        <button
                          onClick={() => setGolaSystem('aluminum')}
                          className={`py-1.5 px-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                            golaSystem === 'aluminum'
                              ? 'bg-orange-500 text-black shadow-sm'
                              : isLight
                                ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500'
                                : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                          }`}
                        >
                          Aluminio
                        </button>
                        <button
                          onClick={() => setGolaSystem('black')}
                          className={`py-1.5 px-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                            golaSystem === 'black'
                              ? 'bg-orange-500 text-black shadow-sm'
                              : isLight
                                ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500'
                                : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                          }`}
                        >
                          Negro Mate
                        </button>
                      </div>
                    </div>

                    <div className={`flex items-center justify-between p-3 rounded-xl border mt-3 ${
                      isLight ? 'bg-amber-50/70 border-amber-200' : 'bg-amber-950/20 border-amber-500/30'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-xs">
                          QS
                        </div>
                        <div>
                          <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            Cubiertas Qstone
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {countertopConfig.enabled
                              ? `${qstoneCatalog.find(p => p.id === countertopConfig.selectedProductId)?.materialType === 'sinterizado' ? 'Sinterizado 12mm' : 'Cuarzo'} (Activa)`
                              : 'Desactivada'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsCountertopModalOpen(true)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition shadow-sm cursor-pointer"
                      >
                        Configurar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {rightTab === 'materials' && (
          <div className="flex flex-col gap-4">
            <IslandBackPanelConfigSection isLight={isLight} />
            <RoomFinishesSection isLight={isLight} />
            <div className={`mt-2 pt-4 border-t ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
              <TexturesSection 
                onSelectTexture={handleGlobalTextureSelect}
                title="Decorativos de Cocina (Global)"
                badgeText="Toda la Cocina"
                isLight={isLight}
              />
            </div>
          </div>
        )}

        {rightTab === 'engineering' && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className={isLight ? "text-xs uppercase tracking-wider text-orange-600 font-bold mb-3 mt-1 first:mt-0" : sectionTitle}>Sistema de Apertura (Perfil Gola)</h2>
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'none', label: 'Sin Gola' },
                    { id: 'aluminum', label: 'Aluminio' },
                    { id: 'black', label: 'Negro Mate' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setGolaSystem(opt.id as any)}
                      className={`py-2 px-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-center ${
                        golaSystem === opt.id
                          ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.25)]'
                          : isLight
                            ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500 shadow-sm'
                            : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className={`text-[11px] leading-relaxed mt-1 ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                  {golaSystem === 'none'
                    ? 'Los muebles se fabrican con tiradores tradicionales estándar y frentes a cota completa.'
                    : `Perfil Provelcar x175 (L superior -35mm) y x176 (C intermedio 40mm) en acabado ${golaSystem === 'black' ? 'Negro Mate' : 'Aluminio Anodizado'}. Descuenta alturas de puertas y cajones automáticamente, suprimiendo tiradores en 3D y cubicación.`}
                </p>
              </div>
            </div>

            <div>
              <h2 className={isLight ? "text-xs uppercase tracking-wider text-orange-600 font-bold mb-3 mt-4 first:mt-0" : sectionTitle}>Tapacantos Industriales</h2>
              <div className="flex flex-col gap-3">
                <div>
                  <label className={isLight ? "text-xs uppercase tracking-wider text-slate-700 font-bold" : labelClass}>Tapacanto Gabinetes (mm)</label>
                  <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                    {[0.5, 1.0, 1.5, 2.0].map((t) => (
                      <button 
                        key={t}
                        onClick={() => globalState.setEdgeBandingThicknessCabinets(t as any)}
                        className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                          globalState.edgeBandingThicknessCabinets === t 
                            ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.25)]' 
                            : isLight
                              ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500 shadow-sm'
                              : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                        }`}
                      >
                        {t.toFixed(1)}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className={isLight ? "text-xs uppercase tracking-wider text-slate-700 font-bold" : labelClass}>Tapacanto Frentes (mm)</label>
                  <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                    {[0.5, 1.0, 1.5, 2.0].map((t) => (
                      <button 
                        key={t}
                        onClick={() => globalState.setEdgeBandingThicknessFronts(t as any)}
                        className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                          globalState.edgeBandingThicknessFronts === t 
                            ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.25)]' 
                            : isLight
                              ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500 shadow-sm'
                              : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                        }`}
                      >
                        {t.toFixed(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className={isLight ? "text-xs uppercase tracking-wider text-orange-600 font-bold mb-3 mt-4 first:mt-0" : sectionTitle}>Armado y Sujeción</h2>
              <div className="flex flex-col gap-3">
                <div>
                  <label className={isLight ? "text-xs uppercase tracking-wider text-slate-700 font-bold" : labelClass}>Tipo de Ensamblaje Estructura</label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    <button 
                      onClick={() => globalState.setAssemblyType('spax')}
                      className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                        globalState.assemblyType === 'spax' 
                          ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.25)]' 
                          : isLight
                            ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500 shadow-sm'
                            : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                      }`}
                    >
                      Soberbio / Spax
                    </button>
                    <button 
                      onClick={() => globalState.setAssemblyType('minifix')}
                      className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                        globalState.assemblyType === 'minifix' 
                          ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.25)]' 
                          : isLight
                            ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500 shadow-sm'
                            : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                      }`}
                    >
                      Minifix
                    </button>
                  </div>
                </div>

                <div>
                  <label className={isLight ? "text-xs uppercase tracking-wider text-slate-700 font-bold" : labelClass}>Herrajes de Cajón</label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    <button 
                      onClick={() => globalState.setDrawerHardware('Provelcar')}
                      className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                        globalState.drawerHardware === 'Provelcar' 
                          ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.25)]' 
                          : isLight
                            ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500 shadow-sm'
                            : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                      }`}
                    >
                      Provelcar
                    </button>
                    <button 
                      onClick={() => globalState.setDrawerHardware('Hafele')}
                      className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                        globalState.drawerHardware === 'Hafele' 
                          ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.25)]' 
                          : isLight
                            ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500 shadow-sm'
                            : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                      }`}
                    >
                      Häfele
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className={isLight ? "text-xs uppercase tracking-wider text-slate-700 font-bold" : labelClass}>Armado de Cajón</label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    <button 
                      onClick={() => globalState.setDrawerAssemblyType('spax')}
                      className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                        globalState.drawerAssemblyType === 'spax' 
                          ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.25)]' 
                          : isLight
                            ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500 shadow-sm'
                            : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                      }`}
                    >
                      Soberbio / Spax
                    </button>
                    <button 
                      onClick={() => globalState.setDrawerAssemblyType('minifix')}
                      className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                        globalState.drawerAssemblyType === 'minifix' 
                          ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.25)]' 
                          : isLight
                            ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500 shadow-sm'
                            : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                      }`}
                    >
                      Minifix
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className={isLight ? "text-xs uppercase tracking-wider text-orange-600 font-bold mb-3 mt-4 first:mt-0" : sectionTitle}>Visualización y Entorno</h2>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <ToggleBtn isLight={isLight} active={globalState.showDimensions} onClick={globalState.toggleDimensions} label="Mostrar Cotas" />
                  {globalState.showDimensions && (
                    <div className="mt-1.5 flex flex-col gap-1 p-2 rounded-lg bg-black/20 border border-white/5">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className={isLight ? "text-slate-700" : "text-slate-200"}>
                          {DIMENSION_LEVEL_DATA[globalState.dimensionLevel]?.title || `Nivel ${globalState.dimensionLevel}`}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-mono font-bold border border-orange-500/30">
                          {globalState.dimensionLevel}/6
                        </span>
                      </div>
                      <input 
                        type="range" 
                        min={1} 
                        max={6} 
                        step={1}
                        value={globalState.dimensionLevel} 
                        onChange={(e) => globalState.setDimensionLevel(Number(e.target.value))}
                        className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400 transition-all ${
                          isLight ? 'bg-slate-300' : 'bg-white/10'
                        }`}
                        title="Nivel de Detalle de Cotas"
                      />
                      <p className={`text-[10px] leading-snug ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        {DIMENSION_LEVEL_DATA[globalState.dimensionLevel]?.desc}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <ToggleBtn isLight={isLight} active={globalState.isTransparent} onClick={globalState.toggleTransparent} label="Transparente" />
                  <ToggleBtn isLight={isLight} active={showSocle} onClick={() => setShowSocle(!showSocle)} label="Zócalo" />
                </div>
              </div>
            </div>
          </div>
        )}

        {rightTab === 'mep' && (
          <div className="h-full">
            <KitchenMepPanel isLight={isLight} />
          </div>
        )}
      </div>

      {/* Dock de Fabricación Fijo Inferior (Siempre visible) */}
      <div className={`p-4 border-t shrink-0 flex flex-col gap-2.5 backdrop-blur-md transition-colors ${
        isLight ? 'border-slate-200 bg-slate-50/95 shadow-lg' : 'border-white/10 bg-black/90'
      }`}>
        <button 
          onClick={() => setIsB2BQuoteOpen(true)}
          className="flex items-center justify-center gap-2.5 w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl transition-all text-xs uppercase tracking-wider font-bold shadow-lg shadow-orange-600/20 active:scale-[0.99] cursor-pointer"
        >
          <DollarSign size={16} />
          <span>Cotización Dual B2B & Retail</span>
        </button>

        <button 
          onClick={exportKitchenToExcel} 
          className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all text-xs uppercase tracking-wider font-bold shadow-md shadow-emerald-600/20 active:scale-[0.99] cursor-pointer"
        >
          <FileSpreadsheet size={16} />
          <span>Exportar Excel CAD/CAM</span>
        </button>
        
        <button 
          onClick={() => globalState.setIsPrinting(true)} 
          className={`flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl transition-all text-xs uppercase tracking-wider font-bold cursor-pointer active:scale-[0.99] ${
            isLight
              ? 'bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700'
              : 'bg-rose-600/20 border border-rose-500/40 hover:bg-rose-600/30 text-rose-300 hover:text-white'
          }`}
        >
          <FileText size={15} />
          <span>Planos de Fabricación (PDF)</span>
        </button>

        <button 
          onClick={handleExportLabels}
          disabled={isExportingLabels}
          className={`flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl transition-all text-xs uppercase tracking-wider font-bold cursor-pointer active:scale-[0.99] disabled:opacity-50 ${
            isLight
              ? 'bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-700'
              : 'bg-purple-600/20 border border-purple-500/40 hover:bg-purple-600/30 text-purple-300 hover:text-white'
          }`}
          title="Descargar PDF con etiquetas adhesivas y códigos QR de trazabilidad para cada pieza"
        >
          {isExportingLabels ? (
            <>
              <Loader2 size={15} className="animate-spin text-purple-400" />
              <span>Generando Etiquetas...</span>
            </>
          ) : (
            <>
              <QrCode size={15} />
              <span>Etiquetas CNC (QR)</span>
            </>
          )}
        </button>
      </div>

    </aside>
   </main>

   {/* Modal Guardar Proyecto */}
   <SaveProjectModal
     isOpen={isSaveModalOpen}
     onClose={() => setIsSaveModalOpen(false)}
     projectType="kitchen"
     defaultName="Proyecto Cocina Arquify"
     estimatedCost={3800000}
     projectData={{
       cabinets,
       roomConfig,
       showSocle,
       structureColor: globalState.structureColor,
       doorColor: globalState.doorColor,
       thickness: globalState.thickness,
     }}
     onSaved={(id) => {
       console.log('Proyecto de cocina guardado con ID:', id);
     }}
   />

   {/* Modal Cubiertas Qstone */}
   <CountertopConfigModal
     isOpen={isCountertopModalOpen}
     onClose={() => setIsCountertopModalOpen(false)}
     isLight={isLight}
   />

   {/* Modal Popup Alerta Incompatibilidad Riel Gola vs Regrueso */}
   <GolaRegruesoIncompatibilityModal isLight={isLight} />

   {/* Modal Cotización Comercial Dual B2B (Fábrica vs Cliente PVP) */}
   <KitchenB2BQuoteModal
     isOpen={isB2BQuoteOpen}
     onClose={() => setIsB2BQuoteOpen(false)}
   />
    </div>
  );
}

function ToolButton({ active, onClick, icon, label, isLight }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, isLight?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg text-xs uppercase tracking-wider transition-all border cursor-pointer ${
        active 
          ? 'bg-orange-500/20 border-orange-500 text-orange-500 font-bold shadow-[0_0_10px_rgba(249,115,22,0.15)]' 
          : isLight 
            ? 'bg-slate-100 border-slate-300 text-slate-900 font-bold hover:bg-slate-200 hover:text-black hover:border-slate-400 shadow-sm'
            : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/5 hover:text-slate-200 font-semibold'
      }`}
    >
      <span className={`shrink-0 ${active ? 'text-orange-500' : isLight ? 'text-slate-800' : 'text-slate-400'}`}>{icon}</span>
      <span className="text-left leading-tight">{label}</span>
    </button>
  );
}
