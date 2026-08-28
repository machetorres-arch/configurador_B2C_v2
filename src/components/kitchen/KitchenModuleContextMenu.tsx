import React, { useState, useEffect } from 'react';
import { useKitchenStore, CabinetType } from '../../store/kitchenStore';
import { useStore, PartType } from '../../store';
import { SlidersHorizontal, X, RefreshCw, ArrowUpDown, ArrowLeftRight, Upload, Trash2, RotateCw, Move3D, DoorOpen, DoorClosed, Layers } from 'lucide-react';
import { get, set } from 'idb-keyval';

const DEFAULT_TEXTURES = [
  { id: 'def_mas_blanco', name: 'Masisa Blanco', url: '#FFFFFF' },
  { id: 'def_mas_negro', name: 'Masisa Negro', url: '#171717' },
  { id: 'def_abet_2831', name: 'Abet Broccato 2831', url: '/textures/abet-broccato-2831.svg' },
  { id: 'def_abet_2824', name: 'Abet Fiore Pop 2824', url: '/textures/abet-fiore-pop-2824.svg' },
  { id: 'def_wood_grain', name: 'Veta Madera Clara', url: '/textures/light-wood-grain.svg' }
];

export function KitchenModuleContextMenu() {
  const { activeCabinetId, cabinets, updateCabinet, removeCabinet, setActiveCabinet, setToolMode, setViewMode } = useKitchenStore();
  const globalStore = useStore();
  const [showCatalog, setShowCatalog] = useState(false);
  const [targetZone, setTargetZone] = useState<PartType>('doors');
  const [uploading, setUploading] = useState(false);
  const [localTextures, setLocalTextures] = useState<any[]>([]);

  useEffect(() => {
    loadLocalTextures();
  }, []);

  const loadLocalTextures = async () => {
    try {
      const stored = await get('custom_textures');
      if (stored) {
        setLocalTextures(stored);
        globalStore.setCustomTextures(stored);
      }
    } catch (e) {
      console.error('Error loading textures from IndexedDB', e);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result as string;
      const newTexture = {
        id: Date.now().toString(),
        name: file.name,
        url: base64Url,
      };

      const updatedTextures = [newTexture, ...localTextures];
      setLocalTextures(updatedTextures);
      globalStore.setCustomTextures(updatedTextures);

      await set('custom_textures', updatedTextures);
      setUploading(false);
      e.target.value = '';
    };
    reader.onerror = () => {
      alert("Error al leer el archivo");
      setUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleDeleteTexture = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedTextures = localTextures.filter(t => t.id !== id);
    setLocalTextures(updatedTextures);
    globalStore.setCustomTextures(updatedTextures);
    await set('custom_textures', updatedTextures);
  };

  if (!activeCabinetId) return null;
  const activeCabinet = cabinets.find(c => c.id === activeCabinetId);
  if (!activeCabinet) return null;

  const isDecoration = activeCabinet.type === 'decoration' || activeCabinet.variant?.startsWith('deco_');

  if (isDecoration) {
    const decoTitle =
      activeCabinet.variant === 'deco_hood'
        ? 'Campana FDV New Conic 90'
        : activeCabinet.variant === 'deco_stove'
        ? 'Cocina FDV FS Unique 90'
        : activeCabinet.variant === 'deco_fridge'
        ? 'Refrigerador FDV SBS'
        : activeCabinet.variant === 'deco_plant'
        ? 'Planta Decorativa'
        : 'Elemento de Equipamiento';

    return (
      <div className="absolute top-6 right-6 w-80 bg-[#141416]/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/80 rounded-2xl overflow-hidden z-50 flex flex-col pointer-events-auto">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between bg-black/40 shrink-0">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider truncate pr-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 animate-pulse"></span>
            <span className="truncate">{decoTitle}</span>
          </div>
          <button
            onClick={() => setActiveCabinet(null)}
            className="text-zinc-400 hover:text-white transition-colors p-1 rounded hover:bg-white/5"
            title="Deseleccionar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3.5">
          {/* Dimensiones */}
          <div className="grid grid-cols-3 gap-2 bg-white/5 p-2.5 rounded-xl border border-white/10 text-center">
            <div>
              <div className="text-[9px] uppercase tracking-widest text-slate-400">Ancho</div>
              <div className="text-white font-mono text-xs font-bold">{activeCabinet.width} cm</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-widest text-slate-400">Alto</div>
              <div className="text-white font-mono text-xs font-bold">{activeCabinet.height} cm</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-widest text-slate-400">Fondo</div>
              <div className="text-white font-mono text-xs font-bold">{activeCabinet.depth} cm</div>
            </div>
          </div>

          {/* Acciones principales: Mover y Girar */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setToolMode('move_active');
                setViewMode('3d');
              }}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-orange-500 hover:bg-orange-600 text-black font-bold rounded-xl text-xs uppercase tracking-wider shadow-[0_0_12px_rgba(249,115,22,0.3)] transition-all cursor-pointer"
            >
              <Move3D size={15} />
              Mover
            </button>
            <button
              onClick={() => {
                const currentRot = activeCabinet.rotation || 0;
                const nextRot = (currentRot + Math.PI / 2) % (Math.PI * 2);
                updateCabinet(activeCabinet.id, { rotation: nextRot });
              }}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs uppercase tracking-wider border border-white/10 transition-all cursor-pointer"
            >
              <RotateCw size={15} className="text-cyan-400" />
              Girar 90°
            </button>
          </div>

          {/* Si es campana: regular elevación */}
          {activeCabinet.variant === 'deco_hood' && (
            <div className="flex flex-col gap-2 p-2.5 bg-black/40 border border-white/10 rounded-xl">
              <div className="flex justify-between items-center text-[10px] text-zinc-300">
                <span className="uppercase font-bold tracking-wider text-slate-400">Elevación Base (piso)</span>
                <span className="font-mono font-bold text-orange-400">
                  {Math.round(activeCabinet.position[1] - activeCabinet.height / 2)} cm
                </span>
              </div>
              <input
                type="range"
                min={120}
                max={170}
                step={2}
                value={Math.round(activeCabinet.position[1] - activeCabinet.height / 2)}
                onChange={(e) => {
                  const newBottom = Number(e.target.value);
                  updateCabinet(activeCabinet.id, {
                    position: [activeCabinet.position[0], newBottom + activeCabinet.height / 2, activeCabinet.position[2]]
                  });
                }}
                className="w-full accent-orange-500 cursor-pointer"
              />
            </div>
          )}

          {/* Botón Eliminar */}
          <button
            onClick={() => removeCabinet(activeCabinet.id)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs uppercase font-bold tracking-wider transition-all cursor-pointer"
          >
            <Trash2 size={14} />
            Eliminar Equipamiento
          </button>
        </div>
      </div>
    );
  }

  const cabinetIndex = cabinets.findIndex(c => c.id === activeCabinetId);

  const handleOverride = (key: string, value: any) => {
    updateCabinet(activeCabinetId, { [key]: value });
  };

  const handleClearOverrides = () => {
    updateCabinet(activeCabinetId, {
      structureColor: undefined,
      doorColor: undefined,
      drawerFrontColor: undefined,
      drawerInnerColor: undefined,
      shelfColor: undefined,
      backColor: undefined,
      socleColor: undefined,
      structureMaterial: undefined,
      doorMaterial: undefined,
      drawerFrontMaterial: undefined,
      drawerInnerMaterial: undefined,
      shelfMaterial: undefined,
      backMaterial: undefined,
      socleMaterial: undefined,
      grainDirection: undefined,
      grainElements: undefined,
      hplBalancer: undefined,
      isOpen: false,
      openElements: undefined
    });
  };

  const toggleGrain = (key: string) => {
    const newGrainElements = { ...(activeCabinet.grainElements || {}) };
    const current = newGrainElements[key] ?? activeCabinet.grainDirection ?? 'vertical';
    const next = current === 'vertical' ? 'horizontal' : 'vertical';

    newGrainElements[key] = next;
    updateCabinet(activeCabinetId, { grainElements: newGrainElements });
  };

  const getGrain = (key: string) => {
    return activeCabinet.grainElements?.[key] ?? activeCabinet.grainDirection ?? 'vertical';
  };

  const isElementOpen = (key: string) => {
    return activeCabinet.openElements?.[key] ?? activeCabinet.isOpen ?? false;
  };

  const toggleElementOpen = (key: string) => {
    const newOpenElements = { ...(activeCabinet.openElements || {}) };
    const current = isElementOpen(key);
    newOpenElements[key] = !current;
    updateCabinet(activeCabinetId, { openElements: newOpenElements });
  };

  const toggleAllOpen = () => {
    const currentAnyOpen = getElementsList().some(el => isElementOpen(el.id));
    const nextState = !currentAnyOpen;
    
    // Set all individual element states to match
    const newOpenElements: Record<string, boolean> = {};
    getElementsList().forEach(el => {
      newOpenElements[el.id] = nextState;
    });

    updateCabinet(activeCabinetId, { isOpen: nextState, openElements: newOpenElements });
  };

  const handleApplyTexture = (url: string, name: string) => {
    const nameLower = name.toLowerCase();
    const isHPL = nameLower.includes('abet') || nameLower.includes('hpl') || nameLower.includes('laminati');
    const mat: 'melamina' | 'hpl' = isHPL ? 'hpl' : 'melamina';

    switch (targetZone) {
      case 'structure':
        updateCabinet(activeCabinetId, { structureColor: url, structureMaterial: mat });
        break;
      case 'doors':
        updateCabinet(activeCabinetId, { doorColor: url, doorMaterial: mat });
        break;
      case 'drawerFronts':
        updateCabinet(activeCabinetId, { drawerFrontColor: url, drawerFrontMaterial: mat });
        break;
      case 'drawerInner':
        updateCabinet(activeCabinetId, { drawerInnerColor: url, drawerInnerMaterial: mat });
        break;
      case 'shelves':
        updateCabinet(activeCabinetId, { shelfColor: url, shelfMaterial: mat });
        break;
      case 'back':
        updateCabinet(activeCabinetId, { backColor: url, backMaterial: mat });
        break;
      case 'socle':
        updateCabinet(activeCabinetId, { socleColor: url, socleMaterial: mat });
        break;
    }
  };

  const allTextures = [...DEFAULT_TEXTURES, ...localTextures];
  const masisaTextures = allTextures.filter(t => t.name.toLowerCase().includes('masisa'));
  const abetTextures = allTextures.filter(t => {
    const n = t.name.toLowerCase();
    return n.includes('abet') || n.includes('laminati') || n.includes('hpl');
  });
  const otherTextures = allTextures.filter(t => {
    const n = t.name.toLowerCase();
    return !n.includes('masisa') && !n.includes('abet') && !n.includes('laminati') && !n.includes('hpl');
  });

  // Determinar elementos configurables de piezas según la variante del mueble de cocina
  const variant = activeCabinet.variant || (activeCabinet.width > 60 ? '2_doors' : '1_door');
  const is4Drawers = variant === '4_drawers';
  const is2PotDrawers = variant === '2_pot_drawers';
  const is1Door1Drawer = variant === '1_door_1_drawer';
  const is2Doors = variant === '2_doors' || variant === 'tall_2_doors';
  const is1Door = variant === '1_door' || variant === 'wall_1_door' || variant === 'tall_1_door';
  const isSplit2Doors = variant === 'tall_split_2_doors';
  const isLiftUp = variant === 'wall_lift_up' || variant === 'wall_microwave_niche';
  const isLiftUpDouble = variant === 'wall_lift_up_double';
  const isOvenMicro = variant === 'tall_oven_micro';
  const isSpiceRack = variant === 'spice_rack';
  const isCornerBlind = variant === 'corner_blind' || variant === 'corner_blind_left' || variant === 'corner_blind_right';

  const getElementsList = () => {
    const elements: { id: string; label: string; type: 'door' | 'drawer' }[] = [];
    if (is2Doors) {
      elements.push({ id: 'door-0', label: 'Puerta Izquierda', type: 'door' });
      elements.push({ id: 'door-1', label: 'Puerta Derecha', type: 'door' });
    } else if (is1Door || isCornerBlind) {
      elements.push({ id: 'door-0', label: 'Puerta Frontal', type: 'door' });
    } else if (isSplit2Doors) {
      elements.push({ id: 'door-upper', label: 'Puerta Superior', type: 'door' });
      elements.push({ id: 'door-lower', label: 'Puerta Inferior', type: 'door' });
    } else if (isLiftUpDouble) {
      elements.push({ id: 'door-upper', label: 'Pta. Elevable Sup.', type: 'door' });
      elements.push({ id: 'door-lower', label: 'Pta. Elevable Inf.', type: 'door' });
    } else if (variant === 'wall_microwave_niche') {
      elements.push({ id: 'door-top', label: 'Pta. Superior Elevable', type: 'door' });
    } else if (isLiftUp) {
      elements.push({ id: 'door-lift', label: 'Puerta Elevable', type: 'door' });
    } else if (isOvenMicro || variant === 'tall_microwave_niche') {
      elements.push({ id: 'door-lower', label: 'Puerta Inferior', type: 'door' });
      elements.push({ id: 'door-top', label: 'Puerta Superior', type: 'door' });
    } else if (is1Door1Drawer) {
      elements.push({ id: 'drawer-0', label: 'Cajón Superior', type: 'drawer' });
      elements.push({ id: 'door-0', label: 'Puerta Inferior', type: 'door' });
    } else if (is4Drawers) {
      elements.push({ id: 'drawer-0', label: 'Cajón 1 (Superior)', type: 'drawer' });
      elements.push({ id: 'drawer-1', label: 'Cajón 2', type: 'drawer' });
      elements.push({ id: 'drawer-2', label: 'Cajón 3', type: 'drawer' });
      elements.push({ id: 'drawer-3', label: 'Cajón 4 (Inferior)', type: 'drawer' });
    } else if (is2PotDrawers) {
      elements.push({ id: 'drawer-0', label: 'Cacerolero Superior', type: 'drawer' });
      elements.push({ id: 'drawer-1', label: 'Cacerolero Inferior', type: 'drawer' });
    } else if (isSpiceRack) {
      elements.push({ id: 'drawer-0', label: 'Especiero Extraíble', type: 'drawer' });
    }
    return elements;
  };

  const interactiveElements = getElementsList();
  const hasInteractiveElements = !isDecoration && interactiveElements.length > 0;
  const anyElementOpen = interactiveElements.some(el => isElementOpen(el.id));

  const renderTextureButton = (tex: any, showDelete: boolean) => (
    <div key={tex.id} className="relative group">
      <button 
        onClick={() => handleApplyTexture(tex.url, tex.name)}
        className="flex flex-col items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-lg hover:border-orange-500/60 transition-colors w-full"
        title={tex.name}
      >
        <div 
          className="w-full aspect-square rounded-md border border-white/20 group-hover:shadow-[0_0_10px_rgba(249,115,22,0.3)] bg-cover bg-center"
          style={tex.url.startsWith('#') ? { backgroundColor: tex.url } : { backgroundImage: `url('${tex.url}')` }}
        />
        <span className="text-[8px] uppercase tracking-wider text-slate-400 truncate w-full text-center">
          {tex.name.length > 14 ? tex.name.substring(0, 14) + '...' : tex.name}
        </span>
      </button>
      {showDelete && !tex.id.startsWith('def_') && (
        <button 
          onClick={(e) => handleDeleteTexture(tex.id, e)}
          className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={10} />
        </button>
      )}
    </div>
  );

  return (
    <div className="absolute top-6 right-6 w-80 max-h-[calc(100vh-100px)] bg-[#141416]/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/80 rounded-2xl overflow-hidden z-50 flex flex-col pointer-events-auto">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between bg-black/40 shrink-0">
        <div className="flex items-center gap-2 text-orange-500 font-bold text-xs uppercase tracking-wider">
          <SlidersHorizontal size={16} className="text-orange-500" />
          <span className="text-orange-500 tracking-wider">
            MÓDULO ACTIVO {cabinetIndex >= 0 ? `(MOD ${cabinetIndex + 1})` : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => {
              const currentRot = activeCabinet.rotation || 0;
              const nextRot = (currentRot + Math.PI / 2) % (Math.PI * 2);
              updateCabinet(activeCabinet.id, { rotation: nextRot });
            }}
            title="Girar 90°"
            className="text-zinc-400 hover:text-cyan-400 transition-colors p-1 rounded hover:bg-white/5"
          >
            <RotateCw size={15} />
          </button>
          <button 
            onClick={() => { setToolMode('move_active'); setViewMode('3d'); }}
            title="Mover Módulo"
            className="text-zinc-400 hover:text-orange-400 transition-colors p-1 rounded hover:bg-white/5"
          >
            <Move3D size={15} />
          </button>
          <button 
            onClick={() => removeCabinet(activeCabinet.id)} 
            title="Eliminar Módulo"
            className="text-zinc-400 hover:text-rose-400 transition-colors p-1 rounded hover:bg-white/5"
          >
            <Trash2 size={15} />
          </button>
          <button 
            onClick={() => setActiveCabinet(null)} 
            className="text-zinc-400 hover:text-white transition-colors p-1 rounded hover:bg-white/5"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
        
        {/* SECCIÓN: APERTURA INDIVIDUAL DE PUERTAS Y CAJONES */}
        {hasInteractiveElements && (
          <div className="flex flex-col gap-2 p-2.5 bg-[#1c1c1f] rounded-xl border border-white/5">
            <div className="flex items-center justify-between px-1">
              <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 flex items-center gap-1.5">
                <DoorOpen size={13} className="text-orange-400" />
                <span>Apertura de Puertas y Cajones</span>
              </div>
              <button
                onClick={toggleAllOpen}
                className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-white/5 hover:bg-orange-500/20 text-orange-400 transition-colors flex items-center gap-1"
                title={anyElementOpen ? "Cerrar todo el módulo" : "Abrir todo el módulo"}
              >
                {anyElementOpen ? <DoorClosed size={12} /> : <DoorOpen size={12} />}
                {anyElementOpen ? 'Cerrar Todo' : 'Abrir Todo'}
              </button>
            </div>

            <div className="flex flex-col gap-1 mt-1">
              {interactiveElements.map((el) => {
                const open = isElementOpen(el.id);
                return (
                  <div
                    key={`open-${el.id}`}
                    onClick={() => toggleElementOpen(el.id)}
                    className="flex items-center justify-between px-3 py-2 bg-[#242428] hover:bg-[#2c2c31] rounded-lg transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-200 group-hover:text-white">
                        {el.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded transition-all ${
                        open 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]' 
                          : 'bg-zinc-800 text-zinc-400 border border-white/5'
                      }`}>
                        {open ? 'Abierto' : 'Cerrado'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECCIÓN: VETA (GRANO) POR PIEZA */}
        {hasInteractiveElements && (
          <div className="flex flex-col gap-2 p-2.5 bg-[#1c1c1f] rounded-xl border border-white/5">
            <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 px-1 flex items-center gap-1.5">
              <Layers size={13} className="text-orange-400" />
              <span>Orientación de Veta (Grano)</span>
            </div>

            <div className="flex flex-col gap-1 mt-1">
              {interactiveElements.map((el) => {
                const grain = getGrain(el.id);
                return (
                  <div 
                    key={`grain-${el.id}`}
                    onClick={() => toggleGrain(el.id)}
                    className="flex items-center justify-between px-3 py-2 bg-[#242428] hover:bg-[#2c2c31] rounded-lg transition-colors cursor-pointer group"
                  >
                    <span className="text-xs font-semibold text-zinc-200 group-hover:text-white">{el.label}</span>
                    <span className="text-orange-500 font-bold text-xs tracking-wider flex items-center gap-1.5">
                      {grain === 'horizontal' ? (
                        <><ArrowLeftRight size={13} strokeWidth={2.5} /> HORIZ</>
                      ) : (
                        <><ArrowUpDown size={13} strokeWidth={2.5} /> VERT</>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Trascara HPL */}
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Trascara HPL</div>
          <button 
            onClick={() => {
              const current = activeCabinet.hplBalancer ?? globalStore.hplBalancer;
              handleOverride('hplBalancer', !current);
            }}
            className={`w-full py-2.5 px-3 rounded-xl border text-xs uppercase font-bold tracking-wider transition-all text-center ${(activeCabinet.hplBalancer ?? globalStore.hplBalancer) ? 'border-orange-500 bg-orange-500/10 text-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.15)] hover:bg-orange-500/20' : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
          >
            {(activeCabinet.hplBalancer ?? globalStore.hplBalancer) ? 'Balancer Blanco Activado' : 'Sin Balancer (Mismo Diseño)'}
          </button>
        </div>

        {/* Diseño Local (Por Pieza) */}
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Diseño Local (Por Pieza)</div>
          <button 
            onClick={() => setShowCatalog(!showCatalog)}
            className="w-full py-2.5 px-4 bg-[#242428] border border-white/20 rounded-xl text-center cursor-pointer hover:border-white/40 hover:bg-[#2c2c31] transition-all text-xs uppercase font-bold tracking-wider text-white"
          >
            {showCatalog ? 'Ocultar Catálogo' : 'Cambiar Diseño Local'}
          </button>
        </div>

        {/* Catálogo de Materiales */}
        {showCatalog && (
          <div className="border border-orange-500/40 rounded-2xl bg-[#19191c] p-3.5 flex flex-col gap-3.5 shadow-inner">
            <div className="text-orange-500 font-bold text-xs uppercase tracking-wider">
              Catálogo de Materiales
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
                1. Selecciona la zona a modificar:
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'structure', label: 'Paredes' },
                  { id: 'doors', label: 'Puertas' },
                  { id: 'drawerFronts', label: 'Frentes Cajón' },
                  { id: 'drawerInner', label: 'Cajas Cajón' },
                  { id: 'shelves', label: 'Repisas' },
                  { id: 'back', label: 'Fondo' },
                  { id: 'socle', label: 'Zócalo' }
                ].map(part => {
                  const isSelected = targetZone === part.id;
                  return (
                    <button 
                      key={part.id}
                      onClick={() => setTargetZone(part.id as PartType)}
                      className={`py-2 px-3 rounded-lg text-xs uppercase tracking-wider font-bold transition-all ${
                        isSelected 
                          ? 'bg-orange-500 text-black shadow-[0_0_12px_rgba(249,115,22,0.35)]' 
                          : 'bg-[#2a2a2e] text-zinc-300 hover:bg-[#34343a] border border-white/5'
                      }`}
                    >
                      {part.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Masisa */}
            {masisaTextures.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
                  2. Masisa (Melaminas)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {masisaTextures.map(t => renderTextureButton(t, true))}
                </div>
              </div>
            )}

            {/* Abet */}
            {abetTextures.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
                  3. Abet Laminati (HPL)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {abetTextures.map(t => renderTextureButton(t, true))}
                </div>
              </div>
            )}

            {/* Otras Texturas / Subir Archivos */}
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
                4. Otras Texturas / Subir Archivos
              </div>
              <label className="flex items-center justify-center gap-2 w-full p-2.5 border border-orange-500/50 border-dashed rounded-xl text-orange-500 hover:bg-orange-500/10 cursor-pointer transition-colors">
                <Upload size={14} />
                <span className="text-[10px] uppercase font-bold tracking-wider">
                  {uploading ? 'Procesando...' : 'Subir Imagen'}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>

              {otherTextures.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {otherTextures.map(t => renderTextureButton(t, true))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Clear overrides */}
        <div className="grid grid-cols-2 gap-2 mt-1">
          <button 
            onClick={handleClearOverrides}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center cursor-pointer hover:bg-amber-500/20 transition-all text-[11px] uppercase font-bold tracking-wider text-amber-400"
          >
            <RefreshCw size={13} /> Revertir Global
          </button>
          <button 
            onClick={() => removeCabinet(activeCabinet.id)}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-center cursor-pointer hover:bg-rose-500/20 transition-all text-[11px] uppercase font-bold tracking-wider text-rose-400"
          >
            <Trash2 size={13} /> Eliminar Mueble
          </button>
        </div>
      </div>
    </div>
  );
}

