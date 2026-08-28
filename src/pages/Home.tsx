import React, { useState } from 'react';
import { Box, LayoutDashboard, Sparkles, ArrowRight, Home as HomeIcon, Lock, Settings2, ShieldCheck, Layers, Shield, Building2 } from 'lucide-react';
import { useAdminStore } from '../store/adminStore';
import { AdminLoginModal } from '../components/admin/AdminLoginModal';
import { AdminBackofficeModal } from '../components/admin/AdminBackofficeModal';

export function Home({ onNavigate }: { onNavigate: (route: 'closet' | 'kitchen' | 'special' | 'sip-house' | 'hpl-bathroom' | 'concrete-house') => void }) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isBackofficeOpen, setIsBackofficeOpen] = useState(false);
  const isAuthenticated = useAdminStore((state) => state.isAuthenticated);

  const handleOpenAdmin = () => {
    if (isAuthenticated) {
      setIsBackofficeOpen(true);
    } else {
      setIsLoginOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-slate-200 font-sans p-8 flex flex-col items-center overflow-y-auto">
      <header className="w-full max-w-7xl flex flex-wrap justify-between items-center mb-16 gap-4">
        <div className="flex items-center gap-3">
          <span className="font-bellota text-4xl font-bold lowercase text-orange-500 tracking-tight select-none">
            arquify
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={handleOpenAdmin}
            className="group px-4 py-2 bg-zinc-900/90 hover:bg-orange-500/10 border border-orange-500/30 hover:border-orange-500 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-200 hover:text-orange-400 flex items-center gap-2 transition-all shadow-md shadow-orange-500/5 cursor-pointer"
            title="Panel de Superadministrador (Proyectos, Costos & Texturas)"
          >
            <div className="p-1 bg-orange-500/20 rounded-md text-orange-400 group-hover:scale-105 transition-transform">
              <Lock size={14} />
            </div>
            <span>Administración / Backoffice</span>
            {isAuthenticated && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Sesión activa" />
            )}
          </button>

          <div className="hidden sm:block text-sm font-semibold uppercase tracking-widest text-slate-500 border-l border-zinc-800 pl-4">
            Suite de Diseño 3D & BIM
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl flex flex-col items-center">
        <h1 className="text-4xl md:text-6xl font-bold text-center mb-6 tracking-tight">Planifica tus espacios con <br/><span className="text-orange-500">precisión milimétrica</span></h1>
        <p className="text-slate-400 text-center max-w-2xl mb-16 text-lg">Selecciona un módulo de diseño para comenzar. Crea muebles paramétricos detallados, cabinas sanitarias fenólicas o planifica casas industrializadas y estructuras de hormigón armado en 2D y 3D.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {/* Concrete House Card (Hormigón Armado ICH) */}
          <div 
            onClick={() => onNavigate('concrete-house')}
            className="group relative bg-zinc-900 border border-orange-500/50 rounded-2xl p-6 hover:border-orange-400 transition-all cursor-pointer overflow-hidden flex flex-col items-start min-h-[340px] shadow-lg shadow-orange-500/5 hover:shadow-orange-500/15"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/15 rounded-full blur-3xl -mr-20 -mt-20 transition-all group-hover:bg-orange-500/25"></div>
            <div className="p-3.5 bg-black/40 rounded-xl border border-orange-500/30 mb-4 z-10 relative">
              <Building2 size={28} className="text-orange-400" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-wide mb-1.5 z-10 relative text-white">Casas Hormigón Armado</h2>
            <div className="inline-block px-2.5 py-0.5 bg-orange-500/20 text-orange-300 text-[10px] font-bold uppercase tracking-widest rounded mb-2.5 z-10 relative border border-orange-500/30">ICH • NCh430 • NCh170 • Rayos X</div>
            <p className="text-slate-400 text-xs leading-relaxed mb-5 z-10 relative">Manual de Detallamiento ICH para 1 y 2 pisos. Malla central y doble malla, cuantías de acero, refuerzos de vanos a 45°, cubicación de m³ y moldajes.</p>
            <div className="mt-auto flex items-center gap-2 text-orange-400 font-bold uppercase text-xs tracking-wider group-hover:gap-3 transition-all z-10 relative">
              Iniciar Hormigón Armado <ArrowRight size={13} />
            </div>
          </div>

          {/* SIP House Card */}
          <div 
            onClick={() => onNavigate('sip-house')}
            className="group relative bg-zinc-900 border border-sky-500/40 rounded-2xl p-6 hover:border-sky-400 transition-all cursor-pointer overflow-hidden flex flex-col items-start min-h-[340px] shadow-lg shadow-sky-500/5 hover:shadow-sky-500/10"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl -mr-20 -mt-20 transition-all group-hover:bg-sky-500/20"></div>
            <div className="p-3.5 bg-black/40 rounded-xl border border-sky-500/20 mb-4 z-10 relative">
              <HomeIcon size={28} className="text-sky-400" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-wide mb-1.5 z-10 relative text-white">Configurador SIP</h2>
            <div className="inline-block px-2.5 py-0.5 bg-sky-500/20 text-sky-300 text-[10px] font-bold uppercase tracking-widest rounded mb-2.5 z-10 relative border border-sky-500/30">BIM + MEP + EETT</div>
            <p className="text-slate-400 text-xs leading-relaxed mb-5 z-10 relative">Ingeniería y fabricación de casas SIP (Template Molco 132.1 m²). Modulación 162/114/90/210, vanos, trazados MEP y cubicación comercial.</p>
            <div className="mt-auto flex items-center gap-2 text-sky-400 font-bold uppercase text-xs tracking-wider group-hover:gap-3 transition-all z-10 relative">
              Iniciar SIP <ArrowRight size={13} />
            </div>
          </div>

          {/* HPL Bathroom Partitions Card */}
          <div 
            onClick={() => onNavigate('hpl-bathroom')}
            className="group relative bg-zinc-900 border border-teal-500/40 rounded-2xl p-6 hover:border-teal-400 transition-all cursor-pointer overflow-hidden flex flex-col items-start min-h-[340px] shadow-lg shadow-teal-500/5 hover:shadow-teal-500/10"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -mr-20 -mt-20 transition-all group-hover:bg-teal-500/20"></div>
            <div className="p-3.5 bg-black/40 rounded-xl border border-teal-500/20 mb-4 z-10 relative">
              <Shield size={28} className="text-teal-400" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-wide mb-1.5 z-10 relative text-white">Separador Baños HPL</h2>
            <div className="inline-block px-2.5 py-0.5 bg-teal-500/20 text-teal-300 text-[10px] font-bold uppercase tracking-widest rounded mb-2.5 z-10 relative border border-teal-500/30">Abet Laminati & JNF</div>
            <p className="text-slate-400 text-xs leading-relaxed mb-5 z-10 relative">Cabinas fenólicas 10/12/15/19mm, patas y bisagras JNF Inox/PVD, optimización de cortes Nesting 2D y recinto cerámico 60x60.</p>
            <div className="mt-auto flex items-center gap-2 text-teal-400 font-bold uppercase text-xs tracking-wider group-hover:gap-3 transition-all z-10 relative">
              Configurar Baños <ArrowRight size={13} />
            </div>
          </div>

          {/* Kitchen Card */}
          <div 
            onClick={() => onNavigate('kitchen')}
            className="group relative bg-zinc-900 border border-white/10 rounded-2xl p-6 hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden flex flex-col items-start min-h-[340px]"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 transition-all group-hover:bg-blue-500/20"></div>
            <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 mb-4 z-10 relative">
              <LayoutDashboard size={28} className="text-blue-500" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-wide mb-1.5 z-10 relative">Cocinas & BIM</h2>
            <div className="inline-block px-2.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest rounded mb-2.5 z-10 relative">Motor BIM 2D/3D</div>
            <p className="text-slate-400 text-xs leading-relaxed mb-5 z-10 relative">Dibuja muros en 2D y arrastra gabinetes y aéreos en 3D con imantación automática.</p>
            <div className="mt-auto flex items-center gap-2 text-blue-500 font-bold uppercase text-xs tracking-wider group-hover:gap-3 transition-all z-10 relative">
              Abrir Cocinas <ArrowRight size={13} />
            </div>
          </div>

          {/* Closet Card */}
          <div 
            onClick={() => onNavigate('closet')}
            className="group relative bg-zinc-900 border border-white/10 rounded-2xl p-6 hover:border-orange-500/50 transition-all cursor-pointer overflow-hidden flex flex-col items-start min-h-[340px]"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -mr-20 -mt-20 transition-all group-hover:bg-orange-500/20"></div>
            <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 mb-4 z-10 relative">
              <Box size={28} className="text-orange-500" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-wide mb-1.5 z-10 relative">Clóset Modular</h2>
            <div className="inline-block px-2.5 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] font-bold uppercase tracking-widest rounded mb-2.5 z-10 relative">Modular 3D</div>
            <p className="text-slate-400 text-xs leading-relaxed mb-5 z-10 relative">Configurador paramétrico modular. Ajusta dimensiones, materiales, divisiones internas y herrajes.</p>
            <div className="mt-auto flex items-center gap-2 text-orange-500 font-bold uppercase text-xs tracking-wider group-hover:gap-3 transition-all z-10 relative">
              Iniciar Diseño <ArrowRight size={13} />
            </div>
          </div>

          {/* Muebles Especiales Card */}
          <div 
            onClick={() => onNavigate('special')}
            className="group relative bg-zinc-900 border border-white/10 rounded-2xl p-6 hover:border-amber-500/50 transition-all cursor-pointer overflow-hidden flex flex-col items-start min-h-[340px]"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 transition-all group-hover:bg-amber-500/20"></div>
            <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 mb-4 z-10 relative">
              <Sparkles size={28} className="text-amber-400" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-wide mb-1.5 z-10 relative">Muebles Especiales</h2>
            <div className="inline-block px-2.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-widest rounded mb-2.5 z-10 relative">Abet & Madera</div>
            <p className="text-slate-400 text-xs leading-relaxed mb-5 z-10 relative">Aparador vitrina individual de autor con fondo decorativo exclusivo, marco de madera y patas de acero.</p>
            <div className="mt-auto flex items-center gap-2 text-amber-400 font-bold uppercase text-xs tracking-wider group-hover:gap-3 transition-all z-10 relative">
              Configurar <ArrowRight size={13} />
            </div>
          </div>
        </div>
      </main>

      {/* Superadmin Modals */}
      <AdminLoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={() => {
          setIsLoginOpen(false);
          setIsBackofficeOpen(true);
        }}
      />

      <AdminBackofficeModal
        isOpen={isBackofficeOpen}
        onClose={() => setIsBackofficeOpen(false)}
        onNavigateToModule={onNavigate}
      />
    </div>
  );
}
