import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { get, set } from 'idb-keyval';
import { Upload, Trash2 } from 'lucide-react';

export const TexturesSection = () => {
  const state = useStore();
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

  return (
    <div className="mb-8 p-3 border border-orange-500/30 rounded-lg bg-orange-500/5">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-[11px] uppercase tracking-widest text-orange-500 font-bold">Catálogo de Texturas (Local)</h2>
      </div>
      
      <div className="mb-4">
        <label className="flex items-center justify-center gap-2 w-full p-3 border border-orange-500/50 border-dashed rounded-lg text-orange-500 hover:bg-orange-500/10 cursor-pointer transition-colors">
          <Upload size={16} />
          <span className="text-[10px] uppercase font-bold tracking-widest">
            {uploading ? 'Procesando...' : 'Subir Nueva Textura (Sin Firebase)'}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
        <p className="text-[8px] text-slate-500 uppercase tracking-widest mt-1 text-center">Las texturas se guardan en tu navegador</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] uppercase tracking-widest text-slate-400">Selecciona la zona a modificar:</label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {[
            { id: 'structure', label: 'Paredes' },
            { id: 'doors', label: 'Puertas' },
            { id: 'drawerFronts', label: 'Frentes Cajón' },
            { id: 'drawerInner', label: 'Cajas Cajón' },
            { id: 'shelves', label: 'Repisas' },
            { id: 'back', label: 'Fondo' }
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

        <div className="grid grid-cols-3 gap-2 mt-2">
          {localTextures.map((tex) => (
            <div key={tex.id} className="relative group">
              <button 
                onClick={() => state.applyTextureToTarget(tex.url)}
                className="flex flex-col items-center gap-1 p-1 bg-white/5 border border-white/10 rounded hover:border-orange-500/50 transition-colors w-full"
                title={tex.name}
              >
                <div 
                  className="w-full aspect-square rounded bg-cover bg-center border border-white/20 group-hover:shadow-[0_0_10px_rgba(249,115,22,0.3)]"
                  style={{ backgroundImage: `url('${tex.url}')` }}
                />
                <span className="text-[8px] uppercase tracking-wider text-slate-400 truncate w-full text-center">
                  {tex.name.substring(0, 10)}
                </span>
              </button>
              <button 
                onClick={(e) => handleDelete(tex.id, e)}
                className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
          {localTextures.length === 0 && (
            <div className="col-span-3 text-center p-4 text-[10px] text-slate-500 uppercase tracking-widest">
              No hay texturas locales aún.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
