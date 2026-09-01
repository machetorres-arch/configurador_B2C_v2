import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FolderKanban,
  DollarSign,
  Palette,
  LogOut,
  X,
  Sparkles,
  BarChart3,
  Layers,
  FileSpreadsheet,
  CheckCircle,
  HelpCircle,
  Building,
  Database,
  Cloud,
  Users
} from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { useTenantDataStore } from '../../store/tenantDataStore';
import { isSupabaseConfigured } from '../../lib/supabase';
import { ProjectsManagerTab } from './ProjectsManagerTab';
import { SuppliesPriceTab } from './SuppliesPriceTab';
import { TexturesManagerTab } from './TexturesManagerTab';
import { UsersAndProvidersTab } from './UsersAndProvidersTab';

interface AdminBackofficeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToModule: (route: 'sip-house' | 'kitchen' | 'closet' | 'special') => void;
}

export function AdminBackofficeModal({
  isOpen,
  onClose,
  onNavigateToModule,
}: AdminBackofficeModalProps) {
  const [activeTab, setActiveTab] = useState<'projects' | 'supplies' | 'textures' | 'users'>('projects');
  const { adminEmail, logout: localLogout, projects, supplies, textures } = useAdminStore();
  const { user: supabaseUser, tenant: supabaseTenant, logout: supabaseLogout } = useSupabaseAuthStore();
  const { fetchTenantData, materials, hardware, projects: cloudProjects } = useTenantDataStore();
  const isCloud = isSupabaseConfigured();

  useEffect(() => {
    if (isOpen && isCloud && supabaseUser?.tenant_id) {
      fetchTenantData();
    }
  }, [isOpen, isCloud, supabaseUser?.tenant_id]);

  if (!isOpen) return null;

  const handleLogout = async () => {
    if (isCloud) {
      await supabaseLogout();
    }
    localLogout();
    onClose();
  };

  const handleLoadProject = (route: 'sip-house' | 'kitchen' | 'closet' | 'special') => {
    onClose();
    onNavigateToModule(route);
  };

  const totalProjectsValue = projects.reduce(
    (acc, p) => acc + (p.totalCostEstimateClp || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden">
      <div className="relative w-full max-w-7xl h-[94vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Top Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        {/* Modal Header */}
        <header className="p-4 sm:p-5 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4 bg-zinc-900/90 relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-500/15 border border-orange-500/30 rounded-xl text-orange-400">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase">
                  Mueble<span className="text-orange-500">Studio</span> Backoffice
                </h1>
                <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded">
                  {supabaseUser?.role || 'Superadmin'}
                </span>
                {isCloud && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                    <Cloud size={10} /> Supabase RLS
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                {supabaseTenant?.name ? (
                  <span className="text-orange-300 font-semibold flex items-center gap-1">
                    <Building size={12} /> {supabaseTenant.name}
                  </span>
                ) : (
                  'Panel Central de Proyectos, Precios Unitarios de Insumos & Catálogo de Texturas'
                )}
              </p>
            </div>
          </div>

          {/* User & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                {supabaseTenant?.name ? 'Proveedor / Usuario' : 'Sesión Activa'}
              </span>
              <span className="text-xs font-mono text-slate-300 font-semibold">
                {supabaseUser?.email || adminEmail || 'marcelo@robfu.cl'}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-zinc-800/80 hover:bg-red-500/20 border border-zinc-700 hover:border-red-500/30 text-slate-300 hover:text-red-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              title="Cerrar ventana"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Quick KPI Bar */}
        <div className="px-5 py-3 bg-zinc-900/50 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-4 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <FolderKanban size={15} className="text-orange-400" />
              <span className="text-slate-400">Proyectos Guardados:</span>
              <strong className="text-white font-mono">{projects.length}</strong>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign size={15} className="text-emerald-400" />
              <span className="text-slate-400">Insumos Registrados:</span>
              <strong className="text-white font-mono">{supplies.length}</strong>
            </div>
            <div className="flex items-center gap-2">
              <Palette size={15} className="text-sky-400" />
              <span className="text-slate-400">Texturas Activas:</span>
              <strong className="text-white font-mono">{textures.filter((t) => t.active).length}</strong>
            </div>
          </div>

          <div className="text-[11px] text-zinc-400">
            Valor Estimado Cartera:{' '}
            <strong className="text-orange-400 font-mono text-xs">
              ${totalProjectsValue.toLocaleString('es-CL')} CLP
            </strong>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 bg-zinc-950 border-b border-zinc-800 flex items-center gap-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'projects'
                ? 'border-orange-500 text-orange-400 bg-orange-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-zinc-900/50'
            }`}
          >
            <FolderKanban size={15} />
            Gestor de Proyectos ({projects.length})
          </button>

          <button
            onClick={() => setActiveTab('supplies')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'supplies'
                ? 'border-orange-500 text-orange-400 bg-orange-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-zinc-900/50'
            }`}
          >
            <DollarSign size={15} />
            Tabla de Precios e Insumos ({supplies.length})
          </button>

          <button
            onClick={() => setActiveTab('textures')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'textures'
                ? 'border-orange-500 text-orange-400 bg-orange-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-zinc-900/50'
            }`}
          >
            <Palette size={15} />
            Gestor de Texturas & Decorativos ({textures.length})
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'users'
                ? 'border-orange-500 text-orange-400 bg-orange-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-zinc-900/50'
            }`}
          >
            <Users size={15} />
            Usuarios & Proveedores
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-950/80">
          {activeTab === 'projects' && (
            <ProjectsManagerTab onLoadProjectToModule={handleLoadProject} />
          )}
          {activeTab === 'supplies' && <SuppliesPriceTab />}
          {activeTab === 'textures' && <TexturesManagerTab />}
          {activeTab === 'users' && <UsersAndProvidersTab />}
        </div>
      </div>
    </div>
  );
}
