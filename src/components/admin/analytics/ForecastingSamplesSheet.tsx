import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Package,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  Send,
  Sliders,
  DollarSign,
  Sun,
  Eye,
  RotateCw,
  Download,
  AlertTriangle,
  FolderKanban,
  Box,
  FileSpreadsheet,
  Check
} from 'lucide-react';
import { useAdminStore } from '../../../store/adminStore';

interface ForecastingSamplesSheetProps {
  selectedProviderName?: string;
  selectedProviderId?: string;
  isSuperAdmin?: boolean;
}

export function ForecastingSamplesSheet({ selectedProviderName, selectedProviderId, isSuperAdmin }: ForecastingSamplesSheetProps = {}) {
  const { themeMode, textures, supplies, projects, providers } = useAdminStore();
  const isLight = themeMode === 'light';

  const [lightMode, setLightMode] = useState<'3000k' | '5000k' | 'showroom'>('3000k');
  const [rotated, setRotated] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [skuPaused, setSkuPaused] = useState(false);
  const [selectedTextureId, setSelectedTextureId] = useState<string>('');

  // Identificar texturas asociadas al proveedor seleccionado
  const providerTextures = useMemo(() => {
    const pId = (selectedProviderId || '').toLowerCase();
    const pName = (selectedProviderName || '').toLowerCase();

    const filtered = textures.filter((t) => {
      const tPId = (t.providerId || '').toLowerCase();
      const tPName = (t.providerName || t.brand || '').toLowerCase();

      if (pId && tPId === pId) return true;
      if (pId && (tPName.includes(pId) || pId.includes(tPName))) return true;
      if (pName && (tPName.includes(pName) || pName.includes(tPName))) return true;

      if (pId.includes('abet') || pName.includes('abet')) {
        return t.name.toLowerCase().includes('abet') || t.name.toLowerCase().includes('totoy') || (t.brand || '').toLowerCase().includes('abet');
      }
      if (pId.includes('arauco') || pName.includes('arauco')) {
        return t.name.toLowerCase().includes('arauco') || t.name.toLowerCase().includes('vesto');
      }
      if (pId.includes('masisa') || pName.includes('masisa')) {
        return t.name.toLowerCase().includes('masisa');
      }
      if (pId.includes('qstone') || pName.includes('qstone')) {
        return t.name.toLowerCase().includes('qstone') || t.category === 'cubiertas';
      }
      return false;
    });

    return filtered.length > 0 ? filtered : textures;
  }, [textures, selectedProviderId, selectedProviderName]);

  const activeTexture = useMemo(() => {
    if (selectedTextureId) {
      const found = providerTextures.find((t) => t.id === selectedTextureId);
      if (found) return found;
    }
    return providerTextures[0] || textures[0];
  }, [providerTextures, selectedTextureId, textures]);

  // Proyectos guardados asociados al proveedor
  const providerProjects = useMemo(() => {
    const pId = (selectedProviderId || '').toLowerCase();
    const pName = (selectedProviderName || '').toLowerCase();

    return projects.filter((proj) => {
      const dataStr = JSON.stringify(proj.data || {}).toLowerCase();
      const projName = (proj.name || '').toLowerCase();

      if (pId && dataStr.includes(pId)) return true;
      if (pName && dataStr.includes(pName)) return true;

      if (pId.includes('abet') || pName.includes('abet')) {
        return dataStr.includes('abet') || dataStr.includes('totoy') || proj.type === 'special' || proj.type === 'hpl-bathroom';
      }
      if (pId.includes('arauco') || pName.includes('arauco')) {
        return dataStr.includes('arauco') || dataStr.includes('vesto') || proj.type === 'kitchen' || proj.type === 'closet';
      }
      if (pId.includes('masisa') || pName.includes('masisa')) {
        return dataStr.includes('masisa') || dataStr.includes('innova');
      }
      if (pId.includes('qstone') || pName.includes('qstone')) {
        return dataStr.includes('qstone') || dataStr.includes('cuarzo');
      }

      return true;
    });
  }, [projects, selectedProviderId, selectedProviderName]);

  // Totales dinámicos para el proveedor
  const totalProjectedM2 = useMemo(() => {
    return providerProjects.reduce((acc, p) => acc + (p.totalAreaM2 || 18.5), 0);
  }, [providerProjects]);

  const totalPipelineClp = useMemo(() => {
    return providerProjects.reduce((acc, p) => acc + (p.price || p.data?.budget || 2450000), 0);
  }, [providerProjects]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 border p-5 rounded-2xl transition-colors ${
        isLight ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/90 border-zinc-800'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-extrabold uppercase tracking-wider text-orange-500">Inteligencia de Materiales & Catálogo PBR</span>
            <span className={isLight ? 'text-zinc-400' : 'text-zinc-600'}>•</span>
            <span className="text-amber-500 font-mono font-bold">Telemetría B2B {selectedProviderName || 'Proveedor Activo'}</span>
          </div>
          <h2 className={`text-xl sm:text-2xl font-bold tracking-tight ${isLight ? 'text-zinc-900' : 'text-white'}`}>
            Previsión de Demanda y Visor de Materiales PBR
          </h2>
          <p className={`text-xs sm:text-sm max-w-3xl ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
            Anticipación de inventarios y cubicaciones proyectadas según diseños 3D guardados en el configurador, sincronizado con las texturas y fichas técnicas del proveedor.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => alert(`Previsión de inventario para ${selectedProviderName || 'Proveedor'} descargada en formato .CSV`)}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-600/20 transition-all cursor-pointer"
          >
            <Download size={15} />
            <span>Exportar Previsión (.CSV)</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Ribbons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className={`border rounded-2xl p-4 flex flex-col justify-between transition-all ${
          isLight ? 'bg-white border-zinc-200 shadow-sm hover:border-orange-500/40' : 'bg-zinc-900/80 border-zinc-800 hover:border-orange-500/40'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Prescripción en Diseños 3D</span>
            <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className="my-2">
            <div className={`text-2xl font-black font-mono ${isLight ? 'text-zinc-900' : 'text-white'}`}>
              {projects.length > 0 ? Math.round((providerProjects.length / Math.max(1, projects.length)) * 100) : 100}%
            </div>
            <p className={`text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Cuota de preferencia en proyectos guardados.</p>
          </div>
          <div className={`w-full h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-zinc-100' : 'bg-zinc-800'}`}>
            <div className="bg-orange-500 h-full rounded-full" style={{ width: `${projects.length > 0 ? Math.round((providerProjects.length / Math.max(1, projects.length)) * 100) : 100}%` }} />
          </div>
        </div>

        {/* Metric 2 */}
        <div className={`border rounded-2xl p-4 flex flex-col justify-between transition-all ${
          isLight ? 'bg-white border-zinc-200 shadow-sm hover:border-amber-500/40' : 'bg-zinc-900/80 border-zinc-800 hover:border-amber-500/40'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Valor Promedio / Proyecto</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <DollarSign size={16} />
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              ${(providerProjects.length > 0 ? Math.round(totalPipelineClp / providerProjects.length) : 2450000).toLocaleString('es-CL')}
            </div>
            <p className={`text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Ticket promedio de presupuesto estimado en 3D.</p>
          </div>
          <div className={`w-full h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-zinc-100' : 'bg-zinc-800'}`}>
            <div className="bg-amber-500 h-full rounded-full" style={{ width: '85%' }} />
          </div>
        </div>

        {/* Metric 3 */}
        <div className={`border rounded-2xl p-4 flex flex-col justify-between transition-all ${
          isLight ? 'bg-white border-zinc-200 shadow-sm hover:border-sky-500/40' : 'bg-zinc-900/80 border-zinc-800 hover:border-sky-500/40'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Volumen 3D Comprometido</span>
            <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
              <Layers size={16} />
            </span>
          </div>
          <div className="my-2">
            <div className={`text-2xl font-black font-mono ${isLight ? 'text-zinc-900' : 'text-white'}`}>
              {Math.round(totalProjectedM2)} m²
            </div>
            <p className={`text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>{providerProjects.length} proyecto(s) activos en esta marca.</p>
          </div>
          <div className={`w-full h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-zinc-100' : 'bg-zinc-800'}`}>
            <div className="bg-sky-500 h-full rounded-full" style={{ width: '70%' }} />
          </div>
        </div>

        {/* Metric 4 */}
        <div className={`border rounded-2xl p-4 flex flex-col justify-between transition-all ${
          isLight ? 'bg-white border-zinc-200 shadow-sm hover:border-emerald-500/40' : 'bg-zinc-900/80 border-zinc-800 hover:border-emerald-500/40'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Aprovechamiento de Material</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Sparkles size={16} />
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">91,8%</div>
            <p className={`text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Merma estimada en optimizador CNC: 8,2%.</p>
          </div>
          <div className={`w-full h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-zinc-100' : 'bg-zinc-800'}`}>
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: '91.8%' }} />
          </div>
        </div>
      </div>

      {/* Forecast Curves & AI Forecast */}
      <div className={`border rounded-2xl p-5 space-y-4 transition-colors ${
        isLight ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
      }`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b ${
          isLight ? 'border-zinc-200' : 'border-zinc-800'
        }`}>
          <div>
            <h3 className={`text-base font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>
              Curvas de Demanda Proyectada ({selectedProviderName || 'Proveedor Activo'})
            </h3>
            <p className={`text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Correlación histórica entre proyectos 3D guardados y órdenes estimadas a 45 días</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-sky-500 rounded" />
              <span className={isLight ? 'text-zinc-700 font-medium' : 'text-zinc-300'}>Consumo Real (m²)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-orange-500 rounded border-t border-dashed" />
              <span className={isLight ? 'text-zinc-700 font-medium' : 'text-zinc-300'}>Previsión AI 3D (m²)</span>
            </div>
          </div>
        </div>

        {/* SVG Graphic Curve */}
        <div className={`border rounded-xl p-4 overflow-x-auto ${
          isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-800'
        }`}>
          <div className="min-w-[650px] h-44 flex flex-col justify-between relative">
            <svg className="w-full h-36 overflow-visible" preserveAspectRatio="none" viewBox="0 0 900 160">
              <defs>
                <linearGradient id="forecastArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M 0,110 L 150,95 L 300,80 L 450,60 L 600,35 L 750,20 L 900,10 L 900,160 L 0,160 Z" fill="url(#forecastArea)" />
              <path d="M 0,115 L 150,100 L 300,75 L 450,65" fill="none" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />
              <circle cx="0" cy="115" r="4" fill="#0284c7" />
              <circle cx="150" cy="100" r="4" fill="#0284c7" />
              <circle cx="300" cy="75" r="4" fill="#0284c7" />
              <circle cx="450" cy="65" r="5" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
              <path d="M 450,65 L 600,35 L 750,20 L 900,10" fill="none" stroke="#f97316" strokeDasharray="6,4" strokeWidth="3" strokeLinecap="round" />
              <circle cx="680" cy="27" r="6" fill="#ef4444" className="animate-ping" opacity="0.7" />
              <circle cx="680" cy="27" r="4" fill="#ef4444" />
              <line x1="450" y1="0" x2="450" y2="160" stroke={isLight ? '#cbd5e1' : '#52525b'} strokeDasharray="2,2" strokeWidth="1" />
              <text x="455" y="15" fill={isLight ? '#64748b' : '#a1a1aa'} fontSize="10" fontFamily="sans-serif">HOY</text>
              <text x="685" y="44" fill="#ef4444" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
                Pico Demanda Proyectada ({selectedProviderName || 'Marca'})
              </text>
            </svg>
            <div className={`flex justify-between text-[11px] font-mono pt-1 ${isLight ? 'text-zinc-600' : 'text-zinc-500'}`}>
              <span>Mes 1</span>
              <span>Mes 2</span>
              <span>Mes 3</span>
              <span className="text-orange-500 font-bold">Mes Actual</span>
              <span>Próximo Mes</span>
              <span>Mes +2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Material SKU & 3D PBR Inspector (Conectado a la Marca Activa) */}
      <div className={`border rounded-2xl p-5 space-y-4 transition-colors ${
        isLight ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
      }`}>
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b ${
          isLight ? 'border-zinc-200' : 'border-zinc-800'
        }`}>
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Visor Táctil de SKU & PBR — Catálogo {selectedProviderName || 'Marca'}
            </span>
            <div className="flex items-center gap-3 mt-1">
              <h3 className={`text-base font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                {activeTexture ? activeTexture.name : 'Material PBR de Proveedor'}
              </h3>
              <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-600 text-xs font-mono font-bold">
                {activeTexture?.code || 'SKU-PBR'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Texture selector for this brand */}
            {providerTextures.length > 0 && (
              <select
                value={selectedTextureId || activeTexture?.id || ''}
                onChange={(e) => setSelectedTextureId(e.target.value)}
                className={`py-1.5 px-3 border rounded-xl text-xs font-bold outline-none cursor-pointer ${
                  isLight ? 'bg-zinc-50 border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-700 text-white'
                }`}
              >
                {providerTextures.map((tex) => (
                  <option key={tex.id} value={tex.id}>
                    {tex.name} ({tex.brand || selectedProviderName || 'Marca'})
                  </option>
                ))}
              </select>
            )}

            {/* Lighting Controls */}
            <div className={`flex items-center gap-1 border p-1 rounded-xl text-xs font-bold ${
              isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-950 border-zinc-800'
            }`}>
              <button
                onClick={() => setLightMode('3000k')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  lightMode === '3000k'
                    ? 'bg-orange-500 text-white'
                    : isLight
                    ? 'text-zinc-600 hover:text-zinc-900'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                3000K Cálida
              </button>
              <button
                onClick={() => setLightMode('5000k')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  lightMode === '5000k'
                    ? 'bg-orange-500 text-white'
                    : isLight
                    ? 'text-zinc-600 hover:text-zinc-900'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                5000K Día
              </button>
              <button
                onClick={() => setLightMode('showroom')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  lightMode === 'showroom'
                    ? 'bg-orange-500 text-white'
                    : isLight
                    ? 'text-zinc-600 hover:text-zinc-900'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Showroom
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left 8 Cols: Render Preview Frame */}
          <div className="lg:col-span-8 space-y-3">
            <div className={`relative h-72 rounded-xl overflow-hidden border flex items-center justify-center group ${
              isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-950 border-zinc-800'
            }`}>
              <div
                className={`w-full h-full bg-cover bg-center transition-all duration-500 ${
                  lightMode === '3000k'
                    ? 'brightness-105 sepia-[0.15] contrast-105'
                    : lightMode === '5000k'
                    ? 'brightness-110 hue-rotate-[-5deg] contrast-105'
                    : 'brightness-95 contrast-110'
                } ${rotated ? 'scale-105 rotate-1' : 'scale-100 rotate-0'} ${zoomed ? 'scale-150' : ''}`}
                style={{
                  backgroundImage: activeTexture?.previewUrl || activeTexture?.url || activeTexture?.textureUrl
                    ? `url('${activeTexture.previewUrl || activeTexture.url || activeTexture.textureUrl}')`
                    : 'none',
                  backgroundColor: activeTexture?.hexColor || '#8B5A2B'
                }}
              />

              {/* Hotspot */}
              <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="w-8 h-8 rounded-full bg-orange-500/30 backdrop-blur-md flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                  <span className="w-3.5 h-3.5 rounded-full bg-orange-500 shadow-lg shadow-orange-500" />
                </div>
              </div>

              {/* Bottom Floating Bar */}
              <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 backdrop-blur-md border px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs ${
                isLight ? 'bg-white/90 border-zinc-300 text-zinc-900 shadow-sm' : 'bg-zinc-900/90 border-zinc-700 text-white'
              }`}>
                <button
                  onClick={() => setRotated(!rotated)}
                  className="hover:text-orange-500 flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <RotateCw size={13} /> Rotar 360°
                </button>
                <span className={isLight ? 'text-zinc-300' : 'text-zinc-600'}>|</span>
                <button
                  onClick={() => setZoomed(!zoomed)}
                  className="hover:text-orange-500 flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <Eye size={13} /> Zoom Veta
                </button>
              </div>
            </div>

            {/* PBR Channel Cards */}
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className={`p-2.5 rounded-lg border text-center ${
                isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-800'
              }`}>
                <div className={`text-[10px] uppercase font-bold ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Albedo Map</div>
                <div className={`font-bold mt-0.5 ${isLight ? 'text-zinc-900' : 'text-white'}`}>RGB 8-bit HD</div>
              </div>
              <div className={`p-2.5 rounded-lg border text-center ${
                isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-800'
              }`}>
                <div className={`text-[10px] uppercase font-bold ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Roughness</div>
                <div className="font-bold text-amber-600 dark:text-amber-400 mt-0.5">15% Gloss</div>
              </div>
              <div className={`p-2.5 rounded-lg border text-center ${
                isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-800'
              }`}>
                <div className={`text-[10px] uppercase font-bold ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Normal Map</div>
                <div className="font-bold text-sky-600 dark:text-sky-400 mt-0.5">OpenGL 16b</div>
              </div>
              <div className={`p-2.5 rounded-lg border text-center ${
                isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-800'
              }`}>
                <div className={`text-[10px] uppercase font-bold ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Displacement</div>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">0.35 mm</div>
              </div>
            </div>
          </div>

          {/* Right 4 Cols: Technical Specs & Catalog State */}
          <div className={`lg:col-span-4 border rounded-xl p-4 flex flex-col justify-between space-y-4 ${
            isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-800'
          }`}>
            <div className="space-y-3">
              <h4 className={`text-sm font-bold border-b pb-2 ${isLight ? 'text-zinc-900 border-zinc-200' : 'text-white border-zinc-800'}`}>
                Ficha Técnica de Material
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>Marca / Fabricante:</span>
                  <span className={`font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                    {activeTexture?.brand || selectedProviderName || 'Marca Registrada'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>Formato Nominal:</span>
                  <span className={`font-mono font-semibold ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>
                    {activeTexture?.thickness ? `Plancha ${activeTexture.thickness}mm (1.83×2.50m)` : 'Formato Estándar'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>Categoría 3D:</span>
                  <span className="font-semibold text-orange-500 uppercase text-[11px]">
                    {activeTexture?.category || 'Tableros / Frentes'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>Estado en 3D:</span>
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    !skuPaused
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                  }`}>
                    {!skuPaused ? 'Activo en Catálogo 3D' : 'Pausado Temporalmente'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setSkuPaused(!skuPaused)}
                className={`w-full py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  skuPaused
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : isLight
                    ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                }`}
              >
                {skuPaused ? 'Reactivar en Catálogo 3D' : 'Pausar en Catálogo 3D'}
              </button>
              <button
                onClick={() => alert(`Mapas PBR 4K de "${activeTexture?.name}" descargados.`)}
                className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download size={14} /> Descargar Mapas PBR (4K)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Proyectos Guardados & Cotizaciones 3D por Material Table */}
      <div className={`border rounded-2xl p-5 space-y-4 transition-colors ${
        isLight ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
      }`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b ${
          isLight ? 'border-zinc-200' : 'border-zinc-800'
        }`}>
          <div>
            <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-zinc-900' : 'text-white'}`}>
              <FolderKanban size={18} className="text-orange-500" />
              Proyectos Guardados & Cotizaciones 3D por Material ({providerProjects.length})
            </h3>
            <p className={`text-xs ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
              Trazabilidad de proyectos diseñados en el configurador 3D que utilizan insumos y materiales de {selectedProviderName || 'esta marca'}.
            </p>
          </div>
          <span className={`text-xs font-mono font-bold ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
            Pipeline Estimado: ${totalPipelineClp.toLocaleString('es-CL')} CLP
          </span>
        </div>

        {providerProjects.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center text-center space-y-2">
            <Box size={32} className="text-zinc-400" />
            <p className={`text-xs font-semibold ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
              No se han registrado proyectos 3D activos utilizando materiales de esta marca en el período seleccionado.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`uppercase tracking-wider text-[10px] font-bold ${
                  isLight ? 'bg-zinc-100 text-zinc-700' : 'bg-zinc-950/60 text-zinc-400'
                }`}>
                  <th className="py-2.5 px-3 rounded-l-lg">Código / Proyecto 3D</th>
                  <th className="py-2.5 px-3">Cliente / Diseñador</th>
                  <th className="py-2.5 px-3">Tipo de Proyecto</th>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Estado Pipeline</th>
                  <th className="py-2.5 px-3 text-right">Superficie 3D</th>
                  <th className="py-2.5 px-3 text-right rounded-r-lg">Presupuesto CLP</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-zinc-200' : 'divide-zinc-800/50'}`}>
                {providerProjects.map((p) => (
                  <tr key={p.id} className={`transition-colors ${isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-800/40'}`}>
                    <td className="py-3 px-3 font-bold">
                      <div className={isLight ? 'text-zinc-900' : 'text-white'}>{p.name}</div>
                      <div className="text-[10px] font-mono text-orange-500">{p.code || p.id}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className={`font-medium ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>{p.clientName || 'Estudio de Arquitectura'}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        isLight ? 'bg-zinc-100 text-zinc-700 border border-zinc-200' : 'bg-zinc-800 text-zinc-300'
                      }`}>
                        {p.type === 'kitchen' ? 'Cocina Mueblaría' : p.type === 'closet' ? 'Clóset Paramétrico' : 'Mobiliario Especial'}
                      </span>
                    </td>
                    <td className={`py-3 px-3 font-mono ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      {p.date ? new Date(p.date).toLocaleDateString('es-CL') : 'Reciente'}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        p.status === 'sold' || p.status === 'in_production'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                      }`}>
                        {p.status === 'sold' ? 'Vendido / En Cierre' : p.status === 'in_production' ? 'En Producción' : 'En Cotización 3D'}
                      </span>
                    </td>
                    <td className={`py-3 px-3 text-right font-mono font-bold ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>
                      {p.totalAreaM2 || 18.5} m²
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-orange-600 dark:text-orange-400">
                      ${(p.price || p.data?.budget || 2450000).toLocaleString('es-CL')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

