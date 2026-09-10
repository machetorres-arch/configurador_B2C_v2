import React from 'react';
import { AlertTriangle, X, ShieldAlert, Check } from 'lucide-react';
import { useKitchenStore } from '../../store/kitchenStore';

export function GolaRegruesoIncompatibilityModal() {
  const { golaIncompatibilityAlert, setGolaIncompatibilityAlert, setGolaSystem, setCountertopConfig, golaSystem } = useKitchenStore();

  if (!golaIncompatibilityAlert || !golaIncompatibilityAlert.isOpen) {
    return null;
  }

  const { regruesoCm, stoneThicknessCm, attemptedAction } = golaIncompatibilityAlert;
  const maxAllowedRegrueso = Number((stoneThicknessCm + 2.0).toFixed(1));
  const faldonDrop = Math.max(0, Number((regruesoCm - stoneThicknessCm).toFixed(1)));

  const handleClose = () => {
    setGolaIncompatibilityAlert(null);
  };

  const handleDisableGolaAndApplyRegrueso = () => {
    setGolaSystem('none');
    setCountertopConfig({ regruesoCm });
    setGolaIncompatibilityAlert(null);
  };

  const handleAdjustRegruesoAndActivateGola = () => {
    setCountertopConfig({ regruesoCm: Math.floor(maxAllowedRegrueso) });
    if (attemptedAction === 'gola') {
      setGolaSystem('aluminum');
    }
    setGolaIncompatibilityAlert(null);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl shadow-amber-950/40 text-slate-100 relative">
        {/* Botón cerrar esquina */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Restricción Técnica de Fabricación
            </span>
            <h3 className="text-lg font-bold text-white mt-1">
              Incompatibilidad: Regrueso y Riel Gola
            </h3>
          </div>
        </div>

        {/* Cuerpo informativo */}
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed mb-6">
          <p>
            {attemptedAction === 'regrueso' ? (
              <>
                Ha seleccionado un <strong className="text-white">regrueso de {regruesoCm} cm</strong> con una plancha de espesor <strong className="text-white">{stoneThicknessCm} cm</strong> teniendo el <strong className="text-amber-300">Sistema Riel Gola activo</strong>.
              </>
            ) : (
              <>
                No es posible activar el <strong className="text-amber-300">Sistema Riel Gola</strong> porque la cubierta tiene actualmente un <strong className="text-white">regrueso de {regruesoCm} cm</strong> con plancha de <strong className="text-white">{stoneThicknessCm} cm</strong>.
              </>
            )}
          </p>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span>Espesor de la plancha:</span>
              <span className="font-mono font-bold text-slate-200">{stoneThicknessCm} cm</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Regrueso solicitado:</span>
              <span className="font-mono font-bold text-amber-300">{regruesoCm} cm</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Descenso del faldón de cubierta:</span>
              <span className="font-mono font-bold text-red-400">{faldonDrop} cm por debajo del mueble</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-700/60 pt-2 text-slate-400">
              <span>Regrueso máximo compatible con Gola:</span>
              <span className="font-mono font-bold text-emerald-400">Hasta {maxAllowedRegrueso} cm (Espesor + 2 cm)</span>
            </div>
          </div>

          <p className="text-slate-400">
            <strong className="text-slate-200">Motivo de ingeniería:</strong> El canal superior de aluminio <em>Gola L</em> requiere una luz libre de 35 mm bajo la cubierta para el acceso ergonómico de los dedos. Un faldón que exceda en más de 2 cm el espesor de la piedra tapa físicamente el canal, imposibilitando abrir los cajones y puertas.
          </p>
        </div>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-2.5 justify-end">
          {attemptedAction === 'regrueso' ? (
            <>
              <button
                onClick={handleClose}
                className="py-2 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              >
                Mantener Gola (Cancelar regrueso)
              </button>
              <button
                onClick={handleDisableGolaAndApplyRegrueso}
                className="py-2 px-4 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Desactivar Gola y aplicar {regruesoCm} cm
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleClose}
                className="py-2 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              >
                Entendido / Mantener Tiradores
              </button>
              <button
                onClick={handleAdjustRegruesoAndActivateGola}
                className="py-2 px-4 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Ajustar a {Math.floor(maxAllowedRegrueso)} cm y activar Gola
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
