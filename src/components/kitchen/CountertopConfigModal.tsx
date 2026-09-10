import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  X, 
  Check, 
  AlertTriangle, 
  Building2, 
  Home, 
  ShieldCheck, 
  Sparkles, 
  Scissors, 
  Flame, 
  Droplet, 
  Info,
  Maximize2
} from 'lucide-react';
import { useKitchenStore } from '../../store/kitchenStore';
import { QSTONE_SINKS, FDV_COOKTOPS, SinkModelId, CooktopModelId } from '../../types/countertop';
import { generateCountertopPieces } from '../../utils/countertopNesting';

interface CountertopConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CountertopConfigModal({ isOpen, onClose }: CountertopConfigModalProps) {
  const {
    countertopConfig,
    setCountertopConfig,
    qstoneCatalog,
    cabinets,
    activeCabinetId,
    setCountertopSink,
    setCountertopCooktop,
    validateCabinetForSink,
    validateCabinetForCooktop,
    golaSystem,
    setGolaIncompatibilityAlert,
  } = useKitchenStore();

  const [activeTab, setActiveTab] = useState<'material' | 'dimensions' | 'appliances' | 'nesting'>('material');
  const [applianceError, setApplianceError] = useState<string | null>(null);

  const selectedProduct = useMemo(() => {
    return qstoneCatalog.find((p) => p.id === countertopConfig.selectedProductId) || qstoneCatalog[0];
  }, [countertopConfig.selectedProductId, qstoneCatalog]);

  const nestingBOM = useMemo(() => {
    return generateCountertopPieces(cabinets, countertopConfig, qstoneCatalog);
  }, [cabinets, countertopConfig, qstoneCatalog]);

  const baseAndIslandCabs = useMemo(() => {
    return cabinets.filter(
      (c) => (c.type === 'base' || c.type === 'island') && !c.variant?.startsWith('deco_')
    );
  }, [cabinets]);

  const canAnyWaterfallLeft = useMemo(() => {
    if (!nestingBOM?.runs || nestingBOM.runs.length === 0) return true;
    return nestingBOM.runs.some((r) => r.canWaterfallLeft);
  }, [nestingBOM]);

  const canAnyWaterfallRight = useMemo(() => {
    if (!nestingBOM?.runs || nestingBOM.runs.length === 0) return true;
    return nestingBOM.runs.some((r) => r.canWaterfallRight);
  }, [nestingBOM]);

  if (!isOpen) return null;

  const handleSelectProduct = (productId: string) => {
    setCountertopConfig({ selectedProductId: productId, enabled: true });
  };

  const handleSinkChange = (sinkId: SinkModelId) => {
    setApplianceError(null);
    if (sinkId === 'none') {
      setCountertopSink('none');
      return;
    }
    // Try to install on currently active cabinet if valid, else first valid cabinet
    const activeCab = cabinets.find((c) => c.id === activeCabinetId);
    if (activeCab && (activeCab.type === 'base' || activeCab.type === 'island')) {
      const res = setCountertopSink(sinkId, activeCab.id);
      if (!res.success) {
        setApplianceError(res.error || 'Error de validación');
      }
      return;
    }

    // Auto-pick first eligible cabinet
    const eligible = baseAndIslandCabs.find(
      (c) => validateCabinetForSink(c, sinkId).valid
    );
    if (eligible) {
      setCountertopSink(sinkId, eligible.id);
    } else {
      const spec = QSTONE_SINKS[sinkId];
      setApplianceError(
        `No hay ningún mueble base con ancho suficiente (mínimo ${spec.minCabinetWidthCm} cm) para la cubeta ${spec.name}. Modifica el ancho de un mueble a >= ${spec.minCabinetWidthCm} cm.`
      );
    }
  };

  const handleCooktopChange = (cooktopId: CooktopModelId) => {
    setApplianceError(null);
    if (cooktopId === 'none') {
      setCountertopCooktop('none');
      return;
    }
    const activeCab = cabinets.find((c) => c.id === activeCabinetId);
    if (activeCab && (activeCab.type === 'base' || activeCab.type === 'island')) {
      const res = setCountertopCooktop(cooktopId, activeCab.id);
      if (!res.success) {
        setApplianceError(res.error || 'Error de validación');
      }
      return;
    }

    // Auto-pick first eligible cabinet
    const eligible = baseAndIslandCabs.find(
      (c) => c.id !== countertopConfig.sinkCabinetId && validateCabinetForCooktop(c, cooktopId).valid
    );
    if (eligible) {
      setCountertopCooktop(cooktopId, eligible.id);
    } else {
      const spec = FDV_COOKTOPS[cooktopId];
      setApplianceError(
        `No hay ningún mueble disponible con ancho suficiente (mínimo ${spec.minCabinetWidthCm} cm) para la encimera ${spec.name}.`
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white tracking-wide">
                  Configurador de Cubiertas Qstone
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30">
                  Cuarzos & Sinterizados
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Marmolería técnica, regruesos, respaldos, cubetas bajo cubierta y optimización de corte
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <input
                type="checkbox"
                checked={countertopConfig.enabled}
                onChange={(e) => setCountertopConfig({ enabled: e.target.checked })}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 focus:ring-offset-slate-900"
              />
              <span>Cubierta Activa</span>
            </label>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-6 gap-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab('material')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'material'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Catálogo Qstone ({qstoneCatalog.length})
          </button>
          <button
            onClick={() => setActiveTab('dimensions')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'dimensions'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Regrueso, Respaldo & Cascada
          </button>
          <button
            onClick={() => setActiveTab('appliances')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'appliances'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Droplet className="w-3.5 h-3.5" />
            Cubetas & Encimeras
          </button>
          <button
            onClick={() => setActiveTab('nesting')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'nesting'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            Despiece & Nesting de Disco
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: MATERIAL & CATALOG */}
          {activeTab === 'material' && (
            <div className="space-y-4">
              <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/60 flex items-start gap-3">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 leading-relaxed">
                  <span className="font-semibold text-white">Regla de Fabricación Estructural:</span> Las cubiertas{' '}
                  <span className="text-amber-300 font-semibold">Sinterizadas (12 mm)</span> exigen{' '}
                  <span className="underline decoration-amber-400">tapa continua de melamina completa</span> en el
                  mueble base para dar soporte rígido homogéneo. Las de{' '}
                  <span className="text-slate-100 font-semibold">Cuarzo (18/20 mm)</span> utilizan el sistema tradicional de
                  barras de armado de 10 cm.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {qstoneCatalog.map((product) => {
                  const isSelected = countertopConfig.selectedProductId === product.id;
                  const isSintered = product.materialType === 'sinterizado';

                  return (
                    <div
                      key={product.id}
                      onClick={() => handleSelectProduct(product.id)}
                      className={`relative p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-amber-400 bg-amber-950/20 shadow-lg shadow-amber-950/30'
                          : 'border-slate-700/80 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg shadow-inner border border-white/20 shrink-0 flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: product.colorHex }}
                          >
                            {product.thicknessMm}mm
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                              {product.name}
                              {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                                  isSintered
                                    ? 'bg-purple-900/60 text-purple-300 border border-purple-700'
                                    : 'bg-cyan-900/60 text-cyan-300 border border-cyan-700'
                                }`}
                              >
                                {isSintered ? 'Sinterizado' : 'Cuarzo'}
                              </span>
                              <span>{product.thicknessMm} mm</span>
                              <span>• Plancha 320x160 cm</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-amber-400">
                            ${product.priceM2Clp.toLocaleString('es-CL')}
                          </div>
                          <div className="text-[10px] text-slate-400">por m²</div>
                        </div>
                      </div>

                      {/* Technical note banner */}
                      <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">
                          {isSintered ? 'Requiere Tapa Melamina Completa' : 'Sistema Barras 10 cm'}
                        </span>
                        <span className="text-slate-500">
                          Formato: {(product.sheetWidthMm / 10).toFixed(0)}x{(product.sheetHeightMm / 10).toFixed(0)} cm
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: DIMENSIONS, REGRUESO & WATERFALL */}
          {activeTab === 'dimensions' && (
            <div className="space-y-6">
              {/* Regrueso delantero (Faldón) */}
              <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>Regrueso Frontal (Faldón Delantero)</span>
                    <span className="text-xs text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                      {countertopConfig.regruesoCm} cm
                    </span>
                  </label>
                  <span className="text-xs text-slate-400">Rango: 0 a 5 cm (paso 1 cm)</span>
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  El regrueso crea un frente visualmente robusto. Modifica y deduce automáticamente la altura de puertas y frentes de cajón para garantizar una apertura ergonómica y despejada bajo la cubierta.
                </p>

                {golaSystem !== 'none' && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center justify-between">
                    <span>
                      <strong>Riel Gola activo ({golaSystem === 'black' ? 'Negro' : 'Aluminio'}):</strong> Regrueso máximo permitido{' '}
                      <strong>{Number(((selectedProduct?.thicknessMm || 20) / 10 + 2.0).toFixed(1))} cm</strong> (Espesor {(selectedProduct?.thicknessMm || 20) / 10} cm + 2 cm).
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-6 gap-2">
                  {[0, 1, 2, 3, 4, 5].map((val) => {
                    const stoneThicknessCm = (selectedProduct?.thicknessMm || 20) / 10;
                    const isBlocked = golaSystem !== 'none' && val > stoneThicknessCm + 2.0;

                    return (
                      <button
                        key={val}
                        onClick={() => {
                          if (isBlocked) {
                            setGolaIncompatibilityAlert({
                              isOpen: true,
                              regruesoCm: val,
                              stoneThicknessCm,
                              attemptedAction: 'regrueso',
                            });
                            return;
                          }
                          setCountertopConfig({ regruesoCm: val });
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold border transition relative ${
                          countertopConfig.regruesoCm === val
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                            : isBlocked
                            ? 'bg-slate-900/60 text-slate-500 border-dashed border-red-500/40 hover:border-amber-400 hover:text-amber-300'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                        title={isBlocked ? `Incompatible con Riel Gola (excede ${stoneThicknessCm + 2} cm)` : undefined}
                      >
                        {val === 0 ? 'Sin faldón (0 cm)' : `${val} cm`}
                        {isBlocked && (
                          <span className="block text-[9px] text-red-400 font-normal mt-0.5">
                            Bloquea Gola
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Respaldo / Salpicadero */}
              <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700">
                <label className="text-sm font-semibold text-white block mb-1">
                  Respaldo Posterior (Salpicadero contra Muro)
                </label>
                <p className="text-xs text-slate-400 mb-3">
                  Protección de muro en el mismo material de cuarzo o piedra sinterizada.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setCountertopConfig({ backsplashMode: 'none' })}
                    className={`p-3 rounded-xl border text-left transition ${
                      countertopConfig.backsplashMode === 'none'
                        ? 'border-amber-400 bg-amber-950/20 text-white'
                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-semibold text-xs text-white">Sin Respaldo</div>
                    <div className="text-[11px] text-slate-400 mt-1">Directo a pintura o cerámica</div>
                  </button>

                  <button
                    onClick={() => setCountertopConfig({ backsplashMode: 'standard_5cm' })}
                    className={`p-3 rounded-xl border text-left transition ${
                      countertopConfig.backsplashMode === 'standard_5cm'
                        ? 'border-amber-400 bg-amber-950/20 text-white'
                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-semibold text-xs text-white">Zócalo Estándar (5 cm)</div>
                    <div className="text-[11px] text-slate-400 mt-1">Tira perimetral de 50 mm</div>
                  </button>

                  <button
                    onClick={() => setCountertopConfig({ backsplashMode: 'full_height' })}
                    className={`p-3 rounded-xl border text-left transition ${
                      countertopConfig.backsplashMode === 'full_height'
                        ? 'border-amber-400 bg-amber-950/20 text-white'
                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-semibold text-xs text-white">Revestimiento Completo</div>
                    <div className="text-[11px] text-slate-400 mt-1">Cubre hasta muebles aéreos (55 cm)</div>
                  </button>
                </div>
              </div>

              {/* Logística de Instalación & Restricción de Largo */}
              <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700">
                <label className="text-sm font-semibold text-white block mb-1">
                  Logística de Transporte & Tipología de Edificación
                </label>
                <p className="text-xs text-slate-400 mb-3">
                  Para casas el largo máximo por pieza es <strong className="text-white">250 cm</strong>. Para edificios
                  (paso por ascensor/escaleras) es <strong className="text-white">200 cm</strong>. Las uniones se realizan
                  estrictamente a <strong className="text-amber-400">90° ortogonales</strong> (no en 45°).
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setCountertopConfig({ buildingType: 'casa' })}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition ${
                      countertopConfig.buildingType === 'casa'
                        ? 'border-amber-400 bg-amber-950/20 text-white'
                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Home className="w-5 h-5 text-amber-400" />
                    <div>
                      <div className="text-xs font-semibold text-white">Instalación en Casa</div>
                      <div className="text-[11px] text-slate-400">Tramos continuos máx 250 cm</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setCountertopConfig({ buildingType: 'edificio' })}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition ${
                      countertopConfig.buildingType === 'edificio'
                        ? 'border-amber-400 bg-amber-950/20 text-white'
                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Building2 className="w-5 h-5 text-amber-400" />
                    <div>
                      <div className="text-xs font-semibold text-white">Instalación en Edificio</div>
                      <div className="text-[11px] text-slate-400">Tramos continuos máx 200 cm</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Cascada (Waterfall) & Voladizo de Isla */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700 space-y-3">
                  <span className="text-sm font-semibold text-white block">Remates Laterales en Cascada</span>
                  <div className="flex flex-col sm:flex-row gap-3 text-xs text-slate-300">
                    <label 
                      className={`flex items-center gap-2 ${canAnyWaterfallLeft ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                      title={!canAnyWaterfallLeft ? 'No permitido: hay mueble de despensa o esquina adyacente' : undefined}
                    >
                      <input
                        type="checkbox"
                        disabled={!canAnyWaterfallLeft}
                        checked={countertopConfig.waterfallLeft && canAnyWaterfallLeft}
                        onChange={(e) => setCountertopConfig({ waterfallLeft: e.target.checked })}
                        className="rounded text-amber-500"
                      />
                      <span>Cascada Izq. {!canAnyWaterfallLeft && <span className="text-[10px] text-amber-400 block sm:inline">(Bloqueada por despensa)</span>}</span>
                    </label>
                    <label 
                      className={`flex items-center gap-2 ${canAnyWaterfallRight ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                      title={!canAnyWaterfallRight ? 'No permitido: hay mueble de despensa o esquina adyacente' : undefined}
                    >
                      <input
                        type="checkbox"
                        disabled={!canAnyWaterfallRight}
                        checked={countertopConfig.waterfallRight && canAnyWaterfallRight}
                        onChange={(e) => setCountertopConfig({ waterfallRight: e.target.checked })}
                        className="rounded text-amber-500"
                      />
                      <span>Cascada Der. {!canAnyWaterfallRight && <span className="text-[10px] text-amber-400 block sm:inline">(Bloqueada por despensa)</span>}</span>
                    </label>
                  </div>
                </div>

                <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-white">Voladizo de Barra en Isla</span>
                    <span className="text-xs font-bold text-amber-400">{countertopConfig.islandOverhangCm} cm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="5"
                    value={countertopConfig.islandOverhangCm}
                    onChange={(e) => setCountertopConfig({ islandOverhangCm: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>0 cm</span>
                    <span>25 cm (estándar)</span>
                    <span>40 cm</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SINKS & COOKTOPS */}
          {activeTab === 'appliances' && (
            <div className="space-y-6">
              {applianceError && (
                <div className="bg-rose-950/40 border border-rose-700/60 rounded-xl p-3 flex items-start gap-3 text-rose-300 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <div>{applianceError}</div>
                </div>
              )}

              {/* Cubetas Bajo Cubierta (Sysprotec / Qstone) */}
              <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <Droplet className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-semibold text-white">Cubeta Lavaplatos Bajo Cubierta</span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Instalación bajo cubierta con pulido perimetral de piedra y perforación con disco.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* None */}
                  <div
                    onClick={() => handleSinkChange('none')}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      countertopConfig.sinkModel === 'none'
                        ? 'border-amber-400 bg-amber-950/20 text-white'
                        : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-semibold text-xs text-white">Sin Cubeta</div>
                    <div className="text-[11px] text-slate-400 mt-1">Solo mesón ciego</div>
                  </div>

                  {/* ALFA ONEC 3018 */}
                  <div
                    onClick={() => handleSinkChange('alfa_onec_3018')}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      countertopConfig.sinkModel === 'alfa_onec_3018'
                        ? 'border-amber-400 bg-amber-950/20 text-white'
                        : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-xs text-white">ALFA ONEC 3018</div>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-900/60 text-cyan-300">1 Cubeta</span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1">
                      77.5 x 48 cm (Prof. 23 cm)
                    </div>
                    <div className="text-[10px] text-amber-400 font-medium mt-1">
                      Encastre: 69.5 x 40 cm • Mueble mín: 80 cm
                    </div>
                  </div>

                  {/* ALFA TWOC F5858A */}
                  <div
                    onClick={() => handleSinkChange('alfa_twoc_f5858a')}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      countertopConfig.sinkModel === 'alfa_twoc_f5858a'
                        ? 'border-amber-400 bg-amber-950/20 text-white'
                        : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-xs text-white">ALFA TWOC F5858A</div>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-900/60 text-cyan-300">2 Cubetas</span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1">
                      81.0 x 48 cm (Prof. 21 cm)
                    </div>
                    <div className="text-[10px] text-amber-400 font-medium mt-1">
                      Encastre: 73.0 x 40 cm • Mueble mín: 90 cm
                    </div>
                  </div>
                </div>
              </div>

              {/* Encimeras FDV */}
              <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-semibold text-white">Encimera Sobre Cubierta (FDV)</span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Perforación de encastre rectangular para artefacto de cocción.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* None */}
                  <div
                    onClick={() => handleCooktopChange('none')}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      countertopConfig.cooktopModel === 'none'
                        ? 'border-amber-400 bg-amber-950/20 text-white'
                        : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-semibold text-xs text-white">Sin Encimera</div>
                    <div className="text-[11px] text-slate-400 mt-1">Sin perforación de gas</div>
                  </div>

                  {/* FDV DESIGN 60 2.0 */}
                  <div
                    onClick={() => handleCooktopChange('fdv_design_60')}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      countertopConfig.cooktopModel === 'fdv_design_60'
                        ? 'border-amber-400 bg-amber-950/20 text-white'
                        : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-xs text-white">FDV DESIGN 60 2.0</div>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-900/60 text-orange-300">4 Platos</span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1">
                      58 x 50 cm • Triple Corona
                    </div>
                    <div className="text-[10px] text-amber-400 font-medium mt-1">
                      Encastre: 55 x 47 cm • Mueble mín: 60 cm
                    </div>
                  </div>

                  {/* FDV DESIGN 90 */}
                  <div
                    onClick={() => handleCooktopChange('fdv_design_90')}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      countertopConfig.cooktopModel === 'fdv_design_90'
                        ? 'border-amber-400 bg-amber-950/20 text-white'
                        : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-xs text-white">FDV DESIGN 90</div>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-900/60 text-orange-300">5 Platos Wok</span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1">
                      86 x 50 cm • Acero Inoxidable
                    </div>
                    <div className="text-[10px] text-amber-400 font-medium mt-1">
                      Encastre: 84 x 47 cm • Mueble mín: 90 cm
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NESTING & BOM */}
          {activeTab === 'nesting' && (
            <div className="space-y-6">
              {!nestingBOM ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  Activa la cubierta y agrega al menos un mueble base para calcular el despiece y nesting.
                </div>
              ) : (
                <>
                  {/* KPI Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                      <div className="text-xs text-slate-400">Área Neta Cubiertas</div>
                      <div className="text-xl font-bold text-white mt-1">{nestingBOM.totalNetAreaM2} m²</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">En piezas instaladas</div>
                    </div>

                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                      <div className="text-xs text-slate-400">Planchas 320x160cm</div>
                      <div className="text-xl font-bold text-amber-400 mt-1">{nestingBOM.slabsCount} un</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {nestingBOM.grossBilledM2} m² brutos (5.12 m²/plancha)
                      </div>
                    </div>

                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                      <div className="text-xs text-slate-400">Rendimiento Nesting</div>
                      <div className="text-xl font-bold text-emerald-400 mt-1">{nestingBOM.efficiencyPercent}%</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Corte disco kerf 3.5mm</div>
                    </div>

                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                      <div className="text-xs text-slate-400">Total Estimado Cubierta</div>
                      <div className="text-xl font-bold text-white mt-1">
                        ${nestingBOM.totalCostClp.toLocaleString('es-CL')}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Material + elaboración</div>
                    </div>
                  </div>

                  {/* Cutout details */}
                  {nestingBOM.cutouts.length > 0 && (
                    <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-700">
                      <span className="text-xs font-semibold text-white block mb-2">
                        Perforaciones de Encastre y Procesamiento de Taller:
                      </span>
                      <div className="space-y-1.5 text-xs text-slate-300">
                        {nestingBOM.cutouts.map((c, i) => (
                          <div key={i} className="flex items-center justify-between py-1 border-b border-slate-700/50">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                              {c.modelName} ({c.type === 'sink' ? 'Lavaplatos Bajo Cubierta' : 'Encimera'})
                            </span>
                            <span className="text-slate-400">
                              Corte: {c.cutoutWidthMm} x {c.cutoutDepthMm} mm • {c.polished ? 'Borde Pulido' : 'Corte Simple'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Continuous Runs & Logistics Criteria */}
                  <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Maximize2 className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-semibold text-white">
                          Criterio de Despiece por Corrida Continua & Transporte:
                        </span>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-amber-950/60 border border-amber-800/60 text-amber-300">
                        {countertopConfig.buildingType === 'edificio' ? 'Edificio: Máx 2000 mm' : 'Casa: Máx 2500 mm'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      El despiece calcula el largo total agrupado de la corrida continua en lugar de cortar por cada mueble individual, garantizando cubiertas enteras sin uniones innecesarias.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {nestingBOM.runs.map((run, rIdx) => (
                        <div key={rIdx} className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/80 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-amber-300">{run.name}</span>
                            <span className="text-slate-400 font-mono">{run.cabinets.length} muebles</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-400 mt-1 text-[11px]">
                            <span>Largo Total: <strong className="text-white">{run.totalLengthMm} mm</strong></span>
                            <span>Prof: <strong className="text-white">{run.depthMm} mm</strong></span>
                            <span>Tramos: <strong className="text-emerald-400">{run.segmentsCount} tramo(s)</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Visual 2D Slab Nesting Layout (Planchas 3200 x 1600 mm) */}
                  <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-950/40 border-b border-slate-800 text-xs font-semibold text-white flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Scissors className="w-3.5 h-3.5 text-amber-400" />
                        <span>Optimización de Corte en Plancha Qstone (Formato 3200 x 1600 mm)</span>
                      </div>
                      <span className="text-[11px] text-amber-400 font-mono font-medium">
                        {nestingBOM.slabsLayout.length} Plancha(s) • Kerf 3.5 mm
                      </span>
                    </div>

                    <div className="p-4 space-y-4">
                      {nestingBOM.slabsLayout.map((slab) => (
                        <div key={slab.slabIndex} className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/80">
                          <div className="flex justify-between items-center text-xs mb-2">
                            <span className="font-semibold text-white">
                              Plancha #{slab.slabIndex} (3200 x 1600 mm)
                            </span>
                            <div className="flex items-center gap-3 text-[11px]">
                              <span className="text-slate-400">
                                Rendimiento: <strong className="text-emerald-400">{slab.efficiencyPercent}%</strong>
                              </span>
                              <span className="text-slate-400">
                                Área Útil: <strong className="text-slate-200">{slab.usedAreaM2} m²</strong>
                              </span>
                              <span className="text-slate-400">
                                Retazo: <strong className="text-amber-400">{slab.offcutAreaM2} m²</strong>
                              </span>
                            </div>
                          </div>

                          <div className="w-full overflow-x-auto bg-slate-950 rounded-lg p-2 flex justify-center">
                            <svg
                              viewBox="-20 -20 3240 1640"
                              className="w-full max-w-[820px] max-h-[380px] bg-slate-900 rounded border border-slate-700"
                              preserveAspectRatio="xMidYMid meet"
                            >
                              {/* Plancha Base */}
                              <rect x={0} y={0} width={3200} height={1600} fill="#1e293b" stroke="#475569" strokeWidth={4} />

                              {/* Margen despunte 10mm */}
                              <rect x={10} y={10} width={3180} height={1580} fill="none" stroke="#64748b" strokeWidth={2} strokeDasharray="16,10" />

                              {/* Piezas anidadas */}
                              {slab.pieces.map((p, pi) => {
                                let fill = '#d97706';
                                let stroke = '#fbbf24';
                                if (p.type === 'apron') {
                                  fill = '#ea580c';
                                  stroke = '#fdba74';
                                } else if (p.type === 'backsplash') {
                                  fill = '#0284c7';
                                  stroke = '#7dd3fc';
                                } else if (p.type === 'waterfall') {
                                  fill = '#9333ea';
                                  stroke = '#d8b4fe';
                                }

                                const fs = Math.max(22, Math.min(p.widthMm / 14, p.lengthMm / 4, 44));

                                return (
                                  <g key={pi}>
                                    <rect
                                      x={p.x}
                                      y={p.y}
                                      width={p.widthMm}
                                      height={p.lengthMm}
                                      fill={fill}
                                      fillOpacity={0.4}
                                      stroke={stroke}
                                      strokeWidth={3}
                                    />

                                    {/* Calado encastre si aplica */}
                                    {p.hasCutout && p.widthMm > 600 && p.lengthMm > 350 && (
                                      <g>
                                        <rect
                                          x={p.x + (p.widthMm - (p.hasCutout === 'sink' ? 695 : 550)) / 2}
                                          y={p.y + (p.lengthMm - (p.hasCutout === 'sink' ? 400 : 470)) / 2}
                                          width={p.hasCutout === 'sink' ? 695 : 550}
                                          height={p.hasCutout === 'sink' ? 400 : 470}
                                          fill="#ffffff"
                                          fillOpacity={0.15}
                                          stroke="#ef4444"
                                          strokeWidth={3}
                                          strokeDasharray="12,8"
                                        />
                                        <text
                                          x={p.x + p.widthMm / 2}
                                          y={p.y + p.lengthMm / 2 + 8}
                                          textAnchor="middle"
                                          fontSize={24}
                                          fontWeight="bold"
                                          fill="#ef4444"
                                        >
                                          {p.hasCutout === 'sink' ? 'ENCASTRE LAVAPLATOS' : 'ENCASTRE ENCIMERA'}
                                        </text>
                                      </g>
                                    )}

                                    {p.widthMm > 140 && p.lengthMm > 60 && (
                                      <>
                                        <text
                                          x={p.x + p.widthMm / 2}
                                          y={p.y + p.lengthMm / 2 - (p.lengthMm > 100 ? fs * 0.4 : 0)}
                                          textAnchor="middle"
                                          fontSize={fs}
                                          fontWeight="bold"
                                          fill="#ffffff"
                                        >
                                          {p.pieceId}
                                        </text>
                                        {p.lengthMm > 100 && (
                                          <text
                                            x={p.x + p.widthMm / 2}
                                            y={p.y + p.lengthMm / 2 + fs * 0.85}
                                            textAnchor="middle"
                                            fontSize={fs * 0.75}
                                            fontFamily="monospace"
                                            fill="#fde68a"
                                          >
                                            {p.widthMm} x {p.lengthMm} mm
                                          </text>
                                        )}
                                      </>
                                    )}
                                  </g>
                                );
                              })}
                            </svg>
                          </div>
                        </div>
                      ))}

                      {/* Leyenda de colores */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm bg-amber-600/60 border border-amber-400"></span>
                          <span>Cubierta Principal</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm bg-orange-600/60 border border-orange-400"></span>
                          <span>Faldón Regrueso</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm bg-sky-600/60 border border-sky-400"></span>
                          <span>Respaldo Zócalo</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm bg-purple-600/60 border border-purple-400"></span>
                          <span>Pata Cascada</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm border border-red-500 border-dashed bg-red-500/20"></span>
                          <span>Calado Encastre</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Parts List Table */}
                  <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-950/40 border-b border-slate-800 text-xs font-semibold text-white flex justify-between items-center">
                      <span>Despiece Técnico de Marmolería (Piedra Qstone)</span>
                      <span className="text-[11px] text-slate-400">{nestingBOM.pieces.length} piezas</span>
                    </div>
                    <div className="overflow-x-auto max-h-60">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0">
                          <tr>
                            <th className="py-2 px-3">Código</th>
                            <th className="py-2 px-3">Descripción</th>
                            <th className="py-2 px-3">Largo</th>
                            <th className="py-2 px-3">Ancho</th>
                            <th className="py-2 px-3">Espesor</th>
                            <th className="py-2 px-3">Área (m²)</th>
                            <th className="py-2 px-3">Pulido (m)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {nestingBOM.pieces.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-800/50">
                              <td className="py-2 px-3 font-mono text-[11px] text-amber-400">{p.id}</td>
                              <td className="py-2 px-3">{p.name}</td>
                              <td className="py-2 px-3">{p.lengthMm} mm</td>
                              <td className="py-2 px-3">{p.widthMm} mm</td>
                              <td className="py-2 px-3">{p.thicknessMm} mm</td>
                              <td className="py-2 px-3 font-medium">{p.areaM2.toFixed(3)}</td>
                              <td className="py-2 px-3">{p.edgePolishingM.toFixed(2)} m</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Producto activo:{' '}
            <span className="text-white font-medium">
              {selectedProduct.name} ({selectedProduct.thicknessMm}mm)
            </span>{' '}
            • ${selectedProduct.priceM2Clp.toLocaleString('es-CL')} / m²
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-amber-500/20"
          >
            Guardar & Aplicar al Proyecto
          </button>
        </div>
      </div>
    </div>
  );
}
