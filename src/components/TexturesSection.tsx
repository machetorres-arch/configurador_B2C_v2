import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useAdminStore } from '../store/adminStore';
import { get, set } from 'idb-keyval';
import { Upload, Trash2 } from 'lucide-react';

const DEFAULT_TEXTURES = [
  { id: 'def_mas_blanco', name: 'Masisa Blanco', url: '#FFFFFF' },
  { id: 'def_mas_negro', name: 'Masisa Negro', url: '#171717' }
];

export const TexturesSection = ({ 
  onSelectTexture,
  title = "Catálogo de Materiales",
  badgeText
}: { 
  onSelectTexture?: (url: string, mat: 'hpl' | 'melamina') => void;
  title?: string;
  badgeText?: string;
}) => {
  const state = useStore();
  const adminTextures = useAdminStore((s) => s.textures);
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
      e.target.value = ''; // clear input
    };
    reader.onerror = () => {
      alert("Error al leer el archivo");
      setUploading(false);
    };
    
    reader.readAsDataURL(file);
  };
  
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedTextures = localTextures.filter(t => t.id !== id);
    setLocalTextures(updatedTextures);
    state.setCustomTextures(updatedTextures);
    await set('custom_textures', updatedTextures);
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

  // Combinar texturas activas del AdminStore + locales + defaults
  const activeAdminTextures = (adminTextures || [])
    .filter(t => t.active)
    .map(t => ({
      id: t.id,
      name: `${t.brand ? t.brand + ' ' : ''}${t.name}`,
      url: t.url || t.previewUrl || '#CCCCCC',
      category: t.category,
      brand: t.brand
    }));

  // Combinación única por ID o nombre
  const combinedMap = new Map<string, any>();
  
  DEFAULT_TEXTURES.forEach(t => combinedMap.set(t.id, t));
  activeAdminTextures.forEach(t => combinedMap.set(t.id, t));
  localTextures.forEach(t => combinedMap.set(t.id, t));

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

  const renderTextureButton = (tex: any, showDelete: boolean) => (
    <div key={tex.id} className="relative group">
      <button 
        onClick={() => applyTexture(tex.url, tex.name)}
        className="flex flex-col items-center gap-1 p-1 bg-white/5 border border-white/10 rounded hover:border-orange-500/50 transition-colors w-full"
        title={tex.name}
      >
        <div 
          className="w-full aspect-square rounded border border-white/20 group-hover:shadow-[0_0_10px_rgba(249,115,22,0.3)] bg-cover bg-center"
          style={tex.url.startsWith('#') ? { backgroundColor: tex.url } : { backgroundImage: `url('${tex.url}')` }}
        />
        <span className="text-[8px] uppercase tracking-wider text-slate-400 truncate w-full text-center">
          {tex.name.length > 15 ? tex.name.substring(0, 15) + '...' : tex.name}
        </span>
      </button>
      {showDelete && !tex.id.startsWith('def_') && (
        <button 
          onClick={(e) => handleDelete(tex.id, e)}
          className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={10} />
        </button>
      )}
    </div>
  );

  return (
    <div className="mb-8 p-3 border border-orange-500/30 rounded-lg bg-orange-500/5">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-[11px] uppercase tracking-widest text-orange-500 font-bold">{title}</h2>
        {badgeText && (
          <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
            {badgeText}
          </span>
        )}
      </div>
      
      <div className="flex flex-col gap-2 mb-4">
        <label className="text-[10px] uppercase tracking-widest text-slate-400">1. Selecciona la zona a modificar:</label>
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
              className={`p-1.5 rounded-md text-[9px] uppercase tracking-widest font-bold transition-all ${state.targetPart === part.id ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.3)] border border-orange-400' : 'bg-white/10 text-slate-300 border border-transparent hover:bg-white/20'}`}
            >
              {part.label}
            </button>
          ))}
        </div>
      </div>

      {masisaTextures.length > 0 && (
        <div className="mb-4">
          <label className="text-[10px] uppercase tracking-widest text-slate-400 block mb-2">2. Masisa (Melaminas)</label>
          <div className="grid grid-cols-3 gap-2">
            {masisaTextures.map(t => renderTextureButton(t, true))}
          </div>
        </div>
      )}

      {abetTextures.length > 0 && (
        <div className="mb-6">
          <label className="text-[10px] uppercase tracking-widest text-slate-400 block mb-2">3. Abet Laminati (HPL)</label>
          <div className="grid grid-cols-3 gap-2">
            {abetTextures.map(t => renderTextureButton(t, true))}
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-orange-500/20">
        <label className="text-[10px] uppercase tracking-widest text-slate-400 block mb-2">4. Otras Texturas / Subir Archivos</label>
        <label className="flex items-center justify-center gap-2 w-full p-3 border border-orange-500/50 border-dashed rounded-lg text-orange-500 hover:bg-orange-500/10 cursor-pointer transition-colors mb-2">
          <Upload size={16} />
          <span className="text-[10px] uppercase font-bold tracking-widest">
            {uploading ? 'Procesando...' : 'Subir Imagen'}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>

        {otherTextures.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {otherTextures.map(t => renderTextureButton(t, true))}
          </div>
        )}
      </div>
    </div>
  );
};
