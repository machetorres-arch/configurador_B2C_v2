import React, { useState, useEffect } from 'react';
import { useStore, ClosetModuleOverrides, PartType } from '../store';
import { SlidersHorizontal, X, RefreshCw, ArrowUpDown, ArrowLeftRight, Upload, Trash2 } from 'lucide-react';
import { get, set } from 'idb-keyval';

const DEFAULT_TEXTURES = [
  { id: 'def_mas_blanco', name: 'Masisa Blanco', url: '#FFFFFF' },
  { id: 'def_mas_negro', name: 'Masisa Negro', url: '#171717' },
  { id: 'def_abet_2831', name: 'Abet Broccato 2831', url: '/textures/abet-broccato-2831.svg' },
  { id: 'def_abet_2824', name: 'Abet Fiore Pop 2824', url: '/textures/abet-fiore-pop-2824.svg' },
  { id: 'def_wood_grain', name: 'Veta Madera Clara', url: '/textures/light-wood-grain.svg' }
];

export function ModuleContextMenu() {
  const state = useStore();
  const { activeModuleId, modules, updateModuleOverrides, setActiveModule } = state;
  const [showCatalog, setShowCatalog] = useState(true);
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
        state.setCustomTextures(stored);
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
      state.setCustomTextures(updatedTextures);

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
    state.setCustomTextures(updatedTextures);
    await set('custom_textures', updatedTextures);
  };

  if (!activeModuleId) return null;
  const activeModule = modules.find(m => m.id === activeModuleId);
  if (!activeModule) return null;

  const overrides = activeModule.overrides || {};

  const handleOverride = (key: keyof ClosetModuleOverrides, value: any) => {
    updateModuleOverrides(activeModuleId, { [key]: value });
  };

  const handleClearOverrides = () => {
    updateModuleOverrides(activeModuleId, null);
  };

  const moduleIndex = modules.findIndex(m => m.id === activeModuleId);

  const toggleGrain = (key: string) => {
    const newGrainElements = { ...(overrides.grainElements || {}) };
    const current = newGrainElements[key] ?? overrides.grainDirection ?? 'vertical';
    const next = current === 'vertical' ? 'horizontal' : 'vertical';

    newGrainElements[key] = next;
    handleOverride('grainElements', newGrainElements);
  };

  const getGrain = (key: string) => {
    return overrides.grainElements?.[key] ?? overrides.grainDirection ?? 'vertical';
  };

  const handleApplyTexture = (url: string, name: string) => {
    const nameLower = name.toLowerCase();
    const isHPL = nameLower.includes('abet') || nameLower.includes('hpl') || nameLower.includes('laminati');
    const mat: 'melamina' | 'hpl' = isHPL ? 'hpl' : 'melamina';

    switch (targetZone) {
      case 'structure':
        updateModuleOverrides(activeModuleId, { structureColor: url, structureMaterial: mat });
        break;
      case 'doors':
        updateModuleOverrides(activeModuleId, { doorColor: url, doorMaterial: mat });
        break;
      case 'drawerFronts':
        updateModuleOverrides(activeModuleId, { drawerFrontColor: url, drawerFrontMaterial: mat });
        break;
      case 'drawerInner':
        updateModuleOverrides(activeModuleId, { drawerInnerColor: url, drawerInnerMaterial: mat });
        break;
      case 'shelves':
        updateModuleOverrides(activeModuleId, { shelfColor: url, shelfMaterial: mat });
        break;
      case 'back':
        updateModuleOverrides(activeModuleId, { backColor: url, backMaterial: mat });
        break;
      case 'socle':
        updateModuleOverrides(activeModuleId, { socleColor: url, socleMaterial: mat });
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

  const doorCount = activeModule.doors ? (activeModule.width > 60 ? 2 : 1) : 0;
  const hasPieces = doorCount > 0 || activeModule.drawers > 0;

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
            MÓDULO ACTIVO {moduleIndex >= 0 ? `(MOD ${moduleIndex + 1})` : ''}
          </span>
        </div>
        <button 
          onClick={() => setActiveModule(null)} 
          className="text-zinc-400 hover:text-white transition-colors p-1 rounded hover:bg-white/5"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
        {/* Pieces Grain List */}
        {hasPieces && (
          <div className="flex flex-col gap-1.5 p-2 bg-[#1c1c1f] rounded-xl border border-white/5">
            {/* Doors */}
            {activeModule.doors && (
              <>
                {doorCount > 1 ? (
                  <>
                    <div 
                      onClick={() => toggleGrain('door-1')}
                      className="flex items-center justify-between px-3.5 py-2.5 bg-[#242428] hover:bg-[#2c2c31] rounded-lg transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-bold uppercase tracking-wide text-zinc-200">Puerta Derecha</span>
                      <span className="text-orange-500 font-bold text-xs tracking-wider flex items-center gap-1.5">
                        {getGrain('door-1') === 'horizontal' ? (
                          <><ArrowLeftRight size={13} strokeWidth={2.5} /> HORIZ</>
                        ) : (
                          <><ArrowUpDown size={13} strokeWidth={2.5} /> VERT</>
                        )}
                      </span>
                    </div>
                    <div 
                      onClick={() => toggleGrain('door-0')}
                      className="flex items-center justify-between px-3.5 py-2.5 bg-[#242428] hover:bg-[#2c2c31] rounded-lg transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-bold uppercase tracking-wide text-zinc-200">Puerta Izquierda</span>
                      <span className="text-orange-500 font-bold text-xs tracking-wider flex items-center gap-1.5">
                        {getGrain('door-0') === 'horizontal' ? (
                          <><ArrowLeftRight size={13} strokeWidth={2.5} /> HORIZ</>
                        ) : (
                          <><ArrowUpDown size={13} strokeWidth={2.5} /> VERT</>
                        )}
                      </span>
                    </div>
                  </>
                ) : (
                  <div 
                    onClick={() => toggleGrain('door-0')}
                    className="flex items-center justify-between px-3.5 py-2.5 bg-[#242428] hover:bg-[#2c2c31] rounded-lg transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-bold uppercase tracking-wide text-zinc-200">Puerta Única</span>
                    <span className="text-orange-500 font-bold text-xs tracking-wider flex items-center gap-1.5">
                      {getGrain('door-0') === 'horizontal' ? (
                        <><ArrowLeftRight size={13} strokeWidth={2.5} /> HORIZ</>
                      ) : (
                        <><ArrowUpDown size={13} strokeWidth={2.5} /> VERT</>
                      )}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Drawers (from top to bottom) */}
            {activeModule.drawers > 0 && (
              <>
                {Array.from({ length: activeModule.drawers }).map((_, idx) => {
                  const d = activeModule.drawers - 1 - idx;
                  const drawerLabel = `Cajón ${d + 1}`;
                  const key = `drawer-${d}`;
                  return (
                    <div 
                      key={key}
                      onClick={() => toggleGrain(key)}
                      className="flex items-center justify-between px-3.5 py-2.5 bg-[#242428] hover:bg-[#2c2c31] rounded-lg transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-bold uppercase tracking-wide text-zinc-200">{drawerLabel}</span>
                      <span className="text-orange-500 font-bold text-xs tracking-wider flex items-center gap-1.5">
                        {getGrain(key) === 'horizontal' ? (
                          <><ArrowLeftRight size={13} strokeWidth={2.5} /> HORIZ</>
                        ) : (
                          <><ArrowUpDown size={13} strokeWidth={2.5} /> VERT</>
                        )}
                      </span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* Trascara HPL */}
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Trascara HPL</div>
          <button 
            onClick={() => {
              const current = overrides.hplBalancer ?? state.hplBalancer;
              handleOverride('hplBalancer', !current);
            }}
            className={`w-full py-2.5 px-3 rounded-xl border text-xs uppercase font-bold tracking-wider transition-all text-center ${(overrides.hplBalancer ?? state.hplBalancer) ? 'border-orange-500 bg-orange-500/10 text-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.15)] hover:bg-orange-500/20' : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
          >
            {(overrides.hplBalancer ?? state.hplBalancer) ? 'Balancer Blanco Activado' : 'Sin Balancer (Mismo Diseño)'}
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
        <button 
          onClick={handleClearOverrides}
          className="mt-1 flex items-center justify-center gap-2 w-full py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-center cursor-pointer hover:bg-red-500/20 transition-all text-xs uppercase font-bold tracking-wider text-red-400"
        >
          <RefreshCw size={14} /> Revertir a Global
        </button>
      </div>
    </div>
  );
}
