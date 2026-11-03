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
  Users,
  Sun,
  Moon,
  Clock,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { useTenantDataStore } from '../../store/tenantDataStore';
import { isSupabaseConfigured } from '../../lib/supabase';
import { ProjectsManagerTab } from './ProjectsManagerTab';
import { SuppliesPriceTab } from './SuppliesPriceTab';
import { TexturesManagerTab } from './TexturesManagerTab';
import { UsersAndProvidersTab } from './UsersAndProvidersTab';
import { ProviderAnalyticsTab } from './ProviderAnalyticsTab';
import { ManufacturingRatesTab } from './ManufacturingRatesTab';
import { Wrench } from 'lucide-react';

interface AdminBackofficeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToModule: (route: 'kitchen' | 'closet' | 'special' | 'hpl-bathroom' | 'office' | 'chair') => void;
}

export function AdminBackofficeModal({
  isOpen,
  onClose,
  onNavigateToModule,
}: AdminBackofficeModalProps) {
  const { adminEmail, currentUser, logout: localLogout, projects, supplies, textures, themeMode, toggleThemeMode } = useAdminStore();
  const { user: supabaseUser, tenant: supabaseTenant, logout: supabaseLogout } = useSupabaseAuthStore();
  const { fetchTenantData, materials, hardware, projects: cloudProjects } = useTenantDataStore();
  const isCloud = isSupabaseConfigured();

  const isFreeUser = currentUser?.role === 'free_user' || supabaseUser?.role === 'free_user' || currentUser?.role === 'designer' || supabaseUser?.role === 'designer';
  const isSuperAdmin = !isFreeUser && !supabaseUser?.tenant_id && (!currentUser || currentUser.role === 'superadmin');
  const isProvider = !isFreeUser && !isSuperAdmin;
  const currentTenantId = supabaseUser?.tenant_id || currentUser?.tenant_id || '';
  const currentTenantName = supabaseTenant?.name || currentUser?.tenant_name || '';

  const [activeTab, setActiveTab] = useState<'projects' | 'supplies' | 'textures' | 'users' | 'analytics' | 'manufacturing'>(
    isFreeUser ? 'projects' : isProvider ? 'supplies' : 'projects'
  );

  useEffect(() => {
    if (isFreeUser) {
      setActiveTab('projects');
    } else if (isProvider && (activeTab === 'projects' || activeTab === 'users' || activeTab === 'manufacturing')) {
      setActiveTab('supplies');
    }
  }, [isFreeUser, isProvider, activeTab]);

  const isLight = themeMode === 'light';

  // Insumos y texturas filtradas si es sesión de proveedor
  const displayedSupplies = isProvider
    ? supplies.filter((s) => {
        if (currentTenantId && s.providerId === currentTenantId) return true;
        const pId = (currentTenantId || '').toLowerCase();
        const pName = (currentTenantName || '').toLowerCase();
        const sup = (s.supplier || '').toLowerCase();
        const name = (s.name || '').toLowerCase();
        const code = (s.code || '').toLowerCase();

        // Caso específico Abet Laminati: aislar de herrajes de terceros (Rehau, DTC, Häfele)
        if (pId.includes('abet') || pName.includes('abet')) {
          if (
            sup.includes('rehau') ||
            sup.includes('dtc') ||
            sup.includes('häfele') ||
            sup.includes('hafele') ||
            s.category === 'herrajes'
          ) {
            return false;
          }
          return (
            sup.includes('abet') ||
            name.includes('abet') ||
            code.includes('abet') ||
            name.includes('totoy') ||
            code.includes('lam-hpl')
          );
        }

        if (pId.includes('masisa') || pName.includes('masisa')) {
          return sup.includes('masisa') || name.includes('masisa');
        }
        if (pId.includes('arauco') || pName.includes('arauco')) {
          return sup.includes('arauco') || sup.includes('vesto');
        }
        if (pId.includes('qstone') || pName.includes('qstone') || pId.includes('sysprotec') || pName.includes('sysprotec')) {
          return sup.includes('qstone') || sup.includes('sysprotec');
        }

        if (currentTenantName) {
          return sup.includes(pName) || pName.includes(sup);
        }
        return false;
      })
    : supplies;

  const displayedTextures = isProvider
    ? textures.filter((t) => {
        if (currentTenantId && t.providerId === currentTenantId) return true;
        if (currentTenantName) {
          const pName = currentTenantName.toLowerCase();
          const b = (t.brand || '').toLowerCase();
          const pn = (t.providerName || '').toLowerCase();
          return b.includes(pName) || pName.includes(b) || pn.includes(pName) || pName.includes(pn);
        }
        return false;
      })
    : textures;

  const pendingTexturesCount = displayedTextures.filter((t) => t.approvalStatus === 'pending').length;

  const providerInventoryValue = displayedSupplies.reduce(
    (acc, s) => acc + (s.priceClp * (s.stockRef ?? 1)),
    0
  );

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

  const handleLoadProject = (route: 'kitchen' | 'closet' | 'special' | 'hpl-bathroom' | 'office' | 'chair') => {
    onClose();
    onNavigateToModule(route);
  };

  const totalProjectsValue = projects.reduce(
    (acc, p) => acc + (p.totalCostEstimateClp || 0),
    0
  );

  const emailDisplay = supabaseUser?.email || currentUser?.email || adminEmail || 'marcelo@robfu.cl';
  const roleDisplay = supabaseUser?.role || currentUser?.role || 'Superadmin';
  const userInitials = (currentUser?.name || emailDisplay.split('@')[0] || 'AD')
    .substring(0, 2)
    .toUpperCase();

  const getTabTitle = () => {
    switch (activeTab) {
      case 'projects':
        return isFreeUser ? 'Mis Proyectos Guardados' : 'Gestor de Proyectos & Pipeline';
      case 'supplies':
        return isProvider ? 'Mis Insumos y Precios' : 'Tabla de Precios e Insumos';
      case 'textures':
        return isProvider ? 'Mis Diseños & Texturas 3D' : 'Gestor de Texturas & Decorativos 3D';
      case 'analytics':
        return isProvider ? 'Mis Estadísticas & Métricas' : 'Estadísticas & Telemetría Proveedor';
      case 'users':
        return 'Usuarios & Empresas Proveedoras';
      case 'manufacturing':
        return 'Tarifas B2B & Parámetros de Manufactura';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex w-screen h-screen overflow-hidden animate-in fade-in duration-200 transition-colors ${
        isLight ? 'bg-slate-100 text-zinc-900' : 'bg-zinc-950 text-slate-100'
      }`}
    >
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside
        className={`w-72 sm:w-80 border-r flex flex-col h-full shrink-0 relative z-20 shadow-xl transition-colors ${
          isLight ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-zinc-800'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`p-5 border-b flex items-center gap-3 ${
            isLight ? 'border-zinc-200 bg-zinc-50/50' : 'border-zinc-800/80 bg-zinc-950/40'
          }`}
        >
          <div className="p-2.5 bg-orange-500/15 border border-orange-500/30 rounded-xl text-orange-500 shrink-0">
            <ShieldCheck size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bellota text-2xl font-bold lowercase text-orange-500 tracking-tight select-none">
                arquify
              </span>
              <span
                className={`text-sm font-extrabold tracking-wider uppercase px-2 py-0.5 rounded ${
                  isLight ? 'bg-zinc-200 text-zinc-900' : 'bg-zinc-800 text-white'
                }`}
              >
                Backoffice
              </span>
            </div>
            <p className={`text-xs mt-0.5 font-medium ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>
              Plataforma B2B & Control de Catálogo
            </p>
          </div>
        </div>

        {/* User Account Info Section (Top Left) */}
        <div
          className={`p-4 mx-3 my-4 rounded-2xl border transition-all ${
            isLight
              ? 'bg-gradient-to-br from-orange-500/5 to-amber-500/5 border-orange-200 text-zinc-800'
              : 'bg-gradient-to-br from-zinc-800/80 to-zinc-800/40 border-zinc-700/60 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center font-extrabold text-white text-base shadow-lg shadow-orange-500/20 shrink-0">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-mono font-bold text-orange-500 uppercase tracking-wide truncate">
                  {roleDisplay}
                </span>
                {isCloud && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded shrink-0">
                    <Cloud size={10} /> RLS
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold truncate leading-snug" title={emailDisplay}>
                {emailDisplay}
              </p>
              {(supabaseTenant?.name || currentUser?.tenant_name) && (
                <p className="text-xs text-orange-400 font-medium truncate flex items-center gap-1 mt-0.5">
                  <Building size={12} className="shrink-0" />
                  <span className="truncate">{supabaseTenant?.name || currentUser?.tenant_name}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Menu Links */}
        <nav className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-extrabold uppercase tracking-widest text-zinc-400">
            Menú Principal
          </div>

          {isFreeUser ? (
            <button
              onClick={() => setActiveTab('projects')}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-between transition-all cursor-pointer bg-orange-500 text-white shadow-md shadow-orange-500/20"
            >
              <div className="flex items-center gap-3">
                <FolderKanban size={18} />
                <span>Mis Proyectos</span>
              </div>
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-white/20 rounded-full">
                {projects.filter((p) => p.userId === currentUser?.id || p.userEmail === currentUser?.email).length}
              </span>
            </button>
          ) : (
            <>
              {isSuperAdmin && (
                <button
                  onClick={() => setActiveTab('projects')}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'projects'
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                      : isLight
                      ? 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                      : 'text-slate-300 hover:bg-zinc-800/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FolderKanban size={18} />
                    <span>Gestor de Proyectos</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs font-mono font-bold rounded-full ${
                      activeTab === 'projects'
                        ? 'bg-white/20 text-white'
                        : isLight
                        ? 'bg-zinc-200 text-zinc-700'
                        : 'bg-zinc-800 text-slate-300'
                    }`}
                  >
                    {projects.length}
                  </span>
                </button>
              )}

              <button
                onClick={() => setActiveTab('supplies')}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-between transition-all cursor-pointer ${
                  activeTab === 'supplies'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : isLight
                    ? 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                    : 'text-slate-300 hover:bg-zinc-800/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <DollarSign size={18} />
                  <span>{isProvider ? 'Insumos & Precios' : 'Tabla de Precios'}</span>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs font-mono font-bold rounded-full ${
                    activeTab === 'supplies'
                      ? 'bg-white/20 text-white'
                      : isLight
                      ? 'bg-zinc-200 text-zinc-700'
                      : 'bg-zinc-800 text-slate-300'
                  }`}
                >
                  {displayedSupplies.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('textures')}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-between transition-all cursor-pointer ${
                  activeTab === 'textures'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : isLight
                    ? 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                    : 'text-slate-300 hover:bg-zinc-800/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Palette size={18} />
                  <span>{isProvider ? 'Diseños & Texturas 3D' : 'Gestor de Texturas'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {pendingTexturesCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-amber-400 text-zinc-950 text-[10px] font-extrabold rounded-full animate-pulse">
                      {pendingTexturesCount} VB
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 text-xs font-mono font-bold rounded-full ${
                      activeTab === 'textures'
                        ? 'bg-white/20 text-white'
                        : isLight
                        ? 'bg-zinc-200 text-zinc-700'
                        : 'bg-zinc-800 text-slate-300'
                    }`}
                  >
                    {displayedTextures.length}
                  </span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-between transition-all cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : isLight
                    ? 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                    : 'text-slate-300 hover:bg-zinc-800/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <BarChart3 size={18} />
                  <span>{isProvider ? 'Mis Estadísticas' : 'Estadísticas Proveedor'}</span>
                </div>
                <ChevronRight size={16} className="opacity-60" />
              </button>

              {isSuperAdmin && (
                <button
                  onClick={() => setActiveTab('users')}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'users'
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                      : isLight
                      ? 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                      : 'text-slate-300 hover:bg-zinc-800/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users size={18} />
                    <span>Usuarios & Proveedores</span>
                  </div>
                  <ChevronRight size={16} className="opacity-60" />
                </button>
              )}

              {isSuperAdmin && (
                <button
                  onClick={() => setActiveTab('manufacturing')}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'manufacturing'
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                      : isLight
                      ? 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                      : 'text-slate-300 hover:bg-zinc-800/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Wrench size={18} />
                    <span>Tarifas B2B Manufactura</span>
                  </div>
                  <ChevronRight size={16} className="opacity-60" />
                </button>
              )}
            </>
          )}
        </nav>

        {/* Sidebar Footer Controls */}
        <div
          className={`p-4 border-t space-y-2.5 shrink-0 ${
            isLight ? 'border-zinc-200 bg-zinc-50/80' : 'border-zinc-800 bg-zinc-950/60'
          }`}
        >
          {/* Light / Dark Mode Switcher */}
          <button
            onClick={toggleThemeMode}
            className={`w-full py-2.5 px-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-800'
                : 'bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700 text-amber-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {isLight ? (
                <Moon size={16} className="text-zinc-700" />
              ) : (
                <Sun size={16} className="text-amber-400" />
              )}
              <span>Tema Visual</span>
            </div>
            <span className="text-[11px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-zinc-500/10">
              {isLight ? 'Claro' : 'Oscuro'}
            </span>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* MAIN WORKSPACE VIEWPORT */}
      <div className="flex-1 h-full flex flex-col overflow-hidden relative">
        {/* Workspace Top Header Bar */}
        <header
          className={`h-20 px-6 sm:px-8 border-b flex items-center justify-between gap-6 shrink-0 z-10 transition-colors ${
            isLight ? 'bg-white/90 border-zinc-200' : 'bg-zinc-900/90 border-zinc-800'
          }`}
        >
          {/* Breadcrumb & Section Title */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-orange-500 uppercase tracking-wider">
              <span>arquify</span>
              <span>/</span>
              <span>Dashboard</span>
            </div>
            <h1
              className={`text-xl sm:text-2xl font-extrabold tracking-tight mt-0.5 ${
                isLight ? 'text-zinc-900' : 'text-white'
              }`}
            >
              {getTabTitle()}
            </h1>
          </div>

          {/* Key Metric Indicators & Exit Button */}
          <div className="flex items-center gap-4">
            {/* Value Estimate Metric Strip */}
            {!isFreeUser && (
              <div
                className={`hidden md:flex items-center gap-3 px-4 py-2 rounded-xl border ${
                  isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-800/60 border-zinc-700/80'
                }`}
              >
                <div className="p-2 bg-emerald-500/15 text-emerald-500 rounded-lg">
                  <TrendingUp size={18} />
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    {isProvider ? 'Valor Inventario' : 'Valor Cartera'}
                  </span>
                  <span className="text-sm font-mono font-extrabold text-orange-500">
                    ${(isProvider ? providerInventoryValue : totalProjectsValue).toLocaleString('es-CL')} CLP
                  </span>
                </div>
              </div>
            )}

            {/* Exit / Close Backoffice Button */}
            <button
              onClick={onClose}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 text-xs font-bold ${
                isLight
                  ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-700'
                  : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-slate-200'
              }`}
              title="Volver al Configurador 3D"
            >
              <X size={18} />
              <span className="hidden sm:inline">Volver a 3D</span>
            </button>
          </div>
        </header>

        {/* Content Body Viewport */}
        <main
          className={`flex-1 overflow-y-auto p-6 sm:p-8 ${
            isLight ? 'bg-slate-50 text-zinc-900' : 'bg-zinc-950 text-slate-100'
          }`}
        >
          {activeTab === 'projects' && (
            <ProjectsManagerTab
              onLoadProjectToModule={handleLoadProject}
              isFreeUserMode={isFreeUser}
            />
          )}
          {!isFreeUser && activeTab === 'supplies' && (
            <SuppliesPriceTab
              currentProviderId={currentTenantId}
              currentProviderName={currentTenantName}
              isSuperAdmin={isSuperAdmin}
            />
          )}
          {!isFreeUser && activeTab === 'textures' && (
            <TexturesManagerTab
              currentProviderId={currentTenantId}
              currentProviderName={currentTenantName}
              isSuperAdmin={isSuperAdmin}
            />
          )}
          {!isFreeUser && activeTab === 'analytics' && (
            <ProviderAnalyticsTab
              currentProviderId={currentTenantId}
              isSuperAdmin={isSuperAdmin}
            />
          )}
          {isSuperAdmin && activeTab === 'users' && <UsersAndProvidersTab />}
          {isSuperAdmin && activeTab === 'manufacturing' && <ManufacturingRatesTab />}
        </main>
      </div>
    </div>
  );
}

