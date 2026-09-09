import { useStore } from '../store';
import { useAdminStore } from '../store/adminStore';

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

  const applyTexture = (url: string, name: string) => {
    const nameLower = name.toLowerCase();
    
    // Auto-detectar material por el nombre del archivo/textura
    const isHPL = nameLower.includes('abet') || nameLower.includes('hpl') || nameLower.includes('laminati');
    const mat = isHPL ? 'hpl' : 'melamina';
    
    if (onSelectTexture) {
      onSelectTexture(url, mat);
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
  const abetTextures = allTextures.filter(t => {
    const n = t.name.toLowerCase();
    return n.includes('abet') || n.includes('laminati') || n.includes('hpl') || t.category === 'hpl_autor' || t.brand?.toLowerCase() === 'abet laminati';
  });
  const otherTextures = allTextures.filter(t => {
    const n = t.name.toLowerCase();
    const isMasisa = n.includes('masisa') || t.brand?.toLowerCase() === 'masisa';
    const isAbet = n.includes('abet') || n.includes('laminati') || n.includes('hpl') || t.category === 'hpl_autor' || t.brand?.toLowerCase() === 'abet laminati';
    return !isMasisa && !isAbet;
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
            { id: 'all', label: 'Todo el Mueble' },
            { id: 'doors', label: 'Puertas' },
            { id: 'drawerFronts', label: 'Frentes Cajón' },
            { id: 'structure', label: 'Paredes / Casco' },
            { id: 'drawerInner', label: 'Cajas Cajón' },
            { id: 'shelves', label: 'Repisas' },
            { id: 'back', label: 'Fondo' },
            { id: 'socle', label: 'Zócalo' }
          ].map(part => (
            <button 
              key={part.id}
              onClick={() => state.setTargetPart(part.id as any)}
              className={`p-1.5 rounded-md text-[9px] uppercase tracking-widest font-bold transition-all cursor-pointer ${
                state.targetPart === part.id 
                  ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.3)] border border-orange-500' 
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

      {abetTextures.length > 0 && (
        <div className="mb-4">
          <label className={`text-[10px] uppercase tracking-widest font-bold block mb-2 ${
            isLight ? 'text-slate-700' : 'text-slate-400'
          }`}>3. Abet Laminati (HPL)</label>
          <div className="grid grid-cols-3 gap-2">
            {abetTextures.map(t => renderTextureButton(t))}
          </div>
        </div>
      )}

      {otherTextures.length > 0 && (
        <div className="mb-2">
          <label className={`text-[10px] uppercase tracking-widest font-bold block mb-2 ${
            isLight ? 'text-slate-700' : 'text-slate-400'
          }`}>4. Terminaciones Proveedores Oficiales</label>
          <div className="grid grid-cols-3 gap-2">
            {otherTextures.map(t => renderTextureButton(t))}
          </div>
        </div>
      )}
    </div>
  );
};
