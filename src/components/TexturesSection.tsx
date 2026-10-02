import React, { useState } from 'react';
import { useStore, PartType } from '../store';
import { useAdminStore } from '../store/adminStore';
import { useKitchenStore } from '../store/kitchenStore';
import { isWhiteMelamine } from '../utils/manufacturing';

const DEFAULT_TEXTURES = [
  { id: 'def_mas_blanco_15', name: 'Masisa Blanco', url: '#FFFFFF', thicknessMm: 15, brand: 'Masisa' },
  { id: 'def_mas_blanco_18', name: 'Masisa Blanco', url: '#FFFFFF', thicknessMm: 18, brand: 'Masisa' },
  { id: 'def_mas_negro_18', name: 'Masisa Negro', url: '#171717', thicknessMm: 18, brand: 'Masisa' }
];

export const TexturesSection = ({ 
  onSelectTexture,
  title = "Catálogo de Materiales",
  badgeText,
  isLight = false,
}: { 
  onSelectTexture?: (url: string, mat: 'hpl' | 'melamina' | 'durolac', thicknessMm?: number) => void;
  title?: string;
  badgeText?: string;
  isLight?: boolean;
}) => {
  const state = useStore();
  const adminTextures = useAdminStore((s) => s.textures);
  const [thicknessFilter, setThicknessFilter] = useState<'all' | 15 | 18>('all');
  const hasIslands = useKitchenStore((s) => s.cabinets?.some((c) => c.type === 'island'));

  const applyTexture = (url: string, name: string, specificThickness?: number, specificMat?: 'hpl' | 'melamina' | 'durolac') => {
    const nameLower = name.toLowerCase();
    const urlLower = url.toLowerCase();
    
    // Auto-detectar material por el nombre del archivo/textura
    const isHPL = nameLower.includes('abet') || nameLower.includes('hpl') || nameLower.includes('laminati') || urlLower.includes('abet') || urlLower.includes('fiore') || urlLower.includes('broccato');
    const isDurolac = specificMat === 'durolac' || nameLower.includes('durolac');
    const mat: 'melamina' | 'hpl' | 'durolac' = specificMat || (isDurolac ? 'durolac' : (isHPL ? 'hpl' : 'melamina'));
    
    if (onSelectTexture) {
      onSelectTexture(url, mat, specificThickness);
      return;
    }

    if (state.targetPart === 'islandBack') {
      useKitchenStore.getState().setIslandBackConfig({
        enabled: true,
        materialType: 'decorative',
        decorativeColor: url,
        decorativeMaterial: mat as any,
      });
      return;
    }

    state.applyTextureToTarget(url);
    switch(state.targetPart) {
      case 'structure': state.setStructureMaterial(mat as any); break;
      case 'doors': state.setDoorMaterial(mat as any); break;
      case 'drawerFronts': state.setDrawerFrontMaterial(mat as any); break;
      case 'drawerInner': state.setDrawerInnerMaterial(mat as any); break;
      case 'shelves': state.setShelfMaterial(mat as any); break;
      case 'back': 
        state.setBackMaterial?.(mat);
        if (specificThickness) state.setBackThickness?.(specificThickness);
        break;
      case 'socle': state.setSocleMaterial(mat as any); break;
    }
  };

  // Filtrar exclusivamente terminaciones aprobadas por el Superadministrador (VB) y activas
  // Las cubiertas de cuarzo/sinterizado (Qstone Sysprotec) se configuran exclusivamente en el modal de cubiertas
  const activeApprovedAdminTextures = (adminTextures || [])
    .filter(t => t.active && (t.approvalStatus === 'approved' || !t.approvalStatus))
    .filter(t => {
      const cat = t.category;
      const n = (t.name || '').toLowerCase();
      const b = (t.brand || t.providerName || '').toLowerCase();
      const isStone = cat === 'piedras_marmoles' || n.includes('qstone') || b.includes('qstone') || b.includes('sysprotec');
      return !isStone;
    })
    .map(t => ({
      id: t.id,
      name: t.name.toLowerCase().includes((t.brand || '').toLowerCase()) ? t.name : `${t.brand ? t.brand + ' ' : ''}${t.name}`,
      code: t.code,
      url: t.url || t.previewUrl || '#CCCCCC',
      category: t.category,
      brand: t.brand || t.providerName,
      providerName: t.providerName,
      thicknessMm: t.thicknessMm || (t.category === 'hpl_autor' ? 0.9 : (t.name.includes('15') ? 15 : 18)),
      sheetFormat: t.sheetFormat
    }));

  // Solo usar defaults de emergencia si no hay ninguna textura en el gestor
  const allTextures = activeApprovedAdminTextures.length > 0 
    ? activeApprovedAdminTextures 
    : DEFAULT_TEXTURES.map(t => ({
        ...t,
        code: 'DEF',
        category: 'solidos' as const,
        providerName: t.brand,
        sheetFormat: '1.83 x 2.50 m'
      }));
  
  const isMasisaItem = (t: any) => {
    const n = (t.name || '').toLowerCase();
    const b = (t.brand || '').toLowerCase();
    const p = (t.providerName || '').toLowerCase();
    return n.includes('masisa') || b.includes('masisa') || p.includes('masisa');
  };

  const isAraucoItem = (t: any) => {
    const n = (t.name || '').toLowerCase();
    const b = (t.brand || '').toLowerCase();
    const p = (t.providerName || '').toLowerCase();
    return n.includes('arauco') || b.includes('arauco') || p.includes('arauco') || n.includes('vesto') || b.includes('vesto');
  };

  const isAbetItem = (t: any) => {
    const n = (t.name || '').toLowerCase();
    const b = (t.brand || '').toLowerCase();
    const p = (t.providerName || '').toLowerCase();
    return n.includes('abet') || b.includes('abet') || p.includes('abet') || n.includes('laminati') || n.includes('hpl') || t.category === 'hpl_autor';
  };

  // Filtrado por espesor si aplica (solo afecta a melaminas / maderas / tableros)
  const matchesThickness = (t: any) => {
    if (thicknessFilter === 'all') return true;
    if (isAbetItem(t)) return true;
    return t.thicknessMm === thicknessFilter;
  };

  const masisaTextures = allTextures.filter(t => isMasisaItem(t) && matchesThickness(t));
  const araucoTextures = allTextures.filter(t => !isMasisaItem(t) && isAraucoItem(t) && matchesThickness(t));
  const abetTextures = allTextures.filter(t => !isMasisaItem(t) && !isAraucoItem(t) && isAbetItem(t));
  const otherTextures = allTextures.filter(t => !isMasisaItem(t) && !isAraucoItem(t) && !isAbetItem(t) && matchesThickness(t));

  const renderTextureButton = (tex: any) => {
    const is15 = tex.thicknessMm === 15;
    const is18 = tex.thicknessMm === 18;
    return (
      <div key={tex.id} className="relative group">
        <button 
          onClick={() => {
            const isBack = state.targetPart === 'back';
            const specificMat = isBack ? (tex.category === 'hpl_autor' ? 'hpl' : 'melamina') : undefined;
            applyTexture(tex.url, tex.name, tex.thicknessMm, specificMat);
            // Solo ajustar espesor global de la estructura si se está configurando la estructura o todo el mueble,
            // y solo para tableros autoportantes (>= 12 mm). Nunca para láminas HPL (0.8/0.9 mm) ni al cambiar solo puertas.
            if (
              tex.thicknessMm &&
              tex.thicknessMm >= 12 &&
              (state.targetPart === 'structure' || state.targetPart === 'all') &&
              state.setThickness
            ) {
              state.setThickness(Number((tex.thicknessMm / 10).toFixed(2)));
            }
          }}
          className={`flex flex-col items-center gap-1 p-1 rounded transition-colors w-full cursor-pointer relative ${
            isLight 
              ? 'bg-white border border-slate-300 hover:border-orange-500 shadow-sm' 
              : 'bg-white/5 border border-white/10 hover:border-orange-500/50'
          }`}
          title={`${tex.name} ${tex.thicknessMm ? `[${tex.thicknessMm}mm]` : ''} ${tex.code ? `(${tex.code})` : ''}`}
        >
          {/* Badge de Espesor visible en esquina superior derecha */}
          {tex.thicknessMm && (
            <span
              className={`absolute top-1 right-1 px-1 py-0.2 rounded text-[7px] font-mono font-extrabold uppercase shadow-sm z-10 ${
                is15
                  ? 'bg-blue-600 text-white'
                  : is18
                  ? 'bg-orange-500 text-black'
                  : 'bg-zinc-700 text-zinc-200'
              }`}
            >
              {tex.thicknessMm}mm
            </span>
          )}

          <div 
            className={`w-full aspect-square rounded border group-hover:shadow-[0_0_10px_rgba(249,115,22,0.3)] bg-cover bg-center ${
              isLight ? 'border-slate-200' : 'border-white/20'
            }`}
            style={tex.url.startsWith('#') ? { backgroundColor: tex.url } : { backgroundImage: `url('${tex.url}')` }}
          />
          <span className={`text-[8px] uppercase tracking-wider font-bold truncate w-full text-center ${
            isLight ? 'text-slate-800' : 'text-slate-400'
          }`}>
            {tex.name.length > 17 ? tex.name.substring(0, 17) + '...' : tex.name}
          </span>
        </button>
      </div>
    );
  };

  return (
    <div className={`mb-8 p-3 rounded-lg border ${
      isLight 
        ? 'bg-orange-50/40 border-orange-300 shadow-sm' 
        : 'bg-orange-500/5 border-orange-500/30'
    }`}>
      <div className="flex justify-between items-center mb-3">
        <h2 className={`text-[11px] uppercase tracking-widest font-bold ${
          isLight ? 'text-orange-600' : 'text-orange-500'
        }`}>{title}</h2>
        {badgeText && (
          <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
            isLight 
              ? 'bg-orange-100 text-orange-800 border-orange-300' 
              : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
          }`}>
            {badgeText}
          </span>
        )}
      </div>
      
      <div className="flex flex-col gap-2 mb-4">
        <label className={`text-[10px] uppercase tracking-widest font-bold ${
          isLight ? 'text-slate-700' : 'text-slate-400'
        }`}>1. Selecciona la zona a modificar:</label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {[
            { id: 'all' as PartType, label: 'Todo el Mueble' },
            { id: 'doors' as PartType, label: 'Puertas' },
            { id: 'drawerFronts' as PartType, label: 'Frentes Cajón' },
            { id: 'structure' as PartType, label: 'Paredes / Casco' },
            { id: 'coverPanels' as PartType, label: 'Tapas Laterales' },
            { id: 'drawerInner' as PartType, label: 'Cajas Cajón' },
            { id: 'shelves' as PartType, label: 'Repisas' },
            { id: 'back' as PartType, label: 'Trasera / Fondo' },
            { id: 'socle' as PartType, label: 'Zócalo' },
          ].map(part => (
            <button 
              key={part.id}
              onClick={() => state.setTargetPart(part.id)}
              className={`p-1.5 rounded-md text-[9px] uppercase tracking-widest font-bold transition-all cursor-pointer ${
                (part as any).highlight ? 'col-span-2 py-2 border-orange-500/60 shadow-sm' : ''
              } ${
                state.targetPart === part.id 
                  ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.3)] border border-orange-500 font-extrabold' 
                  : isLight 
                    ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500 hover:text-black shadow-sm' 
                    : 'bg-white/10 text-slate-300 border border-transparent hover:bg-white/20'
              }`}
            >
              {part.label}
            </button>
          ))}
        </div>

        {/* Opciones Especiales de Trasera / Fondo (Durolac Blanco 3mm vs Melamina 15/18mm) */}
        {state.targetPart === 'back' && (
          <div className={`p-2.5 rounded-xl border flex flex-col gap-2 ${
            isLight ? 'bg-orange-50/80 border-orange-200 shadow-xs' : 'bg-black/40 border-orange-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${
                isLight ? 'text-orange-950' : 'text-orange-400'
              }`}>
                Configuración Trasera / Fondo
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                Norma Fabricación
              </span>
            </div>
            <p className={`text-[10px] leading-tight ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              Elige <strong>Durolac Blanco 3 mm</strong> (único color oficial de Durolac para ranura/clavado) o cualquiera de los decorativos de <strong>Melamina o HPL</strong> (15 mm / 18 mm) del catálogo y backoffice.
            </p>

            <div className="grid grid-cols-2 gap-2 mt-0.5">
              {/* Opción Durolac 3 mm Blanco */}
              <button
                type="button"
                onClick={() => {
                  applyTexture('#FFFFFF', 'Durolac Blanco 3mm', 3, 'durolac');
                }}
                className={`p-2 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  (state.backThickness === 3 || state.backMaterial === 'durolac' || (state.backColor === '#FFFFFF' && !state.backThickness))
                    ? 'bg-orange-500 text-black border-orange-600 font-extrabold shadow-xs'
                    : isLight
                      ? 'bg-white text-slate-800 border-slate-300 hover:border-orange-500'
                      : 'bg-white/5 text-zinc-300 border-white/10 hover:border-orange-500/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold">Durolac Blanco</span>
                  <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-black/10 dark:bg-white/10 font-bold">3 mm</span>
                </div>
                <span className="text-[8px] opacity-80 leading-tight">MDF lacado blanco estándar</span>
              </button>

              {/* Opción Igualar al Casco / Paredes */}
              <button
                type="button"
                onClick={() => {
                  const structColor = state.structureColor || '#ffffff';
                  const thickMm = Math.round((state.thickness || 1.8) * 10);
                  const structMat = state.structureMaterial || 'melamina';
                  applyTexture(structColor, 'Melamina Casco', thickMm, structMat);
                }}
                className={`p-2 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  isLight
                    ? 'bg-white text-slate-800 border-slate-300 hover:border-orange-500'
                    : 'bg-white/5 text-zinc-300 border-white/10 hover:border-orange-500/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold">Igualar al Casco</span>
                  <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-black/10 dark:bg-white/10 font-bold">
                    {Math.round((state.thickness || 1.8) * 10)} mm
                  </span>
                </div>
                <span className="text-[8px] opacity-80 leading-tight">Mismo color del casco</span>
              </button>
            </div>
          </div>
        )}

        {/* Opciones Especiales de Cajas Cajón / Fondo de Cajón */}
        {state.targetPart === 'drawerInner' && (() => {
          const innerColor = state.drawerInnerColor || state.structureColor || '#ffffff';
          const isWhite = isWhiteMelamine(innerColor);
          const kitchenCabinets = useKitchenStore.getState().cabinets || [];
          const drawerCabinets = kitchenCabinets.filter(c => 
            c.variant === '4_drawers' || c.variant === '2_pot_drawers' || c.variant === '2_drawers_1_pot' || 
            c.variant === '1_door_1_drawer' || c.variant === 'sink_u_drawer' || c.variant === 'tall_inner_drawers' ||
            c.variant === 'spice_rack'
          );
          const hasCabinetsOver50 = drawerCabinets.some(c => c.width > 50);
          const currentBottomMat = state.drawerBottomMaterial || (isWhite && !hasCabinetsOver50 ? 'durolac' : 'melamina');
          const isDurolacActive = currentBottomMat === 'durolac' && isWhite && !hasCabinetsOver50;

          return (
            <div className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 shadow-sm transition-all ${
              isLight ? 'bg-orange-50/90 border-orange-200' : 'bg-black/40 border-orange-500/30'
            }`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[11px] uppercase font-extrabold tracking-wider ${
                  isLight ? 'text-orange-950' : 'text-orange-400'
                }`}>
                  Configuración Fondo de Cajón
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shrink-0 ${
                  isDurolacActive
                    ? (isLight ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30')
                    : (isLight ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30')
                }`}>
                  {isDurolacActive ? 'Durolac 3 mm' : 'Melamina 15/18 mm'}
                </span>
              </div>

              <p className={`text-[11px] leading-snug font-medium ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                {!isWhite
                  ? 'Cajas en melamina madera/color: Por estándar industrial, el fondo se fabrica en la misma melamina seleccionada (15/18 mm).'
                  : hasCabinetsOver50
                    ? 'Módulos > 50 cm detectados: Restricción estructural activa. Durolac 3 mm restringido para evitar pandeo o desfondamiento.'
                    : 'Melamina blanca (≤ 50 cm): Puedes alternar entre Durolac blanco 3 mm o Melamina.'}
              </p>

              <div className="flex flex-col gap-2 mt-1">
                {/* Opción Durolac 3 mm Blanco */}
                <button
                  type="button"
                  disabled={!isWhite || hasCabinetsOver50}
                  onClick={() => {
                    if (isWhite && !hasCabinetsOver50) {
                      state.setDrawerBottomMaterial?.('durolac');
                      const { cabinets, updateCabinet } = useKitchenStore.getState();
                      cabinets.forEach(c => {
                        if (c.width <= 50) {
                          updateCabinet(c.id, { drawerBottomMaterial: 'durolac', drawerBottomThickness: 3 });
                        }
                      });
                    }
                  }}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all ${
                    !isWhite || hasCabinetsOver50
                      ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400'
                      : isDurolacActive
                        ? 'bg-orange-500 text-black border-orange-600 font-extrabold shadow-sm cursor-pointer ring-2 ring-orange-500/20'
                        : isLight
                          ? 'bg-white text-slate-800 border-slate-300 hover:border-orange-500 hover:bg-orange-50/40 cursor-pointer shadow-xs'
                          : 'bg-white/5 text-zinc-200 border-white/10 hover:border-orange-500/50 cursor-pointer'
                  }`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs font-bold leading-snug">Durolac Blanco</span>
                    <span className={`text-[11px] leading-tight font-medium ${isDurolacActive ? 'text-black/80' : isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                      {!isWhite 
                        ? 'Solo disponible en melamina blanca' 
                        : hasCabinetsOver50 
                          ? 'Restringido (Módulos > 50 cm)' 
                          : 'MDF lacado 3 mm ranurado'}
                    </span>
                  </div>
                  <span className={`text-xs font-mono font-bold px-2 py-1 rounded-md shrink-0 ${
                    isDurolacActive 
                      ? 'bg-black/15 text-black' 
                      : isLight 
                        ? 'bg-slate-100 text-slate-700' 
                        : 'bg-white/10 text-zinc-200'
                  }`}>
                    3 mm
                  </span>
                </button>

                {/* Opción Misma Melamina */}
                <button
                  type="button"
                  onClick={() => {
                    state.setDrawerBottomMaterial?.('melamina');
                    const { cabinets, updateCabinet } = useKitchenStore.getState();
                    cabinets.forEach(c => {
                      updateCabinet(c.id, { drawerBottomMaterial: 'melamina', drawerBottomThickness: 15 });
                    });
                  }}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    !isDurolacActive
                      ? 'bg-orange-500 text-black border-orange-600 font-extrabold shadow-sm ring-2 ring-orange-500/20'
                      : isLight
                        ? 'bg-white text-slate-800 border-slate-300 hover:border-orange-500 hover:bg-orange-50/40 shadow-xs'
                        : 'bg-white/5 text-zinc-200 border-white/10 hover:border-orange-500/50'
                  }`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs font-bold leading-snug">Misma Melamina Estructural</span>
                    <span className={`text-[11px] leading-tight font-medium ${!isDurolacActive ? 'text-black/80' : isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                      Mismo tono y espesor de la caja
                    </span>
                  </div>
                  <span className={`text-xs font-mono font-bold px-2 py-1 rounded-md shrink-0 ${
                    !isDurolacActive 
                      ? 'bg-black/15 text-black' 
                      : isLight 
                        ? 'bg-slate-100 text-slate-700' 
                        : 'bg-white/10 text-zinc-200'
                  }`}>
                    15/18 mm
                  </span>
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Filtro de Espesor de Melamina: Todos / 15 mm / 18 mm */}
      <div className={`flex items-center justify-between p-1.5 rounded-lg border mb-3.5 ${
        isLight ? 'bg-slate-100 border-slate-300' : 'bg-black/30 border-white/10'
      }`}>
        <span className={`text-[9px] uppercase font-bold tracking-wider pl-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
          Filtro Calibre:
        </span>
        <div className="flex items-center gap-1">
          {[
            { id: 'all' as const, label: 'Todos' },
            { id: 15 as const, label: '15 mm' },
            { id: 18 as const, label: '18 mm' },
          ].map((f) => (
            <button
              key={String(f.id)}
              type="button"
              onClick={() => setThicknessFilter(f.id)}
              className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono transition-all cursor-pointer ${
                thicknessFilter === f.id
                  ? 'bg-orange-500 text-black font-extrabold shadow-xs'
                  : isLight
                  ? 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                  : 'bg-white/5 text-zinc-300 hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {masisaTextures.length > 0 && (
        <div className="mb-4">
          <label className={`text-[10px] uppercase tracking-widest font-bold block mb-2 ${
            isLight ? 'text-slate-700' : 'text-slate-400'
          }`}>2. Masisa (Melaminas)</label>
          <div className="grid grid-cols-3 gap-2">
            {masisaTextures.map(t => renderTextureButton(t))}
          </div>
        </div>
      )}

      {araucoTextures.length > 0 && (
        <div className="mb-4">
          <label className={`text-[10px] uppercase tracking-widest font-bold block mb-2 ${
            isLight ? 'text-slate-700' : 'text-slate-400'
          }`}>3. Arauco / Vesto (Melaminas)</label>
          <div className="grid grid-cols-3 gap-2">
            {araucoTextures.map(t => renderTextureButton(t))}
          </div>
        </div>
      )}

      {abetTextures.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className={`text-[10px] uppercase tracking-widest font-bold ${
              isLight ? 'text-slate-700' : 'text-slate-400'
            }`}>4. Abet Laminati (HPL)</label>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30">
              Laminado de Alta Presión
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {abetTextures.map(t => renderTextureButton(t))}
          </div>

          {/* Trascara HPL Balancer Global 0.9 mm */}
          <div className={`mt-2.5 p-2.5 rounded-xl border flex flex-col gap-1.5 ${
            isLight ? 'bg-orange-50/80 border-orange-200' : 'bg-black/30 border-orange-500/25'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${
                isLight ? 'text-orange-950' : 'text-orange-400'
              }`}>
                Trascara HPL de Compensación (Global)
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                0.9 mm
              </span>
            </div>
            <p className={`text-[10px] leading-tight ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              Balanceador blanco normalizado para evitar el alabeo de puertas y frentes laminados a una cara.
            </p>
            <div className="grid grid-cols-2 gap-1.5 mt-0.5">
              <button
                type="button"
                onClick={() => state.setHplBalancer(true)}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  state.hplBalancer
                    ? 'bg-orange-500 text-black shadow-xs font-extrabold'
                    : isLight
                      ? 'bg-white text-slate-700 border border-slate-300 hover:border-orange-400'
                      : 'bg-white/5 text-zinc-300 border border-white/10 hover:border-orange-500/50'
                }`}
              >
                <span>Balancer Blanco 0.9mm</span>
              </button>
              <button
                type="button"
                onClick={() => state.setHplBalancer(false)}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  !state.hplBalancer
                    ? 'bg-orange-500 text-black shadow-xs font-extrabold'
                    : isLight
                      ? 'bg-white text-slate-700 border border-slate-300 hover:border-orange-400'
                      : 'bg-white/5 text-zinc-300 border border-white/10 hover:border-orange-500/50'
                }`}
              >
                <span>Mismo HPL 2 Caras</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {otherTextures.length > 0 && (
        <div className="mb-4">
          <label className={`text-[10px] uppercase tracking-widest font-bold block mb-2 ${
            isLight ? 'text-slate-700' : 'text-slate-400'
          }`}>5. Otros Proveedores Homologados</label>
          <div className="grid grid-cols-3 gap-2">
            {otherTextures.map(t => renderTextureButton(t))}
          </div>
        </div>
      )}
    </div>
  );
};
