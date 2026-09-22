import { useStore, PartType } from '../store';
import { useAdminStore } from '../store/adminStore';
import { useKitchenStore } from '../store/kitchenStore';

const DEFAULT_TEXTURES = [
  { id: 'def_mas_blanco', name: 'Masisa Blanco', url: '#FFFFFF' },
  { id: 'def_mas_negro', name: 'Masisa Negro', url: '#171717' }
];

export const TexturesSection = ({ 
  onSelectTexture,
  title = "Catálogo de Materiales",
  badgeText,
  isLight = false,
}: { 
  onSelectTexture?: (url: string, mat: 'hpl' | 'melamina') => void;
  title?: string;
  badgeText?: string;
  isLight?: boolean;
}) => {
  const state = useStore();
  const adminTextures = useAdminStore((s) => s.textures);
  const hasIslands = useKitchenStore((s) => s.cabinets?.some((c) => c.type === 'island'));
  const { countertopConfig, setCountertopConfig, qstoneCatalog, addQstoneCatalogItem } = useKitchenStore();

  const handleSelectQstone = (tex: any) => {
    const matched = qstoneCatalog.find(
      (p) => p.id === tex.id || p.textureUrl === tex.url || p.name.toLowerCase() === tex.name.toLowerCase()
    );
    if (matched) {
      setCountertopConfig({ selectedProductId: matched.id, enabled: true });
    } else {
      const isSintered = tex.name.toLowerCase().includes('sinteriz') || tex.category === 'piedras_marmoles';
      addQstoneCatalogItem({
        id: tex.id,
        code: tex.code || 'QS-CUSTOM',
        name: tex.name,
        materialType: isSintered ? 'sinterizado' : 'quarzo',
        thicknessMm: tex.name.includes('20') ? 20 : (tex.name.includes('18') ? 18 : 12),
        priceM2Clp: tex.priceM2Clp || 280000,
        sheetWidthMm: 3200,
        sheetHeightMm: 1600,
        colorHex: tex.url && tex.url.startsWith('#') ? tex.url : '#F8FAFC',
        textureUrl: tex.url,
        finish: tex.finish || 'Pulido Seda',
        description: `${tex.brand || 'Sysprotec'} - Formato Placa`,
        active: true,
      });
      setCountertopConfig({ selectedProductId: tex.id, enabled: true });
    }
  };

  const applyTexture = (url: string, name: string) => {
    const nameLower = name.toLowerCase();
    
    // Auto-detectar material por el nombre del archivo/textura
    const isHPL = nameLower.includes('abet') || nameLower.includes('hpl') || nameLower.includes('laminati');
    const mat = isHPL ? 'hpl' : 'melamina';
    
    if (onSelectTexture) {
      onSelectTexture(url, mat);
      return;
    }

    if (state.targetPart === 'islandBack') {
      useKitchenStore.getState().setIslandBackConfig({
        enabled: true,
        materialType: 'decorative',
        decorativeColor: url,
        decorativeMaterial: mat,
      });
      return;
    }

    state.applyTextureToTarget(url);
    switch(state.targetPart) {
      case 'structure': state.setStructureMaterial(mat); break;
      case 'doors': state.setDoorMaterial(mat); break;
      case 'drawerFronts': state.setDrawerFrontMaterial(mat); break;
      case 'drawerInner': state.setDrawerInnerMaterial(mat); break;
      case 'shelves': state.setShelfMaterial(mat); break;
      case 'socle': state.setSocleMaterial(mat); break;
    }
  };

  // Filtrar exclusivamente terminaciones aprobadas por el Superadministrador (VB) y activas
  const activeApprovedAdminTextures = (adminTextures || [])
    .filter(t => t.active && (t.approvalStatus === 'approved' || !t.approvalStatus))
    .map(t => ({
      id: t.id,
      name: `${t.brand ? t.brand + ' ' : ''}${t.name}`,
      code: t.code,
      url: t.url || t.previewUrl || '#CCCCCC',
      category: t.category,
      brand: t.brand || t.providerName
    }));

  // Combinación única con defaults
  const combinedMap = new Map<string, any>();
  DEFAULT_TEXTURES.forEach(t => combinedMap.set(t.id, t));
  activeApprovedAdminTextures.forEach(t => combinedMap.set(t.id, t));

  const allTextures = Array.from(combinedMap.values());
  
  const masisaTextures = allTextures.filter(t => t.name.toLowerCase().includes('masisa') || t.brand?.toLowerCase() === 'masisa');
  const qstoneTextures = allTextures.filter(t => {
    const n = t.name.toLowerCase();
    const b = (t.brand || '').toLowerCase();
    return n.includes('qstone') || b.includes('qstone') || b.includes('sysprotec') || t.category === 'piedras_marmoles';
  });
  const abetTextures = allTextures.filter(t => {
    const n = t.name.toLowerCase();
    const b = (t.brand || '').toLowerCase();
    return n.includes('abet') || n.includes('laminati') || n.includes('hpl') || t.category === 'hpl_autor' || b.includes('abet');
  });
  const otherTextures = allTextures.filter(t => {
    const n = t.name.toLowerCase();
    const b = (t.brand || '').toLowerCase();
    const isMasisa = n.includes('masisa') || b.includes('masisa');
    const isQstone = n.includes('qstone') || b.includes('qstone') || b.includes('sysprotec') || t.category === 'piedras_marmoles';
    const isAbet = n.includes('abet') || n.includes('laminati') || n.includes('hpl') || t.category === 'hpl_autor' || b.includes('abet');
    return !isMasisa && !isQstone && !isAbet;
  });

  const renderTextureButton = (tex: any) => (
    <div key={tex.id} className="relative group">
      <button 
        onClick={() => applyTexture(tex.url, tex.name)}
        className={`flex flex-col items-center gap-1 p-1 rounded transition-colors w-full cursor-pointer ${
          isLight 
            ? 'bg-white border border-slate-300 hover:border-orange-500 shadow-sm' 
            : 'bg-white/5 border border-white/10 hover:border-orange-500/50'
        }`}
        title={`${tex.name} ${tex.code ? `(${tex.code})` : ''}`}
      >
        <div 
          className={`w-full aspect-square rounded border group-hover:shadow-[0_0_10px_rgba(249,115,22,0.3)] bg-cover bg-center ${
            isLight ? 'border-slate-200' : 'border-white/20'
          }`}
          style={tex.url.startsWith('#') ? { backgroundColor: tex.url } : { backgroundImage: `url('${tex.url}')` }}
        />
        <span className={`text-[8px] uppercase tracking-wider font-bold truncate w-full text-center ${
          isLight ? 'text-slate-800' : 'text-slate-400'
        }`}>
          {tex.name.length > 15 ? tex.name.substring(0, 15) + '...' : tex.name}
        </span>
      </button>
    </div>
  );

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
            { id: 'back' as PartType, label: 'Fondo Interior' },
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

      {qstoneTextures.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className={`text-[10px] uppercase tracking-widest font-bold ${
              isLight ? 'text-slate-700' : 'text-slate-400'
            }`}>
              3. Sysprotec / Qstone (Cubiertas Técnicas)
            </label>
            <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
              isLight
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            }`}>
              Solo Cubiertas
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {qstoneTextures.map((t) => {
              const isSelected =
                countertopConfig?.enabled &&
                (countertopConfig.selectedProductId === t.id ||
                  qstoneCatalog.find((p) => p.id === countertopConfig.selectedProductId)?.textureUrl === t.url ||
                  qstoneCatalog.find((p) => p.id === countertopConfig.selectedProductId)?.name.toLowerCase() === t.name.toLowerCase());

              return (
                <div key={t.id} className="relative group">
                  <button
                    onClick={() => handleSelectQstone(t)}
                    className={`flex flex-col items-center gap-1 p-1 rounded-lg transition-all w-full cursor-pointer relative ${
                      isSelected
                        ? 'bg-amber-500/15 border-2 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                        : isLight
                        ? 'bg-white border border-slate-300 hover:border-amber-500 shadow-sm'
                        : 'bg-white/5 border border-white/10 hover:border-amber-500/50'
                    }`}
                    title={`${t.name} (Aplica exclusivamente a la Cubierta)`}
                  >
                    {isSelected && (
                      <span className="absolute top-1 right-1 bg-amber-500 text-slate-950 text-[7px] font-extrabold px-1 rounded shadow">
                        ACTIVO
                      </span>
                    )}
                    <div
                      className={`w-full aspect-square rounded border group-hover:shadow-[0_0_10px_rgba(245,158,11,0.3)] bg-cover bg-center ${
                        isSelected ? 'border-amber-500' : isLight ? 'border-slate-200' : 'border-white/20'
                      }`}
                      style={t.url.startsWith('#') ? { backgroundColor: t.url } : { backgroundImage: `url('${t.url}')` }}
                    />
                    <span
                      className={`text-[8px] uppercase tracking-wider font-bold truncate w-full text-center ${
                        isSelected ? 'text-amber-500 font-extrabold' : isLight ? 'text-slate-800' : 'text-slate-400'
                      }`}
                    >
                      {t.name.length > 15 ? t.name.substring(0, 15) + '...' : t.name}
                    </span>
                  </button>
                </div>
              );
            })}
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
