import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Upload,
  Plus,
  Trash2,
  Check,
  X,
  Eye,
  RotateCcw,
  Image as ImageIcon,
  Tag,
  Palette,
  Layers,
  CheckCircle2,
  Search,
  ExternalLink
} from 'lucide-react';
import { useAdminStore, CustomTextureItem } from '../../store/adminStore';
import { useStore as useClosetStore } from '../../store';

export function TexturesManagerTab() {
  const { textures, addTexture, toggleTextureActive, deleteTexture, resetTexturesToDefault } = useAdminStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState<'all' | 'maderas' | 'solidos' | 'hpl_autor' | 'piedras_marmoles'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [brand, setBrand] = useState('Masisa');
  const [category, setCategory] = useState<'maderas' | 'solidos' | 'hpl_autor' | 'piedras_marmoles'>('maderas');
  const [finish, setFinish] = useState('Poro Sincronizado');
  const [sheetFormat, setSheetFormat] = useState('1.83 x 2.50 m');
  const [priceSheetClp, setPriceSheetClp] = useState(45000);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredTextures = textures.filter((t) => {
    const matchesCat = selectedCat === 'all' || t.category === selectedCat;
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.finish.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor seleccione un archivo de imagen (.jpg, .png, .svg, .webp)');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setPreviewUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateTexture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !previewUrl) {
      alert('Por favor ingrese un nombre y cargue una imagen o textura para el renderizado.');
      return;
    }

    const calculatedM2 = sheetFormat.includes('1.83') ? 4.575 : sheetFormat.includes('1.22') ? 2.976 : 3.965;
    const priceM2 = Math.round(priceSheetClp / calculatedM2);

    const newId = addTexture({
      name: name.trim(),
      code: code.trim() || `DEC-${Math.floor(Math.random() * 9000 + 1000)}`,
      brand,
      category,
      finish,
      sheetFormat,
      priceSheetClp: Number(priceSheetClp),
      priceM2Clp: priceM2,
      url: previewUrl,
      previewUrl: previewUrl,
      active: true,
    });

    // Inyectar en el store de Clóset / TexturesSection para renderizado 3D inmediato
    const closetStore = useClosetStore.getState();
    if (closetStore.customTextures) {
      closetStore.setCustomTextures([
        ...closetStore.customTextures,
        { id: newId, name: name.trim(), url: previewUrl },
      ]);
    }

    setIsFormOpen(false);
    setName('');
    setCode('');
    setPreviewUrl('');
    showToast(`Decorativo "${name}" cargado y habilitado para renderizado 3D.`);
  };

  const handleToggle = (id: string, name: string) => {
    toggleTextureActive(id);
    showToast(`Estado de "${name}" actualizado.`);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`¿Eliminar la textura "${name}" del catálogo?`)) {
      deleteTexture(id);
      showToast(`Textura eliminada del catálogo.`);
    }
  };

  const handleReset = () => {
    if (window.confirm('¿Restaurar catálogo de texturas y decorativos de fábrica?')) {
      resetTexturesToDefault();
      showToast('Catálogo de texturas restaurado.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} />
          {toastMsg}
        </div>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar textura por nombre, código SAP, marca o acabado..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 overflow-x-auto">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'maderas', label: 'Maderas' },
            { id: 'solidos', label: 'Sólidos & Soft' },
            { id: 'hpl_autor', label: 'HPL De Autor' },
            { id: 'piedras_marmoles', label: 'Piedras/Mármol' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCat(tab.id as any)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap ${
                selectedCat === tab.id
                  ? 'bg-orange-500 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-zinc-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-orange-500/20 shrink-0 transition-all cursor-pointer"
          >
            <Plus size={16} /> Cargar Nuevo Decorativo
          </button>
          <button
            onClick={handleReset}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Restaurar catálogo inicial"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Add Texture Form */}
      {isFormOpen && (
        <form
          onSubmit={handleCreateTexture}
          className="p-5 bg-zinc-900/90 border border-orange-500/40 rounded-xl space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Palette size={18} className="text-orange-500" />
              Cargar Nuevo Decorativo / Textura para Render 3D
            </h3>
            <button type="button" onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left: Inputs */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nombre del Decorativo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Nogal Ceniza Catedral"
                  className="w-full p-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Código de Catálogo / SAP</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ej. SAP 2831 / MAS-102"
                  className="w-full p-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Fabricante / Marca</label>
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full p-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="Abet Laminati">Abet Laminati (Italia)</option>
                  <option value="Masisa">Masisa</option>
                  <option value="Arauco">Arauco / Melamina Vesto</option>
                  <option value="Egger">Egger</option>
                  <option value="Finsa">Finsa</option>
                  <option value="Personalizado">Personalizado / Autor</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Categoría</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full p-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="maderas">Maderas & Enchapados</option>
                  <option value="solidos">Sólidos & Soft Unicolores</option>
                  <option value="hpl_autor">HPL De Autor / Diseños Exclusivos</option>
                  <option value="piedras_marmoles">Piedras, Mármoles & Cementicios</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Formato de Plancha</label>
                <select
                  value={sheetFormat}
                  onChange={(e) => setSheetFormat(e.target.value)}
                  className="w-full p-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="1.83 x 2.50 m">1.83 x 2.50 m (4.57 m² - Melamina Estándar)</option>
                  <option value="1.30 x 3.05 m">1.30 x 3.05 m (3.96 m² - HPL Abet Laminati)</option>
                  <option value="1.22 x 2.44 m">1.22 x 2.44 m (2.97 m² - Formato 4x8)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Precio por Plancha (CLP)</label>
                <input
                  type="number"
                  min="1000"
                  step="500"
                  value={priceSheetClp}
                  onChange={(e) => setPriceSheetClp(Number(e.target.value))}
                  className="w-full p-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white focus:border-orange-500 focus:outline-none font-mono font-bold text-orange-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Tipo de Acabado / Textura Superficial</label>
                <input
                  type="text"
                  value={finish}
                  onChange={(e) => setFinish(e.target.value)}
                  placeholder="Ej. Longline Mate, Soft Touch, Poro Sincronizado, Silk"
                  className="w-full p-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Right: Image Upload & Preview */}
            <div className="flex flex-col items-center justify-center p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2 text-center">
                Mapeo de Textura / Preview 3D
              </label>

              {previewUrl ? (
                <div className="w-full aspect-square rounded-lg overflow-hidden border border-orange-500/40 relative group mb-3">
                  {previewUrl.startsWith('#') ? (
                    <div className="w-full h-full" style={{ backgroundColor: previewUrl }} />
                  ) : (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1 bg-orange-500 text-white rounded text-xs font-bold"
                    >
                      Cambiar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-square border-2 border-dashed border-zinc-700 hover:border-orange-500 rounded-lg flex flex-col items-center justify-center cursor-pointer p-4 text-center mb-3 transition-colors bg-zinc-900/40"
                >
                  <Upload size={24} className="text-zinc-500 mb-2" />
                  <p className="text-xs font-semibold text-slate-300">Cargar Archivo de Imagen</p>
                  <p className="text-[10px] text-zinc-500 mt-1">PNG, JPG, SVG o WebP (seamless texture)</p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Color Presets quick pick */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-500">O color sólido:</span>
                {['#FFFFFF', '#373E44', '#1C1C1C', '#D4A373', '#7AAFA6', '#C85A48'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setPreviewUrl(c)}
                    className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-slate-300 text-xs font-semibold rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow"
            >
              Guardar y Habilitar en 3D
            </button>
          </div>
        </form>
      )}

      {/* Textures Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTextures.map((tex) => {
          const isColor = tex.url.startsWith('#');
          return (
            <div
              key={tex.id}
              className={`group bg-zinc-900/90 border rounded-xl overflow-hidden transition-all shadow-sm flex flex-col ${
                tex.active ? 'border-zinc-800 hover:border-orange-500/50' : 'border-zinc-800/40 opacity-60'
              }`}
            >
              {/* Texture Swatch / Preview */}
              <div className="h-36 w-full relative overflow-hidden bg-zinc-950 flex items-center justify-center">
                {isColor ? (
                  <div className="w-full h-full" style={{ backgroundColor: tex.url }} />
                ) : (
                  <img
                    src={tex.previewUrl || tex.url}
                    alt={tex.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                {/* Brand Badge */}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-sm border border-white/10 rounded text-[9px] font-bold text-white uppercase tracking-wider">
                  {tex.brand}
                </div>

                {/* Status Badge */}
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() => handleToggle(tex.id, tex.name)}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-colors ${
                      tex.active
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}
                  >
                    {tex.active ? 'Activo en 3D' : 'Inactivo'}
                  </button>
                </div>
              </div>

              {/* Texture Details */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-orange-400 font-bold">{tex.code}</span>
                    <span className="text-[10px] text-zinc-500">{tex.sheetFormat}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white tracking-tight mt-0.5">{tex.name}</h4>
                  <p className="text-xs text-zinc-400 mt-1">{tex.finish}</p>
                </div>

                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="text-[9px] text-zinc-500 uppercase font-semibold">Costo Plancha</div>
                    <div className="text-xs font-mono font-bold text-white">
                      ${tex.priceSheetClp.toLocaleString('es-CL')} CLP
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(tex.id, tex.name)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Eliminar decorativo"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
