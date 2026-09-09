import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Package,
  Layers,
  FolderCheck,
  ShieldCheck,
  Building,
  Calendar,
  Hash,
  EyeOff,
  Filter,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';

interface ProviderAnalyticsTabProps {
  currentProviderId?: string;
  isSuperAdmin?: boolean;
}

export function ProviderAnalyticsTab({ currentProviderId, isSuperAdmin = true }: ProviderAnalyticsTabProps) {
  const { providers, getProviderStats, projects, textures } = useAdminStore();

  // Si se pasa currentProviderId, se usa como inicial; de lo contrario el primer proveedor
  const [selectedProviderId, setSelectedProviderId] = useState<string>(
    currentProviderId || (providers[0]?.id ?? 'prov-masisa')
  );

  const selectedProvider = useMemo(() => {
    return providers.find((p) => p.id === selectedProviderId) || providers[0];
  }, [providers, selectedProviderId]);

  // Obtener estadísticas del proveedor seleccionado
  const stats = useMemo(() => {
    if (!selectedProvider) return null;
    return getProviderStats(selectedProvider.id);
  }, [selectedProvider, getProviderStats, projects, textures]);

  if (!selectedProvider) {
    return (
      <div className="p-12 text-center text-zinc-400">
        No hay proveedores configurados en el sistema.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con Selector de Proveedor y Badge de Privacidad */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/80 p-5 rounded-2xl border border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
            <BarChart3 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Métricas y Demanda de Productos</h2>
              <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-full flex items-center gap-1">
                <ShieldCheck size={11} /> Datos Anonimizados
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Estadísticas en tiempo real sobre la especificación y uso de tus terminaciones en proyectos guardados.
            </p>
          </div>
        </div>

        {/* Selector de Proveedor (habilitado para Superadmin o para ver otros) */}
        {isSuperAdmin && (
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1">
              <Building size={14} /> Proveedor:
            </span>
            <select
              value={selectedProviderId}
              onChange={(e) => setSelectedProviderId(e.target.value)}
              className="py-2 px-3 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-orange-500"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.commissionPercentage}% Comisión)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Aviso de Privacidad y Cumplimiento */}
      <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl flex items-center gap-3 text-xs text-zinc-400">
        <EyeOff size={16} className="text-amber-400 shrink-0" />
        <span>
          <strong className="text-zinc-200">Privacidad del Cliente Garantizada:</strong> Por política de confidencialidad comercial de Arquify, las estadísticas reflejan únicamente métricas de consumo y especificación técnica (diseños, metros y unidades). Los datos personales, nombres de clientes y contactos son estrictamente privados.
        </span>
      </div>

      {/* Tarjetas de Métricas Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase tracking-wider">
            <span>Proyectos que usan tus Productos</span>
            <FolderCheck size={18} className="text-orange-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">
              {stats?.totalProjects ?? 0}
            </span>
            <span className="text-xs text-zinc-500">proyectos activos</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Diseños de cocina, clósets y proyectos comerciales guardados.
          </p>
        </div>

        <div className="p-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase tracking-wider">
            <span>Especificaciones de Productos</span>
            <Package size={18} className="text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">
              {stats?.totalProductsUsed ?? 0}
            </span>
            <span className="text-xs text-zinc-500">usos en despieces</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Total de partes y piezas calculadas con tus códigos de terminación.
          </p>
        </div>

        <div className="p-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase tracking-wider">
            <span>Comisión Acordada con Arquify</span>
            <TrendingUp size={18} className="text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-amber-400">
              {selectedProvider.commissionPercentage ?? 15}%
            </span>
            <span className="text-xs text-zinc-500">retención venta</span>
          </div>
          <p className="text-[11px] text-emerald-400/90 font-medium">
            Recibes el {100 - (selectedProvider.commissionPercentage ?? 15)}% neto de cada plancha vendida.
          </p>
        </div>
      </div>

      {/* Desglose de Productos más utilizados (Ranking y Códigos) */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers size={17} className="text-orange-400" />
            Demanda por Código y Nombre de Producto
          </h3>
          <span className="text-xs text-zinc-500 font-mono">
            {stats?.productsBreakdown.length || 0} terminaciones analizadas
          </span>
        </div>

        {stats && stats.productsBreakdown.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-[11px] uppercase text-zinc-400 font-bold tracking-wider">
                  <th className="pb-3 pl-2">Código / SKU</th>
                  <th className="pb-3">Nombre del Producto</th>
                  <th className="pb-3">Piezas / Usos</th>
                  <th className="pb-3">Área Estimada</th>
                  <th className="pb-3">Participación Relativa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {stats.productsBreakdown.map((item, idx) => {
                  const maxUsage = Math.max(...stats.productsBreakdown.map((b) => b.count), 1);
                  const percentage = Math.round((item.count / maxUsage) * 100);

                  return (
                    <tr key={item.code || idx} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 pl-2 font-mono text-orange-400 font-bold">
                        {item.code}
                      </td>
                      <td className="py-3 font-semibold text-white">
                        {item.name}
                      </td>
                      <td className="py-3 font-mono text-zinc-300">
                        <span className="px-2 py-0.5 bg-zinc-800 rounded-md">
                          {item.count} {item.count === 1 ? 'pieza' : 'piezas'}
                        </span>
                      </td>
                      <td className="py-3 font-mono font-bold text-slate-200">
                        {item.estimatedAreaM2.toFixed(2)} m²
                      </td>
                      <td className="py-3 w-48">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(percentage, 10)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono w-8">
                            {percentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-zinc-950/40 rounded-xl border border-dashed border-zinc-800 space-y-1.5">
            <Package size={24} className="mx-auto text-zinc-600 mb-1" />
            <p className="text-xs font-semibold text-zinc-300">
              Aún no hay proyectos guardados con productos de este proveedor
            </p>
            <p className="text-[11px] text-zinc-500">
              Cuando los usuarios especifiquen tus melaminas o laminados en sus muebles, aparecerán aquí.
            </p>
          </div>
        )}
      </div>

      {/* Historial Anonimizado de Proyectos */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderCheck size={17} className="text-emerald-400" />
              Proyectos donde se especificaron tus productos (Anonimizado)
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Historial de especificación por fecha y tipo de mobiliario.
            </p>
          </div>
        </div>

        {stats && stats.anonymousProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stats.anonymousProjects.map((p) => (
              <div
                key={p.id}
                className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-orange-500/15 border border-orange-500/30 text-orange-300 text-[10px] font-bold uppercase rounded-md">
                      {p.type}
                    </span>
                    <span className="text-xs font-bold text-white font-mono">{p.code}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                    <Calendar size={11} /> {p.date}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold block mb-1">
                    Terminaciones Utilizadas ({p.productsUsedCount} piezas):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {p.matchedProducts.map((prod, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-zinc-900 border border-zinc-700/80 text-zinc-300 rounded-md text-[11px] font-medium"
                      >
                        {prod.code} • {prod.name} ({prod.count})
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] text-zinc-500">
                  <span>ID Registro: {p.id.slice(0, 8)}...</span>
                  <span className="text-emerald-400 font-medium">Cliente protegido (No revelado)</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-zinc-950/40 rounded-xl border border-dashed border-zinc-800 space-y-1">
            <p className="text-xs font-semibold text-zinc-400">
              No hay proyectos registrados para este proveedor.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
