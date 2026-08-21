import React from 'react';
import { Box, LayoutDashboard, ArrowRight } from 'lucide-react';

export function Home({ onNavigate }: { onNavigate: (route: 'closet' | 'kitchen') => void }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-slate-200 font-sans p-8 flex flex-col items-center overflow-y-auto">
      <header className="w-full max-w-6xl flex justify-between items-center mb-16">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Robfu Logo" className="h-10 w-auto object-contain" />
          <span className="text-2xl font-bold tracking-tighter uppercase">Mueble<span className="text-orange-500">Studio</span></span>
        </div>
        <div className="text-sm font-semibold uppercase tracking-widest text-slate-500">
          Suite de Diseño 3D
        </div>
      </header>

      <main className="w-full max-w-6xl flex flex-col items-center">
        <h1 className="text-4xl md:text-6xl font-bold text-center mb-6 tracking-tight">Planifica tus espacios con <br/><span className="text-orange-500">precisión milimétrica</span></h1>
        <p className="text-slate-400 text-center max-w-2xl mb-16 text-lg">Selecciona un módulo de diseño para comenzar. Crea muebles paramétricos detallados o planifica habitaciones completas en 2D y 3D.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {/* Closet Card */}
          <div 
            onClick={() => onNavigate('closet')}
            className="group relative bg-zinc-900 border border-white/10 rounded-2xl p-8 hover:border-orange-500/50 transition-all cursor-pointer overflow-hidden flex flex-col items-start min-h-[320px]"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -mr-20 -mt-20 transition-all group-hover:bg-orange-500/20"></div>
            <div className="p-4 bg-black/40 rounded-xl border border-white/5 mb-6 z-10 relative">
              <Box size={32} className="text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold uppercase tracking-wide mb-2 z-10 relative">Clóset Personalizado</h2>
            <p className="text-slate-400 mb-8 max-w-sm z-10 relative">Configurador paramétrico avanzado. Ajusta dimensiones, materiales, divisiones internas y herrajes en tiempo real.</p>
            <div className="mt-auto flex items-center gap-2 text-orange-500 font-bold uppercase text-xs tracking-wider group-hover:gap-4 transition-all z-10 relative">
              Iniciar Diseño <ArrowRight size={14} />
            </div>
          </div>

          {/* Kitchen Card */}
          <div 
            onClick={() => onNavigate('kitchen')}
            className="group relative bg-zinc-900 border border-white/10 rounded-2xl p-8 hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden flex flex-col items-start min-h-[320px]"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 transition-all group-hover:bg-blue-500/20"></div>
            <div className="p-4 bg-black/40 rounded-xl border border-white/5 mb-6 z-10 relative">
              <LayoutDashboard size={32} className="text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold uppercase tracking-wide mb-2 z-10 relative">Planificador de Cocinas</h2>
            <div className="inline-block px-2 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest rounded mb-3 z-10 relative">Nuevo Motor BIM</div>
            <p className="text-slate-400 mb-8 max-w-sm z-10 relative">Dibuja muros en 2D y arrastra gabinetes inteligentes en 3D. Diseño espacial completo con imantación automática.</p>
            <div className="mt-auto flex items-center gap-2 text-blue-500 font-bold uppercase text-xs tracking-wider group-hover:gap-4 transition-all z-10 relative">
              Abrir Planificador <ArrowRight size={14} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
