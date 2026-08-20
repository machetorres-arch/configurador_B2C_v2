import React, { useState } from 'react';
import { useStore, ClosetModuleOverrides } from '../store';
import { Settings2, X, RefreshCw, DoorOpen, DoorClosed, ArrowDownUp, ArrowLeftRight } from 'lucide-react';
import { TexturesSection } from './TexturesSection';

export function ModuleContextMenu() {
  const { activeModuleId, modules, updateModuleOverrides, setActiveModule } = useStore();
  const [showTexturePicker, setShowTexturePicker] = useState(false);

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

  return (
    <div className="absolute top-6 right-6 w-72 bg-zinc-900/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 rounded-xl overflow-hidden z-50 flex flex-col">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-2 text-orange-500">
          <Settings2 size={16} />
          <span className="text-[11px] uppercase tracking-widest font-bold">Módulo Activo</span>
        </div>
        <button onClick={() => setActiveModule(null)} className="text-slate-400 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-5 overflow-y-auto max-h-[60vh] custom-scrollbar">
        {/* Toggle Doors/Drawers */}
        <div className="flex flex-col gap-2">
          <div className="text-[10px] uppercase tracking-widest text-slate-400">Estado Apertura</div>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => {
                handleOverride('isOpen', false);
                handleOverride('openElements', {}); // Clear specific overrides
              }}
              className={`flex items-center justify-center gap-2 p-2 rounded-lg border text-[10px] uppercase tracking-wider transition-colors ${overrides.isOpen === false ? 'bg-orange-500/10 border-orange-500 text-orange-500' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
            >
              <DoorClosed size={14} /> Cerrar Todo
            </button>
            <button 
              onClick={() => {
                handleOverride('isOpen', true);
                handleOverride('openElements', {}); // Clear specific overrides
              }}
              className={`flex items-center justify-center gap-2 p-2 rounded-lg border text-[10px] uppercase tracking-wider transition-colors ${overrides.isOpen === true ? 'bg-orange-500/10 border-orange-500 text-orange-500' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
            >
              <DoorOpen size={14} /> Abrir Todo
            </button>
          </div>

          {(activeModule.doors || activeModule.drawers > 0) && (
            <div className="flex flex-col gap-2 mt-2 p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-1">Apertura Individual</div>
              
              {activeModule.doors && (
                <div className="flex flex-col gap-1">
                  {Array.from({ length: activeModule.width > 60 ? 2 : 1 }).map((_, i) => (
                    <button
                      key={`door-${i}`}
                      onClick={() => {
                        const newOpenElements = { ...(overrides.openElements || {}) };
                        const current = newOpenElements[`door-${i}`] ?? overrides.isOpen ?? false;
                        newOpenElements[`door-${i}`] = !current;
                        
                        // Si es puerta y se cierra, cerramos todos los cajones interiores
                        if (current && activeModule.innerDrawers && activeModule.drawers > 0) {
                          for (let d = 0; d < activeModule.drawers; d++) {
                            newOpenElements[`drawer-${d}`] = false;
                          }
                        }
                        
                        handleOverride('openElements', newOpenElements);
                      }}
                      className="flex items-center justify-between p-1.5 px-3 bg-black/40 hover:bg-black/60 rounded text-[10px] uppercase text-slate-300 transition-colors"
                    >
                      <span>Puerta {activeModule.width > 60 ? (i === 0 ? 'Izquierda' : 'Derecha') : 'Única'}</span>
                      <span className="text-orange-500 font-bold">{(overrides.openElements?.[`door-${i}`] ?? overrides.isOpen) ? 'ABIERTA' : 'CERRADA'}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeModule.drawers > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  {Array.from({ length: activeModule.drawers }).map((_, i) => (
                    <button
                      key={`drawer-${i}`}
                      onClick={() => {
                        const newOpenElements = { ...(overrides.openElements || {}) };
                        const current = newOpenElements[`drawer-${i}`] ?? overrides.isOpen ?? false;
                        newOpenElements[`drawer-${i}`] = !current;
                        
                        // Si se abre un cajón interior, abrimos también las puertas
                        if (!current && activeModule.innerDrawers && activeModule.doors) {
                          const doorsCount = activeModule.width > 60 ? 2 : 1;
                          for (let d = 0; d < doorsCount; d++) {
                             newOpenElements[`door-${d}`] = true;
                          }
                        }
                        
                        handleOverride('openElements', newOpenElements);
                      }}
                      className="flex items-center justify-between p-1.5 px-3 bg-black/40 hover:bg-black/60 rounded text-[10px] uppercase text-slate-300 transition-colors"
                    >
                      <span>Cajón {activeModule.drawers - i}</span>
                      <span className="text-orange-500 font-bold">{(overrides.openElements?.[`drawer-${i}`] ?? overrides.isOpen) ? 'ABIERTO' : 'CERRADO'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Grain Direction */}
        <div className="flex flex-col gap-2">
          <div className="text-[10px] uppercase tracking-widest text-slate-400">Veta (Frentes)</div>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => {
                handleOverride('grainDirection', 'vertical');
                handleOverride('grainElements', {});
              }}
              className={`flex items-center justify-center gap-2 p-2 rounded-lg border text-[10px] uppercase tracking-wider transition-colors ${overrides.grainDirection !== 'horizontal' ? 'bg-orange-500/10 border-orange-500 text-orange-500' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
            >
              <ArrowDownUp size={14} /> Todo Vert.
            </button>
            <button 
              onClick={() => {
                 const isMasisa = (overrides.doorMaterial || 'melamina') === 'melamina';
                 const maxW = isMasisa ? 1830 : 1300; 
                 const height = useStore.getState().height;
                 if (height > maxW) {
                    alert(`Error de formato: La altura del módulo (${height}mm) excede el ancho útil del tablero (${maxW}mm) para veta horizontal.`);
                    return;
                 }
                 handleOverride('grainDirection', 'horizontal');
                 handleOverride('grainElements', {});
              }}
              className={`flex items-center justify-center gap-2 p-2 rounded-lg border text-[10px] uppercase tracking-wider transition-colors ${overrides.grainDirection === 'horizontal' ? 'bg-orange-500/10 border-orange-500 text-orange-500' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
            >
              <ArrowLeftRight size={14} /> Todo Horiz.
            </button>
          </div>
          
          {(activeModule.doors || activeModule.drawers > 0) && (
            <div className="flex flex-col gap-2 mt-2 p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-1">Veta Individual</div>
              
              {activeModule.doors && (
                <div className="flex flex-col gap-1">
                  {Array.from({ length: activeModule.width > 60 ? 2 : 1 }).map((_, i) => (
                    <div key={`door-grain-${i}`} className="flex items-center justify-between p-1.5 px-3 bg-black/40 rounded text-[10px] uppercase text-slate-300">
                      <span>Puerta {activeModule.width > 60 ? (i === 0 ? 'Izquierda' : 'Derecha') : 'Única'}</span>
                      <button 
                        onClick={() => {
                          const newGrainElements = { ...(overrides.grainElements || {}) };
                          const current = newGrainElements[`door-${i}`] ?? overrides.grainDirection ?? 'vertical';
                          newGrainElements[`door-${i}`] = current === 'vertical' ? 'horizontal' : 'vertical';
                          handleOverride('grainElements', newGrainElements);
                        }}
                        className="text-orange-500 font-bold hover:text-orange-400 transition-colors flex items-center gap-1"
                      >
                        {(overrides.grainElements?.[`door-${i}`] ?? overrides.grainDirection) === 'horizontal' ? <><ArrowLeftRight size={12}/> HORIZ</> : <><ArrowDownUp size={12}/> VERT</>}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeModule.drawers > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  {Array.from({ length: activeModule.drawers }).map((_, i) => (
                    <div key={`drawer-grain-${i}`} className="flex items-center justify-between p-1.5 px-3 bg-black/40 rounded text-[10px] uppercase text-slate-300">
                      <span>Cajón {activeModule.drawers - i}</span>
                      <button 
                        onClick={() => {
                          const newGrainElements = { ...(overrides.grainElements || {}) };
                          const current = newGrainElements[`drawer-${i}`] ?? overrides.grainDirection ?? 'vertical';
                          newGrainElements[`drawer-${i}`] = current === 'vertical' ? 'horizontal' : 'vertical';
                          handleOverride('grainElements', newGrainElements);
                        }}
                        className="text-orange-500 font-bold hover:text-orange-400 transition-colors flex items-center gap-1"
                      >
                        {(overrides.grainElements?.[`drawer-${i}`] ?? overrides.grainDirection) === 'horizontal' ? <><ArrowLeftRight size={12}/> HORIZ</> : <><ArrowDownUp size={12}/> VERT</>}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Balancer Override */}
        {((overrides.structureMaterial || useStore.getState().structureMaterial) === 'hpl' || 
          (overrides.doorMaterial || useStore.getState().doorMaterial) === 'hpl' ||
          (overrides.drawerFrontMaterial || useStore.getState().drawerFrontMaterial) === 'hpl') && (
          <div className="flex flex-col gap-2">
            <div className="text-[10px] uppercase tracking-widest text-slate-400">Trascara HPL</div>
            <button 
              onClick={() => handleOverride('hplBalancer', overrides.hplBalancer === undefined ? !useStore.getState().hplBalancer : !overrides.hplBalancer)}
              className={`flex items-center justify-center gap-2 p-2 rounded-lg border text-[10px] uppercase tracking-wider transition-colors ${(overrides.hplBalancer ?? useStore.getState().hplBalancer) ? 'bg-orange-500/10 border-orange-500 text-orange-500' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
            >
              {(overrides.hplBalancer ?? useStore.getState().hplBalancer) ? 'Balancer Blanco Activado' : 'Sin Balancer (Mismo Diseño)'}
            </button>
          </div>
        )}
        
        {/* Material Overrides */}
        <div className="flex flex-col gap-2">
          <div className="text-[10px] uppercase tracking-widest text-slate-400">Diseño Local (Por Pieza)</div>
          <button 
            onClick={() => setShowTexturePicker(!showTexturePicker)}
            className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg text-center cursor-pointer hover:border-orange-500/50 hover:bg-white/10 transition-colors text-[10px] uppercase tracking-wide text-slate-300 flex items-center justify-center gap-2"
          >
            {showTexturePicker ? 'Ocultar Catálogo' : 'Cambiar Diseño Local'}
          </button>
          
          {showTexturePicker && (
            <div className="mt-2 border border-white/10 rounded-lg p-2 bg-black/20 flex flex-col gap-3">

               <TexturesSection onSelectTexture={(url, mat) => {
                 const target = useStore.getState().targetPart;
                 if (target === 'doors') {
                   handleOverride('doorColor', url);
                   handleOverride('doorMaterial', mat);
                 } else if (target === 'drawerFronts') {
                   handleOverride('drawerFrontColor', url);
                   handleOverride('drawerFrontMaterial', mat);
                 } else if (target === 'structure' || target === 'back' || target === 'shelves') {
                   handleOverride('structureColor', url);
                   handleOverride('structureMaterial', mat);
                 }
               }} />
            </div>
          )}
        </div>

        {/* Clear overrides */}
        <button 
          onClick={handleClearOverrides}
          className="mt-2 flex items-center justify-center gap-2 w-full p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-center cursor-pointer hover:bg-red-500/20 transition-colors text-[10px] uppercase tracking-wide text-red-400"
        >
          <RefreshCw size={14} /> Revertir a Global
        </button>
      </div>
    </div>
  );
}
