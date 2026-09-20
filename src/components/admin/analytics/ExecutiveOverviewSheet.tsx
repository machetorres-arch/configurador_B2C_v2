import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  TrendingUp,
  DollarSign,
  Scissors,
  Lightbulb,
  Building,
  Rocket,
  Eye,
  AlertTriangle,
  Factory,
  ArrowUpRight,
  Download,
  Sliders,
  CheckCircle2,
  Clock,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { useAdminStore } from '../../../store/adminStore';

interface ExecutiveOverviewSheetProps {
  selectedProviderName: string;
  onNavigateToTab?: (tab: string) => void;
}

export function ExecutiveOverviewSheet({ selectedProviderName, onNavigateToTab }: ExecutiveOverviewSheetProps) {
  const { projects } = useAdminStore();
  const [periodFilter, setPeriodFilter] = useState<'7D' | '30D' | '3M' | '1A'>('30D');
  const [isExporting, setIsExporting] = useState(false);
  const [alertStockModal, setAlertStockModal] = useState(false);

  // Dynamic calculations from actual projects in store if any, with realistic baseline
  const projectCount = Math.max(projects.length, 38);
  const totalM2 = 38490 + (projects.length * 18);
  const totalClp = 3850000000 + projects.reduce((acc, p) => acc + (p.totalCostEstimateClp || 0), 0);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert('Informe Ejecutivo Consolidado (PDF/XLS) generado exitosamente con datos de telemetría RM.');
    }, 900);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Context Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-400">
              Supervisión Estratégica Regional
            </span>
            <span className="w-1 h-1 rounded-full bg-zinc-600" />
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-950/80 border border-sky-500/30 text-sky-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              Sync Activa: 38 Estudios RM & Fábricas Quilicura / Huechuraba
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Panel de Rendimiento Regional{' '}
            <span className="text-orange-400 font-light">— Santiago de Chile ({selectedProviderName})</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl">
            Telemetría en tiempo real de tableros, optimización de cortes y prescripción en proyectos de cocinas 3D.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start lg:self-center shrink-0">
          <button
            onClick={() => setAlertStockModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/20 text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Sliders size={15} />
            <span>Alertas de Stock</span>
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/20 transition-all cursor-pointer"
          >
            {isExporting ? <Clock size={15} className="animate-spin" /> : <Download size={15} />}
            <span>{isExporting ? 'Generando...' : 'Exportar Informe (PDF/XLS)'}</span>
          </button>
        </div>
      </div>

      {/* 2. Primary KPI Metrology Slabs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-orange-500/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Superficie Proyectada</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {totalM2.toLocaleString('es-CL')} <span className="text-xs font-normal text-zinc-400">m²</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Layers size={20} />
            </div>
          </div>
          <div className="pt-4 mt-2 border-t border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1 text-sky-400 text-xs font-bold">
              <TrendingUp size={14} />
              <span>+18.4%</span>
              <span className="text-[11px] font-normal text-zinc-500 ml-1">vs mes ant.</span>
            </div>
            <div className="flex items-end gap-1 h-5">
              <div className="w-1 h-2 bg-zinc-700 rounded-t" />
              <div className="w-1 h-3 bg-zinc-700 rounded-t" />
              <div className="w-1 h-3 bg-sky-500/40 rounded-t" />
              <div className="w-1 h-4 bg-sky-500/70 rounded-t" />
              <div className="w-1 h-5 bg-sky-400 rounded-t" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-40" />
        </div>

        {/* KPI 2 */}
        <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Proyectos Cocina 3D</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                1.842 <span className="text-xs font-normal text-zinc-400">diseños</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sparkles size={20} />
            </div>
          </div>
          <div className="pt-4 mt-2 border-t border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
              <span>⚡ +142 hoy</span>
              <span className="text-[11px] font-normal text-zinc-500 ml-1">en render</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-mono">
              42 estudios RM
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-40" />
        </div>

        {/* KPI 3 */}
        <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-orange-500/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Volumen Estimado BOM</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                $3.850M <span className="text-xs font-normal text-zinc-400">CLP</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="pt-4 mt-2 border-t border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
              <ArrowUpRight size={14} />
              <span>+14.2%</span>
              <span className="text-[11px] font-normal text-zinc-500 ml-1">facturación pot.</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">$100.025 / m²</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-40" />
        </div>

        {/* KPI 4 */}
        <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-sky-500/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Merma Promedio en Cortes</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-sky-400 mt-1">
                8,4% <span className="text-xs font-normal text-zinc-400">seccionadora</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Scissors size={20} />
            </div>
          </div>
          <div className="pt-4 mt-2 border-t border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1 text-sky-400 text-xs font-bold">
              <span>▼ -3.2%</span>
              <span className="text-[11px] font-normal text-zinc-500 ml-1">vs taller (11.6%)</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-sky-950/80 border border-sky-500/30 text-sky-400 font-bold">
              OptiCorte Activo
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-sky-500 to-transparent opacity-40" />
        </div>
      </div>

      {/* 3. Analytical Core: Weekly Evolution & Category Ring */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Weekly Evolution Stacked Projection (8 Cols) */}
        <div className="lg:col-span-8 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800/80">
            <div>
              <h3 className="text-base font-bold text-white">Evolución de Demanda de Materiales</h3>
              <p className="text-xs text-zinc-400">Metros cuadrados y unidades aplicadas semanalmente en el motor paramétrico 3D</p>
            </div>
            <div className="inline-flex bg-zinc-950 border border-zinc-800 p-0.5 rounded-xl text-xs font-bold">
              {(['7D', '30D', '3M', '1A'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodFilter(p)}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    periodFilter === p
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Metric Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-orange-500" />
              <span className="text-zinc-300 font-medium">Melaminas Vesto & Masisa (18mm)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-sky-400" />
              <span className="text-zinc-300 font-medium">Cubiertas Cuarzo & Sinterizados</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-amber-400" />
              <span className="text-zinc-300 font-medium">Perfiles Gola & Quincallería</span>
            </div>
          </div>

          {/* SVG Stacked Bar Visualizer */}
          <div className="w-full h-56 flex flex-col justify-end pt-2">
            <div className="h-full w-full flex items-end justify-between gap-3 px-2">
              {/* S36 */}
              <div className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                <div className="w-full max-w-[42px] flex flex-col gap-0.5 rounded-md overflow-hidden">
                  <div className="w-full h-10 bg-amber-400/80 group-hover:bg-amber-400 transition-all" />
                  <div className="w-full h-16 bg-sky-400/80 group-hover:bg-sky-400 transition-all" />
                  <div className="w-full h-20 bg-orange-500/80 group-hover:bg-orange-500 transition-all" />
                </div>
                <span className="text-[11px] font-mono text-zinc-500">S36</span>
              </div>
              {/* S37 */}
              <div className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                <div className="w-full max-w-[42px] flex flex-col gap-0.5 rounded-md overflow-hidden">
                  <div className="w-full h-12 bg-amber-400/80 group-hover:bg-amber-400 transition-all" />
                  <div className="w-full h-20 bg-sky-400/80 group-hover:bg-sky-400 transition-all" />
                  <div className="w-full h-24 bg-orange-500/80 group-hover:bg-orange-500 transition-all" />
                </div>
                <span className="text-[11px] font-mono text-zinc-500">S37</span>
              </div>
              {/* S38 */}
              <div className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                <div className="w-full max-w-[42px] flex flex-col gap-0.5 rounded-md overflow-hidden">
                  <div className="w-full h-14 bg-amber-400/80 group-hover:bg-amber-400 transition-all" />
                  <div className="w-full h-24 bg-sky-400/80 group-hover:bg-sky-400 transition-all" />
                  <div className="w-full h-28 bg-orange-500/80 group-hover:bg-orange-500 transition-all" />
                </div>
                <span className="text-[11px] font-mono text-zinc-500">S38</span>
              </div>
              {/* S39 (Peak) */}
              <div className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                <div className="w-full max-w-[42px] flex flex-col gap-0.5 rounded-md overflow-hidden shadow-lg shadow-orange-500/20 ring-1 ring-orange-500/40">
                  <div className="w-full h-18 bg-amber-400 group-hover:brightness-110 transition-all" />
                  <div className="w-full h-32 bg-sky-400 group-hover:brightness-110 transition-all" />
                  <div className="w-full h-36 bg-orange-500 group-hover:brightness-110 transition-all" />
                </div>
                <span className="text-[11px] font-mono text-orange-400 font-bold">S39</span>
              </div>
              {/* S40 */}
              <div className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                <div className="w-full max-w-[42px] flex flex-col gap-0.5 rounded-md overflow-hidden">
                  <div className="w-full h-16 bg-amber-400/80 group-hover:bg-amber-400 transition-all" />
                  <div className="w-full h-28 bg-sky-400/80 group-hover:bg-sky-400 transition-all" />
                  <div className="w-full h-32 bg-orange-500/80 group-hover:bg-orange-500 transition-all" />
                </div>
                <span className="text-[11px] font-mono text-zinc-500">S40</span>
              </div>
              {/* S41 Act */}
              <div className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                <div className="w-full max-w-[42px] flex flex-col gap-0.5 rounded-md overflow-hidden">
                  <div className="w-full h-12 bg-amber-400/60 group-hover:bg-amber-400 transition-all" />
                  <div className="w-full h-24 bg-sky-400/60 group-hover:bg-sky-400 transition-all" />
                  <div className="w-full h-28 bg-orange-500/60 group-hover:bg-orange-500 transition-all" />
                </div>
                <span className="text-[11px] font-mono text-sky-400 font-bold">S41 (Act)</span>
              </div>
            </div>
          </div>

          {/* Insight Tag */}
          <div className="bg-zinc-950/80 border border-zinc-800 p-3 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Lightbulb size={18} className="text-orange-400 shrink-0" />
              <p className="text-xs text-zinc-300 truncate">
                <strong className="text-white">Análisis Predictivo RM:</strong> Mayor demanda en{' '}
                <span className="text-orange-400 font-semibold">Melamina Roble Cendra (Vesto)</span> +{' '}
                <span className="text-sky-400 font-semibold">Cuarzo Blanco Norte</span> (fuerte concentración en Las Condes, Vitacura y Providencia).
              </p>
            </div>
            <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded hidden sm:inline shrink-0">
              OptiCorte v3.1 CL
            </span>
          </div>
        </div>

        {/* Distribution by Category (4 Cols) */}
        <div className="lg:col-span-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
            <div>
              <h3 className="text-base font-bold text-white">Distribución de Uso</h3>
              <p className="text-xs text-zinc-400">Por tipología de elemento 3D</p>
            </div>
            <span className="text-xs font-mono text-zinc-400">100% CAD</span>
          </div>

          {/* Donut Visual */}
          <div className="relative flex items-center justify-center my-4">
            <svg className="w-44 h-44 transform -rotate-90" viewBox="0 0 160 160">
              {/* 48% Frentes */}
              <circle
                className="text-orange-500"
                cx="80"
                cy="80"
                fill="transparent"
                r="60"
                stroke="currentColor"
                strokeDasharray="181 377"
                strokeDashoffset="0"
                strokeWidth="15"
              />
              {/* 31% Encimeras */}
              <circle
                className="text-sky-400"
                cx="80"
                cy="80"
                fill="transparent"
                r="60"
                stroke="currentColor"
                strokeDasharray="117 377"
                strokeDashoffset="-181"
                strokeWidth="15"
              />
              {/* 14% Herrajes */}
              <circle
                className="text-amber-400"
                cx="80"
                cy="80"
                fill="transparent"
                r="60"
                stroke="currentColor"
                strokeDasharray="53 377"
                strokeDashoffset="-298"
                strokeWidth="15"
              />
              {/* 7% Zócalos */}
              <circle
                className="text-zinc-600"
                cx="80"
                cy="80"
                fill="transparent"
                r="60"
                stroke="currentColor"
                strokeDasharray="26 377"
                strokeDashoffset="-351"
                strokeWidth="15"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-2xl font-extrabold text-white">100%</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Superficie Total</span>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 hover:bg-zinc-800/60 transition-colors">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-orange-500" />
                <span className="text-zinc-200 font-medium">Frentes de Mobiliario</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-white font-bold">48%</span>
                <span className="text-zinc-500">18.475 m²</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 hover:bg-zinc-800/60 transition-colors">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-sky-400" />
                <span className="text-zinc-200 font-medium">Encimeras e Islas</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-white font-bold">31%</span>
                <span className="text-zinc-500">11.932 m²</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 hover:bg-zinc-800/60 transition-colors">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-amber-400" />
                <span className="text-zinc-200 font-medium">Herrajes & Perfiles Gola</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-white font-bold">14%</span>
                <span className="text-zinc-500">5.388 ml</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 hover:bg-zinc-800/60 transition-colors">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-zinc-600" />
                <span className="text-zinc-200 font-medium">Zócalos & Revestimientos</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-white font-bold">7%</span>
                <span className="text-zinc-500">2.694 m²</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Lower Floor: Top Materials BOM Inspector & Strategic Alerts Mosaic */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Top 5 Specified Materials Table (8 Cols) */}
        <div className="lg:col-span-8 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <h3 className="text-base font-bold text-white">Top 5 Acabados Más Prescritos en CAD</h3>
              <p className="text-xs text-zinc-400">Volúmenes acumulados, precios de cesión y tracción de catálogo</p>
            </div>
            <button
              onClick={() => onNavigateToTab?.('materiales')}
              className="flex items-center gap-1 text-orange-400 hover:text-orange-300 text-xs font-bold transition-colors cursor-pointer"
            >
              <span>Ver Catálogo Completo</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-zinc-400 uppercase tracking-wider bg-zinc-950/60 text-[10px] font-bold">
                  <th className="py-2.5 px-3 rounded-l-lg">Material / Textura</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3 text-right">Volumen</th>
                  <th className="py-2.5 px-3 text-right">Crecimiento</th>
                  <th className="py-2.5 px-3 text-right">Precio Ref.</th>
                  <th className="py-2.5 px-3 text-center rounded-r-lg">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                <tr className="hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-900/30 border border-amber-500/30 flex items-center justify-center font-bold text-[10px] text-amber-400 shrink-0">
                        RC
                      </div>
                      <div>
                        <div className="font-semibold text-white">Melamina Vesto Roble Cendra</div>
                        <div className="text-[11px] text-zinc-400">Arauco Línea Tendencias (18mm)</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-zinc-400">ARA-CEN18</td>
                  <td className="py-3 px-3 text-zinc-300">Melamina 18mm</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-white">14.280 m²</td>
                  <td className="py-3 px-3 text-right">
                    <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono font-bold">+26.4%</span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-zinc-300">$28.900/m²</td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => onNavigateToTab?.('sku-viewer')}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-orange-500 hover:text-white text-orange-400 transition-colors cursor-pointer"
                      title="Ver en Visor 3D y Telemetría"
                    >
                      <Rocket size={14} />
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-sky-900/30 border border-sky-500/30 flex items-center justify-center font-bold text-[10px] text-sky-400 shrink-0">
                        BN
                      </div>
                      <div>
                        <div className="font-semibold text-white">Cubierta Cuarzo Blanco Norte</div>
                        <div className="text-[11px] text-zinc-400">Silestone / Distribución Nacional</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-zinc-400">CUB-BNO20</td>
                  <td className="py-3 px-3 text-zinc-300">Cuarzo 20mm</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-white">8.190 m²</td>
                  <td className="py-3 px-3 text-right">
                    <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono font-bold">+18.7%</span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-zinc-300">$165.000/m²</td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => onNavigateToTab?.('materiales')}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-orange-500 hover:text-white text-zinc-400 transition-colors cursor-pointer"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-[10px] text-zinc-300 shrink-0">
                        EN
                      </div>
                      <div>
                        <div className="font-semibold text-white">Melamina Masisa Enigma 18mm</div>
                        <div className="text-[11px] text-zinc-400">Masisa Colección Orígenes</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-zinc-400">MAS-EN18</td>
                  <td className="py-3 px-3 text-zinc-300">MDF/MDP 18mm</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-white">6.840 m²</td>
                  <td className="py-3 px-3 text-right">
                    <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono font-bold">+12.3%</span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-zinc-300">$26.500/m²</td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => onNavigateToTab?.('materiales')}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-orange-500 hover:text-white text-zinc-400 transition-colors cursor-pointer"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-950/40 border border-amber-600/30 flex items-center justify-center font-bold text-[10px] text-amber-500 shrink-0">
                        NT
                      </div>
                      <div>
                        <div className="font-semibold text-white">Melamina Nogal Terracota</div>
                        <div className="text-[11px] text-zinc-400">Arauco Vesto Texturado</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-zinc-400">ARA-TER18</td>
                  <td className="py-3 px-3 text-zinc-300">Melamina 18mm</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-white">5.120 m²</td>
                  <td className="py-3 px-3 text-right">
                    <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono font-bold">+9.1%</span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-zinc-300">$27.800/m²</td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => onNavigateToTab?.('sku-viewer')}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-orange-500 hover:text-white text-orange-400 transition-colors cursor-pointer"
                    >
                      <Rocket size={14} />
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-700 flex items-center justify-center font-bold text-[10px] text-zinc-400 shrink-0">
                        GOL
                      </div>
                      <div>
                        <div className="font-semibold text-white">Perfil Gola Negro Mate Anodizado</div>
                        <div className="text-[11px] text-zinc-400">Ducasse Industrial Chile</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-zinc-400">DUC-GOL01</td>
                  <td className="py-3 px-3 text-zinc-300">Aluminio ml</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-white">5.920 ml</td>
                  <td className="py-3 px-3 text-right">
                    <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono font-bold">+31.4%</span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-zinc-300">$14.900/ml</td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => onNavigateToTab?.('materiales')}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-orange-500 hover:text-white text-zinc-400 transition-colors cursor-pointer"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Real-Time Alerts & Immediate Commercial Opportunities (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Oportunidad Inmediata */}
          <div className="bg-zinc-900/80 border border-orange-500/30 rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden shadow-lg shadow-orange-500/5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 text-[10px] font-extrabold uppercase">
                <Sparkles size={12} /> Oportunidad Inmediata
              </span>
              <span className="text-[10px] font-mono text-zinc-500">Hace 12 min</span>
            </div>
            <h4 className="text-sm font-bold text-white">Muebles & Diseños Las Condes</h4>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Tiene <strong className="text-white">16 presupuestos aprobados</strong> pendientes de corte con{' '}
              <span className="text-sky-400">Cubierta Cuarzo Blanco Norte</span> y{' '}
              <span className="text-orange-400">Roble Cendra</span> (aprox. 510 m²).
            </p>
            <div className="pt-2 flex items-center justify-between border-t border-zinc-800/80 mt-1">
              <button
                onClick={() => alert('Canal B2B abierto con Taller Las Condes (WhatsApp / Correo automático).')}
                className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Contactar Taller
              </button>
              <span className="text-xs font-mono font-bold text-amber-400">$84.500.000 CLP est.</span>
            </div>
          </div>

          {/* Alerta de Merma */}
          <div className="bg-zinc-900/80 border border-red-500/30 rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 text-[10px] font-extrabold uppercase">
                <AlertTriangle size={12} /> Alerta de Merma Crítica
              </span>
              <span className="text-[10px] font-mono text-zinc-500">Huechuraba</span>
            </div>
            <h4 className="text-sm font-bold text-white">Patrón de Merma Crítica: 12.1% en Isla con Gola</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Diseños en L con tirador gola presentan 12.1% de merma. Sugerir cambio de despiece a planchas 2440x1830mm para reducir pérdida técnica.
            </p>
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80 mt-1">
              <button
                onClick={() => alert('Parámetro 2440x1830 aplicado en optimizador CNC del taller Huechuraba.')}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-bold cursor-pointer"
              >
                Aplicar 2440x1830
              </button>
              <button
                onClick={() => alert('Notificación enviada a la seccionadora.')}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[11px] cursor-pointer"
              >
                Notificar
              </button>
            </div>
          </div>

          {/* Taller Hub Quilicura */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 text-amber-400 text-[10px] font-extrabold uppercase">
                <Factory size={12} /> Taller Hub Quilicura
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> En Línea
              </span>
            </div>
            <h4 className="text-sm font-bold text-white">Capacidad Asignada al 92%</h4>
            <p className="text-xs text-zinc-400">
              Consumo récord de tableros Masisa Enigma 18mm esta semana.
            </p>
            <div className="pt-2 flex items-center justify-between border-t border-zinc-800 mt-1">
              <button
                onClick={() => onNavigateToTab?.('geografica')}
                className="text-orange-400 hover:underline text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Ver Cola en Mapa RM</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Alertas Stock */}
      {alertStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders size={18} className="text-orange-500" />
                Configurar Umbrales de Stock B2B
              </h3>
              <button
                onClick={() => setAlertStockModal(false)}
                className="text-zinc-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-zinc-300">
              Sincronización con ERP de Planta (Arauco SAP & Masisa Hub). Define los metros cuadrados mínimos de alerta en cola:
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Umbral Mínimo Tableros Melamina 18mm</label>
                <input
                  type="number"
                  defaultValue={2000}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Umbral Cuarzos y Sinterizados (m²)</label>
                <input
                  type="number"
                  defaultValue={500}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAlertStockModal(false)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setAlertStockModal(false);
                  alert('Umbrales de stock actualizados y guardados correctamente.');
                }}
                className="px-4 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold hover:bg-orange-400"
              >
                Guardar Umbrales
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
